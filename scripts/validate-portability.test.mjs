import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePortability } from "./validate-portability.mjs";

function fixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "portable-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}

test("allows portable skills and explicitly declared provider adapters", () => {
  const root = fixture({
    "plugin.json": '{"name":"obsidian-agent"}',
    "skills/portable/SKILL.md": "# Portable\n\nUse the Obsidian CLI. A claude is a generic name; anthropic is an adjective here.\n",
    "skills/provider/SKILL.md": "\uFEFF---\nportability: provider-adapter\n---\n\nClaude Code adapter instructions.\n",
  });

  assert.deepEqual(validatePortability(root), []);
});

test("allows leading provider-adapter declarations in canonical support text files", () => {
  const root = fixture({
    "skills/provider/references/adapter.md": "---\nportability: provider-adapter\n---\n\nClaude Code adapter instructions.\n",
  });

  assert.deepEqual(validatePortability(root), []);
});

test("only allows a provider adapter declared in leading canonical text frontmatter", () => {
  const root = fixture({
    "skills/body/SKILL.md": "# Skill\n\n---\nportability: provider-adapter\n---\n\nClaude Code instructions.\n",
    "skills/fenced/SKILL.md": "```yaml\n---\nportability: provider-adapter\n---\n```\n\nClaude Code instructions.\n",
    "skills/script/adapter.mjs": "---\nportability: provider-adapter\n---\nClaude Code instructions.\n",
  });

  assert.deepEqual(validatePortability(root), [
    "skills/body/SKILL.md: Claude-only instruction is not portable",
    "skills/fenced/SKILL.md: Claude-only instruction is not portable",
    "skills/script/adapter.mjs: Claude-only instruction is not portable",
  ]);
});

test("rejects in-tree symbolic links in canonical skills", () => {
  const root = fixture({ "skills/source/SKILL.md": "# Portable\n" });
  mkdirSync(join(root, "skills", "linked"));
  symlinkSync("../source/SKILL.md", join(root, "skills", "linked", "SKILL.md"));

  assert.deepEqual(validatePortability(root), [
    "skills/linked/SKILL.md: symbolic links are not allowed in canonical skills",
  ]);
});

test("rejects out-of-tree symbolic links in canonical skills", () => {
  const root = fixture();
  const outside = mkdtempSync(join(tmpdir(), "portable-outside-"));
  writeFileSync(join(outside, "provider.md"), "Claude Code instructions.\n");
  mkdirSync(join(root, "skills", "linked"), { recursive: true });
  symlinkSync(join(outside, "provider.md"), join(root, "skills", "linked", "SKILL.md"));

  assert.deepEqual(validatePortability(root), [
    "skills/linked/SKILL.md: symbolic links are not allowed in canonical skills",
  ]);
});

test("reports a root MCP configuration", () => {
  const root = fixture({ ".mcp.json": "{}" });

  assert.deepEqual(validatePortability(root), [".mcp.json: MCP configuration is not portable"]);
});

test("reports mcpServers in root configuration", () => {
  const root = fixture({ "plugin.json": '{"mcpServers":{}}' });

  assert.deepEqual(validatePortability(root), ["plugin.json: mcpServers is not portable"]);
});

test("does not treat root documentation as configuration", () => {
  const root = fixture({ "README.md": "The old mcpServers configuration is gone.\n" });

  assert.deepEqual(validatePortability(root), []);
});

test("reports legacy dependencies in canonical skill text with deterministic paths", () => {
  const root = fixture({
    "skills/zeta/SKILL.md": "Configure the Anthropic API with ANTHROPIC_API_KEY.\n",
    "skills/alpha/SKILL.md": "Use Companion for Claude to access the vault.\n",
    "skills/mid/SKILL.md": "Run this with Claude Code using CLAUDE_PLUGIN_ROOT.\n",
  });

  assert.deepEqual(validatePortability(root), [
    "skills/alpha/SKILL.md: Companion dependency is not portable",
    "skills/mid/SKILL.md: Claude-only instruction is not portable",
    "skills/zeta/SKILL.md: Anthropic API instruction is not portable",
  ]);
});

test("reports Anthropic API and SDK variants plus provider paths and environment variables", () => {
  const root = fixture({
    "skills/anthropic/SKILL.md": "Use Anthropic's API, the Anthropic SDK, @anthropic-ai/sdk, and ANTHROPIC_BASE_URL.\n",
    "skills/paths/SKILL.md": "Read ${HOME}/.claude, /Users/agent/.claude/settings.json, and C:\\Users\\agent\\.claude\\settings.json.\n",
  });

  assert.deepEqual(validatePortability(root), [
    "skills/anthropic/SKILL.md: Anthropic API instruction is not portable",
    "skills/paths/SKILL.md: Claude-only instruction is not portable",
  ]);
});

test("reports standalone Anthropic SDK package and environment variable references", () => {
  const root = fixture({
    "skills/sdk/SKILL.md": "Import @anthropic-ai/sdk.\n",
    "skills/env/SKILL.md": "Set ANTHROPIC_BASE_URL before running.\n",
  });

  assert.deepEqual(validatePortability(root), [
    "skills/env/SKILL.md: Anthropic API instruction is not portable",
    "skills/sdk/SKILL.md: Anthropic API instruction is not portable",
  ]);
});

test("reports ordinary Claude desktop, client, and configuration path variants", () => {
  const root = fixture({
    "skills/variants/SKILL.md": "Use Claude Desktop and the claude CLI. Install the anthropic Python client and Anthropic SDK-client. Read ~/.config/claude/settings.json, ${HOME}/.config/claude/settings.json, and C:\\Users\\agent\\.config\\claude\\settings.json.\n",
  });

  assert.deepEqual(validatePortability(root), [
    "skills/variants/SKILL.md: Anthropic API instruction is not portable",
    "skills/variants/SKILL.md: Claude-only instruction is not portable",
  ]);
});

const PROVIDER_VARIANTS = [
  ["Anthropic language-qualified SDK", "Install the Anthropic Python SDK.", ["Anthropic API instruction is not portable"]],
  ["Anthropic punctuated API client", "Use Anthropic's official, TypeScript API client.", ["Anthropic API instruction is not portable"]],
  ["Claude command-line interface", "Use the Claude command-line interface.", ["Claude-only instruction is not portable"]],
  ["XDG configuration path", "Read $XDG_CONFIG_HOME/claude/settings.json.", ["Claude-only instruction is not portable"]],
  ["braced XDG configuration path", "Read ${XDG_CONFIG_HOME}/claude/settings.json.", ["Claude-only instruction is not portable"]],
  ["HOME configuration path", "Read ${HOME}/.config/claude/settings.json.", ["Claude-only instruction is not portable"]],
  ["absolute user configuration path", "Read /Users/agent/.config/claude/settings.json.", ["Claude-only instruction is not portable"]],
  ["Windows configuration path", "Read C:\\Users\\agent\\.config\\claude\\settings.json.", ["Claude-only instruction is not portable"]],
  ["generic provider words", "A claude is a generic name and anthropic is an adjective.", []],
  ["generic command line and project path", "Use a command-line interface in /projects/claude/readme.", []],
];

for (const [name, text, messages] of PROVIDER_VARIANTS) {
  test(`handles ${name}`, () => {
    const root = fixture({ "skills/case/SKILL.md": text });
    assert.deepEqual(validatePortability(root), messages.map((message) => `skills/case/SKILL.md: ${message}`));
  });
}

const STRUCTURED_PROVIDER_INDICATORS = [
  ["provider-owned SDK", "Use the SDK maintained by Anthropic.", "Anthropic API instruction is not portable"],
  ["expanded provider SDK name", "Use Anthropic software development kit.", "Anthropic API instruction is not portable"],
  ["direct Claude executable invocation", "Run claude --version from a terminal.", "Claude-only instruction is not portable"],
  ["HOME Claude configuration file", "Read ${HOME}/.claude.json.", "Claude-only instruction is not portable"],
  ["absolute POSIX Claude configuration file", "Read /Users/agent/.claude.json.", "Claude-only instruction is not portable"],
  ["Windows Claude configuration file", "Read C:\\Users\\agent\\.claude.json.", "Claude-only instruction is not portable"],
];

for (const [name, text, message] of STRUCTURED_PROVIDER_INDICATORS) {
  test(`reports ${name}`, () => {
    const root = fixture({ "skills/case/SKILL.md": text });
    assert.deepEqual(validatePortability(root), [`skills/case/SKILL.md: ${message}`]);
  });
}

const BENIGN_PROVIDER_WORDS = [
  ["Claude Shannon source code", "Claude Shannon source code is discussed."],
  ["Claude Monet desktop wallpaper", "Use a Claude Monet desktop wallpaper."],
  ["anthropic principle and API ethics", "The anthropic principle informs API ethics."],
  ["anthropic principle in an ownership sentence", "The API client is maintained by anthropic principle researchers."],
  ["English import verb with anthropic adjective", "We import anthropic principles into the API ethics discussion."],
];

for (const [name, text] of BENIGN_PROVIDER_WORDS) {
  test(`allows benign ${name} prose`, () => {
    const root = fixture({ "skills/case/SKILL.md": text });
    assert.deepEqual(validatePortability(root), []);
  });
}

const PROVIDER_GRAMMAR_CASES = [
  ["provider-owned API client", "Use the API client provided by Anthropic.", "Anthropic API instruction is not portable"],
  ["provider-maintained language SDK", "Anthropic maintains the Python SDK.", "Anthropic API instruction is not portable"],
  ["first-party client library", "Use Anthropic's first-party Go client library.", "Anthropic API instruction is not portable"],
  ["Python package installation", "Run python -m pip install anthropic.", "Anthropic API instruction is not portable"],
  ["Python package import", "Use `from anthropic import Anthropic`.", "Anthropic API instruction is not portable"],
  ["Claude subcommand invocation", "Run claude mcp list.", "Claude-only instruction is not portable"],
  ["quoted Claude executable", "Run `claude`.", "Claude-only instruction is not portable"],
  ["Claude Code package", "Install @anthropic-ai/claude-code.", "Claude-only instruction is not portable"],
  ["XDG Claude Code config directory", "Read ${XDG_CONFIG_HOME}/claude-code/settings.json.", "Claude-only instruction is not portable"],
  ["macOS Claude config directory", "Read ~/Library/Application Support/Claude/settings.json.", "Claude-only instruction is not portable"],
  ["Windows APPDATA Claude config directory", "Read %APPDATA%\\Claude\\settings.json.", "Claude-only instruction is not portable"],
  ["Claude Desktop config filename", "Read claude_desktop_config.json.", "Claude-only instruction is not portable"],
  ["Claude project instructions filename", "Read CLAUDE.md.", "Claude-only instruction is not portable"],
];

for (const [name, text, message] of PROVIDER_GRAMMAR_CASES) {
  test(`reports structured ${name}`, () => {
    const root = fixture({ "skills/case/SKILL.md": text });
    assert.deepEqual(validatePortability(root), [`skills/case/SKILL.md: ${message}`]);
  });
}

const QUALIFIED_PROVIDER_INSTRUCTIONS = [
  ["latest Anthropic Python SDK", "Install Anthropic's latest Python SDK.", "Anthropic API instruction is not portable"],
  ["official Claude CLI", "Use Claude's official CLI.", "Claude-only instruction is not portable"],
  ["qualified Anthropic software development kit", "Use Anthropic’s newest async Python software development kit.", "Anthropic API instruction is not portable"],
  ["qualified SDK with reversed ownership", "Use the current async Python SDK maintained by Anthropic.", "Anthropic API instruction is not portable"],
  ["qualified client library with forward ownership", "Anthropic publishes its recommended async Python client library.", "Anthropic API instruction is not portable"],
  ["qualified Claude command-line interface", "Launch Claude's latest supported command-line interface.", "Claude-only instruction is not portable"],
];

for (const [name, text, message] of QUALIFIED_PROVIDER_INSTRUCTIONS) {
  test(`reports ${name}`, () => {
    const root = fixture({ "skills/case/SKILL.md": text });
    assert.deepEqual(validatePortability(root), [`skills/case/SKILL.md: ${message}`]);
  });
}

const PYTHON_IMPORT_CONTEXTS = [
  ["official async import in inline code", "Use `from anthropic import AsyncAnthropic`.", true],
  ["official async import in a Python fence", "```python\nfrom anthropic import AsyncAnthropic\n```\n", true],
  ["submodule import on a standalone code line", "from anthropic.types import Message\n", true],
  ["aliased package import in inline code", "Use `import anthropic as provider_sdk`.", true],
  ["parenthesized import with a trailing comma", "Use `from anthropic import (AsyncAnthropic,)`.", true],
  ["punctuated English import list", "We import anthropic, cosmological, and teleological principles from the source dataset.", false],
  ["invalid Python-shaped English inline code", "The phrase `import anthropic, cosmological, and teleological principles` describes the taxonomy.", false],
  ["invalid unparenthesized trailing comma", "The fragment `from anthropic import AsyncAnthropic,` is incomplete Python.", false],
  ["ordinary English import sentence", "To compare theories, we import anthropic principles into the discussion.", false],
];

for (const [name, text, rejected] of PYTHON_IMPORT_CONTEXTS) {
  test(`${rejected ? "reports" : "allows"} ${name}`, () => {
    const root = fixture({ "skills/case/SKILL.md": text });
    assert.deepEqual(validatePortability(root), rejected
      ? ["skills/case/SKILL.md: Anthropic API instruction is not portable"]
      : []);
  });
}

const SHELL_COMMAND_CONTEXTS = [
  ["bare Claude command in a shell fence", "```sh\nclaude\n```\n", true],
  ["prompted Claude command in a shell fence", "```bash\nclaude \"explain this project\"\n```\n", true],
  ["Claude command after a shell connector", "```zsh\nnpm test && claude \"explain the failure\"\n```\n", true],
  ["prompt-prefixed Claude command in a console fence", "```console\n$ claude\n```\n", true],
  ["contextual inline Claude command", "Execute `claude \"explain this project\"`.", true],
  ["generic backticked variable", "The variable `claude` contains a generic name.", false],
  ["non-executed shell literals", "```sh\n# claude\nprintf '%s\\n' claude\nprovider_name=claude\n```\n", false],
  ["bare literal in a non-shell fence", "```text\nclaude\n```\n", false],
  ["command-shaped literal in a non-shell fence", "```text\nclaude --version\n```\n", false],
];

for (const [name, text, rejected] of SHELL_COMMAND_CONTEXTS) {
  test(`${rejected ? "reports" : "allows"} ${name}`, () => {
    const root = fixture({ "skills/case/SKILL.md": text });
    assert.deepEqual(validatePortability(root), rejected
      ? ["skills/case/SKILL.md: Claude-only instruction is not portable"]
      : []);
  });
}
