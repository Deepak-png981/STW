# Shame The Web — Documentation

Guides for how the extension captures browsing knowledge, indexes it locally, and answers questions on-device.

## Guides

| Doc | What it covers |
|-----|----------------|
| [Architecture overview](./architecture-overview.md) | End-to-end system map, storage layers, and how the pieces connect |
| [Page visit pipeline](./page-visit-pipeline.md) | What runs when a user lands on a page (content script → background) |
| [Local AI and search](./local-ai-and-search.md) | Models, offscreen document, indexing, semantic search, chat, scaling tradeoffs |
| [Knowledge chunks and hashing](./knowledge-chunks-and-hashing.md) | How pages are split into chunks and how content hashes invalidate stale embeddings |
| [Export / import E2E](./e2e-export-import.md) | Manual checklist for graph transfer between browser profiles |

## Quick reference

| Layer | Location | Role |
|-------|----------|------|
| Content script | `extension/src/contents/page-roast.ts` | Roast UI, visit recording, page text extraction |
| Service worker | `extension/background.ts` | Message routing, debounced graph/AI jobs, dashboard bridge |
| Offscreen document | `extension/offscreen.ts` | WASM embeddings + WebLLM chat (hidden page) |
| AI orchestration | `extension/src/lib/ai-setup.ts` | `ensureSearchReady`, `ensureConversationReady`, search/chat entry points |
| IndexedDB | `extension/src/lib/content-storage.ts` | Pages, graph, chunks, embeddings |
| Dashboard | `dashboard/src/components/KnowledgeGraphPanel.tsx` | Graph UI, semantic search, local chat |

## Local models (current defaults)

| Purpose | Model ID | Library |
|---------|----------|---------|
| Embeddings / semantic search | `Xenova/all-MiniLM-L6-v2` | `@huggingface/transformers` (ONNX WASM) |
| Chat / Q&A over history | `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | `@mlc-ai/web-llm` (WebGPU) |

Both run in the **offscreen document**, not in the service worker.
