import path from "node:path";

import type {
  Frontmatter,
  FrontmatterValue,
  NoteKind,
  ParsedMarkdown,
} from "./model.js";
import { NOTE_KINDS } from "./model.js";

const DIRECTORY_KINDS: Readonly<Record<string, NoteKind>> = {
  "10-Sources": "source",
  "20-Knowledge": "knowledge",
  "30-Assets": "asset",
  "40-Daily": "daily",
};

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed.at(-1);
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).replaceAll("\\\"", '"').replaceAll("\\\\", "\\");
    }
  }
  return trimmed;
}

function parseFrontmatterLines(lines: string[]): Frontmatter {
  const data: Frontmatter = {};
  let currentKey: string | undefined;

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }

    const topLevel = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (topLevel) {
      const key = topLevel[1];
      if (!key) {
        continue;
      }
      const rawValue = topLevel[2] ?? "";
      currentKey = key;
      data[key] = rawValue ? unquote(rawValue) : "";
      continue;
    }

    if (!currentKey || !/^\s+/.test(line)) {
      continue;
    }

    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem?.[1]) {
      const existing = data[currentKey];
      const items = Array.isArray(existing) ? existing : [];
      items.push(unquote(listItem[1]));
      data[currentKey] = items;
      continue;
    }

    const nested = line.match(/^\s+([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (nested?.[1]) {
      const existing = data[currentKey];
      const object =
        existing && typeof existing === "object" && !Array.isArray(existing)
          ? existing
          : {};
      object[nested[1]] = unquote(nested[2] ?? "");
      data[currentKey] = object;
    }
  }

  return data;
}

export function parseMarkdown(content: string): ParsedMarkdown {
  const normalized = content.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: {}, body: normalized, hasFrontmatter: false };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingIndex < 0) {
    return { frontmatter: {}, body: normalized, hasFrontmatter: false };
  }

  return {
    frontmatter: parseFrontmatterLines(lines.slice(1, closingIndex)),
    body: lines.slice(closingIndex + 1).join("\n").replace(/^\n/, ""),
    hasFrontmatter: true,
  };
}

export function frontmatterString(
  frontmatter: Frontmatter,
  key: string,
): string | undefined {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function valueStrings(value: FrontmatterValue | undefined): string[] {
  if (typeof value === "string") {
    return value ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (value) {
    return Object.values(value).filter(Boolean);
  }
  return [];
}

function locatorStrings(value: FrontmatterValue | undefined): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const preferredKeys = ["locator", "url", "path", "reference"];
    const preferred = preferredKeys
      .map((key) => value[key])
      .filter((candidate): candidate is string => Boolean(candidate));
    return preferred.length ? preferred : [];
  }
  return valueStrings(value);
}

export function flattenFrontmatter(frontmatter: Frontmatter): string {
  return Object.entries(frontmatter)
    .flatMap(([key, value]) => [key, ...valueStrings(value)])
    .join("\n");
}

export function noteProvenance(frontmatter: Frontmatter): string[] {
  const values = [
    ...valueStrings(frontmatter.sources),
    ...valueStrings(frontmatter.source),
    ...valueStrings(frontmatter.provenance),
    ...locatorStrings(frontmatter.origin),
    ...valueStrings(frontmatter.url),
    ...valueStrings(frontmatter.source_url),
  ];
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function inferNoteKind(frontmatter: Frontmatter, relativePath: string): NoteKind {
  const declared = (frontmatterString(frontmatter, "type") ??
    frontmatterString(frontmatter, "kind"))?.toLowerCase();
  if (declared && NOTE_KINDS.includes(declared as NoteKind)) {
    return declared as NoteKind;
  }

  const topLevel = relativePath.split("/")[0];
  return (topLevel && DIRECTORY_KINDS[topLevel]) || "unknown";
}

export function inferTitle(
  frontmatter: Frontmatter,
  body: string,
  relativePath: string,
): string {
  const declared = frontmatterString(frontmatter, "title");
  if (declared) {
    return declared;
  }

  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) {
    return heading;
  }

  return path.basename(relativePath, path.extname(relativePath));
}
