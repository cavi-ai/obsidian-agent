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
    ["search", "vault=Work", "query=agent systems", "format=json"]);
});

test("builds the documented read argv without JSON output", () => {
  assert.deepEqual(buildObsidianArgs({ command: "read", vault: "Work", file: "Projects/CAVI.md" }),
    ["read", "vault=Work", "file=Projects/CAVI.md"]);
});

test("does not add JSON output to commands that do not document it", () => {
  assert.deepEqual(buildObsidianArgs({ command: "read", vault: "Work", path: "Projects/CAVI.md" }),
    ["read", "vault=Work", "path=Projects/CAVI.md"]);
});

test("parses an Obsidian semantic version", () => {
  assert.deepEqual(parseObsidianVersion("Obsidian 1.12.7"), { major: 1, minor: 12, patch: 7 });
});

test("rejects versions below the CLI minimum", () => {
  assert.throws(() => assertSupportedVersion({ major: 1, minor: 12, patch: 6 }), /1\.12\.7 or newer/);
});

test("accepts the minimum supported CLI version", () => {
  assert.doesNotThrow(() => assertSupportedVersion({ major: 1, minor: 12, patch: 7 }));
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
