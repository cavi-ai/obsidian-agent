# Gemini CLI adapter

Gemini CLI can install this repository as an extension with `gemini extensions
install https://github.com/cavi-ai/obsidian-agent`; the root
`gemini-extension.json` and `skills/` directory follow the native extension
layout. The preview-first installer instead places the same canonical skills in
Gemini's native user (`~/.gemini/skills`) or workspace (`.gemini/skills`)
discovery root. No workflow logic is copied into this adapter.

See Gemini CLI's [extension reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md)
for the manifest, install command, and extension skill layout.
