// Zero-dependency reader for the single-line-scalar frontmatter this repo uses.
// Every host reads these files with a real YAML parser, so anything that parser
// would read differently is an error here rather than a silent truncation there.
const BLOCK_SCALARS = new Set([">", "|", ">-", "|-", ">+", "|+"]);

function unquote(value) {
  const quote = value[0];
  if ((quote !== '"' && quote !== "'") || value.length < 2 || value.at(-1) !== quote) return null;
  const inner = value.slice(1, -1);
  return inner.includes(quote) ? null : inner;
}

export function parseFrontmatter(text) {
  const lines = text.split("\n");
  if (lines[0] !== "---") return { error: "no frontmatter" };
  const end = lines.indexOf("---", 1);
  if (end === -1) return { error: "unterminated frontmatter" };

  const fields = {};
  for (const line of lines.slice(1, end)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const raw = line.slice(i + 1).trim();
    if (BLOCK_SCALARS.has(raw)) return { error: `block scalar not supported for key '${key}'` };

    const quoted = unquote(raw);
    if (quoted !== null) {
      fields[key] = quoted;
      continue;
    }
    if (raw[0] === '"' || raw[0] === "'") {
      return { error: `key '${key}' has an unterminated or nested quote; quote the whole value` };
    }
    // YAML starts a comment at ' #' and ends a plain scalar at ': '.
    if (raw.includes(" #")) {
      return { error: `key '${key}' contains ' #', which YAML reads as a comment; quote the value` };
    }
    if (raw.includes(": ")) {
      return { error: `key '${key}' contains ': ', which YAML reads as a mapping; quote the value` };
    }
    fields[key] = raw;
  }
  return { fields };
}
