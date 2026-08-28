import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCli } from "../src/cli.js";
import { resolveVault } from "../src/core/config.js";
import { doctor } from "../src/core/doctor.js";
import { WikiError } from "../src/core/errors.js";
import { parseMarkdown } from "../src/core/frontmatter.js";
import { search } from "../src/core/search.js";
import { discoverMarkdownPaths, findNote, readAllNotes } from "../src/core/vault.js";

const DIRECTORIES = [
  "00-Inbox",
  "10-Sources",
  "20-Knowledge",
  "30-Assets",
  "40-Daily",
  "_system",
] as const;

async function makeFixture(t: test.TestContext): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-llm-wiki-test-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  await Promise.all(DIRECTORIES.map((directory) => mkdir(path.join(root, directory))));

  await writeFile(
    path.join(root, "10-Sources", "react-docs.md"),
    `---
type: source
title: React Documentation Notes
origin:
  type: url
  locator: https://example.test/react
---
# React Documentation Notes

The source discusses React state and local component ownership.
`,
  );
  await writeFile(
    path.join(root, "20-Knowledge", "react-state-management.md"),
    `---
id: KNOW-0001
type: knowledge
title: React State Management
promotion: candidate
sources:
  - "[[10-Sources/react-docs]]"
---
# React State Management

Local state is useful when no other component consumes the value.
`,
  );
  await writeFile(
    path.join(root, "30-Assets", "circular-animation.md"),
    `---
title: 円形アニメーション
promotion: candidate
source: C:\\Projects\\Motion\\circle.aep
---
# 円形アニメーション

After Effectsで制作した円形ローディングアニメーション。
`,
  );
  await writeFile(
    path.join(root, "40-Daily", "2026-08-28.md"),
    "# Daily note\n\nAI Agent and Motion Graphics idea.\n",
  );
  await writeFile(
    path.join(root, "00-Inbox", "plain-note.md"),
    "A plain Markdown note without metadata about unclassified research.\n",
  );
  return root;
}

async function contentSnapshot(root: string): Promise<Record<string, string>> {
  const paths = await discoverMarkdownPaths(root);
  return Object.fromEntries(
    await Promise.all(
      paths.map(async (relativePath) => [
        relativePath,
        await readFile(path.join(root, relativePath), "utf8"),
      ]),
    ),
  );
}

test("Vault resolution prefers --vault, then the environment, then errors", () => {
  const fromCli = resolveVault({
    cliPath: "./cli-vault",
    environment: { LLM_WIKI_VAULT: "./environment-vault" },
    cwd: "/tmp",
  });
  assert.deepEqual(fromCli, { path: "/tmp/cli-vault", source: "--vault" });

  const fromEnvironment = resolveVault({
    environment: { LLM_WIKI_VAULT: "./environment-vault" },
    cwd: "/tmp",
  });
  assert.deepEqual(fromEnvironment, {
    path: "/tmp/environment-vault",
    source: "LLM_WIKI_VAULT",
  });

  assert.throws(
    () => resolveVault({ environment: {}, cwd: "/tmp" }),
    (error: unknown) => error instanceof WikiError && error.code === "VAULT_NOT_CONFIGURED",
  );
});

test("Frontmatter extraction is tolerant of missing and incomplete metadata", () => {
  assert.deepEqual(parseMarkdown("# Plain\n\nReadable body.").frontmatter, {});

  const incomplete = parseMarkdown("---\ntype: knowledge\nmissing-value:\n---\n# Still readable");
  assert.equal(incomplete.frontmatter.type, "knowledge");
  assert.equal(incomplete.frontmatter["missing-value"], "");
  assert.match(incomplete.body, /Still readable/);

  const unclosed = parseMarkdown("---\ntype: knowledge\n# Body remains visible");
  assert.equal(unclosed.hasFrontmatter, false);
  assert.match(unclosed.body, /Body remains visible/);
});

test("doctor reports capability without creating a probe file", async (t) => {
  const root = await makeFixture(t);
  const before = await contentSnapshot(root);
  const report = await doctor({ path: root, source: "--vault" });

  assert.equal(report.exists, true);
  assert.equal(report.readable, true);
  assert.equal(report.writable, true);
  assert.equal(report.markdownNoteCount, 5);
  assert.deepEqual(report.recognizedDirectories, [...DIRECTORIES].sort());
  assert.deepEqual(await contentSnapshot(root), before);
});

test("Markdown discovery covers all note kinds and tolerates unknown notes", async (t) => {
  const root = await makeFixture(t);
  const notes = await readAllNotes(root);
  assert.equal(notes.length, 5);
  assert.deepEqual(
    [...new Set(notes.map((note) => note.kind))].sort(),
    ["asset", "daily", "knowledge", "source", "unknown"],
  );
  assert.equal(
    notes.find((note) => note.relativePath.endsWith("plain-note.md"))?.title,
    "plain-note",
  );
  assert.deepEqual(
    notes.find((note) => note.kind === "source")?.provenance,
    ["https://example.test/react"],
  );
});

test("lexical search ranking is deterministic and exposes provenance", async (t) => {
  const root = await makeFixture(t);
  const first = await search(root, "react state");
  const second = await search(root, "react state");

  assert.deepEqual(second, first);
  assert.equal(first[0]?.relativePath, "20-Knowledge/react-state-management.md");
  assert.equal(first[0]?.kind, "knowledge");
  assert.equal(first[0]?.promotion, "candidate");
  assert.deepEqual(first[0]?.provenance, ["[[10-Sources/react-docs]]"]);
  assert.ok(first[0]?.score && first[0].score > (first[1]?.score ?? 0));

  const japanese = await search(root, "円形アニメーション");
  assert.equal(japanese[0]?.kind, "asset");
  assert.match(japanese[0]?.snippet ?? "", /円形アニメーション/);
});

test("show resolves relative paths and optional ids without requiring ids", async (t) => {
  const root = await makeFixture(t);
  const byPath = await findNote(root, "40-Daily/2026-08-28.md");
  assert.equal(byPath.kind, "daily");
  assert.equal(byPath.id, undefined);

  const byId = await findNote(root, "KNOW-0001");
  assert.equal(byId.relativePath, "20-Knowledge/react-state-management.md");

  await assert.rejects(
    () => findNote(root, "../outside.md"),
    (error: unknown) => error instanceof WikiError && error.code === "NOTE_OUTSIDE_VAULT",
  );
});

test("CLI doctor, search, and show are read-only", async (t) => {
  const root = await makeFixture(t);
  const before = await contentSnapshot(root);
  const output: string[] = [];
  const errors: string[] = [];
  const write = (value: string): void => {
    output.push(value);
  };
  const writeError = (value: string): void => {
    errors.push(value);
  };

  const doctorExit = await runCli(
    ["--vault", root, "--json", "doctor"],
    {},
    write,
    writeError,
  );
  assert.equal(doctorExit, 0);
  const report = JSON.parse(output.pop() ?? "") as { markdownNoteCount: number };
  assert.equal(report.markdownNoteCount, 5);

  const searchExit = await runCli(
    ["search", "react state", "--vault", root],
    {},
    write,
    writeError,
  );
  assert.equal(searchExit, 0);
  const searchOutput = output.pop() ?? "";
  assert.match(searchOutput, /20-Knowledge\/react-state-management\.md/);
  assert.match(searchOutput, /Sources: \[\[10-Sources\/react-docs\]\]/);

  const showExit = await runCli(
    ["show", "KNOW-0001"],
    { LLM_WIKI_VAULT: root },
    write,
    writeError,
  );
  assert.equal(showExit, 0);
  const showOutput = output.pop() ?? "";
  assert.match(showOutput, /Path: 20-Knowledge\/react-state-management\.md/);
  assert.match(showOutput, /--- Markdown ---/);

  assert.deepEqual(errors, []);
  assert.deepEqual(await contentSnapshot(root), before);
});

test("hidden directories and symlinks are not traversed", async (t) => {
  const root = await makeFixture(t);
  await mkdir(path.join(root, ".obsidian"));
  await writeFile(path.join(root, ".obsidian", "internal.md"), "not a knowledge note");

  const paths = await discoverMarkdownPaths(root);
  assert.equal(paths.length, 5);
  assert.equal(paths.some((value) => value.includes(".obsidian")), false);
});
