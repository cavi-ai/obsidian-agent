---
name: connection-finder
description: Use when looking for non-obvious conceptual relationships between notes that are not linked yet. Read-only discovery that ranks and explains candidate connections; it proposes, it does not edit. To write the links, use wikilink-weaver.
---

# Connection finder

Surface real, non-obvious relationships between notes that aren't linked yet —
the connections the user would value but hasn't made.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Anchor.** Take the focus note (or topic). Read a focus note with
   `obsidian vault=<vault> read path=<path>` and note its themes, entities,
   and questions.
2. **Cast a wide net.** Search each strong theme or entity with
   `obsidian vault=<vault> search query=<query> format=json`. Read every
   promising candidate in full; search results alone are not evidence.
3. **Exclude what's already linked.** For a focus note, run
   `obsidian vault=<vault> links path=<path>` and
   `obsidian vault=<vault> backlinks path=<path> format=json`. Do not
   re-suggest an existing connection.
4. **Judge for real relationships.** For each candidate, decide if there's a
   genuine conceptual link (shared argument, cause/effect, example-of, tension),
   not a coincidental keyword. Discard weak matches.
5. **Present ranked, with rationale.** Top connections first, each: the two
   notes, the relationship, and why it matters. Then, on the user's go-ahead,
   invoke `obsidian-agent:wikilink-weaver` to make the links.

## Common mistakes

- Suggesting a connection to a note that was never successfully read.
- Re-proposing links that already exist (didn't check existing links).
- Dumping every keyword co-occurrence instead of ranking real relationships.
