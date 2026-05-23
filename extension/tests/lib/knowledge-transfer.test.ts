import { describe, expect, it } from "vitest";

import type { KnowledgeGraph, PageContent, StoredState, VisitRecord } from "@shame-the-web/shared";
import {
  buildKnowledgeExport,
  mergeImportedVisits,
  mergePageContents,
  parseKnowledgeImport
} from "../../src/lib/knowledge-transfer";

const pages: PageContent[] = [
  {
    url: "https://a.example.com",
    title: "A",
    description: "Desc A",
    headings: ["h1"],
    bodyText: "Body A",
    keywords: ["a"],
    visitedAt: "2026-05-20T10:00:00.000Z"
  },
  {
    url: "https://b.example.com",
    title: "B",
    description: "Desc B",
    headings: ["h2"],
    bodyText: "Body B",
    keywords: ["b"],
    visitedAt: "2026-05-20T11:00:00.000Z"
  }
];

const graph: KnowledgeGraph = {
  nodes: [],
  edges: [],
  builtAt: "2026-05-20T12:00:00.000Z"
};

const visits: VisitRecord[] = [
  {
    id: "v1",
    userId: "u1",
    url: "https://a.example.com",
    hostname: "a.example.com",
    title: "A",
    timestamp: "2026-05-20T10:00:00.000Z",
    metrics: { loadMs: 1, fcpMs: 1, lcpMs: 1, domInteractiveMs: 1 },
    speedScore100: 90,
    categoryScores: [],
    overallScore100: 90,
    roast: { category: "good", templateId: "t1", message: "m", subline: "s" }
  }
];

describe("knowledge-transfer", () => {
  it("serializes and parses export payload", () => {
    const exported = buildKnowledgeExport({ pages, visits, graph });
    const parsed = parseKnowledgeImport(exported.json);
    expect(parsed.pages).toHaveLength(2);
    expect(parsed.visits).toHaveLength(1);
    expect(parsed.app).toBe("shame-the-web");
  });

  it("rejects malformed import payload", () => {
    expect(() => parseKnowledgeImport("{\"formatVersion\":2}")).toThrow();
  });

  it("merges pages by newest visitedAt", () => {
    const imported: PageContent[] = [
      {
        ...pages[0]!,
        title: "A newer",
        visitedAt: "2026-05-21T10:00:00.000Z"
      }
    ];
    const merged = mergePageContents(pages, imported, "merge");
    expect(merged).toHaveLength(2);
    const updated = merged.find((page) => page.url === pages[0]!.url);
    expect(updated?.title).toBe("A newer");
  });

  it("maps imported visits to active user during merge", () => {
    const state: StoredState = {
      users: [],
      activeUserId: "active-1",
      visits: [],
      recentRoastTemplateIds: {}
    };
    const mergedVisits = mergeImportedVisits(state, visits, "merge");
    expect(mergedVisits[0]?.userId).toBe("active-1");
  });
});
