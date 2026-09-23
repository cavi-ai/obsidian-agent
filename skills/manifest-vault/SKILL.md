---
name: manifest-vault
description: Use when asked to optimize, clean up, audit, or improve an Obsidian vault, assess vault health, or find structural problems in a vault.
---

# Manifest: vault optimizer

**REQUIRED SUB-SKILL:** obsidian-agent:manifest-core

## Lens

Structural survey, not `obsidian-agent:vault-synthesis`:

- enumerate notes with `obsidian vault=<vault> files ext=md`;
- inspect taxonomy with `obsidian vault=<vault> tags counts format=json`;
- inspect freshness with `obsidian vault=<vault> file path=<path>` and its
  `modified` value (not `obsidian recents`, which means recently opened);
- intersect `obsidian vault=<vault> orphans` and
  `obsidian vault=<vault> deadends`, then verify with
  `obsidian vault=<vault> backlinks path=<path> format=json` and
  `obsidian vault=<vault> links path=<path>`;
- inspect broken targets with
  `obsidian vault=<vault> unresolved counts verbose format=json`;
- read a representative sample with
  `obsidian vault=<vault> read path=<path>` and inspect it with
  `obsidian vault=<vault> properties path=<path> format=json`.

Diagnose orphan notes, tag sprawl, missing links, stale notes, and frontmatter
inconsistency.

## Operationalizer

`obsidian-agent:wikilink-weaver`, `obsidian-agent:consistent-tagging`, and
`obsidian-agent:frontmatter-normalizer`. Never edit inline; present findings
and let the user choose an operationalizer.

## Companion bridge (optional)

If tools from the `obsidian-vault` MCP server are available (Claude Code
shows them as `mcp__obsidian-vault__<tool>`), use them for the steps below;
otherwise follow the CLI steps above. Never require them.

- Inspect schema: `obsidian://ontology` — replaces re-deriving declared types from the ontology search in the Lens survey.
- Inspect standing context: `obsidian://memory` — supplements the freshness/orphan probes with the vault's consolidated summary.
