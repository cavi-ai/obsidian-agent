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
    "skills/portable/SKILL.md": "# Portable\n\nUse the Obsidian CLI.\n",
    "skills/provider/SKILL.md": "\uFEFF---\nportability: provider-adapter\n---\n\nClaude Code adapter instructions.\n",
  });

  assert.deepEqual(validatePortability(root), []);
});

test("only allows a provider adapter declared in leading SKILL.md frontmatter", () => {
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
