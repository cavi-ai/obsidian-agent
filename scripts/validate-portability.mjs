#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_CONFIGURATION_DIRECTORIES = new Set([".claude-plugin", ".github"]);
const CONFIGURATION_EXTENSIONS = new Set([".json", ".toml", ".yaml", ".yml"]);

function walkFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return walkFiles(path);
      return entry.isFile() ? [path] : [];
    });
}

function rootConfigurationFiles(root) {
  return readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isFile()) return CONFIGURATION_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
      if (!entry.isDirectory() || !ROOT_CONFIGURATION_DIRECTORIES.has(entry.name)) return [];
      return walkFiles(path).filter((file) => CONFIGURATION_EXTENSIONS.has(extname(file)));
    });
}

function isProviderAdapter(text) {
  return /^---\s*$[\s\S]*?^portability:\s*provider-adapter\s*$[\s\S]*?^---\s*$/m.test(text);
}

function textContains(pattern, text) {
  return pattern.test(text);
}

export function validatePortability(root) {
  const errors = [];
  const add = (path, message) => errors.push(`${relative(root, path)}: ${message}`);

  const mcpConfiguration = join(root, ".mcp.json");
  if (existsSync(mcpConfiguration)) add(mcpConfiguration, "MCP configuration is not portable");

  for (const path of rootConfigurationFiles(root)) {
    const text = readFileSync(path, "utf8");
    if (textContains(/\bmcpServers\b/, text)) add(path, "mcpServers is not portable");
  }

  for (const path of walkFiles(join(root, "skills"))) {
    const text = readFileSync(path, "utf8");
    if (isProviderAdapter(text)) continue;
    if (textContains(/\bcompanion\b/i, text)) add(path, "Companion dependency is not portable");
    if (textContains(/\b(?:Anthropic API|ANTHROPIC_API_KEY|api\.anthropic\.com)\b/i, text)) {
      add(path, "Anthropic API instruction is not portable");
    }
    if (textContains(/\b(?:Claude Code|CLAUDE_PLUGIN_ROOT|claude-obsidian)\b|~\/.claude(?:\/|$)/i, text)) {
      add(path, "Claude-only instruction is not portable");
    }
  }

  return errors.sort((left, right) => left.localeCompare(right));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validatePortability(root);
  for (const error of errors) console.error(`✗ ${error}`);
  if (errors.length) {
    console.error(`\n${errors.length} portability error(s)`);
    process.exit(1);
  }
  console.log("✓ portable core contains no provider-specific dependencies");
}
