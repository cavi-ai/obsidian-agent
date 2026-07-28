# CLAUDE.md

## What this repository is

`obsidian-agent` is a cross-host plugin for grounded Obsidian workflows. The
canonical `skills/` use the official Obsidian CLI 1.12.7+ and are shared by
Claude, Codex, Gemini CLI, OpenCode, and AgentSkills-compatible hosts.

The portable core has no MCP, Companion for Claude, Anthropic API, or direct
vault-file dependency. Companion for Claude is a separate Obsidian community
plugin and is not part of this repository's runtime topology.

## Source layout

- `skills/` — canonical workflow and safety instructions.
- `capabilities.json` — capability registry and portability classification.
- `commands/` — thin Claude compatibility delegates.
- `.claude-plugin/`, `.codex-plugin/`, and `gemini-extension.json` — native host
  metadata.
- `providers/` — isolated provider adapters with no copied workflow logic.
- `plugin.json` — cross-host provider map and runtime contract.
- `scripts/obsidian-cli.mjs` — deterministic CLI argument and doctor contract.
- `scripts/install.mjs` — preview-first provider installer.

## Contribution rules

- Keep portable workflow logic in canonical skills, not provider adapters.
- Select an ambiguous vault explicitly with `obsidian vault=<vault> <command>`.
- Use `path=` for exact vault-root targets and structured output only where the
  official CLI supports it.
- Preserve cite-before-claim, verify-before-link, preview-before-write,
  no-silent-overwrite, and post-write reread behavior.
- Do not add MCP configuration or use `obsidian eval` as a general escape hatch.
- Keep non-portable workflows explicitly marked and out of universal packages.

Run before committing:

```sh
node --test 'scripts/**/*.test.mjs'
node scripts/validate-registry.mjs
node scripts/validate-portability.mjs
git diff --check
```

Do not bump manifest versions, tag, release, push, or rename a remote without
explicit maintainer approval. A refactor or provider-packaging change is not a
release.
