---
name: consistent-tagging
description: Use when tagging notes, applying tags to new or untagged notes, or cleaning up tag sprawl and inconsistency in an Obsidian vault.
---

# Consistent tagging

Apply tags that fit the vault's *existing* taxonomy instead of growing sprawl.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Learn the taxonomy first.** Run
   `obsidian vault=<vault> tags counts format=json`. This is your vocabulary —
   prefer it over inventing new tags.
2. **Read each note** with `obsidian vault=<vault> read path=<path>` so tags
   reflect actual content, not the title alone. Also inspect its current tags
   with `obsidian vault=<vault> tags path=<path> format=json`.
3. **Match, don't multiply.** For each note, pick 2–5 tags. Reuse an existing
   tag whenever one fits. Only propose a new tag when nothing existing covers a
   genuinely new theme — and prefer the vault's casing/format convention.
4. **Catch near-duplicates.** Treat `#project`/`#Projects`/`#project-x` family
   members deliberately; don't create a sibling that means the same thing.
5. **Propose the complete merged list.** Show existing tags, additions, and the
   final list per note with reasoning. Never drop an existing tag implicitly.
6. **Apply only after approval.** Set the complete merged list with
   `obsidian vault=<vault> property:set path=<path> name=tags value=<tags> type=list`.
   This command replaces the property value, so the final list must include the
   existing tags being retained. Immediately re-read the complete changed note
   with `obsidian vault=<vault> read path=<path>` to ensure the body and other
   frontmatter stayed intact, then re-run
   `obsidian vault=<vault> tags path=<path> format=json` to verify the final tag
   projection.

## Common mistakes

- Tagging from the title without reading the note.
- Inventing `#machine-learning` when `#ml` already has 40 uses.
- Case/plural drift creating silent duplicate tags.
- Writing tags before showing the user what you'll apply.
- Passing only new tags to `property:set` and accidentally replacing existing
  tags.
