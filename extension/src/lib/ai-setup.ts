import {
  DEFAULT_AI_SETUP_STATUS,
  type AiSetupStatus,
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
import { buildChunkEmbeddings, embedText, resetEmbeddingRuntime } from "./local-embeddings";
import { answerFromResults, primeLocalChatModel, resetLocalChatRuntime } from "./local-chat";
import { semanticSearchPages } from "./semantic-search";

type ProgressCallback = (status: AiSetupStatus) => void;

let status: AiSetupStatus = DEFAULT_AI_SETUP_STATUS;
let setupPromise: Promise<void> | null = null;

export function getAiSetupStatus(): AiSetupStatus {
  return status;
}

export async function ensureSearchReady(
  pages: readonly PageContent[],
  onProgress: ProgressCallback
): Promise<{ chunksReady: number; embeddingsReady: number }> {
  if (status.phase === "ready_search" && setupPromise === null) {
    const counts = await summarizeIndexCounts();
    if (counts.embeddingsReady > 0) {
      return counts;
    }
    status = {
      ...DEFAULT_AI_SETUP_STATUS,
      updatedAt: new Date().toISOString(),
      message: "Local model cache was cleared. Rebuilding semantic index."
    };
  }

  if (!setupPromise) {
    setupPromise = (async () => {
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

      // Prime embed runtime once to surface download/missing-cache state immediately.
      await embedText("warmup");

      let completed = 0;
      const total = pages.length;
      for (const page of pages) {
        const chunks = buildKnowledgeChunks(page);
        await storeKnowledgeChunks(page.url, chunks);
        const embeddings = await buildChunkEmbeddings(chunks);
        await storeChunkEmbeddings(page.url, embeddings);
        completed += 1;

        const progressPct = total > 0 ? Math.round((completed / total) * 100) : 100;
        setStatus(onProgress, {
          phase: "indexing",
          message: `Indexing your pages (${completed}/${total})…`,
          progressPct,
          current: completed,
          total
        });
      }

      setStatus(onProgress, {
        phase: "ready_search",
        message: "Local semantic search is ready.",
        progressPct: 100,
        current: total,
        total
      });
    })()
      .catch((error: unknown) => {
        setStatus(onProgress, {
          phase: "error",
          message: error instanceof Error ? error.message : "Local AI setup failed.",
          progressPct: null,
          current: null,
          total: null
        });
      })
      .finally(() => {
        setupPromise = null;
      });
  }

  await setupPromise;
  return summarizeIndexCounts();
}

export async function ensureConversationReady(onProgress: ProgressCallback): Promise<void> {
  if (status.phase === "ready_chat") {
    return;
  }
  setStatus(onProgress, {
    phase: "downloading_slm",
    message: "Downloading local conversation model…",
    progressPct: null,
    current: null,
    total: null
  });
  const ready = await primeLocalChatModel();
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
    phase: "error",
    message: "Local conversation model could not be initialized on this device.",
    progressPct: null,
    current: null,
    total: null
  });
}

export async function answerFromLocalKnowledge(input: {
  query: string;
  history: readonly { role: "system" | "user" | "assistant"; content: string }[];
  results: readonly SemanticSearchResult[];
}) {
  return answerFromResults(input);
}

export async function runSemanticSearch(input: {
  query: string;
  pages: readonly PageContent[];
  graph: import("@shame-the-web/shared").KnowledgeGraph | null;
}): Promise<SemanticSearchResult[]> {
  const [chunks, embeddings] = await Promise.all([getAllKnowledgeChunks(), getAllChunkEmbeddings()]);
  return semanticSearchPages({
    query: input.query,
    pages: input.pages,
    graph: input.graph,
    chunks,
    embeddings
  });
}

export function resetAiRuntime(): void {
  resetEmbeddingRuntime();
  resetLocalChatRuntime();
  status = DEFAULT_AI_SETUP_STATUS;
}

function setStatus(
  onProgress: ProgressCallback,
  next: Omit<AiSetupStatus, "updatedAt">
): void {
  status = { ...next, updatedAt: new Date().toISOString() };
  onProgress(status);
}

async function summarizeIndexCounts(): Promise<{ chunksReady: number; embeddingsReady: number }> {
  const [chunks, embeddings] = await Promise.all([getAllKnowledgeChunks(), getAllChunkEmbeddings()]);
  return {
    chunksReady: chunks.length,
    embeddingsReady: embeddings.length
  };
}
