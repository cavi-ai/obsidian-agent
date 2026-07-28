---
name: daily-rollup
description: Use when summarizing or recapping recent vault activity — a daily, weekly, or periodic review of what changed, what was decided, and what is still open in a time window. For every open task across the whole vault with no time bound, use task-harvester.
---

# Daily rollup

Turn recent vault activity into one review note — decisions made, what changed,
and what's still open — grounded in the notes that actually changed.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Set the window.** Default to the last seven days; ask when the intended
   period is unclear.
2. **Find what changed.** List note paths with
   `obsidian vault=<vault> files ext=md`, then inspect each candidate's `modified` value with
   `obsidian vault=<vault> file path=<path>`. Keep only notes modified inside
   the window. Do not substitute `obsidian recents`: it reports recently
   opened files, not modified files.
3. **Read the sources.** Run `obsidian vault=<vault> read path=<path>` for each
   relevant note. Pull out decisions, completed or changed work, and open
   tasks. `obsidian vault=<vault> tasks path=<path> todo verbose format=json`
   may locate tasks, but the source note still must be read.
4. **Draft the review.** Lead with the one to three most important
   developments, then **Decisions**, **Changed / shipped**, and **Open tasks**.
   Link every task and claim to its source note.
5. **Preview and save.** Show the proposed path and complete Markdown. After
   approval, create it with
   `obsidian vault=<vault> create path=<path> content=<markdown>`, re-read it,
   and invoke `obsidian-agent:consistent-tagging` to reuse an existing review
   tag where appropriate.

## Common mistakes

- Summarizing from titles/memory instead of reading the notes.
- Dropping open tasks — they're the most useful part of a review.
- A wall of text instead of a skimmable, prioritized review.
- Treating recently opened files as evidence that those files changed.
