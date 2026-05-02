import {
  SHAME_THE_WEB_BRIDGE_SOURCE,
  SHAME_THE_WEB_EXTENSION_SOURCE
} from "@shame-the-web/shared";
import type { BridgeRequest, BridgeResponse } from "@shame-the-web/shared";

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.source !== window || !isDashboardRequest(event.data)) {
    return;
  }

  void chrome.runtime.sendMessage(event.data, (response: BridgeResponse) => {
    window.postMessage(response, window.location.origin);
  });
});

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

window.postMessage(
  {
    id: "bridge-ready",
    source: SHAME_THE_WEB_EXTENSION_SOURCE,
    ok: true,
    type: "getSession",
    data: { activeUser: null }
  } satisfies BridgeResponse,
  window.location.origin
);
