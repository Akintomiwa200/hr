export function parseDocumentNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      return parseDocumentNames(JSON.parse(trimmed));
    } catch {
      return [...new Set(trimmed.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
    }
  }
  return [];
}

export function missingRequiredDocuments(
  required: unknown,
  files: Array<{ documentName: string }>
) {
  const names = parseDocumentNames(required);
  const uploaded = new Set(files.map((file) => file.documentName.trim().toLowerCase()));
  return names.filter((name) => !uploaded.has(name.trim().toLowerCase()));
}

export function slugDocumentName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "document";
}
