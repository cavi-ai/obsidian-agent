import assert from "node:assert/strict";
import test from "node:test";

import { collectReleaseIdentity, validateReleaseIdentity } from "./validate-release.mjs";

const repo = () => collectReleaseIdentity(new URL("../", import.meta.url));

test("every manifest that restates the version agrees with plugin.json", async () => {
  const identity = await repo();
  assert.match(identity.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.ok(identity.restated.length > 0, "no manifest was checked");
  assert.deepEqual(validateReleaseIdentity(identity, `v${identity.version}`), []);
});

test("covers every manifest that carries a version", async () => {
  const identity = await repo();
  const files = new Set(identity.restated.map((entry) => entry.file));
  assert.deepEqual([...files].sort(), [
    ".claude-plugin/marketplace.json",
    ".claude-plugin/plugin.json",
    ".codex-plugin/plugin.json",
    "docs/obsidian-agent/source/navigation.json",
    "gemini-extension.json",
  ]);
});

test("rejects a manifest that drifts from plugin.json, naming the file", async () => {
  const { version } = await repo();
  const drifted = { version, restated: [{ file: "gemini-extension.json", version: "9.9.9" }] };
  assert.match(validateReleaseIdentity(drifted, `v${version}`).join("\n"), /gemini-extension\.json version 9\.9\.9/);
});

test("rejects a tag that does not match the canonical version", async () => {
  const identity = await repo();
  assert.match(validateReleaseIdentity(identity, "v9.9.9").join("\n"), /does not match/);
});

test("rejects a version that is not stable SemVer", () => {
  for (const version of ["1.0", "1.0.0-rc.1", "v1.0.0", ""]) {
    assert.match(
      validateReleaseIdentity({ version, restated: [] }, `v${version}`).join("\n"),
      /stable SemVer/,
    );
  }
});
