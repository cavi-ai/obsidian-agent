# Skill evals

Two instruments. They answer different questions, and the first is the primary one.

## 1. Routing eval — which skill wins a contested query

`skill-creator`'s `run_eval.py` presents **one skill in isolation** and answers a boolean:
did it trigger? That cannot see collisions — two skills can each score near 100% alone while
fighting over the same queries in practice.

This harness stages the **whole plugin** — manifest, commands, and skills — so every
description competes, then records which one actually fired.

```bash
python3 evals/routing/run_routing_eval.py \
  --queries evals/routing/queries.json \
  --skills skills \
  --vault evals/fixtures/vault \
  --runs-per-query 3 --num-workers 10 --timeout 120 \
  --out evals/results/post-routing.json
```

Output: overall accuracy, per-skill recall, what stole each skill's queries, and a full
confusion matrix.

### The staged surface is a plugin install

Consumers install this as a plugin, so the router reads command descriptions alongside skill
descriptions. `stage_plugin()` reproduces that: it builds a plugin root — `.claude-plugin/plugin.json`,
`commands/`, `skills/` — and passes it to `claude -p --plugin-dir`, with the fixture vault as the
separate project cwd. `--plugin-root` selects where the manifest and commands come from (default:
the repo root); `--skills` still selects which skills tree is staged, so a pristine tree can be
compared against the current one.

`claude --plugin-dir <staged> plugin details obsidian-agent` counts each command as its own
component alongside its skill, carrying its own description. Staging skills alone measures a
surface no consumer has.

### The vault fixture is not optional

`--vault` copies `evals/fixtures/vault` into the staged project. Without it the run is
invalid, not merely noisy: with no notes to act on, Claude answers from whatever else it
can reach and never invokes a skill. In the first baseline, **48% of runs fired no skill at
all** and one was observed answering from an unrelated repository's changelog. A probe with
the fixture fired a skill on four of five previously dead queries.

The fixture is deliberately small and generic — a few projects, ideas, sources, dailies,
and one raw meeting note. It exists to make vault requests contextually sensible, not to
favor any skill.

### Ambient skills

`claude -p` also sees the user's global (non-project) skills, so an external skill can win a
query. This is visible rather than hidden — it appears in the confusion matrix as the
observed skill. External steals were 2.6% of runs in the first baseline. Record the ambient
skill set alongside results so two runs are comparable.

## 2. Trigger eval — does one skill over- or under-claim

Stock `skill-creator/scripts/run_eval.py`, one skill at a time, using the sets in
`evals/trigger/<id>.json` (8 positives, 4 negatives). The negatives are drawn from the
**nearest sibling's** territory — that is what detects an over-claiming description.

Run it with the fixture vault as the working directory, for the same reason as above.

## Authoring rules for query sets

**Queries must be written before the descriptions they will test.** A query authored after
reading a new description echoes its wording, so the run measures string overlap instead of
routing and the number is worthless. `evals/routing/queries.json` was authored against the
pre-rewrite descriptions and must not be edited to make a gate pass.

Queries are phrased the way a person actually types — goal-oriented, often not naming the
operation. No query names a skill id or title.

## Comparing runs

Baseline and post-rewrite runs use the **identical** 152-query set, which stays frozen. The
baseline was measured against the pristine pre-rewrite skill tree (`git archive 27dc26b skills`),
so the comparison isolates the description changes.

### Everything in `evals/results/` predates the staging fix

Every committed result — `baseline-routing-INVALID-no-vault-fixture.json`,
`baseline-collision.json`, `post-collision.json`, `final-collision.json` — was measured when
staging copied skills alone into `.claude/skills/`, with no commands and no plugin manifest.
That surface has no command descriptions to shadow the skills', so those numbers describe a
configuration no consumer installs. **They are not comparable to anything measured after this
fix** — not overall accuracy, not per-skill recall, not the confusion matrix. Re-measure the
baseline under plugin staging before calling any post-fix number a regression or an
improvement. The files are kept as a record, not as a reference point.

`compare.sh` stages a pristine **skills** tree against current commands and manifest, so its
baseline arm isolates skill-description changes only.

Gate: no skill regresses, and the collision set clears its target. The collision set is
`manifest`, `connection-finder`, `wikilink-weaver`, `vault-synthesis`, `source-digest`,
`research-workbench`, `daily-rollup`, `task-harvester`.

## 3. Lens accuracy — did the right variant of a lens capability run

A lens capability is one skill with named variants declared in `capabilities.json`
(`manifest` holds `pm`, `feature`, `content`, `infra`, `research`, `risk`). Routing to the
skill is only half the answer; the lens moved the rest of the decision into the argument,
so the harness reads it there.

`extract_invocation()` returns the lens alongside the skill — the first token of the Skill
call's `args`. Queries carry `expected_lens`, and results gain a `per_lens` block plus
`expected_lens` / `observed_lenses` / `lens_accuracy` per row. Two rules keep the number
honest:

- Lens accuracy is scored **only over runs that routed to the expected skill**, so a routing
  miss cannot be double-counted as a lens miss.
- A run that passed no argument is a **wrong lens**, not a skipped run. A lens nothing routed
  to reports `accuracy: null` — never scored, as against scored zero.

This rides along with the routing run: no extra `claude -p` sessions, no separate arm.

`evals/routing/test_run_routing_eval.py` covers the reader and the scorer offline, and pins
the query set to the registry — every declared lens must be exercised by at least one query,
and no query may name a lens the registry does not declare. It runs in CI and spends nothing.

### The manifest lenses were six skills

`manifest-{pm,feature,content,infra,research,risk}` are now the `manifest` lenses. The queries
that named a lens keep their text and gain `expected_lens`; their old trigger sets moved out
with the skills. Mechanical remap, not a re-authoring — comparability was already reset by the
staging fix above, so no frozen-set rule is bent.
