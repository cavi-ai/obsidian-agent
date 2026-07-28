---
name: manifest-core
description: Use when running any manifest-* advisor skill — the shared gather, prioritize, present, and route spine they all follow. Invoked by those skills, not directly by the user.
---

# Manifest core

The spine every `manifest-*` advisor follows. The calling skill supplies only its lens
and its operationalizer.

**REQUIRED SUB-SKILL:** obsidian-agent:vault-grounding

## Process

1. **Gather.** Invoke `obsidian-agent:vault-synthesis` over the notes the lens
   names. Do not substitute uncited recollection; the synthesis keeps claims
   traceable to notes read through the official CLI.
2. **Apply the lens.** The calling skill defines what to look for and how to rank it.
   Tie every item to the notes that motivate it.
3. **Be opinionated.** Rank the candidates and lead with the single best next move. A flat
   unranked list is a failed output.
4. **Present.** Return portable Markdown: the top pick first, then the ranked
   list with rationale and evidence, followed by risks or unknowns. Use a table
   or fenced Mermaid diagram only when it improves comprehension.
5. **Operationalize.** For the items the user picks, invoke the operationalizer the
   calling skill names. Stopping at advice is a failed output.

## Hard requirements

- Every item traces to cited notes; mark inferences as inference.
- The output is a ranked Markdown brief leading with one clear next move.
- The run ends by routing into the named operationalizer, not at the brief.

## Common mistakes

- Generic domain advice ungrounded in the vault.
- No prioritization, or no single clear next move.
- Reading notes ad hoc instead of invoking vault-synthesis.
- Stopping at ideas instead of routing onward.
