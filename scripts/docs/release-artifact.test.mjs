import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildObsidianAgentDocs } from "./build-obsidian-agent.mjs";
import { createProductDocsReleaseArtifact } from "./release-artifact.mjs";
import { createDocsSandbox, TEST_RELEASE as RELEASE } from "./sandbox.mjs";
const REPOSITORY = "cavi-ai/obsidian-agent";

function tarEntries(archive) {
  const tar = gunzipSync(archive);
  const entries = [];
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/u, "");
    const size = Number.parseInt(header.subarray(124, 136).toString("ascii").replace(/\0.*$/u, "").trim() || "0", 8);
    const body = tar.subarray(offset + 512, offset + 512 + size);
    entries.push({ name, body });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
}

test("builds deterministic safe archives with exact embedded identity and checksum", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "bobby-docs-release-"));
  const sandbox = await createDocsSandbox();
  try {
    const { outputRoot } = await buildObsidianAgentDocs(sandbox.root, RELEASE);
    const first = await createProductDocsReleaseArtifact({ docsRoot: outputRoot, outputDirectory: output, repository: REPOSITORY, ...RELEASE });
    const second = await createProductDocsReleaseArtifact({ docsRoot: outputRoot, outputDirectory: output, repository: REPOSITORY, ...RELEASE });
    assert.equal(first.artifactSha256, second.artifactSha256);
    assert.deepEqual(await readFile(first.artifactPath), await readFile(second.artifactPath));
    assert.equal((await readFile(first.checksumPath, "utf8")).trim(), `${first.artifactSha256}  ${first.artifactName}`);

    const entries = tarEntries(await readFile(first.artifactPath));
    assert.ok(entries.length > 2);
    assert.ok(entries.every(({ name }) =>
      name === "cavi-release.json" || name.startsWith(`docs/obsidian-agent/${RELEASE.tag}/`),
    ));
    assert.ok(entries.every(({ name }) => !name.includes("..") && !name.startsWith("/")));
    const release = JSON.parse(entries.find(({ name }) => name === "cavi-release.json").body.toString("utf8"));
    assert.deepEqual(release, {
      schemaVersion: 1,
      slug: "obsidian-agent",
      kind: "product-docs",
      version: RELEASE.version,
      tag: RELEASE.tag,
      repository: REPOSITORY,
      commit: RELEASE.commit,
    });
  } finally {
    await rm(output, { recursive: true, force: true });
    await sandbox.dispose();
  }
});
