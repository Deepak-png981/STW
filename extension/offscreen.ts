import {
  OFFSCREEN_AI_MESSAGE,
  isOffscreenAiEnvelope,
  type OffscreenAiReply,
  type OffscreenAiRequest,
  type OffscreenAiResponse
} from "./src/lib/offscreen-ai-protocol";
import { answerFromResults, primeLocalChatModel } from "./src/lib/local-chat";
import { rerankPairsInOffscreen } from "./src/lib/rerank-runtime";
import { embedTextsInOffscreen, resetTransformersRuntime, warmupTransformersRuntime } from "./src/lib/transformers-runtime";

const LOG_PREFIX = "[STW][offscreen]";

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isOffscreenAiEnvelope(message)) {
    return false;
  }

  const startedAt = performance.now();
  logOffscreen("message:start", summarizeRequest(message.request));
  void handleOffscreenAi(message.request)
    .then((response) => {
      logOffscreen("message:done", {
        ...summarizeRequest(message.request),
        ok: response.ok,
        durationMs: Math.round(performance.now() - startedAt)
      });
      const reply: OffscreenAiReply = {
        channel: OFFSCREEN_AI_MESSAGE,
        response
      };
      sendResponse(reply);
    })
    .catch((error: unknown) => {
      warnOffscreen("message:failed", {
        ...summarizeRequest(message.request),
        durationMs: Math.round(performance.now() - startedAt),
        error
      });
      const reply: OffscreenAiReply = {
        channel: OFFSCREEN_AI_MESSAGE,
        response: {
          ok: false,
          error: error instanceof Error ? error.message : "Offscreen AI handler failed."
        }
      };
      sendResponse(reply);
    });

  return true;
});

async function handleOffscreenAi(request: OffscreenAiRequest): Promise<OffscreenAiResponse> {
  switch (request.kind) {
    case "warmup":
      await warmupTransformersRuntime();
      return { ok: true };
    case "embedTexts": {
      const vectors = await embedTextsInOffscreen(request.texts);
      return { ok: true, vectors };
    }
    case "primeChat": {
      const ready = await primeLocalChatModel();
      return { ok: true, ready };
    }
    case "chatKnowledge": {
      const answer = await answerFromResults({
        query: request.query,
        history: request.history,
        results: request.results
      });
      return { ok: true, answer };
    }
    case "rerank": {
      const scores = await rerankPairsInOffscreen(request.query, request.snippets);
      return { ok: true, scores };
    }
    default: {
      const exhaustiveCheck: never = request;
      return { ok: false, error: `Unknown offscreen AI request: ${String(exhaustiveCheck)}` };
    }
  }
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

function logOffscreen(message: string, details?: unknown): void {
  if (details === undefined) {
    console.info(LOG_PREFIX, message);
    return;
  }
  console.info(LOG_PREFIX, message, details);
}

function warnOffscreen(message: string, details?: unknown): void {
  if (details === undefined) {
    console.warn(LOG_PREFIX, message);
    return;
  }
  console.warn(LOG_PREFIX, message, details);
}
