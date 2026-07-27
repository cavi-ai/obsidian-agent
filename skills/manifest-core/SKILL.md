---
name: manifest-core
description: Use when running any manifest-* advisor skill — the shared gather, prioritize, present, and route spine they all follow. Invoked by those skills, not directly by the user.
---

# Manifest core

The spine every `manifest-*` advisor follows. The calling skill supplies only its lens
and its operationalizer.

**REQUIRED SUB-SKILL:** claude-obsidian:vault-grounding

## Process

1. **Gather.** Invoke claude-obsidian:vault-synthesis over the notes the lens names —
   grounded and cited. Do not read ad hoc; the synthesis is what keeps claims traceable.
2. **Apply the lens.** The calling skill defines what to look for and how to rank it.
   Tie every item to the notes that motivate it.
3. **Be opinionated.** Rank the candidates and lead with the single best next move. A flat
   unranked list is a failed output.
4. **Present.** Render a self-contained `claude-html` artifact via
   claude-obsidian:note-to-artifact: the top pick first, then the ranked list with
   rationale and evidence, then risks or unknowns.
5. **Operationalize.** For the items the user picks, invoke the operationalizer the
   calling skill names. Stopping at advice is a failed output.

## Hard requirements

- Every item traces to cited notes; mark inferences as inference.
- The output is a ranked artifact leading with one clear next move.
- The run ends by routing into the named operationalizer, not at the artifact.

## Common mistakes

- Generic domain advice ungrounded in the vault.
- No prioritization, or no single clear next move.
- Reading notes ad hoc instead of invoking vault-synthesis.
- Stopping at ideas instead of routing onward.
