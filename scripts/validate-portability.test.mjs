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

const CLI_HELPER = "export const buildObsidianArgs = () => [];\n";

test("allows provider terminology in canonical prose", () => {
  const root = fixture({
    "scripts/obsidian-cli.mjs": CLI_HELPER,
    "skills/portable/SKILL.md": [
      "# Portable",
      "",
      "Claude and Anthropic are discussed in prose.",
      "Examples may mention Claude Code, ANTHROPIC_API_KEY, or `claude --version`.",
      "",
    ].join("\n"),
  });

  assert.deepEqual(validatePortability(root), []);
});

for (const [position, example] of [
  ["immediately after the command", "obsidian read vault=<vault> path=<path>"],
  ["after another option", "obsidian read path=<path> vault=<vault>"],
]) {
  test(`rejects vault selection ${position} in portable Obsidian CLI examples`, () => {
    const root = fixture({
      "scripts/obsidian-cli.mjs": CLI_HELPER,
      "skills/portable/SKILL.md": `Run \`${example}\`.\n`,
    });

    assert.deepEqual(validatePortability(root), [
      "skills/portable/SKILL.md: Obsidian CLI examples must place vault=<vault> before the command",
    ]);
  });
}

for (const [target, example] of [
  ["literal path", "obsidian vault=\"My Vault\" read file=Projects/CAVI.md"],
  ["path placeholder", "obsidian vault=<vault> read file=<source-path>"],
]) {
  test(`rejects wikilink-style file resolution for a ${target}`, () => {
    const root = fixture({
      "scripts/obsidian-cli.mjs": CLI_HELPER,
      "skills/portable/SKILL.md": `Run \`${example}\`.\n`,
    });

    assert.deepEqual(validatePortability(root), [
      "skills/portable/SKILL.md: exact vault-root targets must use path= instead of file=",
    ]);
  });
}

test("allows deliberate wikilink-style name resolution in portable CLI examples", () => {
  const root = fixture({
    "scripts/obsidian-cli.mjs": CLI_HELPER,
    "skills/portable/SKILL.md": "Run `obsidian vault=<vault> read file=<note-name>`.\n",
  });

  assert.deepEqual(validatePortability(root), []);
});

test("allows vault-first exact paths and excludes explicitly nonportable skills", () => {
  const root = fixture({
    "scripts/obsidian-cli.mjs": CLI_HELPER,
    "skills/portable/SKILL.md": "Run `obsidian vault=<vault> read path=<path>`.\n",
    "skills/provider-owned/SKILL.md": [
      "---",
      "name: provider-owned",
      "portable: false",
      "---",
      "",
      "Provider-owned example: `obsidian read vault=<vault> file=<path>`.",
      "",
    ].join("\n"),
  });

  assert.deepEqual(validatePortability(root), []);
});

test("requires the official CLI helper when canonical skills exist", () => {
  const root = fixture({ "skills/portable/SKILL.md": "# Portable\n" });

  assert.deepEqual(validatePortability(root), [
    "scripts/obsidian-cli.mjs: official Obsidian CLI helper is required by canonical skills",
  ]);
});

test("rejects an official CLI helper symlink outside the repository", () => {
  const root = fixture({ "skills/portable/SKILL.md": "# Portable\n" });
  const outside = mkdtempSync(join(tmpdir(), "portable-helper-outside-"));
  writeFileSync(join(outside, "obsidian-cli.mjs"), CLI_HELPER);
  mkdirSync(join(root, "scripts"), { recursive: true });
  symlinkSync(join(outside, "obsidian-cli.mjs"), join(root, "scripts", "obsidian-cli.mjs"));

  assert.deepEqual(validatePortability(root), [
    "scripts/obsidian-cli.mjs: official Obsidian CLI helper must be a real repository file",
  ]);
});

test("rejects in-tree symbolic links in canonical skills", () => {
  const root = fixture({
    "scripts/obsidian-cli.mjs": CLI_HELPER,
    "skills/source/SKILL.md": "# Portable\n",
  });
  mkdirSync(join(root, "skills", "linked"));
  symlinkSync("../source/SKILL.md", join(root, "skills", "linked", "SKILL.md"));

  assert.deepEqual(validatePortability(root), [
    "skills/linked/SKILL.md: symbolic links are not allowed in canonical skills",
  ]);
});

test("rejects out-of-tree symbolic links in canonical skills", () => {
  const root = fixture({ "scripts/obsidian-cli.mjs": CLI_HELPER });
  const outside = mkdtempSync(join(tmpdir(), "portable-outside-"));
  writeFileSync(join(outside, "provider.md"), "provider instructions\n");
  mkdirSync(join(root, "skills", "linked"), { recursive: true });
  symlinkSync(join(outside, "provider.md"), join(root, "skills", "linked", "SKILL.md"));

  assert.deepEqual(validatePortability(root), [
    "skills/linked/SKILL.md: symbolic links are not allowed in canonical skills",
  ]);
});

test("rejects a canonical skills root symlink outside the repository", () => {
  const root = fixture({ "scripts/obsidian-cli.mjs": CLI_HELPER });
  const outside = mkdtempSync(join(tmpdir(), "portable-skills-outside-"));
  writeFileSync(join(outside, "SKILL.md"), "# Outside\n");
  symlinkSync(outside, join(root, "skills"));

  assert.deepEqual(validatePortability(root), [
    "skills: canonical skills root must be a real directory inside the repository",
  ]);
});

test("rejects dangling structural root symlinks", () => {
  const root = fixture();
  symlinkSync(join(root, "missing-mcp.json"), join(root, ".mcp.json"));
  symlinkSync(join(root, "missing-plugin.json"), join(root, "plugin.json"));
  symlinkSync(join(root, "missing-providers"), join(root, "providers"));
  symlinkSync(join(root, "missing-skills"), join(root, "skills"));

  assert.deepEqual(validatePortability(root), [
    ".mcp.json: MCP configuration is not portable",
    "plugin.json: provider manifest must be a real repository file",
    "providers: provider root must be a real directory inside the repository",
    "skills: canonical skills root must be a real directory inside the repository",
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

test("reports nested and escaped mcpServers keys in supported JSON configuration", () => {
  const root = fixture({
    "escaped.json": '{"mcp\\u0053ervers":{}}',
    "nested.json": '{"plugin":{"configuration":[{"mcpServers":{}}]}}',
  });

  assert.deepEqual(validatePortability(root), [
    "escaped.json: mcpServers is not portable",
    "nested.json: mcpServers is not portable",
  ]);
});

test("limits root MCP key scanning to supported JSON configuration", () => {
  const root = fixture({
    "config.toml": "mcpServers.command = 'provider-owned'\n",
    "settings.yaml": "mcpServers: provider-owned\n",
  });

  assert.deepEqual(validatePortability(root), []);
});

test("rejects live and dangling root configuration symlinks", () => {
  const root = fixture();
  const outside = mkdtempSync(join(tmpdir(), "portable-config-outside-"));
  writeFileSync(join(outside, "config.json"), '{"mcpServers":{}}');
  symlinkSync(join(outside, "config.json"), join(root, "config.json"));
  symlinkSync(join(root, "missing-settings.json"), join(root, "settings.json"));
  mkdirSync(join(root, ".github"));
  symlinkSync(outside, join(root, ".github", "workflows"));

  assert.deepEqual(validatePortability(root), [
    ".github/workflows: root configuration symbolic links are not allowed",
    "config.json: root configuration symbolic links are not allowed",
    "settings.json: root configuration symbolic links are not allowed",
  ]);
});

test("does not treat root documentation as configuration", () => {
  const root = fixture({ "README.md": "The old mcpServers configuration is gone.\n" });

  assert.deepEqual(validatePortability(root), []);
});

test("does not treat a JSON string mentioning mcpServers as configuration", () => {
  const root = fixture({ "metadata.json": '{"description":"The old mcpServers setting is gone."}' });

  assert.deepEqual(validatePortability(root), []);
});

test("allows declared provider directories and owned manifest paths", () => {
  const root = fixture({
    "scripts/obsidian-cli.mjs": CLI_HELPER,
    "plugin.json": JSON.stringify({
      providers: {
        claude: {
          source: "providers/claude/source",
          artifact: "providers/claude/dist/plugin.json",
        },
      },
    }),
    "providers/claude/source/adapter.md": "Claude-specific adapter instructions.\n",
    "providers/claude/dist/plugin.json": "{}",
  });

  assert.deepEqual(validatePortability(root), []);
});

test("allows an in-root manifest path whose name begins with two dots", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({
      providers: { claude: { artifact: "providers/claude/..artifact" } },
    }),
    "providers/claude/..artifact": "{}",
  });

  assert.deepEqual(validatePortability(root), []);
});

test("reports provider directories not declared by the root manifest", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({ providers: { claude: {} } }),
    "providers/claude/adapter.md": "declared\n",
    "providers/codex/adapter.md": "undeclared\n",
  });

  assert.deepEqual(validatePortability(root), [
    "providers/codex: provider directory is not declared in plugin.json",
  ]);
});

test("does not mistake inherited object names for declared providers", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({ providers: {} }),
    "providers/toString/adapter.md": "undeclared\n",
  });

  assert.deepEqual(validatePortability(root), [
    "providers/toString: provider directory is not declared in plugin.json",
  ]);
});

test("rejects a provider root symlink that escapes the repository", () => {
  const root = fixture({ "plugin.json": JSON.stringify({ providers: { claude: {} } }) });
  const outside = mkdtempSync(join(tmpdir(), "portable-providers-outside-"));
  mkdirSync(join(outside, "claude"));
  symlinkSync(outside, join(root, "providers"));

  assert.deepEqual(validatePortability(root), [
    "providers: provider root must be a real directory inside the repository",
  ]);
});

test("reports loose files outside declared provider directories", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({ providers: {} }),
    "providers/claude.md": "not owned by a provider directory\n",
  });

  assert.deepEqual(validatePortability(root), [
    "providers/claude.md: provider files must be inside a declared provider directory",
  ]);
});

test("reports unsupported provider keys and missing declared roots deterministically", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({ providers: { custom: {}, gemini: {} } }),
  });

  assert.deepEqual(validatePortability(root), [
    'plugin.json: provider "custom" is unsupported',
    "providers/gemini: declared provider directory does not exist",
  ]);
});

test("reports provider manifest paths outside their declared adapter roots", () => {
  const root = fixture({
    "scripts/obsidian-cli.mjs": CLI_HELPER,
    "plugin.json": JSON.stringify({
      providers: {
        claude: {
          source: "skills/provider-leak.md",
          artifact: "../portable-outside.json",
        },
      },
    }),
    "providers/claude/adapter.md": "declared\n",
    "skills/provider-leak.md": "provider file in a canonical root\n",
  });

  assert.deepEqual(validatePortability(root), [
    "plugin.json: provider \"claude\" artifact path must stay inside providers/claude: ../portable-outside.json",
    "plugin.json: provider \"claude\" source path must stay inside providers/claude: skills/provider-leak.md",
  ]);
});

test("reports missing provider manifest paths", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({
      providers: {
        codex: {
          source: "providers/codex/source",
          artifact: "providers/codex/dist/plugin.json",
        },
      },
    }),
    "providers/codex/adapter.md": "declared\n",
  });

  assert.deepEqual(validatePortability(root), [
    "plugin.json: provider \"codex\" artifact path does not exist: providers/codex/dist/plugin.json",
    "plugin.json: provider \"codex\" source path does not exist: providers/codex/source",
  ]);
});

test("reports manifest symlinks that escape their provider root", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({ providers: { opencode: { source: "providers/opencode/source" } } }),
  });
  const outside = mkdtempSync(join(tmpdir(), "portable-provider-outside-"));
  writeFileSync(join(outside, "adapter.md"), "outside\n");
  mkdirSync(join(root, "providers", "opencode"), { recursive: true });
  symlinkSync(outside, join(root, "providers", "opencode", "source"));

  assert.deepEqual(validatePortability(root), [
    "providers/opencode/source: symbolic link resolves outside its declared provider root",
  ]);
});

test("allows provider symlinks contained by their declared adapter root", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({ providers: { claude: { source: "providers/claude/current" } } }),
    "providers/claude/source/adapter.md": "contained\n",
  });
  symlinkSync("source", join(root, "providers", "claude", "current"));

  assert.deepEqual(validatePortability(root), []);
});

test("rejects dangling provider symlinks", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({ providers: { gemini: { source: "providers/gemini/current" } } }),
    "providers/gemini/adapter.md": "declared\n",
  });
  symlinkSync("missing", join(root, "providers", "gemini", "current"));

  assert.deepEqual(validatePortability(root), [
    "providers/gemini/current: dangling symbolic links are not allowed in provider adapters",
  ]);
});

test("rejects provider symlinks whose target traverses a regular file", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({ providers: { claude: {} } }),
    "providers/claude/adapter.md": "declared\n",
  });
  symlinkSync("adapter.md/child", join(root, "providers", "claude", "broken"));

  assert.deepEqual(validatePortability(root), [
    "providers/claude/broken: unresolvable symbolic links are not allowed in provider adapters",
  ]);
});

test("rejects cyclic provider symlinks without crashing", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({ providers: { codex: {} } }),
    "providers/codex/adapter.md": "declared\n",
  });
  symlinkSync("loop", join(root, "providers", "codex", "loop"));

  assert.deepEqual(validatePortability(root), [
    "providers/codex/loop: unresolvable symbolic links are not allowed in provider adapters",
  ]);
});

test("reports a manifest reference below a cyclic provider symlink", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({
      providers: { codex: { source: "providers/codex/loop/adapter.md" } },
    }),
    "providers/codex/adapter.md": "declared\n",
  });
  symlinkSync("loop", join(root, "providers", "codex", "loop"));

  assert.deepEqual(validatePortability(root), [
    "plugin.json: provider \"codex\" source path is unresolvable: providers/codex/loop/adapter.md",
    "providers/codex/loop: unresolvable symbolic links are not allowed in provider adapters",
  ]);
});

test("rejects unreferenced provider symlinks that escape their adapter root", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({ providers: { codex: {} } }),
  });
  const outside = mkdtempSync(join(tmpdir(), "portable-provider-file-outside-"));
  writeFileSync(join(outside, "secret"), "outside\n");
  mkdirSync(join(root, "providers", "codex"), { recursive: true });
  symlinkSync(join(outside, "secret"), join(root, "providers", "codex", "secret"));

  assert.deepEqual(validatePortability(root), [
    "providers/codex/secret: symbolic link resolves outside its declared provider root",
  ]);
});

test("requires provider entries and paths to have structural types", () => {
  const root = fixture({
    "plugin.json": JSON.stringify({
      providers: {
        agentskills: "providers/agentskills",
        codex: { source: ["providers/codex/source"] },
      },
    }),
    "providers/agentskills/adapter.md": "declared\n",
    "providers/codex/adapter.md": "declared\n",
  });

  assert.deepEqual(validatePortability(root), [
    'plugin.json: provider "agentskills" declaration must be an object',
    'plugin.json: provider "codex" source path must be a string',
  ]);
});

test("requires the root provider map to be an object", () => {
  const root = fixture({ "plugin.json": JSON.stringify({ providers: ["claude"] }) });

  assert.deepEqual(validatePortability(root), [
    "plugin.json: providers must be an object",
  ]);
});

test("reports an invalid root provider manifest", () => {
  const root = fixture({ "plugin.json": "{not json" });

  assert.deepEqual(validatePortability(root), [
    "plugin.json: provider manifest must contain valid JSON",
  ]);
});

test("requires the root provider manifest to be an object", () => {
  const root = fixture({ "plugin.json": "null" });

  assert.deepEqual(validatePortability(root), [
    "plugin.json: provider manifest must be an object",
  ]);
});

test("rejects a root provider manifest symlink outside the repository", () => {
  const root = fixture();
  const outside = mkdtempSync(join(tmpdir(), "portable-manifest-outside-"));
  writeFileSync(join(outside, "plugin.json"), '{"mcpServers":{},"providers":{}}');
  symlinkSync(join(outside, "plugin.json"), join(root, "plugin.json"));

  assert.deepEqual(validatePortability(root), [
    "plugin.json: provider manifest must be a real repository file",
  ]);
});
