# Capability manifest reference

`capabilities.json` is the canonical registry. This is its schema.

## Top-level fields

| Field | Type | Meaning |
| --- | --- | --- |
| `plugin` | string | Plugin identifier. `obsidian-agent`. |
| `requires` | object | Host requirements. Currently `{ "obsidian": ">=1.12.7" }`. |
| `transport` | string | How workflows reach the vault. `cli`. |
| `capabilities` | array | The capability records. |

## Capability record

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Stable capability identifier, e.g. `vault-synthesis`. |
| `description` | string | When to use the capability — its "use when" trigger. |
| `portable` | boolean | `true` ships to every host; `false` is Claude-adapter-only. |

## Example

```json
{
  "plugin": "obsidian-agent",
  "requires": { "obsidian": ">=1.12.7" },
  "transport": "cli",
  "capabilities": [
    {
      "id": "vault-synthesis",
      "description": "Use when answering \"what do I know about X\" from the whole vault …",
      "portable": true
    }
  ]
}
```

## Validation

`scripts/validate-registry.mjs` checks the registry's shape and
`scripts/validate-portability.mjs` checks that each host package carries exactly
the capabilities the `portable` flag allows. Both run in the repository's test
suite, so a malformed registry or a portability leak fails the build.
