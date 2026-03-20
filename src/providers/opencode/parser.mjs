// src/providers/opencode/parser.mjs

export function parseJson(value) {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function createSnippet(text, query) {
  if (!text) {
    return "";
  }
  if (!query) {
    return text.slice(0, 160);
  }
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex === -1) {
    return text.slice(0, 160);
  }
  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(text.length, matchIndex + query.length + 80);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function mapDataRow(row) {
  if (!row) {
    return null;
  }
  return {
    ...row,
    data: parseJson(row.data)
  };
}
