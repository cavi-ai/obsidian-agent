---
name: manifest-pm
description: Use when prioritizing already-scoped project work, producing a roadmap or client status from project notes, or deciding the next move on work that is already committed. For proposing new features from feedback, use manifest-feature.
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
