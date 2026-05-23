import { SHAME_THE_WEB_BRIDGE_SOURCE, SHAME_THE_WEB_EXTENSION_SOURCE } from "@shame-the-web/shared";
import type { BridgeEvent, BridgeRequest, BridgeResponse } from "@shame-the-web/shared";

const DEFAULT_REQUEST_TIMEOUT_MS = 1500;
const SLOW_REQUEST_TIMEOUT_MS = 20000;
const CHAT_REQUEST_TIMEOUT_MS = 120000;
const LOG_PREFIX = "[STW][dashboard bridge]";

const SLOW_REQUEST_TYPES: ReadonlySet<BridgeRequest["type"]> = new Set([
  "getAiSetupStatus",
  "semanticSearchKnowledge",
  "chatKnowledge",
  "importKnowledgeGraph",
  "exportKnowledgeGraph"
]);

export async function requestBridge<T extends BridgeRequest["type"]>(
  type: T,
  extra?: Record<string, unknown>
): Promise<Extract<BridgeResponse, { ok: true; type: T }>> {
  const request = {
    id: globalThis.crypto.randomUUID(),
    source: SHAME_THE_WEB_BRIDGE_SOURCE,
    type,
    ...extra
  } as BridgeRequest;

  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const timeoutMs =
      type === "chatKnowledge"
        ? CHAT_REQUEST_TIMEOUT_MS
        : SLOW_REQUEST_TYPES.has(type)
          ? SLOW_REQUEST_TIMEOUT_MS
          : DEFAULT_REQUEST_TIMEOUT_MS;
    logBridge("request:start", { type, timeoutMs });
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      warnBridge("request:timeout", {
        type,
        timeoutMs,
        durationMs: Math.round(performance.now() - startedAt)
      });
      reject(new Error("Extension bridge did not respond. Is the extension loaded?"));
    }, timeoutMs);

    function handleMessage(event: MessageEvent<unknown>) {
      if (event.source !== window || !isBridgeResponse(event.data) || event.data.id !== request.id) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);

      if (!event.data.ok) {
        warnBridge("request:error", {
          type,
          durationMs: Math.round(performance.now() - startedAt),
          error: event.data.error
        });
        reject(new Error(event.data.error));
        return;
      }

      logBridge("request:done", {
        type,
        durationMs: Math.round(performance.now() - startedAt)
      });
      resolve(event.data as Extract<BridgeResponse, { ok: true; type: T }>);
    }

    window.addEventListener("message", handleMessage);
    window.postMessage(request, window.location.origin);
  });
}

function logBridge(message: string, details?: unknown): void {
  if (!isBridgeDebugEnabled()) {
    return;
  }
  if (details === undefined) {
    console.info(LOG_PREFIX, message);
    return;
  }
  console.info(LOG_PREFIX, message, details);
}

function warnBridge(message: string, details?: unknown): void {
  if (!isBridgeDebugEnabled()) {
    return;
  }
  if (details === undefined) {
    console.warn(LOG_PREFIX, message);
    return;
  }
  console.warn(LOG_PREFIX, message, details);
}

function isBridgeDebugEnabled(): boolean {
  return window.localStorage.getItem("stwDebugLogs") === "1" || window.location.search.includes("stwDebug=1");
}

export async function pingBridge(): Promise<string> {
  const response = await requestBridge("ping");
  return response.data.version;
}

export function subscribeBridgeEvents(handler: (event: BridgeEvent) => void): () => void {
  function handleMessage(event: MessageEvent<unknown>) {
    if (event.source !== window || !isBridgeEvent(event.data)) {
      return;
    }

    handler(event.data);
  }

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}

function isBridgeResponse(message: unknown): message is BridgeResponse {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Partial<BridgeResponse>;
  return candidate.source === SHAME_THE_WEB_EXTENSION_SOURCE && typeof candidate.id === "string";
}

function isBridgeEvent(message: unknown): message is BridgeEvent {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Record<string, unknown>;
  if (candidate["source"] !== SHAME_THE_WEB_EXTENSION_SOURCE || typeof candidate["event"] !== "string") {
    return false;
  }

  switch (candidate["event"]) {
    case "ready":
      return typeof candidate["version"] === "string";
    case "visitRecorded":
      return !!candidate["visit"] && typeof candidate["visit"] === "object";
    case "graphUpdated":
      return typeof candidate["nodeCount"] === "number";
    case "aiSetupProgress":
      return !!candidate["status"] && typeof candidate["status"] === "object";
    default:
      return false;
  }
}
