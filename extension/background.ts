import {
  SHAME_THE_WEB_EXTENSION_SOURCE,
  SHAME_THE_WEB_DASHBOARD_ORIGINS
} from "@shame-the-web/shared";
import type { BridgeRequest, BridgeResponse, ScoreBand, VisitRecord } from "@shame-the-web/shared";

import { handleBridgeRequest } from "./src/background/bridge-handler";
import { appendVisit, chromeStorageDriver, getState, rememberRoastTemplate } from "./src/lib/storage";
import { buildKnowledgeGraph } from "./src/lib/graph-builder";
import {
  getAllPageContents,
  getStoredKnowledgeGraph,
  storeKnowledgeGraph,
  storePageContent
} from "./src/lib/content-storage";
import { searchPages } from "./src/lib/tfidf";
import type { RawPageContent } from "./src/lib/content-extractor";

type RecordVisitMessage = {
  type: "recordVisit";
  visit: VisitRecord;
  roast: {
    category: ScoreBand;
    templateId: string;
  };
};

type StorePageContentMessage = {
  type: "storePageContent";
  content: RawPageContent;
};

type RuntimeMessage = BridgeRequest | RecordVisitMessage | StorePageContentMessage;

let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleGraphRebuild(): void {
  if (rebuildTimer !== null) {
    clearTimeout(rebuildTimer);
  }
  console.log("[STW] background: graph rebuild scheduled in 5s");
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    void (async () => {
      try {
        const [pages, state] = await Promise.all([getAllPageContents(), getState(chromeStorageDriver)]);
        console.log("[STW] background: rebuilding graph from", pages.length, "pages");
        const graph = buildKnowledgeGraph(pages, state.visits);
        console.log("[STW] background: graph built —", graph.nodes.length, "nodes,", graph.edges.length, "edges");
        await storeKnowledgeGraph(graph);
        console.log("[STW] background: graph stored in IndexedDB");
        void broadcastGraphUpdated(graph.nodes.length);
      } catch (err) {
        console.error("[STW] background: graph rebuild FAILED", err);
      }
    })();
  }, 5000);
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install") {
    return;
  }

  void chrome.tabs.create({ url: chrome.runtime.getURL("tabs/welcome.html") });
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  console.log("[STW] background: received message type =", message.type);
  void handleRuntimeMessage(message, sender)
    .then((response) => {
      console.log("[STW] background: responding to", message.type, "ok =", (response as { ok?: boolean }).ok);
      sendResponse(response);
    })
    .catch((error: unknown) => {
      console.error("[STW] background: handler threw for", message.type, error);
      sendResponse(
        createBridgeErrorResponse(
          message,
          error instanceof Error ? error.message : "Unknown extension runtime error."
        )
      );
    });

  return true;
});

async function handleRuntimeMessage(
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender
): Promise<BridgeResponse | { ok: true }> {
  if (message.type === "recordVisit") {
    await appendVisit(chromeStorageDriver, message.visit);
    await rememberRoastTemplate(chromeStorageDriver, {
      userId: message.visit.userId,
      category: message.roast.category,
      templateId: message.roast.templateId
    });
    await broadcastVisitRecorded(message.visit, sender.tab?.id);

    return { ok: true };
  }

  if (message.type === "storePageContent") {
    console.log("[STW] background: storing page content for", message.content.url);
    try {
      await storePageContent(message.content);
      console.log("[STW] background: page content stored OK");
    } catch (err) {
      console.error("[STW] background: storePageContent FAILED", err);
      throw err;
    }
    scheduleGraphRebuild();
    return { ok: true };
  }

  if (message.type === "getKnowledgeGraph") {
    console.log("[STW] background: getKnowledgeGraph requested");
    let graph = await getStoredKnowledgeGraph();
    if (!graph) {
      console.log("[STW] background: no cached graph, building now…");
      const [pages, state] = await Promise.all([getAllPageContents(), getState(chromeStorageDriver)]);
      console.log("[STW] background: building from", pages.length, "pages");
      graph = buildKnowledgeGraph(pages, state.visits);
      await storeKnowledgeGraph(graph);
    }
    console.log("[STW] background: returning graph with", graph.nodes.length, "nodes,", graph.edges.length, "edges");
    return {
      id: message.id,
      source: SHAME_THE_WEB_EXTENSION_SOURCE,
      ok: true,
      type: "getKnowledgeGraph",
      data: { graph }
    };
  }

  if (message.type === "searchKnowledge") {
    console.log("[STW] background: searchKnowledge query =", message.query);
    const pages = await getAllPageContents();
    console.log("[STW] background: searching across", pages.length, "pages");
    const results = searchPages(message.query, pages);
    console.log("[STW] background: search returned", results.length, "results");
    return {
      id: message.id,
      source: SHAME_THE_WEB_EXTENSION_SOURCE,
      ok: true,
      type: "searchKnowledge",
      data: { results }
    };
  }

  const state = await getState(chromeStorageDriver);
  return handleBridgeRequest(message, state);
}

async function broadcastGraphUpdated(nodeCount: number): Promise<void> {
  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs
      .filter((tab) => tab.id !== undefined && matchesDashboardOrigin(tab.url))
      .map(async (tab) => {
        try {
          await chrome.tabs.sendMessage(tab.id as number, {
            source: SHAME_THE_WEB_EXTENSION_SOURCE,
            event: "graphUpdated",
            nodeCount
          });
        } catch {
          // Dashboard tab may not have the content script ready; swallow silently.
        }
      })
  );
}

async function broadcastVisitRecorded(visit: VisitRecord, sourceTabId?: number): Promise<void> {
  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs
      .filter((tab) => tab.id !== undefined && tab.id !== sourceTabId && matchesDashboardOrigin(tab.url))
      .map(async (tab) => {
        try {
          await chrome.tabs.sendMessage(tab.id as number, {
            source: SHAME_THE_WEB_EXTENSION_SOURCE,
            event: "visitRecorded",
            visit
          });
        } catch {
          // Common case: the tab URL matches the dashboard origin, but this tab isn't actually running
          // the dashboard content script (different port/path), or the content script hasn't injected yet.
          // Chrome throws here; we intentionally swallow it to avoid polluting the service worker error log.
        }
      })
  );
}

function matchesDashboardOrigin(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  return SHAME_THE_WEB_DASHBOARD_ORIGINS.some((origin) => url.startsWith(origin));
}

function createBridgeErrorResponse(message: RuntimeMessage, error: string): BridgeResponse {
  if ("id" in message && "source" in message) {
    return {
      id: message.id,
      source: SHAME_THE_WEB_EXTENSION_SOURCE,
      ok: false,
      type: message.type,
      error
    };
  }

  return {
    id: "unknown",
    source: SHAME_THE_WEB_EXTENSION_SOURCE,
    ok: false,
    type: "getSession",
    error
  };
}
