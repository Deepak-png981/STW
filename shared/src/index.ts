export const SHAME_THE_WEB_BRIDGE_SOURCE = "shame-the-web-dashboard" as const;
export const SHAME_THE_WEB_EXTENSION_SOURCE = "shame-the-web-extension" as const;

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type ScoreBand = "lightning" | "good" | "okay" | "slow" | "fossil";

export type ScoreCategory = "speed" | "responsiveness" | "stability" | "polish";

export type CategoryScore = {
  category: ScoreCategory;
  score10: number;
  score100: number;
};

export type PageMetrics = {
  loadMs: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  domInteractiveMs: number | null;
};

export type RoastSelection = {
  category: ScoreBand;
  templateId: string;
  message: string;
  subline: string;
};

export type VisitRecord = {
  id: string;
  userId: string;
  url: string;
  hostname: string;
  title: string;
  timestamp: string;
  metrics: PageMetrics;
  speedScore100: number;
  categoryScores: CategoryScore[];
  overallScore100: number;
  roast: RoastSelection;
};

export type StoredState = {
  users: UserProfile[];
  activeUserId: string | null;
  visits: VisitRecord[];
  recentRoastTemplateIds: Record<string, string[]>;
};

export type DashboardStats = {
  totalVisits: number;
  uniqueHosts: number;
  averageSpeedScore100: number;
  averageOverallScore100: number;
  fastestHost: string | null;
  slowestHost: string | null;
};

export type BridgeRequest =
  | { id: string; source: typeof SHAME_THE_WEB_BRIDGE_SOURCE; type: "getSession" }
  | { id: string; source: typeof SHAME_THE_WEB_BRIDGE_SOURCE; type: "getVisits" }
  | { id: string; source: typeof SHAME_THE_WEB_BRIDGE_SOURCE; type: "getStats" };

export type BridgeResponse =
  | {
      id: string;
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      ok: true;
      type: "getSession";
      data: { activeUser: UserProfile | null };
    }
  | {
      id: string;
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      ok: true;
      type: "getVisits";
      data: { visits: VisitRecord[] };
    }
  | {
      id: string;
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      ok: true;
      type: "getStats";
      data: DashboardStats;
    }
  | {
      id: string;
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      ok: false;
      type: BridgeRequest["type"];
      error: string;
    };

export { summarizeVisits } from "./stats";
