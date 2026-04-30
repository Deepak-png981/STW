import type {
  CategoryScore,
  PageMetrics,
  RoastSelection,
  ScoreCategory,
  VisitRecord
} from "@shame-the-web/shared";

export type ScoreResult = {
  speedScore100: number;
  categoryScores: CategoryScore[];
  overallScore100: number;
};

export function calculateScores(metrics: PageMetrics): ScoreResult {
  const speedScore100 = average([
    metricScore(metrics.loadMs, 1000, 8000),
    metricScore(metrics.fcpMs, 500, 4000),
    metricScore(metrics.lcpMs, 1200, 7000)
  ]);
  const responsivenessScore100 = metricScore(metrics.domInteractiveMs, 500, 5000);
  const stabilityScore100 = metrics.lcpMs === null ? 60 : metricScore(metrics.lcpMs, 1500, 6500);
  const polishScore100 = average([speedScore100, responsivenessScore100, stabilityScore100]);
  const categoryScores = createCategoryScores({
    speed: speedScore100,
    responsiveness: responsivenessScore100,
    stability: stabilityScore100,
    polish: polishScore100
  });

  return {
    speedScore100,
    categoryScores,
    overallScore100: average(categoryScores.map((score) => score.score100))
  };
}

export function createVisitRecord(input: {
  userId: string;
  url: string;
  title: string;
  metrics: PageMetrics;
  roast: RoastSelection;
}): VisitRecord {
  const scores = calculateScores(input.metrics);
  const url = new URL(input.url);

  return {
    id: createId(),
    userId: input.userId,
    url: input.url,
    hostname: url.hostname.toLowerCase(),
    title: input.title,
    timestamp: new Date().toISOString(),
    metrics: input.metrics,
    speedScore100: scores.speedScore100,
    categoryScores: scores.categoryScores,
    overallScore100: scores.overallScore100,
    roast: input.roast
  };
}

export function collectPageMetrics(performanceApi: Performance = performance): PageMetrics {
  const navigation = performanceApi.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const paintEntries = performanceApi.getEntriesByType("paint");
  const fcpEntry = paintEntries.find((entry) => entry.name === "first-contentful-paint");
  const lcpEntries = performanceApi.getEntriesByType("largest-contentful-paint");
  const lcpEntry = lcpEntries.at(-1);

  return {
    loadMs: navigation ? Math.round(navigation.loadEventEnd || navigation.duration) : null,
    fcpMs: fcpEntry ? Math.round(fcpEntry.startTime) : null,
    lcpMs: lcpEntry ? Math.round(lcpEntry.startTime) : null,
    domInteractiveMs: navigation ? Math.round(navigation.domInteractive) : null
  };
}

function createCategoryScores(scores: Record<ScoreCategory, number>): CategoryScore[] {
  return Object.entries(scores).map(([category, score100]) => ({
    category: category as ScoreCategory,
    score10: Math.ceil(score100 / 10),
    score100
  }));
}

function metricScore(value: number | null, excellentMs: number, poorMs: number): number {
  if (value === null) {
    return 60;
  }

  if (value <= excellentMs) {
    return 100;
  }

  if (value >= poorMs) {
    return 0;
  }

  const ratio = (value - excellentMs) / (poorMs - excellentMs);
  return clampScore(Math.round(100 - ratio * 100));
}

function average(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `visit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
