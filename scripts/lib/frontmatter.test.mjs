import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter } from "./frontmatter.mjs";

test("reads name and description from a skill file", () => {
  const src = "---\nname: wikilink-weaver\ndescription: Use when connecting notes.\n---\n\n# Body\n";
  const { fields, error } = parseFrontmatter(src);
  assert.equal(error, undefined);
  assert.equal(fields.name, "wikilink-weaver");
  assert.equal(fields.description, "Use when connecting notes.");
});

test("keeps colons inside a value", () => {
  const src = "---\ndescription: Use when X: do Y, then Z.\n---\n";
  const { fields } = parseFrontmatter(src);
  assert.equal(fields.description, "Use when X: do Y, then Z.");
});

test("errors when the file has no frontmatter", () => {
  const { error } = parseFrontmatter("# Just a heading\n");
  assert.match(error, /no frontmatter/);
});

test("errors on unterminated frontmatter", () => {
  const { error } = parseFrontmatter("---\nname: x\n");
  assert.match(error, /unterminated/);
});

test("rejects block scalars instead of silently truncating", () => {
  const src = "---\ndescription: >\n  wrapped text\n---\n";
  const { error } = parseFrontmatter(src);
  assert.match(error, /block scalar/);
});
