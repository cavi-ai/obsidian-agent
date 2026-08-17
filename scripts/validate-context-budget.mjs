#!/usr/bin/env node
// CI gate: bounds the always-on description surface and the per-capability invoke chain.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

// Ceilings are measured values plus modest headroom; raise deliberately, never to pass a diff.
export const ALWAYS_ON_CHAR_CEILING = 6500;
export const INVOKE_CHAIN_BYTE_CEILING = 8000;

const SUB_SKILL = /\*\*REQUIRED SUB-SKILL:\*\*\s*obsidian-agent:([a-z0-9-]+)/g;

function frontmatterDescription(path, label, errors) {
  const { fields, error } = parseFrontmatter(readFileSync(path, "utf8"));
  if (error) { errors.push(`${label}: ${error}`); return undefined; }
  if (!fields.description) { errors.push(`${label}: missing description`); return undefined; }
  return fields.description;
}

function alwaysOnSurface(root, ids, errors) {
  const entries = [];
  for (const { id, required } of ids) {
    // A command description shadows its skill's in the always-on host surface.
    const command = join(root, "commands", `${id}.md`);
    const skill = join(root, "skills", id, "SKILL.md");
    const source = existsSync(command) ? "command" : "skill";
    const path = source === "command" ? command : skill;
    if (!existsSync(path)) {
      if (required) errors.push(`'${id}': no commands/${id}.md and no skills/${id}/SKILL.md`);
      continue;
    }
    const description = frontmatterDescription(path, `'${id}' ${source}`, errors);
    if (description === undefined) continue;
    entries.push({ id, source, chars: description.length });
  }
  return entries;
}

function subSkillGraph(root, ids, errors) {
  const bytes = new Map();
  const deps = new Map();
  for (const id of ids) {
    const path = join(root, "skills", id, "SKILL.md");
    if (!existsSync(path)) { errors.push(`'${id}': no skills/${id}/SKILL.md`); continue; }
    const raw = readFileSync(path);
    bytes.set(id, raw.length);
    deps.set(id, [...raw.toString("utf8").matchAll(SUB_SKILL)].map((match) => match[1]));
  }
  for (const [id, targets] of deps) {
    for (const target of targets) {
      if (!bytes.has(target)) errors.push(`'${id}': required sub-skill '${target}' has no skills/${target}/SKILL.md`);
    }
  }
  return { bytes, deps };
}

function cyclePaths(deps) {
  const state = new Map();
  const found = new Set();
  const walk = (id, stack) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "open") {
      found.add([...stack.slice(stack.indexOf(id)), id].join(" -> "));
      return;
    }
    state.set(id, "open");
    stack.push(id);
    for (const target of deps.get(id) ?? []) walk(target, stack);
    stack.pop();
    state.set(id, "done");
  };
  for (const id of deps.keys()) walk(id, []);
  return [...found];
}

function chainTotals({ bytes, deps }) {
  const chains = [];
  for (const id of bytes.keys()) {
    const reached = new Set();
    const pending = [id];
    while (pending.length) {
      const current = pending.pop();
      if (reached.has(current)) continue;
      reached.add(current);
      for (const target of deps.get(current) ?? []) pending.push(target);
    }
    const skills = [...reached].sort();
    chains.push({ id, bytes: skills.reduce((sum, s) => sum + (bytes.get(s) ?? 0), 0), skills });
  }
  return chains.sort((left, right) => right.bytes - left.bytes || left.id.localeCompare(right.id));
}

export function validate(root) {
  const errors = [];
  const registry = JSON.parse(readFileSync(join(root, "capabilities.json"), "utf8"));
  const capabilityIds = registry.capabilities.map((cap) => cap.id);

  // Delegate commands have no capability of their own but still load a description.
  const commandsDir = join(root, "commands");
  const delegateIds = (existsSync(commandsDir) ? readdirSync(commandsDir) : [])
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -3))
    .filter((id) => !capabilityIds.includes(id));

  const alwaysOn = alwaysOnSurface(root, [
    ...capabilityIds.map((id) => ({ id, required: true })),
    ...delegateIds.map((id) => ({ id, required: true })),
  ], errors);
  const alwaysOnChars = alwaysOn.reduce((sum, entry) => sum + entry.chars, 0);

  const graph = subSkillGraph(root, capabilityIds, errors);
  for (const cycle of cyclePaths(graph.deps)) {
    errors.push(`required sub-skill cycle: ${cycle}`);
  }
  const chains = chainTotals(graph);

  if (alwaysOnChars > ALWAYS_ON_CHAR_CEILING) {
    errors.push(`always-on description surface ${alwaysOnChars} chars exceeds ceiling ${ALWAYS_ON_CHAR_CEILING}`);
  }
  for (const chain of chains) {
    if (chain.bytes > INVOKE_CHAIN_BYTE_CEILING) {
      errors.push(`'${chain.id}' invoke chain ${chain.bytes} bytes exceeds ceiling ${INVOKE_CHAIN_BYTE_CEILING} (${chain.skills.join(" + ")})`);
    }
  }

  return { alwaysOnChars, alwaysOn, chains, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..");
  const { alwaysOnChars, alwaysOn, chains, errors } = validate(root);

  console.log(`always-on descriptions  ${alwaysOnChars} / ${ALWAYS_ON_CHAR_CEILING} chars over ${alwaysOn.length} entries`);
  console.log(`\ninvoke chains (SKILL.md bytes, ceiling ${INVOKE_CHAIN_BYTE_CEILING})`);
  for (const chain of chains) {
    console.log(`  ${String(chain.bytes).padStart(6)}  ${chain.id.padEnd(24)} ${chain.skills.join(" + ")}`);
  }
  console.log("");

  for (const error of errors) console.error(`✗ ${error}`);
  if (errors.length) { console.error(`\n${errors.length} context budget error(s)`); process.exit(1); }
  console.log("✓ context budget within ceilings");
}
