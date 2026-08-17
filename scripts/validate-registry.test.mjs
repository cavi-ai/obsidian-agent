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
    const needsQuotes = fm.description.includes(" #") || fm.description.includes(": ");
    const described = needsQuotes ? `"${fm.description}"` : fm.description;
    writeFileSync(join(root, "skills", id, "SKILL.md"), `---\nname: ${fm.name}\ndescription: ${described}\n${portability}---\n\n${fm.body ?? "# x"}\n`);
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

const cmdBody = (description, hint) =>
  `---\ndescription: ${description}\nargument-hint: ${hint}\n---\n\nInvoke **\`obsidian-agent:alpha\`** with the user's arguments.\n`;
const CMD_BODY = cmdBody("Use when alpha.", '"<note path>"');

test("fails when a command invokes itself but has no registry entry", () => {
  const orphan = "---\ndescription: Do the orphan thing.\nargument-hint: \"<x>\"\n---\n\nInvoke **`obsidian-agent:orphan`** with the user's arguments.\n";
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } }, { orphan });
  assert.match(validate(root).join("\n"), /command 'orphan' invokes itself but has no registry entry/i);
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

test("fails when a command description drifts from the registry", () => {
  const cap = { ...OK_CAP, surfaces: { skill: true, command: "<note path>" } };
  const root = fixture([cap], { alpha: { name: "alpha", description: "Use when alpha." } }, {
    alpha: cmdBody("Use when the alpha thing is needed.", '"<note path>"'),
  });
  assert.match(validate(root).join("\n"), /command 'alpha': description mismatch/i);
});

test("fails when a command argument hint drifts from the registry", () => {
  const cap = { ...OK_CAP, surfaces: { skill: true, command: "<note path>" } };
  const root = fixture([cap], { alpha: { name: "alpha", description: "Use when alpha." } }, {
    alpha: cmdBody("Use when alpha.", '"[optional scope]"'),
  });
  assert.match(validate(root).join("\n"), /command 'alpha': argument-hint mismatch/i);
});

test("passes when a quoted command description matches the registry", () => {
  const description = "Use when collecting tasks — #task items across the vault.";
  const cap = { ...OK_CAP, description, surfaces: { skill: true, command: "<note path>" } };
  const root = fixture([cap], { alpha: { name: "alpha", description } }, {
    alpha: cmdBody(`"${description}"`, '"<note path>"'),
  });
  assert.deepEqual(validate(root), []);
});

const delegate = (description, hint, target) =>
  `---\ndescription: ${description}\nargument-hint: ${hint}\n---\n\nInvoke **\`obsidian-agent:${target}\`** with the user's arguments.\n`;

test("accepts a delegate command that fronts another capability", () => {
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } }, {
    "run-alpha": delegate("Run the alpha thing.", '"<note path>"', "alpha"),
  });
  assert.deepEqual(validate(root), []);
});

test("rejects a delegate command pointing at a capability that does not exist", () => {
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } }, {
    "run-alpha": delegate("Run the alpha thing.", '"<note path>"', "removed-skill"),
  });
  assert.match(validate(root).join("\n"), /invokes 'removed-skill', which is not a capability/);
});

test("rejects a command with no invoke target", () => {
  const silent = "---\ndescription: Run the alpha thing.\nargument-hint: \"<note path>\"\n---\n\nBody with no invoke line.\n";
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } }, { "run-alpha": silent });
  assert.match(validate(root).join("\n"), /must name exactly one .* target, found 0/);
});

test("rejects a delegate command missing its own description or hint", () => {
  const noHint = "---\ndescription: Run it.\n---\n\nInvoke **`obsidian-agent:alpha`** now.\n";
  const root = fixture([OK_CAP], { alpha: { name: "alpha", description: "Use when alpha." } }, { "run-alpha": noHint });
  assert.match(validate(root).join("\n"), /missing argument-hint/);
});

test("rejects a registry-backed command that invokes something else", () => {
  const cap = { ...OK_CAP, surfaces: { skill: true, command: "<note path>" } };
  const other = { ...OK_CAP, id: "beta", name: "Beta", description: "Use when beta." };
  const root = fixture([cap, other], {
    alpha: { name: "alpha", description: "Use when alpha." },
    beta: { name: "beta", description: "Use when beta." },
  }, { alpha: delegate("Use when alpha.", '"<note path>"', "beta") });
  assert.match(validate(root).join("\n"), /command 'alpha': has a registry entry but invokes 'beta'/);
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

// A lens capability is one skill with named variants; the registry owns the ids and labels.
const LENS_CAP = {
  id: "alpha",
  tier: "orchestrator",
  name: "Alpha",
  description: "Use when alpha.",
  portable: true,
  surfaces: { skill: true, command: "one | two" },
  lenses: [{ id: "one", name: "Alpha: One" }, { id: "two", name: "Alpha: Two" }],
};
const LENS_BODY = "| Lens | Read as |\n|---|---|\n| `one` | first |\n| `two` | second |\n";
const lensCmd = (hint) => `---\ndescription: Use when alpha.\nargument-hint: "${hint}"\n---\n\nInvoke **\`obsidian-agent:alpha\`** with the user's arguments.\n`;

function lensFixture({ cap = LENS_CAP, body = LENS_BODY } = {}) {
  return fixture([cap], { alpha: { name: "alpha", description: "Use when alpha.", body } },
    { alpha: lensCmd(cap.surfaces.command) });
}

test("passes when every declared lens is documented and reachable", () => {
  assert.deepEqual(validate(lensFixture()), []);
});

test("rejects a declared lens with no row in the skill body", () => {
  const cap = { ...LENS_CAP, lenses: [...LENS_CAP.lenses, { id: "three", name: "Alpha: Three" }] };
  assert.match(validate(lensFixture({ cap })).join("\n"), /lens 'three' has no row/);
});

test("rejects a lens documented in the skill body that the registry does not declare", () => {
  const body = LENS_BODY + "| `three` | third |\n";
  assert.match(validate(lensFixture({ body })).join("\n"), /documents lens 'three'/);
});

test("rejects a declared lens missing from the command argument hint", () => {
  const cap = { ...LENS_CAP, surfaces: { skill: true, command: "one" }, lenses: LENS_CAP.lenses };
  const root = fixture([cap], { alpha: { name: "alpha", description: "Use when alpha.", body: LENS_BODY } },
    { alpha: lensCmd("one") });
  assert.match(validate(root).join("\n"), /lens 'two' is missing from surfaces\.command/);
});

test("rejects duplicate and empty lens ids", () => {
  const cap = { ...LENS_CAP, lenses: [{ id: "one", name: "Alpha: One" }, { id: "one", name: "Alpha: Dup" }] };
  assert.match(validate(lensFixture({ cap })).join("\n"), /duplicate lens id 'one'/);
  const empty = { ...LENS_CAP, lenses: [{ id: "", name: "Alpha: One" }] };
  assert.match(validate(lensFixture({ cap: empty })).join("\n"), /every lens needs a non-empty id/);
});

test("rejects an empty lenses array", () => {
  const cap = { ...LENS_CAP, lenses: [] };
  assert.match(validate(lensFixture({ cap })).join("\n"), /lenses must be a non-empty array/);
});
