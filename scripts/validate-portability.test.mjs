import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
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
    "skills/provider/SKILL.md": "---\nportability: provider-adapter\n---\n\nClaude Code adapter instructions.\n",
  });

  assert.deepEqual(validatePortability(root), []);
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
