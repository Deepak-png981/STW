# Local AI and search

On-device semantic search and chat over browsed pages. Models run in a **hidden offscreen document**; the service worker orchestrates and persists results in IndexedDB.

## Local models

| Purpose | Model ID | Params (approx) | Library | Runtime |
|---------|----------|-----------------|---------|---------|
| **Embeddings** | `Xenova/all-MiniLM-L6-v2` | ~22M | `@huggingface/transformers` ^4.2.0 | ONNX **WASM** |
| **Chat** | `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | 0.5B (4-bit quant) | `@mlc-ai/web-llm` ^0.2.83 | **WebGPU** (primary) |

Constants:

- Embeddings: `extension/src/lib/embedding-model.ts`
- Chat: `extension/src/lib/local-chat.ts` (`WEBLLM_MODEL_ID`)

### Embeddings (MiniLM)

- Task: `feature-extraction` with mean pooling + L2 normalization
- Typical vector size: **384 dimensions**
- ONNX WASM paths configured in `transformers-env.ts` → `assets/ort/`
- Browser model cache enabled (`useBrowserCache: true`)

### Chat (Qwen via WebLLM)

- Small instruct model for answering from retrieved browsing snippets
- Temperature: **0.2**
- System prompt constrains answers to conversation history + retrieved snippets

### Fallbacks (not neural models)

| Failure | Fallback | Model label |
|---------|----------|-------------|
| Offscreen embed fails | 96-dim bag-of-words hash vector | still stored with MiniLM model id |
| WebLLM fails / low-quality reply | Template string from top search results | `fallback-template` |

## Why `chrome.offscreen`?

Manifest V3 **service workers** cannot reliably run heavy WASM / WebGPU ML workloads. The extension creates a hidden page:

```ts
await chrome.offscreen.createDocument({
  url: chrome.runtime.getURL("assets/offscreen.html"),
  reasons: ["WORKERS"],
  justification: "Run local embedding models without blocking the service worker."
});
```

| Component | File |
|-----------|------|
| Create / detect offscreen doc | `extension/src/lib/offscreen-runtime.ts` |
| Client (service worker side) | `extension/src/lib/offscreen-ai-client.ts` |
| Handler (hidden page) | `extension/offscreen.ts` |
| Message protocol | `extension/src/lib/offscreen-ai-protocol.ts` |
| Built bundle | `extension/scripts/build-offscreen.mjs` → `assets/offscreen.js` |

### Offscreen request types

| `kind` | Action |
|--------|--------|
| `warmup` | Load MiniLM pipeline (`warmupTransformersRuntime`) |
| `embedTexts` | Vectorize chunk texts |
| `primeChat` | Load WebLLM engine |
| `chatKnowledge` | Generate answer from query + history + search results |

Flow:

```
background.ts / ai-setup.ts
  → offscreen-ai-client.ts (ensureOffscreenDocument + sendMessage)
    → offscreen.ts
      → transformers-runtime.ts | local-chat.ts
    ← vectors | answer
  → IndexedDB or dashboard response
```

Permission required: `"offscreen"` in extension manifest.

## `ensureSearchReady` — the indexing gate

**File:** `extension/src/lib/ai-setup.ts`

**Question it answers:** “Does every page have chunks + embeddings matching its current content?”

### Decision flow

1. `summarizeIndexState(pages)` — compare expected chunks vs stored embeddings (keyed by `chunkId:contentHash`)
2. If all pages indexed and no setup running → skip, set `ready_search`
3. Else start (or join) single-flight `setupPromise`:
   - Phase `downloading_embed` → `warmupEmbeddingRuntime()`
   - For each page sequentially:
     - `buildKnowledgeChunks(page)`
     - `storeKnowledgeChunks(page.url, chunks)`
     - `buildChunkEmbeddings(chunks)`
     - `storeChunkEmbeddings(page.url, embeddings)`
     - Phase `indexing` with progress `current/total`
   - Phase `ready_search`

### Single-flight concurrency

`runtimeState.setupPromise` ensures concurrent callers (background setup, semantic search, chat, import) share one indexing run.

### Call sites

- `runAiSetupInBackground` in `background.ts` (debounced after page store)
- `semanticSearchKnowledge` / `chatKnowledge` bridge handlers
- `importKnowledgeGraph` (after clearing chunks/embeddings)

## `runSemanticSearch` — hybrid retrieval

**File:** `extension/src/lib/semantic-search.ts`

At query time:

1. Embed query via `embedText` (same MiniLM path as indexing)
2. Rank all chunk embeddings by **cosine similarity**
3. Keep best chunk per page
4. Merge with **TF-IDF** keyword scores (`searchPages`)
5. Apply **graph neighbor boost** from `KnowledgeGraph` edges
6. Apply **recency** and **visit count** weights

Default score blend:

```
total = semantic×0.6 + keyword×0.22 + graph×0.1 + recency×0.05 + visited×0.03
```

Returns up to 10 `SemanticSearchResult` items with `reasons`: `semantic`, `keyword`, `graph`, `recent`, `visited`.

## Chat pipeline

`chatKnowledge` in `background.ts`:

1. `ensureSearchReady`
2. `runSemanticSearch` — retrieve context
3. `ensureConversationReady` — load WebLLM if possible
4. `answerFromLocalKnowledge` → `answerViaOffscreenChat` → `answerFromResults` in offscreen

Chat always **searches first**, then generates from snippets — classic RAG.

## Scaling the chat model (0.5B → larger)

Yes, WebLLM runs on the **user’s machine** in their browser. Bigger models:

| Effect | 0.5B (current) | ~1.5B step up |
|--------|----------------|---------------|
| Download | ~300–500 MB | ~600 MB–1 GB+ |
| RAM / VRAM | Lower | ~2× or more |
| Inference speed | Faster | Slower |
| Answer quality | OK for snippet Q&A | Usually better |
| Compatibility | More machines | More OOM / WebGPU failures → `fallback-template` |

**Important:** WebLLM requires a **prebuilt MLC model ID**, not an arbitrary Hugging Face name. Qwen 2.5 sizes include 0.5B, **1.5B**, 3B, 7B — there is no exact “1.0B” in that line.

To experiment, change `WEBLLM_MODEL_ID` in `local-chat.ts`, e.g.:

```ts
const WEBLLM_MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
```

Embeddings are independent — bumping chat size does not change search unless you also change `EMBEDDING_MODEL_ID`.

**Product tradeoff:** 0.5B optimizes for “works on most laptops.” Larger models help power users but increase fallback rate on weak GPUs.

## Graph vs embeddings timing

Graph rebuild debounces at **5s**; AI setup at **1.5s**. The dashboard may show new graph nodes before semantic search finishes indexing them. Search/chat call `ensureSearchReady` again at query time to close that gap.

## Related docs

- [Knowledge chunks and hashing](./knowledge-chunks-and-hashing.md)
- [Page visit pipeline](./page-visit-pipeline.md)
- [Export / import E2E](./e2e-export-import.md) — re-embed after import

## Further reading

- [Chrome Offscreen Documents API](https://developer.chrome.com/docs/extensions/reference/api/offscreen) — hidden pages for background compute in MV3 extensions
- [WebLLM documentation](https://webllm.mlc.ai/docs/) — supported MLC model IDs and WebGPU requirements
- [LlamaIndex indexing guide](https://docs.llamaindex.ai/en/stable/module_guides/indexing/) — same chunk → embed → retrieve pattern as server-side RAG
