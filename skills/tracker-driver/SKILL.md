---
name: tracker-driver
description: Use when driving a spec-based build against the vault and updating its tracker note, or reporting build progress honestly to a tracker as tasks complete.
---

# Tracker driver

Keep a build's tracker note an honest, live record of progress.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## The discipline

1. **Read and authorize the tracker.** Run
   `obsidian read vault=<vault> file=<tracker-path>`. Show the append format and
   obtain approval to maintain this tracker for the build.
2. **One line per task, as it finishes.** Show each completed entry, then append
   it with `obsidian append vault=<vault> file=<tracker-path> content=<entry>`:
   `- [x] <task> — <one-line note> (<ISO timestamp>)`. Don't batch at the end —
   update as you go so the tracker reflects reality at any moment.
3. **Blocked is not done.** If a task can't complete, append
   `- [ ] <task> — BLOCKED: <reason>` and move on. Never check off work that
   isn't actually done and verified.
4. **Finish with a summary.** When the build ends, preview and append a
   `## Summary` section using the same CLI command: what shipped, what remains
   blocked, and anything the user must do. A blocked build still gets one.
5. **Verify and report.** Re-read the tracker after every append. A checked box
   must mean the task truly works, not “should work.”

## Common mistakes

- Marking a blocked/partial task as `[x]`.
- Batching all updates at the end (tracker is stale mid-build).
- Omitting timestamps, or never writing the final `## Summary`.
