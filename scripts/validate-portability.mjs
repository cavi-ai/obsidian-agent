#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_CONFIGURATION_DIRECTORIES = new Set([".claude-plugin", ".github"]);
const CONFIGURATION_EXTENSIONS = new Set([".json", ".toml", ".yaml", ".yml"]);
const ADAPTER_TEXT_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);
const GRAMMAR_SEPARATOR = String.raw`(?:[\s,;:()/]|[-–—])+`;
const ANTHROPIC_PROVIDER = String.raw`Anthropic(?!${GRAMMAR_SEPARATOR}principle\b)`;
const ANTHROPIC_PRODUCT = String.raw`(?:API(?:${GRAMMAR_SEPARATOR}client)?|SDK(?:${GRAMMAR_SEPARATOR}client)?|software${GRAMMAR_SEPARATOR}development${GRAMMAR_SEPARATOR}kit|client(?:${GRAMMAR_SEPARATOR}(?:library|SDK))?)`;
const ANTHROPIC_PRODUCT_MODIFIER = String.raw`(?:official|first${GRAMMAR_SEPARATOR}party|maintained|supported|C(?:\+\+|#)|\.NET|Go|Java|JavaScript|JS|Kotlin|PHP|Python|Ruby|Rust|Swift|TypeScript|TS)`;
const ANTHROPIC_PRODUCT_REFERENCE = String.raw`(?:${ANTHROPIC_PRODUCT_MODIFIER}${GRAMMAR_SEPARATOR})*${ANTHROPIC_PRODUCT}`;
const ANTHROPIC_OWNERSHIP_VERB = String.raw`(?:maintained|developed|made|owned|provided|published|released|supported)`;
const ANTHROPIC_PRODUCT_GRAMMARS = [
  new RegExp(String.raw`\b${ANTHROPIC_PROVIDER}(?:['’]s)?${GRAMMAR_SEPARATOR}${ANTHROPIC_PRODUCT_REFERENCE}\b`, "iu"),
  new RegExp(String.raw`\b${ANTHROPIC_PRODUCT_REFERENCE}${GRAMMAR_SEPARATOR}(?:(?:is|was|officially)${GRAMMAR_SEPARATOR})*${ANTHROPIC_OWNERSHIP_VERB}${GRAMMAR_SEPARATOR}by${GRAMMAR_SEPARATOR}${ANTHROPIC_PROVIDER}\b`, "iu"),
  new RegExp(String.raw`\b${ANTHROPIC_PRODUCT_REFERENCE}${GRAMMAR_SEPARATOR}(?:from|by)${GRAMMAR_SEPARATOR}${ANTHROPIC_PROVIDER}\b`, "iu"),
  new RegExp(String.raw`\b${ANTHROPIC_PROVIDER}${GRAMMAR_SEPARATOR}(?:maintains|develops|makes|owns|provides|publishes|releases|supports)${GRAMMAR_SEPARATOR}(?:(?:an?|the|its|this)${GRAMMAR_SEPARATOR})?${ANTHROPIC_PRODUCT_REFERENCE}\b`, "iu"),
  new RegExp(String.raw`\b${ANTHROPIC_PRODUCT_REFERENCE}${GRAMMAR_SEPARATOR}(?:that|which)${GRAMMAR_SEPARATOR}${ANTHROPIC_PROVIDER}${GRAMMAR_SEPARATOR}(?:maintains|develops|makes|owns|provides|publishes|releases|supports)\b`, "iu"),
];
const ANTHROPIC_PACKAGE_INDICATORS = [
  /@anthropic-ai\/sdk\b/i,
  /\b(?:python\s+-m\s+)?pip3?\s+install(?:\s+--?[\w-]+(?:=\S+)?)*\s+anthropic\b/i,
  /\b(?:poetry|uv)\s+add(?:\s+--?[\w-]+(?:=\S+)?)*\s+anthropic\b/i,
  /\b(?:from\s+anthropic(?:\.[A-Za-z_][\w.]*)?\s+import|import\s+anthropic(?:\s+as\s+[A-Za-z_]\w*)?)(?!\s+\p{L})/iu,
  /\brequire\s*\(\s*["']anthropic["']\s*\)/i,
];
const ANTHROPIC_UNAMBIGUOUS_INDICATORS = [
  /\bANTHROPIC_[A-Z0-9_]+\b/i,
  /\bapi\.anthropic\.com\b/i,
];
const CLAUDE_INTERFACE_GRAMMARS = [
  new RegExp(String.raw`\bClaude(?:['’]s)?${GRAMMAR_SEPARATOR}(?:Code|CLI|Desktop)\b`, "iu"),
  new RegExp(String.raw`\bClaude(?:['’]s)?${GRAMMAR_SEPARATOR}command${GRAMMAR_SEPARATOR}line(?:${GRAMMAR_SEPARATOR}interface)?\b`, "iu"),
];
const CLAUDE_COMMAND_INDICATORS = [
  /\bclaude(?:\.exe)?\s+--?[a-z0-9][\w-]*\b/i,
  /\bclaude(?:\.exe)?\s+(?:auth|config|doctor|help|mcp|plugin|update|version)\b/i,
  /(?:^|\r?\n)\s*(?:\$|>|PS>)\s*claude(?:\.exe)?(?:\s|$)/im,
  /`claude(?:\.exe)?(?:\s+[^`\r\n]+)?`/i,
];
const CLAUDE_UNAMBIGUOUS_INDICATORS = [
  /@anthropic-ai\/claude-code\b/i,
  /\b(?:CLAUDE_[A-Z0-9_]+|claude-obsidian)\b/i,
];
const CLAUDE_CONFIG_PATHS = [
  /(?:^|[\\/\s"'`(=])\.claude(?:\.json)?(?=$|[\\/\s"'`),.;:\]}])/i,
  /(?:^|[\\/\s"'`(=])\.config[\\/]+claude(?:-code)?(?=$|[\\/\s"'`),.;:\]}])/i,
  /(?:\$(?:\{)?(?:env:)?XDG_CONFIG_HOME(?:\})?|%XDG_CONFIG_HOME%)[\\/]+claude(?:-code)?(?=$|[\\/\s"'`),.;:\]}])/i,
  /(?:^|[\\/])AppData[\\/]+Roaming[\\/]+Claude(?=$|[\\/\s"'`),.;:\]}])/i,
  /(?:^|[\\/])Library[\\/]+Application Support[\\/]+Claude(?=$|[\\/\s"'`),.;:\]}])/i,
  /(?:\$(?:\{)?(?:env:)?APPDATA(?:\})?|%APPDATA%)[\\/]+Claude(?=$|[\\/\s"'`),.;:\]}])/i,
  /(?:^|[\\/\s"'`(=])claude_desktop_config\.json(?=$|[\s"'`),.;:\]}])/i,
  /(?:^|[\\/\s"'`(=])CLAUDE\.md(?=$|[\s"'`),.;:\]}])/,
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

function textContainsAny(patterns, text) {
  return patterns.some((pattern) => textContains(pattern, text));
}

function hasClaudeConfigPath(text) {
  return textContainsAny(CLAUDE_CONFIG_PATHS, text);
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
    if (textContainsAny(ANTHROPIC_PRODUCT_GRAMMARS, text)
      || textContainsAny(ANTHROPIC_PACKAGE_INDICATORS, text)
      || textContainsAny(ANTHROPIC_UNAMBIGUOUS_INDICATORS, text)) {
      add(path, "Anthropic API instruction is not portable");
    }
    if (textContainsAny(CLAUDE_INTERFACE_GRAMMARS, text)
      || textContainsAny(CLAUDE_COMMAND_INDICATORS, text)
      || textContainsAny(CLAUDE_UNAMBIGUOUS_INDICATORS, text)
      || hasClaudeConfigPath(text)) {
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
