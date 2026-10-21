# OpenClaw adapter

OpenClaw discovers each canonical portable workflow as a native skill at
`~/.openclaw/skills/<name>/SKILL.md` for user scope or `skills/<name>/SKILL.md`
in the workspace for project scope. Preview with `node scripts/install.mjs
--host openclaw --scope user`; apply only by repeating the command with
`--confirm <hash>`.

The adapter contains no workflow copies and requires no MCP server.
