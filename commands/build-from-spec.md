---
description: Build from an Obsidian build-spec note and report progress through the canonical tracker workflow.
argument-hint: "<spec note path> [tracker note path]"
---

# Claude compatibility adapter

Invoke **`obsidian-agent:tracker-driver`** with the user's arguments:

`$ARGUMENTS`

Use the spec and tracker paths in the user's arguments while following the canonical tracker skill. The host performs the requested build work; the skill owns all vault progress reporting.
