---
name: frontmatter-normalizer
description: Use when auditing or normalizing note frontmatter to a consistent schema across a folder or the vault. Defers to the vault's declared ontology types where they exist and proposes a schema only where they are silent.
---

# Frontmatter normalizer

Bring a set of notes to a consistent frontmatter schema — surveying what's
there before changing anything.

**REQUIRED SUB-SKILL:** claude-obsidian:vault-grounding

## Process

1. **Check for an ontology first — it outranks any schema you would invent.**
   Run `frontmatter_query` with `field: ontology, value: type` to find the
   vault's schema notes. Do not look in a folder by name: the ontology folder is
   user-configurable. `note_read` each hit — the frontmatter carries `type_name`,
   and the body's first fenced `yaml` block holds that type's `extends`,
   `properties`, and `relations`.

   - **If schema notes exist, the ontology IS the schema.** Normalize notes
     *toward* their declared type. Never propose a field that contradicts a
     declared type's required properties, and never propose a competing
     convention for something a type already covers.
   - **Where the ontology is silent** (a note set or field no type covers),
     propose extending it — a new or edited schema note — rather than an ad-hoc
     frontmatter convention the ontology will not know about.
   - **If there are no schema notes**, continue with the survey-and-propose flow
     below.
2. **Survey.** Use `frontmatter_query` across the target notes to see which
   fields exist and how values vary (e.g. `type` present on some, missing on
   others; `status` values inconsistent).
3. **Agree the schema.** Propose the target schema (which fields, allowed
   values) and confirm it with the user — don't impose one silently.
4. **Find the gaps.** List notes missing required fields or using off-schema
   values. Show this before editing.
5. **Apply, additively.** Use `update_frontmatter` to set missing/normalized
   fields. It merges (tags union; scalar set) and preserves untouched keys —
   never strip fields you didn't discuss.
6. **Batch with consent.** Apply in batches the user approves; report what
   changed.

## Hard requirements

- Query for schema notes (`ontology: type`) BEFORE proposing any schema.
- Never propose a field that contradicts a declared type's required properties.
- Where an ontology exists, new conventions are proposed as schema notes, not as
  loose frontmatter keys.
- Survey with `frontmatter_query` BEFORE proposing a schema.
- Confirm the schema and the change set before writing.
- Additive normalization — don't delete frontmatter you weren't asked to.

## Common mistakes

- Proposing a schema without checking whether the vault already declares types.
- Looking for schema notes in a hardcoded `Ontology/` folder instead of querying
  the `ontology: type` marker.
- Inventing a `status` convention when a declared type already defines one.
- Imposing a schema without seeing the existing one.
- Bulk-rewriting metadata with no consent or preview.
