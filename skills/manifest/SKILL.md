---
name: manifest
description: Use when prioritizing or proposing work from vault notes — a roadmap, feature backlog, content plan, research agenda, risk register, or infra design, ranked and grounded in the notes. Pass the lens - pm (work already scoped), feature (new scope from feedback), content, infra, research, or risk.
---

# Manifest

**REQUIRED SUB-SKILL:** obsidian-agent:manifest-core

Take the lens from the user's request. Ask only when two fit equally well.

## Lenses

Operationalizer ids below are `obsidian-agent:`-prefixed.

| Lens | Read as | Rank by | Operationalizer |
|---|---|---|---|
| `pm` | project manager who ships | impact on work already committed — client-facing polish, demoability, reliability, clear status; note dependencies and risks | `plan-to-spec`, then `tracker-driver` during the approved build |
| `feature` | product lead | user value against effort, each tied to the feedback that motivates it; new scope only | `plan-to-spec`, then `tracker-driver` during the approved build |
| `content` | content strategist | publishable pieces — audience, angle or hook, format (post / doc / thread), strongest supporting notes | `outline-to-draft` |
| `infra` | infra architect | bottlenecks, single points of failure, scaling limits, security, cost; propose concrete designs with trade-offs, fenced Mermaid where it clarifies relationships | `plan-to-spec`, then `tracker-driver` during the approved build |
| `research` | research director | coverage gaps — open questions the notes raise but do not answer, thinly sourced claims, unresolved contradictions, adjacent areas absent entirely | `source-digest` for evidence in existing source notes, or `vault-synthesis` on the narrowed question |
| `risk` | risk register | likelihood × impact — blockers, contradictions between notes (cite both sides), single points of failure, unstated dependencies, stale assumptions | `plan-to-spec` for mitigations that require building |

`pm` sequences work that is already scoped; `feature` proposes scope that is not.

Structural vault audit is `obsidian-agent:manifest-vault`, not a lens here.
