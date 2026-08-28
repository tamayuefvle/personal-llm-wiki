# Roadmap

The roadmap is ordered by validated user value, not architectural completeness.

## Phase 0 — Architecture bootstrap

Status: complete.

- inspected repository and external Vault boundaries;
- recorded the Markdown-first architecture and minimum Knowledge Model;
- documented configuration, safety, CLI, Skill, and testing boundaries;
- made no Vault changes.

## Phase 1 — Read-only recall vertical slice

Status: implementation complete; real-knowledge recall quality not yet evaluated.

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

Observed real-Vault smoke result:

- configured Vault exists and is readable;
- effective sandbox write capability reported `no` without creating a probe;
- six recognized directories;
- zero Markdown notes;
- lexical search returned no matches;
- counts remained six directories and zero files after execution.

Phase 1 deliberately did not implement capture, compile, connect, review, promotion mutation, asset indexing, embeddings, vector storage, persistent indexes, MCP, UI, background behavior, Product OS integration, or Skills.

## Next step — Human-seeded dogfood recall

Do not start a capture command or Skill yet.

A human should add approximately three to five genuine notes using ordinary Markdown/Obsidian. The engine must not generate this data. Then run a small, recorded read-only evaluation such as:

```text
Q1: 過去にReactの状態管理について何を記録した？
Q2: 昔作った円形アニメーションについて何かある？
Q3: AI AgentとMotion Graphicsを結び付ける記録はある？
```

For each query, record:

- expected note or asset;
- returned rank and score;
- whether the snippet explains the match;
- whether provenance is sufficient;
- vocabulary mismatch or missing metadata;
- whether opening the original Markdown completes the task.

This becomes the first recall-quality baseline. Automated tests remain artificial fixture tests; dogfood remains a separate read-only evaluation on personal knowledge.

## After dogfood — Decide from observations

Improve the smallest demonstrated failure first:

- ranking weights, if useful notes rank poorly;
- minimal metadata guidance, if intent cannot be recovered;
- aliases or explicit kind filtering, if repeated queries require them;
- asset representation, if external paths are insufficient;
- one agent Skill, only if a repeated recall workflow has emerged.

Do not infer a need for embeddings from a single miss. Record whether lexical vocabulary mismatch is repeated and whether a simpler metadata or token solution resolves it.

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
6. Which three to five real notes and expected queries form the first dogfood set.
7. Whether a kind filter improves real retrieval; the Core model supports kinds but the option is not implemented.

## Overbuild audit

- One canonical store: external Markdown Vault.
- Zero runtime dependencies, databases, indexes, services, or network calls.
- Two development dependencies for TypeScript build/type checking.
- Zero speculative Skills.
- Zero Vault mutations.
- Three read-only commands and one narrow retrieval algorithm.
- One explicitly human-seeded next step.

No next phase starts automatically.
