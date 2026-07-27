#!/usr/bin/env python3
"""Routing eval: which skill wins a contested query.

skill-creator's run_eval.py tests one skill in isolation and answers a
boolean (did it trigger?). That can't see collisions: two skills can each
score ~100% alone while fighting over the same real queries. This harness
stages all skills into one temp project and records which skill actually
fires for each query, so contested queries and their winners are visible.
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


def stage_skills(skills_dir: Path, vault_dir: Path | None = None) -> Path:
    """Copy skill dirs into a fresh temp project's .claude/skills/ once for the whole run."""
    staging = Path(tempfile.mkdtemp(prefix="routing-eval-"))
    dest = staging / ".claude" / "skills"
    dest.mkdir(parents=True)
    for entry in sorted(skills_dir.iterdir()):
        if entry.is_dir():
            shutil.copytree(entry, dest / entry.name)
    # Without notes to act on, the model answers from whatever else it can reach and
    # never invokes a skill; the fixture makes vault queries contextually sensible.
    if vault_dir is not None:
        for entry in sorted(vault_dir.iterdir()):
            target = staging / entry.name
            shutil.copytree(entry, target) if entry.is_dir() else shutil.copy2(entry, target)
    return staging


def extract_skill(line: str, state: dict) -> str | None:
    """Feed one stream-json line through the Skill-tool-call state machine."""
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
        return skill.split(":")[-1]  # plugin-prefixed ids -> last segment

    return None


def run_one(query: str, cwd: Path, timeout: int, model: str | None) -> str:
    """Run one `claude -p` invocation, return the first skill id invoked or 'none'."""
    cmd = [
        "claude", "-p", query,
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
                return "none"

            if proc.poll() is not None:
                try:
                    rest = proc.stdout.read()
                except (OSError, ValueError):
                    rest = b""
                if rest:
                    buffer += rest.decode("utf-8", errors="replace")
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    skill = extract_skill(line.strip(), state)
                    if skill:
                        return skill
                return "none"

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
                skill = extract_skill(line.strip(), state)
                if skill:
                    return skill
    finally:
        if proc.poll() is None:
            proc.kill()
        proc.wait()


def run_all(queries: list[dict], staging: Path, runs_per_query: int, num_workers: int, timeout: int, model: str | None) -> dict:
    total_runs = len(queries) * runs_per_query
    done = 0
    done_lock = threading.Lock()
    observed_by_query: dict[int, list[str]] = {i: [] for i in range(len(queries))}

    with ThreadPoolExecutor(max_workers=num_workers) as pool:
        future_to_idx = {}
        for i, item in enumerate(queries):
            for _ in range(runs_per_query):
                fut = pool.submit(run_one, item["query"], staging, timeout, model)
                future_to_idx[fut] = i

        for fut in as_completed(future_to_idx):
            idx = future_to_idx[fut]
            try:
                observed = fut.result()
            except Exception as e:
                print(f"warning: run failed: {e}", file=sys.stderr)
                observed = "none"
            observed_by_query[idx].append(observed)
            with done_lock:
                done += 1
                print(f"{done}/{total_runs}", file=sys.stderr)

    return observed_by_query


def aggregate(queries: list[dict], observed_by_query: dict[int, list[str]]) -> dict:
    results = []
    confusion: Counter = Counter()
    per_skill_total: Counter = Counter()
    per_skill_correct: Counter = Counter()
    per_skill_stolen: dict[str, Counter] = {}
    total_correct = 0
    total_all = 0

    for i, item in enumerate(queries):
        expected = item["expected_skill"]
        observed_list = observed_by_query[i]
        modal = Counter(observed_list).most_common(1)[0][0] if observed_list else "none"
        correct = sum(1 for o in observed_list if o == expected)
        accuracy = correct / len(observed_list) if observed_list else 0.0
        results.append({
            "query": item["query"],
            "expected": expected,
            "observed": observed_list,
            "modal": modal,
            "accuracy": accuracy,
        })

        per_skill_total[expected] += len(observed_list)
        per_skill_correct[expected] += correct
        total_correct += correct
        total_all += len(observed_list)

        stolen = per_skill_stolen.setdefault(expected, Counter())
        for o in observed_list:
            confusion[f"{expected}->{o}"] += 1
            if o != expected and o != "none":
                stolen[o] += 1

    per_skill = {}
    for skill, total in per_skill_total.items():
        recall = per_skill_correct[skill] / total if total else 0.0
        per_skill[skill] = {
            "recall": recall,
            "stolen_by": dict(per_skill_stolen.get(skill, Counter()).most_common(3)),
        }

    overall_accuracy = total_correct / total_all if total_all else 0.0

    return {
        "overall_accuracy": overall_accuracy,
        "per_skill": per_skill,
        "confusion": dict(confusion),
        "results": results,
        "ambient_note": (
            "claude -p also sees the user's global (non-project) skills, "
            "so a skill outside this repo's 30 can legitimately win a query "
            "and show up here."
        ),
    }


def main():
    parser = argparse.ArgumentParser(description="Measure which skill wins a contested query")
    parser.add_argument("--queries", required=True, help="Path to queries.json")
    parser.add_argument("--skills", required=True, help="Path to the skills/ directory")
    parser.add_argument("--vault", default=None, help="Fixture vault copied into the staged project")
    parser.add_argument("--runs-per-query", type=int, default=3)
    parser.add_argument("--num-workers", type=int, default=10)
    parser.add_argument("--timeout", type=int, default=60, help="Seconds per invocation")
    parser.add_argument("--model", default=None, help="Model override passed through to claude -p")
    parser.add_argument("--out", required=True, help="Path to write results JSON")
    args = parser.parse_args()

    queries = json.loads(Path(args.queries).read_text())
    skills_dir = Path(args.skills)
    staging = stage_skills(skills_dir, Path(args.vault) if args.vault else None)

    try:
        observed_by_query = run_all(queries, staging, args.runs_per_query, args.num_workers, args.timeout, args.model)
    finally:
        shutil.rmtree(staging, ignore_errors=True)

    output = aggregate(queries, observed_by_query)
    Path(args.out).write_text(json.dumps(output, indent=2))

    print(f"overall_accuracy: {output['overall_accuracy']:.3f}")
    for skill, stats in sorted(output["per_skill"].items(), key=lambda kv: kv[1]["recall"]):
        if stats["recall"] < 0.9:
            stolen_str = ", ".join(f"{k}:{v}" for k, v in stats["stolen_by"].items())
            print(f"  {skill}: recall={stats['recall']:.2f} stolen_by={{{stolen_str}}}")


if __name__ == "__main__":
    main()
