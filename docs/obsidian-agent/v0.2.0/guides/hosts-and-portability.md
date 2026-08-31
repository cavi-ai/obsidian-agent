# Hosts and portability

One canonical registry defines every workflow once and records whether it is
portable. Host adapters package or delegate to the canonical skill files — they
must not fork workflow behavior or introduce host-specific vault semantics.

## Supported hosts

| Host | Package | Invocation |
| --- | --- | --- |
| Claude Code | Native Claude plugin plus thin compatibility commands | `/obsidian-agent:<command>` |
| Codex | Native marketplace plugin carrying the portable skills | Ask Codex to use an `obsidian-agent` skill |
| Gemini CLI | Native extension, or user/workspace skills | Ask Gemini to activate an `obsidian-agent` skill |
| OpenCode | Native user/project skills | Ask OpenCode to load an `obsidian-agent` skill |
| AgentSkills hosts | Portable `SKILL.md` files | The host's normal skill invocation |

## Portable and non-portable capabilities

Every capability declares `portable: true` or `portable: false` in
`capabilities.json`. All hosts receive the portable capabilities — 21 of the 26.

The remaining 5 are Claude-adapter-only because they depend on Claude Code
surfaces:

- `cloud-reply` — dispatched cloud Claude Code sessions.
- `note-to-artifact` — self-contained HTML artifacts.
- `session-to-note` — capturing a Claude session into the vault.
- `vault-routines` — scheduling recurring vault work.
- `research-workbench` — the typed research-record project workflow.

Claude retains thin compatibility commands for the Claude-only workflows that
declare one. They are marked `portable: false` and are never advertised as
portable to other hosts.

## The portability contract

- A capability is defined exactly once and packaged, never rewritten, per host.
- Portable capabilities carry identical behavior across every host.
- Adapters may change packaging and invocation, never workflow semantics.

The repository ships portability and registry validators
(`scripts/validate-portability.mjs`, `scripts/validate-registry.mjs`) that
enforce this contract. See [Host packaging](../reference/host-packaging.md) for
how each host's package is built.
