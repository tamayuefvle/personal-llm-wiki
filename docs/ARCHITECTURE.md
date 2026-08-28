# Architecture

## 1. Current environment and implementation

2026-08-28時点:

### Repository

- Working directory: `/home/owner/personal-llm-wiki`
- Git repository initialized on `main`; no remote configured
- Node.js `v24.15.0` and npm `11.12.1` observed in the development WSL
- Package requires Node.js 24 or later
- TypeScript Core/CLI and temporary-fixture tests are implemented
- Runtime dependencies: none
- Development dependencies: TypeScript and Node.js type definitions

### External Vault

- Configured development Vault exists outside the repository
- Top-level: `00-Inbox/`, `10-Sources/`, `20-Knowledge/`, `30-Assets/`, `40-Daily/`, `_system/`
- Phase 1 inspection found zero Markdown notes and no `.obsidian/`
- Knowledge Engine did not create, edit, move, or delete anything in the Vault

The missing `.obsidian/` is not an error. Obsidian owns that directory and may create it when a human opens the folder as a Vault.

## 2. System boundaries

```text
Human / trusted agent
        |
        v
CLI                         explicit deterministic interface
        |
        v
Core                        config, Markdown reading, retrieval, validation
        |
        v
External Markdown Vault     durable user-owned source of truth

Obsidian                    Markdown editing and .obsidian ownership
Cursor / Codex              CLI and Markdown clients
Derived indexes             optional and rebuildable; not implemented
MCP / Product OS            outside the current boundary
```

The repository owns behavior, not knowledge. The Vault owns knowledge, not application code. No code assumes that the Vault is nested inside this repository.

## 3. Repository structure

```text
personal-llm-wiki/
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── KNOWLEDGE-MODEL.md
│   └── ROADMAP.md
├── src/
│   ├── cli.ts
│   └── core/
│       ├── config.ts
│       ├── doctor.ts
│       ├── errors.ts
│       ├── frontmatter.ts
│       ├── model.ts
│       ├── query.ts
│       ├── search.ts
│       └── vault.ts
└── tests/
    └── wiki.test.ts
```

No repository Skill exists yet. `dist/`, `node_modules/`, and future `.wiki-cache/` are ignored and non-canonical.

## 4. Core and CLI responsibilities

Core:

- resolve configuration without a hidden default path;
- constrain reads to the resolved real Vault boundary;
- discover Markdown while skipping hidden directories and symlinks;
- extract a tolerant subset of frontmatter without enforcing a schema;
- infer note kind and expose optional metadata;
- normalize and tokenize queries independently from ranking;
- provide deterministic doctor, search, and show operations.

CLI:

- parse command intent and global `--vault` / `--json` options;
- render stable human-readable or JSON results;
- produce explicit configuration, path, ambiguity, and lookup errors;
- perform no Vault writes.

## 5. Configuration strategy

Resolution order:

1. `--vault <path>` or `--vault=<path>`;
2. `LLM_WIKI_VAULT`;
3. explicit configuration error.

There is no fallback to the working directory, a Vault inside the repository, or the current user's absolute Vault path. `.env.example` documents the development value, but the CLI does not automatically load `.env`.

Core resolves the real path, requires a directory for note operations, rejects path traversal, and refuses a note that resolves outside the Vault. Symlinks are not followed during discovery.

## 6. Note discovery and frontmatter

All non-hidden `.md` files below the Vault are discoverable, regardless of metadata completeness. Hidden directories, including `.obsidian/`, are skipped.

Core recognizes these kinds:

```ts
type NoteKind = "source" | "knowledge" | "asset" | "daily" | "unknown";
```

Kind resolution:

1. recognized frontmatter `type`;
2. recognized legacy/frontmatter `kind`;
3. known top-level directory;
4. `unknown`.

The Phase 1 frontmatter extractor recognizes simple top-level scalar values, lists, and one-level nested mappings needed for display and retrieval. It extracts `type`/`kind`, `title`, `promotion`, optional `id`, tags and other searchable metadata, and common source/provenance values. Unknown, incomplete, unclosed, or richer YAML does not prevent the original Markdown from being found or displayed. Full YAML schema validation and rewriting are explicitly outside this phase.

Primary guaranteed identity is the relative Vault path. Frontmatter `id` is optional. ID lookup fails explicitly when absent and rejects ambiguous duplicate IDs; no stable ID format is fixed.

## 7. Commands

### `wiki doctor`

Reports:

- resolved Vault path;
- configuration source;
- whether the Vault exists and is a directory;
- effective-process read capability;
- effective-process write capability;
- recognized top-level directories;
- Markdown note count.

Writable capability uses `access(W_OK)` only. It creates no probe file. Absence of `.obsidian/` is neither checked nor treated as failure.

### `wiki search <query>`

Search scans Markdown directly on every invocation. Query processing is separate from scoring:

```text
raw query
   ↓
NFKC normalization and lowercase
   ↓
coarse Unicode letter/number terms
   ↓
bounded Japanese word segmentation
   ↓
existing deterministic ranking
```

`query.ts` exports the normalized phrase and terms for direct testing and debugging. The normal CLI output is unchanged.

Tokenization rules:

- preserve every coarse term produced by the previous whitespace/punctuation behavior;
- use `Intl.Segmenter("ja", { granularity: "word" })` only for a single continuous term containing Hiragana, or for a mixed Japanese/Latin term;
- preserve already whitespace-delimited Japanese terms without further segmentation;
- preserve pure Kanji/Katakana compound terms as whole terms;
- accept only `isWordLike` segments;
- remove empty terms and duplicates while preserving first-seen order;
- retain meaningful one-character terms such as `色`, `形`, `声`, and `心`;
- filter only the exact minimal particle set `の は が を に へ と で や も か ね よ`.

The particle rule reduces broad grammatical matches without a stopword dictionary. Its regression risk is that a note about one of those characters as a linguistic term cannot be searched using that term alone. This tradeoff remains explicit and test-covered rather than expanding into general Japanese-language heuristics.

Phrase and token matches contribute the same fixed scores as before Phase 1.7:

| Match | Score |
| --- | ---: |
| Exact title phrase | 120 |
| Phrase in title | 60 |
| Phrase in relative path | 40 |
| Phrase in metadata | 25 |
| Phrase in body | 15 |
| Each token in title | 12 |
| Each token in path | 8 |
| Each token in metadata | 5 |
| Each token in body | 2 |
| All query tokens found across the note | 20 |

Results sort by descending score, then relative path. This deliberately favors explainability over linguistic sophistication. The result includes matched fields and the best matching body line as a clipped snippet.

Search covers source, knowledge, asset, daily, and unknown notes. Kind filtering is not implemented yet; the Core model preserves the distinction so a later observed need can add it without changing storage.

### `wiki show <note>`

If the reference contains a path separator or ends with `.md`, it is treated as a relative Vault path. Otherwise it is looked up as an optional frontmatter ID. The result includes resolved metadata and the original Markdown content.

## 8. Testing strategy and evidence

Automated tests create and remove a unique temporary fixture Vault. They never use the configured Personal Vault.

Current coverage includes:

- configuration precedence and missing-configuration error;
- doctor capability reporting without a probe file;
- source, knowledge, asset, daily, and unknown discovery;
- tolerant frontmatter extraction;
- deterministic English and Japanese lexical retrieval;
- continuous Japanese, whitespace Japanese, English, and mixed-script tokenization;
- duplicate, punctuation, one-character, and minimal-particle behavior;
- the seven Phase 1.5/1.6 Natural and Diagnostic query pairs;
- exact, partial, Japanese multi-term, and negative-query regressions;
- promotion and provenance display;
- show by relative path and optional ID;
- Vault traversal rejection;
- hidden-directory exclusion;
- content snapshot equality before and after all three CLI operations.

The real five-note Source corpus was evaluated with the frozen Phase 1.5/1.6 corpus. Phase 1.7 moved Natural Japanese target retrieval from 0/7 to 7/7 within Top 3 while keeping all seven Diagnostic targets at Rank 1. Exact, partial, Japanese multi-term, and negative-query baseline behavior remained stable. Vault snapshots were unchanged.

## 9. Important decisions

### Decision: Markdown remains canonical

- **Reason:** Portable, inspectable, and usable without this system.
- **Alternative considered:** SQLite or vector database as primary store.
- **Why not now:** It creates a second authority and no current scale requires it.
- **Revisit trigger:** Measured latency becomes unacceptable; any index remains derived and rebuildable.

### Decision: Begin with read-only lexical recall

- **Reason:** Recall is the initial success criterion and creates no Vault mutation risk.
- **Alternative considered:** Automated capture and compilation.
- **Why not now:** Write semantics, review behavior, and actual source types are not validated.
- **Revisit trigger:** Real-note dogfood shows recall behavior and a repeated write workflow emerges.

### Decision: Implement with TypeScript on Node.js

- **Reason:** Portable CLI, explicit domain contracts, zero runtime dependencies, and current WSL availability.
- **Alternative considered:** Python or shell.
- **Why not now:** Shell is unsuitable for robust Markdown/path handling; Python offers no demonstrated advantage for this slice.
- **Revisit trigger:** Another required execution environment cannot support Node.js 24 or operational complexity becomes measurable.

### Decision: Relative path is primary identity; ID is optional

- **Reason:** This works for plain Markdown and is Obsidian-native without imposing authoring friction.
- **Alternative considered:** Require a generated stable ID on every note.
- **Why not now:** No observation shows that engine-centered IDs are preferable to filename/Wikilink workflows.
- **Revisit trigger:** Renames, cross-vault references, or repeated ambiguity produce real failures.

### Decision: Extract metadata tolerantly instead of enforcing YAML

- **Reason:** Missing metadata must not hide human-readable knowledge.
- **Alternative considered:** Require a complete frontmatter schema or full YAML parser.
- **Why not now:** Strictness increases capture friction; rewriting is unnecessary for read-only retrieval.
- **Revisit trigger:** Real notes use YAML features the extractor cannot display correctly, or a reviewed write workflow needs safe round-tripping.

### Decision: Segment only bounded natural or mixed-script query terms

- **Reason:** Seven repeated real-Vault failures showed that continuous natural Japanese produced no candidates, while equivalent delimited terms returned every target at Rank 1.
- **Alternative considered:** Segment every Japanese coarse term.
- **Why not now:** The first experiment caused the negative query to match `量子物理学` through `量子` and fragmented pure compound queries into unrelated candidates. Bounded segmentation restored those baselines without changing ranking.
- **Revisit trigger:** Real queries without Hiragana repeatedly miss, or the current minimal particle/filter boundary creates measurable false negatives.

### Decision: Do not create Skills during Phase 1

- **Reason:** Skills should encode repeated workflows over stable capabilities.
- **Alternative considered:** Scaffold anticipated capture/recall Skills.
- **Why not now:** Dogfood has not shown the actual workflow.
- **Revisit trigger:** The same recall workflow is repeatedly exercised on real notes.
