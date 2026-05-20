import { describe, expect, it } from "vitest";

import type { PageContent } from "@shame-the-web/shared";
import { buildContentHash, buildKnowledgeChunks } from "./knowledge-chunks";

const basePage: PageContent = {
  url: "https://example.com/a",
  title: "Local AI Search",
  description: "Semantic retrieval for browser history.",
  headings: ["Embedding pipeline", "Ranking logic"],
  bodyText:
    "This page explains how to run local embeddings in the browser and rank pages with graph-aware scoring.",
  keywords: ["local", "embeddings", "graph"],
  visitedAt: "2026-05-20T12:00:00.000Z"
};

describe("knowledge chunk builder", () => {
  it("creates deterministic content hash", () => {
    const hashA = buildContentHash(basePage);
    const hashB = buildContentHash({ ...basePage });
    expect(hashA).toBe(hashB);
  });

  it("creates title/description/headings/body chunks", () => {
    const chunks = buildKnowledgeChunks(basePage);
    const types = new Set(chunks.map((chunk) => chunk.type));
    expect(types.has("title")).toBe(true);
    expect(types.has("description")).toBe(true);
    expect(types.has("headings")).toBe(true);
    expect(types.has("body")).toBe(true);
    expect(chunks.every((chunk) => chunk.pageUrl === basePage.url)).toBe(true);
  });
});
