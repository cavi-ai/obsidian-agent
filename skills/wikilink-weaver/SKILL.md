---
name: wikilink-weaver
description: Use when a note's body mentions other notes by title without linking them, when applying or repairing wikilinks, or when listing orphan notes. This is the skill that edits notes to add links. For conceptual discovery instead, use connection-finder.
---

# Wikilink weaver

Find real, missing connections and weave them in — without inventing links.

**REQUIRED SUB-SKILL:** claude-obsidian:vault-grounding

## Process

1. **Get the vocabulary of titles.** Call `list_titles` for every note path +
   title. These are the only valid link targets — never link to a title that
   isn't here.
2. **Read the source note** (`note_read`) and scan its body for mentions of
   existing note titles that are not yet `[[linked]]`.
3. **Check what's already linked.** Use `get_outgoing_links` (avoid duplicating
   existing links) and `get_backlinks` (understand current connectivity).
4. **Propose links with evidence.** For each candidate: the phrase in the body,
   the target note, and why it's a real reference (not a coincidental word
   match). Skip weak/ambiguous matches.
5. **Apply on confirmation** with `note_update` (replace the body or the
   affected section), having shown the change first.

## Finding orphans

A note is an orphan when `get_backlinks` returns none AND `get_outgoing_links`
returns none. List orphans so the user can decide where they belong — don't
auto-link them.

## Common mistakes

- Linking to a title that isn't in `list_titles` (broken link).
- Re-adding a link that already exists (didn't check `get_outgoing_links`).
- Matching a common word as if it were a note reference.
- Overwriting the note via `note_update` without showing the change.
