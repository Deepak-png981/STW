import { describe, expect, it } from "vitest";

import type { PageContent } from "@shame-the-web/shared";

import { searchPages, tokenize } from "./tfidf";

describe("tokenize", () => {
  it("allows shorter query tokens when minLength is 2", () => {
    expect(tokenize("vr rust", 2)).toContain("vr");
    expect(tokenize("vr rust", 3)).not.toContain("vr");
  });
});

describe("searchPages", () => {
  it("matches keywords that appear only in the stored description", () => {
    const pages: PageContent[] = [
      {
        url: "https://www.youtube.com/watch?v=test",
        title: "Unrelated video title",
        description: "Deep dive into zebra migration patterns across the Serengeti ecosystem.",
        headings: [],
        bodyText: "Subscribe · Home · Trending",
        keywords: [],
        visitedAt: "2026-01-15T12:00:00.000Z"
      }
    ];

    const results = searchPages("Serengeti", pages);
    expect(results.length).toBe(1);
    expect(results[0]?.url).toBe(pages[0]?.url);
    expect(results[0]?.snippet.toLowerCase()).toContain("serengeti");
  });
});
