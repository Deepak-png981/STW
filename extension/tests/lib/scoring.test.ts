import { describe, expect, it } from "vitest";

import { calculateScores, createVisitRecord } from "../../src/lib/scoring";

describe("performance scoring", () => {
  it("scores fast pages near the top of the 100 point scale", () => {
    const result = calculateScores({
      loadMs: 900,
      fcpMs: 350,
      lcpMs: 800,
      domInteractiveMs: 250
    });

    expect(result.speedScore100).toBeGreaterThanOrEqual(90);
    expect(result.overallScore100).toBeGreaterThanOrEqual(90);
    expect(result.categoryScores).toContainEqual({
      category: "speed",
      score10: 10,
      score100: result.speedScore100
    });
  });

  it("scores very slow pages as fossil-tier candidates", () => {
    const result = calculateScores({
      loadMs: 8200,
      fcpMs: 3200,
      lcpMs: 6900,
      domInteractiveMs: 4100
    });

    expect(result.speedScore100).toBeLessThanOrEqual(25);
    expect(result.overallScore100).toBeLessThanOrEqual(30);
  });

  it("creates a visit record with normalized hostname and category scores", () => {
    const record = createVisitRecord({
      userId: "user-1",
      url: "https://Example.com/products?ref=test",
      title: "Example Shop",
      metrics: {
        loadMs: 2100,
        fcpMs: 800,
        lcpMs: 1700,
        domInteractiveMs: 650
      },
      roast: {
        category: "good",
        templateId: "good-1",
        message: "Respectable. Annoyingly competent.",
        subline: "Speed score: 82/100"
      }
    });

    expect(record.hostname).toBe("example.com");
    expect(record.categoryScores).toHaveLength(4);
    expect(record.speedScore100).toBeGreaterThan(0);
  });
});
