import { describe, expect, it } from "vitest";

import type { PageContent, VisitRecord } from "@shame-the-web/shared";

import { buildKnowledgeGraph } from "./graph-builder";

const baseVisit: Omit<VisitRecord, "id" | "url" | "title" | "hostname" | "timestamp"> = {
  userId: "u1",
  metrics: { loadMs: 100, fcpMs: 50, lcpMs: 150, domInteractiveMs: 200 },
  speedScore100: 90,
  overallScore100: 90,
  categoryScores: [],
  roast: { category: "good", templateId: "t1", message: "ok", subline: "" }
};

describe("graph-builder labels", () => {
  it("uses page title for the node label when one exists", () => {
    const pages: PageContent[] = [
      {
        url: "https://www.youtube.com/watch?v=abc",
        title: "Cool Astronomy Lecture - YouTube",
        description: "About galaxies",
        headings: [],
        bodyText: "",
        keywords: ["astronomy", "galaxies"],
        visitedAt: "2026-01-01T00:00:00.000Z"
      }
    ];

    const graph = buildKnowledgeGraph(pages, []);
    expect(graph.nodes[0]?.label).toBe("Cool Astronomy Lecture - YouTube");
  });

  it("falls back to a slugified URL segment when title is generic", () => {
    const pages: PageContent[] = [
      {
        url: "https://example.com/articles/quantum-spinor-bundles",
        title: "example.com",
        description: "",
        headings: [],
        bodyText: "",
        keywords: [],
        visitedAt: "2026-01-01T00:00:00.000Z"
      }
    ];

    const graph = buildKnowledgeGraph(pages, []);
    expect(graph.nodes[0]?.label).toBe("quantum spinor bundles (example.com)");
  });

  it("ignores titles that are just the site brand (no hardcoded host list)", () => {
    const pages: PageContent[] = [
      {
        url: "https://www.youtube.com/watch?v=zzz",
        title: "YouTube",
        description: "",
        headings: [],
        bodyText: "",
        keywords: [],
        visitedAt: "2026-01-01T00:00:00.000Z"
      },
      {
        url: "https://x.com/jack/status/abc",
        title: "(3) X",
        description: "",
        headings: [],
        bodyText: "",
        keywords: [],
        visitedAt: "2026-01-02T00:00:00.000Z"
      }
    ];

    const graph = buildKnowledgeGraph(pages, [
      { ...baseVisit, id: "v1", url: pages[0]!.url, title: "YouTube", hostname: "www.youtube.com", timestamp: pages[0]!.visitedAt },
      { ...baseVisit, id: "v2", url: pages[1]!.url, title: "(3) X", hostname: "x.com", timestamp: pages[1]!.visitedAt }
    ]);
    const ytLabel = graph.nodes.find((n) => n.url.includes("youtube"))?.label;
    const xLabel = graph.nodes.find((n) => n.url.includes("x.com"))?.label;
    expect(ytLabel).not.toBe("YouTube");
    expect(ytLabel).toContain("youtube.com");
    expect(xLabel).not.toBe("(3) X");
    expect(xLabel).toContain("x.com");
  });
});
