# Phase 1.7 — Bounded Japanese Query Segmentation Experiment

Date: 2026-08-28

## Baseline

Phase 1.6 evidence was committed separately before implementation:

```text
3b8e811 Record natural Japanese recall evidence
```

The working tree was clean at the experiment baseline. The accepted real-Vault evidence was:

```text
Continuous Natural Japanese: 0/7 within Top 3
Space-delimited Diagnostic:   7/7 at Rank 1
```

Finding Candidate under test:

```text
FC-01 — Continuous Japanese query tokenization prevents candidate retrieval
```

## Scope and invariant

Only query normalization/tokenization changed. Search score weights, phrase matching, substring matching, result sorting, Markdown discovery, metadata, CLI commands, and Vault content were not changed.

```text
raw query
   ↓
query tokenizer
   ↓
normalized phrase + search terms
   ↓
existing deterministic ranking
```

The tokenizer is exported for direct test/debug observation. Normal CLI output remains unchanged.

## Tokenization design

1. Normalize with Unicode NFKC and lowercase using the existing locale behavior.
2. Extract the same coarse Unicode letter/number terms used before Phase 1.7.
3. Preserve every coarse term, so prior whitespace/punctuation semantics remain available.
4. Use `Intl.Segmenter("ja", { granularity: "word" })` only when:
   - the query has one continuous coarse term containing Hiragana; or
   - a coarse term contains both Japanese and Latin scripts.
5. Add only `isWordLike` segments.
6. Remove empty and duplicate terms, preserving first-seen order.
7. Keep meaningful one-character terms.
8. Filter only the minimal exact particle set below.

```text
の は が を に へ と で や も か ね よ
```

Pure Kanji/Katakana compounds and multiple whitespace-delimited Japanese terms remain whole. There is no external runtime dependency, stopword dictionary, synonym table, fuzzy search, or ranking change.

### One-character decision

One-character terms are not discarded by length. Real queries need terms such as `色`, `形`, and `声`. The explicit particle set is removed by value rather than length.

Risk: a user searching for one of the filtered characters as a linguistic subject cannot retrieve it using that character alone. Expanding or shrinking this set requires observed failures and regression tests.

## Experiment iteration observation

The first implementation segmented every coarse term. It achieved Natural recall but introduced two avoidable regressions:

- the negative `量子コンピュータ エラー訂正` began matching the `量子物理学` Source through the new term `量子`;
- pure compound queries such as `超ドーパピンドリブンデザイン` were fragmented into one-character Katakana terms and produced unrelated candidates.

No ranking change was used to hide these results. The tokenizer boundary was narrowed so existing whitespace-delimited and pure compound terms retain prior behavior. A fixture containing `量子物理学` now locks the negative regression.

## Automated evidence

Command:

```text
npm test
```

Result:

```text
16 tests
16 passed
0 failed
```

Direct tokenizer coverage:

- continuous Japanese;
- whitespace-delimited Japanese compatibility;
- English compatibility;
- Japanese/Latin mixed terms;
- normalization and duplicate removal;
- punctuation;
- meaningful one-character terms and minimal particles;
- pure compound preservation;
- deterministic output.

Retrieval regression coverage:

- seven frozen Natural queries within Top 3;
- seven frozen Diagnostic queries at Rank 1;
- exact terminology;
- partial terminology;
- Japanese multi-term;
- negative query with a competing `量子物理学` note;
- no fixture Vault mutation.

## Real Vault raw results

The same five Human-added Source notes were evaluated read-only.

### Natural Japanese Before / After

| ID | Expected | Before | After rank | After candidates | Result |
| --- | --- | --- | ---: | ---: | --- |
| N1 | Brand/shared-memory Source | No result | 1 | 5 | PASS |
| N2 | Resonance Source | No result | 1 | 5 | PASS |
| N3 | Resonance Source | No result | 2 | 5 | PASS |
| N4 | Inamori Source | No result | 1 | 5 | PASS |
| N5 | Words/value Source | No result | 1 | 5 | PASS |
| N6 | Brand/shared-memory Source | No result | 1 | 5 | PASS |
| N7 | Dopamine-design Source | No result | 1 | 5 | PASS |

```text
Before: 0/7 expected targets within Top 3
After:  7/7 expected targets within Top 3
        6 Rank 1, 1 Rank 2
```

This meets the preferred provisional acceptance target.

N3's expected Resonance Source ranked second. The Inamori Source ranked first through broadly shared terms about people, feelings, and the heart. This is a precision observation; ranking was not changed in this experiment.

### Diagnostic queries

| Query set | Before | After |
| --- | --- | --- |
| Seven space-delimited Diagnostic queries | 7/7 Rank 1 | 7/7 Rank 1 |

Final target scores also matched the recorded baseline: `49, 51, 51, 51, 101, 101, 53`.

### Existing query regressions

| Query | Before | After | Result |
| --- | --- | --- | --- |
| `超ドーパピンドリブンデザイン` | target Rank 1, score 17, 1 candidate | same | PASS |
| `ステップワゴン` | target Rank 1, score 17, 1 candidate | same | PASS |
| `稲盛和夫 利他の心` | target Rank 1, score 49, 1 candidate | same | PASS |
| `量子コンピュータ エラー訂正` | no result | no result | PASS |

## False-positive changes

Natural queries now create candidates where the baseline created none. In this five-note corpus, each Natural query returned all five notes. The expected target remained within Top 2, but recall improvement came with broader candidate generation.

No existing exact, partial, Diagnostic, Japanese multi-term, or negative-query candidate-count regression remained after bounding segmentation.

The separate Phase 1.6 observation remains unchanged:

```text
query token: AI
substring match: KAWAI
```

Because substring semantics were explicitly out of scope, the Diagnostic `AI 価値 言語化` still returns unrelated low-score candidates. This was not fixed or masked.

## FC-01 and result classification

FC-01 status: **SUPPORTED**.

Reason:

- adding deterministic query segmentation moved real Natural recall from 0/7 to 7/7 Top 3;
- Diagnostic and existing query behavior remained stable after the compatibility boundary was corrected;
- ranking weights and corpus were unchanged.

Result classification: **VALIDATED_IMPROVEMENT**.

This classification is bounded to candidate recall on the current five-note Source corpus. It does not claim broad Japanese search quality or resolved precision.

## Deferred issues

- Natural queries produce broad candidate sets; precision needs more real-corpus observation.
- N3 ranked the expected target second rather than first.
- Latin substring matching (`AI` in `KAWAI`) remains unchanged.
- Pure Kanji natural sentences without Hiragana are not segmented unless mixed with Latin.
- The minimal particle set may hide linguistic searches for those single characters.
- Exact matched terms are observable through the tokenizer API/tests, not normal CLI output.
- Knowledge, Asset, and Daily notes remain unevaluated in the real Vault.

These observations do not approve ranking changes, fuzzy search, synonyms, embeddings, aliases, or metadata migration.

## Vault safety

The final Vault snapshot matched the baseline by relative path, size, modification time, and SHA-256:

```text
files added: 0
files modified: 0
files removed: 0
```

## Closure and follow-up

Accepted and committed as `9103584da571f194a71bdd060d881ec4627cbe35`. Phase 1.7 is closed. The historical results above remain bounded to the five-note corpus. See the [2026-09-15 re-evaluation](2026-09-15-recall-reevaluation.md) for current results on 37 notes (Natural Top 3: 4/7; Diagnostic Rank 1: 7/7).

## Recommended next minimal step (at experiment time; completed)

Review and accept or reject this bounded segmentation change as a unit. If accepted, commit the tokenizer, tests, Architecture update, and this experiment record together. Then perform another read-only dogfood round as the real corpus grows; do not change ranking or add a new capability yet.

Do not proceed automatically to capture, compile, Skills, MCP, embeddings, or other search architecture.

## Overbuild audit

- one new query-processing module;
- one standard runtime API (`Intl.Segmenter`);
- zero runtime dependencies;
- zero new CLI commands or options;
- zero ranking-weight changes;
- zero index, fuzzy, synonym, alias, or embedding components;
- one focused test file;
- one direct Architecture update;
- zero Vault mutations.
