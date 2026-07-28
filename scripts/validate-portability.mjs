#!/usr/bin/env node
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_CONFIGURATION_DIRECTORIES = new Set([".claude-plugin", ".github"]);
const CONFIGURATION_EXTENSIONS = new Set([".json", ".toml", ".yaml", ".yml"]);
const SUPPORTED_PROVIDERS = new Set(["agentskills", "claude", "codex", "gemini", "opencode"]);
const PROVIDER_PATH_FIELDS = ["artifact", "source"];

function pathEntryExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return false;
    throw error;
  }
}

function walkFiles(directory) {
  if (!existsSync(directory)) return { files: [], symlinks: [] };
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
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

function rootConfigurationEntries(root) {
  return readdirSync(root, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .reduce((result, entry) => {
      const path = join(root, entry.name);
      if (entry.isFile()) {
        if (entry.name !== ".mcp.json" && CONFIGURATION_EXTENSIONS.has(extname(entry.name))) result.files.push(path);
      } else if (entry.isSymbolicLink()) {
        if (entry.name !== ".mcp.json" && entry.name !== "plugin.json"
          && (CONFIGURATION_EXTENSIONS.has(extname(entry.name)) || ROOT_CONFIGURATION_DIRECTORIES.has(entry.name))) {
          result.symlinks.push(path);
        }
      } else if (entry.isDirectory() && ROOT_CONFIGURATION_DIRECTORIES.has(entry.name)) {
        const nested = walkFiles(path);
        result.files.push(...nested.files.filter((file) => CONFIGURATION_EXTENSIONS.has(extname(file))));
        result.symlinks.push(...nested.symlinks);
      }
      return result;
    }, { files: [], symlinks: [] });
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function objectContainsKey(value, key) {
  if (Array.isArray(value)) return value.some((item) => objectContainsKey(item, key));
  if (!isPlainObject(value)) return false;
  return Object.hasOwn(value, key)
    || Object.values(value).some((item) => objectContainsKey(item, key));
}

function yamlContainsKey(text, target) {
  let blockScalarIndent = null;
  let quote = null;

  for (const line of text.split(/\r?\n/)) {
    const indentation = line.match(/^ */)[0].length;
    if (blockScalarIndent !== null) {
      if (!line.trim() || indentation > blockScalarIndent) continue;
      blockScalarIndent = null;
    }

    const startsWithTargetKey = (start) => {
      const source = line.slice(start);
      return new RegExp(`^(?:"${target}"|'${target}'|${target})\\s*:`).test(source);
    };

    if (!quote) {
      let keyStart = indentation;
      while (/[-?]/.test(line[keyStart] ?? "") && /\s/.test(line[keyStart + 1] ?? "")) {
        keyStart += 1;
        while (/\s/.test(line[keyStart] ?? "")) keyStart += 1;
      }
      if (startsWithTargetKey(keyStart)) return true;
    }

    let significant = "";
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (quote === "double") {
        significant += " ";
        if (character === "\\") {
          significant += " ";
          index += 1;
        } else if (character === '"') quote = null;
        continue;
      }
      if (quote === "single") {
        significant += " ";
        if (character === "'" && line[index + 1] === "'") {
          significant += " ";
          index += 1;
        } else if (character === "'") quote = null;
        continue;
      }
      if (character === "#" && (index === 0 || /\s|[{},\[\]]/.test(line[index - 1]))) break;
      if (character === '"') {
        quote = "double";
        significant += " ";
        continue;
      }
      if (character === "'") {
        quote = "single";
        significant += " ";
        continue;
      }
      if ((character === "{" || character === ",") && startsWithTargetKey(index + 1 + (line.slice(index + 1).match(/^\s*/)?.[0].length ?? 0))) {
        return true;
      }
      significant += character;
    }

    if (!quote && (/^\s*(?:-\s*)?[>|](?:(?:[+-][1-9]?)|(?:[1-9][+-]?))?\s*$/.test(significant)
      || /:\s*[>|](?:(?:[+-][1-9]?)|(?:[1-9][+-]?))?\s*$/.test(significant))) {
      blockScalarIndent = indentation;
    }
  }
  return false;
}

function parseTomlKeySegment(text, start) {
  if (text[start] === '"' || text[start] === "'") {
    const delimiter = text[start];
    let value = "";
    for (let index = start + 1; index < text.length; index += 1) {
      if (delimiter === '"' && text[index] === "\\" && index + 1 < text.length) {
        value += text[index + 1];
        index += 1;
      } else if (text[index] === delimiter) {
        return { value, end: index + 1 };
      } else if (text[index] === "\n") {
        return null;
      } else {
        value += text[index];
      }
    }
    return null;
  }

  const match = text.slice(start).match(/^[A-Za-z0-9_-]+/);
  return match ? { value: match[0], end: start + match[0].length } : null;
}

function parseTomlKeyPath(text, start, terminator) {
  const segments = [];
  let index = start;
  while (index < text.length) {
    while (/[ \t]/.test(text[index] ?? "")) index += 1;
    const segment = parseTomlKeySegment(text, index);
    if (!segment) return null;
    segments.push(segment.value);
    index = segment.end;
    while (/[ \t]/.test(text[index] ?? "")) index += 1;
    if (text[index] === ".") {
      index += 1;
      continue;
    }
    if (text.startsWith(terminator, index)) return { segments, end: index + terminator.length };
    return null;
  }
  return null;
}

function skipTomlString(text, start) {
  const delimiter = text.startsWith('"""', start) ? '"""'
    : text.startsWith("'''", start) ? "'''"
      : text[start];
  let index = start + delimiter.length;
  while (index < text.length) {
    if ((delimiter === '"' || delimiter === '"""') && text[index] === "\\") {
      index += 2;
      continue;
    }
    if (text.startsWith(delimiter, index)) return index + delimiter.length;
    if (delimiter.length === 1 && text[index] === "\n") return index;
    index += 1;
  }
  return text.length;
}

function tomlContainsKey(text, target) {
  let index = 0;
  let candidate = true;
  let inlineTableDepth = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === "\n") {
      candidate = true;
      index += 1;
      continue;
    }
    if (/[ \t\r]/.test(character)) {
      index += 1;
      continue;
    }
    if (character === "#") {
      index = text.indexOf("\n", index);
      if (index === -1) return false;
      continue;
    }

    if (candidate && character === "[") {
      const arrayTable = text[index + 1] === "[";
      const header = parseTomlKeyPath(text, index + (arrayTable ? 2 : 1), arrayTable ? "]]" : "]");
      if (header?.segments.includes(target)) return true;
      candidate = false;
    } else if (candidate) {
      const assignment = parseTomlKeyPath(text, index, "=");
      if (assignment) {
        if (assignment.segments.includes(target)) return true;
        index = assignment.end;
        candidate = false;
        continue;
      }
      candidate = false;
    }

    if (character === '"' || character === "'") {
      index = skipTomlString(text, index);
      continue;
    }
    if (character === "{") {
      inlineTableDepth += 1;
      candidate = true;
    } else if (character === "}") {
      inlineTableDepth = Math.max(0, inlineTableDepth - 1);
      candidate = false;
    } else if (character === "," && inlineTableDepth > 0) {
      candidate = true;
    }
    index += 1;
  }
  return false;
}

function containsMcpServers(path) {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  if (extname(path) === ".json") {
    try {
      return objectContainsKey(JSON.parse(text), "mcpServers");
    } catch {
      return false;
    }
  }
  if (extname(path) === ".toml") {
    return tomlContainsKey(text, "mcpServers");
  }
  return yamlContainsKey(text, "mcpServers");
}

function isContainedBy(parent, child) {
  const pathFromParent = relative(parent, child);
  return pathFromParent === ""
    || (pathFromParent !== ".."
      && !pathFromParent.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
      && !isAbsolute(pathFromParent));
}

function providerManifest(root, add) {
  const path = join(root, "plugin.json");
  if (!pathEntryExists(path)) return {};
  if (!lstatSync(path).isFile() || !isContainedBy(realpathSync(root), realpathSync(path))) {
    add(path, "provider manifest must be a real repository file");
    return {};
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    add(path, "provider manifest must contain valid JSON");
    return {};
  }

  if (!isPlainObject(manifest)) {
    add(path, "provider manifest must be an object");
    return {};
  }
  if (!("providers" in manifest)) return {};
  if (!isPlainObject(manifest.providers)) {
    add(path, "providers must be an object");
    return {};
  }
  return manifest.providers;
}

function validateProviderDirectories(root, providers, add) {
  const providersRoot = join(root, "providers");
  if (pathEntryExists(providersRoot)) {
    if (!lstatSync(providersRoot).isDirectory()
      || !isContainedBy(realpathSync(root), realpathSync(providersRoot))) {
      add(providersRoot, "provider root must be a real directory inside the repository");
      return;
    }
    for (const entry of readdirSync(providersRoot, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const path = join(providersRoot, entry.name);
      if (!entry.isDirectory()) {
        add(path, "provider files must be inside a declared provider directory");
      } else if (!Object.hasOwn(providers, entry.name)) {
        add(path, "provider directory is not declared in plugin.json");
      }
    }
  }

  for (const provider of Object.keys(providers).sort()) {
    const declaration = providers[provider];
    if (!SUPPORTED_PROVIDERS.has(provider)) {
      add(join(root, "plugin.json"), `provider "${provider}" is unsupported`);
      continue;
    }

    const providerRoot = join(providersRoot, provider);
    if (!pathEntryExists(providerRoot) || !lstatSync(providerRoot).isDirectory()) {
      add(providerRoot, "declared provider directory does not exist");
      continue;
    }
    if (!isPlainObject(declaration)) {
      add(join(root, "plugin.json"), `provider "${provider}" declaration must be an object`);
      continue;
    }

    const providerSymlinks = walkFiles(providerRoot).symlinks;
    for (const path of providerSymlinks) {
      let target;
      try {
        target = realpathSync(path);
      } catch (error) {
        if (error?.code === "ENOENT") {
          add(path, "dangling symbolic links are not allowed in provider adapters");
          continue;
        }
        if (error?.code === "ELOOP") {
          add(path, "unresolvable symbolic links are not allowed in provider adapters");
          continue;
        }
        throw error;
      }
      if (!isContainedBy(realpathSync(root), target)
        || !isContainedBy(realpathSync(providerRoot), target)) {
        add(path, "symbolic link resolves outside its declared provider root");
      }
    }

    for (const field of PROVIDER_PATH_FIELDS) {
      if (!(field in declaration)) continue;
      const manifestPath = declaration[field];
      if (typeof manifestPath !== "string") {
        add(join(root, "plugin.json"), `provider "${provider}" ${field} path must be a string`);
        continue;
      }

      const absolutePath = resolve(root, manifestPath);
      if (!isContainedBy(providerRoot, absolutePath)) {
        add(join(root, "plugin.json"), `provider "${provider}" ${field} path must stay inside providers/${provider}: ${manifestPath}`);
        continue;
      }
      if (!pathEntryExists(absolutePath)) {
        add(join(root, "plugin.json"), `provider "${provider}" ${field} path does not exist: ${manifestPath}`);
        continue;
      }
      if (providerSymlinks.some((path) => isContainedBy(path, absolutePath))) continue;
      if (!isContainedBy(realpathSync(providerRoot), realpathSync(absolutePath))) {
        add(join(root, "plugin.json"), `provider "${provider}" ${field} path resolves outside providers/${provider}: ${manifestPath}`);
      }
    }
  }
}

export function validatePortability(root) {
  const errors = [];
  const add = (path, message) => {
    const repositoryPath = relative(root, path).split(/[/\\]/).join("/");
    errors.push(`${repositoryPath}: ${message}`);
  };

  const mcpConfiguration = join(root, ".mcp.json");
  if (pathEntryExists(mcpConfiguration)) add(mcpConfiguration, "MCP configuration is not portable");

  const rootConfiguration = rootConfigurationEntries(root);
  for (const path of rootConfiguration.symlinks) {
    add(path, "root configuration symbolic links are not allowed");
  }
  for (const path of rootConfiguration.files) {
    if (containsMcpServers(path)) add(path, "mcpServers is not portable");
  }

  const skillsRoot = join(root, "skills");
  let skillFiles = { files: [], symlinks: [] };
  if (pathEntryExists(skillsRoot)) {
    if (!lstatSync(skillsRoot).isDirectory()
      || !isContainedBy(realpathSync(root), realpathSync(skillsRoot))) {
      add(skillsRoot, "canonical skills root must be a real directory inside the repository");
    } else {
      skillFiles = walkFiles(skillsRoot);
    }
  }
  for (const path of skillFiles.symlinks) add(path, "symbolic links are not allowed in canonical skills");
  if (skillFiles.files.length || skillFiles.symlinks.length) {
    const cliHelper = join(root, "scripts", "obsidian-cli.mjs");
    if (!pathEntryExists(cliHelper)) {
      add(cliHelper, "official Obsidian CLI helper is required by canonical skills");
    } else if (!lstatSync(cliHelper).isFile()
      || !isContainedBy(realpathSync(root), realpathSync(cliHelper))) {
      add(cliHelper, "official Obsidian CLI helper must be a real repository file");
    }
  }

  validateProviderDirectories(root, providerManifest(root, add), add);
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
  console.log("✓ portable core respects structural provider boundaries");
}
