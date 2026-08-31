# Obsidian Agent overview

Obsidian Agent is a portable set of grounded Obsidian workflows for agent hosts.
It gives Claude, Codex, Gemini, OpenCode, and AgentSkills-compatible hosts one
canonical capability registry — vault synthesis, connection finding, note
hygiene, drafting, project tracking, and evidence-backed advisor passes — so the
same workflow behaves the same way on every host.

## What it is

The package defines every workflow once in `capabilities.json` and packages it
per host. There are 26 capabilities in the registry; 21 are portable and run on
every host, and 5 are Claude-adapter-only workflows that depend on Claude Code
surfaces (cloud dispatch, HTML artifacts, session capture, scheduled routines,
and the research workbench). A host never forks a workflow's behavior or adds
host-specific vault semantics; it only packages or delegates to the canonical
skill.

## How it talks to a vault

Obsidian Agent uses the official `obsidian` command-line interface exclusively.
It does **not** require MCP, Companion for Claude, an Anthropic API key, or
direct vault-file access. Reads use explicit CLI arguments; writes are
preview-and-confirm. This is the whole trust boundary — see
[Vault safety](../guides/vault-safety.md).

## Independent of Companion for Claude

Obsidian Agent and [Companion for Claude](https://cavi-ai.xyz/docs/companion-for-claude)
are separate products that can be used together or apart. Companion is an in-vault
Obsidian plugin with an optional local MCP bridge; Obsidian Agent is a portable,
CLI-only workflow package. Obsidian Agent never depends on Companion's MCP
server.

## Where to go next

- [Installation](installation.md) — install for your host.
- [Quickstart](quickstart.md) — enable the CLI and run your first workflow.
- [Command catalog](../reference/command-catalog.md) — every workflow, grouped.
- [Capability registry](../guides/capability-registry.md) — how the registry works.
