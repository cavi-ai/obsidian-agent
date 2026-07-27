---
description: Answer "what do I know about X" by synthesizing across the vault into a grounded, cited summary with contradictions and gaps called out.
argument-hint: "<topic>"
---

Synthesize what the vault knows about the topic below, following the
**claude-obsidian:vault-synthesis** skill.

Topic: `$1`

Steps:

1. `vault_search` the topic, `note_read` the most relevant hits, then follow
   `get_backlinks` / `get_outgoing_links` to pull in connected notes the
   search missed.
2. Extract claims as you read, each attributed to its source note.
3. Dedupe repeated claims and group them by theme.
4. Surface contradictions explicitly, with both citations, and name what the
   vault does not cover.
5. Lead with the single most important takeaway; for a rich synthesis,
   render it as a `claude-html` artifact via claude-obsidian:note-to-artifact.
