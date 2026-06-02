import type { EducationNavTarget } from "./education-content";
import { scoreCategories } from "../lib/score-categories";

type EducationPanelProps = {
  onNavigate: (panel: EducationNavTarget) => void;
};

type FeatureRow = {
  id: string;
  title: string;
  description: string;
  panel: EducationNavTarget;
};

const featureRows: readonly FeatureRow[] = [
  {
    id: "roast",
    title: "Auto-benchmarks every page you visit",
    description: "Speed, paint, and interactivity, measured quietly, then roasted.",
    panel: "history"
  },
  {
    id: "graph",
    title: "Builds a knowledge graph from your browsing",
    description: "Pages become nodes. Shared topics connect them.",
    panel: "knowledge"
  },
  {
    id: "search",
    title: "On-device semantic search",
    description: "Ask in plain language. Results ranked by meaning, not keywords.",
    panel: "knowledge"
  },
  {
    id: "chat",
    title: "Local AI chat over your history",
    description: "Find where you read something. Answers come from your graph, on-device.",
    panel: "knowledge"
  },
  {
    id: "transfer",
    title: "Export and import your knowledge",
    description: "Move your browsing graph to another browser or profile.",
    panel: "settings"
  }
] as const;

const steps = [
  { n: "1", label: "Browse with the extension on" },
  { n: "2", label: "Pages get scored + indexed" },
  { n: "3", label: "Graph connects related pages" },
  { n: "4", label: "Search or chat your memory" }
] as const;

export function EducationPanel({ onNavigate }: EducationPanelProps) {
  return (
    <div className="edu-page">
      <header className="edu-hero section-card dark-card">
        <div className="edu-hero-copy">
          <p className="eyebrow">Field guide</p>
          <h2>Your private browsing coach.</h2>
          <p className="edu-hero-lede">
            Shame The Web scores every page, roasts the slow ones, and builds a local knowledge graph you can search
            and chat with, all on-device.
          </p>
        </div>
        <ol className="edu-steps" aria-label="How it works">
          {steps.map((step) => (
            <li key={step.n} className="edu-step">
              <span className="edu-step-n">{step.n}</span>
              <span className="edu-step-label">{step.label}</span>
            </li>
          ))}
        </ol>
      </header>

      <section className="edu-section section-card">
        <header className="edu-section-head">
          <p className="eyebrow">Score rules</p>
          <h3>Four things every roast measures</h3>
        </header>
        <div className="edu-score-grid">
          {scoreCategories.map((cat) => (
            <article key={cat.key} className={`edu-score-card edu-score-card--${cat.key}`}>
              <div className="edu-score-card-top">
                <span className="edu-score-icon-wrap">
                  <CategoryIcon category={cat.key} />
                </span>
                <h4>{cat.label}</h4>
              </div>
              <p className="edu-score-desc">{cat.description}</p>
              <p className="edu-score-hint">
                <span className="edu-score-hint-label">Look for</span> {cat.hint}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="edu-section section-card">
        <header className="edu-section-head">
          <p className="eyebrow">Features</p>
          <h3>What runs while you browse</h3>
        </header>
        <ul className="edu-feature-list">
          {featureRows.map((feature) => (
            <li key={feature.id} className={`edu-feature-row edu-feature-row--${feature.id}`}>
              <div className="edu-feature-copy">
                <strong>{feature.title}</strong>
                <p>{feature.description}</p>
              </div>
              <button
                type="button"
                className="button button-secondary edu-feature-btn"
                onClick={() => onNavigate(feature.panel)}
              >
                Open
                <ArrowIcon />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="edu-privacy">
        <LockIcon />
        Everything stays on your device. No account, no cloud upload of your browsing.
      </p>
    </div>
  );
}

function CategoryIcon({ category }: { category: (typeof scoreCategories)[number]["key"] }) {
  switch (category) {
    case "speed":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 14h4l2-5 3 9 2-6h5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "responsiveness":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" strokeLinecap="round" />
        </svg>
      );
    case "stability":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M8 21H5a2 2 0 0 1-2-2v-2M16 21h3a2 2 0 0 0 2-2v-2M3 7V5a2 2 0 0 1 2-2h2M21 7V5a2 2 0 0 0-2-2h-2M8 12h8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "polish":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 3l2.2 6.8H21l-5.5 4 2.1 6.7L12 16.8 6.4 20.5l2.1-6.7L3 9.8h6.8L12 3z" strokeLinejoin="round" />
        </svg>
      );
    default: {
      const exhaustiveCheck: never = category;
      return exhaustiveCheck;
    }
  }
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
    </svg>
  );
}
