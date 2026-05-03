import type { KnowledgeGraph, PageContent } from "@shame-the-web/shared";
import type { RawPageContent } from "./content-extractor";
import { extractKeywords } from "./tfidf";

const DB_NAME = "shame-the-web-knowledge";
const DB_VERSION = 1;
const PAGE_STORE = "pageContent";
const GRAPH_STORE = "knowledgeGraph";
const GRAPH_KEY = "graph";
const MAX_RECORDS = 5000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PAGE_STORE)) {
        db.createObjectStore(PAGE_STORE, { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains(GRAPH_STORE)) {
        db.createObjectStore(GRAPH_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storePageContent(raw: RawPageContent): Promise<void> {
  const db = await openDb();
  const keywords = extractKeywords(raw);
  const content: PageContent = { ...raw, keywords };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PAGE_STORE, "readwrite");
    const req = tx.objectStore(PAGE_STORE).put(content);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // Async prune — fire and forget
  void prunePageContents(db);
}

export async function getAllPageContents(): Promise<PageContent[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGE_STORE, "readonly");
    const req = tx.objectStore(PAGE_STORE).getAll();
    req.onsuccess = () => resolve(req.result as PageContent[]);
    req.onerror = () => reject(req.error);
  });
}

export async function storeKnowledgeGraph(graph: KnowledgeGraph): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GRAPH_STORE, "readwrite");
    const req = tx.objectStore(GRAPH_STORE).put(graph, GRAPH_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getStoredKnowledgeGraph(): Promise<KnowledgeGraph | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GRAPH_STORE, "readonly");
    const req = tx.objectStore(GRAPH_STORE).get(GRAPH_KEY);
    req.onsuccess = () => resolve((req.result as KnowledgeGraph) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function prunePageContents(db: IDBDatabase): Promise<void> {
  const all = await new Promise<PageContent[]>((resolve, reject) => {
    const tx = db.transaction(PAGE_STORE, "readonly");
    const req = tx.objectStore(PAGE_STORE).getAll();
    req.onsuccess = () => resolve(req.result as PageContent[]);
    req.onerror = () => reject(req.error);
  });

  if (all.length <= MAX_RECORDS) {
    return;
  }

  // Delete the oldest records by visitedAt
  const toDelete = all
    .slice()
    .sort((a, b) => a.visitedAt.localeCompare(b.visitedAt))
    .slice(0, all.length - MAX_RECORDS);

  await Promise.all(
    toDelete.map(
      (item) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(PAGE_STORE, "readwrite");
          const req = tx.objectStore(PAGE_STORE).delete(item.url);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    )
  );
}
