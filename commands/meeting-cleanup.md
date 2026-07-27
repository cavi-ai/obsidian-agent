---
description: Turn raw meeting notes or voice-memo capture into a structured note with attendees, decisions, and action items.
argument-hint: "<raw note path>"
---

Clean up the raw meeting capture below, following the
**claude-obsidian:meeting-cleanup** skill.

Raw note: `$1`

Steps:

1. `note_read` the raw note.
2. Extract, without embellishing: Attendees, Decisions, Action items (as
   `- [ ]` checkboxes with owner if stated), and Notes/discussion — mark
   unclear items `[?]` rather than guessing.
3. Structure the note under those headings, leading with decisions and
   actions.
4. Tag via claude-obsidian:consistent-tagging (include `meeting`) and link
   people/projects/topics via claude-obsidian:wikilink-weaver.
5. Write it — `note_update` in place (show the change first) or
   `note_create` a clean version linked to the raw note.
