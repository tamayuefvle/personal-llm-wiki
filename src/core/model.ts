export const NOTE_KINDS = [
  "source",
  "knowledge",
  "asset",
  "daily",
  "unknown",
] as const;

export type NoteKind = (typeof NOTE_KINDS)[number];

export type FrontmatterValue = string | string[] | Record<string, string>;

export interface Frontmatter {
  [key: string]: FrontmatterValue;
}

export interface ParsedMarkdown {
  frontmatter: Frontmatter;
  body: string;
  hasFrontmatter: boolean;
}

export interface WikiNote {
  relativePath: string;
  absolutePath: string;
  title: string;
  kind: NoteKind;
  promotion?: string;
  id?: string;
  provenance: string[];
  frontmatter: Frontmatter;
  body: string;
  content: string;
}

export type ConfigurationSource = "--vault" | "LLM_WIKI_VAULT";

export interface VaultResolution {
  path: string;
  source: ConfigurationSource;
}

export interface DoctorReport {
  vaultPath: string;
  configurationSource: ConfigurationSource;
  exists: boolean;
  readable: boolean;
  writable: boolean;
  recognizedDirectories: string[];
  markdownNoteCount: number;
}

export type SearchField = "title" | "path" | "metadata" | "body";

export interface SearchResult {
  relativePath: string;
  title: string;
  kind: NoteKind;
  promotion?: string;
  id?: string;
  score: number;
  matchedFields: SearchField[];
  snippet: string;
  provenance: string[];
}
