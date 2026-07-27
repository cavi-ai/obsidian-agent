---
description: Add a TL;DR summary and links to key concepts at the top of a long note.
argument-hint: "<note path>"
---

Summarize and link the note below, following the
**claude-obsidian:summarize-and-link** skill.

Note: `$1`

Steps:

1. `note_read` the whole note and summarize the actual content, never the
   title alone.
2. Write a TL;DR: 2-4 sentences leading with the single most important
   point, optionally followed by a few key bullets.
3. Identify core concepts and link the ones that are (or should be) their
   own notes via claude-obsidian:wikilink-weaver — don't fabricate links.
4. Prepend the summary under a `## Summary` heading to the body you read in
   step 1, show the change, then write the combined body with `note_update`.
