import type { PlasmoCSConfig } from "plasmo";
import type { BridgeRequest, BridgeResponse } from "@shame-the-web/shared";
import {
  SHAME_THE_WEB_BRIDGE_SOURCE,
  SHAME_THE_WEB_EXTENSION_SOURCE
} from "@shame-the-web/shared";

type BridgePushVisitRecorded = {
  source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
  event: "visitRecorded";
  visit: BridgeResponse extends { type: "getVisits"; data: { visits: infer T } } ? T[number] : never;
};

export const config: PlasmoCSConfig = {
  matches: [
    "http://localhost:5173/*",
    "https://shametheweb.com/*",
    "https://www.shametheweb.com/*"
  ],
  run_at: "document_start"
};

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.source !== window || !isDashboardRequest(event.data)) {
    return;
  }

  void chrome.runtime.sendMessage(event.data, (response: BridgeResponse) => {
    window.postMessage(response, window.location.origin);
  });
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isBridgePushVisitRecorded(message)) {
    return;
  }

  window.postMessage(message, window.location.origin);
});

window.postMessage(
  {
    source: SHAME_THE_WEB_EXTENSION_SOURCE,
    event: "ready",
    version: chrome.runtime.getManifest().version
  },
  window.location.origin
);

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
      candidate.type === "getRoasts")
  );
}

function isBridgePushVisitRecorded(message: unknown): message is BridgePushVisitRecorded {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Partial<BridgePushVisitRecorded>;
  return (
    candidate.source === SHAME_THE_WEB_EXTENSION_SOURCE &&
    candidate.event === "visitRecorded" &&
    !!candidate.visit &&
    typeof candidate.visit === "object"
  );
}
