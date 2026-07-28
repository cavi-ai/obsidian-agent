---
name: wikilink-weaver
description: Use when a note's body mentions other notes by title without linking them, when applying or repairing wikilinks, or when listing orphan notes. This is the skill that edits notes to add links. For conceptual discovery instead, use connection-finder.
---

# Wikilink weaver

Find real, missing connections and weave them in — without inventing links.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Get the vocabulary of paths.** Run
   `obsidian vault=<vault> files ext=md`. Treat these as candidates, not proof:
   successfully read a target with `obsidian vault=<vault> read path=<path>`
   before proposing its wikilink.
2. **Read the source note** with `obsidian vault=<vault> read path=<path>` and
   scan its body for mentions of verified note titles that are not linked.
3. **Check what's already linked.** Run
   `obsidian vault=<vault> links path=<path>` and
   `obsidian vault=<vault> backlinks path=<path> format=json`.
4. **Propose links with evidence.** For each candidate: the phrase in the body,
   the target note, and why it's a real reference (not a coincidental word
   match). Skip weak/ambiguous matches.
5. **Apply on confirmation.** Show the complete note diff, then run
   `obsidian vault=<vault> create path=<path> content=<complete-markdown> overwrite`.
   Re-read the source and list its outgoing links to verify the change.

## Finding orphans

A note is an orphan only when it has neither incoming nor outgoing links.
Intersect `obsidian vault=<vault> orphans` with
`obsidian vault=<vault> deadends`, then verify each candidate with
`obsidian vault=<vault> backlinks path=<path> format=json` and
`obsidian vault=<vault> links path=<path>`. List them for the user; never
auto-link them.

## Common mistakes

- Linking to a target that was never successfully read.
- Re-adding a link that already exists (didn't check `obsidian links`).
- Matching a common word as if it were a note reference.
- Overwriting the note without showing the complete diff.
