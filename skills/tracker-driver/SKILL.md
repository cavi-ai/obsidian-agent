---
name: tracker-driver
description: Use when driving a spec-based build against the vault and updating its tracker note, or reporting build progress honestly to a tracker as tasks complete.
---

# Tracker driver

Keep a build's tracker note an honest, live record of progress.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## The discipline

1. **Read and authorize the tracker.** Run
   `obsidian vault=<vault> read path=<tracker-path>`. Show the append format and
   obtain approval to maintain this tracker for the build. That setup approval
   establishes the tracker and format; it does not pre-approve later content.
2. **One line per task, as it finishes.** Display the exact completed entry and
   obtain explicit confirmation for that specific append. Only then run
   `obsidian vault=<vault> append path=<tracker-path> content=<entry>` with
   `- [x] <task> — <one-line note> (<ISO timestamp>)`. Re-read the tracker
   immediately after the append. Don't batch at the end — update as you go so
   the tracker reflects reality at any moment.
3. **Blocked is not done.** If a task can't complete, display the exact
   `- [ ] <task> — BLOCKED: <reason>` entry and obtain explicit confirmation
   for that specific append before writing it. Append only after confirmation,
   then re-read the tracker. Never check off work that isn't actually done and
   verified.
4. **Finish with a summary.** When the build ends, display the exact proposed
   `## Summary` section — what shipped, what remains blocked, and anything the
   user must do — and obtain explicit confirmation for that specific append.
   Append it using the same CLI command, then re-read the tracker. A blocked
   build still gets one.
5. **Verify and report.** Treat every proposed tracker write as its own approval
   boundary, and re-read the tracker after every confirmed append. A checked
   box must mean the task truly works, not “should work.”

## Common mistakes

- Marking a blocked/partial task as `[x]`.
- Treating initial tracker authorization as approval for later entries.
- Batching all updates at the end (tracker is stale mid-build).
- Omitting timestamps, or never writing the final `## Summary`.
