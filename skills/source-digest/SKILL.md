---
name: source-digest
description: Use when comparing notes that are typed or tagged as sources or papers, building an evidence or comparison table across them. Operates on existing plain source notes; typed provenance-record workflows are outside the portable CLI scope.
---

# Source digest

Turn a set of source/reference notes into a structured, comparable digest —
claims, evidence, and gaps — grounded in the notes themselves.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Find the source convention.** Inspect existing metadata with
   `obsidian vault=<vault> properties counts sort=count format=json` and
   `obsidian vault=<vault> tags counts format=json`. Reuse the vault's
   established `type` value or source tag.
2. **Select candidates.** Use property or tag search, for example
   `obsidian vault=<vault> search query='[type:source]' format=json` or
   `obsidian vault=<vault> search query='tag:#source' format=json`. If the
   vault has no source convention, search the requested topic instead.
3. **Read each candidate** with
   `obsidian vault=<vault> read path=<path>`. Extract the core claim or
   finding, supporting evidence or method, and stated limitations.
4. **Build a comparison.** A Markdown table with one row per source and columns for
   claim, evidence/strength, and notes — so sources can be compared at a glance.
   Cite each row to its `[[source note]]`.
5. **Surface agreement, conflict, and gaps.** Where sources agree, where they
   disagree (cite both), and what the set doesn't cover.
6. **Output.** Return portable Markdown leading with the headline finding,
   followed by the comparison table, agreements, conflicts, and gaps.

## Hard requirements

- Every claim/row traces to a source note you read (`[[cited]]`).
- A real comparison table, not prose summaries stacked up.
- Conflicts and gaps stated explicitly.

## Common mistakes

- Summarizing from general knowledge instead of the source notes.
- Missing sources because you ignored the vault's existing source tag or
  property convention.
