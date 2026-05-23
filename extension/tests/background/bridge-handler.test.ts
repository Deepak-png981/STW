import { describe, expect, it } from "vitest";

import { SHAME_THE_WEB_BRIDGE_SOURCE } from "@shame-the-web/shared";
import type { BridgeRequest, StoredState } from "@shame-the-web/shared";

import { handleBridgeRequest } from "../../src/background/bridge-handler";

type SimpleRequestType = "ping" | "getSession" | "getVisits" | "getStats" | "getRoasts" | "getKnowledgeGraph";

function request(type: SimpleRequestType): BridgeRequest {
  return {
    id: `request-${type}`,
    source: SHAME_THE_WEB_BRIDGE_SOURCE,
    type
  } as BridgeRequest;
}

const state: StoredState = {
  users: [
    {
      id: "user-1",
      name: "Deepak",
      email: "deepak@example.com",
      createdAt: "2026-04-29T00:00:00.000Z"
    }
  ],
  activeUserId: "user-1",
  visits: [
    {
      id: "visit-1",
      userId: "user-1",
      url: "https://example.com",
      hostname: "example.com",
      title: "Example",
      timestamp: "2026-04-29T00:00:00.000Z",
      metrics: {
        loadMs: 1200,
        fcpMs: 500,
        lcpMs: 900,
        domInteractiveMs: 400
      },
      speedScore100: 94,
      categoryScores: [],
      overallScore100: 94,
      roast: {
        category: "lightning",
        templateId: "lightning-1",
        message: "Fast enough to dodge the roast.",
        subline: "Speed score: 94/100"
      }
    }
  ],
  recentRoastTemplateIds: {}
};

describe("dashboard bridge handler", () => {
  it("returns extension version on ping", () => {
    const response = handleBridgeRequest(request("ping"), state);

    expect(response.ok).toBe(true);
    expect(response.type).toBe("ping");
    if (response.ok && response.type === "ping") {
      expect(response.data.version).toBeTypeOf("string");
    }
  });

  it("returns the active local session", () => {
    const response = handleBridgeRequest(request("getSession"), state);

    expect(response.ok).toBe(true);
    expect(response.type).toBe("getSession");
    if (response.ok && response.type === "getSession") {
      expect(response.data.activeUser?.email).toBe("deepak@example.com");
    }
  });

  it("returns user-scoped visits only", () => {
    const response = handleBridgeRequest(request("getVisits"), {
      ...state,
      visits: [
        ...state.visits,
        {
          ...state.visits[0]!,
          id: "visit-2",
          userId: "other-user"
        }
      ]
    });

    expect(response.ok).toBe(true);
    if (response.ok && response.type === "getVisits") {
      expect(response.data.visits).toHaveLength(1);
      expect(response.data.visits[0]?.userId).toBe("user-1");
    }
  });

  it("returns roast history data for dashboard replay", () => {
    const response = handleBridgeRequest(request("getRoasts"), state);

    expect(response.ok).toBe(true);
    expect(response.type).toBe("getRoasts");
    if (response.ok && response.type === "getRoasts") {
      expect(response.data.visits).toHaveLength(1);
      expect(response.data.visits[0]?.hostname).toBe("example.com");
    }
  });

  it("rejects invalid bridge messages", () => {
    const response = handleBridgeRequest({ id: "bad", source: "unknown", type: "getVisits" }, state);

    expect(response.ok).toBe(false);
  });
});
