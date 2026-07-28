---
name: plan-to-spec
description: Use when turning a planning note into a build spec, preparing a note for handoff to a coding-agent build, or creating a spec and tracker from a plan.
---

# Plan → spec

Convert a planning note into a structured build spec plus a tracker note that a
coding agent can drive with `obsidian-agent:tracker-driver`.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Read the plan.** Run
   `obsidian vault=<vault> read path=<planning-path>`. Extract concrete,
   ordered tasks from its steps or checklist; do not invent scope.
2. **Draft both notes.** Choose unused spec and tracker paths. Build the spec in
   exactly this shape so a coding agent can parse it:

   ```
   # Build spec: <title>

   Tracker: <tracker note path>

   ## Tasks

   - [ ] First task
   - [ ] Second task

   ## Plan

   <the relevant plan detail, verbatim or tightened>
   ```

   The `Tracker:` line contains the tracker note's exact vault path.
3. **Preview and create.** Show both paths and complete bodies. After approval,
   create the tracker with
   `obsidian vault=<vault> create path=<tracker-path> content=<tracker-heading>`
   and the spec with
   `obsidian vault=<vault> create path=<spec-path> content=<spec-markdown>`.
   Do not use `overwrite`. Re-read both notes.
4. **Hand off.** Report both paths and instruct the build agent to invoke
   `obsidian-agent:tracker-driver` while implementing the ordered tasks.

## Hard requirements

- `## Tasks` uses `- [ ]` checkboxes so the build agent can read them.
- Tasks come from the plan, in order — no invented scope.
- A tracker note exists, its path is written into the spec's `Tracker:` line,
  and it is reported to the user.

## Common mistakes

- An ad-hoc spec format a coding agent cannot parse.
- Forgetting the tracker note or not reporting both paths.
