import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { tokenizeQuery } from "../src/core/query.js";
import { search } from "../src/core/search.js";
import { discoverMarkdownPaths } from "../src/core/vault.js";

const TARGETS = {
  S1: "10-Sources/s1-resonance.md",
  S2: "10-Sources/s2-inamori.md",
  S3: "10-Sources/s3-words.md",
  S4: "10-Sources/s4-brand.md",
  S5: "10-Sources/s5-dopamine.md",
} as const;

async function makeRecallFixture(t: test.TestContext): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-llm-wiki-query-test-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "10-Sources"), { recursive: true });

  const notes: Record<(typeof TARGETS)[keyof typeof TARGETS], string> = {
    [TARGETS.S1]: `---
title: 共鳴する宇宙 デザインとコミュニケーションの振動
source: https://example.test/resonance
---
# 共鳴する宇宙

色彩の振動は視覚的な共鳴を生み出す。形態は空間を形作り、声の振動は感情を伝える。言葉は相手の心に共鳴を引き起こす。
現代の量子物理学は振動を研究する。
`,
    [TARGETS.S2]: `---
title: 稲盛和夫 心から人生の羅針盤を読み解く
source: https://example.test/inamori
---
# 稲盛和夫の心

利他の心は他人の幸せを願う生き方である。感謝の気持ちを育み、日常生活で実践する。
`,
    [TARGETS.S3]: `---
title: 言葉の魔力 AI時代に価値を言語化する力
source: https://example.test/words
---
# 言葉の魔力

AIが言葉を扱う時代でも、人間が価値を言語化することは重要だ。ホンダステップワゴンは言葉が価値を創る事例である。
`,
    [TARGETS.S4]: `---
title: 記憶の共有 ブランドは誰のもの
source: https://example.test/brand
---
# 記憶の共有

ブランドは企業だけのものではない。関係する全ての人々の頭の中に存在する共有された記憶の集合体である。
`,
    [TARGETS.S5]: `---
title: 超ドーパピン ドリブン デザイン
source: https://example.test/dopamine
---
# 超ドーパピンドリブンデザイン

期待を演出し、即時報酬と長期報酬を両立する。ユーザーの感情を動かすドーパミンとデザインの関係を扱う。
`,
  };

  await Promise.all(
    Object.entries(notes).map(([relativePath, content]) =>
      writeFile(path.join(root, relativePath), content),
    ),
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

test("query tokenizer preserves English and whitespace-delimited behavior", () => {
  assert.deepEqual(tokenizeQuery("React state"), {
    phrase: "react state",
    terms: ["react", "state"],
  });
  assert.deepEqual(tokenizeQuery("稲盛和夫 利他 感謝").terms, [
    "稲盛和夫",
    "利他",
    "感謝",
  ]);
});

test("query tokenizer handles continuous Japanese and mixed-language input", () => {
  const japanese = tokenizeQuery("色や形や声が人の気持ちに響くという話はどれだっけ");
  assert.ok(japanese.terms.includes("色"));
  assert.ok(japanese.terms.includes("形"));
  assert.ok(japanese.terms.includes("声"));
  assert.ok(japanese.terms.includes("気持ち"));
  assert.ok(japanese.terms.includes("響く"));

  assert.deepEqual(tokenizeQuery("React状態管理 AI").terms, [
    "react状態管理",
    "react",
    "状態",
    "管理",
    "ai",
  ]);
});

test("query tokenizer removes duplicates and punctuation deterministically", () => {
  assert.deepEqual(tokenizeQuery("AI AI ai").terms, ["ai"]);
  assert.deepEqual(tokenizeQuery("ブランド、記憶!").terms, ["ブランド", "記憶"]);
  assert.deepEqual(tokenizeQuery("量子コンピュータ エラー訂正").terms, [
    "量子コンピュータ",
    "エラー訂正",
  ]);

  const query = "期待感やご褒美でユーザーを夢中にさせるデザインの話";
  assert.deepEqual(tokenizeQuery(query), tokenizeQuery(query));
});

test("query tokenizer preserves pure compound terms without fragmenting them", () => {
  assert.deepEqual(tokenizeQuery("超ドーパピンドリブンデザイン").terms, [
    "超ドーパピンドリブンデザイン",
  ]);
  assert.deepEqual(tokenizeQuery("ステップワゴン").terms, ["ステップワゴン"]);
});

test("query tokenizer keeps meaningful one-character terms and filters minimal particles", () => {
  assert.deepEqual(tokenizeQuery("色 形 声 心 の は が を に へ と で や も か ね よ").terms, [
    "色",
    "形",
    "声",
    "心",
  ]);
});

test("seven natural Japanese queries retrieve expected fixture targets within Top 3", async (t) => {
  const root = await makeRecallFixture(t);
  const before = await contentSnapshot(root);
  const cases = [
    ["ブランドって結局みんなの頭の中にあるものだっけ", TARGETS.S4],
    ["見た目や声で相手と響き合う話", TARGETS.S1],
    ["色や形や声が人の気持ちに響くという話はどれだっけ", TARGETS.S1],
    ["稲盛さんが他人のために生きることや感謝について書いていた記事はどれだっけ", TARGETS.S2],
    ["AIが文章を作れる時代でも自分の価値を言葉にすることが大事だという話をもう一度見たい", TARGETS.S3],
    ["会社が決めるものではなくみんなの思い出からブランドができるという記事は何だったっけ", TARGETS.S4],
    ["期待感やご褒美でユーザーを夢中にさせるデザインの話を探したい", TARGETS.S5],
  ] as const;

  for (const [query, expected] of cases) {
    const results = await search(root, query);
    assert.ok(
      results.slice(0, 3).some((result) => result.relativePath === expected),
      `${query} should retrieve ${expected} within Top 3`,
    );
  }
  assert.deepEqual(await contentSnapshot(root), before);
});

test("seven segmented diagnostic queries preserve expected Rank 1", async (t) => {
  const root = await makeRecallFixture(t);
  const cases = [
    ["ブランド 頭の中", TARGETS.S4],
    ["声 相手 共鳴", TARGETS.S1],
    ["色彩 声 共鳴", TARGETS.S1],
    ["稲盛和夫 利他 感謝", TARGETS.S2],
    ["AI 価値 言語化", TARGETS.S3],
    ["ブランド 共有 記憶", TARGETS.S4],
    ["期待 報酬 ドーパミン デザイン", TARGETS.S5],
  ] as const;

  for (const [query, expected] of cases) {
    const results = await search(root, query);
    assert.equal(results[0]?.relativePath, expected, `${query} should keep ${expected} at Rank 1`);
  }
});

test("exact, partial, Japanese multi-term, and negative regressions remain stable", async (t) => {
  const root = await makeRecallFixture(t);
  const positive = [
    ["超ドーパピンドリブンデザイン", TARGETS.S5],
    ["ステップワゴン", TARGETS.S3],
    ["稲盛和夫 利他の心", TARGETS.S2],
  ] as const;

  for (const [query, expected] of positive) {
    const results = await search(root, query);
    assert.equal(results[0]?.relativePath, expected);
  }
  assert.deepEqual(await search(root, "量子コンピュータ エラー訂正"), []);
});
