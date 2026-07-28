---
name: moc-builder
description: Use when building or refreshing a Map of Content (MOC), creating an index or hub note for a topic or folder, or organizing related notes under one navigational note.
---

# MOC builder

Build a Map of Content — a hub note that groups and annotates links to the notes
on a topic, so the user can navigate the area at a glance.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Scope it.** For a topic, run
   `obsidian vault=<vault> search query=<topic> format=json`. For a folder, run
   `obsidian vault=<vault> files folder=<path> ext=md`. Read each candidate
   with `obsidian vault=<vault> read path=<path>` to confirm relevance.
2. **Group thematically.** Cluster the members into a few meaningful sections —
   not one flat list. Order sections by importance.
3. **Annotate.** Each entry is `[[Note]] — one-line what-it-covers`. Every
   target must be one of the notes successfully read in step 1.
4. **Preview the MOC.** Lead with a one-line purpose. If refreshing an existing
   MOC, read it first and show the complete diff; otherwise show the new path
   and body.
5. **Write after approval.** Use
   `obsidian vault=<vault> create path=<moc-path> content=<markdown> overwrite`
   only for an approved refresh; omit `overwrite` for a new MOC. Re-read it.
6. **Tag** via `obsidian-agent:consistent-tagging`, reusing an existing MOC tag.

## Common mistakes

- A flat, unannotated link dump (no grouping, no one-liners).
- Linking notes that don't exist, or missing obvious members.
- Overwriting an existing MOC without reading it first.
