#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_CONFIGURATION_DIRECTORIES = new Set([".claude-plugin", ".github"]);
const CONFIGURATION_EXTENSIONS = new Set([".json", ".toml", ".yaml", ".yml"]);
const ADAPTER_TEXT_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);
const GRAMMAR_SEPARATOR = String.raw`(?:[\s,;:()/]|[-–—])+`;
const GRAMMAR_WORD = String.raw`[\p{L}\p{N}][\p{L}\p{N}.+#'’_-]*`;
const PRODUCT_QUALIFIER = String.raw`(?!(?:a|an|and|or|the|of|for|from|by|with|without|into|in|on|at|to|its|this|that|which|is|was|principles?)\b)${GRAMMAR_WORD}`;
const BOUNDED_PRODUCT_QUALIFIERS = String.raw`(?:(?:${PRODUCT_QUALIFIER})${GRAMMAR_SEPARATOR}){0,5}`;
const SAFE_PRODUCT_MODIFIER = String.raw`(?:official|latest|newest|current|recommended|first${GRAMMAR_SEPARATOR}party|maintained|supported|stable|preview|beta|async|asynchronous|sync|synchronous|native|public|C(?:\+\+|#)|\.NET|Go|Java|JavaScript|JS|Kotlin|PHP|Python|Ruby|Rust|Swift|TypeScript|TS)`;
const ANTHROPIC_PROVIDER = String.raw`Anthropic(?!${GRAMMAR_SEPARATOR}principles?\b)`;
const ANTHROPIC_PRODUCT = String.raw`(?:API(?:${GRAMMAR_SEPARATOR}client)?|SDK(?:${GRAMMAR_SEPARATOR}client)?|software${GRAMMAR_SEPARATOR}development${GRAMMAR_SEPARATOR}kit|client(?:${GRAMMAR_SEPARATOR}(?:library|SDK))?)`;
const ANTHROPIC_PRODUCT_REFERENCE = String.raw`(?:${SAFE_PRODUCT_MODIFIER}${GRAMMAR_SEPARATOR})*${ANTHROPIC_PRODUCT}`;
const QUALIFIED_ANTHROPIC_PRODUCT = String.raw`${BOUNDED_PRODUCT_QUALIFIERS}${ANTHROPIC_PRODUCT}`;
const ANTHROPIC_OWNERSHIP_VERB = String.raw`(?:maintained|developed|made|owned|provided|published|released|supported)`;
const ANTHROPIC_PRODUCT_GRAMMARS = [
  new RegExp(String.raw`\b${ANTHROPIC_PROVIDER}['’]s${GRAMMAR_SEPARATOR}${QUALIFIED_ANTHROPIC_PRODUCT}\b`, "iu"),
  new RegExp(String.raw`\b${ANTHROPIC_PROVIDER}${GRAMMAR_SEPARATOR}${ANTHROPIC_PRODUCT_REFERENCE}\b`, "iu"),
  new RegExp(String.raw`\b${QUALIFIED_ANTHROPIC_PRODUCT}${GRAMMAR_SEPARATOR}(?:(?:is|was|officially)${GRAMMAR_SEPARATOR})*${ANTHROPIC_OWNERSHIP_VERB}${GRAMMAR_SEPARATOR}by${GRAMMAR_SEPARATOR}${ANTHROPIC_PROVIDER}\b`, "iu"),
  new RegExp(String.raw`\b${QUALIFIED_ANTHROPIC_PRODUCT}${GRAMMAR_SEPARATOR}(?:from|by)${GRAMMAR_SEPARATOR}${ANTHROPIC_PROVIDER}\b`, "iu"),
  new RegExp(String.raw`\b${ANTHROPIC_PROVIDER}${GRAMMAR_SEPARATOR}(?:maintains|develops|makes|owns|provides|publishes|releases|supports)${GRAMMAR_SEPARATOR}(?:(?:an?|the|its|this)${GRAMMAR_SEPARATOR})?${QUALIFIED_ANTHROPIC_PRODUCT}\b`, "iu"),
  new RegExp(String.raw`\b${QUALIFIED_ANTHROPIC_PRODUCT}${GRAMMAR_SEPARATOR}(?:that|which)${GRAMMAR_SEPARATOR}${ANTHROPIC_PROVIDER}${GRAMMAR_SEPARATOR}(?:maintains|develops|makes|owns|provides|publishes|releases|supports)\b`, "iu"),
];
const ANTHROPIC_PACKAGE_INDICATORS = [
  /@anthropic-ai\/sdk\b/i,
  /\b(?:python\s+-m\s+)?pip3?\s+install(?:\s+--?[\w-]+(?:=\S+)?)*\s+anthropic\b/i,
  /\b(?:poetry|uv)\s+add(?:\s+--?[\w-]+(?:=\S+)?)*\s+anthropic\b/i,
  /\brequire\s*\(\s*["']anthropic["']\s*\)/i,
];
const ANTHROPIC_UNAMBIGUOUS_INDICATORS = [
  /\bANTHROPIC_[A-Z0-9_]+\b/i,
  /\bapi\.anthropic\.com\b/i,
];
const CLAUDE_INTERFACE = String.raw`(?:Code|CLI|Desktop|command${GRAMMAR_SEPARATOR}line(?:${GRAMMAR_SEPARATOR}interface)?)`;
const QUALIFIED_CLAUDE_INTERFACE = String.raw`${BOUNDED_PRODUCT_QUALIFIERS}${CLAUDE_INTERFACE}`;
const CLAUDE_INTERFACE_GRAMMARS = [
  new RegExp(String.raw`\bClaude['’]s${GRAMMAR_SEPARATOR}${QUALIFIED_CLAUDE_INTERFACE}\b`, "iu"),
  new RegExp(String.raw`\bClaude${GRAMMAR_SEPARATOR}(?:${SAFE_PRODUCT_MODIFIER}${GRAMMAR_SEPARATOR})*${CLAUDE_INTERFACE}\b`, "iu"),
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
const SHELL_FENCE_LANGUAGES = new Set([
  "bat", "batch", "bash", "cmd", "console", "fish", "powershell", "pwsh", "sh", "shell", "terminal", "zsh",
]);
const PYTHON_FENCE_LANGUAGES = new Set(["py", "python", "python3"]);
const PYTHON_IDENTIFIER = String.raw`[A-Za-z_]\w*`;
const PYTHON_IMPORT_BINDING = String.raw`${PYTHON_IDENTIFIER}(?:\s+as\s+${PYTHON_IDENTIFIER})?`;
const PYTHON_IMPORT_BINDINGS = String.raw`${PYTHON_IMPORT_BINDING}(?:\s*,\s*${PYTHON_IMPORT_BINDING})*`;
const PYTHON_PARENTHESIZED_IMPORT_BINDINGS = String.raw`${PYTHON_IMPORT_BINDINGS}\s*,?`;
const PYTHON_FROM_ANTHROPIC_IMPORT = new RegExp(
  String.raw`^from\s+anthropic(?:\.${PYTHON_IDENTIFIER})*\s+import\s+(?:\*|${PYTHON_IMPORT_BINDINGS}|\(\s*${PYTHON_PARENTHESIZED_IMPORT_BINDINGS}\s*\))$`,
);
const PYTHON_MODULE_BINDING = new RegExp(String.raw`^${PYTHON_IDENTIFIER}(?:\.${PYTHON_IDENTIFIER})*(?:\s+as\s+${PYTHON_IDENTIFIER})?$`);
const ANTHROPIC_MODULE_BINDING = new RegExp(String.raw`^anthropic(?:\.${PYTHON_IDENTIFIER})*(?:\s+as\s+${PYTHON_IDENTIFIER})?$`);

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

function normalizedFenceLanguage(info) {
  const token = info.trim().split(/\s+/, 1)[0] ?? "";
  return token.replace(/^\{?\.?/, "").replace(/\}?$/, "").toLowerCase();
}

function parseFenceMarker(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/);
  if (!match) return null;
  return { character: match[1][0], length: match[1].length, info: match[2] };
}

function markdownCodeContexts(text) {
  const contexts = { outsideLines: [], inlineCode: [], pythonBlocks: [], shellBlocks: [] };
  let fence = null;

  for (const line of text.split(/\r?\n/)) {
    const marker = parseFenceMarker(line);
    if (fence) {
      if (marker && marker.character === fence.character && marker.length >= fence.length && marker.info.trim() === "") {
        fence = null;
      } else {
        fence.lines.push(line);
      }
      continue;
    }

    if (marker) {
      const language = normalizedFenceLanguage(marker.info);
      const lines = [];
      if (SHELL_FENCE_LANGUAGES.has(language)) contexts.shellBlocks.push(lines);
      if (PYTHON_FENCE_LANGUAGES.has(language)) contexts.pythonBlocks.push(lines);
      fence = { ...marker, lines };
      continue;
    }

    contexts.outsideLines.push(line);
    const inlinePattern = /(`+)([^`\r\n]*?)\1/g;
    for (const match of line.matchAll(inlinePattern)) {
      contexts.inlineCode.push({ code: match[2], prefix: line.slice(0, match.index) });
    }
  }

  return contexts;
}

function isAnthropicPythonImport(code) {
  const statement = code.trim().split(";", 1)[0].replace(/\s+#.*$/, "").trim();
  if (PYTHON_FROM_ANTHROPIC_IMPORT.test(statement)) return true;

  const importMatch = statement.match(/^import\s+(.+)$/);
  if (!importMatch) return false;
  const modules = importMatch[1].split(",").map((module) => module.trim());
  return modules.length > 0
    && modules.every((module) => PYTHON_MODULE_BINDING.test(module))
    && modules.some((module) => ANTHROPIC_MODULE_BINDING.test(module));
}

function hasAnthropicPythonImport(contexts) {
  return contexts.outsideLines.some(isAnthropicPythonImport)
    || contexts.inlineCode.some(({ code }) => isAnthropicPythonImport(code))
    || contexts.pythonBlocks.some((lines) => lines.some(isAnthropicPythonImport));
}

function splitShellCommandSegments(line) {
  const segments = [];
  let segment = "";
  let quote = null;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      segment += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      segment += character;
      escaped = true;
      continue;
    }
    if (quote) {
      segment += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      segment += character;
      continue;
    }
    if (character === "#" && (index === 0 || /\s/.test(line[index - 1]))) break;
    if (character === ";" || character === "|" || character === "&") {
      segments.push(segment);
      segment = "";
      if (line[index + 1] === character) index += 1;
      continue;
    }
    segment += character;
  }

  segments.push(segment);
  return segments;
}

function shellSegmentInvokesClaude(segment) {
  let command = segment.trim().replace(/^[({]\s*/, "");
  let previous;
  do {
    previous = command;
    command = command
      .replace(/^[A-Za-z_]\w*=(?:"(?:[^"\\]|\\.)*"|'[^']*'|\S+)\s+/, "")
      .replace(/^(?:command|exec|nohup)\s+/, "")
      .replace(/^env(?:\s+--?[\w-]+(?:=\S+)?)?\s+/, "")
      .replace(/^sudo(?:\s+--?[\w-]+(?:=\S+)?)?\s+/, "");
  } while (command !== previous);
  return /^claude(?:\.exe)?(?=$|\s)/i.test(command);
}

function heredocDeclarations(line) {
  const declarations = [];
  const pattern = /<<(-)?\s*(?:(['"])([^'"\r\n]+)\2|([A-Za-z_][\w-]*))/g;
  for (const match of line.matchAll(pattern)) {
    declarations.push({ delimiter: match[3] ?? match[4], stripTabs: Boolean(match[1]) });
  }
  return declarations;
}

function shellBlockInvokesClaude(lines) {
  const heredocs = [];
  for (const originalLine of lines) {
    if (heredocs.length) {
      const { delimiter, stripTabs } = heredocs[0];
      const line = stripTabs ? originalLine.replace(/^\t+/, "") : originalLine;
      if (line.trimEnd() === delimiter) heredocs.shift();
      continue;
    }

    const line = originalLine.replace(/^\s*(?:\$\s+|>\s+|PS(?:\s+[^>]*)?>\s+)/i, "");
    if (splitShellCommandSegments(line).some(shellSegmentInvokesClaude)) return true;
    heredocs.push(...heredocDeclarations(line));
  }
  return false;
}

function proseLineInvokesClaude(line) {
  if (/^\s*(?:\$|>|PS>)\s*claude(?:\.exe)?(?:\s|$)/.test(line)) return true;
  if (/^\s*claude(?:\.exe)?(?:\s+(?:--?[a-z0-9][\w-]*|auth\b|config\b|doctor\b|help\b|mcp\b|plugin\b|update\b|version\b|["']).*)?\s*$/.test(line)) return true;
  return /\b(?:Run|run|Execute|execute|Invoke|invoke|Launch|launch|Start|start|Type|type|Enter|enter)\s+(?:(?:a|the|this)\s+)?(?:(?:command|executable|CLI)\s+)?claude(?:\.exe)?(?=\s*(?:[.,;:]|$)|\s+(?:--?[a-z0-9][\w-]*|auth\b|config\b|doctor\b|help\b|mcp\b|plugin\b|update\b|version\b|["']))/u.test(line);
}

function hasClaudeProseCommand(contexts) {
  return contexts.outsideLines.some(proseLineInvokesClaude);
}

function hasClaudeInlineCommand(contexts) {
  return contexts.inlineCode.some(({ code, prefix }) => {
    if (!/^claude(?:\.exe)?(?:\s+[^\r\n]+)?$/i.test(code.trim())) return false;
    return /\b(?:run|execute|invoke|launch|start|use|type|enter)\s+(?:(?:a|the|this)\s+)?(?:(?:command|executable|cli)\s+)?$/iu.test(prefix);
  });
}

function hasClaudeShellCommand(contexts) {
  return contexts.shellBlocks.some(shellBlockInvokesClaude);
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
    const codeContexts = markdownCodeContexts(text);
    if (textContains(/\bcompanion\b/i, text)) add(path, "Companion dependency is not portable");
    if (textContainsAny(ANTHROPIC_PRODUCT_GRAMMARS, text)
      || textContainsAny(ANTHROPIC_PACKAGE_INDICATORS, text)
      || textContainsAny(ANTHROPIC_UNAMBIGUOUS_INDICATORS, text)
      || hasAnthropicPythonImport(codeContexts)) {
      add(path, "Anthropic API instruction is not portable");
    }
    if (textContainsAny(CLAUDE_INTERFACE_GRAMMARS, text)
      || textContainsAny(CLAUDE_UNAMBIGUOUS_INDICATORS, text)
      || hasClaudeInlineCommand(codeContexts)
      || hasClaudeProseCommand(codeContexts)
      || hasClaudeShellCommand(codeContexts)
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
