import {
  SHAME_THE_WEB_BRIDGE_SOURCE,
  SHAME_THE_WEB_EXTENSION_SOURCE,
  summarizeVisits
} from "@shame-the-web/shared";
import type { BridgeRequest, BridgeResponse, StoredState } from "@shame-the-web/shared";

export function handleBridgeRequest(message: unknown, state: StoredState): BridgeResponse {
  if (!isBridgeRequest(message)) {
    return {
      id: "unknown",
      source: SHAME_THE_WEB_EXTENSION_SOURCE,
      ok: false,
      type: "getSession",
      error: "Invalid bridge request."
    };
  }

  const activeUser = state.users.find((user) => user.id === state.activeUserId) ?? null;
  const visits = activeUser ? state.visits.filter((visit) => visit.userId === activeUser.id) : [];

  switch (message.type) {
    case "ping":
      return {
        id: message.id,
        source: SHAME_THE_WEB_EXTENSION_SOURCE,
        ok: true,
        type: "ping",
        data: { version: getExtensionVersion() }
      };
    case "getSession":
      return {
        id: message.id,
        source: SHAME_THE_WEB_EXTENSION_SOURCE,
        ok: true,
        type: "getSession",
        data: { activeUser }
      };
    case "getVisits":
      return {
        id: message.id,
        source: SHAME_THE_WEB_EXTENSION_SOURCE,
        ok: true,
        type: "getVisits",
        data: { visits }
      };
    case "getStats":
      return {
        id: message.id,
        source: SHAME_THE_WEB_EXTENSION_SOURCE,
        ok: true,
        type: "getStats",
        data: summarizeVisits(visits)
      };
    case "getRoasts":
      return {
        id: message.id,
        source: SHAME_THE_WEB_EXTENSION_SOURCE,
        ok: true,
        type: "getRoasts",
        data: { visits }
      };
    // These two types are intercepted in background.ts before reaching here.
    // The cases exist only to satisfy TypeScript exhaustiveness.
    case "getKnowledgeGraph":
    case "searchKnowledge":
      return {
        id: message.id,
        source: SHAME_THE_WEB_EXTENSION_SOURCE,
        ok: false,
        type: message.type,
        error: "Unexpected synchronous dispatch of async request."
      };
    default: {
      // TypeScript 6: access on `never` is an error, so assign `message` directly.
      const exhaustiveCheck: never = message;
      return exhaustiveCheck as unknown as BridgeResponse;
    }
  }
}

function getExtensionVersion(): string {
  const runtime = globalThis.chrome?.runtime;
  return runtime?.getManifest?.().version ?? "0.0.0";
}

function isBridgeRequest(message: unknown): message is BridgeRequest {
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
      candidate.type === "searchKnowledge")
  );
}
