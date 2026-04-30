import { describe, expect, it } from "vitest";

import type { VisitRecord } from "./index";
import { summarizeVisits } from "./stats";

function visit(hostname: string, speedScore100: number): VisitRecord {
  return {
    id: `${hostname}-${speedScore100}`,
    userId: "user-1",
    url: `https://${hostname}`,
    hostname,
    title: hostname,
    timestamp: "2026-04-29T00:00:00.000Z",
    metrics: {
      loadMs: null,
      fcpMs: null,
      lcpMs: null,
      domInteractiveMs: null
    },
    speedScore100,
    categoryScores: [],
    overallScore100: speedScore100,
    roast: {
      category: "okay",
      templateId: "okay-1",
      message: "Fine, technically.",
      subline: `Speed score: ${speedScore100}/100`
    }
  };
}

describe("dashboard visit summary", () => {
  it("summarizes totals, averages, fastest host, and slowest host", () => {
    const stats = summarizeVisits([visit("fast.test", 95), visit("slow.test", 30), visit("fast.test", 85)]);

    expect(stats.totalVisits).toBe(3);
    expect(stats.uniqueHosts).toBe(2);
    expect(stats.averageSpeedScore100).toBe(70);
    expect(stats.fastestHost).toBe("fast.test");
    expect(stats.slowestHost).toBe("slow.test");
  });
});
