import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOCUMENTED_VERSION, SOURCE_REL } from "./lib.mjs";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// A release identity for tests: the version comes from plugin.json, never a literal.
const SOURCE_DATE_EPOCH = 1784953886;
export const TEST_RELEASE = Object.freeze({
  version: DOCUMENTED_VERSION,
  tag: `v${DOCUMENTED_VERSION}`,
  commit: "7".repeat(40),
  sourceDateEpoch: SOURCE_DATE_EPOCH,
  generatedAt: new Date(SOURCE_DATE_EPOCH * 1000).toISOString(),
});

/**
 * A build root holding the real docs source, so a build exercises real pages
 * without writing into the tracked tree. Tests run in parallel, so each gets its own.
 */
export async function createDocsSandbox(root = REPO_ROOT) {
  const sandbox = await mkdtemp(path.join(tmpdir(), "obsidian-agent-docs-"));
  const destination = path.join(sandbox, SOURCE_REL);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(root, SOURCE_REL), destination, { recursive: true });
  return {
    root: sandbox,
    [Symbol.asyncDispose]: () => rm(sandbox, { recursive: true, force: true }),
    dispose: () => rm(sandbox, { recursive: true, force: true }),
  };
}
