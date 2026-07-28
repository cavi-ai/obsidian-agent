import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate } from "./validate-registry.mjs";

const OK_ROOT = {
  plugin: "obsidian-agent",
  requires: { obsidian: ">=1.12.7" },
  transport: "cli",
};

function fixture(capabilities, skills, commands = {}, registryOverrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "reg-"));
  writeFileSync(join(root, "capabilities.json"), JSON.stringify({
    ...OK_ROOT,
    capabilities,
    ...registryOverrides,
  }));
  mkdirSync(join(root, "skills"), { recursive: true });
  mkdirSync(join(root, "commands"), { recursive: true });
  for (const [id, fm] of Object.entries(skills)) {
    mkdirSync(join(root, "skills", id), { recursive: true });
    const portability = fm.portable === undefined ? "" : `portable: ${fm.portable}\n`;
    writeFileSync(join(root, "skills", id, "SKILL.md"), `---\nname: ${fm.name}\ndescription: ${fm.description}\n${portability}---\n\n# x\n`);
  }
  for (const [id, body] of Object.entries(commands)) {
    writeFileSync(join(root, "commands", `${id}.md`), body);
  }
  return root;
}

const OK_CAP = { id: "alpha", tier: "worker", name: "Alpha", description: "Use when alpha.", portable: true, surfaces: { skill: true, command: false } };

test("rejects the legacy plugin identity", () => {
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } }, {}, { plugin: "claude-obsidian" });
  assert.match(validate(root).join("\n"), /plugin.*obsidian-agent/i);
});

test("rejects a transport other than the official CLI", () => {
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } }, {}, { transport: "mcp" });
  assert.match(validate(root).join("\n"), /transport.*cli/i);
});

test("rejects a missing Obsidian 1.12.7 version floor", () => {
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } }, {}, { requires: {} });
  assert.match(validate(root).join("\n"), /requires\.obsidian.*>=1\.12\.7/i);
});

test("rejects a capability without an explicit portability classification", () => {
  const { portable, ...unclassified } = OK_CAP;
  const root = fixture([unclassified], { alpha: { name: "alpha", description: "Use when alpha." } });
  assert.match(validate(root).join("\n"), /alpha.*portable.*boolean/i);
});

test("rejects a non-portable capability without a skill isolation marker", () => {
  const cap = { ...OK_CAP, portable: false };
  const root = fixture([cap], { alpha: { name: "alpha", description: "Use when alpha." } });
  assert.match(validate(root).join("\n"), /alpha.*non-portable.*portable: false/i);
});

test("rejects a portable capability carrying a non-portable isolation marker", () => {
  const root = fixture([OK_CAP], {
    alpha: { name: "alpha", description: "Use when alpha.", portable: false },
  });
  assert.match(validate(root).join("\n"), /alpha.*portable.*marked.*false/i);
});

test("passes when registry and skill agree", () => {
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } });
  assert.deepEqual(validate(root), []);
});

test("rejects a legacy Companion surface on an orchestrator", () => {
  const cap = { ...OK_CAP, tier: "orchestrator", surfaces: { skill: true, command: false, companion: "Manifest" } };
  const root = fixture([cap], { alpha: { name: "alpha", description: "Use when alpha." } });
  assert.match(validate(root).join("\n"), /alpha.*companion.*legacy/i);
});

test("fails when a skill has no registry entry", () => {
  const root = fixture([OK_CAP], {
    alpha: { name: "alpha", description: "Use when alpha." },
    beta: { name: "beta", description: "Use when beta." },
  });
  assert.match(validate(root).join("\n"), /beta.*no registry entry/i);
});

test("fails when a registry entry has no skill", () => {
  const root = fixture([OK_CAP, { ...OK_CAP, id: "ghost", name: "Ghost" }], { alpha: { name: "alpha", description: "Use when alpha." } });
  assert.match(validate(root).join("\n"), /ghost.*no skill/i);
});

test("fails when SKILL.md name does not match its directory", () => {
  const root = fixture([OK_CAP], { alpha: { name: "wrong-name", description: "Use when alpha." } });
  assert.match(validate(root).join("\n"), /name.*wrong-name.*alpha/i);
});

test("fails when descriptions differ by even one character", () => {
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha!" } });
  assert.match(validate(root).join("\n"), /description mismatch/i);
});

const CMD_BODY = "---\ndescription: Do the alpha thing.\nargument-hint: \"<note path>\"\n---\n\nBody.\n";

test("fails when a command file has no registry entry", () => {
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } }, { orphan: CMD_BODY });
  assert.match(validate(root).join("\n"), /command 'orphan'.*no registry entry/i);
});

test("fails when a registry entry declares a command that does not exist", () => {
  const cap = { ...OK_CAP, surfaces: { skill: true, command: "<note path>" } };
  const root = fixture([cap], { alpha: { name: "alpha", description: "Use when alpha." } });
  assert.match(validate(root).join("\n"), /alpha.*declares a command.*no file/i);
});

test("passes when a declared command exists", () => {
  const cap = { ...OK_CAP, surfaces: { skill: true, command: "<note path>" } };
  const root = fixture([cap], { alpha: { name: "alpha", description: "Use when alpha." } }, { alpha: CMD_BODY });
  assert.deepEqual(validate(root), []);
});

test("rejects an unknown tier", () => {
  const root = fixture([{ ...OK_CAP, tier: "wizard" }], { alpha: { name: "alpha", description: "Use when alpha." } });
  assert.match(validate(root).join("\n"), /unknown tier 'wizard'/i);
});

test("rejects a command on a policy-tier capability", () => {
  const cap = { ...OK_CAP, tier: "policy", surfaces: { skill: true, command: "<x>" } };
  const root = fixture([cap], { alpha: { name: "alpha", description: "Use when alpha." } }, { alpha: CMD_BODY });
  assert.match(validate(root).join("\n"), /policy.*may not have a command/i);
});

test("rejects a command on a harness-tier capability", () => {
  const cap = { ...OK_CAP, tier: "harness", surfaces: { skill: true, command: "<x>" } };
  const root = fixture([cap], { alpha: { name: "alpha", description: "Use when alpha." } }, { alpha: CMD_BODY });
  assert.match(validate(root).join("\n"), /harness.*may not have a command/i);
});

test("rejects an empty argument hint", () => {
  const cap = { ...OK_CAP, surfaces: { skill: true, command: "" } };
  const root = fixture([cap], { alpha: { name: "alpha", description: "Use when alpha." } }, { alpha: CMD_BODY });
  assert.match(validate(root).join("\n"), /argument hint/i);
});
