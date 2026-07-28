---
name: vault-routines
description: Use when a vault result has recurring value and the user wants it repeated on a schedule. Registers a scheduled cloud agent in Claude Code; in Companion it can only fire a routine the user already created.
portable: false
---

# Vault routines

> **Claude adapter only.** Scheduling and routine-fire URLs belong to the
> Claude/Companion host integration; the official Obsidian CLI has no scheduler.
> Keep this skill out of universal capability lists and move it into the
> dedicated Claude adapter.

Turn a one-off vault result into an editable, scheduled routine. You leverage
existing scheduling machinery; you never build scheduling yourself.

## When a result has recurring value

After producing something the user will want again on a cadence (a weekly
review, a vault health sweep, a Monday task pull, a new-papers digest), offer a
routine. Phrase it as a concrete, editable proposal — never schedule silently.

> "This is useful on a cadence. Want me to set it up as a routine — e.g. every
> Monday 8am? It runs as a cloud session and you can edit or cancel it anytime."

## Rules

1. **Consent first.** Never create a schedule without the user agreeing to it.
2. **Concrete cadence.** Propose a specific time/frequency tied to the task, not
   "regularly."
3. **Editable + cancellable.** Tell the user the routine is editable and how it
   runs (cloud session), so it never feels like a black box.
4. **Scope the routine.** A routine re-runs the same skill against the live
   vault. State exactly what it will do each run and where output lands.

## Wiring it — branch on where you are running

You are in exactly one of two runtimes. Establish which before promising anything.

**Claude Code (desktop CLI).** Use the `/schedule` machinery to register a
scheduled cloud agent against the command or skill invocation that produced the
result. Confirm back the cadence, the next run time, and how to edit or cancel it.

**Companion (in Obsidian).** Companion cannot create a routine. It can only
*fire* a routine the user already created in the Claude Code web UI and whose
"fire" URL they pasted into Companion's settings. If none is configured, say so
plainly and give the two steps — create the routine in the web UI, paste its fire
URL into Companion settings — instead of implying a schedule was set.

## What you cannot do

- You cannot create a schedule from inside Companion.
- You cannot schedule anything without the user agreeing to a specific cadence.
- Never report a routine as scheduled unless you registered it and can state its
  next run.
