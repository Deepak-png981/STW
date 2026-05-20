import type {
  ChunkEmbedding,
  KnowledgeChunk,
  KnowledgeGraph,
  PageContent,
  SemanticReason,
  SemanticSearchResult
} from "@shame-the-web/shared";
import { searchPages } from "./tfidf";
import { embedText } from "./local-embeddings";

const MAX_RESULTS = 10;

type RankedChunk = {
  pageUrl: string;
  chunkId: string;
  snippet: string;
  semanticScore: number;
};

export async function semanticSearchPages(input: {
  query: string;
  pages: readonly PageContent[];
  graph: KnowledgeGraph | null;
  chunks: readonly KnowledgeChunk[];
  embeddings: readonly ChunkEmbedding[];
}): Promise<SemanticSearchResult[]> {
  const query = input.query.trim();
  if (!query) {
    return [];
  }
  if (input.pages.length === 0) {
    return [];
  }

  const queryVector = await embedText(query);
  const chunkById = new Map(input.chunks.map((chunk) => [chunk.id, chunk]));
  const rankedChunks = rankChunks(queryVector, input.embeddings, chunkById);
  const bestChunkByPage = new Map<string, RankedChunk>();

  for (const rankedChunk of rankedChunks) {
    const existing = bestChunkByPage.get(rankedChunk.pageUrl);
    if (!existing || rankedChunk.semanticScore > existing.semanticScore) {
      bestChunkByPage.set(rankedChunk.pageUrl, rankedChunk);
    }
  }

  const keywordResults = searchPages(query, [...input.pages]);
  const keywordScoreByUrl = new Map(keywordResults.map((result) => [result.url, result.score]));
  const graphBoostByUrl = buildGraphBoost(input.graph, new Set(bestChunkByPage.keys()));
  const visitCountByUrl = new Map(input.graph?.nodes.map((node) => [node.url, node.visitCount]) ?? []);

  const now = Date.now();
  const scored = input.pages
    .map((page): SemanticSearchResult | null => {
      const bestChunk = bestChunkByPage.get(page.url);
      const semanticScore = bestChunk?.semanticScore ?? 0;
      const keywordScore = keywordScoreByUrl.get(page.url) ?? 0;
      const graphBoost = graphBoostByUrl.get(page.url) ?? 0;
      const visitCount = visitCountByUrl.get(page.url) ?? 1;
      const recencyBoost = recencyWeight(page.visitedAt, now);
      const visitedBoost = Math.min(1, Math.log2(visitCount + 1) / 4);
      const total =
        semanticScore * 0.6 + keywordScore * 0.22 + graphBoost * 0.1 + recencyBoost * 0.05 + visitedBoost * 0.03;
      if (total <= 0) {
        return null;
      }

      const reasons = buildReasons(semanticScore, keywordScore, graphBoost, recencyBoost, visitedBoost);
      return {
        url: page.url,
        title: page.title,
        hostname: safeHostname(page.url),
        lastVisited: page.visitedAt,
        snippet: bestChunk?.snippet ?? keywordResults.find((result) => result.url === page.url)?.snippet ?? "",
        score: total,
        reasons,
        matchedChunkId: bestChunk?.chunkId ?? null
      };
    })
    .filter((item): item is SemanticSearchResult => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  return scored;
}

function rankChunks(
  queryVector: readonly number[],
  embeddings: readonly ChunkEmbedding[],
  chunkById: ReadonlyMap<string, KnowledgeChunk>
): RankedChunk[] {
  const ranked: RankedChunk[] = [];
  for (const embedding of embeddings) {
    const chunk = chunkById.get(embedding.chunkId);
    if (!chunk) {
      continue;
    }
    const semanticScore = cosineSimilarity(queryVector, embedding.vector);
    if (semanticScore <= 0) {
      continue;
    }
    ranked.push({
      pageUrl: chunk.pageUrl,
      chunkId: chunk.id,
      snippet: buildSnippet(chunk.text, 180),
      semanticScore
    });
  }
  return ranked.sort((a, b) => b.semanticScore - a.semanticScore);
}

function buildGraphBoost(graph: KnowledgeGraph | null, strongMatchUrls: ReadonlySet<string>): Map<string, number> {
  if (!graph) {
    return new Map<string, number>();
  }

  const boost = new Map<string, number>();
  for (const edge of graph.edges) {
    if (strongMatchUrls.has(edge.source)) {
      boost.set(edge.target, Math.max(boost.get(edge.target) ?? 0, edge.weight));
    }
    if (strongMatchUrls.has(edge.target)) {
      boost.set(edge.source, Math.max(boost.get(edge.source) ?? 0, edge.weight));
    }
  }
  return boost;
}

function recencyWeight(visitedAt: string, now: number): number {
  const ts = new Date(visitedAt).getTime();
  if (Number.isNaN(ts)) {
    return 0;
  }
  const ageDays = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24));
  return ageDays < 3 ? 1 : ageDays < 7 ? 0.7 : ageDays < 30 ? 0.35 : 0.1;
}

function buildReasons(
  semantic: number,
  keyword: number,
  graph: number,
  recency: number,
  visited: number
): readonly SemanticReason[] {
  const reasons: SemanticReason[] = [];
  if (semantic > 0.2) {
    reasons.push("semantic");
  }
  if (keyword > 1) {
    reasons.push("keyword");
  }
  if (graph > 0.08) {
    reasons.push("graph");
  }
  if (recency > 0.5) {
    reasons.push("recent");
  }
  if (visited > 0.4) {
    reasons.push("visited");
  }
  return reasons;
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  const minLen = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < minLen; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / Math.sqrt(normA * normB);
}

function buildSnippet(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}…`;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
