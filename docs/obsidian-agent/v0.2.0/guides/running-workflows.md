# Running workflows

A workflow is a capability from the registry. You invoke it the way your host
invokes any skill; the workflow then reads or edits the vault through the
official CLI.

## Invocation per host

- **Claude Code** — a slash command: `/obsidian-agent:<capability>`, optionally
  with an instruction, e.g. `/obsidian-agent:task-harvester`.
- **Codex, Gemini, OpenCode, AgentSkills** — ask the host to use or activate the
  named `obsidian-agent` skill. The host loads the same canonical skill.

Portable capabilities behave identically across hosts; only invocation differs.

## What a workflow does

Each capability declares when it applies (its "use when" description) and follows
the vault-safety discipline. Read-only workflows propose and explain; editing
workflows preview changes and confirm before writing.

## The workflow families

The registry groups into a few recurring jobs:

- **Synthesis** — answer questions and surface structure from the whole vault:
  `vault-synthesis`, `connection-finder`, `source-digest`.
- **Advisor** — propose and rank work by a chosen lens (roadmap, backlog,
  content plan, research agenda, risk register, infra): the `manifest` family.
- **Note hygiene** — keep the vault clean: `dedup-merge`,
  `frontmatter-normalizer`, `consistent-tagging`, `note-splitter`,
  `wikilink-weaver`, `summarize-and-link`.
- **Drafting and capture** — turn raw material into notes: `outline-to-draft`,
  `meeting-cleanup`, `note-to-artifact` (Claude).
- **Project and build** — plan, drive, and close out work:
  `plan-to-spec`, `tracker-driver`, `build-retrospective`, `task-harvester`.
- **Rollup and routines** — recurring and session-linked work: `daily-rollup`,
  `session-to-note` (Claude), `vault-routines` (Claude), `cloud-reply` (Claude).

See the [Command catalog](../reference/command-catalog.md) for every capability
with its one-line purpose and portability.
