---
name: build-retrospective
description: Use when a spec-based build or tracker is complete and a retrospective is needed, or when closing out a build against its spec.
---

# Build retrospective

Close a build with an honest retro grounded in what the tracker actually records.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Read the record.** Use `obsidian vault=<vault> read path=<path>` for both
   the tracker note and the spec note. The
   tracker holds `- [x] …` / `- [ ] … BLOCKED: …` lines and a `## Summary`.
2. **Tally honestly.** What shipped (done tasks), what's still open or blocked
   (and why), and any scope that changed. Don't claim completion the tracker
   doesn't show.
3. **Draw lessons.** A few concrete takeaways — what went well, what to do
   differently — tied to specific tasks.
4. **Preview and write the retro.** Show the new path and complete Markdown,
   linking `[[spec]]` and `[[tracker]]`. After approval, run
   `obsidian vault=<vault> create path=<retro-path> content=<markdown>` and
   re-read it. Lead with shipped/left, then lessons and actionable follow-ups.
5. **Tag** via `obsidian-agent:consistent-tagging`, reusing the vault's retro tag.

## Common mistakes

- Writing the retro from memory instead of reading the tracker.
- Glossing over blocked/unfinished work.
- Not linking the retro to its spec and tracker.
