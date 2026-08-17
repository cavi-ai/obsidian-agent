# Vault safety

Read operations use explicit official CLI arguments. Writes remain preview-and-confirm, avoid silent overwrites, and reread changed notes. Exact vault-root targets use `path=`.

The portable core does not use `obsidian eval` as an escape hatch and does not depend on Companion's local MCP server.
