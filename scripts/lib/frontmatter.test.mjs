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

test("keeps colons inside a quoted value", () => {
  const src = "---\ndescription: \"Use when X: do Y, then Z.\"\n---\n";
  const { fields, error } = parseFrontmatter(src);
  assert.equal(error, undefined);
  assert.equal(fields.description, "Use when X: do Y, then Z.");
});

test("returns the value, not its quoting", () => {
  const src = "---\nargument-hint: \"[days, default 7]\"\n---\n";
  const { fields } = parseFrontmatter(src);
  assert.equal(fields["argument-hint"], "[days, default 7]");
});

test("rejects an unquoted value YAML would truncate at a comment", () => {
  const src = "---\ndescription: Collect #task items and todos.\n---\n";
  const { error } = parseFrontmatter(src);
  assert.match(error, /' #'.*comment.*quote/);
});

test("rejects an unquoted value YAML would read as a mapping", () => {
  const src = "---\ndescription: Use when X: do Y, then Z.\n---\n";
  const { error } = parseFrontmatter(src);
  assert.match(error, /': '.*mapping.*quote/);
});

test("rejects a half-quoted value rather than reading the quote as text", () => {
  const src = "---\ndescription: \"Use when X.\n---\n";
  const { error } = parseFrontmatter(src);
  assert.match(error, /unterminated or nested quote/);
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
