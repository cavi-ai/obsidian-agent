---
name: dedup-merge
description: Use when finding and merging duplicate or near-duplicate notes, consolidating notes that cover the same thing, or cleaning up redundant notes in an Obsidian vault.
---

# Dedup & merge

Consolidate duplicate notes into one canonical note without losing unique
content or silently removing anything.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Find candidates.** Search likely titles and phrases with
   `obsidian search vault=<vault> query=<query> format=json`. Read each
   candidate with `obsidian read vault=<vault> file=<path>` to confirm it truly
   overlaps; a similar title is not enough.
2. **Pick the canonical note** and propose the merge: what unique content from
   each copy combines, and what's redundant. Confirm before writing.
3. **Preview the complete result.** Show the full canonical-note diff and prove
   where every unique section from the duplicate will land.
4. **Merge after approval.** Replace the canonical note with
   `obsidian create vault=<vault> path=<canonical-path> content=<merged-markdown> overwrite`,
   then re-read it and verify the unique content remains.
5. **Re-point references.** Before moving or trashing the duplicate, inspect
   `obsidian backlinks vault=<vault> file=<duplicate-path> format=json` and
   invoke `obsidian-agent:wikilink-weaver` for approved reference changes.
6. **Handle the duplicate explicitly.** Offer either:
   - replace it with a `Merged into [[Canonical]].` tombstone using
     `obsidian create vault=<vault> path=<duplicate-path> content=<tombstone-markdown> overwrite`;
   - archive it with `obsidian move vault=<vault> file=<path> to=<archive-path>`;
   - move it to trash with `obsidian delete vault=<vault> file=<path>`.
   Show the exact target and obtain separate approval before any option.

## Hard requirements

- Confirm the merge plan before writing.
- Never lose unique content from the non-canonical copy.
- Never delete permanently; the default CLI delete must use the vault trash.

## Common mistakes

- Treating same-titled notes as duplicates without reading them.
- Dropping content that only existed in the merged-away copy.
- Deleting or archiving the duplicate without separate explicit approval.
