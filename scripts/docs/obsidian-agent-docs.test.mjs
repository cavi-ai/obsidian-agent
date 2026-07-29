import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildObsidianAgentDocs } from "./build-obsidian-agent.mjs";
import { verifyObsidianAgentDocs } from "./verify-obsidian-agent.mjs";
import { OUTPUT_REL } from "./lib.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RELEASE = Object.freeze({
  version: "0.1.0",
  tag: "v0.1.0",
  commit: "7".repeat(40),
  sourceDateEpoch: 1784953886,
});

test("build is deterministic for unchanged source", async () => {
  const first = await buildObsidianAgentDocs(REPO_ROOT, RELEASE);
  const firstBytes = await readFile(path.join(first.outputRoot, "manifest.json"), "utf8");
  const second = await buildObsidianAgentDocs(REPO_ROOT, RELEASE);
  const secondBytes = await readFile(path.join(second.outputRoot, "manifest.json"), "utf8");
  assert.equal(first.manifest.contentSha256, second.manifest.contentSha256);
  assert.equal(firstBytes, secondBytes);
  assert.equal(first.manifest.schemaVersion, 1);
  assert.deepEqual(first.manifest.release, { tag: RELEASE.tag, commit: RELEASE.commit });
  assert.equal(first.manifest.generatedAt, "2026-07-25T04:31:26.000Z");
  await verifyObsidianAgentDocs(REPO_ROOT, RELEASE);
});

test("build rejects incomplete or inconsistent release identity", async () => {
  await assert.rejects(
    () => buildObsidianAgentDocs(REPO_ROOT, { ...RELEASE, tag: "v0.0.9" }),
    /tag.*version/i,
  );
  await assert.rejects(
    () => buildObsidianAgentDocs(REPO_ROOT, { ...RELEASE, commit: "abc" }),
    /commit/i,
  );
  await assert.rejects(
    () => buildObsidianAgentDocs(REPO_ROOT, { ...RELEASE, sourceDateEpoch: undefined }),
    /source date epoch/i,
  );
});

test("verify fails when a page is tampered", async () => {
  await buildObsidianAgentDocs(REPO_ROOT, RELEASE);
  const page = path.join(
    REPO_ROOT,
    OUTPUT_REL,
    "introduction/overview.md",
  );
  const original = await readFile(page, "utf8");
  await writeFile(page, `${original}\n<!-- tamper -->\n`, "utf8");
  await assert.rejects(() => verifyObsidianAgentDocs(REPO_ROOT, RELEASE), /contentSha256 mismatch/);
  await buildObsidianAgentDocs(REPO_ROOT, RELEASE);
});

test("verify fails when navigation points at a missing page", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "bobby-docs-"));
  try {
    const sourcePages = path.join(fixtureRoot, "docs/obsidian-agent/source/pages/introduction");
    await mkdir(sourcePages, { recursive: true });
    await writeFile(
      path.join(sourcePages, "overview.md"),
      "# Overview\n",
      "utf8",
    );
    await writeFile(
      path.join(fixtureRoot, "docs/obsidian-agent/source/navigation.json"),
      JSON.stringify({
        title: "obsidian-agent",
        version: "0.1.0",
        sections: [
          {
            title: "Introduction",
            pages: [
              { title: "Overview", path: "introduction/overview.md" },
              { title: "Missing", path: "introduction/missing.md" },
            ],
          },
        ],
      }),
      "utf8",
    );
    await buildObsidianAgentDocs(fixtureRoot, RELEASE);
    await assert.rejects(
      () => verifyObsidianAgentDocs(fixtureRoot),
      /navigation path missing/,
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
