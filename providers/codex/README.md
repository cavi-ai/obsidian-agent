# Codex adapter

Codex uses the canonical `.codex-plugin/plugin.json` ingestion contract and the
portable workflows at plugin-root-relative `./skills/`. The preview-first
installer stages a self-contained package with exactly the 26 capabilities
marked `portable: true` at `~/plugins/obsidian-agent` (user) or
`<project>/plugins/obsidian-agent` (project staging).

Copying that package does not activate it. Codex plugins are marketplace-backed;
install the package through the CAVI marketplace or add it to an explicitly
configured personal/team marketplace. The installer never edits marketplace
state.

The Obsidian `>=1.12.7` requirement remains in the host-neutral `plugin.json`
and user documentation because Codex's native manifest has no supported
`requires` field.

See the current Codex [plugin manifest specification](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/plugin-creator/references/plugin-json-spec.md).
