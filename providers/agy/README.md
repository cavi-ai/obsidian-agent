# Agy adapter

Agy loads `obsidian-agent` as a native plugin: a `plugin.json` manifest beside a
`skills/<name>/SKILL.md` directory for each canonical portable workflow. The
installer stages that plugin at `~/.gemini/config/plugins/obsidian-agent` for
user scope or `.agents/plugins/obsidian-agent` for project scope. Preview with
`node scripts/install.mjs --host agy --scope user`; apply only by repeating the
command with `--confirm <hash>`.

The adapter contains no workflow copies and requires no MCP server.
