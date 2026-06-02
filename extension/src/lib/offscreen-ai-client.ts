import type { OffscreenAiEnvelope, OffscreenAiReply, OffscreenAiRequest, OffscreenAiResponse } from "./offscreen-ai-protocol";
import type { ChatMessage, ChatTurnResponse, SemanticSearchResult } from "@shame-the-web/shared";
import { OFFSCREEN_AI_MESSAGE, isOffscreenAiReply } from "./offscreen-ai-protocol";
import { ensureOffscreenDocument } from "./offscreen-runtime";

const LOG_PREFIX = "[STW][offscreen client]";

export async function requestOffscreenAi(request: OffscreenAiRequest): Promise<OffscreenAiResponse> {
  const startedAt = performance.now();
  logOffscreenClient("request:start", summarizeRequest(request));
  const hasOffscreen = await ensureOffscreenDocument();
  if (!hasOffscreen) {
    warnOffscreenClient("request:no-offscreen", summarizeRequest(request));
    return { ok: false, error: "Offscreen AI document is unavailable." };
  }

  const envelope: OffscreenAiEnvelope = {
    channel: OFFSCREEN_AI_MESSAGE,
    request
  };

  try {
    const reply = await chrome.runtime.sendMessage(envelope);
    if (!isOffscreenAiReply(reply)) {
      warnOffscreenClient("request:invalid-response", summarizeRequest(request));
      return { ok: false, error: "Offscreen AI returned an invalid response." };
    }
    logOffscreenClient("request:done", {
      ...summarizeRequest(request),
      ok: reply.response.ok,
      durationMs: Math.round(performance.now() - startedAt),
      hasVectors: reply.response.ok && reply.response.vectors !== undefined,
      hasAnswer: reply.response.ok && reply.response.answer !== undefined,
      ready: reply.response.ok ? reply.response.ready ?? null : null
    });
    return reply.response;
  } catch (error) {
    warnOffscreenClient("request:failed", {
      ...summarizeRequest(request),
      durationMs: Math.round(performance.now() - startedAt),
      error
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Offscreen AI request failed."
    };
  }
}

export async function embedTextsViaOffscreen(texts: readonly string[]): Promise<readonly (readonly number[])[]> {
  const response = await requestOffscreenAi({ kind: "embedTexts", texts });
  if (!response.ok || !response.vectors) {
    throw new Error(response.ok ? "Offscreen AI returned no vectors." : response.error);
  }
  return response.vectors;
}

export async function warmupOffscreenAi(): Promise<void> {
  const response = await requestOffscreenAi({ kind: "warmup" });
  if (!response.ok) {
    throw new Error(response.error);
  }
}

export async function primeChatViaOffscreen(): Promise<boolean> {
  const response = await requestOffscreenAi({ kind: "primeChat" });
  return response.ok && response.ready === true;
}

export async function rerankPairsViaOffscreen(
  query: string,
  snippets: readonly string[]
): Promise<readonly number[]> {
  const response = await requestOffscreenAi({ kind: "rerank", query, snippets });
  if (!response.ok || !response.scores) {
    throw new Error(response.ok ? "Offscreen AI returned no rerank scores." : response.error);
  }
  return response.scores;
}

export async function answerViaOffscreenChat(input: {
  query: string;
  history: readonly ChatMessage[];
  results: readonly SemanticSearchResult[];
}): Promise<ChatTurnResponse | null> {
  const response = await requestOffscreenAi({
    kind: "chatKnowledge",
    query: input.query,
    history: input.history,
    results: input.results
  });
  return response.ok ? response.answer ?? null : null;
}

function summarizeRequest(request: OffscreenAiRequest): Record<string, unknown> {
  switch (request.kind) {
    case "warmup":
      return { kind: request.kind };
    case "embedTexts":
      return { kind: request.kind, textCount: request.texts.length };
    case "primeChat":
      return { kind: request.kind };
    case "chatKnowledge":
      return {
        kind: request.kind,
        queryLength: request.query.length,
        historyLength: request.history.length,
        resultCount: request.results.length
      };
    case "rerank":
      return { kind: request.kind, queryLength: request.query.length, snippetCount: request.snippets.length };
    default: {
      const exhaustiveCheck: never = request;
      return { kind: String(exhaustiveCheck) };
    }
  }
}

function logOffscreenClient(message: string, details?: unknown): void {
  if (details === undefined) {
    console.info(LOG_PREFIX, message);
    return;
  }
  console.info(LOG_PREFIX, message, details);
}

function warnOffscreenClient(message: string, details?: unknown): void {
  if (details === undefined) {
    console.warn(LOG_PREFIX, message);
    return;
  }
  console.warn(LOG_PREFIX, message, details);
}
