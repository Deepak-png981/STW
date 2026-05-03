export const SHAME_THE_WEB_BRIDGE_SOURCE = "shame-the-web-dashboard" as const;
export const SHAME_THE_WEB_EXTENSION_SOURCE = "shame-the-web-extension" as const;

export type PageContent = {
  url: string;
  title: string;
  description: string;
  headings: string[];
  bodyText: string;
  keywords: string[];
  visitedAt: string;
};

export type KnowledgeNode = {
  id: string;
  label: string;
  hostname: string;
  url: string;
  keywords: string[];
  visitCount: number;
  lastVisited: string;
  clusterId: number;
};

export type KnowledgeEdge = {
  source: string;
  target: string;
  weight: number;
};

export type KnowledgeGraph = {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  builtAt: string;
};

export type KnowledgeSearchResult = {
  url: string;
  title: string;
  hostname: string;
  lastVisited: string;
  snippet: string;
  score: number;
};
export const EXTENSION_INSTALL_URL =
  "https://github.com/deepak-io/shame_the_web/releases/latest" as const;

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
  toastEnabled: boolean;
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
  | { id: string; source: typeof SHAME_THE_WEB_BRIDGE_SOURCE; type: "ping" }
  | { id: string; source: typeof SHAME_THE_WEB_BRIDGE_SOURCE; type: "getSession" }
  | { id: string; source: typeof SHAME_THE_WEB_BRIDGE_SOURCE; type: "getVisits" }
  | { id: string; source: typeof SHAME_THE_WEB_BRIDGE_SOURCE; type: "getStats" }
  | { id: string; source: typeof SHAME_THE_WEB_BRIDGE_SOURCE; type: "getRoasts" }
  | { id: string; source: typeof SHAME_THE_WEB_BRIDGE_SOURCE; type: "getKnowledgeGraph" }
  | { id: string; source: typeof SHAME_THE_WEB_BRIDGE_SOURCE; type: "searchKnowledge"; query: string };

export type BridgeEvent =
  | {
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      event: "ready";
      version: string;
    }
  | {
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      event: "visitRecorded";
      visit: VisitRecord;
    }
  | {
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      event: "graphUpdated";
      nodeCount: number;
    };

export type BridgeResponse =
  | {
      id: string;
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      ok: true;
      type: "ping";
      data: { version: string };
    }
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
      ok: true;
      type: "getRoasts";
      data: { visits: VisitRecord[] };
    }
  | {
      id: string;
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      ok: true;
      type: "getKnowledgeGraph";
      data: { graph: KnowledgeGraph };
    }
  | {
      id: string;
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      ok: true;
      type: "searchKnowledge";
      data: { results: KnowledgeSearchResult[] };
    }
  | {
      id: string;
      source: typeof SHAME_THE_WEB_EXTENSION_SOURCE;
      ok: false;
      type: BridgeRequest["type"];
      error: string;
    };

export {
  SHAME_THE_WEB_DASHBOARD_ORIGINS,
  designTokens,
  designTokensAsCssVariables
} from "./design-tokens";
export { summarizeVisits } from "./stats";
