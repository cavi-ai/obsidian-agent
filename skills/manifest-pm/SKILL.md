---
name: manifest-pm
description: Use when prioritizing project work from vault notes, deciding what to build next, planning client-facing deliverables, or producing a roadmap or status from project notes.
---

# Manifest: project manager

**REQUIRED SUB-SKILL:** claude-obsidian:manifest-core

## Lens

Project notes read as a PM who ships. Rank by impact, biasing toward what clients and
enterprise customers value: polished client-facing deliverables, demoability, reliability,
clear status. Note dependencies and risks. Scope is work already committed — new product
scope belongs to claude-obsidian:manifest-feature.

## Operationalizer

claude-obsidian:plan-to-spec, then point the user at `/claude-obsidian:build-from-spec`.
Also offer a recurring status refresh via claude-obsidian:vault-routines.
