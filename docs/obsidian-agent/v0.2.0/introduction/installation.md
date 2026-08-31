# Installation

Obsidian Agent installs as a native package on the hosts that support one, and
as portable skills everywhere else. Every host receives the same portable
capabilities from one registry.

## Requirements

- Obsidian 1.12.7 or newer.
- The official Obsidian command-line interface enabled in Obsidian settings,
  with `obsidian` on your `PATH`.

Confirm the setup before installing — see [Quickstart](quickstart.md).

## Claude Code

Install the native plugin from the CAVI marketplace:

```text
/plugin marketplace add cavi-ai/obsidian-agent
/plugin install obsidian-agent@obsidian-agent
```

Claude also keeps thin compatibility commands for the Claude-only workflows.

## Gemini CLI

Install the repository directly as a native extension. Gemini's extension loader
discovers the root `skills/` directory:

```sh
gemini extensions install https://github.com/cavi-ai/obsidian-agent
```

## Codex, OpenCode, and AgentSkills

Clone the repository and stage a host-specific package with the installer. Every
command is a **dry run** by default — it prints every destination and a
content-bound plan, and changes nothing until you pass `--confirm`:

```sh
node scripts/install.mjs --host codex --scope user
node scripts/install.mjs --host gemini --scope project --project /path/to/project
node scripts/install.mjs --host opencode --scope user
node scripts/install.mjs --host agentskills --scope project
```

Project scope defaults to the current directory; pass `--project /absolute/path`
to target another project. For Codex, the installer stages a self-contained
marketplace package (`.codex-plugin/plugin.json`, `./skills/`, and exactly the
portable skills) at `~/plugins/obsidian-agent` (user) or
`<project>/plugins/obsidian-agent` (project); staging never activates the plugin
or edits marketplace state.

See the [CLI reference](../reference/cli.md) for every flag and
[Host packaging](../reference/host-packaging.md) for what each host receives.
