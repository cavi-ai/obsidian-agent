import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildObsidianAgentDocs } from "./build-obsidian-agent.mjs";
import { verifyObsidianAgentDocs } from "./verify-obsidian-agent.mjs";
import { OUTPUT_REL } from "./lib.mjs";
import { createDocsSandbox } from "./sandbox.mjs";

const RELEASE = Object.freeze({
  version: "0.1.0",
  tag: "v0.1.0",
  commit: "7".repeat(40),
  sourceDateEpoch: 1784953886,
});

test("build is deterministic for unchanged source", async () => {
  const sandbox = await createDocsSandbox();
  try {
    const first = await buildObsidianAgentDocs(sandbox.root, RELEASE);
    const firstBytes = await readFile(path.join(first.outputRoot, "manifest.json"), "utf8");
    const second = await buildObsidianAgentDocs(sandbox.root, RELEASE);
    const secondBytes = await readFile(path.join(second.outputRoot, "manifest.json"), "utf8");
    assert.equal(first.manifest.contentSha256, second.manifest.contentSha256);
    assert.equal(firstBytes, secondBytes);
    assert.equal(first.manifest.schemaVersion, 1);
    assert.deepEqual(first.manifest.release, { tag: RELEASE.tag, commit: RELEASE.commit });
    assert.equal(first.manifest.generatedAt, "2026-07-25T04:31:26.000Z");
    await verifyObsidianAgentDocs(sandbox.root, RELEASE);
  } finally {
    await sandbox.dispose();
  }
});

test("build rejects incomplete or inconsistent release identity", async () => {
  const sandbox = await createDocsSandbox();
  try {
    await assert.rejects(
      () => buildObsidianAgentDocs(sandbox.root, { ...RELEASE, tag: "v0.0.9" }),
      /tag.*version/i,
    );
    await assert.rejects(
      () => buildObsidianAgentDocs(sandbox.root, { ...RELEASE, commit: "abc" }),
      /commit/i,
    );
    await assert.rejects(
      () => buildObsidianAgentDocs(sandbox.root, { ...RELEASE, sourceDateEpoch: undefined }),
      /source date epoch/i,
    );
  } finally {
    await sandbox.dispose();
  }
});

test("verify fails when a page is tampered", async () => {
  const sandbox = await createDocsSandbox();
  try {
    await buildObsidianAgentDocs(sandbox.root, RELEASE);
    const page = path.join(sandbox.root, OUTPUT_REL, "introduction/overview.md");
    const original = await readFile(page, "utf8");
    await writeFile(page, `${original}\n<!-- tamper -->\n`, "utf8");
    await assert.rejects(() => verifyObsidianAgentDocs(sandbox.root, RELEASE), /contentSha256 mismatch/);
    await buildObsidianAgentDocs(sandbox.root, RELEASE);
    await verifyObsidianAgentDocs(sandbox.root, RELEASE);
  } finally {
    await sandbox.dispose();
  }
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
