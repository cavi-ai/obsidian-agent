# Trust boundary

Obsidian Agent is deliberately narrow about what it can reach. This page states
the boundary precisely.

## What it uses

- **The official Obsidian CLI, and only that.** Every read and write is an
  explicit official `obsidian` CLI call.

## What it never uses

- **No direct vault-file access.** It does not read or write vault files outside
  the CLI.
- **No `obsidian eval` escape hatch** in the portable core.
- **No MCP.** It does not require or depend on Companion for Claude's local MCP
  server.
- **No Anthropic API key** and no stored credentials or secrets.
- **No network access to your vault contents** beyond what a workflow you invoke
  explicitly does.

## Write safety

Edits are preview-and-confirm: changes are shown before they are written, silent
overwrites are avoided, and changed notes are reread so the workflow reports what
actually landed. Exact vault-root targets use `path=` rather than a guessed
path. See [Vault safety](../guides/vault-safety.md) for the full write
discipline.

## Reporting a problem

Do not open a public issue for a security or vault-safety concern. Use GitHub's
private vulnerability reporting for the repository, and use synthetic examples —
never include real vault contents or credentials.
