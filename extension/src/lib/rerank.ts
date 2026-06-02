import type { SemanticReason, SemanticSearchResult } from "@shame-the-web/shared";

import { rerankPairsViaOffscreen } from "./offscreen-ai-client";
import { RERANK_INPUT_LIMIT, isBetterAnswersEnabled } from "./rerank-config";

/**
 * Scores how well each candidate snippet answers `query`. Higher is better.
 * Returns one score per snippet, in the same order as the input.
 */
export type RerankScorer = (query: string, snippets: readonly string[]) => Promise<readonly number[]>;

type RerankOptions = {
  /** Inject a scorer (tests / alternative backends). Defaults to the offscreen cross-encoder. */
  scorer?: RerankScorer;
  /** Override the opt-in flag. Defaults to {@link isBetterAnswersEnabled}. */
  enabled?: boolean;
};

const RERANKED_REASON: SemanticReason = "reranked";

/**
 * Second-stage re-ranking: re-score the top window of `candidates` with a cross-encoder
 * (joint query+snippet encoding is far more accurate than cosine of independent embeddings)
 * and return them reordered by descending relevance.
 *
 * This is a pure orchestration function. It NEVER blocks search: if re-ranking is disabled,
 * the query is empty, the scorer throws, or it returns a mismatched count, the original input
 * order is preserved (identity fallback).
 */
export async function rerank(
  query: string,
  candidates: readonly SemanticSearchResult[],
  options: RerankOptions = {}
): Promise<SemanticSearchResult[]> {
  const ordered = [...candidates];
  const enabled = options.enabled ?? isBetterAnswersEnabled();
  if (!enabled || ordered.length <= 1 || query.trim().length === 0) {
    return ordered;
  }

  const window = ordered.slice(0, RERANK_INPUT_LIMIT);
  const tail = ordered.slice(RERANK_INPUT_LIMIT);
  const scorer = options.scorer ?? rerankPairsViaOffscreen;

  try {
    const scores = await scorer(query, window.map((candidate) => candidate.snippet));
    if (scores.length !== window.length) {
      return ordered;
    }
    const reordered = window
      .map((candidate, index) => ({ candidate, score: scores[index] ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .map(({ candidate }) => withRerankedReason(candidate));
    return [...reordered, ...tail];
  } catch {
    return ordered;
  }
}

function withRerankedReason(result: SemanticSearchResult): SemanticSearchResult {
  if (result.reasons.includes(RERANKED_REASON)) {
    return result;
  }
  return { ...result, reasons: [...result.reasons, RERANKED_REASON] };
}
