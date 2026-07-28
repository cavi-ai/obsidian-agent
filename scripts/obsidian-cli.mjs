#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MINIMUM_VERSION = { major: 1, minor: 12, patch: 7 };
const JSON_COMMANDS = new Set([
  "base:query",
  "backlinks",
  "bookmarks",
  "hotkeys",
  "outline",
  "plugins",
  "plugins:enabled",
  "properties",
  "search",
  "search:context",
  "tags",
  "tasks",
  "unresolved",
]);

export function buildObsidianArgs(operation) {
  if (!operation?.command || typeof operation.command !== "string") {
    throw new TypeError("operation.command must be a non-empty string");
  }

  const args = [operation.command];
  if (operation.vault) args.push(`vault=${operation.vault}`);

  for (const [key, value] of Object.entries(operation)) {
    if (key === "command" || key === "vault" || key === "format" || value === undefined || value === null) continue;
    args.push(value === true ? key : `${key}=${value}`);
  }

  if (JSON_COMMANDS.has(operation.command)) args.push("format=json");
  return args;
}

export function parseObsidianVersion(text) {
  const match = String(text).match(/\b(\d+)\.(\d+)\.(\d+)\b/);
  if (!match) throw new Error(`Could not parse an Obsidian version from: ${text}`);
  const [, major, minor, patch] = match;
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

export function assertSupportedVersion(version) {
  const actual = [version.major, version.minor, version.patch];
  const minimum = [MINIMUM_VERSION.major, MINIMUM_VERSION.minor, MINIMUM_VERSION.patch];
  for (let index = 0; index < minimum.length; index += 1) {
    if (actual[index] > minimum[index]) return;
    if (actual[index] < minimum[index]) {
      throw new Error("Obsidian CLI requires version 1.12.7 or newer.");
    }
  }
}

function activationInstructions() {
  return "Install Obsidian 1.12.7 or newer, then enable Settings → General → Command line interface and follow Obsidian's registration prompt. Restart the terminal after registration.\n";
}

export function runDoctor({ execFile = spawnSync, write = (line) => process.stdout.write(line) } = {}) {
  const result = execFile("obsidian", ["version"], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    write(`Obsidian CLI is unavailable. ${activationInstructions()}`);
    return 1;
  }

  try {
    const version = parseObsidianVersion(result.stdout);
    assertSupportedVersion(version);
    write(`Obsidian CLI is available (${version.major}.${version.minor}.${version.patch}). ${activationInstructions()}`);
    return 0;
  } catch (error) {
    write(`${error.message} ${activationInstructions()}`);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] !== "doctor") {
    console.error("Usage: node scripts/obsidian-cli.mjs doctor");
    process.exitCode = 1;
  } else {
    process.exitCode = runDoctor();
  }
}
