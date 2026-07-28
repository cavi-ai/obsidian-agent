---
name: note-splitter
description: Use when a note covers too many topics and should be split into atomic notes, breaking up a bloated note, or extracting sections into their own linked notes.
---

# Note splitter

Break a bloated, multi-topic note into atomic notes that link back together —
without losing content.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Read and map.** Run `obsidian vault=<vault> read path=<source-path>` and
   identify the distinct topics or sections that each deserve their own note.
2. **Propose a split plan.** List the new atomic notes (title + which content
   moves to each) and what stays in the original. Confirm before writing —
   splitting is consequential.
3. **Preview every write.** Show each new path and complete body plus the full
   before/after diff for the source. Prove that every original section lands in
   exactly one destination.
4. **Create the atomic notes.** After approval, run
   `obsidian vault=<vault> create path=<new-path> content=<markdown>` once per
   topic. Each note carries its moved content verbatim and a link back.
5. **Reshape the original.** Replace it with an approved hub using
   `obsidian vault=<vault> create path=<source-path> content=<hub-markdown> overwrite`
   (consider `obsidian-agent:moc-builder` if it is becoming an index). If the
   whole note became one atomic topic, use
   `obsidian vault=<vault> move path=<source-path> to=<destination>` instead.
   Re-read every resulting note.
6. **Link** the new notes to each other and to related notes via
   `obsidian-agent:wikilink-weaver`.

## Hard requirements

- A confirmed split plan before any write.
- No lost content — every part of the original lands somewhere.
- The original ends as a coherent hub or a clean atomic note, not a husk.

## Common mistakes

- Splitting without a plan or consent.
- Dropping or paraphrasing content instead of moving it verbatim.
- Leaving orphaned new notes with no links back.
