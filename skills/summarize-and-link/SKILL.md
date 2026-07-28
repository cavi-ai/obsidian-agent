---
name: summarize-and-link
description: Use when adding a TL;DR or summary to a long note, condensing a note, or surfacing and linking the key concepts inside a note.
---

# Summarize and link

Give a long note a useful entry point: a tight summary up top and links to the
key concepts it touches.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Read the whole note** with
   `obsidian vault=<vault> read path=<path>` — summarize the actual content,
   never the title alone.
2. **Write a TL;DR**: 2–4 sentences leading with the note's single most important
   point, optionally followed by a few key bullets.
3. **Surface key concepts.** Identify the core concepts. Search with
   `obsidian vault=<vault> search query=<concept> format=json` and successfully
   read each intended target before adding a wikilink to the summary; never
   fabricate a link.
4. **Preview and place the summary.** Show the inserted block and its location.
   If no Summary section exists, obtain approval and run
   `obsidian vault=<vault> prepend path=<path> content=<summary-markdown>`;
   Obsidian places it after frontmatter. If replacing an existing Summary,
   show the complete note diff and, after approval, run
   `obsidian vault=<vault> create path=<path> content=<complete-markdown> overwrite`.
   Re-read the result.

## Common mistakes

- Summarizing from the title/memory rather than the content.
- Linking concepts to notes that don't exist.
- Rewriting the whole note instead of prepending a summary.
