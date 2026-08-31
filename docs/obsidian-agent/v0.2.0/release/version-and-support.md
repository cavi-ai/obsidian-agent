# Version and support

This documentation is built from `plugin.json`, the single version of record for
the plugin, its manifests, and this docs tree. The version shown for this
snapshot in the site's version selector is the version it was built from.

## Release binding

Each published snapshot ships with an immutable release manifest that binds the
documentation to its release tag and full source commit. Repository tags and
GitHub Release artifacts remain the authoritative release record; the built docs
follow them, never the other way around.

## Supported versions

Until the plugin reaches 1.0, fixes land on the latest release and the `main`
branch. Older snapshots stay published at their permanent versioned URLs but do
not receive backports.

## Compatibility

Obsidian Agent requires Obsidian 1.12.7 or newer with the official command-line
interface enabled. The requirement is declared in `capabilities.json` and
enforced by `node scripts/obsidian-cli.mjs doctor`.
