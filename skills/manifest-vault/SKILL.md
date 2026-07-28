---
name: manifest-vault
description: Use when asked to optimize, clean up, audit, or improve an Obsidian vault, assess vault health, or find structural problems in a vault.
---

# Manifest: vault optimizer

**REQUIRED SUB-SKILL:** obsidian-agent:manifest-core

## Lens

Structural survey, not `obsidian-agent:vault-synthesis`:

- enumerate notes with `obsidian files vault=<vault> ext=md`;
- inspect taxonomy with `obsidian tags vault=<vault> counts format=json`;
- inspect freshness with `obsidian file vault=<vault> path=<path>` and its
  `modified` value (not `obsidian recents`, which means recently opened);
- intersect `obsidian orphans vault=<vault>` and
  `obsidian deadends vault=<vault>`, then verify with
  `obsidian backlinks vault=<vault> file=<path> format=json` and
  `obsidian links vault=<vault> file=<path>`;
- inspect broken targets with
  `obsidian unresolved vault=<vault> counts verbose format=json`;
- read a representative sample with
  `obsidian read vault=<vault> file=<path>` and inspect it with
  `obsidian properties vault=<vault> file=<path> format=json`.

Diagnose orphan notes, tag sprawl, missing links, stale notes, and frontmatter
inconsistency.

## Operationalizer

`obsidian-agent:wikilink-weaver`, `obsidian-agent:consistent-tagging`, and
`obsidian-agent:frontmatter-normalizer`. Never edit inline; present findings
and let the user choose an operationalizer.
