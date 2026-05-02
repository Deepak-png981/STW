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
    default: {
      const exhaustiveCheck: never = message.type;
      return exhaustiveCheck;
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
      candidate.type === "getRoasts")
  );
}
