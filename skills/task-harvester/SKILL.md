---
name: task-harvester
description: Use when collecting open tasks or todos scattered across notes into one consolidated action list — unchecked checkboxes and #task/#todo-tagged items across the whole vault, regardless of when the notes were written. For a review bounded to a recent time window, use daily-rollup.
---

# Task harvester

Pull every open task in the vault into one consolidated, sourced action list.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Find both marker types.** Run
   `obsidian vault=<vault> tasks todo verbose format=json` for unchecked
   checkboxes. Separately run
   `obsidian vault=<vault> search:context query='tag:#task OR tag:#todo' format=json`
   for task-tagged lines. For a folder scope, enumerate its Markdown files and
   run `obsidian vault=<vault> tasks path=<path> todo verbose format=json` per
   file; add `path=<folder>` to the `search:context` call. For a topic scope,
   read the returned source notes and filter by supported content rather than
   inventing an unsupported task-query flag.
2. **Read and extract.** Read every candidate with
   `obsidian vault=<vault> read path=<path>`. Collect each open task verbatim —
   both checkbox and tagged forms — with its source note. Deduplicate an item
   found by both queries.
3. **Consolidate, don't lose.** One list, each item linked to its
   `[[source note]]`. Group by source or by theme; flag items with due dates or
   owners if present.
4. **Order by priority** where the notes give signal (due dates, explicit
   priority); otherwise group sensibly. Lead with anything overdue/urgent.
5. **Preview and save portable Markdown.** Show the complete grouped action
   list and target path. After approval, run
   `obsidian vault=<vault> create path=<path> content=<markdown>`, re-read it,
   and invoke `obsidian-agent:consistent-tagging`.

## Hard requirements

- Search BOTH markers (`- [ ]` checkboxes and `#task`/`#todo`), and extract both
  — never drop a marker type you found while searching.
- Every harvested item links back to its `[[source note]]`.
- Output is prioritized/grouped, not an unordered blob.

## Common mistakes

- Missing tasks by searching only one marker (`- [ ]` vs `#task`).
- Items with no link back to their source note.
- An unordered blob instead of a prioritized, grouped list.
