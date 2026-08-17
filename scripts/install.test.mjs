import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  HOSTS,
  buildInstallPlan,
  executeInstallPlan,
  hashInstallPlan,
  parseArguments,
} from "./install.mjs";

const root = resolve(import.meta.dirname, "..");
const expectedHosts = ["claude", "codex", "gemini", "opencode", "agentskills"];

// Cross-check: the plan is built from the filesystem, so the count comes from the registry.
const portableSkillCount = JSON.parse(readFileSync(join(root, "capabilities.json"), "utf8"))
  .capabilities.filter((cap) => cap.portable).length;

// plugin.json is the one author identity; host manifests copy it, never restate it.
test("every host manifest carries the author identity from plugin.json", () => {
  const author = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8")).author;
  assert.ok(author?.name && author.organization && author.organization_url, "plugin.json must declare an author");

  const marketplace = JSON.parse(readFileSync(join(root, ".claude-plugin/marketplace.json"), "utf8"));
  assert.deepEqual(marketplace.owner, author);
  for (const entry of marketplace.plugins) assert.deepEqual(entry.author, author, entry.name);

  for (const path of [".claude-plugin/plugin.json", ".codex-plugin/plugin.json"]) {
    assert.deepEqual(JSON.parse(readFileSync(join(root, path), "utf8")).author, author, path);
  }

  const codex = JSON.parse(readFileSync(join(root, ".codex-plugin/plugin.json"), "utf8"));
  assert.equal(codex.interface.developerName, author.name);
});

test("all provider manifests use the universal identity and no MCP configuration", () => {
  const rootManifest = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
  assert.equal(rootManifest.identity, "obsidian-agent");
  assert.deepEqual(Object.keys(rootManifest.providers), expectedHosts);
  assert.deepEqual(
    { distribution: rootManifest.providers.codex.distribution, direct_install: rootManifest.providers.codex.direct_install },
    { distribution: "marketplace", direct_install: false },
  );

  for (const path of [
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json",
    ".codex-plugin/plugin.json",
    "gemini-extension.json",
    "plugin.json",
  ]) {
    const text = readFileSync(join(root, path), "utf8");
    assert.match(text, /obsidian-agent/);
    assert.doesNotMatch(text, /mcpServers|\.mcp\.json|Companion MCP/i);
  }
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(root, "gemini-extension.json"), "utf8"))).sort(), [
    "description", "name", "version",
  ]);
});

test("Codex manifest follows the canonical plugin ingestion contract", () => {
  // Contract: openai/codex plugin-creator references/plugin-json-spec.md and
  // scripts/validate_plugin.py (current main branch).
  const manifest = JSON.parse(readFileSync(join(root, ".codex-plugin/plugin.json"), "utf8"));
  const allowed = new Set([
    "id", "name", "version", "description", "skills", "apps", "mcpServers",
    "interface", "author", "homepage", "repository", "license", "keywords",
  ]);
  assert.deepEqual(Object.keys(manifest).filter((key) => !allowed.has(key)), []);
  assert.equal(manifest.name, "obsidian-agent");
  assert.match(manifest.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.ok(manifest.description.trim());
  assert.ok(manifest.author.name.trim());
  assert.equal(manifest.skills, "./skills/");
  for (const field of [
    "displayName", "shortDescription", "longDescription", "developerName", "category",
  ]) assert.ok(manifest.interface[field].trim());
  assert.ok(Array.isArray(manifest.interface.capabilities));
  assert.ok(manifest.interface.capabilities.every((value) => typeof value === "string" && value.trim()));
  assert.ok(Array.isArray(manifest.interface.defaultPrompt));
  assert.ok(manifest.interface.defaultPrompt.length > 0 && manifest.interface.defaultPrompt.length <= 3);
});

test("installer exposes exactly the supported host matrix", () => {
  assert.deepEqual(HOSTS, expectedHosts);
});

test("argument parsing defaults to a dry run and requires explicit scope", () => {
  assert.deepEqual(parseArguments(["--host", "codex", "--scope", "user"]), {
    host: "codex",
    scope: "user",
    dryRun: true,
  });
  assert.throws(() => parseArguments(["--host", "other", "--scope", "user"]), /Unsupported host/);
  assert.throws(() => parseArguments(["--host", "codex"]), /--scope/);
});

test("dry-run plans stay under the selected user or project host root", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "obsidian-agent-install-"));
  for (const host of HOSTS) {
    for (const scope of ["user", "project"]) {
      const options = scope === "user"
        ? { host, scope, home: join(sandbox, "home") }
        : { host, scope, project: join(sandbox, "project") };
      const plan = buildInstallPlan(root, options);
      assert.ok(plan.files.length > 1);
      assert.ok(plan.files.every(({ destination }) =>
        destination === plan.destinationRoot || destination.startsWith(`${plan.destinationRoot}/`)));
      assert.ok(plan.files.some(({ source }) => source.includes("/skills/")));
      assert.ok(plan.files.every(({ path }) => !path.startsWith("skills/cloud-reply/")));
      assert.ok(plan.files.every(({ path }) => !path.startsWith("skills/note-to-artifact/")));
      assert.ok(plan.files.every(({ path }) => !path.startsWith("skills/research-workbench/")));
      assert.ok(plan.files.every(({ path }) => !path.startsWith("skills/session-to-note/")));
      assert.ok(plan.files.every(({ path }) => !path.startsWith("skills/vault-routines/")));
      assert.ok(plan.files.every(({ source }) => !source.endsWith("/.mcp.json")));
    }
  }
});

test("OpenCode and Gemini plans use their exact native skill discovery roots", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "obsidian-agent-native-roots-"));
  const cases = [
    ["opencode", "user", join(sandbox, "home", ".config", "opencode")],
    ["opencode", "project", join(sandbox, "project", ".opencode")],
    ["gemini", "user", join(sandbox, "home", ".gemini")],
    ["gemini", "project", join(sandbox, "project", ".gemini")],
  ];
  for (const [host, scope, expectedRoot] of cases) {
    const plan = buildInstallPlan(root, {
      host,
      scope,
      home: join(sandbox, "home"),
      project: join(sandbox, "project"),
    });
    assert.equal(plan.destinationRoot, expectedRoot);
    assert.ok(plan.files.some(({ destination }) =>
      destination === join(expectedRoot, "skills", "vault-synthesis", "SKILL.md")));
    assert.ok(plan.files.filter(({ source }) => source.includes("/skills/")).every(({ destination }) =>
      destination.startsWith(join(expectedRoot, "skills") + "/")));
    assert.ok(plan.files.every(({ destination }) => !destination.includes("/plugins/obsidian-agent/")));
  }
});

test("Codex preview packages exactly the portable skills without activating them", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "obsidian-agent-codex-package-"));
  for (const scope of ["user", "project"]) {
    const plan = buildInstallPlan(root, {
      host: "codex",
      scope,
      home: join(sandbox, "home"),
      project: join(sandbox, "project"),
    });
    const expected = join(sandbox, scope === "user" ? "home" : "project", "plugins", "obsidian-agent");
    assert.equal(plan.destinationRoot, expected);
    assert.equal(plan.files.filter(({ path }) => path.startsWith("skills/")).length, portableSkillCount);
    assert.ok(plan.files.some(({ path }) => path === ".codex-plugin/plugin.json"));
    assert.ok(plan.files.every(({ destination }) => destination.startsWith(expected + "/")));
    assert.ok(plan.files.every(({ path }) => !path.startsWith(".agents/plugins/")));
  }
});

test("writes require the exact preview hash", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "obsidian-agent-confirm-"));
  const plan = buildInstallPlan(root, {
    host: "agentskills",
    scope: "project",
    project: sandbox,
  });
  assert.throws(() => executeInstallPlan(plan, { confirm: "wrong" }), /preview hash/);
  const hash = hashInstallPlan(plan);
  executeInstallPlan(plan, { confirm: hash });
  assert.equal(JSON.parse(readFileSync(join(plan.destinationRoot, ".obsidian-agent-install.json"), "utf8")).previewHash, hash);
});

test("installer refuses to overwrite an unowned destination", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "obsidian-agent-owned-"));
  const plan = buildInstallPlan(root, {
    host: "opencode",
    scope: "project",
    project: sandbox,
  });
  const target = plan.files[0].destination;
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, "not ours");
  assert.throws(() => executeInstallPlan(plan, { confirm: hashInstallPlan(plan) }), /unowned destination/);
});

test("installer refuses a destination path that traverses a symlink", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "obsidian-agent-symlink-"));
  const outside = mkdtempSync(join(tmpdir(), "obsidian-agent-outside-"));
  symlinkSync(outside, join(sandbox, ".agents"));
  const plan = buildInstallPlan(root, {
    host: "agentskills",
    scope: "project",
    project: sandbox,
  });
  assert.throws(() => executeInstallPlan(plan, { confirm: hashInstallPlan(plan) }), /symbolic link/);
});

test("installer rejects an ownership marker symlink without changing its outside target", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "obsidian-agent-marker-"));
  const outside = join(mkdtempSync(join(tmpdir(), "obsidian-agent-marker-outside-")), "record.json");
  const plan = buildInstallPlan(root, { host: "agentskills", scope: "project", project: sandbox });
  mkdirSync(plan.destinationRoot, { recursive: true });
  const original = '{"identity":"outside"}\n';
  writeFileSync(outside, original);
  symlinkSync(outside, join(plan.destinationRoot, ".obsidian-agent-install.json"));
  assert.throws(() => executeInstallPlan(plan, { confirm: hashInstallPlan(plan) }), /ownership marker.*symbolic link/);
  assert.equal(readFileSync(outside, "utf8"), original);
});

test("installer rejects a dangling ownership marker symlink", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "obsidian-agent-dangling-marker-"));
  const outside = join(mkdtempSync(join(tmpdir(), "obsidian-agent-dangling-outside-")), "missing.json");
  const plan = buildInstallPlan(root, { host: "agentskills", scope: "project", project: sandbox });
  mkdirSync(plan.destinationRoot, { recursive: true });
  symlinkSync(outside, join(plan.destinationRoot, ".obsidian-agent-install.json"));
  assert.throws(() => executeInstallPlan(plan, { confirm: hashInstallPlan(plan) }), /ownership marker.*symbolic link/);
  assert.equal(existsSync(outside), false);
});

test("installer rejects a non-regular ownership marker", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "obsidian-agent-marker-directory-"));
  const plan = buildInstallPlan(root, { host: "agentskills", scope: "project", project: sandbox });
  mkdirSync(join(plan.destinationRoot, ".obsidian-agent-install.json"), { recursive: true });
  assert.throws(() => executeInstallPlan(plan, { confirm: hashInstallPlan(plan) }), /ownership marker must be a regular file/);
});

test("late owned directory collision is rejected before any planned file changes", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "obsidian-agent-atomic-"));
  const plan = buildInstallPlan(root, { host: "agentskills", scope: "project", project: sandbox });
  executeInstallPlan(plan, { confirm: hashInstallPlan(plan) });
  const first = plan.files[0].destination;
  const late = plan.files.at(-1).destination;
  writeFileSync(first, "sentinel");
  rmSync(late);
  mkdirSync(late);
  assert.throws(() => executeInstallPlan(plan, { confirm: hashInstallPlan(plan) }), /destination must be a regular file/);
  assert.equal(readFileSync(first, "utf8"), "sentinel");
});
