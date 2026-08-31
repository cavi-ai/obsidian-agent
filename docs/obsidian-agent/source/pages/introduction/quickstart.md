# Quickstart

This walks from a fresh Obsidian install to running your first grounded
workflow.

## 1. Enable the Obsidian CLI

In Obsidian 1.12.7 or newer, enable the official command-line interface in
settings and make sure `obsidian` is on your `PATH`.

## 2. Check the setup

The doctor validates only the installed CLI. It never installs Obsidian, changes
the CLI setting, or touches a vault:

```sh
node scripts/obsidian-cli.mjs doctor
```

Resolve anything it reports before continuing.

## 3. Install for your host

Pick the path for your host from [Installation](installation.md). For example,
in Claude Code:

```text
/plugin marketplace add cavi-ai/obsidian-agent
/plugin install obsidian-agent@obsidian-agent
```

## 4. Run a workflow

Invoke a capability the way your host invokes skills. In Claude Code that is a
slash command; other hosts activate the skill by name. For example, to ask the
whole vault a question:

```text
/obsidian-agent:vault-synthesis What do I know about retrieval evaluation?
```

`vault-synthesis` returns a grounded, cited answer across every note, naming
contradictions and gaps. It reads through the official CLI and writes nothing.

## 5. Know the safety model

Discovery workflows read and propose; only edit workflows write, and writes are
always preview-and-confirm. Before running a workflow that edits notes, read
[Vault safety](../guides/vault-safety.md).

## Next

- [Running workflows](../guides/running-workflows.md) — how invocation works per host.
- [Command catalog](../reference/command-catalog.md) — the full set of workflows.
