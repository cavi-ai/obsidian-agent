---
name: manifest-vault
description: Use when asked to optimize, clean up, audit, or improve an Obsidian vault, assess vault health, or find structural problems in a vault.
---

# Manifest: vault optimizer

**REQUIRED SUB-SKILL:** claude-obsidian:manifest-core

## Lens

Structural survey, not claude-obsidian:vault-synthesis: `list_titles` (all notes),
`vault_tags` (taxonomy), `list_recent` (freshness), sample via `note_read`, and
`get_backlinks` / `get_outgoing_links` for orphans. Diagnose orphan notes, tag sprawl,
missing links, stale notes, and frontmatter inconsistency.

## Operationalizer

claude-obsidian:wikilink-weaver, claude-obsidian:consistent-tagging, and
claude-obsidian:frontmatter-normalizer. Never edit inline; offer a recurring sweep via claude-obsidian:vault-routines.
