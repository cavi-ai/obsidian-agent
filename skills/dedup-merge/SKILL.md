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
   `obsidian vault=<vault> search query=<query> format=json`. Read each
   candidate with `obsidian vault=<vault> read path=<path>` to confirm it truly
   overlaps; a similar title is not enough.
2. **Pick the canonical note** and propose the merge: what unique content from
   each copy combines, and what's redundant. Confirm before writing.
3. **Preview the complete result.** Show the full canonical-note diff and prove
   where every unique section from the duplicate will land.
4. **Merge after approval.** Replace the canonical note with
   `obsidian vault=<vault> create path=<canonical-path> content=<merged-markdown> overwrite`,
   then re-read it with
   `obsidian vault=<vault> read path=<canonical-path>` and verify the unique
   content remains.
5. **Re-point references.** Before moving or trashing the duplicate, inspect
   `obsidian vault=<vault> backlinks path=<duplicate-path> format=json` and
   invoke `obsidian-agent:wikilink-weaver` for approved reference changes.
6. **Handle the duplicate explicitly.** Offer either:
   - replace it with a `Merged into [[Canonical]].` tombstone using
     `obsidian vault=<vault> create path=<duplicate-path> content=<tombstone-markdown> overwrite`;
   - archive it with
     `obsidian vault=<vault> move path=<duplicate-path> to=<archive-path>`;
   - move it to trash with
     `obsidian vault=<vault> delete path=<duplicate-path>`.
   Show the exact target and obtain separate approval before any option. Verify
   the approved branch immediately afterward: re-read the tombstone at
   `path=<duplicate-path>`; for an archive move, re-read
   `path=<archive-path>` and confirm `path=<duplicate-path>` no longer resolves;
   for trash, confirm an exact-path read of `path=<duplicate-path>` no longer
   resolves. Report the verification result rather than assuming the mutation
   succeeded.

## Hard requirements

- Confirm the merge plan before writing.
- Never lose unique content from the non-canonical copy.
- Never delete permanently; the default CLI delete must use the vault trash.

## Common mistakes

- Treating same-titled notes as duplicates without reading them.
- Dropping content that only existed in the merged-away copy.
- Deleting or archiving the duplicate without separate explicit approval.
