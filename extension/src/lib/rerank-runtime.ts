import { RERANK_MODEL_ID } from "./rerank-config";
import { configureTransformersEnv } from "./transformers-env";

/**
 * Offscreen-document cross-encoder runtime. Loaded lazily on the first `rerank` request,
 * so the model is only downloaded when the user opted into "Better answers".
 */
type CrossEncoder = (query: string, snippets: readonly string[]) => Promise<readonly number[]>;

type Tokenizer = {
  (
    texts: readonly string[],
    options: { text_pair: readonly string[]; padding: true; truncation: true }
  ): unknown;
};

type SequenceModel = (inputs: unknown) => Promise<{ logits?: { sigmoid?: () => { tolist?: () => unknown } } }>;

const LOG_PREFIX = "[STW][rerank runtime]";

let crossEncoderPromise: Promise<CrossEncoder> | null = null;

export function resetRerankRuntime(): void {
  logRerank("reset");
  crossEncoderPromise = null;
}

export async function rerankPairsInOffscreen(
  query: string,
  snippets: readonly string[]
): Promise<readonly number[]> {
  if (snippets.length === 0) {
    return [];
  }
  logRerank("rerank:start", { snippetCount: snippets.length });
  const startedAt = performance.now();
  const crossEncoder = await getCrossEncoder();
  const scores = await crossEncoder(query, snippets);
  logRerank("rerank:done", {
    snippetCount: snippets.length,
    scoreCount: scores.length,
    durationMs: Math.round(performance.now() - startedAt)
  });
  return scores;
}

async function getCrossEncoder(): Promise<CrossEncoder> {
  if (crossEncoderPromise) {
    logRerank("getCrossEncoder:reuse");
    return crossEncoderPromise;
  }
  logRerank("getCrossEncoder:create");
  crossEncoderPromise = createCrossEncoder();
  return crossEncoderPromise;
}

async function createCrossEncoder(): Promise<CrossEncoder> {
  logRerank("createCrossEncoder:import", { model: RERANK_MODEL_ID });
  const startedAt = performance.now();
  const module = await import("@huggingface/transformers");
  configureTransformersEnv(module as never);

  const moduleRecord = module as unknown as Record<string, unknown>;
  const modelFactory = moduleRecord["AutoModelForSequenceClassification"];
  const tokenizerFactory = moduleRecord["AutoTokenizer"];
  if (!hasFromPretrained(modelFactory) || !hasFromPretrained(tokenizerFactory)) {
    throw new Error("Transformers sequence-classification factories are unavailable.");
  }

  const [model, tokenizer] = await Promise.all([
    modelFactory.from_pretrained(RERANK_MODEL_ID) as Promise<SequenceModel>,
    tokenizerFactory.from_pretrained(RERANK_MODEL_ID) as Promise<Tokenizer>
  ]);
  logRerank("createCrossEncoder:ready", { durationMs: Math.round(performance.now() - startedAt) });

  return async (query: string, snippets: readonly string[]): Promise<readonly number[]> => {
    const queries = snippets.map(() => query);
    const inputs = tokenizer(queries, { text_pair: snippets, padding: true, truncation: true });
    const output = await model(inputs);
    const listValue = output.logits?.sigmoid?.().tolist?.();
    return parseScores(listValue, snippets.length);
  };
}

function hasFromPretrained(
  value: unknown
): value is { from_pretrained: (model: string) => Promise<unknown> } {
  return (
    typeof value === "function" &&
    typeof (value as { from_pretrained?: unknown }).from_pretrained === "function"
  );
}

function parseScores(value: unknown, expectedCount: number): readonly number[] {
  if (!Array.isArray(value) || value.length !== expectedCount) {
    throw new Error("Cross-encoder produced an unexpected score shape.");
  }
  return value.map((row) => {
    const score = Array.isArray(row) ? row[0] : row;
    return typeof score === "number" && !Number.isNaN(score) ? score : 0;
  });
}

function logRerank(message: string, details?: unknown): void {
  if (details === undefined) {
    console.info(LOG_PREFIX, message);
    return;
  }
  console.info(LOG_PREFIX, message, details);
}
