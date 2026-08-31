# Host packaging

Every host receives the same canonical workflows; only the package shape and
invocation differ. The installer stages each package from the registry and the
shared `skills/` directory.

## What each host gets

| Host | Package shape | Notes |
| --- | --- | --- |
| Claude Code | Native Claude plugin | Carries the portable skills plus thin compatibility commands for the Claude-only workflows. |
| Codex | Self-contained marketplace package | `.codex-plugin/plugin.json`, `./skills/`, and exactly the portable skills. Staged, not activated. |
| Gemini CLI | Native extension | Gemini's loader discovers the root `skills/` directory. |
| OpenCode | User or project skills | Portable skills installed into the OpenCode skill roots. |
| AgentSkills hosts | Portable `SKILL.md` files | The lowest-common-denominator package; invoked through the host's normal skill mechanism. |

## Staging with the installer

`node scripts/install.mjs --host <host> --scope <scope>` computes the
destination roots for the chosen host and scope and stages the package there.
User scope installs for the current user; project scope stages into a project
(current directory, or `--project <path>`).

For Codex, staging creates the marketplace package at `~/plugins/obsidian-agent`
(user) or `<project>/plugins/obsidian-agent` (project). Staging never activates a
plugin or edits marketplace state; install it through the CAVI marketplace or an
explicitly configured Codex marketplace.

## The packaging contract

- A host package carries exactly the capabilities its `portable` flag allows — a
  Claude-only workflow never appears in a portable package.
- Adapters package or delegate to the canonical skill; they never fork behavior.
- `scripts/validate-portability.mjs` enforces both rules against the registry.

See the [CLI reference](cli.md) for every installer flag and
[Hosts and portability](../guides/hosts-and-portability.md) for the portability
contract.
