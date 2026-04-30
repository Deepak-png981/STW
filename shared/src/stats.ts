import type { DashboardStats, VisitRecord } from "./index";

export function summarizeVisits(visits: VisitRecord[]): DashboardStats {
  if (visits.length === 0) {
    return {
      totalVisits: 0,
      uniqueHosts: 0,
      averageSpeedScore100: 0,
      averageOverallScore100: 0,
      fastestHost: null,
      slowestHost: null
    };
  }

  const fastestVisit = [...visits].sort((a, b) => b.speedScore100 - a.speedScore100)[0] ?? null;
  const slowestVisit = [...visits].sort((a, b) => a.speedScore100 - b.speedScore100)[0] ?? null;

  return {
    totalVisits: visits.length,
    uniqueHosts: new Set(visits.map((visit) => visit.hostname)).size,
    averageSpeedScore100: average(visits.map((visit) => visit.speedScore100)),
    averageOverallScore100: average(visits.map((visit) => visit.overallScore100)),
    fastestHost: fastestVisit?.hostname ?? null,
    slowestHost: slowestVisit?.hostname ?? null
  };
}

function average(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
