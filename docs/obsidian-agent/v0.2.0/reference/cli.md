# CLI reference

The repository ships two Node scripts: a doctor that validates the Obsidian CLI,
and an installer that stages host packages.

## `obsidian-cli.mjs`

```sh
node scripts/obsidian-cli.mjs doctor
```

`doctor` is the only subcommand. It checks the installed official Obsidian CLI
and reports whether the setup is usable. It never installs Obsidian, changes the
CLI setting, or touches a vault.

## `install.mjs`

```sh
node scripts/install.mjs --host <host> --scope <scope> [--project <path>] [--confirm]
```

| Flag | Values | Meaning |
| --- | --- | --- |
| `--host` | `claude`, `codex`, `gemini`, `opencode`, `agentskills` | Target host to stage. Required. |
| `--scope` | `user`, `project` | Install for the user, or stage into a project. Required. |
| `--project` | absolute path | Project root for `--scope project`. Defaults to the current directory. |
| `--confirm` | — | Apply the plan. Without it the command is a dry run. |

By default every invocation is a **dry run**: it prints each destination and a
content-bound plan and changes nothing. Add `--confirm` to write the staged
package.

An install plan can never escape the selected host root — the installer rejects
any plan whose destination would fall outside it.

See [Host packaging](host-packaging.md) for what each host receives, and
[Installation](../introduction/installation.md) for the per-host paths.
