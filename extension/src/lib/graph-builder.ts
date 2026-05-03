import type { KnowledgeEdge, KnowledgeGraph, KnowledgeNode, PageContent, VisitRecord } from "@shame-the-web/shared";
import { cosineSimilarity } from "./tfidf";

const SIMILARITY_THRESHOLD = 0.08;
const MAX_GRAPH_NODES = 300;

export function buildKnowledgeGraph(pages: PageContent[], visits: VisitRecord[]): KnowledgeGraph {
  // Cap to most recently visited pages to keep graph responsive
  const sorted = pages.slice().sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
  const capped = sorted.slice(0, MAX_GRAPH_NODES);

  const visitCountMap = new Map<string, number>();
  const lastVisitedMap = new Map<string, string>();

  for (const visit of visits) {
    visitCountMap.set(visit.url, (visitCountMap.get(visit.url) ?? 0) + 1);
    const existing = lastVisitedMap.get(visit.url);
    if (!existing || visit.timestamp > existing) {
      lastVisitedMap.set(visit.url, visit.timestamp);
    }
  }

  const clusterMap = assignClusters(capped);

  const nodes: KnowledgeNode[] = capped.map((page) => ({
    id: page.url,
    label: truncate(buildNodeLabel(page), 60),
    hostname: safeHostname(page.url),
    url: page.url,
    keywords: page.keywords,
    visitCount: visitCountMap.get(page.url) ?? 1,
    lastVisited: lastVisitedMap.get(page.url) ?? page.visitedAt,
    clusterId: clusterMap.get(page.url) ?? 0
  }));

  const edges: KnowledgeEdge[] = [];

  for (let i = 0; i < capped.length; i++) {
    for (let j = i + 1; j < capped.length; j++) {
      const pageA = capped[i];
      const pageB = capped[j];

      // noUncheckedIndexedAccess guard
      if (!pageA || !pageB) continue;

      // Quick pre-filter: must share at least one keyword
      if (!pageA.keywords.some((k) => pageB.keywords.includes(k))) {
        continue;
      }

      const similarity = cosineSimilarity(pageA.keywords, pageB.keywords);
      if (similarity >= SIMILARITY_THRESHOLD) {
        edges.push({ source: pageA.url, target: pageB.url, weight: similarity });
      }
    }
  }

  return { nodes, edges, builtAt: new Date().toISOString() };
}

function assignClusters(pages: PageContent[]): Map<string, number> {
  const clusterMap = new Map<string, number>();
  const keywordToCluster = new Map<string, number>();
  let nextCluster = 0;

  for (const page of pages) {
    if (page.keywords.length === 0) {
      clusterMap.set(page.url, nextCluster++);
      continue;
    }

    const topKeywords = page.keywords.slice(0, 3);
    let assignedCluster: number | undefined;

    for (const kw of topKeywords) {
      if (keywordToCluster.has(kw)) {
        assignedCluster = keywordToCluster.get(kw);
        break;
      }
    }

    if (assignedCluster === undefined) {
      assignedCluster = nextCluster++;
    }

    clusterMap.set(page.url, assignedCluster);
    for (const kw of topKeywords) {
      if (!keywordToCluster.has(kw)) {
        keywordToCluster.set(kw, assignedCluster);
      }
    }
  }

  return clusterMap;
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : `${str.slice(0, max)}\u2026`;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function buildNodeLabel(page: PageContent): string {
  const title = page.title?.trim();
  const host = safeHostname(page.url).replace(/^www\./, "");
  const brand = brandFromHost(host);

  if (title && !looksLikeBrandPlaceholder(title, host, brand)) {
    return title;
  }

  // Fallback: turn the last URL segment into something readable.
  try {
    const u = new URL(page.url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1] ?? "";
      const decoded = decodeURIComponent(last).replace(/[-_+]/g, " ").trim();
      if (decoded.length >= 3) {
        return `${decoded} (${host})`;
      }
    }
    return host || page.url;
  } catch {
    return page.url;
  }
}

function brandFromHost(host: string): string {
  if (!host) return "";
  const parts = host.split(".").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  return parts[parts.length - 2]!;
}

function looksLikeBrandPlaceholder(title: string, host: string, brand: string): boolean {
  const t = title.trim().toLowerCase();
  if (!t) return true;
  if (t === host.toLowerCase()) return true;
  if (!brand) return false;
  const b = brand.toLowerCase();
  if (t === b) return true;
  // "(12) BrandName" — common notification-count prefix on app shells (X, YouTube, …).
  const notif = new RegExp(`^\\(\\d+\\)\\s*${escapeRegex(b)}$`);
  if (notif.test(t)) return true;
  // "BrandName · ..." or "BrandName: ..." with nothing meaningful after.
  const branded = new RegExp(`^${escapeRegex(b)}\\s*[\\-:|·\u2022]?\\s*${escapeRegex(b)}?$`);
  if (branded.test(t)) return true;
  return false;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
