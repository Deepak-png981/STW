import type { ChunkEmbedding, KnowledgeChunk } from "@shame-the-web/shared";

import { EMBEDDING_MODEL_ID } from "./embedding-model";
import { embedTextsViaOffscreen, warmupOffscreenAi } from "./offscreen-ai-client";

export { EMBEDDING_MODEL_ID };

const FALLBACK_DIMS = 96;

export async function buildChunkEmbeddings(chunks: readonly KnowledgeChunk[]): Promise<ChunkEmbedding[]> {
  if (chunks.length === 0) {
    return [];
  }

  const vectors = await embedWithFallback(chunks.map((chunk) => chunk.text));
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
  const vectors = await embedWithFallback([text]);
  return vectors[0] ?? deterministicVector(text);
}

export function resetEmbeddingRuntime(): void {
  // Offscreen runtime resets when the offscreen document is recreated.
}

export async function warmupEmbeddingRuntime(): Promise<void> {
  await warmupOffscreenAi();
}

async function embedWithFallback(texts: readonly string[]): Promise<readonly (readonly number[])[]> {
  try {
    return await embedTextsViaOffscreen(texts);
  } catch {
    return texts.map((text) => deterministicVector(text));
  }
}

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
