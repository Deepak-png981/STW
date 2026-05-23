import { describe, expect, it } from "vitest";

import type { ScoreCategory, VisitRecord } from "@shame-the-web/shared";

import {
  formatScore,
  formatTimestamp,
  formatTiming,
  getAverageCategoryScores,
  getAverageMetrics,
  getCoachGrade,
  getRecentTrend,
  getWorstHosts
} from "../../src/lib/dashboard-helpers";

function visit(input: {
  hostname: string;
  score: number;
  timestamp?: string;
  categoryScores?: Partial<Record<ScoreCategory, number>>;
  metrics?: Partial<VisitRecord["metrics"]>;
}): VisitRecord {
  const categoryScores = (["speed", "responsiveness", "stability", "polish"] as const).map((category) => {
    const score100 = input.categoryScores?.[category] ?? input.score;

    return {
      category,
      score10: Math.ceil(score100 / 10),
      score100
    };
  });

  return {
    id: `${input.hostname}-${input.score}-${input.timestamp ?? "now"}`,
    userId: "user-1",
    url: `https://${input.hostname}/page`,
    hostname: input.hostname,
    title: input.hostname,
    timestamp: input.timestamp ?? "2026-05-01T00:00:00.000Z",
    metrics: {
      loadMs: input.metrics?.loadMs ?? null,
      fcpMs: input.metrics?.fcpMs ?? null,
      lcpMs: input.metrics?.lcpMs ?? null,
      domInteractiveMs: input.metrics?.domInteractiveMs ?? null
    },
    speedScore100: input.categoryScores?.speed ?? input.score,
    categoryScores,
    overallScore100: input.score,
    roast: {
      category: "okay",
      templateId: "okay-test",
      message: "This page loaded like it was gathering courage.",
      subline: `Score: ${input.score}/100`
    }
  };
}

describe("dashboard display helpers", () => {
  it("summarizes worst hosts by average score and visit count", () => {
    const hosts = getWorstHosts([
      visit({ hostname: "fast.test", score: 90 }),
      visit({ hostname: "slow.test", score: 40, categoryScores: { responsiveness: 20 } }),
      visit({ hostname: "slow.test", score: 50, categoryScores: { responsiveness: 30 } })
    ]);

    expect(hosts[0]).toMatchObject({
      hostname: "slow.test",
      averageScore: 45,
      visitCount: 2,
      worstCategory: "responsiveness"
    });
  });

  it("averages category scores and ignores missing metric values", () => {
    const visits = [
      visit({
        hostname: "one.test",
        score: 70,
        categoryScores: { speed: 60, responsiveness: 80, stability: 70, polish: 90 },
        metrics: { loadMs: 1000, fcpMs: 500, lcpMs: null, domInteractiveMs: 700 }
      }),
      visit({
        hostname: "two.test",
        score: 80,
        categoryScores: { speed: 80, responsiveness: 60, stability: 90, polish: 70 },
        metrics: { loadMs: 3000, fcpMs: null, lcpMs: 2500, domInteractiveMs: 900 }
      })
    ];

    expect(getAverageCategoryScores(visits)).toEqual({
      speed: 70,
      responsiveness: 70,
      stability: 80,
      polish: 80
    });

    expect(getAverageMetrics(visits)).toEqual({
      loadMs: 2000,
      fcpMs: 500,
      lcpMs: 2500,
      domInteractiveMs: 800
    });
  });

  it("formats scores, timings, grades, timestamps, and recent trend safely", () => {
    const trend = getRecentTrend(
      [
        visit({ hostname: "old.test", score: 10, timestamp: "2026-04-30T23:00:00.000Z" }),
        visit({ hostname: "new.test", score: 95, timestamp: "2026-05-01T00:00:00.000Z" })
      ],
      1
    );

    expect(trend).toEqual([{ hostname: "new.test", score: 95 }]);
    expect(formatScore(undefined)).toBe("N/A");
    expect(formatScore(106)).toBe("100 / 100");
    expect(formatTiming(undefined)).toBe("Not enough data");
    expect(formatTiming(2800)).toBe("2.8s");
    expect(getCoachGrade(72)).toMatchObject({ grade: "C", label: "Not cursed, just suspicious" });
    expect(formatTimestamp("2026-05-01T00:00:00.000Z", new Date("2026-05-01T00:12:00.000Z"))).toBe(
      "12 minutes ago"
    );
  });
});
