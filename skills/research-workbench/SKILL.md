---
name: research-workbench
description: Use when running a formal research project on typed research records — creating a project, importing sources, capturing evidence with locators, building supported claims, auditing provenance, and generating an evidence-backed outline via the research_* tools.
---

# Research workbench

Preserve continuity from research question through an evidence-backed outline.

**REQUIRED SUB-SKILL:** claude-obsidian:vault-grounding

## Process

1. **Project** — identify the active `research-project`; if none exists, offer
   `research_project_create` with a focused question.
2. **Source** — import source material with `research_source_import`; preserve
   readable content and its computed fingerprint.
3. **Evidence** — capture an exact excerpt and locator with
   `research_evidence_capture`, then use `research_evidence_review` before
   treating it as trusted.
4. **Claim** — use `research_claim_create` to keep supporting, challenging, and
   contextual relations distinct.
5. **Link** — attach further evidence to an existing claim with
   `research_claim_link`, choosing `supports`, `challenges`, or `contextualizes`
   deliberately; the relation is not decoration, it is what the audit and the
   outline read.
6. **Audit** — run `research_audit`; surface stale fingerprints, missing
   locators, broken references, unreviewed evidence, and unsupported claims.
7. **Outline** — use `research_outline_generate`; include only reviewed,
   locatable, non-stale evidence as trusted support.

## Hard requirements

- Use research tools instead of hand-editing canonical research records.
- Never present proposed, rejected, stale, disconnected, or unsupported material
  as trusted support.
- Ask before material vault writes and report the records created or updated.
- Run only the stages needed for the user's request, then name the next useful
  stage.
- If a required tool is unavailable, identify it and stop rather than fabricate
  state.

## Common mistakes

- Hand-editing a research record instead of using the `research_*` tool that owns it.
- Treating captured evidence as trusted before `research_evidence_review`.
- Generating an outline without running `research_audit` first, so stale
  fingerprints and broken references reach the draft.
- Recording every relation as `supports` because it is the default-looking option.
- Inventing project state when a `research_*` tool is unavailable instead of stopping.
