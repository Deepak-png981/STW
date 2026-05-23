import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/local-embeddings", () => ({
  embedText: async () => [1, 0, 0, 0]
}));

import type { ChunkEmbedding, KnowledgeChunk, KnowledgeGraph, PageContent } from "@shame-the-web/shared";
import { semanticSearchPages } from "../../src/lib/semantic-search";

const pages: PageContent[] = [
  {
    url: "https://example.com/webllm",
    title: "WebLLM Guide",
    description: "Run local chat models in browser",
    headings: ["Model loading", "GPU runtime"],
    bodyText: "Use local GPU inference with a small model.",
    keywords: ["webllm", "local", "chat"],
    visitedAt: new Date().toISOString()
  },
  {
    url: "https://example.com/graph",
    title: "Graph Ranking",
    description: "Hybrid ranking and graph neighbors",
    headings: ["semantic scoring", "graph boost"],
    bodyText: "Combine vector similarity with keyword and graph signals.",
    keywords: ["graph", "ranking", "semantic"],
    visitedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
  }
];

const chunks: KnowledgeChunk[] = [
  {
    id: "c1",
    pageUrl: pages[0]!.url,
    text: "Local chat models in browser with WebLLM",
    type: "body",
    index: 0,
    visitedAt: pages[0]!.visitedAt,
    contentHash: "h1"
  },
  {
    id: "c2",
    pageUrl: pages[1]!.url,
    text: "Graph-aware ranking combines semantic and keyword score",
    type: "body",
    index: 0,
    visitedAt: pages[1]!.visitedAt,
    contentHash: "h2"
  }
];

const embeddings: ChunkEmbedding[] = [
  {
    id: "e1",
    chunkId: "c1",
    pageUrl: pages[0]!.url,
    model: "test",
    dims: 4,
    vector: [1, 0, 0, 0],
    contentHash: "h1",
    createdAt: new Date().toISOString()
  },
  {
    id: "e2",
    chunkId: "c2",
    pageUrl: pages[1]!.url,
    model: "test",
    dims: 4,
    vector: [0, 1, 0, 0],
    contentHash: "h2",
    createdAt: new Date().toISOString()
  }
];

const graph: KnowledgeGraph = {
  nodes: [
    {
      id: pages[0]!.url,
      label: "WebLLM Guide",
      hostname: "example.com",
      url: pages[0]!.url,
      keywords: pages[0]!.keywords,
      visitCount: 4,
      lastVisited: pages[0]!.visitedAt,
      clusterId: 1
    },
    {
      id: pages[1]!.url,
      label: "Graph Ranking",
      hostname: "example.com",
      url: pages[1]!.url,
      keywords: pages[1]!.keywords,
      visitCount: 2,
      lastVisited: pages[1]!.visitedAt,
      clusterId: 2
    }
  ],
  edges: [{ source: pages[0]!.url, target: pages[1]!.url, weight: 0.4 }],
  builtAt: new Date().toISOString()
};

describe("semanticSearchPages", () => {
  it("returns ranked results with reasons", async () => {
    const results = await semanticSearchPages({
      query: "local chat model",
      pages,
      graph,
      chunks,
      embeddings
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.reasons.length).toBeGreaterThan(0);
  });
});
