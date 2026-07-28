---
name: vault-synthesis
description: Use when answering "what do I know about X" from the whole vault — a grounded, cited topic synthesis across all notes regardless of type, with contradictions and gaps named.
---

# Vault synthesis

Answer a question from the vault itself — grounded, cited, honest about gaps and
contradictions. Not a general-knowledge essay.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Gather.** Run
   `obsidian vault=<vault> search query=<topic> format=json`. Read the most
   relevant hits in full with `obsidian vault=<vault> read path=<path>`, then
   follow `obsidian vault=<vault> backlinks path=<path> format=json` and
   `obsidian vault=<vault> links path=<path>` to find connected notes the
   search missed. Read those notes before using them.
2. **Extract claims, attributed.** As you read, collect each claim with its
   source note. Every claim carries a `[[Source Note]]` citation.
3. **Dedupe and group.** Merge claims that repeat across notes; group by theme.
4. **Surface contradictions.** When notes disagree, say so explicitly with both
   citations — don't silently pick one. Contradictions are signal.
5. **Name the gaps.** State what the vault does *not* cover on this topic.
6. **Output.** Return portable Markdown, leading with the single most important
   takeaway. Every claim stays cited to its note.

## Hard requirements

- No claim about the topic without a `[[note]]` citation behind it.
- If the vault is thin on the topic, say so — do not pad with outside knowledge.
- A "Contradictions" and a "Gaps" section whenever either exists.

## Common mistakes

- Answering from training knowledge instead of the vault.
- Only reading search hits, never following links/backlinks.
- Uncited claims; silently resolving conflicting notes.
