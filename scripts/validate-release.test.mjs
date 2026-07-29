import assert from "node:assert/strict";
import test from "node:test";

import { collectReleaseIdentity, validateReleaseIdentity } from "./validate-release.mjs";

test("uses the existing 0.1.0 native version as the canonical first release", async () => {
  const identity = await collectReleaseIdentity(new URL("../", import.meta.url));
  assert.equal(identity.version, "0.1.0");
  assert.equal(identity.pluginVersion, identity.geminiVersion);
  assert.deepEqual(validateReleaseIdentity(identity, "v0.1.0"), []);
});

test("rejects tag and native manifest version drift", () => {
  assert.match(
    validateReleaseIdentity(
      { version: "0.1.0", pluginVersion: "0.1.0", geminiVersion: "0.2.0" },
      "v0.1.0",
    ).join("\n"),
    /gemini/i,
  );
});
