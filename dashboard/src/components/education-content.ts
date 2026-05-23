export type EducationNavTarget =
  | "dashboard"
  | "scores"
  | "offenders"
  | "history"
  | "knowledge"
  | "settings";

export type EducationCapability = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  detail: string;
  panel: EducationNavTarget;
  cta: string;
  variant: "light" | "dark" | "accent";
};

export type EducationFlowStep = {
  step: string;
  title: string;
  body: string;
};

export const educationIntro = {
  eyebrow: "Field guide",
  title: "What Shame The Web does while you browse.",
  lede:
    "It is part performance coach, part roast machine, and part private memory of the web, scoring pages you visit, teasing the slow ones, and building a local knowledge graph you can actually search and chat with.",
  promises: [
    "Roasts and scores stay on your device",
    "Knowledge graph + AI run locally in the extension",
    "No account, no cloud upload of your browsing"
  ] as const
};

export const educationCapabilities: readonly EducationCapability[] = [
  {
    id: "roast",
    kicker: "On every visit",
    title: "Tiny performance roasts",
    body: "The extension quietly benchmarks each page (load time, paint, interactivity) and leaves you a witty verdict you will pretend not to enjoy.",
    detail: "Scores roll into Overview, Offenders, and History automatically.",
    panel: "history",
    cta: "See roast history",
    variant: "light"
  },
  {
    id: "scores",
    kicker: "Four judges",
    title: "Speed, responsiveness, stability, polish",
    body: "Not one vague 'performance score': four separate grades so you know whether the page is slow, laggy, jumpy, or just unfinished.",
    detail: "Charts and timing averages live in Scores.",
    panel: "scores",
    cta: "Open score analytics",
    variant: "dark"
  },
  {
    id: "graph",
    kicker: "Visual memory",
    title: "Your browsing knowledge graph",
    body: "Every page you visit becomes a node. Shared topics draw lines between them: YouTube rabbit holes, docs deep-dives, and guilty-pleasure tabs, connected.",
    detail: "Open Knowledge to explore the graph and see how your reading clusters.",
    panel: "knowledge",
    cta: "Explore the graph",
    variant: "accent"
  },
  {
    id: "search",
    kicker: "On-device search",
    title: "Semantic search over your history",
    body: "Ask the graph in plain language ('pages about local AI', 'that GitHub repo about transformers') and get pages ranked by meaning, not just keyword luck.",
    detail: "Embeddings run locally via Transformers.js in a hidden offscreen document.",
    panel: "knowledge",
    cta: "Try semantic search",
    variant: "light"
  },
  {
    id: "chat",
    kicker: "Local AI chat",
    title: "Ask where you read something",
    body: "'Where did I read about offscreen documents?' The chat searches your indexed pages, cites the sources, and answers without sending your history to a server.",
    detail: "Optional WebLLM model; retrieval-first answers when the model is shy.",
    panel: "knowledge",
    cta: "Start a conversation",
    variant: "dark"
  },
  {
    id: "transfer",
    kicker: "Portable graph",
    title: "Export & import your knowledge",
    body: "Moving browsers or profiles? Export your graph as JSON, import elsewhere, and re-embed locally. Your browsing brain travels with you.",
    detail: "Merge or replace modes in Settings.",
    panel: "settings",
    cta: "Transfer settings",
    variant: "light"
  }
] as const;

export const educationFlowSteps: readonly EducationFlowStep[] = [
  {
    step: "01",
    title: "Browse normally",
    body: "Visit sites with the extension active. Each page gets scored and roasted in the background."
  },
  {
    step: "02",
    title: "Watch the dashboard fill in",
    body: "Overview, Scores, and Offenders update. History keeps the commentary archive."
  },
  {
    step: "03",
    title: "Graph grows automatically",
    body: "Knowledge indexes page text, embeds chunks locally, and connects related visits."
  },
  {
    step: "04",
    title: "Search & ask later",
    body: "Semantic search or chat when you remember reading something but not where."
  }
] as const;
