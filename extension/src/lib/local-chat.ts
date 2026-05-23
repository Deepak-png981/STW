import type { ChatMessage, ChatSource, ChatTurnResponse, SemanticSearchResult } from "@shame-the-web/shared";

const WEBLLM_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const LOG_PREFIX = "[STW][local chat]";
const MAX_HISTORY_MESSAGES = 12;

const SYSTEM_PROMPT = [
  "You are a private local assistant for the user's browsing history.",
  "Answer using this priority:",
  "1) Facts explicitly stated earlier in this conversation.",
  "2) Relevant snippets from the user's local browsing graph when provided.",
  "3) If neither source is enough, say so clearly.",
  "Use complete sentences. Keep answers as detailed as you can please."
].join(" ");

type ChatEngine = {
  chat: {
    completions: {
      create: (request: {
        messages: readonly { role: "system" | "user" | "assistant"; content: string }[];
        temperature: number;
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
  const sources = buildSources(input.results);
  const turn: LocalChatTurn = {
    query: input.query,
    history: input.history,
    sources
  };

  const engine = await getEngine();
  if (!engine) {
    logChat("answer:fallback-no-engine", { sourceCount: sources.length });
    return {
      model: "fallback-template",
      text: buildFallbackAnswer(turn),
      sources
    };
  }

  try {
    logChat("answer:model-start", {
      sourceCount: sources.length,
      historyLength: input.history.length,
      queryLength: input.query.length
    });
    const startedAt = performance.now();
    const messages = buildModelMessages(turn);
    const response = await engine.chat.completions.create({
      messages,
      temperature: 0.2
    });
    const text = response.choices?.[0]?.message?.content?.trim();
    const useFallback = !text || text.length === 0 || isLowQualityReply(text);
    logChat("answer:model-done", {
      hasText: !!text,
      useFallback,
      durationMs: Math.round(performance.now() - startedAt)
    });
    return {
      model: WEBLLM_MODEL_ID,
      text: useFallback ? buildFallbackAnswer(turn) : text,
      sources
    };
  } catch (error) {
    warnChat("answer:model-failed; using fallback", error);
    return {
      model: "fallback-template",
      text: buildFallbackAnswer(turn),
      sources
    };
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

  return [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: currentUserMessage }];
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

function buildFallbackAnswer(turn: LocalChatTurn): string {
  const top = turn.sources[0];
  if (!top || !normalizeSnippet(top.snippet)) {
    return [
      `I could not produce a confident answer for "${turn.query}" from this conversation or your browsing graph.`,
      turn.history.length > 0
        ? "Try asking a follow-up with more detail from earlier in this chat."
        : "Try searching with a keyword or browse the page again so it gets indexed."
    ].join(" ");
  }

  const snippet = normalizeSnippet(top.snippet);
  const related = turn.sources.slice(1, 3).map((source) => source.title).join(", ");
  return [
    `Based on your local browsing history, the strongest match for "${turn.query}" is "${top.title}".`,
    snippet ? `What I found on that page: ${snippet}` : "",
    related ? `Related pages: ${related}.` : "",
    "Ask a follow-up and I can narrow this down further."
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

function normalizeSnippet(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isLowQualityReply(value: string): boolean {
  const normalized = value.trim();
  if (normalized.length < 18) {
    return true;
  }
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return wordCount < 4;
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
