# obsidian-agent

`obsidian-agent` gives agent hosts a shared set of grounded Obsidian workflows:
vault synthesis, connection finding, note hygiene, drafting, project tracking,
and evidence-backed advisor passes. One canonical set of AgentSkills-compatible
skills powers every host adapter.

The portable package uses the official `obsidian` CLI exclusively. It does not
require MCP, Companion for Claude, an Anthropic API, or direct vault-file access.

## Requirement

Install Obsidian 1.12.7 or newer, enable the official command-line interface in
Obsidian settings, and make sure `obsidian` is on `PATH`. Verify the setup:

```sh
node scripts/obsidian-cli.mjs doctor
```

The doctor only checks the installed CLI. This repository never installs
Obsidian, enables its CLI setting, or changes a vault.

## Host support

| Host | Package | Invocation |
| --- | --- | --- |
| Claude Code | Native Claude plugin and compatibility commands | `/obsidian-agent:<command>` |
| Codex | Native Codex plugin metadata | Ask Codex to use an `obsidian-agent` skill |
| Gemini CLI | Native extension or user/workspace skills | Ask Gemini to activate an `obsidian-agent` skill |
| OpenCode | Native user/project skills | Ask OpenCode to load an `obsidian-agent` skill |
| AgentSkills hosts | Portable `SKILL.md` files | Use the host's normal skill invocation |

All hosts receive the 26 capabilities marked `portable: true` in
`capabilities.json`. Claude additionally retains thin compatibility commands
for five explicitly Claude-adapter-only workflows; those workflows are not
advertised as portable.

## Install

Claude can install the native package from its marketplace:

```text
/plugin marketplace add cavi-ai/obsidian-agent
/plugin install obsidian-agent@obsidian-agent
```

Gemini CLI can install the repository directly as a native extension. Its
official extension loader discovers the root `skills/` directory:

```sh
gemini extensions install https://github.com/cavi-ai/obsidian-agent
```

For Codex, OpenCode, AgentSkills-compatible hosts, or a direct Gemini
user/workspace skill installation, clone this repository and preview the
host-specific installation. Project scope defaults to the current directory;
pass `--project /absolute/path` to target another project.

```sh
node scripts/install.mjs --host codex --scope user
node scripts/install.mjs --host gemini --scope project --project /path/to/project
node scripts/install.mjs --host opencode --scope user
node scripts/install.mjs --host agentskills --scope project
```

The same installer can preview Claude's filesystem package when marketplace
installation is not appropriate:

```sh
node scripts/install.mjs --host claude --scope project
```

Each command above is a dry run. It prints every destination and a content-bound
preview hash. Nothing is written until you repeat the command with the exact
hash:

```sh
node scripts/install.mjs --host codex --scope user --confirm <preview-hash>
```

The installer copies only the selected provider metadata, Claude command shims
when applicable, and canonical portable skills. It refuses to overwrite files
that are not listed in its `.obsidian-agent-install.json` ownership record.

OpenCode installs each skill at
`~/.config/opencode/skills/<name>/SKILL.md` (user) or
`.opencode/skills/<name>/SKILL.md` (project). Gemini direct installs use
`~/.gemini/skills/<name>/SKILL.md` or `.gemini/skills/<name>/SKILL.md`.

To recover or uninstall, inspect that ownership record under the printed
destination root and remove only its listed files. Keep the record until the
last owned file is removed. Vault content and Obsidian settings are never part
of an install plan.

## CLI and write safety

When a vault must be selected, workflows use the official global-option order:

```sh
obsidian vault=Work search query="agent systems" format=json
obsidian vault=Work read path="Projects/CAVI.md"
```

Writes remain preview-and-confirm, avoid silent overwrites, and reread changed
notes. Exact vault-root targets use `path=`. The portable core does not use
`obsidian eval` as an escape hatch.

## Contributing and validation

Keep workflow logic in `skills/`; provider adapters should only package or
delegate to those canonical files. Run the complete gate before proposing a
change:

```sh
node --test 'scripts/**/*.test.mjs'
node scripts/validate-registry.mjs
node scripts/validate-portability.mjs
git diff --check
```

Versions in native manifests move only for an intentional release. Refactors
and host-packaging changes do not imply a version bump or release.

## Credits

The repository retains its existing third-party attributions in `NOTICE`.
