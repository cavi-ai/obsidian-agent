import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate, ALWAYS_ON_CHAR_CEILING, INVOKE_CHAIN_BYTE_CEILING } from "./validate-context-budget.mjs";

// skills: { id: { description, body } }, commands: { id: description }
function fixture(skills, commands = {}) {
  const root = mkdtempSync(join(tmpdir(), "budget-"));
  writeFileSync(join(root, "capabilities.json"), JSON.stringify({
    plugin: "obsidian-agent",
    capabilities: Object.keys(skills).map((id) => ({ id })),
  }));
  mkdirSync(join(root, "skills"), { recursive: true });
  mkdirSync(join(root, "commands"), { recursive: true });
  for (const [id, skill] of Object.entries(skills)) {
    mkdirSync(join(root, "skills", id), { recursive: true });
    writeFileSync(
      join(root, "skills", id, "SKILL.md"),
      `---\nname: ${id}\ndescription: ${skill.description}\n---\n${skill.body ?? ""}`,
    );
  }
  for (const [id, description] of Object.entries(commands)) {
    writeFileSync(join(root, "commands", `${id}.md`), `---\ndescription: ${description}\n---\n\nBody.\n`);
  }
  return root;
}

const ALPHA = { description: "Use when alpha.", body: "alpha body\n" };
const BETA = { description: "Use when beta.", body: "beta body\n" };

test("counts the skill description when the capability has no command", () => {
  const root = fixture({ alpha: ALPHA });
  const result = validate(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.alwaysOnChars, "Use when alpha.".length);
  assert.deepEqual(result.alwaysOn, [{ id: "alpha", source: "skill", chars: 15 }]);
});

test("a command description shadows its skill's in the always-on surface", () => {
  const root = fixture({ alpha: ALPHA }, { alpha: "Do alpha now." });
  const result = validate(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.alwaysOnChars, "Do alpha now.".length);
  assert.equal(result.alwaysOn[0].source, "command");
});

test("counts the command-only build-from-spec description", () => {
  const root = fixture({ alpha: ALPHA }, { "build-from-spec": "Build it." });
  const result = validate(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.alwaysOnChars, "Use when alpha.".length + "Build it.".length);
  assert.deepEqual(result.alwaysOn.map((e) => e.id), ["alpha", "build-from-spec"]);
});

test("a chain total is the skill's own bytes when it requires nothing", () => {
  const root = fixture({ alpha: ALPHA });
  const { chains } = validate(root);
  assert.deepEqual(chains, [{ id: "alpha", bytes: 60, skills: ["alpha"] }]);
});

test("a chain total sums every transitively required sub-skill once", () => {
  const root = fixture({
    alpha: { ...ALPHA, body: "**REQUIRED SUB-SKILL:** obsidian-agent:beta\n**REQUIRED SUB-SKILL:** obsidian-agent:gamma\n" },
    beta: { ...BETA, body: "**REQUIRED SUB-SKILL:** obsidian-agent:gamma\n" },
    gamma: { description: "Use when gamma.", body: "gamma body\n" },
  });
  const { chains, errors } = validate(root);
  assert.deepEqual(errors, []);
  assert.deepEqual(chains[0], { id: "alpha", bytes: 138 + 92 + 60, skills: ["alpha", "beta", "gamma"] });
  assert.deepEqual(chains.map((c) => c.id), ["alpha", "beta", "gamma"]);
});

test("fails when the always-on surface exceeds its ceiling", () => {
  const root = fixture({ alpha: { ...ALPHA, description: "x".repeat(ALWAYS_ON_CHAR_CEILING + 1) } });
  assert.match(validate(root).errors.join("\n"), /always-on description surface.*exceeds ceiling/i);
});

test("fails when one invoke chain exceeds its ceiling", () => {
  const root = fixture({
    alpha: { ...ALPHA, body: `**REQUIRED SUB-SKILL:** obsidian-agent:beta\n${"x".repeat(INVOKE_CHAIN_BYTE_CEILING)}` },
    beta: BETA,
  });
  assert.match(validate(root).errors.join("\n"), /'alpha' invoke chain.*exceeds ceiling/i);
});

test("errors on a required sub-skill cycle instead of looping", () => {
  const root = fixture({
    alpha: { ...ALPHA, body: "**REQUIRED SUB-SKILL:** obsidian-agent:beta\n" },
    beta: { ...BETA, body: "**REQUIRED SUB-SKILL:** obsidian-agent:alpha\n" },
  });
  const { errors } = validate(root);
  assert.match(errors.join("\n"), /cycle: alpha -> beta -> alpha/);
});

test("errors on a self-referential sub-skill cycle", () => {
  const root = fixture({ alpha: { ...ALPHA, body: "**REQUIRED SUB-SKILL:** obsidian-agent:alpha\n" } });
  assert.match(validate(root).errors.join("\n"), /cycle: alpha -> alpha/);
});

test("errors when a required sub-skill has no skill directory", () => {
  const root = fixture({ alpha: { ...ALPHA, body: "**REQUIRED SUB-SKILL:** obsidian-agent:ghost\n" } });
  assert.match(validate(root).errors.join("\n"), /'alpha'.*'ghost'.*no skills\/ghost\/SKILL\.md/);
});

test("errors when a description source is missing entirely", () => {
  const root = fixture({ alpha: ALPHA });
  writeFileSync(join(root, "capabilities.json"), JSON.stringify({
    plugin: "obsidian-agent",
    capabilities: [{ id: "alpha" }, { id: "ghost" }],
  }));
  assert.match(validate(root).errors.join("\n"), /'ghost'.*no commands\/ghost\.md and no skills/);
});

test("errors when a description field is absent from frontmatter", () => {
  const root = fixture({ alpha: ALPHA });
  writeFileSync(join(root, "skills", "alpha", "SKILL.md"), "---\nname: alpha\n---\n\nBody.\n");
  assert.match(validate(root).errors.join("\n"), /'alpha' skill: missing description/);
});
