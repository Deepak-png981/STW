import { describe, expect, it } from "vitest";

import type { PageContent } from "@shame-the-web/shared";

import { buildIndex, searchIndex } from "../../src/lib/minisearch-index";

const PAGES: PageContent[] = [
  {
    url: "https://rust-lang.org/book",
    title: "The Rust Programming Language",
    description: "Learn ownership, borrowing, and lifetimes in Rust.",
    headings: ["Ownership", "Borrowing"],
    bodyText: "Rust is a systems programming language focused on memory safety and concurrency.",
    keywords: ["rust", "ownership", "borrowing"],
    visitedAt: "2026-05-01T10:00:00.000Z"
  },
  {
    url: "https://gardening.example/tomatoes",
    title: "Growing Tomatoes",
    description: "A guide to growing juicy tomatoes in your backyard garden.",
    headings: ["Soil", "Watering"],
    bodyText: "Tomatoes need sunlight and regular watering to thrive in the garden.",
    keywords: ["tomatoes", "gardening", "soil"],
    visitedAt: "2026-05-02T10:00:00.000Z"
  },
  {
    url: "https://cooking.example/pasta",
    title: "Perfect Pasta",
    description: "How to cook pasta al dente every single time.",
    headings: ["Boiling", "Sauce"],
    bodyText: "Pasta should be cooked in plenty of salted boiling water.",
    keywords: ["pasta", "cooking", "sauce"],
    visitedAt: "2026-05-03T10:00:00.000Z"
  }
];

describe("buildIndex + searchIndex", () => {
  it("ranks the most relevant page first", () => {
    const index = buildIndex(PAGES);
    const results = searchIndex(index, "rust ownership");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("https://rust-lang.org/book");
  });

  it("returns the KnowledgeSearchResult shape", () => {
    const index = buildIndex(PAGES);
    const [top] = searchIndex(index, "tomatoes");
    expect(top).toBeDefined();
    expect(top?.url).toBe("https://gardening.example/tomatoes");
    expect(top?.hostname).toBe("gardening.example");
    expect(top?.title).toBe("Growing Tomatoes");
    expect(top?.lastVisited).toBe("2026-05-02T10:00:00.000Z");
    expect(typeof top?.score).toBe("number");
    expect(typeof top?.snippet).toBe("string");
  });

  it("supports prefix matching (partial words)", () => {
    const index = buildIndex(PAGES);
    const results = searchIndex(index, "tomat");
    expect(results[0]?.url).toBe("https://gardening.example/tomatoes");
  });

  it("supports fuzzy matching (typos)", () => {
    const index = buildIndex(PAGES);
    const results = searchIndex(index, "gardenning");
    expect(results.some((result) => result.url === "https://gardening.example/tomatoes")).toBe(true);
  });

  it("returns no results for an empty query", () => {
    const index = buildIndex(PAGES);
    expect(searchIndex(index, "   ")).toEqual([]);
  });
});
