export interface TokenizedQuery {
  phrase: string;
  terms: string[];
}

const WORD_RUN = /[\p{L}\p{N}]+/gu;
const JAPANESE_SCRIPT = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const HIRAGANA_SCRIPT = /\p{Script=Hiragana}/u;
const LATIN_SCRIPT = /\p{Script=Latin}/u;

// Keep this deliberately small. These particles create broad substring matches
// but carry little retrieval intent in the observed natural recall queries.
// Meaningful one-character terms such as 色, 形, 声, and 心 remain searchable.
const MINIMAL_JAPANESE_FUNCTION_WORDS = new Set([
  "の",
  "は",
  "が",
  "を",
  "に",
  "へ",
  "と",
  "で",
  "や",
  "も",
  "か",
  "ね",
  "よ",
]);

const JAPANESE_WORD_SEGMENTER = new Intl.Segmenter("ja", {
  granularity: "word",
});

export function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function isUsefulTerm(term: string): boolean {
  return Boolean(term) && !MINIMAL_JAPANESE_FUNCTION_WORDS.has(term);
}

function isMixedJapaneseLatin(term: string): boolean {
  return JAPANESE_SCRIPT.test(term) && LATIN_SCRIPT.test(term);
}

export function tokenizeQuery(query: string): TokenizedQuery {
  const phrase = normalizeSearchText(query).trim();
  const coarseTerms = phrase.match(WORD_RUN) ?? [];
  const onlyCoarseTerm = coarseTerms[0] ?? "";
  const segmentContinuousQuery =
    coarseTerms.length === 1 && HIRAGANA_SCRIPT.test(onlyCoarseTerm);
  const terms: string[] = [];
  const seen = new Set<string>();

  const addTerm = (candidate: string): void => {
    const term = normalizeSearchText(candidate).trim();
    if (!isUsefulTerm(term) || seen.has(term)) {
      return;
    }
    seen.add(term);
    terms.push(term);
  };

  for (const coarseTerm of coarseTerms) {
    // Preserve every token produced by the previous whitespace/punctuation
    // behavior. Segment a continuous query, or a mixed-script chunk whose
    // Japanese and Latin terms otherwise cannot be separated. Multiple
    // already-delimited chunks retain the previous token semantics.
    addTerm(coarseTerm);
    if (segmentContinuousQuery || isMixedJapaneseLatin(coarseTerm)) {
      for (const segment of JAPANESE_WORD_SEGMENTER.segment(coarseTerm)) {
        if (segment.isWordLike) {
          addTerm(segment.segment);
        }
      }
    }
  }

  return { phrase, terms };
}
