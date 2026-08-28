import { WikiError } from "./errors.js";
import { flattenFrontmatter } from "./frontmatter.js";
import type { SearchField, SearchResult, WikiNote } from "./model.js";
import { normalizeSearchText, tokenizeQuery } from "./query.js";
import { readAllNotes } from "./vault.js";

function compareResults(left: SearchResult, right: SearchResult): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }
  return left.relativePath < right.relativePath
    ? -1
    : left.relativePath > right.relativePath
      ? 1
      : 0;
}

function clipped(value: string, maximum = 240): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= maximum ? compact : `${compact.slice(0, maximum - 1)}…`;
}

function bestSnippet(note: WikiNote, phrase: string, tokens: string[]): string {
  const lines = note.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const phraseLine = lines.find((line) => normalizeSearchText(line).includes(phrase));
  if (phraseLine) {
    return clipped(phraseLine);
  }

  let bestLine = "";
  let bestMatches = 0;
  for (const line of lines) {
    const normalized = normalizeSearchText(line);
    const matches = tokens.filter((token) => normalized.includes(token)).length;
    if (matches > bestMatches) {
      bestLine = line;
      bestMatches = matches;
    }
  }
  return clipped(bestLine || note.title);
}

function scoreNote(note: WikiNote, phrase: string, tokens: string[]): SearchResult | undefined {
  const title = normalizeSearchText(note.title);
  const relativePath = normalizeSearchText(note.relativePath);
  const metadata = normalizeSearchText(flattenFrontmatter(note.frontmatter));
  const body = normalizeSearchText(note.body);
  const fields = new Set<SearchField>();
  let score = 0;

  if (title === phrase) {
    score += 120;
    fields.add("title");
  } else if (title.includes(phrase)) {
    score += 60;
    fields.add("title");
  }
  if (relativePath.includes(phrase)) {
    score += 40;
    fields.add("path");
  }
  if (metadata.includes(phrase)) {
    score += 25;
    fields.add("metadata");
  }
  if (body.includes(phrase)) {
    score += 15;
    fields.add("body");
  }

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 12;
      fields.add("title");
    }
    if (relativePath.includes(token)) {
      score += 8;
      fields.add("path");
    }
    if (metadata.includes(token)) {
      score += 5;
      fields.add("metadata");
    }
    if (body.includes(token)) {
      score += 2;
      fields.add("body");
    }
  }

  const combined = `${title}\n${relativePath}\n${metadata}\n${body}`;
  if (tokens.length > 1 && tokens.every((token) => combined.includes(token))) {
    score += 20;
  }
  if (score === 0) {
    return undefined;
  }

  return {
    relativePath: note.relativePath,
    title: note.title,
    kind: note.kind,
    ...(note.promotion ? { promotion: note.promotion } : {}),
    ...(note.id ? { id: note.id } : {}),
    score,
    matchedFields: [...fields].sort(),
    snippet: bestSnippet(note, phrase, tokens),
    provenance: note.provenance,
  };
}

export async function search(vaultPath: string, query: string): Promise<SearchResult[]> {
  const tokenized = tokenizeQuery(query);
  if (!tokenized.phrase || tokenized.terms.length === 0) {
    throw new WikiError("Search query must contain text or numbers.", "QUERY_REQUIRED", 2);
  }

  const results = (await readAllNotes(vaultPath))
    .map((note) => scoreNote(note, tokenized.phrase, tokenized.terms))
    .filter((result): result is SearchResult => Boolean(result));
  return results.sort(compareResults);
}
