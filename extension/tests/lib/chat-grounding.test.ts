import { describe, expect, it } from "vitest";

import type { SemanticSearchResult } from "@shame-the-web/shared";

import {
  describeGroundingDecision,
  selectChatGroundingResults,
  shouldAttachBrowsingContext
} from "../../src/lib/chat-grounding";
import { isLowQualityModelReply, LOCAL_CHAT_SYSTEM_PROMPT } from "../../src/lib/chat-reply-quality";

const baseResult = (overrides: Partial<SemanticSearchResult>): SemanticSearchResult => ({
  url: "https://example.com",
  title: "Example",
  hostname: "example.com",
  lastVisited: "2026-05-23T00:00:00.000Z",
  snippet: "Example snippet",
  score: 0.5,
  reasons: ["recent"],
  matchedChunkId: null,
  ...overrides
});

describe("selectChatGroundingResults", () => {
  it("keeps semantic and keyword matches", () => {
    const results = [
      baseResult({ url: "https://a.test", reasons: ["semantic"] }),
      baseResult({ url: "https://b.test", reasons: ["recent", "visited"] })
    ];

    expect(selectChatGroundingResults(results)).toHaveLength(1);
    expect(selectChatGroundingResults(results)[0]?.url).toBe("https://a.test");
  });
});

describe("shouldAttachBrowsingContext", () => {
  it("attaches when grounded chunks exist", () => {
    const grounded = [
      baseResult({
        url: "https://developer.chrome.com/docs/extensions/reference/api/offscreen",
        score: 0.35,
        reasons: ["keyword", "semantic"],
        matchedChunkId: "chunk-2"
      })
    ];

    expect(shouldAttachBrowsingContext("can you get me the page about offscreen?", grounded)).toBe(true);
  });

  it("skips weak semantic-only matches for greetings", () => {
    const greetingMatch = [
      baseResult({
        url: "https://github.com/huggingface/transformers.js/",
        title: "huggingface/transformers.js",
        snippet: "BERT and Transformers in the browser.",
        score: 0.2037,
        reasons: ["semantic", "recent"],
        matchedChunkId: "chunk-greeting"
      })
    ];

    expect(shouldAttachBrowsingContext("hello", greetingMatch)).toBe(false);
  });

  it("skips conversational identity prompt with semantic-only hits", () => {
    const conversationalMatch = [
      baseResult({
        url: "https://www.youtube.com/",
        title: "YouTube",
        snippet: "Enjoy the videos and music you love.",
        score: 0.2443,
        reasons: ["semantic", "recent"],
        matchedChunkId: "chunk-youtube"
      })
    ];

    expect(shouldAttachBrowsingContext("who are you", conversationalMatch)).toBe(false);
  });

  it("attaches when query has typo but matches page semantically", () => {
    const typoQueryMatch = [
      baseResult({
        url: "https://developer.chrome.com/docs/extensions/reference/api/offscreen",
        title: "chrome.offscreen | API | Chrome for Developers",
        snippet: "hasDocument() returns whether an offscreen document currently exists.",
        score: 0.2063,
        reasons: ["semantic", "recent"],
        matchedChunkId: "chunk-offscreen"
      })
    ];

    expect(shouldAttachBrowsingContext("where did i read about offsceren?", typoQueryMatch)).toBe(true);
  });

  it("skips when only recency matches exist", () => {
    const weak = [baseResult({ reasons: ["recent", "visited"], score: 0.12 })];
    expect(shouldAttachBrowsingContext("hey", weak)).toBe(false);
  });
});

describe("isLowQualityModelReply", () => {
  it("flags empty replies and system-prompt echo", () => {
    expect(isLowQualityModelReply("")).toBe(true);
    expect(isLowQualityModelReply(LOCAL_CHAT_SYSTEM_PROMPT)).toBe(true);
  });

  it("accepts normal conversational replies", () => {
    expect(isLowQualityModelReply("It is going well — ask me about a page you visited and I can help.")).toBe(
      false
    );
  });
});

describe("describeGroundingDecision", () => {
  it("reports grounded chunk counts", () => {
    const results = [
      baseResult({ reasons: ["keyword"], matchedChunkId: "chunk-1", score: 0.4 }),
      baseResult({ url: "https://b.test", reasons: ["recent"] })
    ];

    expect(describeGroundingDecision("offscreen api", results)).toMatchObject({
      rawResultCount: 2,
      groundedResultCount: 1,
      attachContext: true
    });
  });
});
