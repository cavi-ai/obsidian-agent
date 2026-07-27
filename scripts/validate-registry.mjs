#!/usr/bin/env node
// CI gate: capabilities.json is the source of truth for skills and commands.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

export function validate(root) {
  const errors = [];
  const registry = JSON.parse(readFileSync(join(root, "capabilities.json"), "utf8"));
  const byId = new Map();
  for (const cap of registry.capabilities) {
    if (byId.has(cap.id)) errors.push(`duplicate registry id '${cap.id}'`);
    byId.set(cap.id, cap);
  }

  const skillsDir = join(root, "skills");
  const skillIds = existsSync(skillsDir)
    ? readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];

  for (const id of skillIds) {
    const cap = byId.get(id);
    if (!cap) { errors.push(`skill '${id}' has no registry entry in capabilities.json`); continue; }
    const { fields, error } = parseFrontmatter(readFileSync(join(skillsDir, id, "SKILL.md"), "utf8"));
    if (error) { errors.push(`skill '${id}': ${error}`); continue; }
    if (fields.name !== id) errors.push(`skill '${id}': frontmatter name '${fields.name}' does not match directory '${id}'`);
    if (fields.description !== cap.description) {
      errors.push(`skill '${id}': description mismatch\n  SKILL.md: ${fields.description}\n  registry: ${cap.description}`);
    }
  }

  for (const cap of registry.capabilities) {
    if (!skillIds.includes(cap.id)) errors.push(`registry entry '${cap.id}' has no skill directory`);
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validate(root);
  for (const e of errors) console.error(`✗ ${e}`);
  if (errors.length) { console.error(`\n${errors.length} registry error(s)`); process.exit(1); }
  console.log("✓ capability registry consistent");
}
