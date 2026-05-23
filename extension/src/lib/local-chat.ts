import type { ChatMessage, ChatSource, ChatTurnResponse, SemanticSearchResult } from "@shame-the-web/shared";

import {
  logChatDebug,
  summarizeModelMessages,
  summarizeSearchResults,
  summarizeSources
} from "./chat-debug";
import { selectChatGroundingResults, shouldAttachBrowsingContext } from "./chat-grounding";
import { LOCAL_CHAT_SYSTEM_PROMPT } from "./chat-reply-quality";

const WEBLLM_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const LOG_PREFIX = "[STW][local chat]";
const MAX_HISTORY_MESSAGES = 6;
const MAX_COMPLETION_TOKENS = 256;

type ChatEngine = {
  chat: {
    completions: {
      create: (request: {
        messages: readonly { role: "system" | "user" | "assistant"; content: string }[];
        temperature: number;
        max_tokens?: number;
        stream?: false;
      }) => Promise<{
        choices?: readonly {
          message?: {
            content?: string;
          };
        }[];
      }>;
    };
  };
};

type LocalChatTurn = {
  query: string;
  history: readonly ChatMessage[];
  sources: readonly ChatSource[];
};

let enginePromise: Promise<ChatEngine | null> | null = null;

export function getChatModelId(): string {
  return WEBLLM_MODEL_ID;
}

export function resetLocalChatRuntime(): void {
  logChat("reset");
  enginePromise = null;
}

export async function primeLocalChatModel(): Promise<boolean> {
  logChat("prime:start", { model: WEBLLM_MODEL_ID });
  const engine = await getEngine();
  const ready = engine !== null;
  logChat("prime:done", { ready });
  return ready;
}

export async function answerFromResults(input: {
  query: string;
  history: readonly ChatMessage[];
  results: readonly SemanticSearchResult[];
}): Promise<ChatTurnResponse> {
  const groundedResults = selectChatGroundingResults(input.results);
  const retrievedSources = buildSources(groundedResults);
  const attachContext = shouldAttachBrowsingContext(input.query, input.results);
  const sources = attachContext ? retrievedSources : [];
  const turn: LocalChatTurn = {
    query: input.query,
    history: input.history,
    sources
  };

  logChatDebug("offscreen:retrieval", {
    ...describeTurn(input),
    groundedResultCount: groundedResults.length,
    attachContext,
    retrieval: summarizeSearchResults(input.results),
    groundedResults: summarizeSearchResults(groundedResults),
    retrievedSources: summarizeSources(retrievedSources),
    attachedSources: summarizeSources(sources)
  });

  if (sources.length > 0 && isHistoryLookupQuery(input.query)) {
    const text = buildHistoryLookupAnswer(input.query, sources);
    logChatDebug("offscreen:history-lookup-response", {
      query: input.query,
      sourceCount: sources.length,
      replyPreview: previewReply(text)
    });
    return {
      model: "grounded-retrieval",
      text,
      sources
    };
  }

  const engine = await getEngine();
  if (!engine) {
    throw new Error("Local chat model is unavailable.");
  }

  try {
    logChat("answer:model-start", {
      sourceCount: sources.length,
      historyLength: input.history.length,
      queryLength: input.query.length
    });
    const startedAt = performance.now();
    const messages = buildModelMessages(turn);
    logChatDebug("offscreen:prompt", {
      query: input.query,
      messageCount: messages.length,
      messages: summarizeModelMessages(messages)
    });
    const response = await engine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: MAX_COMPLETION_TOKENS,
      stream: false
    });
    const text = response.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("Local model returned an empty response.");
    }
    logChatDebug("offscreen:completion", {
      query: input.query,
      hasText: !!text,
      replyPreview: text ? previewReply(text) : null,
      durationMs: Math.round(performance.now() - startedAt)
    });
    logChat("answer:model-done", {
      hasText: !!text,
      groundedSourceCount: sources.length,
      durationMs: Math.round(performance.now() - startedAt)
    });
    return {
      model: WEBLLM_MODEL_ID,
      text,
      sources
    };
  } catch (error) {
    warnChat("answer:model-failed", error);
    throw error;
  }
}

function buildModelMessages(
  turn: LocalChatTurn
): readonly { role: "system" | "user" | "assistant"; content: string }[] {
  const history = normalizeHistory(turn.history);
  const browsingContext = formatBrowsingContext(turn.sources);
  const currentUserMessage =
    browsingContext.length > 0
      ? `${turn.query}\n\nRelevant pages from your local browsing graph:\n${browsingContext}`
      : turn.query;

  return [
    { role: "system", content: LOCAL_CHAT_SYSTEM_PROMPT },
    ...history,
    { role: "user", content: currentUserMessage }
  ];
}

function normalizeHistory(history: readonly ChatMessage[]): readonly ChatMessage[] {
  return history.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
    role: message.role === "system" ? "system" : message.role === "assistant" ? "assistant" : "user",
    content: message.content
  }));
}

function formatBrowsingContext(sources: readonly ChatSource[]): string {
  if (sources.length === 0) {
    return "";
  }
  return sources
    .map((source, index) => `Source ${index + 1}: ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet}`)
    .join("\n\n");
}

function buildSources(results: readonly SemanticSearchResult[]): readonly ChatSource[] {
  return results.slice(0, 5).map((result) => ({
    url: result.url,
    title: result.title || result.hostname,
    snippet: result.snippet
  }));
}

function isHistoryLookupQuery(query: string): boolean {
  const normalized = query.toLowerCase();
  const asksForPlace = /\b(where|which|what)\b/.test(normalized);
  const asksForSource = /\b(read|saw|visit|visited|page|link|url|source|find|look up|lookup)\b/.test(normalized);
  return asksForPlace && asksForSource;
}

function buildHistoryLookupAnswer(query: string, sources: readonly ChatSource[]): string {
  const top = sources[0];
  if (!top) {
    return `I couldn't find a matching page in your local history for "${query}".`;
  }

  const related = sources
    .slice(1, 3)
    .map((source) => `${source.title} (${source.url})`)
    .join("; ");
  const snippet = top.snippet.trim();

  return [
    `You likely read that on "${top.title}".`,
    `URL: ${top.url}`,
    snippet ? `Snippet: ${snippet}` : "",
    related ? `Related pages: ${related}.` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

async function getEngine(): Promise<ChatEngine | null> {
  if (enginePromise) {
    logChat("getEngine:reuse");
    return enginePromise;
  }
  logChat("getEngine:create");
  enginePromise = createEngine();
  return enginePromise;
}

async function createEngine(): Promise<ChatEngine | null> {
  try {
    const startedAt = performance.now();
    logChat("createEngine:import", { model: WEBLLM_MODEL_ID });
    const module = await import("@mlc-ai/web-llm");
    const createEngine = resolveCreateEngine(module);
    if (!createEngine) {
      warnChat("createEngine:factory-missing");
      return null;
    }
    const engine = await createEngine(WEBLLM_MODEL_ID, {});
    const ready = isChatEngine(engine);
    logChat("createEngine:done", {
      ready,
      durationMs: Math.round(performance.now() - startedAt)
    });
    return ready ? engine : null;
  } catch (error) {
    warnChat("createEngine:failed", error);
    return null;
  }
}

function resolveCreateEngine(module: unknown):
  | ((model: string, options: Record<string, unknown>) => Promise<unknown>)
  | null {
  if (!module || typeof module !== "object") {
    return null;
  }
  const candidate = module as Record<string, unknown>;
  const fn = candidate["CreateMLCEngine"];
  return typeof fn === "function"
    ? (fn as (model: string, options: Record<string, unknown>) => Promise<unknown>)
    : null;
}

function isChatEngine(value: unknown): value is ChatEngine {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const chat = candidate["chat"];
  if (!chat || typeof chat !== "object") {
    return false;
  }
  const completions = (chat as Record<string, unknown>)["completions"];
  if (!completions || typeof completions !== "object") {
    return false;
  }
  return typeof (completions as Record<string, unknown>)["create"] === "function";
}

function describeTurn(input: {
  query: string;
  history: readonly ChatMessage[];
  results: readonly SemanticSearchResult[];
}): Record<string, unknown> {
  return {
    query: input.query,
    historyLength: input.history.length,
    rawResultCount: input.results.length
  };
}

function previewReply(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 240) {
    return normalized;
  }
  return `${normalized.slice(0, 240).trim()}…`;
}

function logChat(message: string, details?: unknown): void {
  if (details === undefined) {
    console.info(LOG_PREFIX, message);
    return;
  }
  console.info(LOG_PREFIX, message, details);
}

function warnChat(message: string, details?: unknown): void {
  if (details === undefined) {
    console.warn(LOG_PREFIX, message);
    return;
  }
  console.warn(LOG_PREFIX, message, details);
}
