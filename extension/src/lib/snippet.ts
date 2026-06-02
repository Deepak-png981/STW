import type { PageContent } from "@shame-the-web/shared";

const SNIPPET_LENGTH = 150;
const SNIPPET_STRIDE = 20;

/**
 * Pick the ~150-char window that contains the most query tokens. Shared by the
 * keyword scorer (tfidf.ts) and the MiniSearch full-text index so the search
 * UI shows identical, query-aware snippets regardless of which path produced
 * the result.
 */
export function extractSnippet(
  page: Pick<PageContent, "bodyText" | "description" | "title">,
  queryTokens: readonly string[]
): string {
  const sources = [page.description, page.bodyText, page.title].filter(Boolean);
  if (sources.length === 0 || queryTokens.length === 0) {
    const first = sources[0];
    return first ? first.slice(0, SNIPPET_LENGTH) : "";
  }

  const best = sources.reduce(
    (acc, text) => {
      const candidate = snippetFromText(text, queryTokens);
      const score = queryTokens.filter((tok) => candidate.toLowerCase().includes(tok)).length;
      const isBetter = score > acc.score || (score === acc.score && candidate.length > acc.snippet.length);
      return isBetter ? { snippet: candidate, score } : acc;
    },
    { snippet: "", score: 0 }
  );

  return best.snippet;
}

function snippetFromText(bodyText: string, queryTokens: readonly string[]): string {
  if (!bodyText) {
    return "";
  }

  const lower = bodyText.toLowerCase();
  const limit = Math.max(0, lower.length - SNIPPET_LENGTH);
  const windowCount = Math.floor(limit / SNIPPET_STRIDE) + 1;
  const startPositions = Array.from({ length: windowCount }, (_, step) => step * SNIPPET_STRIDE);

  const best = startPositions.reduce(
    (acc, pos) => {
      const slice = lower.slice(pos, pos + SNIPPET_LENGTH);
      const count = queryTokens.filter((tok) => slice.includes(tok)).length;
      return count > acc.count ? { pos, count } : acc;
    },
    { pos: 0, count: 0 }
  );

  const start = best.pos;
  const excerpt = bodyText.slice(start, start + SNIPPET_LENGTH);
  const prefix = start > 0 ? "\u2026" : "";
  const suffix = start + SNIPPET_LENGTH < bodyText.length ? "\u2026" : "";
  return prefix + excerpt + suffix;
}
