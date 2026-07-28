import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertSupportedVersion,
  buildObsidianArgs,
  parseObsidianVersion,
  runDoctor,
} from "./obsidian-cli.mjs";

test("builds the documented search argv with JSON output", () => {
  assert.deepEqual(buildObsidianArgs({ command: "search", vault: "Work", query: "agent systems" }),
    ["vault=Work", "search", "query=agent systems", "format=json"]);
});

test("preserves deliberate wikilink-style file resolution after the command", () => {
  assert.deepEqual(buildObsidianArgs({ command: "read", vault: "Work", file: "CAVI" }),
    ["vault=Work", "read", "file=CAVI"]);
});

test("builds an exact-path read without adding unsupported JSON output", () => {
  assert.deepEqual(buildObsidianArgs({ command: "read", vault: "Work", path: "Projects/CAVI.md" }),
    ["vault=Work", "read", "path=Projects/CAVI.md"]);
});

test("keeps the command first when no vault is selected", () => {
  assert.deepEqual(buildObsidianArgs({ command: "read", path: "Projects/CAVI.md" }),
    ["read", "path=Projects/CAVI.md"]);
});

test("parses an Obsidian semantic version", () => {
  assert.deepEqual(parseObsidianVersion("Obsidian 1.12.7"), { major: 1, minor: 12, patch: 7 });
});

test("parses an exact bare version result", () => {
  assert.deepEqual(parseObsidianVersion("  v1.12.7\n"), { major: 1, minor: 12, patch: 7 });
});

test("rejects ambiguous version output", () => {
  assert.throws(() => parseObsidianVersion("launcher 9.9.9; Obsidian 1.12.7"), /ambiguous|expected/i);
});

test("rejects prerelease version output", () => {
  assert.throws(() => parseObsidianVersion("Obsidian 1.12.7-beta.1"), /stable/i);
});

test("rejects versions below the CLI minimum", () => {
  assert.throws(() => assertSupportedVersion({ major: 1, minor: 12, patch: 6 }), /1\.12\.7 or newer/);
});

test("accepts the minimum supported CLI version", () => {
  assert.doesNotThrow(() => assertSupportedVersion({ major: 1, minor: 12, patch: 7 }));
});

test("rejects an older major version", () => {
  assert.throws(() => assertSupportedVersion({ major: 0, minor: 99, patch: 99 }), /1\.12\.7 or newer/);
});

test("accepts a newer major version", () => {
  assert.doesNotThrow(() => assertSupportedVersion({ major: 2, minor: 0, patch: 0 }));
});

test("rejects malformed version objects", () => {
  assert.throws(() => assertSupportedVersion({ major: 1, minor: 12 }), /version\.major.*version\.minor.*version\.patch/);
});

test("doctor checks obsidian version and explains activation", () => {
  const output = [];
  const status = runDoctor({
    execFile: (command, args) => {
      assert.equal(command, "obsidian");
      assert.deepEqual(args, ["version"]);
      return { status: 0, stdout: "Obsidian 1.12.7\n", stderr: "" };
    },
    write: (line) => output.push(line),
  });

  assert.equal(status, 0);
  assert.match(output.join(""), /Obsidian CLI is available/i);
  assert.match(output.join(""), /Settings.*General.*Command line interface/i);
});

test("doctor explains how to activate an unavailable CLI", () => {
  const output = [];
  const status = runDoctor({
    execFile: () => ({ error: new Error("not found") }),
    write: (line) => output.push(line),
  });

  assert.equal(status, 1);
  assert.match(output.join(""), /1\.12\.7 or newer/i);
  assert.match(output.join(""), /Settings.*General.*Command line interface/i);
});
