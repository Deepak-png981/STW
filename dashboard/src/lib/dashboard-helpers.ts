import type { ScoreCategory, VisitRecord } from "@shame-the-web/shared";

export type CategoryAverages = Record<ScoreCategory, number>;

export type AverageMetrics = {
  loadMs?: number;
  fcpMs?: number;
  lcpMs?: number;
  domInteractiveMs?: number;
};

export type CoachGrade = {
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  tone: "celebrate" | "positive" | "mixed" | "warning" | "danger";
};

export type HostSummary = {
  hostname: string;
  averageScore: number;
  visitCount: number;
  worstCategory: ScoreCategory;
};

export type TrendPoint = {
  hostname: string;
  score: number;
};

const scoreCategories = ["speed", "responsiveness", "stability", "polish"] as const;

export function getHostFromVisit(visit: VisitRecord): string {
  try {
    return new URL(visit.url).hostname || visit.hostname || "Unknown site";
  } catch {
    return visit.hostname || "Unknown site";
  }
}

export function getTopHosts(visits: VisitRecord[]): HostSummary[] {
  return getHostSummaries(visits).sort((a, b) => b.averageScore - a.averageScore);
}

export function getWorstHosts(visits: VisitRecord[]): HostSummary[] {
  return getHostSummaries(visits).sort((a, b) => a.averageScore - b.averageScore);
}

export function getAverageCategoryScores(visits: VisitRecord[]): CategoryAverages {
  return scoreCategories.reduce<CategoryAverages>(
    (averages, category) => ({
      ...averages,
      [category]: average(
        visits.flatMap((visit) =>
          visit.categoryScores.filter((score) => score.category === category).map((score) => score.score100)
        )
      )
    }),
    {
      speed: 0,
      responsiveness: 0,
      stability: 0,
      polish: 0
    }
  );
}

export function getRecentTrend(visits: VisitRecord[], limit = 10): TrendPoint[] {
  return visits
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
    .map((visit) => ({
      hostname: getHostFromVisit(visit),
      score: clampScore(visit.overallScore100)
    }));
}

export function getAverageMetrics(visits: VisitRecord[]): AverageMetrics {
  return {
    loadMs: averageDefined(visits.map((visit) => visit.metrics.loadMs)),
    fcpMs: averageDefined(visits.map((visit) => visit.metrics.fcpMs)),
    lcpMs: averageDefined(visits.map((visit) => visit.metrics.lcpMs)),
    domInteractiveMs: averageDefined(visits.map((visit) => visit.metrics.domInteractiveMs))
  };
}

export function getCoachGrade(score: number): CoachGrade {
  const safeScore = clampScore(score);

  if (safeScore >= 90) {
    return { grade: "A", label: "Shockingly decent", tone: "celebrate" };
  }

  if (safeScore >= 80) {
    return { grade: "B", label: "Mostly respectable", tone: "positive" };
  }

  if (safeScore >= 70) {
    return { grade: "C", label: "Not cursed, just suspicious", tone: "mixed" };
  }

  if (safeScore >= 60) {
    return { grade: "D", label: "Performance probation", tone: "warning" };
  }

  return { grade: "F", label: "Public shame material", tone: "danger" };
}

export function getCoachCopy(score: number): string {
  const grade = getCoachGrade(score);

  switch (grade.grade) {
    case "A":
      return "Clean. Snappy. Suspiciously responsible.";
    case "B":
      return "Mostly respectable, with only a few performance goblins.";
    case "C":
      return "The web is functional, but it is not beating the allegations.";
    case "D":
      return "Clicks should not feel like mailing a letter.";
    case "F":
      return "This page arrived like it had to ask permission.";
    default: {
      const exhaustiveGrade: never = grade.grade;
      return exhaustiveGrade;
    }
  }
}

export function formatTiming(ms?: number | null): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return "Not enough data";
  }

  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return `${Math.round(ms)}ms`;
}

export function formatScore(score?: number | null): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "N/A";
  }

  return `${clampScore(score)} / 100`;
}

export function formatTimestamp(timestamp?: string | number, now = new Date()): string {
  if (timestamp === undefined) {
    return "Recently";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  if (hours < 48) {
    return "Yesterday";
  }

  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function getHostSummaries(visits: VisitRecord[]): HostSummary[] {
  const groupedVisits = visits.reduce<Record<string, VisitRecord[]>>((groups, visit) => {
    const hostname = getHostFromVisit(visit);

    return {
      ...groups,
      [hostname]: [...(groups[hostname] ?? []), visit]
    };
  }, {});

  return Object.entries(groupedVisits).map(([hostname, hostVisits]) => {
    const categoryScores = getAverageCategoryScores(hostVisits);
    const worstCategory = scoreCategories.reduce<ScoreCategory>(
      (currentWorst, category) => (categoryScores[category] < categoryScores[currentWorst] ? category : currentWorst),
      "speed"
    );

    return {
      hostname,
      averageScore: average(hostVisits.map((visit) => visit.overallScore100)),
      visitCount: hostVisits.length,
      worstCategory
    };
  });
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function averageDefined(values: Array<number | null>): number | undefined {
  const definedValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (definedValues.length === 0) {
    return undefined;
  }

  return average(definedValues);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
