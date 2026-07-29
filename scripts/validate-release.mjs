#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;

export async function collectReleaseIdentity(rootUrl = new URL("../", import.meta.url)) {
  const root = fileURLToPath(rootUrl);
  const plugin = JSON.parse(await readFile(path.join(root, "plugin.json"), "utf8"));
  const gemini = JSON.parse(await readFile(path.join(root, "gemini-extension.json"), "utf8"));
  return {
    version: plugin.version,
    pluginVersion: plugin.version,
    geminiVersion: gemini.version,
  };
}

export function validateReleaseIdentity(identity, tag = `v${identity.version}`) {
  const errors = [];
  if (!SEMVER.test(identity.version ?? "")) errors.push("plugin version must be stable SemVer");
  if (identity.pluginVersion !== identity.version) errors.push("plugin version does not match canonical version");
  if (identity.geminiVersion !== identity.version) errors.push("Gemini version does not match canonical version");
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
