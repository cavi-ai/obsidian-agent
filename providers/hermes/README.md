# Hermes Agent adapter

Hermes Agent discovers each canonical portable workflow as a native skill at
`~/.hermes/skills/<name>/SKILL.md` for user scope or
`.hermes/skills/<name>/SKILL.md` for project scope. Preview with `node
scripts/install.mjs --host hermes --scope user`; apply only by repeating the
command with `--confirm <hash>`.

The adapter contains no workflow copies and requires no MCP server.
