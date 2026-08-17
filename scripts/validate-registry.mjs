#!/usr/bin/env node
// CI gate: capabilities.json is the source of truth for skills and commands.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

const TIERS = new Set(["policy", "worker", "orchestrator", "pipeline", "technique", "harness"]);
const NO_COMMAND_TIERS = new Set(["policy", "harness"]);
// Every command delegates: `Invoke **`obsidian-agent:<id>`**` names the capability it runs.
const INVOKE_TARGET = /Invoke \*\*`obsidian-agent:([a-z0-9-]+)`\*\*/g;

export function validate(root) {
  const errors = [];
  const registry = JSON.parse(readFileSync(join(root, "capabilities.json"), "utf8"));
  if (registry.plugin !== "obsidian-agent") {
    errors.push("registry plugin must be 'obsidian-agent'");
  }
  if (registry.transport !== "cli") {
    errors.push("registry transport must be 'cli'");
  }
  if (registry.requires?.obsidian !== ">=1.12.7") {
    errors.push("registry requires.obsidian must be '>=1.12.7'");
  }

  const byId = new Map();
  for (const cap of registry.capabilities) {
    if (byId.has(cap.id)) errors.push(`duplicate registry id '${cap.id}'`);
    byId.set(cap.id, cap);
    if (typeof cap.portable !== "boolean") {
      errors.push(`'${cap.id}': portable must be a boolean`);
    }
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
    if (cap.portable === false && fields.portable !== "false") {
      errors.push(`skill '${id}': non-portable capability must declare 'portable: false'`);
    }
    if (cap.portable === true && fields.portable === "false") {
      errors.push(`skill '${id}': portable capability is incorrectly marked portable: false`);
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
    const source = readFileSync(join(commandsDir, `${id}.md`), "utf8");
    const { fields, error } = parseFrontmatter(source);
    if (error) { errors.push(`command '${id}': ${error}`); continue; }

    const targets = [...new Set([...source.matchAll(INVOKE_TARGET)].map((match) => match[1]))];
    if (targets.length !== 1) {
      errors.push(`command '${id}': must name exactly one 'Invoke **\`obsidian-agent:<id>\`**' target, found ${targets.length}`);
    } else if (!byId.has(targets[0])) {
      errors.push(`command '${id}': invokes '${targets[0]}', which is not a capability in capabilities.json`);
    }

    const cap = byId.get(id);
    if (!cap) {
      // A delegate command fronts another capability, so it owns its own text.
      if (targets.length === 1 && targets[0] === id) {
        errors.push(`command '${id}' invokes itself but has no registry entry in capabilities.json`);
      }
      if (!fields.description) errors.push(`command '${id}': missing description`);
      if (!fields["argument-hint"]) errors.push(`command '${id}': missing argument-hint`);
      continue;
    }

    if (targets.length === 1 && targets[0] !== id) {
      errors.push(`command '${id}': has a registry entry but invokes '${targets[0]}'`);
    }
    if (!cap.surfaces.command) errors.push(`command '${id}' exists but the registry sets surfaces.command to false`);

    const description = fields.description ?? "";
    if (description !== cap.description) {
      errors.push(`command '${id}': description mismatch\n  commands/${id}.md: ${description}\n  registry: ${cap.description}`);
    }
    if (typeof cap.surfaces.command === "string") {
      const hint = fields["argument-hint"] ?? "";
      if (hint !== cap.surfaces.command) {
        errors.push(`command '${id}': argument-hint mismatch\n  commands/${id}.md: ${hint}\n  registry: ${cap.surfaces.command}`);
      }
    }
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

    if (Object.hasOwn(cap.surfaces, "companion")) {
      errors.push(`'${cap.id}': surfaces.companion is a legacy host surface and is not allowed`);
    }

    if (Object.hasOwn(cap, "lenses")) errors.push(...validateLenses(cap, root));
  }

  return errors;
}

// A lens capability is one skill with named variants; the registry owns the ids and labels.
function validateLenses(cap, root) {
  const errors = [];
  const lenses = cap.lenses;
  if (!Array.isArray(lenses) || lenses.length === 0) {
    return [`'${cap.id}': lenses must be a non-empty array`];
  }

  const seen = new Set();
  for (const lens of lenses) {
    if (typeof lens?.id !== "string" || lens.id.trim() === "") {
      errors.push(`'${cap.id}': every lens needs a non-empty id`);
      continue;
    }
    if (typeof lens.name !== "string" || lens.name.trim() === "") {
      errors.push(`'${cap.id}': lens '${lens.id}' needs a non-empty name`);
    }
    if (seen.has(lens.id)) errors.push(`'${cap.id}': duplicate lens id '${lens.id}'`);
    seen.add(lens.id);
  }
  if (errors.length) return errors;

  if (typeof cap.surfaces.command === "string") {
    for (const lens of lenses) {
      if (!cap.surfaces.command.includes(lens.id)) {
        errors.push(`'${cap.id}': lens '${lens.id}' is missing from surfaces.command`);
      }
    }
  }

  const skillPath = join(root, "skills", cap.id, "SKILL.md");
  if (!existsSync(skillPath)) return errors;
  const body = readFileSync(skillPath, "utf8");
  const documented = new Set([...body.matchAll(/^\|\s*`([a-z-]+)`\s*\|/gm)].map((m) => m[1]));
  for (const lens of lenses) {
    if (!documented.has(lens.id)) {
      errors.push(`'${cap.id}': lens '${lens.id}' has no row in skills/${cap.id}/SKILL.md`);
    }
  }
  for (const id of documented) {
    if (!seen.has(id)) errors.push(`'${cap.id}': skills/${cap.id}/SKILL.md documents lens '${id}' which the registry does not declare`);
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
