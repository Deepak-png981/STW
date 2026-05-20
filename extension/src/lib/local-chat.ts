import type { ChatMessage, ChatSource, ChatTurnResponse, SemanticSearchResult } from "@shame-the-web/shared";

const WEBLLM_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

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

let enginePromise: Promise<ChatEngine | null> | null = null;

export function getChatModelId(): string {
  return WEBLLM_MODEL_ID;
}

export function resetLocalChatRuntime(): void {
  enginePromise = null;
}

export async function primeLocalChatModel(): Promise<boolean> {
  const engine = await getEngine();
  return engine !== null;
}

export async function answerFromResults(input: {
  query: string;
  history: readonly ChatMessage[];
  results: readonly SemanticSearchResult[];
}): Promise<ChatTurnResponse> {
  const sources = buildSources(input.results);
  const engine = await getEngine();
  if (!engine) {
    return {
      model: "fallback-template",
      text: buildFallbackAnswer(input.query, sources),
      sources
    };
  }

  const systemPrompt = [
    "You are a private local assistant for browsing history search.",
    "Only answer from the provided context snippets.",
    "If context is insufficient, say that clearly.",
    "Keep answers concise and include concrete source references."
  ].join(" ");

  const context = sources
    .map((source, index) => `Source ${index + 1}: ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet}`)
    .join("\n\n");
  const userPrompt = `Question: ${input.query}\n\nContext:\n${context}`;

  try {
    const response = await engine.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...input.history.map((message) => ({
          role: message.role === "system" ? "system" : message.role === "assistant" ? "assistant" : "user",
          content: message.content
        })),
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2
    });
    const text = response.choices?.[0]?.message?.content?.trim();
    return {
      model: WEBLLM_MODEL_ID,
      text: text && text.length > 0 ? text : buildFallbackAnswer(input.query, sources),
      sources
    };
  } catch {
    return {
      model: "fallback-template",
      text: buildFallbackAnswer(input.query, sources),
      sources
    };
  }
}

function buildSources(results: readonly SemanticSearchResult[]): readonly ChatSource[] {
  return results.slice(0, 5).map((result) => ({
    url: result.url,
    title: result.title || result.hostname,
    snippet: result.snippet
  }));
}

async function getEngine(): Promise<ChatEngine | null> {
  if (enginePromise) {
    return enginePromise;
  }
  enginePromise = createEngine();
  return enginePromise;
}

async function createEngine(): Promise<ChatEngine | null> {
  try {
    const module = await import("@mlc-ai/web-llm");
    const createEngine = resolveCreateEngine(module);
    if (!createEngine) {
      return null;
    }
    const engine = await createEngine(WEBLLM_MODEL_ID, {});
    return isChatEngine(engine) ? engine : null;
  } catch {
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

function buildFallbackAnswer(query: string, sources: readonly ChatSource[]): string {
  if (sources.length === 0) {
    return `I could not find enough context in your local knowledge graph for: "${query}". Try a broader query or browse the page again.`;
  }
  const top = sources[0];
  const extra = sources.slice(1, 3).map((source) => source.title).join(", ");
  return [
    `From your recent browsing history, the strongest match is "${top.title}".`,
    top.snippet ? `Relevant snippet: ${top.snippet}` : "",
    extra ? `Related sources: ${extra}.` : ""
  ]
    .filter(Boolean)
    .join(" ");
}
