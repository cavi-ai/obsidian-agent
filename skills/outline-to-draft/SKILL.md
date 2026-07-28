---
name: outline-to-draft
description: Use when expanding an outline or stub note into a full draft, fleshing bullet points into prose, or drafting longer-form writing grounded in vault context and the user's voice.
---

# Outline → draft

Expand an outline into a draft that reads like the user wrote it — grounded in
their vault, in their voice.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Read the outline** with
   `obsidian vault=<vault> read path=<outline-path>`. Gather context with
   `obsidian vault=<vault> links path=<outline-path>`,
   `obsidian vault=<vault> backlinks path=<outline-path> format=json`, and
   `obsidian vault=<vault> search query=<topic> format=json`. Read every note
   used as evidence.
2. **Learn the voice.** Skim 1–2 of the user's existing prose notes to match
   their tone, sentence length, and vocabulary. You are drafting *as them*.
3. **Draft section by section**, following the outline's structure. Every
   factual claim about their domain traces to a note you read (cite `[[notes]]`
   where natural). Mark genuine gaps with a clear `[TODO: …]` rather than
   inventing content.
4. **Show the draft**, target path, and complete in-place diff if applicable.
   After approval, use
   `obsidian vault=<vault> create path=<path> content=<draft-markdown> overwrite`
   to replace the outline, or omit `overwrite` for a new draft note linked back
   to it. Re-read the result.

## Common mistakes

- Generic AI voice that doesn't match the user's existing notes.
- Inventing facts/citations instead of grounding in the vault or marking a TODO.
- Overwriting the outline without showing the complete change.
