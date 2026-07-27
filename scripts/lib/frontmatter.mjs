// Zero-dependency reader for the single-line-scalar frontmatter this repo uses.
const BLOCK_SCALARS = new Set([">", "|", ">-", "|-", ">+", "|+"]);

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
    const value = line.slice(i + 1).trim();
    if (BLOCK_SCALARS.has(value)) return { error: `block scalar not supported for key '${key}'` };
    fields[key] = value;
  }
  return { fields };
}
