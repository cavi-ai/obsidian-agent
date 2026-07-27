#!/usr/bin/env node
// CI gate: capabilities.json is the source of truth for skills and commands.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

const TIERS = new Set(["policy", "worker", "orchestrator", "pipeline", "technique", "harness"]);
const NO_COMMAND_TIERS = new Set(["policy", "harness"]);
// Orchestrators needing CLI-only state or stateful write tools cannot run in Companion.
const COMPANION_INELIGIBLE = new Set(["research-workbench"]);
// Pipeline entry points with a command file but no skill.
const COMMAND_ONLY = new Set(["build-from-spec"]);

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

  const commandsDir = join(root, "commands");
  const commandIds = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3))
    : [];

  for (const id of commandIds) {
    if (COMMAND_ONLY.has(id)) continue;
    const cap = byId.get(id);
    if (!cap) { errors.push(`command '${id}' has no registry entry in capabilities.json`); continue; }
    if (!cap.surfaces.command) errors.push(`command '${id}' exists but the registry sets surfaces.command to false`);
  }

  for (const cap of registry.capabilities) {
    if (!TIERS.has(cap.tier)) errors.push(`'${cap.id}': unknown tier '${cap.tier}'`);

    const cmd = cap.surfaces.command;
    if (cmd !== false) {
      if (typeof cmd !== "string" || cmd.trim() === "") {
        errors.push(`'${cap.id}': surfaces.command must be false or a non-empty argument hint string`);
      }
      if (NO_COMMAND_TIERS.has(cap.tier)) errors.push(`'${cap.id}': tier '${cap.tier}' may not have a command`);
      if (!commandIds.includes(cap.id)) errors.push(`'${cap.id}' declares a command but there is no file commands/${cap.id}.md`);
    }

    const comp = cap.surfaces.companion;
    if (comp !== false) {
      if (cap.tier !== "orchestrator") errors.push(`'${cap.id}': only orchestrator tier may have a companion workflow (tier is '${cap.tier}')`);
      if (COMPANION_INELIGIBLE.has(cap.id)) errors.push(`'${cap.id}' is on the companion-ineligible list and may not have a workflow`);
    }
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
