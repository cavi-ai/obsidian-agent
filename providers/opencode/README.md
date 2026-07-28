# OpenCode adapter

OpenCode discovers each canonical portable workflow as a native Agent Skill at
`.opencode/skills/<name>/SKILL.md` for project scope or
`~/.config/opencode/skills/<name>/SKILL.md` for user scope. Preview with `node
scripts/install.mjs --host opencode --scope user`; apply only by repeating the
command with `--confirm <hash>`.

This is a native skill integration, not a JavaScript/TypeScript OpenCode plugin.
The adapter contains no workflow copies and requires no MCP server.

See OpenCode's [Agent Skills documentation](https://opencode.ai/docs/skills)
for the discovery and frontmatter contract.
