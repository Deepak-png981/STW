import type { SemanticSearchResult } from "@shame-the-web/shared";
import { tokenize } from "./tfidf";

const GROUNDING_REASONS = new Set<SemanticSearchResult["reasons"][number]>(["semantic", "keyword"]);
const SINGLE_TOKEN_SEMANTIC_SCORE = 0.35;
const MULTI_TOKEN_SEMANTIC_SCORE = 0.35;

export function selectChatGroundingResults(
  results: readonly SemanticSearchResult[]
): readonly SemanticSearchResult[] {
  return results.filter((result) => result.reasons.some((reason) => GROUNDING_REASONS.has(reason)));
}

export function shouldAttachBrowsingContext(
  query: string,
  results: readonly SemanticSearchResult[]
): boolean {
  const grounded = selectChatGroundingResults(results);
  const top = grounded[0];
  if (!top) {
    return false;
  }

  const lexicalSupport = hasLexicalSupport(query, top);
  if (lexicalSupport) {
    return true;
  }

  if (top.reasons.includes("keyword")) {
    return true;
  }

  const rawTokenCount = query
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const semanticTokens = tokenize(query, 3);
  if (semanticTokens.length === 0) {
    return false;
  }
  const minSemanticScore = rawTokenCount <= 1 ? SINGLE_TOKEN_SEMANTIC_SCORE : MULTI_TOKEN_SEMANTIC_SCORE;
  return top.score >= minSemanticScore;
}

export function describeGroundingDecision(
  query: string,
  results: readonly SemanticSearchResult[]
): Record<string, unknown> {
  const grounded = selectChatGroundingResults(results);
  const top = grounded[0] ?? null;

  return {
    query: query.trim(),
    rawResultCount: results.length,
    groundedResultCount: grounded.length,
    topScore: top ? roundScore(top.score) : null,
    topReasons: top?.reasons ?? [],
    topMatchedChunkId: top?.matchedChunkId ?? null,
    attachContext: shouldAttachBrowsingContext(query, results)
  };
}

function roundScore(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function hasLexicalSupport(query: string, topResult: SemanticSearchResult): boolean {
  const queryTokens = new Set(tokenize(query, 3));
  if (queryTokens.size === 0) {
    return false;
  }

  const contextTokens = new Set([
    ...tokenize(topResult.title, 3),
    ...tokenize(topResult.url, 3),
    ...tokenize(topResult.snippet, 3)
  ]);

  for (const token of queryTokens) {
    if (hasExactOrFuzzyMatch(token, contextTokens)) {
      return true;
    }
  }
  return false;
}

function hasExactOrFuzzyMatch(token: string, contextTokens: ReadonlySet<string>): boolean {
  if (contextTokens.has(token)) {
    return true;
  }

  if (token.length < 5) {
    return false;
  }

  for (const candidate of contextTokens) {
    if (Math.abs(candidate.length - token.length) > 2) {
      continue;
    }
    if (boundedLevenshtein(token, candidate, 2) <= 2) {
      return true;
    }
  }

  return false;
}

function boundedLevenshtein(a: string, b: string, maxDistance: number): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row]![0] = row;
  }
  for (let col = 0; col < cols; col += 1) {
    matrix[0]![col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    let rowMin = Number.POSITIVE_INFINITY;
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      const deletion = matrix[row - 1]![col]! + 1;
      const insertion = matrix[row]![col - 1]! + 1;
      const substitution = matrix[row - 1]![col - 1]! + cost;
      const value = Math.min(deletion, insertion, substitution);
      matrix[row]![col] = value;
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > maxDistance) {
      return rowMin;
    }
  }

  return matrix[rows - 1]![cols - 1]!;
}
