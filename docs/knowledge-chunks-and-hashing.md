# Knowledge chunks and hashing

Pages are too large to embed as a single vector. The extension splits each `PageContent` into **chunks**, fingerprints the page with a **content hash**, and uses that hash to detect when embeddings are stale.

**Primary file:** `extension/src/lib/knowledge-chunks.ts`

## Chunk types

| Type | Source | Notes |
|------|--------|-------|
| `title` | `page.title` | Omitted if empty after trim |
| `description` | `page.description` | Meta / OG description |
| `headings` | `page.headings.join("\n")` | Single chunk for all headings |
| `body` | `page.bodyText` | Split into overlapping windows |

### Body splitting constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `BODY_CHUNK_SIZE` | 700 chars | Max chunk length |
| `BODY_CHUNK_OVERLAP` | 120 chars | Overlap between consecutive body chunks |

Body text is whitespace-normalized before splitting. Step size = `max(1, 700 - 120) = 580` characters.

## Chunk identity

Each chunk is a `KnowledgeChunk` (`shared/src/index.ts`):

```ts
{
  id: `${pageUrl}::${type}::${index}::${contentHash}`,
  pageUrl,
  type,
  index,
  text,
  visitedAt,
  contentHash
}
```

Example IDs for one page:

```
https://example.com/a::title::0::h_a1b2c3d4
https://example.com/a::description::0::h_a1b2c3d4
https://example.com/a::headings::0::h_a1b2c3d4
https://example.com/a::body::0::h_a1b2c3d4
https://example.com/a::body::1::h_a1b2c3d4
```

All chunks from the same page snapshot share the same `contentHash` suffix.

## Content hash — FNV-1a (32-bit)

```ts
export function buildContentHash(page): string {
  const joined = `${page.title}\n${page.description}\n${page.headings.join("\n")}\n${page.bodyText}`;
  return `h_${fnv1a(joined)}`;
}
```

### Algorithm

**FNV-1a** — a fast, non-cryptographic 32-bit hash:

| Property | Value |
|----------|-------|
| Name | FNV-1a (Fowler–Noll–Vo) |
| Offset basis | `0x811c9dc5` (standard 32-bit FNV-1a) |
| Prime | `16777619` (implemented via bit shifts) |
| Output | Unsigned 32-bit hex string |

Per character: **XOR first**, then multiply by FNV prime.

### What it is not

- Not SHA-256 or any cryptographic hash
- Collisions are possible (acceptable for change detection, not security)
- Not suitable for passwords or integrity proofs

### Why use it here

- Fast in the content script / service worker path
- Deterministic — same page content → same hash → same chunk IDs
- Cheap cache invalidation — any content change changes hash → old embeddings no longer match

## Stale embedding detection

`ensureSearchReady` calls `summarizeIndexState`, which:

1. Builds **expected** chunks with `buildKnowledgeChunks(page)` for each page
2. Loads stored embeddings from IndexedDB
3. Builds a set of keys: `` `${embedding.chunkId}:${embedding.contentHash}` ``
4. Marks a page indexed only if **every** expected chunk has a matching embedding key

If the user revisits a page and the body grows (second snapshot in `indexCurrentPage`), the hash changes → page is re-indexed on next `ensureSearchReady`.

## Storage layout

| Store | Key | Written by |
|-------|-----|------------|
| `knowledgeChunks` | `chunk.id` | `storeKnowledgeChunks` — replaces all chunks for `pageUrl` first |
| `chunkEmbeddings` | `` `${chunk.id}::${EMBEDDING_MODEL_ID}` `` | `storeChunkEmbeddings` — replaces all embeddings for `pageUrl` first |

Embeddings also store `contentHash` and `chunkId` for validation and lookup.

## End-to-end example

**Page content** (simplified):

```ts
{
  url: "https://example.com/a",
  title: "Local AI Search",
  description: "Semantic retrieval for browser history.",
  headings: ["Embedding pipeline", "Ranking logic"],
  bodyText: "This page explains how to run local embeddings..."
}
```

**Steps:**

1. `buildContentHash` → e.g. `h_7f3e2a1b`
2. `buildKnowledgeChunks` → 4+ chunks (title, description, headings, body…)
3. `storeKnowledgeChunks` → IndexedDB
4. `buildChunkEmbeddings` → one 384-dim vector per chunk (MiniLM)
5. `storeChunkEmbeddings` → IndexedDB

**At search time:**

- Query embedded with same MiniLM model
- Cosine similarity against all chunk vectors
- Best-matching chunk per page becomes the snippet source

## Tests

See `extension/tests/lib/knowledge-chunks.test.ts`:

- Deterministic hash for identical page content
- All four chunk types produced for a representative page

## Related docs

- [Local AI and search](./local-ai-and-search.md) — `ensureSearchReady` and embedding pipeline
- [Page visit pipeline](./page-visit-pipeline.md) — when `storePageContent` triggers indexing
