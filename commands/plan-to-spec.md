---
description: Convert a planning note into a structured build spec and an empty tracker note, ready to hand off to a Claude Code build.
argument-hint: "<planning note path>"
---

Turn the planning note below into a build spec, following the
**claude-obsidian:plan-to-spec** skill.

Planning note: `$1`

Steps:

1. `note_read` the plan and extract concrete, ordered tasks from its
   steps/checklist — do not invent tasks it does not imply.
2. Write the spec note with `note_create`, using the exact `# Build spec`
   shape with a `Tracker:` line and a `## Tasks` list of `- [ ]` checkboxes
   so the build harness can parse it.
3. Create an empty tracker note with `note_create` (`<title> — tracker`) and
   write its path into the spec's `Tracker:` line.
4. Tell the user to run
   `/claude-obsidian:build-from-spec <spec path> <tracker path>`, confirming
   both paths.
