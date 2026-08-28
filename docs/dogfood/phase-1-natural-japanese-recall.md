# Phase 1.6 — Natural Japanese Recall Evaluation

Date: 2026-08-28

## Scope

This run evaluates whether the natural-Japanese recall failure observed in Phase 1.5 repeats. It uses the existing read-only CLI and the same five Human-added Source notes. No retrieval code, ranking weights, tokenizer, metadata, or Vault content was changed.

Phase 1.5 baseline evidence is committed separately:

```text
6336b87 Record Phase 1 recall dogfood baseline
```

The working tree was clean before Phase 1.6 evaluation began.

## Vault baseline

```text
Vault exists: yes
Vault readable: yes
Vault writable capability: no
Recognized directories: 00-Inbox, 10-Sources, 20-Knowledge, 30-Assets, 40-Daily, _system
Markdown note count: 5
```

The note inventory and S1–S5 identifiers are defined in `phase-1-recall.md`. All five notes remain under `10-Sources/`.

## Query plan fixed before search

| ID | Expected | Natural query | Diagnostic query |
| --- | --- | --- | --- |
| 1 | S1: resonance/vibration | `色や形や声が人の気持ちに響くという話はどれだっけ` | `色彩 声 共鳴` |
| 2 | S2: Kazuo Inamori / heart | `稲盛さんが他人のために生きることや感謝について書いていた記事はどれだっけ` | `稲盛和夫 利他 感謝` |
| 3 | S3: value articulation | `AIが文章を作れる時代でも自分の価値を言葉にすることが大事だという話をもう一度見たい` | `AI 価値 言語化` |
| 4 | S4: brand as shared memory | `会社が決めるものではなくみんなの思い出からブランドができるという記事は何だったっけ` | `ブランド 共有 記憶` |
| 5 | S5: dopamine-driven design | `期待感やご褒美でユーザーを夢中にさせるデザインの話を探したい` | `期待 報酬 ドーパミン デザイン` |

Diagnostic queries are failure-localization probes, not replacements for the Natural queries.

## Raw observed results

This section records command results without causal interpretation.

| ID | Natural result | Natural rank | Diagnostic result | Diagnostic rank / score | Outcome |
| --- | --- | ---: | --- | --- | --- |
| 1 | No result | — | S1 | 1 / 51 | Natural MISS; Diagnostic PASS |
| 2 | No result | — | S2 | 1 / 51 | Natural MISS; Diagnostic PASS |
| 3 | No result | — | S3 | 1 / 101 | Natural MISS; Diagnostic PASS |
| 4 | No result | — | S4 | 1 / 101 | Natural MISS; Diagnostic PASS |
| 5 | No result | — | S5 | 1 / 53 | Natural MISS; Diagnostic PASS |

Natural recall success rate:

```text
0 / 5 = 0%
```

Diagnostic recall success rate:

```text
5 / 5 = 100% at Rank 1
```

## Diagnostic Top 3 and snippets

| ID | Rank 1 | Rank 2 | Rank 3 | Rank 1 snippet |
| --- | --- | --- | --- | --- |
| D1 | S1, 51 | None | None | `色彩の振動：視覚的な共鳴を生み出す` |
| D2 | S2, 51 | S1, 2 | None | title containing `稲盛和夫`; body contains `利他` and `感謝` |
| D3 | S3, 101 | S1, 29 | S2, 29 | title containing `AI`, `価値`, and `言語化` |
| D4 | S4, 101 | S3, 26 | S5, 4 | title containing `ブランド`, `共有`, and `記憶` |
| D5 | S5, 53 | S1, 27 | S3, 7 | paragraph connecting expectation, user emotion, dopamine, and design |

No secondary result outranked or tied the expected target.

## False-positive observations

Observed secondary candidates:

- D2 returned S1 at score 2 because it also contains `感謝`.
- D4 returned notes containing generic `ブランド`, `共有`, or related terms at scores 26, 4, and 2.
- D5 returned other design-oriented notes at scores 27, 7, and 2.
- D3 returned four non-target notes at score 29. The short Latin token `AI` also occurs as a substring of the shared author string `KAWAI`, causing matches across title/path/metadata/body.

These are false positives for the full query intent, but the expected target remained Rank 1 with a substantial score lead. The `AI`/`KAWAI` substring behavior is a distinct matching-granularity observation; this run does not change it.

## Combined Phase 1.5 and Phase 1.6 evidence

| Query form | Phase 1.5 | Phase 1.6 | Combined |
| --- | ---: | ---: | ---: |
| Continuous natural Japanese target found in Top 3 | 0/2 | 0/5 | 0/7 |
| Corresponding space-delimited diagnostic target at Rank 1 | 2/2 | 5/5 | 7/7 |

The repeated pattern now spans seven paired queries and all five real Source notes in the current Vault.

## Interpretation

The following statements interpret the raw observations and are not direct search output.

### Hypothesis support

Hypothesis:

> The current lexical ranking works when useful Japanese terms are supplied separately, while continuous natural Japanese queries fail because the current tokenizer does not extract useful word-level terms.

Support level: **STRONG, REPEATED, NOT PROVEN**.

Evidence supporting it:

1. All seven continuous Natural queries across both runs returned no candidate.
2. All seven paired whitespace-segmented queries returned the expected target at Rank 1.
3. Several Natural queries contain an exact useful term inside the sentence—such as `感謝`, `ブランド`, or `デザイン`—but still return no result.
4. Once terms are separately supplied, ranking consistently places the expected target first.

Limitations:

- only five notes;
- all are Source notes from one author/source family;
- queries were designed for known targets rather than sampled from longitudinal use;
- diagnostic wording changes both segmentation and, in some pairs, vocabulary specificity;
- this is black-box retrieval evidence, not a controlled tokenizer benchmark.

### Finding Candidate

`FC-01 — Continuous Japanese query tokenization prevents candidate retrieval`

> In the current small real corpus, natural Japanese recall sentences represented as continuous letter runs return no candidates, while paired space-delimited anchor terms return the expected target at Rank 1.

Status: **Finding Candidate supported by repeated evidence; not yet an approved architecture change.**

### Architecture-layer diagnosis

| Layer | Evidence concentration | Diagnosis |
| --- | --- | --- |
| Query tokenization | High | Primary candidate layer: Natural queries produce no candidates, while segmented terms recover targets |
| Ranking | Low for primary failure | Ranking succeeds 7/7 once usable terms exist; secondary false positives remain visible |
| Corpus metadata | Low for primary failure | The unchanged corpus is retrievable after segmentation; missing metadata did not prevent these targets |
| Semantic gap | Secondary / unresolved | Natural wording includes paraphrases such as `思い出` vs `記憶`, but exact overlapping terms also fail when embedded in continuous text |

Evidence is most concentrated in **query tokenization**. Ranking and metadata are not supported as the primary cause of the zero-result Natural queries.

## Standard runtime option check

An availability check—not an implementation or benchmark—was performed against the current runtime:

```text
Node.js: v24.15.0
Intl.Segmenter: available
Sample word-like segmentation:
色 | や | 形 | や | 声 | が | 人 | の | 気持ち | に | 響く | という | 話 | は | どれ | だ | っけ
```

`Intl.Segmenter` is therefore a future dependency-free architecture option for investigation. This run did not introduce it, call it from retrieval code, change ranking, or benchmark it.

## Do not change yet

This evidence does not approve:

- tokenizer implementation changes;
- `Intl.Segmenter` integration;
- ranking-weight changes;
- fuzzy matching;
- aliases or synonym dictionaries;
- embeddings or vector search;
- metadata migration;
- capture, compile, Skills, MCP, or Product OS integration.

## Recommended next minimal step

Prepare a bounded query-tokenization change proposal before implementation. The proposal should:

1. keep the existing seven Natural/Diagnostic pairs as acceptance evidence;
2. isolate candidate generation/tokenization from ranking;
3. compare the current behavior with one dependency-free deterministic Japanese segmentation option;
4. define how particles, one-character terms, Latin substrings, and duplicate tokens are handled;
5. preserve current exact/partial retrieval and negative-query behavior;
6. require explicit approval before production code changes.

Do not begin that implementation automatically.

## Safety result

The final Vault snapshot matched the baseline by relative path, size, modification time, and SHA-256:

```text
files added: 0
files modified: 0
files removed: 0
```
