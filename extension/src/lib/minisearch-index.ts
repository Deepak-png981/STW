import MiniSearch, { type Options } from "minisearch";

import type { KnowledgeSearchResult, PageContent } from "@shame-the-web/shared";

import { tokenize } from "./tfidf";
import { extractSnippet } from "./snippet";

/**
 * Local full-text fallback built on MiniSearch (an in-memory inverted index
 * with BM25-style ranking). This is the "works on install, no model needed"
 * retrieval path: it returns instant keyword results even before the embedding
 * model has finished downloading.
 *
 * Field boosts mirror the hand-rolled weights from `searchPages` so ranking
 * behaviour stays familiar (title ×5, headings ×3, description ×2, body ×1).
 */

const ID_FIELD = "url";
const SEARCH_FIELDS = ["title", "headings", "description", "bodyText", "keywords"] as const;
const STORE_FIELDS = ["url", "title", "description", "bodyText", "visitedAt"] as const;

const FIELD_BOOSTS: Record<(typeof SEARCH_FIELDS)[number], number> = {
  title: 5,
  headings: 3,
  description: 2,
  bodyText: 1,
  keywords: 2
};

const SEARCH_OPTIONS = {
  boost: FIELD_BOOSTS,
  fuzzy: 0.2,
  prefix: true
} as const;

const MAX_RESULTS = 10;

export type FulltextIndex = MiniSearch<PageContent>;

const MINISEARCH_OPTIONS: Options<PageContent> = {
  idField: ID_FIELD,
  fields: [...SEARCH_FIELDS],
  storeFields: [...STORE_FIELDS],
  extractField: (document, fieldName) => {
    const value = (document as Record<string, unknown>)[fieldName];
    if (Array.isArray(value)) {
      return value.join(" ");
    }
    return typeof value === "string" ? value : "";
  }
};

export function buildIndex(pages: readonly PageContent[]): FulltextIndex {
  const index = new MiniSearch<PageContent>(MINISEARCH_OPTIONS);
  index.addAll([...pages]);
  return index;
}

export function searchIndex(index: FulltextIndex, query: string): KnowledgeSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const queryTokens = tokenize(trimmed, 2);
  return index
    .search(trimmed, SEARCH_OPTIONS)
    .slice(0, MAX_RESULTS)
    .map((result) => {
      const page = result as unknown as Pick<
        PageContent,
        "url" | "title" | "description" | "bodyText" | "visitedAt"
      >;
      return {
        url: page.url,
        title: page.title,
        hostname: safeHostname(page.url),
        lastVisited: page.visitedAt,
        snippet: extractSnippet(
          { bodyText: page.bodyText, description: page.description, title: page.title },
          queryTokens
        ),
        score: result.score
      };
    });
}

/** Reconstruct an index from `MiniSearch.toJSON()` output persisted in IndexedDB. */
export function loadIndex(serialized: string): FulltextIndex {
  return MiniSearch.loadJSON<PageContent>(serialized, MINISEARCH_OPTIONS);
}

/** Serialize an index for persistence (stored in the FULLTEXT_STORE). */
export function serializeIndex(index: FulltextIndex): string {
  return JSON.stringify(index);
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
