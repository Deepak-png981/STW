import {
  DEFAULT_AI_SETUP_STATUS,
  type AiSetupStatus,
  type ChatTurnResponse,
  type PageContent,
  type SemanticSearchResult
} from "@shame-the-web/shared";
import {
  getAllChunkEmbeddings,
  getAllKnowledgeChunks,
  storeChunkEmbeddings,
  storeKnowledgeChunks
} from "./content-storage";
import { buildKnowledgeChunks } from "./knowledge-chunks";
import { buildChunkEmbeddings, resetEmbeddingRuntime, warmupEmbeddingRuntime } from "./local-embeddings";
import { answerViaOffscreenChat, primeChatViaOffscreen } from "./offscreen-ai-client";
import { semanticSearchPages } from "./semantic-search";

type ProgressCallback = (status: AiSetupStatus) => void;
type IndexState = {
  chunksReady: number;
  embeddingsReady: number;
  indexedPageCount: number;
  totalPages: number;
  allPagesIndexed: boolean;
};

const LOG_PREFIX = "[STW][AI setup]";

const runtimeState: {
  status: AiSetupStatus;
  setupPromise: Promise<void> | null;
  chatSetupPromise: Promise<void> | null;
} = {
  status: DEFAULT_AI_SETUP_STATUS,
  setupPromise: null,
  chatSetupPromise: null
};

export function getAiSetupStatus(): AiSetupStatus {
  return runtimeState.status;
}

export async function ensureSearchReady(
  pages: readonly PageContent[],
  onProgress: ProgressCallback
): Promise<{ chunksReady: number; embeddingsReady: number }> {
  const indexState = await summarizeIndexState(pages);
  logAi("ensureSearchReady", {
    phase: runtimeState.status.phase,
    setupRunning: runtimeState.setupPromise !== null,
    ...indexState
  });

  if (indexState.allPagesIndexed && runtimeState.setupPromise === null) {
    logAi("search index already complete; skipping embedding rebuild", indexState);
    if (runtimeState.status.phase === "idle" || runtimeState.status.phase === "error") {
      setStatus(onProgress, {
        phase: "ready_search",
        message: "Local semantic search is ready.",
        progressPct: 100,
        current: indexState.totalPages,
        total: indexState.totalPages
      });
    }
    return {
      chunksReady: indexState.chunksReady,
      embeddingsReady: indexState.embeddingsReady
    };
  }

  if (!runtimeState.setupPromise) {
    logAi("starting search setup", { pageCount: pages.length });
    runtimeState.setupPromise = (async () => {
      if (pages.length === 0) {
        setStatus(onProgress, {
          phase: "ready_search",
          message: "Local search is ready. Start browsing to build your graph.",
          progressPct: 100,
          current: 0,
          total: 0
        });
        return;
      }

      setStatus(onProgress, {
        phase: "downloading_embed",
        message: "Downloading local embedding model…",
        progressPct: null,
        current: null,
        total: null
      });

      // Prime embed runtime in offscreen document (WASM cannot run in the service worker).
      await warmupEmbeddingRuntime();
      logAi("embedding runtime warmed");

      const total = pages.length;
      await pages.reduce(async (previous, page, index) => {
        await previous;
        const chunks = buildKnowledgeChunks(page);
        await storeKnowledgeChunks(page.url, chunks);
        const embeddings = await buildChunkEmbeddings(chunks);
        await storeChunkEmbeddings(page.url, embeddings);

        const completed = index + 1;
        logAi("indexed page", {
          completed,
          total,
          chunkCount: chunks.length,
          embeddingCount: embeddings.length
        });
        const progressPct = total > 0 ? Math.round((completed / total) * 100) : 100;
        setStatus(onProgress, {
          phase: "indexing",
          message: `Indexing your pages (${completed}/${total})…`,
          progressPct,
          current: completed,
          total
        });
      }, Promise.resolve());

      setStatus(onProgress, {
        phase: "ready_search",
        message: "Local semantic search is ready.",
        progressPct: 100,
        current: total,
        total
      });
    })()
      .catch((error: unknown) => {
        warnAi("search setup failed", error);
        setStatus(onProgress, {
          phase: "error",
          message: error instanceof Error ? error.message : "Local AI setup failed.",
          progressPct: null,
          current: null,
          total: null
        });
      })
      .finally(() => {
        logAi("search setup settled");
        runtimeState.setupPromise = null;
      });
  } else {
    logAi("reusing existing search setup promise");
  }

  await runtimeState.setupPromise;
  return summarizeIndexCounts();
}

export async function ensureConversationReady(onProgress: ProgressCallback): Promise<void> {
  if (runtimeState.status.phase === "ready_chat") {
    logAi("chat already ready; skipping setup");
    return;
  }

  if (!runtimeState.chatSetupPromise) {
    logAi("starting chat setup", { currentPhase: runtimeState.status.phase });
    runtimeState.chatSetupPromise = (async () => {
      setStatus(onProgress, {
        phase: "downloading_slm",
        message: "Preparing local conversation model…",
        progressPct: null,
        current: null,
        total: null
      });
      const ready = await primeChatViaOffscreen();
      logAi("chat setup response", { ready });
      if (ready) {
        setStatus(onProgress, {
          phase: "ready_chat",
          message: "Local conversation model is ready.",
          progressPct: 100,
          current: null,
          total: null
        });
        return;
      }
      setStatus(onProgress, {
        phase: "ready_search",
        message: "Semantic search is ready. Chat will answer from retrieved snippets on this device.",
        progressPct: 100,
        current: null,
        total: null
      });
    })().finally(() => {
      logAi("chat setup settled");
      runtimeState.chatSetupPromise = null;
    });
  } else {
    logAi("reusing existing chat setup promise");
  }

  return runtimeState.chatSetupPromise;
}

export async function answerFromLocalKnowledge(input: {
  query: string;
  history: readonly { role: "system" | "user" | "assistant"; content: string }[];
  results: readonly SemanticSearchResult[];
}): Promise<ChatTurnResponse> {
  logAi("answerFromLocalKnowledge", {
    resultCount: input.results.length,
    historyLength: input.history.length,
    queryLength: input.query.length
  });
  const answer = await answerViaOffscreenChat(input);
  if (answer) {
    logAi("offscreen chat answered", { model: answer.model, sourceCount: answer.sources.length });
    return answer;
  }
  logAi("offscreen chat unavailable; using fallback template");

  const sources = input.results.slice(0, 5).map((result) => ({
    url: result.url,
    title: result.title || result.hostname,
    snippet: result.snippet
  }));
  const top = sources[0];
  return {
    model: "fallback-template",
    sources,
    text: top
      ? [
          `From your recent browsing history, the strongest match is "${top.title}".`,
          top.snippet ? `Relevant snippet: ${top.snippet}` : "",
          sources.length > 1
            ? `Related sources: ${sources
                .slice(1, 3)
                .map((source) => source.title)
                .join(", ")}.`
            : ""
        ]
          .filter(Boolean)
          .join(" ")
      : `I could not find enough context in your local knowledge graph for: "${input.query}". Try a broader query or browse the page again.`
  };
}

export async function runSemanticSearch(input: {
  query: string;
  pages: readonly PageContent[];
  graph: import("@shame-the-web/shared").KnowledgeGraph | null;
}): Promise<SemanticSearchResult[]> {
  const [chunks, embeddings] = await Promise.all([getAllKnowledgeChunks(), getAllChunkEmbeddings()]);
  logAi("runSemanticSearch", {
    queryLength: input.query.length,
    pageCount: input.pages.length,
    chunkCount: chunks.length,
    embeddingCount: embeddings.length,
    hasGraph: input.graph !== null
  });
  return semanticSearchPages({
    query: input.query,
    pages: input.pages,
    graph: input.graph,
    chunks,
    embeddings
  });
}

export function resetAiRuntime(): void {
  logAi("reset runtime");
  resetEmbeddingRuntime();
  runtimeState.status = DEFAULT_AI_SETUP_STATUS;
  runtimeState.setupPromise = null;
  runtimeState.chatSetupPromise = null;
}

function setStatus(
  onProgress: ProgressCallback,
  next: Omit<AiSetupStatus, "updatedAt">
): void {
  runtimeState.status = { ...next, updatedAt: new Date().toISOString() };
  logAi("status", {
    phase: runtimeState.status.phase,
    progressPct: runtimeState.status.progressPct,
    current: runtimeState.status.current,
    total: runtimeState.status.total,
    message: runtimeState.status.message
  });
  onProgress(runtimeState.status);
}

async function summarizeIndexCounts(): Promise<{ chunksReady: number; embeddingsReady: number }> {
  const [chunks, embeddings] = await Promise.all([getAllKnowledgeChunks(), getAllChunkEmbeddings()]);
  return {
    chunksReady: chunks.length,
    embeddingsReady: embeddings.length
  };
}

async function summarizeIndexState(pages: readonly PageContent[]): Promise<IndexState> {
  const [chunks, embeddings] = await Promise.all([getAllKnowledgeChunks(), getAllChunkEmbeddings()]);
  const embeddingKeys = new Set(embeddings.map((embedding) => `${embedding.chunkId}:${embedding.contentHash}`));
  const pageIndexStates = pages.map((page) => {
    const expectedChunks = buildKnowledgeChunks(page);
    return (
      expectedChunks.length > 0 &&
      expectedChunks.every((chunk) => embeddingKeys.has(`${chunk.id}:${chunk.contentHash}`))
    );
  });
  const indexedPageCount = pageIndexStates.filter(Boolean).length;

  return {
    chunksReady: chunks.length,
    embeddingsReady: embeddings.length,
    indexedPageCount,
    totalPages: pages.length,
    allPagesIndexed: pages.length === 0 || indexedPageCount === pages.length
  };
}

function logAi(message: string, details?: unknown): void {
  if (details === undefined) {
    console.info(LOG_PREFIX, message);
    return;
  }
  console.info(LOG_PREFIX, message, details);
}

function warnAi(message: string, details?: unknown): void {
  if (details === undefined) {
    console.warn(LOG_PREFIX, message);
    return;
  }
  console.warn(LOG_PREFIX, message, details);
}
