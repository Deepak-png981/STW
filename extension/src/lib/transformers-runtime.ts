import { EMBEDDING_MODEL_ID } from "./embedding-model";
import { configureTransformersEnv } from "./transformers-env";

type Embedder = (texts: readonly string[]) => Promise<readonly (readonly number[])[]>;

type PipelineFactory = (
  task: "feature-extraction",
  model: string,
  options: { device: "wasm" }
) => Promise<
  (
    texts: readonly string[],
    options: { pooling: "mean"; normalize: true }
  ) => Promise<{ tolist?: () => unknown }>
>;

let embedderPromise: Promise<Embedder> | null = null;
const LOG_PREFIX = "[STW][transformers]";

export function resetTransformersRuntime(): void {
  logTransformers("reset");
  embedderPromise = null;
}

export async function embedTextsInOffscreen(texts: readonly string[]): Promise<readonly (readonly number[])[]> {
  logTransformers("embedTexts:start", { textCount: texts.length });
  const startedAt = performance.now();
  const embedder = await getEmbedder();
  const vectors = await embedder(texts);
  logTransformers("embedTexts:done", {
    textCount: texts.length,
    vectorCount: vectors.length,
    dims: vectors[0]?.length ?? 0,
    durationMs: Math.round(performance.now() - startedAt)
  });
  return vectors;
}

export async function warmupTransformersRuntime(): Promise<void> {
  logTransformers("warmup:start", { model: EMBEDDING_MODEL_ID });
  const startedAt = performance.now();
  const embedder = await getEmbedder();
  await embedder(["warmup"]);
  logTransformers("warmup:done", { durationMs: Math.round(performance.now() - startedAt) });
}

async function getEmbedder(): Promise<Embedder> {
  if (embedderPromise) {
    logTransformers("getEmbedder:reuse");
    return embedderPromise;
  }
  logTransformers("getEmbedder:create");
  embedderPromise = createEmbedder();
  return embedderPromise;
}

async function createEmbedder(): Promise<Embedder> {
  logTransformers("createEmbedder:import", { model: EMBEDDING_MODEL_ID });
  const startedAt = performance.now();
  const module = await import("@huggingface/transformers");
  configureTransformersEnv(module);
  logTransformers("createEmbedder:env-configured");
  const pipelineFactory = module.pipeline as unknown;
  if (typeof pipelineFactory !== "function") {
    throw new Error("Transformers pipeline factory is unavailable.");
  }

  const extractor = await (pipelineFactory as PipelineFactory)("feature-extraction", EMBEDDING_MODEL_ID, {
    device: "wasm"
  });
  logTransformers("createEmbedder:pipeline-ready", { durationMs: Math.round(performance.now() - startedAt) });

  return async (texts: readonly string[]): Promise<readonly (readonly number[])[]> => {
    if (texts.length === 0) {
      return [];
    }
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    const listValue = (output as { tolist?: () => unknown }).tolist?.();
    const parsed = parseEmbeddingList(listValue);
    if (parsed.length !== texts.length) {
      throw new Error("Embedding output count did not match input count.");
    }
    return parsed;
  };
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
  const parsed = value
    .map((item) => (typeof item === "number" ? item : Number.NaN))
    .filter((item) => !Number.isNaN(item));
  if (parsed.length === 0) {
    return null;
  }
  return normalize(parsed);
}

function normalize(values: readonly number[]): readonly number[] {
  const magnitude = Math.sqrt(values.reduce((acc, value) => acc + value * value, 0));
  if (magnitude === 0) {
    return values;
  }
  return values.map((value) => value / magnitude);
}

function logTransformers(message: string, details?: unknown): void {
  if (details === undefined) {
    console.info(LOG_PREFIX, message);
    return;
  }
  console.info(LOG_PREFIX, message, details);
}
