---
description: Tag a note or scope of notes using the vault's existing tag taxonomy instead of growing sprawl.
argument-hint: "<note path or scope>"
---

Tag the note(s) below, following the **claude-obsidian:consistent-tagging**
skill.

Note or scope: `$1`

Steps:

1. Call `vault_tags` to learn the existing taxonomy and usage counts —
   prefer it over inventing new tags.
2. `note_read` each note so tags reflect actual content, not the title alone.
3. Pick 2-5 tags per note, reusing an existing tag whenever one fits; only
   propose a new tag for a genuinely new theme.
4. Watch for near-duplicates (`#project`/`#Projects`/`#project-x`) and match
   the vault's existing casing/format convention.
5. Show the proposed tags and reasoning, then on confirmation apply with
   `update_frontmatter` (tags are unioned, never replaced).
