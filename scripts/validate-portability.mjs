#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_CONFIGURATION_DIRECTORIES = new Set([".claude-plugin", ".github"]);
const CONFIGURATION_EXTENSIONS = new Set([".json", ".toml", ".yaml", ".yml"]);
const ADAPTER_TEXT_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);
const ANTHROPIC_CONCEPT = /\banthropic\b(?:[\s\p{P}]+(?:[\p{L}\p{N}_+-]+[\s\p{P}]+){0,4})?(?:api|client|sdk)\b/iu;
const CLAUDE_INTERFACE_CONCEPT = /\bclaude\b(?:[\s\p{P}]+(?:[\p{L}\p{N}_+-]+[\s\p{P}]+){0,3})?(?:code|cli|desktop|command(?:[\s\p{P}]+line)(?:[\s\p{P}]+interface)?)\b/iu;
const CLAUDE_CONFIG_PATHS = [
  /(?:^|[\\/])(?:\.claude|\.config[\\/]+claude|AppData[\\/]+Roaming[\\/]+Claude|Library[\\/]+Application Support[\\/]+Claude)(?:[\\/]|$)/i,
  /(?:\$(?:\{)?(?:env:)?XDG_CONFIG_HOME(?:\})?|%XDG_CONFIG_HOME%)[\\/]+claude(?:[\\/]|$)/i,
];

function walkFiles(directory) {
  if (!existsSync(directory)) return { files: [], symlinks: [] };
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .reduce((result, entry) => {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) result.symlinks.push(path);
      else if (entry.isDirectory()) {
        const nested = walkFiles(path);
        result.files.push(...nested.files);
        result.symlinks.push(...nested.symlinks);
      } else if (entry.isFile()) result.files.push(path);
      return result;
    }, { files: [], symlinks: [] });
}

function rootConfigurationFiles(root) {
  return readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isFile()) return CONFIGURATION_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
      if (!entry.isDirectory() || !ROOT_CONFIGURATION_DIRECTORIES.has(entry.name)) return [];
      return walkFiles(path).files.filter((file) => CONFIGURATION_EXTENSIONS.has(extname(file)));
    });
}

function isProviderAdapter(path, text) {
  if (!ADAPTER_TEXT_EXTENSIONS.has(extname(path).toLowerCase())) return false;
  const leadingFrontmatter = text.replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return leadingFrontmatter?.[1].split(/\r?\n/).some((line) => /^portability:\s*provider-adapter\s*$/.test(line)) ?? false;
}

function textContains(pattern, text) {
  return pattern.test(text);
}

function hasClaudeConfigPath(text) {
  return CLAUDE_CONFIG_PATHS.some((pattern) => textContains(pattern, text));
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

  const skillFiles = walkFiles(join(root, "skills"));
  for (const path of skillFiles.symlinks) add(path, "symbolic links are not allowed in canonical skills");

  for (const path of skillFiles.files) {
    const text = readFileSync(path, "utf8");
    if (isProviderAdapter(path, text)) continue;
    if (textContains(/\bcompanion\b/i, text)) add(path, "Companion dependency is not portable");
    if (textContains(ANTHROPIC_CONCEPT, text) || textContains(/@anthropic-ai\/sdk\b|\bANTHROPIC_[A-Z0-9_]+\b|\bapi\.anthropic\.com\b/i, text)) {
      add(path, "Anthropic API instruction is not portable");
    }
    if (textContains(CLAUDE_INTERFACE_CONCEPT, text) || textContains(/\b(?:CLAUDE_[A-Z0-9_]+|claude-obsidian)\b/i, text) || hasClaudeConfigPath(text)) {
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
