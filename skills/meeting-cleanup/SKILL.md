---
name: meeting-cleanup
description: Use when turning raw meeting notes, voice memos, or messy capture into a structured note with decisions, action items, and attendees.
---

# Meeting cleanup

Turn raw capture into a structured, skimmable note — without adding anything that
wasn't said.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Read the raw note** with
   `obsidian vault=<vault> read path=<raw-path>`.
2. **Extract, don't embellish.** Pull out: **Attendees**, **Decisions**,
   **Action items** (as `- [ ]` checkboxes, with owner if stated), and **Notes /
   discussion**. Capture only what the raw text supports; mark unclear items
   `[?]` rather than guessing.
3. **Structure it** under those headings, leading with decisions and actions
   (the parts people return for).
4. **Verify prospective links.** Run
   `obsidian vault=<vault> search query=<mention> format=json` for mentioned
   people, projects, and topics, then successfully read each intended target
   before adding a wikilink to the draft.
5. **Preview and write.** Show the complete Markdown and either the full
   in-place diff or a new path. After approval, use
   `obsidian vault=<vault> create path=<path> content=<markdown> overwrite` for
   an in-place replacement, or omit `overwrite` for a new clean note linked to
   the raw capture. Re-read the result.
6. **Tag and finish links.** Invoke `obsidian-agent:consistent-tagging` to
   reuse the vault's meeting tag. If the written note still has approved,
   unlinked mentions, invoke `obsidian-agent:wikilink-weaver`.

## Common mistakes

- Dropping action items, or losing who owns them.
- Inventing decisions/outcomes the raw notes don't support.
- Overwriting the raw capture without showing the change.
