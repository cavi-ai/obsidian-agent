---
name: vault-grounding
description: Use when another obsidian-agent skill declares it as a required sub-skill — the honesty rules for citing, linking, tagging, and writing in a vault. A shared discipline other skills invoke, never a response to a user request on its own.
---

# Vault grounding

The portable discipline for working honestly inside someone's vault. Every
portable `obsidian-agent` skill builds on this and uses the official Obsidian
CLI. Obsidian 1.12.7 or newer must be installed, the command-line interface
must be enabled, and Obsidian must be running. Use
`node scripts/obsidian-cli.mjs doctor` when availability is uncertain.

**Violating the letter of these rules is violating their spirit.**

## The rules

1. **Cite, don't fabricate.** Every factual claim about the vault must trace to
   a note you actually read with `obsidian read`. Never assert vault content from
   memory or inference. If you didn't read it, you don't know it.
2. **Don't pad.** When asked what the vault says, answer from the vault only. If
   it's thin on the topic, say so plainly — do not supplement with general
   knowledge or fill gaps from memory. A short honest answer beats a padded one.
3. **Verify before you link.** Before writing a `[[Wikilink]]`, confirm the
   target exists by reading its exact path with `obsidian read`. A link to a
   non-existent note is a broken link, not a helpful one.
4. **Reuse the user's taxonomy and voice.** Inspect
   `obsidian vault=<vault> tags counts format=json` before tagging; reuse
   existing tags over inventing near-duplicates. Match the note's existing tone
   — you are extending their vault, not imposing yours.
5. **Preview before writes.** Before `obsidian create`, `append`, `prepend`,
   `property:set`, `property:remove`, `move`, `rename`, or `delete`, show the
   exact proposed change and get explicit approval. Re-read every changed note
   afterward. Never use `create ... overwrite` unless the user approved
   replacing the complete current contents.
6. **Right output form.** Return portable Markdown. Use headings, tables,
   callouts, wikilinks, and fenced Mermaid diagrams when they improve the
   result; do not require a host-specific renderer.

## Red flags — STOP

- About to write a fact about the vault you didn't read → read it first.
- About to write `[[X]]` without confirming X exists → read the target first.
- About to replace a note → show the complete diff and confirm first.
- Inventing a new tag when a similar one exists → reuse the existing tag.
- About to use `create ... overwrite` without explicit replacement approval →
  stop.

## Quick reference

| Need | Official CLI form |
|------|-------------------|
| Find notes on a topic | `obsidian vault=<vault> search query=<query> format=json` |
| Read or verify a note | `obsidian vault=<vault> read path=<path>` |
| Find notes linking here | `obsidian vault=<vault> backlinks path=<path> format=json` |
| List outgoing links | `obsidian vault=<vault> links path=<path>` |
| Inspect existing tags | `obsidian vault=<vault> tags counts format=json` |
| List files in a scope | `obsidian vault=<vault> files folder=<path>` |
| Create a new note | `obsidian vault=<vault> create path=<path> content=<markdown>` |
| Append without replacing | `obsidian vault=<vault> append path=<path> content=<markdown>` |
| Set a frontmatter property | `obsidian vault=<vault> property:set path=<path> name=<name> value=<value> type=<type>` |
