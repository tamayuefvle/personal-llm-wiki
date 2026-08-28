# AGENTS.md — Personal LLM Wiki

## Mission

Build a durable, local-first Personal Knowledge Infrastructure in which humans and AI agents can capture, understand, connect, recall, and reuse knowledge over long periods of time.

This is not merely:

- an Obsidian organizer,
- a RAG chatbot,
- an AI note-taking app,
- or a Product OS feature.

The system should become a persistent knowledge layer that can be used by Obsidian, Cursor, Codex, and future agents without locking the user's knowledge into any one tool.

---

## System Boundary

The codebase and the knowledge store are separate.

### Knowledge engine

The repository contains:

- knowledge logic,
- CLI,
- schemas,
- tests,
- agent Skills,
- and future integration layers.

### Knowledge store

The external Obsidian Vault is user-owned data.

Canonical WSL path:

```text
/mnt/c/Users/owner/iCloudDrive/iCloud~md~obsidian/Personal-Knowledge
```

Resolve the Vault through configuration, preferably:

```text
LLM_WIKI_VAULT
```

Do not assume the Vault lives inside this repository.

---

## Source of Truth

Markdown is the durable source of truth.

Databases, indexes, embeddings, graph stores, caches, and search indexes must be treated as derived and rebuildable unless explicitly decided otherwise.

The Vault must remain useful with ordinary Obsidian or Markdown tooling even when the AI system is unavailable.

---

## Knowledge Integrity Invariants

These rules are non-negotiable.

### 1. Preserve sources

Raw or source material must not be silently rewritten to match an AI interpretation.

### 2. Separate evidence from interpretation

Do not collapse these epistemic states:

```text
observed
inferred
synthetic
unknown
```

If status is uncertain, represent the uncertainty.

### 3. Preserve provenance

Durable factual or interpretive knowledge must remain traceable to its source when a source exists.

### 4. Preserve contradictions

Do not silently resolve conflicting claims by deleting or overwriting one side.

Represent the conflict until it is resolved through evidence or human judgment.

### 5. Human owns canonical promotion

AI may create:

- drafts,
- suggestions,
- links,
- summaries,
- classifications,
- synthesis candidates,
- promotion candidates.

AI must not silently declare uncertain knowledge canonical.

### 6. Search before create

Before creating a new durable Knowledge Note, check whether the concept already exists or should update an existing note.

Avoid duplicate concept proliferation.

---

## Vault Safety

Treat the external Vault as valuable user data.

By default:

- do not delete existing notes;
- do not rename existing notes;
- do not move existing notes;
- do not bulk-rewrite notes;
- do not reorganize existing folders;
- do not modify `.obsidian` configuration unless explicitly required;
- do not perform broad migrations without explicit human approval.

Prefer reversible operations.

When structural migration is justified, propose it before execution and explain:

1. current state,
2. problem,
3. proposed change,
4. affected notes,
5. rollback path.

Reading the entire Vault without a concrete need is discouraged.

Retrieve only the context needed for the task.

---

## Information Architecture

Do not design a large folder taxonomy upfront.

Prefer, in this order:

1. metadata,
2. Wikilinks,
3. search,
4. folders.

Folder structure must evolve from observed usage, not theoretical neatness.

A minimal structure such as the following may be used when justified:

```text
00-Inbox/
10-Sources/
20-Knowledge/
30-Assets/
40-Daily/
_system/
```

Do not add deeper hierarchy until real usage demonstrates a need.

---

## Architecture Principles

Prefer:

```text
simple                 over clever
explicit               over implicit
portable               over vendor-locked
local-first            over cloud-dependent
Markdown-first         over database-first
deterministic core     over agent magic
observed need          over speculative architecture
reversible changes     over destructive migrations
human review           over silent autonomous mutation
```

The system should be understandable and recoverable without an LLM.

---

## Responsibility Layers

Keep responsibilities separate.

```text
AGENTS.md
    stable repository invariants

.agents/skills/
    reusable agent workflows

Core
    knowledge-domain logic

CLI
    deterministic human/agent interface

Markdown Vault
    durable knowledge

MCP
    future interoperability layer

Obsidian
    human-facing Knowledge IDE
```

Do not place detailed workflows in this file when they belong in a Skill.

---

## Skills

Repository-scoped reusable workflows belong under:

```text
.agents/skills/<skill-name>/SKILL.md
```

Each Skill should have one clear responsibility.

Potential Skills include:

```text
wiki-capture
wiki-recall
wiki-compile
wiki-connect
wiki-review
wiki-lint
asset-librarian
session-memory
```

Do not create all possible Skills in advance.

Create a Skill when a repeated or sufficiently well-defined workflow exists.

Skill descriptions must clearly state:

- when the Skill should trigger,
- what it does,
- and important cases where it should not trigger.

Prefer instruction-only Skills until deterministic scripts or tools are actually needed.

---

## Deterministic Operations

When an operation affects knowledge integrity or is repeated frequently, prefer a deterministic CLI/core operation instead of relying on free-form agent editing.

Long-term target examples may include:

```text
wiki doctor
wiki search
wiki show
wiki capture
wiki backlinks
wiki related
wiki lint
wiki review
```

Do not implement commands merely because they appear in this list.

Implement them when required by a validated workflow.

---

## External Assets

Knowledge may refer to assets outside the Vault, including:

- After Effects projects,
- Blender files,
- Photoshop files,
- images,
- video,
- repositories,
- source code,
- documents.

Do not require binary assets to be copied into the Vault.

Allow Knowledge Notes to reference external asset locations when appropriate.

Windows and WSL path interoperability may be handled by the engine rather than duplicating assets.

---

## Product OS Boundary

`cursor-product-os` is a separate system.

Do not modify or couple this repository to Product OS unless explicitly requested.

Conceptually:

```text
Personal LLM Wiki
    long-term knowledge / memory

Product OS
    product reasoning / evidence / experiments / decisions
```

Future Product OS integration should treat Personal LLM Wiki content as context, not automatically as Product OS evidence.

Validated Product OS learnings may later become Wiki promotion candidates through an explicit boundary.

Do not implement this bridge prematurely.

---

## Avoid Premature Infrastructure

Do not introduce any of the following without demonstrated need:

- Vector databases,
- embeddings,
- external graph databases,
- MCP servers,
- web applications,
- cloud infrastructure,
- autonomous background organizers,
- complex multi-agent systems,
- Product OS integration,
- large taxonomies.

A simpler architecture that satisfies the current vertical slice is preferred.

---

## Initial Product Principle

Optimize first for successful recall and reuse, not note count or automation volume.

Examples of desired outcomes:

```text
"Where is that animation I made before?"
→ find the relevant asset knowledge.

"What had I previously learned about this React topic?"
→ return the relevant knowledge and provenance.

"Have I thought about something similar before?"
→ discover related prior knowledge.
```

A system that stores thousands of notes but cannot reliably recover useful past knowledge has failed.

---

## Change Discipline

Before significant structural work:

1. inspect the current state;
2. understand existing conventions;
3. identify the concrete problem;
4. make the smallest coherent change;
5. validate the result;
6. document important decisions.

Do not manufacture requirements to justify architecture.

When uncertain, preserve optionality.

---

## Definition of Done

A change is not complete merely because code was written.

Relevant changes should, where applicable:

- preserve Vault integrity;
- preserve provenance;
- maintain Markdown readability;
- avoid unnecessary vendor coupling;
- include appropriate tests;
- avoid silent destructive behavior;
- document any important architectural decision;
- leave the system simpler or demonstrably more capable.

---

## North Star

The long-term goal is:

> The user's past knowledge, ideas, experiences, learning, and creative assets become increasingly easy for both the human and trusted agents to rediscover, understand, connect, and reuse — while the user retains ownership and control of the underlying knowledge.

Protect that goal over short-term architectural convenience.