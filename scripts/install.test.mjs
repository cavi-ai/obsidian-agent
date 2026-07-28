import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
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

test("all provider manifests use the universal identity and no MCP configuration", () => {
  const rootManifest = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
  assert.equal(rootManifest.identity, "obsidian-agent");
  assert.deepEqual(Object.keys(rootManifest.providers), expectedHosts);

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
  assert.equal(JSON.parse(readFileSync(join(root, ".codex-plugin/plugin.json"), "utf8")).skills, "../skills");
  assert.equal(JSON.parse(readFileSync(join(root, "gemini-extension.json"), "utf8")).skills, "skills");
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
