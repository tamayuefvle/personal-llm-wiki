#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveVault } from "./core/config.js";
import { doctor } from "./core/doctor.js";
import { WikiError } from "./core/errors.js";
import type { DoctorReport, SearchResult, WikiNote } from "./core/model.js";
import { search } from "./core/search.js";
import { findNote } from "./core/vault.js";

const USAGE = `Usage:
  wiki [--vault <path>] [--json] doctor
  wiki [--vault <path>] [--json] search <query>
  wiki [--vault <path>] [--json] show <relative-path-or-id>

Vault resolution: --vault, then LLM_WIKI_VAULT, otherwise an explicit error.`;

interface CliOptions {
  vault?: string;
  json: boolean;
  positional: string[];
}

function parseOptions(argv: string[]): CliOptions {
  let vault: string | undefined;
  let json = false;
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      json = true;
    } else if (argument === "--vault") {
      const value = argv[index + 1];
      if (!value) {
        throw new WikiError("--vault requires a path.", "VAULT_OPTION_REQUIRED", 2);
      }
      vault = value;
      index += 1;
    } else if (argument?.startsWith("--vault=")) {
      vault = argument.slice("--vault=".length);
      if (!vault) {
        throw new WikiError("--vault requires a path.", "VAULT_OPTION_REQUIRED", 2);
      }
    } else if (argument) {
      positional.push(argument);
    }
  }

  return { ...(vault ? { vault } : {}), json, positional };
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function renderDoctor(report: DoctorReport): string {
  const directories = report.recognizedDirectories.length
    ? report.recognizedDirectories.join(", ")
    : "(none)";
  return [
    `Vault path: ${report.vaultPath}`,
    `Configuration source: ${report.configurationSource}`,
    `Vault exists: ${yesNo(report.exists)}`,
    `Vault readable: ${yesNo(report.readable)}`,
    `Vault writable capability: ${yesNo(report.writable)} (access check only; no probe file created)`,
    `Recognized directories: ${directories}`,
    `Markdown note count: ${report.markdownNoteCount}`,
  ].join("\n");
}

function renderResult(result: SearchResult): string {
  return [
    result.relativePath,
    `Title: ${result.title}`,
    `Kind: ${result.kind}`,
    `Promotion: ${result.promotion ?? "(not set)"}`,
    `ID: ${result.id ?? "(not set)"}`,
    `Score: ${result.score}`,
    `Matched: ${result.matchedFields.join(", ")}`,
    `Snippet: ${result.snippet}`,
    `Sources: ${result.provenance.length ? result.provenance.join(", ") : "(none)"}`,
  ].join("\n");
}

function renderNote(note: WikiNote): string {
  return [
    `Path: ${note.relativePath}`,
    `Title: ${note.title}`,
    `Kind: ${note.kind}`,
    `Promotion: ${note.promotion ?? "(not set)"}`,
    `ID: ${note.id ?? "(not set)"}`,
    `Sources: ${note.provenance.length ? note.provenance.join(", ") : "(none)"}`,
    "",
    "--- Markdown ---",
    note.content,
  ].join("\n");
}

export async function runCli(
  argv: string[],
  environment: NodeJS.ProcessEnv = process.env,
  write: (value: string) => void = console.log,
  writeError: (value: string) => void = console.error,
): Promise<number> {
  try {
    if (argv.includes("--help") || argv.includes("-h")) {
      write(USAGE);
      return 0;
    }

    const options = parseOptions(argv);
    const [command, ...rest] = options.positional;
    if (!command) {
      throw new WikiError(USAGE, "COMMAND_REQUIRED", 2);
    }
    const resolution = resolveVault({
      ...(options.vault ? { cliPath: options.vault } : {}),
      environment,
    });

    if (command === "doctor") {
      if (rest.length > 0) {
        throw new WikiError("doctor does not accept positional arguments.", "UNEXPECTED_ARGUMENT", 2);
      }
      const report = await doctor(resolution);
      write(options.json ? JSON.stringify(report, null, 2) : renderDoctor(report));
      return report.exists && report.readable ? 0 : 1;
    }

    if (command === "search") {
      const query = rest.join(" ").trim();
      const results = await search(resolution.path, query);
      if (options.json) {
        write(JSON.stringify(results, null, 2));
      } else if (results.length === 0) {
        write("No matching notes.");
      } else {
        write(results.map(renderResult).join("\n\n"));
      }
      return 0;
    }

    if (command === "show") {
      const reference = rest.join(" ").trim();
      const note = await findNote(resolution.path, reference);
      write(options.json ? JSON.stringify(note, null, 2) : renderNote(note));
      return 0;
    }

    throw new WikiError(`Unknown command: ${command}\n\n${USAGE}`, "UNKNOWN_COMMAND", 2);
  } catch (error) {
    if (error instanceof WikiError) {
      writeError(`Error: ${error.message}`);
      return error.exitCode;
    }
    const message = error instanceof Error ? error.message : String(error);
    writeError(`Error: ${message}`);
    return 1;
  }
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (entrypoint === fileURLToPath(import.meta.url)) {
  process.exitCode = await runCli(process.argv.slice(2));
}
