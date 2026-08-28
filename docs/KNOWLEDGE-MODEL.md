# Knowledge Model

## 1. Model goals

The minimum model must let a human or agent answer four questions without a database:

1. What kind of note is this?
2. Is a statement observed, inferred, synthetic, or unknown?
3. What source supports it?
4. Has a human promoted it to canonical knowledge?

Markdown body remains primary. YAML frontmatter contains only discovery and lifecycle metadata; it must not hide the knowledge in machine-only structures.

## 2. Note kinds

Initial kinds are intentionally small.

| `type` | Purpose | Typical location |
| --- | --- | --- |
| `source` | Preserved source material and acquisition context | `10-Sources/` |
| `knowledge` | Claims, interpretation, synthesis, and reusable understanding | `20-Knowledge/` |
| `asset` | Searchable knowledge about an internal or external creative/technical asset | `30-Assets/` |
| `daily` | Time-oriented human record that may later support knowledge | `40-Daily/` |

`00-Inbox/` is a staging location, not a knowledge kind. `_system/` is reserved for human-readable templates or system state only when a concrete need appears. Folder and `type` can differ during review; metadata is authoritative for meaning.

## 3. Identity and common metadata

Phase 1 guarantees only one identity:

```text
Primary identity:          relative Vault path
Optional durable identity: frontmatter id
```

A plain Markdown file without frontmatter remains a valid searchable note. `id` is not required, and no stable ID format is fixed yet.

The smallest useful authored frontmatter is:

```yaml
---
type: knowledge
promotion: candidate
---
```

Both fields are optional for read-only discovery. `type` improves classification. `promotion` distinguishes an interpretation candidate from human-promoted canonical knowledge.

Richer optional metadata may be added when it provides real value:

```yaml
---
id: KNOW-0001
type: knowledge
title: React state management trade-offs
promotion: candidate
created: 2026-08-28
updated: 2026-08-28
tags:
  - react
sources:
  - "[[10-Sources/React state article]]"
---
```

Rules:

- `type` uses the small set above. Phase 1 also reads existing `kind` as a compatibility alias, but new examples use `type`.
- `id`, when present, is an optional lookup key. Duplicate IDs are ambiguous and are not silently resolved.
- `promotion` is `candidate` or `canonical` for knowledge and asset interpretation. AI may create `candidate`; only an explicit human review action may set `canonical`.
- `created` and `updated` use ISO dates when present. Read-only tooling never rewrites them.
- `tags` aid discovery but do not become a mandatory taxonomy.
- `sources` contains Wikilinks or locators when durable claims have sources.

Missing, unknown, incomplete, or richer metadata must not make ordinary Markdown undiscoverable or unreadable. Phase 1 extracts only what it understands and preserves the original content unchanged.

## 4. Source notes

A source note preserves material and acquisition context without rewriting it to agree with later interpretation.

```yaml
---
type: source
title: Example source
created: 2026-08-28
origin:
  type: url
  locator: https://example.com/article
retrieved: 2026-08-28
---
```

Suggested body:

```markdown
# Example source

## Source material

Preserved source content or a faithful local representation.

## Capture notes

Context about access limitations, omitted media, or transformations performed.
```

The origin may be a URL, local file, repository, conversation, book, or human observation. If the original cannot legally or technically be copied, store a locator and capture notes rather than pretending a summary is the source.

## 5. Claims and epistemic state

Epistemic state belongs to each durable claim, not automatically to the whole note. Keep it visible in the body.

```markdown
## Claims

### Local state is sufficient for isolated UI state

- State: `inferred`
- Evidence: [[10-Sources/React state article#Local state]]

For state that has no cross-component consumers, local ownership reduces coordination cost.
```

Allowed states:

| State | Meaning |
| --- | --- |
| `observed` | Directly present in evidence or directly experienced and recorded |
| `inferred` | Reasoned from evidence but not directly stated or observed |
| `synthetic` | Newly composed framework, proposal, or connection |
| `unknown` | Evidence or confidence is insufficient to classify more strongly |

State is not confidence. A future need may justify a separate confidence field, but it is not included now.

## 6. Contradictions

Conflicting claims remain separately addressable. Do not overwrite either claim.

```markdown
## Open conflicts

### Server state ownership

- Status: `unresolved`
- Claim A: [[Knowledge A#Server state belongs in a cache]]
- Claim B: [[Knowledge B#Server state can remain in application state]]
- Evidence A: [[Source A]]
- Evidence B: [[Source B]]

The sources assume different application constraints; human review is pending.
```

Resolution adds a dated explanation and links to new evidence. It does not delete the historical claims.

## 7. Asset knowledge

An asset note describes an asset without requiring the binary to be copied into the Vault.

```yaml
---
type: asset
title: Circular loading animation
promotion: candidate
created: 2026-08-28
locations:
  - platform: windows
    path: "C:\\Projects\\Motion\\circular-loader.aep"
  - platform: wsl
    path: /mnt/c/Projects/Motion/circular-loader.aep
tags:
  - after-effects
  - animation
---
```

Paths are references, not evidence that the asset currently exists. `wiki doctor` or a future asset-specific operation may validate them without changing the note.

## 8. Search before create

Before a future write operation creates durable knowledge, it must search at least relative paths, titles, aliases, tags, optional IDs, and relevant body text. The operation should present possible matches and allow update, link, or explicit creation. It must not silently merge two notes or resolve a conflict.

The exact duplicate threshold and merge workflow are deferred until capture behavior is implemented and observed.
