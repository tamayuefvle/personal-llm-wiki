# Phase 1.5 — Real Vault Recall Dogfood

Date: 2026-08-28

## Scope

This evaluation uses the existing read-only `doctor`, `search`, and `show` capabilities against Human-added notes in the real Personal Knowledge Vault. It does not add test notes, modify the Vault, or change retrieval code.

Vault:

```text
/mnt/c/Users/owner/iCloudDrive/iCloud~md~obsidian/Personal-Knowledge
```

## Baseline facts

Observed before evaluation:

```text
Configuration source: --vault
Vault exists: yes
Vault readable: yes
Vault writable capability: no
Recognized directories: 00-Inbox, 10-Sources, 20-Knowledge, 30-Assets, 40-Daily, _system
Markdown note count: 5
All Vault file count: 5
```

`W_OK=no` is the effective-process access result in the current sandbox. No probe file was created, and write capability was not required.

## Real note inventory

All five notes are under `10-Sources/`. There are no Markdown notes under `20-Knowledge/`, `30-Assets/`, or `40-Daily/` in this evaluation.

| Key | Relative path | CLI kind | Provenance metadata |
| --- | --- | --- | --- |
| S1 | `10-Sources/【共鳴する宇宙】デザインとコミュニケーションの根源にある振動の法則｜KAWAI.md` | `source` | `https://note.com/kawaidesign/n/n056f4350b7bb?from=email` |
| S2 | `10-Sources/【永久保存版】稲盛和夫「心」から人生の羅針盤を読み解く～成功と幸福への道標～｜KAWAI.md` | `source` | `https://note.com/kawaidesign/n/n99fee8349168?from=email` |
| S3 | `10-Sources/【言葉の魔力】AI時代に再認識する、価値を言語化する力の重要性｜KAWAI.md` | `source` | `https://note.com/kawaidesign/n/nbc94f4e1f93c?from=email` |
| S4 | `10-Sources/【記憶の共有】ブランドは誰のもの？ 良い記憶の連鎖が、真のブランドを創る｜KAWAI.md` | `source` | `https://note.com/kawaidesign/n/n99ec2418bc65?from=email` |
| S5 | `10-Sources/【超ドーパピン ドリブン デザイン】ブランディング・マーケティング・プロダクトデザインに使える圧倒的手法｜KAWAI.md` | `source` | `https://note.com/kawaidesign/n/nc6c9f1b648fc?from=email` |

The files do not declare `type`; Core correctly inferred `source` from the top-level directory. `promotion` and `id` are unset. Each file has a top-level `source` URL that the CLI exposes as provenance.

## Evaluation plan fixed before search

| ID | Category | Query | Expected target |
| --- | --- | --- | --- |
| Q1 | Exact terminology | `超ドーパピンドリブンデザイン` | S5 |
| Q2 | Partial terminology | `ステップワゴン` | S3 |
| Q3 | Japanese multi-term | `稲盛和夫 利他の心` | S2 |
| Q4 | Exact concept terminology | `共有された記憶` | S4 |
| Q5 | Natural recall wording | `ブランドって結局みんなの頭の中にあるものだっけ` | S4 |
| Q6 | Natural recall wording | `見た目や声で相手と響き合う話` | S1 |
| Q7 | Negative query | `量子コンピュータ エラー訂正` | No target |

For a positive query, `PASS` means the expected target appears within Top 3. For the negative query, `PASS` means no result is returned.

## Observed results

This section records retrieval facts. Interpretation is kept in a later section.

| ID | Returned result | Rank | Score | Matched terms / fields | Result |
| --- | --- | ---: | ---: | --- | --- |
| Q1 | S5 | 1 | 17 | `超ドーパピンドリブンデザイン`; body | PASS |
| Q2 | S3 | 1 | 17 | `ステップワゴン`; body | PASS |
| Q3 | S2 | 1 | 49 | `稲盛和夫`, `利他の心`; title/path/metadata/body | PASS |
| Q4 | S4 | 1 | 17 | `共有された記憶`; body | PASS |
| Q5 | No result | — | — | No matched token | MISS |
| Q6 | No result | — | — | No matched token | MISS |
| Q7 | No result | — | — | No matched token | PASS |

Observed snippets for successful gate queries:

- Q1: `## 第2章：超ドーパピンドリブンデザインの基本要素`
- Q2: `具体的な成功事例（ホンダステップワゴン）から、言語化のヒントを得られる`
- Q3: the note title containing `稲盛和夫`; the same note also contains the `利他の心` section
- Q4: `ブランドは「共有された記憶」の集合体`

## Top 3 retrieval record

| ID | Rank 1 | Rank 2 | Rank 3 |
| --- | --- | --- | --- |
| Q1 | S5, score 17 | None | None |
| Q2 | S3, score 17 | None | None |
| Q3 | S2, score 49 | None | None |
| Q4 | S4, score 17 | None | None |
| Q5 | None | None | None |
| Q6 | None | None | None |
| Q7 | None | None | None |

Positive gate queries returned the expected target in Top 3 for 4 of 6 cases. All four successes were Rank 1. Both natural-wording cases missed.

## Diagnostic probes after the misses

These probes were run after Q5/Q6 and are not substituted for the original gate results. They retain the concepts but introduce whitespace-separated terms.

| ID | Query | Expected | Top 3 |
| --- | --- | --- | --- |
| D1 | `ブランド 頭の中` | S4 | 1: S4 score 49; 2: S3 score 2; 3: S5 score 2 |
| D2 | `声 相手 共鳴` | S1 | 1: S1 score 51; 2: S2 score 2; 3: S4 score 2 |

D1 matched the sentence explaining that a brand exists in stakeholders' minds as shared memory. D2 matched the sentence explaining that words convey thought and emotion and cause resonance in another person.

## Show and provenance facts

`wiki show` was executed using S4's relative Vault path.

Observed:

- returned relative path exactly matched S4;
- `Kind: source`;
- `Promotion: (not set)`;
- `ID: (not set)`;
- `Sources: https://note.com/kawaidesign/n/n99ec2418bc65?from=email`;
- original Markdown followed the metadata header.

Search results for all successful targets also included their respective `source` URL.

## Provisional gate

| Check | Result | Evidence |
| --- | --- | --- |
| Exact retrieval works | PASS | Q1 and Q4, expected target Rank 1 |
| Partial retrieval works | PASS | Q2, expected target Rank 1 |
| Japanese retrieval works | PASS with limitation | Q3 Rank 1; Q5/Q6 continuous natural wording missed |
| Show returns expected note | PASS | S4 resolved by relative path |
| Provenance appears | PASS | `source` URL shown by search and show |
| No Vault mutation | PASS | final path/size/mtime/hash comparison identical |

`BASIC_RECALL_USEFUL`: **PROVISIONAL PASS WITH MATERIAL LIMITATION**.

The CLI is useful when the query contains stored terminology or whitespace-separated anchor terms. It did not recover either target from the two natural Japanese sentence queries.

## Interpretation and observations

The following are interpretations of the facts above, not raw retrieval results.

1. Exact and distinctive partial terms work well in this five-note Vault. Four anchored queries produced only the expected result at Rank 1.
2. The two natural Japanese sentence queries failed completely, while whitespace-separated diagnostic variants returned the targets at Rank 1 with a wide score gap.
3. This is consistent with the current tokenizer treating a continuous Japanese character run as one token. It is not yet proof that a particular tokenizer, fuzzy search, aliases, or embeddings are the right remedy.
4. Diagnostic probes produced low-score false positives because any token can contribute to a result. In this sample, the expected target scored 49 or 51 while secondary results scored 2, so ranking kept them clearly separated.
5. The negative query returned no result, so no false positive was observed for that absent theme.
6. Provenance extraction works on the real notes even without `type`, `promotion`, or `id` metadata.
7. This sample evaluates Source recall only. It provides no real evidence yet for Knowledge, Asset, or Daily recall.
8. Search output exposes matched fields but not the exact matched tokens. Exact terms in this record had to be checked against snippets/content, which limits retrieval explainability during evaluation.

## Possible architecture pressure, not approved changes

- Repeated natural Japanese misses may justify investigating deterministic Japanese query segmentation or another minimal lexical treatment.
- Evaluation would be easier if search results exposed exact matched query terms as well as fields.
- Mixed real note kinds are needed before judging whether kind filtering or additional metadata is useful.

## Do not change yet

This run does not justify immediately adding:

- embeddings or vector search;
- fuzzy search;
- automatic aliases;
- ranking-weight changes;
- metadata migration;
- full YAML enforcement;
- any capture, compile, connect, Skill, MCP, or Product OS integration.

There are only two natural-wording failures, from five notes by one source/author family. More observations should confirm whether the same failure repeats across different real knowledge.

## Recommended next minimal step

Run one more read-only dogfood batch after Human adds or identifies a few genuine Knowledge, Asset, or Daily notes. Use approximately five natural Japanese recall sentences and record both the original wording and an optional whitespace-separated diagnostic variant. Decide whether a deterministic Japanese lexical improvement is warranted only after that evidence exists.

Do not begin the next implementation phase automatically.
