---
description: Surface real, non-obvious connections to a note or topic that aren't linked yet, ranked by relevance.
argument-hint: "<note path or topic>"
---

Find non-obvious connections for the note/topic below, following the
**claude-obsidian:connection-finder** skill.

Note or topic: `$1`

Steps:

1. `note_read` the anchor (or treat `$1` as a topic) and note its themes,
   entities, and questions.
2. `vault_search` those themes/entities and `list_titles` to know what notes
   exist; `note_read` the promising candidates.
3. Check `get_outgoing_links` / `get_backlinks` on the anchor and exclude
   what's already linked.
4. Judge each candidate for a genuine conceptual link (not a coincidental
   keyword match) and discard weak ones.
5. Present the ranked connections with rationale; on the user's go-ahead,
   invoke claude-obsidian:wikilink-weaver to make the links.
