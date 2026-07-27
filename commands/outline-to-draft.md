---
description: Expand an outline or stub note into a full draft grounded in the vault and written in the user's own voice.
argument-hint: "<outline note path>"
---

Expand the outline below into a draft, following the
**claude-obsidian:outline-to-draft** skill.

Outline note: `$1`

Steps:

1. `note_read` the outline and gather its context: follow
   `get_outgoing_links` / `get_backlinks` and `vault_search` the topic,
   `note_read`ing the most relevant notes.
2. Skim 1-2 of the user's existing prose notes to match their tone,
   sentence length, and vocabulary.
3. Draft section by section following the outline's structure, citing
   `[[notes]]` for factual claims and marking real gaps `[TODO: …]`.
4. Show the draft, then on confirmation write it: `note_update` to expand
   the outline in place, or `note_create` for a new draft linked back to it.
