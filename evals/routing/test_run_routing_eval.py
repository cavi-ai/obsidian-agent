#!/usr/bin/env python3
"""Offline tests for the routing harness. No `claude -p`, no billed sessions."""

import json
import unittest

from run_routing_eval import aggregate, extract_invocation


def skill_call_lines(skill: str, args: str | None) -> list[str]:
    """The stream-json a Skill tool call produces, split the way the reader sees it."""
    payload = {"skill": skill} if args is None else {"skill": skill, "args": args}
    return [
        json.dumps({"type": "stream_event", "event": {
            "type": "content_block_start",
            "content_block": {"type": "tool_use", "name": "Skill"}}}),
        json.dumps({"type": "stream_event", "event": {
            "type": "content_block_delta",
            "delta": {"type": "input_json_delta", "partial_json": json.dumps(payload)}}}),
        json.dumps({"type": "stream_event", "event": {"type": "content_block_stop"}}),
    ]


def read(lines: list[str]):
    state = {"armed": False, "buf": ""}
    for line in lines:
        found = extract_invocation(line, state)
        if found:
            return found
    return None


class ExtractInvocation(unittest.TestCase):
    def test_reads_the_lens_from_the_skill_args(self):
        self.assertEqual(read(skill_call_lines("obsidian-agent:manifest", "pm")), ("manifest", "pm"))

    def test_takes_only_the_first_token_as_the_lens(self):
        self.assertEqual(
            read(skill_call_lines("obsidian-agent:manifest", "risk the acme migration")),
            ("manifest", "risk"))

    def test_reports_an_empty_lens_when_no_args_were_passed(self):
        self.assertEqual(read(skill_call_lines("obsidian-agent:manifest", None)), ("manifest", ""))
        self.assertEqual(read(skill_call_lines("obsidian-agent:manifest", "   ")), ("manifest", ""))

    def test_ignores_tool_calls_that_are_not_the_skill_tool(self):
        lines = [json.dumps({"type": "stream_event", "event": {
            "type": "content_block_start",
            "content_block": {"type": "tool_use", "name": "Read"}}})] + skill_call_lines("x:daily-rollup", None)[1:]
        self.assertIsNone(read(lines))

    def test_survives_malformed_lines(self):
        self.assertIsNone(read(["not json", json.dumps({"type": "other"})]))


class Aggregate(unittest.TestCase):
    QUERIES = [
        {"query": "roadmap please", "expected_skill": "manifest", "expected_lens": "pm"},
        {"query": "what could go wrong", "expected_skill": "manifest", "expected_lens": "risk"},
        {"query": "recap my week", "expected_skill": "daily-rollup"},
    ]

    def test_scores_the_lens_only_over_runs_that_routed_correctly(self):
        out = aggregate(self.QUERIES, {
            0: [("manifest", "pm"), ("manifest", "feature"), ("daily-rollup", "")],
            1: [("manifest", "risk"), ("manifest", "risk")],
            2: [("daily-rollup", "")],
        })
        # 3 runs routed, 2 hit manifest; of those 1 passed the right lens.
        self.assertAlmostEqual(out["per_skill"]["manifest"]["recall"], 4 / 5)
        self.assertAlmostEqual(out["per_lens"]["pm"]["accuracy"], 0.5)
        self.assertEqual(out["per_lens"]["pm"]["runs_scored"], 2)
        self.assertEqual(out["per_lens"]["pm"]["confused_with"], {"feature": 1})
        self.assertAlmostEqual(out["per_lens"]["risk"]["accuracy"], 1.0)

    def test_counts_a_missing_argument_as_a_wrong_lens(self):
        out = aggregate(self.QUERIES[:1], {0: [("manifest", "")]})
        self.assertAlmostEqual(out["per_lens"]["pm"]["accuracy"], 0.0)
        self.assertEqual(out["per_lens"]["pm"]["confused_with"], {"(none passed)": 1})

    def test_leaves_lensless_queries_out_of_the_lens_report(self):
        out = aggregate(self.QUERIES, {0: [], 1: [], 2: [("daily-rollup", "")]})
        self.assertNotIn("expected_lens", out["results"][2])

    def test_reports_an_unrouted_lens_as_unscored_rather_than_zero(self):
        out = aggregate(self.QUERIES[:1], {0: [("daily-rollup", "")]})
        self.assertIsNone(out["per_lens"]["pm"]["accuracy"])
        self.assertEqual(out["per_lens"]["pm"]["runs_scored"], 0)

    def test_routing_numbers_ignore_the_lens_entirely(self):
        out = aggregate(self.QUERIES[:1], {0: [("manifest", "pm"), ("manifest", "nonsense")]})
        self.assertAlmostEqual(out["per_skill"]["manifest"]["recall"], 1.0)
        self.assertEqual(out["results"][0]["observed"], ["manifest", "manifest"])


class QuerySet(unittest.TestCase):
    def test_every_lens_query_names_a_lens_the_registry_declares(self):
        from pathlib import Path
        root = Path(__file__).resolve().parents[2]
        registry = json.loads((root / "capabilities.json").read_text())
        queries = json.loads((root / "evals" / "routing" / "queries.json").read_text())
        by_id = {c["id"]: c for c in registry["capabilities"]}
        for row in queries:
            lens = row.get("expected_lens")
            if lens is None:
                continue
            cap = by_id.get(row["expected_skill"])
            self.assertIsNotNone(cap, f"{row['expected_skill']} is not in the registry")
            declared = {l["id"] for l in cap.get("lenses", [])}
            self.assertIn(lens, declared, f"query expects undeclared lens '{lens}'")

    def test_every_declared_lens_is_exercised_by_at_least_one_query(self):
        from pathlib import Path
        root = Path(__file__).resolve().parents[2]
        registry = json.loads((root / "capabilities.json").read_text())
        queries = json.loads((root / "evals" / "routing" / "queries.json").read_text())
        exercised = {(r["expected_skill"], r["expected_lens"]) for r in queries if "expected_lens" in r}
        for cap in registry["capabilities"]:
            for lens in cap.get("lenses", []):
                self.assertIn((cap["id"], lens["id"]), exercised,
                              f"no query exercises lens '{cap['id']}:{lens['id']}'")


if __name__ == "__main__":
    unittest.main()
