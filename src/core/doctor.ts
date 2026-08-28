import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";

import { discoverMarkdownPaths } from "./vault.js";
import type { DoctorReport, VaultResolution } from "./model.js";

const RECOGNIZED_DIRECTORIES = [
  "00-Inbox",
  "10-Sources",
  "20-Knowledge",
  "30-Assets",
  "40-Daily",
  "_system",
] as const;

async function canAccess(target: string, mode: number): Promise<boolean> {
  try {
    await access(target, mode);
    return true;
  } catch {
    return false;
  }
}

export async function doctor(resolution: VaultResolution): Promise<DoctorReport> {
  let exists = false;
  try {
    exists = (await stat(resolution.path)).isDirectory();
  } catch {
    exists = false;
  }

  const readable = exists && (await canAccess(resolution.path, constants.R_OK));
  const writable = exists && (await canAccess(resolution.path, constants.W_OK));
  let recognizedDirectories: string[] = [];
  let markdownNoteCount = 0;

  if (readable) {
    const entries = await readdir(resolution.path, { withFileTypes: true });
    recognizedDirectories = entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          RECOGNIZED_DIRECTORIES.includes(entry.name as (typeof RECOGNIZED_DIRECTORIES)[number]),
      )
      .map((entry) => entry.name)
      .sort();
    markdownNoteCount = (await discoverMarkdownPaths(resolution.path)).length;
  }

  return {
    vaultPath: resolution.path,
    configurationSource: resolution.source,
    exists,
    readable,
    writable,
    recognizedDirectories,
    markdownNoteCount,
  };
}
