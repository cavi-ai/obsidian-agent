---
description: Close out a spec-based build with an honest retrospective grounded in what the tracker actually records.
argument-hint: "<tracker note path>"
---

Write a retrospective for the build below, following the
**claude-obsidian:build-retrospective** skill.

Tracker note: `$1`

Steps:

1. `note_read` the tracker note and its spec note.
2. Tally honestly: what shipped, what's still open or blocked (and why), and
   any scope that changed — don't claim completion the tracker doesn't show.
3. Draw a few concrete lessons tied to specific tasks.
4. Write the retro with `note_create`, titled `<Build> — retrospective`,
   linking `[[spec]]` and `[[tracker]]` (verify both exist).
5. Tag via claude-obsidian:consistent-tagging (include `retro`).
