import type { KnowledgeChunk, PageContent } from "@shame-the-web/shared";

const BODY_CHUNK_SIZE = 700;
const BODY_CHUNK_OVERLAP = 120;

export function buildKnowledgeChunks(page: PageContent): KnowledgeChunk[] {
  const contentHash = buildContentHash(page);
  const baseChunks: KnowledgeChunk[] = [];

  const title = page.title.trim();
  if (title) {
    baseChunks.push(createChunk(page.url, "title", 0, title, page.visitedAt, contentHash));
  }

  const description = page.description.trim();
  if (description) {
    baseChunks.push(createChunk(page.url, "description", 0, description, page.visitedAt, contentHash));
  }

  if (page.headings.length > 0) {
    const headingsText = page.headings.join("\n").trim();
    if (headingsText) {
      baseChunks.push(createChunk(page.url, "headings", 0, headingsText, page.visitedAt, contentHash));
    }
  }

  const bodyChunks = splitBodyIntoChunks(page.bodyText).map((text, index) =>
    createChunk(page.url, "body", index, text, page.visitedAt, contentHash)
  );

  return [...baseChunks, ...bodyChunks];
}

export function buildContentHash(page: Pick<PageContent, "title" | "description" | "headings" | "bodyText">): string {
  const joined = `${page.title}\n${page.description}\n${page.headings.join("\n")}\n${page.bodyText}`;
  return `h_${fnv1a(joined)}`;
}

function splitBodyIntoChunks(bodyText: string): string[] {
  const normalized = bodyText.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  const step = Math.max(1, BODY_CHUNK_SIZE - BODY_CHUNK_OVERLAP);
  for (let start = 0; start < normalized.length; start += step) {
    const slice = normalized.slice(start, start + BODY_CHUNK_SIZE).trim();
    if (!slice) {
      continue;
    }
    chunks.push(slice);
    if (start + BODY_CHUNK_SIZE >= normalized.length) {
      break;
    }
  }
  return chunks;
}

function createChunk(
  pageUrl: string,
  type: KnowledgeChunk["type"],
  index: number,
  text: string,
  visitedAt: string,
  contentHash: string
): KnowledgeChunk {
  return {
    id: `${pageUrl}::${type}::${index}::${contentHash}`,
    pageUrl,
    type,
    index,
    text,
    visitedAt,
    contentHash
  };
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}
