import type { ChunkEmbedding, KnowledgeChunk } from "@shame-the-web/shared";

export const EMBEDDING_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const FALLBACK_DIMS = 96;

type Embedder = (texts: readonly string[]) => Promise<readonly (readonly number[])[]>;

let embedderPromise: Promise<Embedder> | null = null;

export async function buildChunkEmbeddings(chunks: readonly KnowledgeChunk[]): Promise<ChunkEmbedding[]> {
  if (chunks.length === 0) {
    return [];
  }

  const embedder = await getEmbedder();
  const vectors = await embedder(chunks.map((chunk) => chunk.text));
  const now = new Date().toISOString();

  return chunks.map((chunk, index) => {
    const vector = vectors[index] ?? [];
    return {
      id: `${chunk.id}::${EMBEDDING_MODEL_ID}`,
      chunkId: chunk.id,
      pageUrl: chunk.pageUrl,
      model: EMBEDDING_MODEL_ID,
      dims: vector.length,
      vector,
      contentHash: chunk.contentHash,
      createdAt: now
    };
  });
}

export async function embedText(text: string): Promise<readonly number[]> {
  const embedder = await getEmbedder();
  const vectors = await embedder([text]);
  return vectors[0] ?? deterministicVector(text);
}

export function resetEmbeddingRuntime(): void {
  embedderPromise = null;
}

async function getEmbedder(): Promise<Embedder> {
  if (embedderPromise) {
    return embedderPromise;
  }
  embedderPromise = createEmbedder();
  return embedderPromise;
}

async function createEmbedder(): Promise<Embedder> {
  try {
    const module = await import("@huggingface/transformers");
    const pipelineFactory = module.pipeline as unknown;
    if (typeof pipelineFactory !== "function") {
      return fallbackEmbedder;
    }

    const embedWithDevice = async (device: "webgpu" | "wasm"): Promise<Embedder> => {
      const extractor = await (pipelineFactory as PipelineFactory)(
        "feature-extraction",
        EMBEDDING_MODEL_ID,
        { device }
      );
      return async (texts: readonly string[]): Promise<readonly (readonly number[])[]> => {
        if (texts.length === 0) return [];
        const output = await extractor(texts, { pooling: "mean", normalize: true });
        const listValue = (output as { tolist?: () => unknown }).tolist?.();
        const parsed = parseEmbeddingList(listValue);
        return parsed.length === texts.length ? parsed : fallbackEmbedder(texts);
      };
    };

    try {
      return await embedWithDevice("webgpu");
    } catch {
      return embedWithDevice("wasm");
    }
  } catch {
    return fallbackEmbedder;
  }
}

function parseEmbeddingList(value: unknown): readonly (readonly number[])[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((row) => parseEmbeddingRow(row))
    .filter((row): row is readonly number[] => row !== null);
}

function parseEmbeddingRow(value: unknown): readonly number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const parsed = value.map((item) => (typeof item === "number" ? item : Number.NaN)).filter((item) => !Number.isNaN(item));
  if (parsed.length === 0) {
    return null;
  }
  return normalize(parsed);
}

const fallbackEmbedder: Embedder = async (texts) => texts.map((text) => deterministicVector(text));

function deterministicVector(text: string): readonly number[] {
  const vector = Array.from({ length: FALLBACK_DIMS }, () => 0);
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const hash = stableHash(token);
    const slot = hash % FALLBACK_DIMS;
    vector[slot] += 1;
  }
  return normalize(vector);
}

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function normalize(values: readonly number[]): readonly number[] {
  const magnitude = Math.sqrt(values.reduce((acc, value) => acc + value * value, 0));
  if (magnitude === 0) {
    return values;
  }
  return values.map((value) => value / magnitude);
}

type PipelineFactory = (
  task: "feature-extraction",
  model: string,
  options: { device: "webgpu" | "wasm" }
) => Promise<
  (
    texts: readonly string[],
    options: { pooling: "mean"; normalize: true }
  ) => Promise<{ tolist?: () => unknown }>
>;
