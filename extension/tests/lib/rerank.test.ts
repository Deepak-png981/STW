import { describe, expect, it, vi } from "vitest";

import type { SemanticSearchResult } from "@shame-the-web/shared";
import { rerank, type RerankScorer } from "../../src/lib/rerank";

const result = (url: string, snippet: string, reasons: SemanticSearchResult["reasons"] = ["semantic"]): SemanticSearchResult => ({
  url,
  title: url,
  hostname: "example.com",
  lastVisited: "2026-05-23T00:00:00.000Z",
  snippet,
  score: 0.5,
  reasons,
  matchedChunkId: null
});

const candidates: readonly SemanticSearchResult[] = [
  result("https://a.example", "alpha snippet"),
  result("https://b.example", "beta snippet"),
  result("https://c.example", "gamma snippet")
];

describe("rerank", () => {
  it("reorders candidates by descending cross-encoder score", async () => {
    // Mocked scorer prefers the 3rd candidate, then 1st, then 2nd.
    const scorer: RerankScorer = vi.fn(async () => [0.2, 0.1, 0.9]);

    const reranked = await rerank("query", candidates, { enabled: true, scorer });

    expect(reranked.map((item) => item.url)).toEqual([
      "https://c.example",
      "https://a.example",
      "https://b.example"
    ]);
  });

  it("tags reordered results with the 'reranked' reason", async () => {
    const scorer: RerankScorer = vi.fn(async () => [0.2, 0.1, 0.9]);

    const reranked = await rerank("query", candidates, { enabled: true, scorer });

    expect(reranked[0]?.reasons).toContain("reranked");
    expect(reranked[0]?.reasons).toContain("semantic");
  });

  it("falls back to identity order when the scorer throws", async () => {
    const scorer: RerankScorer = vi.fn(async () => {
      throw new Error("model unavailable");
    });

    const reranked = await rerank("query", candidates, { enabled: true, scorer });

    expect(reranked.map((item) => item.url)).toEqual(candidates.map((item) => item.url));
    expect(reranked[0]?.reasons).not.toContain("reranked");
  });

  it("falls back to identity order when score count mismatches candidates", async () => {
    const scorer: RerankScorer = vi.fn(async () => [0.9]);

    const reranked = await rerank("query", candidates, { enabled: true, scorer });

    expect(reranked.map((item) => item.url)).toEqual(candidates.map((item) => item.url));
  });

  it("does not call the scorer or reorder when disabled (default off)", async () => {
    const scorer: RerankScorer = vi.fn(async () => [0.2, 0.1, 0.9]);

    const reranked = await rerank("query", candidates, { enabled: false, scorer });

    expect(scorer).not.toHaveBeenCalled();
    expect(reranked.map((item) => item.url)).toEqual(candidates.map((item) => item.url));
  });

  it("returns input order for empty query without scoring", async () => {
    const scorer: RerankScorer = vi.fn(async () => [0.2, 0.1, 0.9]);

    const reranked = await rerank("   ", candidates, { enabled: true, scorer });

    expect(scorer).not.toHaveBeenCalled();
    expect(reranked.map((item) => item.url)).toEqual(candidates.map((item) => item.url));
  });

  it("only sends the top window to the scorer and preserves the tail order", async () => {
    const many = Array.from({ length: 25 }, (_, index) => result(`https://n${index}.example`, `snippet ${index}`));
    // Reverse the scored window: give later items higher scores.
    const scorer: RerankScorer = vi.fn(async (_query, snippets) =>
      snippets.map((_snippet, index) => index)
    );

    const reranked = await rerank("query", many, { enabled: true, scorer });

    // Scorer should only receive the top-20 window.
    const passedSnippets = (scorer as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[1] as string[];
    expect(passedSnippets).toHaveLength(20);
    // Tail (indices 20..24) stays in original order at the end.
    expect(reranked.slice(20).map((item) => item.url)).toEqual(
      many.slice(20).map((item) => item.url)
    );
  });
});
