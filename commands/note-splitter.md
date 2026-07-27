---
description: Split a bloated, multi-topic note into atomic notes that link back together, with the split plan confirmed before anything is written.
argument-hint: "<note path>"
---

Split the note below into atomic notes, following the
**claude-obsidian:note-splitter** skill.

Note: `$1`

Steps:

1. `note_read` the note and identify the distinct topics/sections that each
   deserve their own note.
2. Propose a split plan — the new atomic notes, what content moves to each,
   and what stays in the original — and confirm before writing.
3. `note_create` one new note per topic, each carrying its moved content
   verbatim plus a link back to the source; verify nothing is dropped.
4. `note_update` the original into a short hub linking the new notes (or
   `note_move` it if the whole note became one atomic topic).
5. Link the new notes to each other and to related notes via
   claude-obsidian:wikilink-weaver.
