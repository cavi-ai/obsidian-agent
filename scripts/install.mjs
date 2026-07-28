#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HOSTS = ["claude", "codex", "gemini", "opencode", "agentskills"];
const SCOPES = ["user", "project"];
const OWNERSHIP_FILE = ".obsidian-agent-install.json";

const USER_ROOTS = {
  claude: [".claude", "plugins", "obsidian-agent"],
  codex: ["plugins", "obsidian-agent"],
  gemini: [".gemini"],
  opencode: [".config", "opencode"],
  agentskills: [".agents"],
};

const PROJECT_ROOTS = {
  claude: [".claude", "plugins", "obsidian-agent"],
  codex: ["plugins", "obsidian-agent"],
  gemini: [".gemini"],
  opencode: [".opencode"],
  agentskills: [".agents"],
};

const HOST_ARTIFACTS = {
  claude: [
    [".claude-plugin/plugin.json", ".claude-plugin/plugin.json"],
    [".claude-plugin/marketplace.json", ".claude-plugin/marketplace.json"],
    ["providers/claude/README.md", "providers/claude/README.md"],
  ],
  codex: [
    [".codex-plugin/plugin.json", ".codex-plugin/plugin.json"],
    ["providers/codex/README.md", "providers/codex/README.md"],
  ],
  gemini: [["providers/gemini/README.md", "obsidian-agent/README.md"]],
  opencode: [["providers/opencode/README.md", "obsidian-agent/README.md"]],
  agentskills: [["providers/agentskills/README.md", "obsidian-agent/README.md"]],
};

function valueAfter(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`);
  return value;
}

export function parseArguments(argv) {
  const result = { dryRun: true };
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (["--host", "--scope", "--project", "--confirm"].includes(option)) {
      result[option.slice(2)] = valueAfter(argv, index, option);
      index += 1;
    } else if (option === "--dry-run") {
      result.dryRun = true;
    } else {
      throw new Error(`Unknown option: ${option}`);
    }
  }
  if (!HOSTS.includes(result.host)) throw new Error(`Unsupported host: ${result.host ?? "(missing)"}`);
  if (!SCOPES.includes(result.scope)) throw new Error("--scope must be user or project");
  if (result.confirm) result.dryRun = false;
  return result;
}

function collectFiles(root, relativeDirectory) {
  const directory = join(root, relativeDirectory);
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = join(relativeDirectory, entry.name);
      return entry.isDirectory() ? collectFiles(root, path) : [path];
    });
}

function portableSkillFiles(root) {
  const registry = JSON.parse(readFileSync(join(root, "capabilities.json"), "utf8"));
  return registry.capabilities
    .filter(({ portable }) => portable)
    .map(({ id }) => `skills/${id}/SKILL.md`)
    .sort();
}

function installRoots(options) {
  const segments = options.scope === "user" ? USER_ROOTS[options.host] : PROJECT_ROOTS[options.host];
  const base = options.scope === "user"
    ? resolve(options.home ?? homedir())
    : resolve(options.project ?? process.cwd());
  return { scopeRoot: base, destinationRoot: join(base, ...segments) };
}

function isWithin(root, candidate) {
  const path = relative(root, candidate);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`));
}

function pathEntryExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return false;
    throw error;
  }
}

export function buildInstallPlan(sourceRoot, options) {
  if (!HOSTS.includes(options.host)) throw new Error(`Unsupported host: ${options.host}`);
  if (!SCOPES.includes(options.scope)) throw new Error("scope must be user or project");
  const source = resolve(sourceRoot);
  const { scopeRoot, destinationRoot: target } = installRoots(options);
  const artifacts = [...HOST_ARTIFACTS[options.host]];
  for (const skillPath of portableSkillFiles(source)) artifacts.push([skillPath, skillPath]);
  if (options.host === "claude") {
    for (const commandPath of collectFiles(source, "commands")) artifacts.push([commandPath, commandPath]);
  }

  const files = artifacts.sort((left, right) => left[1].localeCompare(right[1])).map(([sourcePath, path]) => ({
    source: join(source, sourcePath),
    destination: join(target, path),
    path,
    sha256: createHash("sha256").update(readFileSync(join(source, sourcePath))).digest("hex"),
  }));
  if (!files.every(({ destination }) => isWithin(target, destination))) {
    throw new Error("install plan escapes selected host root");
  }
  return { host: options.host, scope: options.scope, scopeRoot, destinationRoot: target, files };
}

export function hashInstallPlan(plan) {
  const serializable = {
    host: plan.host,
    scope: plan.scope,
    destinationRoot: plan.destinationRoot,
    files: plan.files.map(({ path, sha256 }) => ({ path, sha256 })),
  };
  return createHash("sha256").update(JSON.stringify(serializable)).digest("hex");
}

function ownedPaths(plan) {
  const marker = join(plan.destinationRoot, OWNERSHIP_FILE);
  if (!existsSync(marker)) return new Set();
  const markerEntry = lstatSync(marker);
  if (markerEntry.isSymbolicLink()) throw new Error(`ownership marker must not be a symbolic link: ${marker}`);
  if (!markerEntry.isFile()) throw new Error(`ownership marker must be a regular file: ${marker}`);
  const record = JSON.parse(readFileSync(marker, "utf8"));
  if (record.identity !== "obsidian-agent" || !Array.isArray(record.files)) {
    throw new Error(`invalid ownership record: ${marker}`);
  }
  return new Set(record.files);
}

function assertSafeDestinationTree(plan) {
  const relativeRoot = relative(plan.scopeRoot, plan.destinationRoot);
  let current = plan.scopeRoot;
  for (const segment of relativeRoot.split(sep).filter(Boolean)) {
    current = join(current, segment);
    if (pathEntryExists(current)) {
      const entry = lstatSync(current);
      if (entry.isSymbolicLink()) throw new Error(`destination path traverses a symbolic link: ${current}`);
      if (!entry.isDirectory()) throw new Error(`destination parent must be a directory: ${current}`);
    }
  }
  for (const file of plan.files) {
    let parent = plan.destinationRoot;
    for (const segment of dirname(file.path).split(sep).filter((part) => part && part !== ".")) {
      parent = join(parent, segment);
      if (pathEntryExists(parent)) {
        const entry = lstatSync(parent);
        if (entry.isSymbolicLink()) throw new Error(`destination path traverses a symbolic link: ${parent}`);
        if (!entry.isDirectory()) throw new Error(`destination parent must be a directory: ${parent}`);
      }
    }
    if (pathEntryExists(file.destination)) {
      const entry = lstatSync(file.destination);
      if (entry.isSymbolicLink()) throw new Error(`destination file is a symbolic link: ${file.destination}`);
      if (!entry.isFile()) throw new Error(`destination must be a regular file: ${file.destination}`);
    }
  }
  const marker = join(plan.destinationRoot, OWNERSHIP_FILE);
  if (pathEntryExists(marker)) {
    const entry = lstatSync(marker);
    if (entry.isSymbolicLink()) throw new Error(`ownership marker must not be a symbolic link: ${marker}`);
    if (!entry.isFile()) throw new Error(`ownership marker must be a regular file: ${marker}`);
  }
}

export function executeInstallPlan(plan, { confirm } = {}) {
  const previewHash = hashInstallPlan(plan);
  if (confirm !== previewHash) throw new Error(`write requires exact preview hash: ${previewHash}`);
  assertSafeDestinationTree(plan);
  const owned = ownedPaths(plan);
  for (const file of plan.files) {
    if (existsSync(file.destination) && !owned.has(file.path)) {
      throw new Error(`refusing to overwrite unowned destination: ${file.destination}`);
    }
  }
  for (const file of plan.files) {
    mkdirSync(dirname(file.destination), { recursive: true });
    copyFileSync(file.source, file.destination);
  }
  const record = {
    identity: "obsidian-agent",
    host: plan.host,
    scope: plan.scope,
    previewHash,
    files: plan.files.map(({ path }) => path),
  };
  writeFileSync(join(plan.destinationRoot, OWNERSHIP_FILE), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

function formatPreview(plan) {
  const hash = hashInstallPlan(plan);
  return [
    `obsidian-agent ${plan.host} ${plan.scope} installation preview`,
    `Destination: ${plan.destinationRoot}`,
    ...plan.files.map(({ path }) => `COPY ${path}`),
    `Preview hash: ${hash}`,
    `Apply by repeating this command with --confirm ${hash}`,
  ].join("\n");
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const plan = buildInstallPlan(sourceRoot, options);
  console.log(formatPreview(plan));
  if (!options.dryRun) {
    executeInstallPlan(plan, options);
    console.log(`Installed ${plan.files.length} files. Run 'node scripts/obsidian-cli.mjs doctor' before use.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
