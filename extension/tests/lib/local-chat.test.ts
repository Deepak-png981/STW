import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("@mlc-ai/web-llm", () => ({
  CreateMLCEngine: createMock
}));

import type { SemanticSearchResult } from "@shame-the-web/shared";
import { answerFromResults, resetLocalChatRuntime } from "../../src/lib/local-chat";

const baseResult = (overrides: Partial<SemanticSearchResult>): SemanticSearchResult => ({
  url: "https://example.com",
  title: "Example",
  hostname: "example.com",
  lastVisited: "2026-05-23T00:00:00.000Z",
  snippet: "Example snippet",
  score: 0.5,
  reasons: ["semantic"],
  matchedChunkId: "chunk-example",
  ...overrides
});

describe("answerFromResults", () => {
  beforeEach(() => {
    resetLocalChatRuntime();
    createMock.mockReset();
  });

  it("injects retrieved context into model prompt for relevant query", async () => {
    const completionsCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "You read it on Chrome Offscreen docs." } }]
    });

    createMock.mockResolvedValue({
      chat: {
        completions: {
          create: completionsCreate
        }
      }
    });

    const results = [
      baseResult({
        url: "https://developer.chrome.com/docs/extensions/reference/api/offscreen",
        title: "chrome.offscreen | API | Chrome for Developers",
        snippet: "hasDocument() returns whether an offscreen document currently exists.",
        score: 0.2063,
        reasons: ["semantic", "recent"],
        matchedChunkId: "chunk-offscreen"
      })
    ];

    const response = await answerFromResults({
      query: "where did i read about offsceren?",
      history: [],
      results
    });

    expect(response.model).toBe("grounded-retrieval");
    expect(response.sources).toHaveLength(1);
    expect(response.text).toContain("chrome.offscreen | API | Chrome for Developers");
    expect(response.text).toContain("https://developer.chrome.com/docs/extensions/reference/api/offscreen");
    expect(completionsCreate).toHaveBeenCalledTimes(0);
  });

  it("does not inject retrieval context for greeting query", async () => {
    const completionsCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "Hi there!" } }]
    });

    createMock.mockResolvedValue({
      chat: {
        completions: {
          create: completionsCreate
        }
      }
    });

    const results = [
      baseResult({
        url: "https://github.com/huggingface/transformers.js/",
        title: "huggingface/transformers.js",
        snippet: "BERT and Transformers in the browser.",
        score: 0.2037,
        reasons: ["semantic", "recent"],
        matchedChunkId: "chunk-greeting"
      })
    ];

    await answerFromResults({
      query: "hello",
      history: [],
      results
    });

    const request = completionsCreate.mock.calls[0]?.[0] as {
      messages: readonly { role: string; content: string }[];
    };
    const userMessage = request.messages[request.messages.length - 1];
    expect(userMessage?.role).toBe("user");
    expect(userMessage?.content).toBe("hello");
  });

  it("does not inject retrieval context for conversational identity prompts", async () => {
    const completionsCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "I am your local browsing assistant." } }]
    });

    createMock.mockResolvedValue({
      chat: {
        completions: {
          create: completionsCreate
        }
      }
    });

    const results = [
      baseResult({
        url: "https://www.youtube.com/",
        title: "YouTube",
        snippet: "Enjoy the videos and music you love.",
        score: 0.2443,
        reasons: ["semantic", "recent"],
        matchedChunkId: "chunk-youtube"
      })
    ];

    await answerFromResults({
      query: "who are you",
      history: [],
      results
    });

    const request = completionsCreate.mock.calls[0]?.[0] as {
      messages: readonly { role: string; content: string }[];
    };
    const userMessage = request.messages[request.messages.length - 1];
    expect(userMessage?.role).toBe("user");
    expect(userMessage?.content).toBe("who are you");
  });
});
