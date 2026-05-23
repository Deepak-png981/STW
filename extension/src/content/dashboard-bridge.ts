import {
  SHAME_THE_WEB_BRIDGE_SOURCE,
  SHAME_THE_WEB_EXTENSION_SOURCE
} from "@shame-the-web/shared";
import type { BridgeRequest, BridgeResponse, VisitRecord } from "@shame-the-web/shared";

type BridgePushVisitRecorded = {
  source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
  event: "visitRecorded";
  visit: VisitRecord;
};

type BridgePushGraphUpdated = {
  source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
  event: "graphUpdated";
  nodeCount: number;
};

type BridgePushAiSetupProgress = {
  source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
  event: "aiSetupProgress";
  status: {
    phase: string;
    message: string;
    updatedAt: string;
  };
};

type BridgePushEvent = BridgePushVisitRecorded | BridgePushGraphUpdated | BridgePushAiSetupProgress;

const CONTEXT_INVALID_HINT =
  "Extension was updated or reloaded. Refresh this page to reconnect.";

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.source !== window || !isDashboardRequest(event.data)) {
    return;
  }

  const request = event.data;

  if (!isExtensionContextValid()) {
    window.postMessage(bridgeErrorResponse(request, CONTEXT_INVALID_HINT), window.location.origin);
    return;
  }

  try {
    chrome.runtime.sendMessage(request, (response: BridgeResponse | undefined) => {
      const lastError = chrome.runtime.lastError;
      if (lastError?.message) {
        const errorText = isContextInvalidatedMessage(lastError.message)
          ? CONTEXT_INVALID_HINT
          : lastError.message;
        window.postMessage(bridgeErrorResponse(request, errorText), window.location.origin);
        return;
      }
      if (response) {
        window.postMessage(response, window.location.origin);
      }
    });
  } catch (err) {
    const message =
      err instanceof Error && isContextInvalidatedMessage(err.message)
        ? CONTEXT_INVALID_HINT
        : err instanceof Error
          ? err.message
          : "Extension bridge error.";
    window.postMessage(bridgeErrorResponse(request, message), window.location.origin);
  }
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isExtensionContextValid()) {
    return;
  }

  if (!isBridgePushEvent(message)) {
    return;
  }

  window.postMessage(message, window.location.origin);
});

if (isExtensionContextValid()) {
  try {
    window.postMessage(
      {
        source: SHAME_THE_WEB_EXTENSION_SOURCE,
        event: "ready",
        version: chrome.runtime.getManifest().version
      },
      window.location.origin
    );
  } catch {
    // Context can invalidate between check and getManifest/postMessage.
  }
}

function isExtensionContextValid(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

function isContextInvalidatedMessage(text: string): boolean {
  return text.includes("Extension context invalidated");
}

function bridgeErrorResponse(request: BridgeRequest, error: string): BridgeResponse {
  return {
    id: request.id,
    source: SHAME_THE_WEB_EXTENSION_SOURCE,
    ok: false,
    type: request.type,
    error
  };
}

function isDashboardRequest(message: unknown): message is BridgeRequest {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Partial<BridgeRequest>;
  return (
    candidate.source === SHAME_THE_WEB_BRIDGE_SOURCE &&
    typeof candidate.id === "string" &&
    (candidate.type === "ping" ||
      candidate.type === "getSession" ||
      candidate.type === "getVisits" ||
      candidate.type === "getStats" ||
      candidate.type === "getRoasts" ||
      candidate.type === "getKnowledgeGraph" ||
      candidate.type === "getAiSetupStatus" ||
      candidate.type === "exportKnowledgeGraph" ||
      (candidate.type === "importKnowledgeGraph" &&
        typeof (candidate as { fileContents?: unknown }).fileContents === "string" &&
        ((candidate as { mode?: unknown }).mode === "merge" || (candidate as { mode?: unknown }).mode === "replace")) ||
      (candidate.type === "searchKnowledge" && typeof (candidate as { query?: unknown }).query === "string") ||
      (candidate.type === "semanticSearchKnowledge" && typeof (candidate as { query?: unknown }).query === "string") ||
      (candidate.type === "chatKnowledge" &&
        typeof (candidate as { query?: unknown }).query === "string" &&
        typeof (candidate as { sessionId?: unknown }).sessionId === "string" &&
        Array.isArray((candidate as { history?: unknown }).history)))
  );
}

function isBridgePushEvent(message: unknown): message is BridgePushEvent {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Record<string, unknown>;
  if (candidate["source"] !== SHAME_THE_WEB_EXTENSION_SOURCE) {
    return false;
  }
  if (candidate["event"] === "visitRecorded") {
    return !!candidate["visit"] && typeof candidate["visit"] === "object";
  }
  if (candidate["event"] === "graphUpdated") {
    return typeof candidate["nodeCount"] === "number";
  }
  if (candidate["event"] === "aiSetupProgress") {
    return !!candidate["status"] && typeof candidate["status"] === "object";
  }
  return false;
}
