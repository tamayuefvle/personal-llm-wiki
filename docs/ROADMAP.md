# Roadmap

The roadmap is ordered by validated user value, not architectural completeness.

## Phase 0 — Architecture bootstrap

Status: complete.

- inspected repository and external Vault boundaries;
- recorded the Markdown-first architecture and minimum Knowledge Model;
- documented configuration, safety, CLI, Skill, and testing boundaries;
- made no Vault changes.

## Phase 1 — Read-only recall vertical slice

Status: implementation complete; real-Source recall evaluated in Phases 1.5–1.7 and re-evaluated on 2026-09-15.

Implemented:

```text
wiki doctor
wiki search <query>
wiki show <relative-path-or-id>
```

- `--vault` then `LLM_WIKI_VAULT`, otherwise explicit error;
- safe direct Markdown scan without a persistent index;
- deterministic lexical ranking with paths, snippets, kind, promotion, and provenance;
- relative path as guaranteed identity and frontmatter ID as optional identity;
- source, knowledge, asset, daily, and unknown note kinds;
- tolerant metadata extraction and plain-Markdown support;
- human-readable and JSON output;
- temporary-fixture tests for all three commands and no-mutation behavior.

Historical Phase 1 smoke result (before human-added notes; not the current Vault):

- configured Vault exists and is readable;
- effective sandbox write capability reported `no` without creating a probe;
- six recognized directories;
- zero Markdown notes;
- lexical search returned no matches;
- counts remained six directories and zero files after execution.

Phase 1 deliberately did not implement capture, compile, connect, review, promotion mutation, asset indexing, embeddings, vector storage, persistent indexes, MCP, UI, background behavior, Product OS integration, or Skills.

## Phase 1.5–1.7 — Completed recall evaluations and bounded improvement

- [Phase 1.5](dogfood/phase-1-recall.md): five human-added Source notes; basic terminology retrieval worked, two natural queries missed. Evidence commit: `6336b87`.
- [Phase 1.6](dogfood/phase-1-natural-japanese-recall.md): combined natural queries found 0/7 targets within Top 3; diagnostic queries found 7/7 at Rank 1. Evidence commit: `3b8e811`.
- [Phase 1.7](dogfood/phase-1-japanese-segmentation-experiment.md): bounded `Intl.Segmenter` query processing improved natural retrieval to 7/7 within Top 3 on those five notes. Accepted and committed as `9103584`; phase closed. Ranking weights were unchanged. This is a bounded result, not general Japanese-search validation.

## Current status — 2026-09-15 re-evaluation complete

The [new read-only evaluation](dogfood/2026-09-15-recall-reevaluation.md) used the same implementation and frozen Source-target queries against 37 Markdown notes (5 Source-folder, 30 Inbox, 1 Daily-folder, 1 root note).

- Natural targets within Top 3: **4/7**, previously 7/7.
- Diagnostic targets at Rank 1: **7/7**, unchanged target scores.
- N2/N3 targets now Rank 8; N4 Rank 4; N7 Rank 3.
- Natural candidate counts: 32–36, previously 5 each.
- Exact/partial/multi-term checks still found their targets at Rank 1; the frozen negative query returned zero candidates.
- S4 `show` matched the original Markdown and exposed provenance.
- All 54 regular Vault files matched before/after by path, size, mtime and SHA-256; symlink targets excluded.
- Fixture tests: 16/16 passed.

The re-evaluation measures recovery of existing Source targets with more competing notes. It does not establish retrieval quality for newly added notes, their human authorship, or Knowledge/Asset/Daily workflows. Old Source content was not hash-compared against the previous evaluation, so corpus growth alone is not a proven cause.

## Next step — Diagnose the observed ranking misses

Inspect matched terms and score contributions for the expected targets and higher-ranked candidates of N2, N3 and N4, read-only. Determine whether competing matches satisfy the intent before labeling them false positives. Then propose the smallest change supported by that evidence.

New-note recall evaluation still needs a small set of genuine recall questions with expected targets fixed before search. Do not infer expected targets from search results.

No implementation phase, background monitor, or scheduled evaluation starts automatically. Capture, compile, Skills and search architecture expansion remain deferred.

## Deferred until demonstrated need

- write-capable capture/compile/connect/review workflows;
- stable ID generation policy;
- full YAML parsing or schema enforcement;
- asset path conversion and validation;
- derived full-text or vector indexes;
- embedding, LLM query rewriting, or reranking;
- MCP interoperability;
- Product OS bridge;
- Web UI, cloud service, or background organizer;
- deeper folder taxonomy.

## Open decisions

1. Whether Node.js 24 should remain the long-term minimum after another intended environment is verified.
2. Whether the CLI should load `.env`; Phase 1 leaves injection to the caller.
3. Whether repeated use demonstrates a need for a stable ID format; IDs remain optional.
4. Which real YAML features occur in human-authored notes and require fuller parsing.
5. Whether note lookup needs aliases or filename-only matching beyond relative path and optional ID.
6. Which added notes and genuine recall queries should form the next target set; the original five-Source baseline is already evaluated.
7. Whether a kind filter improves real retrieval; the Core model supports kinds but the option is not implemented.

## Overbuild audit

- One canonical store: external Markdown Vault.
- Zero runtime dependencies, databases, indexes, services, or network calls.
- Two development dependencies for TypeScript build/type checking.
- No engine recall/capture Skill implemented; a local writing Skill is present separately.
- Zero Vault mutations.
- Three read-only commands and one narrow retrieval algorithm.
- Next step grounded in the three observed Top-3 misses.

No next phase starts automatically.
