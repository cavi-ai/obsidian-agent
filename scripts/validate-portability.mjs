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
// Portability scanning is intentionally limited to the repository's JSON manifests.
// Host-owned YAML/TOML configuration belongs under a declared providers/<host> root.
const CONFIGURATION_EXTENSIONS = new Set([".json"]);
const SUPPORTED_PROVIDERS = new Set(["agentskills", "claude", "codex", "gemini", "opencode"]);
const PROVIDER_PATH_FIELDS = ["artifact", "source"];

function inspectPathEntry(path) {
  try {
    lstatSync(path);
    return { exists: true };
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, reason: "missing" };
    if (error?.code === "ENOTDIR" || error?.code === "ELOOP") {
      return { exists: false, reason: "unresolvable" };
    }
    throw error;
  }
}

function pathEntryExists(path) {
  return inspectPathEntry(path).exists;
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

function containsMcpServers(path) {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  try {
    return objectContainsKey(JSON.parse(text), "mcpServers");
  } catch {
    return false;
  }
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
        if (error?.code === "ENOTDIR" || error?.code === "ELOOP") {
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
      const manifestEntry = inspectPathEntry(absolutePath);
      if (!manifestEntry.exists) {
        const message = manifestEntry.reason === "unresolvable" ? "path is unresolvable" : "path does not exist";
        add(join(root, "plugin.json"), `provider "${provider}" ${field} ${message}: ${manifestPath}`);
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
