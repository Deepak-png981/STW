import {
  SHAME_THE_WEB_EXTENSION_SOURCE,
  SHAME_THE_WEB_DASHBOARD_ORIGINS
} from "@shame-the-web/shared";
import type { BridgeRequest, BridgeResponse, ScoreBand, VisitRecord } from "@shame-the-web/shared";

import { handleBridgeRequest } from "./src/background/bridge-handler";
import { appendVisit, chromeStorageDriver, getState, rememberRoastTemplate } from "./src/lib/storage";

type RecordVisitMessage = {
  type: "recordVisit";
  visit: VisitRecord;
  roast: {
    category: ScoreBand;
    templateId: string;
  };
};

type RuntimeMessage = BridgeRequest | RecordVisitMessage;

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install") {
    return;
  }

  void chrome.tabs.create({ url: chrome.runtime.getURL("tabs/welcome.html") });
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  void handleRuntimeMessage(message, sender)
    .then((response) => {
      sendResponse(response);
    })
    .catch((error: unknown) => {
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

  const state = await getState(chromeStorageDriver);
  return handleBridgeRequest(message, state);
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
