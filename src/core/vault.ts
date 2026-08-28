import { access, readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { isNodeError, WikiError } from "./errors.js";
import {
  frontmatterString,
  inferNoteKind,
  inferTitle,
  noteProvenance,
  parseMarkdown,
} from "./frontmatter.js";
import type { WikiNote } from "./model.js";

function lexicalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toRelativePath(value: string): string {
  return value.split(path.sep).join("/");
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export async function requireVaultRoot(vaultPath: string): Promise<string> {
  let root: string;
  try {
    root = await realpath(vaultPath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new WikiError(`Vault does not exist: ${vaultPath}`, "VAULT_NOT_FOUND");
    }
    throw error;
  }

  const details = await stat(root);
  if (!details.isDirectory()) {
    throw new WikiError(`Vault is not a directory: ${vaultPath}`, "VAULT_NOT_DIRECTORY");
  }
  return root;
}

export async function discoverMarkdownPaths(vaultPath: string): Promise<string[]> {
  const root = await requireVaultRoot(vaultPath);
  const paths: string[] = [];
  const pending = [root];

  while (pending.length > 0) {
    const directory = pending.pop();
    if (!directory) {
      continue;
    }

    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => lexicalCompare(left.name, right.name));
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        pending.push(absolute);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        paths.push(toRelativePath(path.relative(root, absolute)));
      }
    }
  }

  return paths.sort(lexicalCompare);
}

export async function readNote(vaultPath: string, relativePath: string): Promise<WikiNote> {
  if (!relativePath.trim() || path.isAbsolute(relativePath)) {
    throw new WikiError("Note must be identified by a relative Vault path.", "INVALID_NOTE_PATH", 2);
  }

  const root = await requireVaultRoot(vaultPath);
  const requested = path.resolve(root, relativePath);
  if (!isWithin(root, requested)) {
    throw new WikiError(`Note path escapes the Vault: ${relativePath}`, "NOTE_OUTSIDE_VAULT", 2);
  }

  let actual: string;
  try {
    actual = await realpath(requested);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new WikiError(`Note not found: ${relativePath}`, "NOTE_NOT_FOUND");
    }
    throw error;
  }

  if (!isWithin(root, actual)) {
    throw new WikiError(`Note resolves outside the Vault: ${relativePath}`, "NOTE_OUTSIDE_VAULT", 2);
  }
  const details = await stat(actual);
  if (!details.isFile() || !actual.toLowerCase().endsWith(".md")) {
    throw new WikiError(`Not a Markdown note: ${relativePath}`, "NOT_MARKDOWN_NOTE", 2);
  }

  await access(actual);
  const content = await readFile(actual, "utf8");
  const normalizedRelativePath = toRelativePath(path.relative(root, actual));
  const parsed = parseMarkdown(content);

  const promotion = frontmatterString(parsed.frontmatter, "promotion");
  const id = frontmatterString(parsed.frontmatter, "id");
  return {
    relativePath: normalizedRelativePath,
    absolutePath: actual,
    title: inferTitle(parsed.frontmatter, parsed.body, normalizedRelativePath),
    kind: inferNoteKind(parsed.frontmatter, normalizedRelativePath),
    ...(promotion ? { promotion } : {}),
    ...(id ? { id } : {}),
    provenance: noteProvenance(parsed.frontmatter),
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    content,
  };
}

export async function readAllNotes(vaultPath: string): Promise<WikiNote[]> {
  const paths = await discoverMarkdownPaths(vaultPath);
  return Promise.all(paths.map((relativePath) => readNote(vaultPath, relativePath)));
}

export async function findNote(vaultPath: string, reference: string): Promise<WikiNote> {
  const trimmed = reference.trim();
  if (!trimmed) {
    throw new WikiError("A relative note path or optional frontmatter id is required.", "NOTE_REFERENCE_REQUIRED", 2);
  }

  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.toLowerCase().endsWith(".md")) {
    return readNote(vaultPath, trimmed);
  }

  const matches = (await readAllNotes(vaultPath)).filter((note) => note.id === trimmed);
  if (matches.length === 0) {
    throw new WikiError(`No note found for id: ${trimmed}`, "NOTE_NOT_FOUND");
  }
  if (matches.length > 1) {
    const paths = matches.map((note) => note.relativePath).join(", ");
    throw new WikiError(`Frontmatter id is ambiguous (${trimmed}): ${paths}`, "AMBIGUOUS_NOTE_ID");
  }
  return matches[0] as WikiNote;
}
