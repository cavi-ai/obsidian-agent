---
description: Find and apply missing wikilinks in a note — title mentions that are not yet linked — with the change shown before it is written.
argument-hint: "<note path>"
---

Weave missing wikilinks into the note below, following the
**claude-obsidian:wikilink-weaver** skill.

Note: `$1`

Steps:

1. Call `list_titles` for the vocabulary of valid link targets.
2. `note_read` the note and scan its body for unlinked mentions of those titles.
3. Check `get_outgoing_links` so you do not duplicate an existing link.
4. Propose each candidate with the phrase, the target, and why it is a real reference.
5. On confirmation, apply with `note_update`, having shown the change first.
