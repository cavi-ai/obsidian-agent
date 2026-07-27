---
description: Find duplicate or near-duplicate notes and merge them into one canonical note, tombstoning the rest.
argument-hint: "[optional scope]"
---

Find and merge duplicate notes, following the
**claude-obsidian:dedup-merge** skill.

Optional scope: `$1`

Steps:

1. `vault_search` / `list_titles` for likely duplicates (scoped by `$1` if
   given), then `note_read` each to confirm they truly overlap.
2. Pick the canonical note and propose the merge — what unique content
   combines, what's redundant — and confirm before writing.
3. `note_update` the canonical note to include the union of unique content.
4. Turn each duplicate into a tombstone with `note_update` (body:
   `Merged into [[Canonical]].`), optionally `note_move` it to `Archive/`,
   and tell the user to delete it in Obsidian if they want it gone.
5. Check `get_backlinks` to the duplicate and re-point those references to
   the canonical note via claude-obsidian:wikilink-weaver.
