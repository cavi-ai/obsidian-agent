#!/usr/bin/env python3
"""Routing eval: which skill wins a contested query.

skill-creator's run_eval.py tests one skill in isolation and answers a
boolean (did it trigger?). That can't see collisions: two skills can each
score ~100% alone while fighting over the same real queries. This harness
stages the whole plugin the way an install presents it — manifest, commands,
and skills, loaded via --plugin-dir — and records which skill actually fires
for each query, so contested queries and their winners are visible.
"""

import argparse
import json
import os
import select
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


PLUGIN_ROOT = Path(__file__).resolve().parents[2]


def stage_plugin(skills_dir: Path, plugin_root: Path, vault_dir: Path | None = None) -> tuple[Path, Path, Path]:
    """Stage a loadable plugin dir (manifest + commands + skills) beside the project cwd, once per run."""
    manifest = plugin_root / ".claude-plugin" / "plugin.json"
    commands_dir = plugin_root / "commands"
    # Skills-only staging hides command descriptions, which shadow theirs in the listing the router reads.
    if not manifest.is_file():
        raise SystemExit(f"no plugin manifest at {manifest}")
    if not commands_dir.is_dir():
        raise SystemExit(f"no commands dir at {commands_dir}")

    staging = Path(tempfile.mkdtemp(prefix="routing-eval-"))
    project = staging / "project"
    project.mkdir()

    plugin = staging / "plugin"
    (plugin / ".claude-plugin").mkdir(parents=True)
    # marketplace.json describes the catalog, not the plugin; a staged plugin dir is not a marketplace.
    shutil.copy2(manifest, plugin / ".claude-plugin" / "plugin.json")
    shutil.copytree(commands_dir, plugin / "commands")
    dest = plugin / "skills"
    dest.mkdir()
    for entry in sorted(skills_dir.iterdir()):
        if entry.is_dir():
            shutil.copytree(entry, dest / entry.name)

    # Without notes to act on, the model answers from whatever else it can reach and
    # never invokes a skill; the fixture makes vault queries contextually sensible.
    if vault_dir is not None:
        for entry in sorted(vault_dir.iterdir()):
            target = project / entry.name
            shutil.copytree(entry, target) if entry.is_dir() else shutil.copy2(entry, target)
    return staging, project, plugin


def extract_invocation(line: str, state: dict) -> tuple[str, str] | None:
    """Feed one stream-json line through the Skill-tool-call state machine.

    Returns (skill, lens). A lens capability is one skill with named variants, so the
    skill id alone cannot say whether the right variant ran — the lens is the first
    token of the Skill call's args, and '' when the call passed none.
    """
    try:
        event = json.loads(line)
    except json.JSONDecodeError:
        return None
    if event.get("type") != "stream_event":
        return None
    se = event.get("event", {})
    se_type = se.get("type", "")

    if se_type == "content_block_start":
        cb = se.get("content_block", {})
        if cb.get("type") == "tool_use" and cb.get("name") == "Skill":
            state["armed"] = True
            state["buf"] = ""
        else:
            state["armed"] = False
        return None

    if se_type == "content_block_delta" and state.get("armed"):
        delta = se.get("delta", {})
        if delta.get("type") == "input_json_delta":
            state["buf"] += delta.get("partial_json", "")
        return None

    if se_type == "content_block_stop" and state.get("armed"):
        state["armed"] = False
        try:
            payload = json.loads(state["buf"])
        except json.JSONDecodeError:
            return None
        skill = payload.get("skill")
        if not skill:
            return None
        args = payload.get("args") or ""
        lens = args.strip().split()[0] if args.strip() else ""
        return skill.split(":")[-1], lens  # plugin-prefixed ids -> last segment

    return None


def run_one(query: str, cwd: Path, plugin_dir: Path, timeout: int, model: str | None) -> tuple[str, str]:
    """Run one `claude -p` invocation, return (skill id, lens) for the first Skill call."""
    cmd = [
        "claude", "-p", query,
        "--plugin-dir", str(plugin_dir),
        "--output-format", "stream-json",
        "--include-partial-messages",
        "--verbose",
    ]
    if model:
        cmd.extend(["--model", model])

    # Nested claude -p inherits CLAUDECODE from a parent session; strip it.
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    proc = subprocess.Popen(
        cmd,
        cwd=str(cwd),
        env=env,
        stdin=subprocess.DEVNULL,  # avoids ~3s stdin-wait stall
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )

    state = {"armed": False, "buf": ""}
    buffer = ""
    start = time.monotonic()
    try:
        while True:
            elapsed = time.monotonic() - start
            if elapsed >= timeout:
                return "none", ""

            if proc.poll() is not None:
                try:
                    rest = proc.stdout.read()
                except (OSError, ValueError):
                    rest = b""
                if rest:
                    buffer += rest.decode("utf-8", errors="replace")
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    found = extract_invocation(line.strip(), state)
                    if found:
                        return found
                return "none", ""

            ready, _, _ = select.select([proc.stdout], [], [], min(0.5, max(0.0, timeout - elapsed)))
            if not ready:
                continue
            try:
                chunk = os.read(proc.stdout.fileno(), 8192)
            except OSError:
                continue
            if not chunk:
                continue
            buffer += chunk.decode("utf-8", errors="replace")
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                found = extract_invocation(line.strip(), state)
                if found:
                    return found
    finally:
        if proc.poll() is None:
            proc.kill()
        proc.wait()


def run_all(queries: list[dict], project: Path, plugin: Path, runs_per_query: int, num_workers: int, timeout: int, model: str | None) -> dict:
    total_runs = len(queries) * runs_per_query
    done = 0
    done_lock = threading.Lock()
    observed_by_query: dict[int, list[tuple[str, str]]] = {i: [] for i in range(len(queries))}

    with ThreadPoolExecutor(max_workers=num_workers) as pool:
        future_to_idx = {}
        for i, item in enumerate(queries):
            for _ in range(runs_per_query):
                fut = pool.submit(run_one, item["query"], project, plugin, timeout, model)
                future_to_idx[fut] = i

        for fut in as_completed(future_to_idx):
            idx = future_to_idx[fut]
            try:
                observed = fut.result()
            except Exception as e:
                print(f"warning: run failed: {e}", file=sys.stderr)
                observed = ("none", "")
            observed_by_query[idx].append(observed)
            with done_lock:
                done += 1
                print(f"{done}/{total_runs}", file=sys.stderr)

    return observed_by_query


def aggregate(queries: list[dict], observed_by_query: dict[int, list[tuple[str, str]]]) -> dict:
    results = []
    confusion: Counter = Counter()
    per_skill_total: Counter = Counter()
    per_skill_correct: Counter = Counter()
    per_skill_stolen: dict[str, Counter] = {}
    per_lens_total: Counter = Counter()
    per_lens_correct: Counter = Counter()
    per_lens_observed: dict[str, Counter] = {}
    total_correct = 0
    total_all = 0

    for i, item in enumerate(queries):
        expected = item["expected_skill"]
        expected_lens = item.get("expected_lens")
        observed_list = observed_by_query[i]
        skills = [skill for skill, _ in observed_list]
        modal = Counter(skills).most_common(1)[0][0] if skills else "none"
        correct = sum(1 for s in skills if s == expected)
        accuracy = correct / len(skills) if skills else 0.0
        row = {
            "query": item["query"],
            "expected": expected,
            "observed": skills,
            "modal": modal,
            "accuracy": accuracy,
        }

        # Routing to a lens capability is only half the answer; the lens says which variant ran.
        if expected_lens is not None:
            lenses = [lens for skill, lens in observed_list if skill == expected]
            lens_correct = sum(1 for lens in lenses if lens == expected_lens)
            row["expected_lens"] = expected_lens
            row["observed_lenses"] = lenses
            row["lens_accuracy"] = lens_correct / len(lenses) if lenses else 0.0
            per_lens_total[expected_lens] += len(lenses)
            per_lens_correct[expected_lens] += lens_correct
            seen = per_lens_observed.setdefault(expected_lens, Counter())
            for lens in lenses:
                if lens != expected_lens:
                    seen[lens or "(none passed)"] += 1

        results.append(row)

        per_skill_total[expected] += len(skills)
        per_skill_correct[expected] += correct
        total_correct += correct
        total_all += len(skills)

        stolen = per_skill_stolen.setdefault(expected, Counter())
        for s in skills:
            confusion[f"{expected}->{s}"] += 1
            if s != expected and s != "none":
                stolen[s] += 1

    per_skill = {}
    for skill, total in per_skill_total.items():
        recall = per_skill_correct[skill] / total if total else 0.0
        per_skill[skill] = {
            "recall": recall,
            "stolen_by": dict(per_skill_stolen.get(skill, Counter()).most_common(3)),
        }

    per_lens = {}
    for lens, total in per_lens_total.items():
        # null, not 0.0 — a lens nothing routed to was never scored, it did not score zero.
        per_lens[lens] = {
            "accuracy": (per_lens_correct[lens] / total) if total else None,
            "runs_scored": total,
            "confused_with": dict(per_lens_observed.get(lens, Counter()).most_common(3)),
        }

    overall_accuracy = total_correct / total_all if total_all else 0.0

    return {
        "overall_accuracy": overall_accuracy,
        "per_skill": per_skill,
        "per_lens": per_lens,
        "confusion": dict(confusion),
        "results": results,
        "lens_note": (
            "Lens accuracy is scored only over runs that routed to the expected skill, "
            "so it measures variant selection independently of routing. A run that passed "
            "no argument counts as an incorrect lens, not as a skipped run."
        ),
        "ambient_note": (
            "claude -p also sees the user's global (non-project) skills, so a skill "
            "outside this plugin can legitimately win a query and show up here."
        ),
    }


def main():
    parser = argparse.ArgumentParser(description="Measure which skill wins a contested query")
    parser.add_argument("--queries", required=True, help="Path to queries.json")
    parser.add_argument("--skills", required=True, help="Path to the skills/ directory to stage")
    parser.add_argument("--plugin-root", default=str(PLUGIN_ROOT), help="Plugin root supplying .claude-plugin/plugin.json and commands/")
    parser.add_argument("--vault", default=None, help="Fixture vault copied into the staged project")
    parser.add_argument("--runs-per-query", type=int, default=3)
    parser.add_argument("--num-workers", type=int, default=10)
    parser.add_argument("--timeout", type=int, default=60, help="Seconds per invocation")
    parser.add_argument("--model", default=None, help="Model override passed through to claude -p")
    parser.add_argument("--out", required=True, help="Path to write results JSON")
    args = parser.parse_args()

    queries = json.loads(Path(args.queries).read_text())
    skills_dir = Path(args.skills)
    staging, project, plugin = stage_plugin(
        skills_dir, Path(args.plugin_root), Path(args.vault) if args.vault else None
    )

    try:
        observed_by_query = run_all(queries, project, plugin, args.runs_per_query, args.num_workers, args.timeout, args.model)
    finally:
        shutil.rmtree(staging, ignore_errors=True)

    output = aggregate(queries, observed_by_query)
    Path(args.out).write_text(json.dumps(output, indent=2))

    print(f"overall_accuracy: {output['overall_accuracy']:.3f}")
    for lens, stats in sorted(output["per_lens"].items(), key=lambda kv: (kv[1]["accuracy"] is not None, kv[1]["accuracy"])):
        confused = ", ".join(f"{k}:{v}" for k, v in stats["confused_with"].items())
        score = "unscored" if stats["accuracy"] is None else f"accuracy={stats['accuracy']:.2f}"
        print(f"  lens {lens}: {score} n={stats['runs_scored']} confused_with={{{confused}}}")
    for skill, stats in sorted(output["per_skill"].items(), key=lambda kv: kv[1]["recall"]):
        if stats["recall"] < 0.9:
            stolen_str = ", ".join(f"{k}:{v}" for k, v in stats["stolen_by"].items())
            print(f"  {skill}: recall={stats['recall']:.2f} stolen_by={{{stolen_str}}}")


if __name__ == "__main__":
    main()
