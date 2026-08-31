# Vault safety

Obsidian Agent's safety model is small on purpose: everything goes through the
official Obsidian CLI, and edits are always preview-and-confirm.

## The trust boundary

- **CLI only.** Every read and write uses explicit official `obsidian` CLI
  arguments. The package never touches vault files directly.
- **No escape hatch.** The portable core does not use `obsidian eval`, and it
  does not depend on Companion for Claude's local MCP server.
- **No credentials.** It needs no Anthropic API key and stores no secrets.

## Reads

Discovery and synthesis workflows read with explicit CLI arguments and, where a
workflow targets a specific vault location, use an exact `path=` vault-root
target rather than a guessed or fuzzy path.

## Writes

Editing workflows follow one discipline:

- **Preview and confirm.** Proposed changes are shown before anything is
  written; nothing is applied silently.
- **No silent overwrites.** An edit never clobbers existing content without
  surfacing it first.
- **Reread after write.** Changed notes are reread so the workflow reports what
  actually landed, not what it intended.

## Read-only versus editing workflows

Many capabilities are read-only by design — for example `connection-finder` and
`vault-synthesis` propose and explain but never edit. Others, such as
`wikilink-weaver` and `dedup-merge`, edit notes; those apply the write
discipline above. The [Command catalog](../reference/command-catalog.md) notes
which workflows edit.

## Shared honesty rules

The `vault-grounding` capability is a shared sub-skill other workflows invoke: it
carries the rules for citing, linking, tagging, and writing truthfully in a
vault. It keeps every workflow's claims grounded in what the vault actually
contains.
