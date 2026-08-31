# Capability registry

`capabilities.json` is the single source of truth. It defines every workflow
once and records what each host may package. The installers and validators read
it; no host redefines a workflow.

## Shape

The registry is a small document:

- `plugin` — the plugin identifier, `obsidian-agent`.
- `requires` — host requirements, currently `{ "obsidian": ">=1.12.7" }`.
- `transport` — how workflows reach the vault, `cli`.
- `capabilities` — the array of capability records.

## A capability record

Each capability carries an `id`, a `description` that states when to use it, and
a `portable` flag. Portable capabilities (`portable: true`) are packaged for
every host; non-portable ones (`portable: false`) depend on Claude Code surfaces
and ship only in the Claude adapter.

## Why one registry

- **One definition.** A workflow's behavior lives in one place, so every host
  runs the same thing.
- **Explicit portability.** The `portable` flag is the contract the validators
  enforce; a Claude-only workflow can never leak into a portable package.
- **Auditable packaging.** Because the registry and host artifacts are declared,
  `scripts/validate-registry.mjs` and `scripts/validate-portability.mjs` can
  check that every host package matches the registry.

For the exact fields, see the
[Capability manifest reference](../reference/capability-manifest.md). For the
full list of capabilities, see the
[Command catalog](../reference/command-catalog.md).
