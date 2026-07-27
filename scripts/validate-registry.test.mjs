import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate } from "./validate-registry.mjs";

function fixture(capabilities, skills, commands = {}) {
  const root = mkdtempSync(join(tmpdir(), "reg-"));
  writeFileSync(join(root, "capabilities.json"), JSON.stringify({ capabilities }));
  mkdirSync(join(root, "skills"), { recursive: true });
  mkdirSync(join(root, "commands"), { recursive: true });
  for (const [id, fm] of Object.entries(skills)) {
    mkdirSync(join(root, "skills", id), { recursive: true });
    writeFileSync(join(root, "skills", id, "SKILL.md"), `---\nname: ${fm.name}\ndescription: ${fm.description}\n---\n\n# x\n`);
  }
  for (const [id, body] of Object.entries(commands)) {
    writeFileSync(join(root, "commands", `${id}.md`), body);
  }
  return root;
}

const OK_CAP = { id: "alpha", tier: "worker", name: "Alpha", description: "Use when alpha.", surfaces: { skill: true, command: false, companion: false } };

test("passes when registry and skill agree", () => {
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } });
  assert.deepEqual(validate(root), []);
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
