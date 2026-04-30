import { SHAME_THE_WEB_BRIDGE_SOURCE, SHAME_THE_WEB_EXTENSION_SOURCE } from "@shame-the-web/shared";
import type { BridgeRequest, BridgeResponse } from "@shame-the-web/shared";

const REQUEST_TIMEOUT_MS = 1500;

export async function requestBridge<T extends BridgeRequest["type"]>(
  type: T
): Promise<Extract<BridgeResponse, { ok: true; type: T }>> {
  const request: BridgeRequest = {
    id: globalThis.crypto.randomUUID(),
    source: SHAME_THE_WEB_BRIDGE_SOURCE,
    type
  };

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      reject(new Error("Extension bridge did not respond. Is the extension loaded?"));
    }, REQUEST_TIMEOUT_MS);

    function handleMessage(event: MessageEvent<unknown>) {
      if (event.source !== window || !isBridgeResponse(event.data) || event.data.id !== request.id) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);

      if (!event.data.ok) {
        reject(new Error(event.data.error));
        return;
      }

      resolve(event.data as Extract<BridgeResponse, { ok: true; type: T }>);
    }

    window.addEventListener("message", handleMessage);
    window.postMessage(request, window.location.origin);
  });
}

function isBridgeResponse(message: unknown): message is BridgeResponse {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Partial<BridgeResponse>;
  return candidate.source === SHAME_THE_WEB_EXTENSION_SOURCE && typeof candidate.id === "string";
}
