#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;

// plugin.json is the one version; every other manifest restates it and must agree.
const RESTATED = [
  ["gemini-extension.json", (json) => json.version],
  [".claude-plugin/plugin.json", (json) => json.version],
  [".codex-plugin/plugin.json", (json) => json.version],
  ["docs/obsidian-agent/source/navigation.json", (json) => json.version],
  [".claude-plugin/marketplace.json", (json) => json.plugins.map((entry) => entry.version)],
];

export async function collectReleaseIdentity(rootUrl = new URL("../", import.meta.url)) {
  const root = fileURLToPath(rootUrl);
  const read = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
  const plugin = await read("plugin.json");
  const restated = [];
  for (const [file, pick] of RESTATED) {
    const value = pick(await read(file));
    for (const version of [value].flat()) restated.push({ file, version });
  }
  return { version: plugin.version, restated };
}

export function validateReleaseIdentity(identity, tag = `v${identity.version}`) {
  const errors = [];
  if (!SEMVER.test(identity.version ?? "")) errors.push("plugin version must be stable SemVer");
  for (const { file, version } of identity.restated ?? []) {
    if (version !== identity.version) {
      errors.push(`${file} version ${version} does not match plugin.json ${identity.version}`);
    }
  }
  if (tag !== `v${identity.version}`) errors.push(`tag ${tag} does not match v${identity.version}`);
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const identity = await collectReleaseIdentity();
  const errors = validateReleaseIdentity(identity, process.argv[2]);
  if (errors.length) {
    for (const error of errors) console.error(`✗ ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ release identity ${identity.version}`);
  }
}
