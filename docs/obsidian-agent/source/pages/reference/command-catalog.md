# Command catalog

Every capability in the registry, grouped by the job it does. Portable
capabilities run on every host; **Claude-only** capabilities ship in the Claude
adapter alone. Workflows that edit notes follow the preview-and-confirm rules in
[Vault safety](../guides/vault-safety.md).

## Synthesis

| Capability | What it does |
| --- | --- |
| `vault-synthesis` | Answer "what do I know about X" across the whole vault — a grounded, cited synthesis that names contradictions and gaps. |
| `connection-finder` | Surface non-obvious relationships between notes that are not linked yet. Read-only; it proposes and explains, it does not edit. |
| `source-digest` | Compare notes typed or tagged as sources or papers into an evidence or comparison table. |

## Advisor

| Capability | What it does |
| --- | --- |
| `manifest` | Prioritize and propose work from vault notes by a chosen lens — roadmap, backlog, content plan, research agenda, risk register, or infra design. |
| `manifest-vault` | Audit vault health and surface structural problems to optimize or clean up. |
| `manifest-core` | Shared gather-prioritize-present-route spine the `manifest-*` skills follow. Invoked by them, not directly. |

## Note hygiene and structure

| Capability | What it does |
| --- | --- |
| `dedup-merge` | Find and merge duplicate or near-duplicate notes and consolidate redundant ones. |
| `frontmatter-normalizer` | Audit and normalize note frontmatter to a consistent schema, deferring to the vault's declared ontology. |
| `consistent-tagging` | Apply tags to new or untagged notes and clean up tag sprawl. |
| `note-splitter` | Split a note that covers too many topics into atomic, linked notes. |
| `wikilink-weaver` | Add and repair wikilinks where a note names others by title, and list orphan notes. Edits notes. |
| `summarize-and-link` | Add a TL;DR to a long note and surface and link its key concepts. |
| `moc-builder` | Build or refresh a Map of Content — an index or hub note organizing related notes. |

## Drafting and capture

| Capability | What it does |
| --- | --- |
| `outline-to-draft` | Expand an outline or stub into a full draft grounded in vault context and the user's voice. |
| `meeting-cleanup` | Turn raw meeting notes or voice memos into a structured note with decisions, action items, and attendees. |
| `note-to-artifact` | **Claude-only.** Turn notes, data, or a plan into a self-contained HTML artifact — report, dashboard, plan, table, or diagram. |

## Project and build

| Capability | What it does |
| --- | --- |
| `plan-to-spec` | Turn a planning note into a build spec and tracker ready for a coding-agent handoff. |
| `tracker-driver` | Drive a spec-based build against the vault and report progress honestly to its tracker note. |
| `build-retrospective` | Close out a completed spec-based build with a retrospective against its spec. |
| `task-harvester` | Collect open tasks scattered across notes — unchecked checkboxes and task-tagged items — into one action list. |

## Rollup and routines

| Capability | What it does |
| --- | --- |
| `daily-rollup` | Recap recent vault activity over a time window — what changed, what was decided, what is still open. |
| `session-to-note` | **Claude-only.** Distill a Claude session into a persistent, linked vault note. |
| `vault-routines` | **Claude-only.** Register a recurring vault result as a scheduled Claude Code agent. |
| `cloud-reply` | **Claude-only.** Run a dispatched cloud session against a vault repo, write the result as a reply note, and open a PR. |

## Shared and research

| Capability | What it does |
| --- | --- |
| `vault-grounding` | Shared sub-skill carrying the honesty rules for citing, linking, tagging, and writing in a vault. Invoked by other workflows. |
| `research-workbench` | **Claude-only.** Run a formal research project on typed records — sources, evidence with locators, supported claims, and provenance audits. |
