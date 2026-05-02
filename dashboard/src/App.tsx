import { useEffect, useState } from "react";

import { EXTENSION_INSTALL_URL, summarizeVisits } from "@shame-the-web/shared";
import type { DashboardStats, ScoreCategory, UserProfile, VisitRecord } from "@shame-the-web/shared";

import { navigate, resolveAppRoute } from "./lib/app-routing";
import { pingBridge, requestBridge, subscribeBridgeEvents } from "./lib/bridge";
import {
  formatScore,
  formatTimestamp,
  formatTiming,
  getAverageCategoryScores,
  getAverageMetrics,
  getCoachCopy,
  getCoachGrade,
  getRecentTrend,
  getTopHosts,
  getWorstHosts
} from "./lib/dashboard-helpers";

import { HandWrittenTitle } from "./components/ui/hand-writing-text";
import { NotFoundPage } from "./components/ui/404-page-not-found";

function Link({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const isInternal = href.startsWith("/") && !href.startsWith("//");

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isInternal) return;
    const [path, hash] = href.split("#");
    e.preventDefault();
    navigate(path || "/");
    if (hash) {
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}

const categories: Array<{
  key: ScoreCategory;
  label: string;
  description: string;
  hint: string;
}> = [
  {
    key: "speed",
    label: "Speed",
    description: "Speed is about how long the page makes you wait before it feels ready.",
    hint: "Look for heavy scripts, oversized images, and slow server responses."
  },
  {
    key: "responsiveness",
    label: "Responsiveness",
    description: "Responsiveness is about whether taps, clicks, and scrolling feel instant or delayed.",
    hint: "Look for long tasks, blocked input, and pages that ignore you for a second."
  },
  {
    key: "stability",
    label: "Stability",
    description: "Stability is about whether the page settles down instead of wobbling around.",
    hint: "Look for late-loading media, layout shifts, and content that jumps under the cursor."
  },
  {
    key: "polish",
    label: "Polish",
    description: "Polish is the overall feeling that the page was built with care.",
    hint: "Look for rough loading states, janky transitions, and pages that feel unfinished."
  }
];

const metricCards = [
  {
    key: "loadMs",
    label: "Average load",
    shortLabel: "Load",
    description: "How long pages generally took to finish loading."
  },
  {
    key: "fcpMs",
    label: "First Contentful Paint",
    shortLabel: "FCP",
    description: "How long it took before the first visible content appeared."
  },
  {
    key: "lcpMs",
    label: "Largest Contentful Paint",
    shortLabel: "LCP",
    description: "How long it took before the main content was likely visible."
  },
  {
    key: "domInteractiveMs",
    label: "DOM Interactive",
    shortLabel: "DOM",
    description: "How long it took before the page structure was ready for interaction."
  }
] as const;

export function App() {
  const [route, setRoute] = useState(() => resolveAppRoute(window.location.pathname));
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [bridgeStatus, setBridgeStatus] = useState("Connecting to extension bridge...");
  const [bridgeUnavailable, setBridgeUnavailable] = useState(false);
  const stats = summarizeVisits(visits);
  const isDashboardRoute = route === "dashboard";
  const is404Route = route === "404";

  useEffect(() => {
    function handleNavigation() {
      setRoute(resolveAppRoute(window.location.pathname));
    }

    window.addEventListener("popstate", handleNavigation);
    return () => {
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  useEffect(() => {
    if (!isDashboardRoute) {
      return;
    }

    let isMounted = true;
    const unsubscribe = subscribeBridgeEvents((event) => {
      if (!isMounted) {
        return;
      }

      switch (event.event) {
        case "ready":
          setBridgeStatus(`Extension bridge ready (v${event.version}).`);
          return;
        case "visitRecorded":
          setVisits((currentVisits) => [event.visit, ...currentVisits.filter((visit) => visit.id !== event.visit.id)]);
          return;
        default: {
          const exhaustiveCheck: never = event;
          return exhaustiveCheck;
        }
      }
    });

    async function loadDashboardData() {
      try {
        const version = await pingBridge();
        const [sessionResponse, visitsResponse] = await Promise.all([
          requestBridge("getSession"),
          requestBridge("getVisits")
        ]);

        if (!isMounted) {
          return;
        }

        setActiveUser(sessionResponse.data.activeUser);
        setVisits(visitsResponse.data.visits.slice().reverse());
        setBridgeUnavailable(false);
        setBridgeStatus(`Local extension data loaded (v${version}).`);
      } catch (error) {
        if (isMounted) {
          setBridgeUnavailable(true);
          setBridgeStatus(
            error instanceof Error
              ? error.message
              : "Unable to connect to extension bridge. Install the extension to unlock local stats."
          );
        }
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isDashboardRoute]);

  if (is404Route) {
    return <NotFoundPage />;
  }

  if (!isDashboardRoute) {
    return (
      <main className="page-shell landing-page-shell" id="top">
        <LandingPage />
      </main>
    );
  }

  return (
    <main className="page-shell dashboard-page-shell" id="top">
      <Dashboard
        activeUser={activeUser}
        stats={stats}
        visits={visits}
        bridgeStatus={bridgeStatus}
        bridgeUnavailable={bridgeUnavailable}
      />
    </main>
  );
}

function LandingPage() {
  return (
    <section className="landing">
      <nav className="landing-nav" aria-label="Landing navigation">
            <img src="/Tlogo.png" alt="Shame The Web" className="brand-logo" />
        <div>
          <a href="#how-it-works">How it works</a>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard#scores">Scores</Link>
        </div>
      </nav>

      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">A playful performance coach for your browser</p>
          <h1>The &nbsp; web &nbsp; has been getting away &nbsp; with &nbsp; &nbsp;&nbsp;&nbsp;&nbsp; murder.</h1>
          <p className="hero-lede">
            Shame The Web watches real browsing performance, scores the pages you visit, and turns slow sites
            into teachable roast material.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/dashboard">
              Open Dashboard
            </Link>
            <Link className="button button-secondary" href="/dashboard#scores">
              See Scores
            </Link>
            <Link className="button button-ghost" href="/dashboard#history">
              View Roast History
            </Link>
          </div>
          <p className="hero-microcopy">No spreadsheets. No corporate dashboards. Just scores, roasts, and useful clues.</p>
          <div className="hero-visual" aria-hidden="true">
            <span className="hero-star hero-star-large">✦</span>
            <span className="hero-star hero-star-small">✧</span>
            <span className="hero-dot hero-dot-lime" />
            <span className="hero-dot hero-dot-pink" />
            <div className="hero-throttle">
              <span />
            </div>
            <div className="hero-speedometer">
              <div className="speedometer-arc">
                <span className="speedometer-tick tick-1" />
                <span className="speedometer-tick tick-2" />
                <span className="speedometer-tick tick-3" />
                <span className="speedometer-tick tick-4" />
                <span className="speedometer-needle" />
                <span className="speedometer-center" />
              </div>
              <div className="speedometer-readout">
                {/* <span>88</span>
                <small>web score</small> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="landing-section" id="how-it-works">
        <div>
          <p className="eyebrow">How the shame happens</p>
          <h2>Browse normally. Let the coach make it weirdly useful.</h2>
        </div>
        <div className="steps-grid">
          <StepCard number="01" title="Add the extension" copy="Create your local profile and let Shame The Web keep score while you browse." />
          <StepCard number="02" title="Use the web normally" copy="No special tests. The product watches real pages during real browsing." />
          <StepCard number="03" title="Every visit gets judged" copy="Speed, responsiveness, stability, and polish roll up into a simple score." />
          <StepCard number="04" title="Roasts become coaching" copy="The dashboard explains what went wrong and which sites deserve another look." />
        </div>
      </section>

      <section className="trust-card" id="extension">
        <div>
          <p className="eyebrow">Local dashboard context</p>
          <h2>Built around your recent Shame The Web profile.</h2>
          <p>
            The dashboard focuses on performance signals, scores, and roast history instead of turning your browsing
            into an enterprise report.
          </p>
        </div>
        <div className="trust-meta">
          <span className="status-bar">Local-first experience</span>
          <a
            className="author-link"
            href="https://www.linkedin.com/in/deepak-joshi-software-engineer/"
            target="_blank"
            rel="noreferrer"
          >
            Author: Deepak Joshi
          </a>
        </div>
      </section>
    </section>
  );
}

function Dashboard({
  activeUser,
  stats,
  visits,
  bridgeStatus,
  bridgeUnavailable
}: {
  activeUser: UserProfile | null;
  stats: DashboardStats;
  visits: VisitRecord[];
  bridgeStatus: string;
  bridgeUnavailable: boolean;
}) {
  const categoryAverages = getAverageCategoryScores(visits);
  const metrics = getAverageMetrics(visits);
  const worstHosts = getWorstHosts(visits);
  const topHosts = getTopHosts(visits);
  const recentTrend = getRecentTrend(visits, 10);
  const weakestCategory = getCategoryByScore(categoryAverages, "weakest");
  const strongestCategory = getCategoryByScore(categoryAverages, "strongest");
  const coachGrade = getCoachGrade(stats.averageOverallScore100);
  const hasVisits = visits.length > 0;

  return (
    <section className="dashboard-frame" id="dashboard">
      <div className="dashboard-shell">
        <DashboardSidebar hasVisits={hasVisits} />

        <div className="dashboard-canvas">
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">Your web performance coach</p>
              <h2>{activeUser ? `${activeUser.name}'s shame report` : "Your coach is waiting for material."}</h2>
              <p>
                {hasVisits
                  ? `Based on ${stats.totalVisits} recent visits across ${stats.uniqueHosts} sites.`
                  : "Create a local profile in the extension popup, browse a few sites, and your coach will start filling this in."}
              </p>
              <p className="bridge-status">{bridgeStatus}</p>
              {bridgeUnavailable ? (
                <p>
                  Extension missing?{" "}
                  <a href={EXTENSION_INSTALL_URL} target="_blank" rel="noreferrer">
                    Install from latest release
                  </a>{" "}
                  and load unpacked in Chrome developer mode.
                </p>
              ) : null}
            </div>
            <div className="header-actions">
              <a className="button button-dark" href="#offenders">
                Review Worst Offender
              </a>
              <a className="button button-secondary" href="#education">
                Learn Score Rules
              </a>
            </div>
          </header>

          <section className="metrics-grid" aria-label="Overview metrics">
            <MetricCard label="Total Roasts" value={stats.totalVisits} copy={hasVisits ? "The archive is getting spicy." : "No sites have been roasted yet."} />
            <MetricCard label="Unique Sites" value={stats.uniqueHosts} copy={hasVisits ? "Different corners of the web have been judged." : "Browse a few pages to start building your offender list."} />
            <MetricCard label="Average Speed" value={formatScore(hasVisits ? stats.averageSpeedScore100 : undefined)} copy={hasVisits ? getCoachCopy(stats.averageSpeedScore100) : "Not enough visits to calculate a fair score."} />
            <MetricCard label="Average Overall" value={formatScore(hasVisits ? stats.averageOverallScore100 : undefined)} copy={hasVisits ? coachGrade.label : "Your grade appears after the first few roasts."} />
          </section>

          <section className="dashboard-grid">
            <article className="coach-card grade-card">
              <div>
                <p className="card-kicker">Current Shame Grade</p>
                <strong>{hasVisits ? coachGrade.grade : "—"}</strong>
                <p>{hasVisits ? getCoachCopy(stats.averageOverallScore100) : "No data yet. The coach is stretching dramatically."}</p>
              </div>
              <span className={`grade-badge grade-${coachGrade.tone}`}>{hasVisits ? coachGrade.label : "Waiting"}</span>
            </article>

            <article className="coach-card">
              <p className="card-kicker">Best Site</p>
              <h3>{topHosts[0]?.hostname ?? "No champion yet"}</h3>
              <p>{topHosts[0] ? `${formatScore(topHosts[0].averageScore)} - Clean. Snappy. Suspiciously responsible.` : "A fast site will earn this spot soon."}</p>
            </article>

            <article className="coach-card">
              <p className="card-kicker">Worst Offender</p>
              <h3>{worstHosts[0]?.hostname ?? "No culprit yet"}</h3>
              <p>{worstHosts[0] ? `${formatScore(worstHosts[0].averageScore)} - This page arrived like it had to ask permission.` : "The offender board is empty for now."}</p>
            </article>

            <article className="coach-card">
              <p className="card-kicker">Category Diagnosis</p>
              <h3>{hasVisits ? getCategoryLabel(weakestCategory) : "Waiting"}</h3>
              <p>{hasVisits ? `${getCategoryLabel(strongestCategory)} is strongest. ${getCategoryLabel(weakestCategory)} needs the coach whistle.` : "Scores by category appear after visits are recorded."}</p>
            </article>
          </section>

          <section className="section-card" id="scores">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Score analytics</p>
                <h2>Four ways the web can embarrass itself.</h2>
              </div>
              <a className="button button-secondary" href="#history">
                Jump to History
              </a>
            </div>
            <div className="score-list">
              {categories.map((category) => (
                <ScoreRow
                  key={category.key}
                  label={category.label}
                  score={hasVisits ? categoryAverages[category.key] : undefined}
                  copy={category.description}
                />
              ))}
            </div>
          </section>

          <section className="two-column">
            <article className="section-card dark-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recent score trail</p>
                  <h2>A tiny performance skyline.</h2>
                </div>
              </div>
              {recentTrend.length > 0 ? (
                <div className="trend-bars" aria-label="Recent visit scores">
                  {recentTrend.map((point, index) => (
                    <div className="trend-point" key={`${point.hostname}-${point.score}-${index}`}>
                      <span
                        aria-hidden="true"
                        style={{ height: `${Math.max(14, getScorePercent(point.score))}%` }}
                      />
                      <small>{point.score}</small>
                      <span className="sr-only">
                        {point.hostname}: {point.score} out of 100
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">No score trail yet. Visit a few pages and this will turn into a tiny performance skyline.</p>
              )}
            </article>

            <article className="section-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Raw timing, translated</p>
                  <h2>Metrics without the spreadsheet smell.</h2>
                </div>
              </div>
              <div className="timing-grid">
                {metricCards.map((metric) => (
                  <div className="timing-card" key={metric.key}>
                    <span>{metric.shortLabel}</span>
                    <strong>{formatTiming(metrics[metric.key])}</strong>
                    <p>{metric.description}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="section-card" id="offenders">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Offender leaderboard</p>
                <h2>The sites most in need of a small public shaming.</h2>
              </div>
              <a className="button button-dark" href="#history">
                Review Roast History
              </a>
            </div>
            <div className="offender-list">
              {worstHosts.length > 0 ? (
                worstHosts.slice(0, 4).map((host, index) => (
                  <article className="offender-card" key={host.hostname}>
                    <span className="rank">#{index + 1}</span>
                    <div>
                      <h3>{host.hostname}</h3>
                      <p>
                        {host.visitCount} {host.visitCount === 1 ? "visit" : "visits"} - Worst category:{" "}
                        {getCategoryLabel(host.worstCategory)}
                      </p>
                    </div>
                    <strong>{formatScore(host.averageScore)}</strong>
                    <div className="score-track" aria-label={`${host.hostname}: ${host.averageScore} out of 100`}>
                      <span style={{ width: `${getScorePercent(host.averageScore)}%` }} />
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-copy">No offenders yet. The leaderboard is wearing a tiny blank cape.</p>
              )}
            </div>
          </section>

          <section className="section-card" id="education">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Learn score rules</p>
                <h2>What your coach is actually judging.</h2>
              </div>
            </div>
            <div className="education-grid">
              {categories.map((category) => (
                <article className="education-card" key={category.key}>
                  <span>{category.label}</span>
                  <p>{category.description}</p>
                  <strong>What to look for</strong>
                  <p>{category.hint}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section-card" id="history">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Roast history</p>
                <h2>Recent visits, scores, and coach commentary.</h2>
              </div>
            </div>
            <div className="history-list">
              {visits.length > 0 ? (
                visits.slice(0, 10).map((visit) => (
                  <article className="history-item" key={visit.id}>
                    <div>
                      <h3>{visit.hostname}</h3>
                      <p>{visit.roast.message}</p>
                      <small>
                        {visit.categoryScores
                          .map((score) => `${getCategoryLabel(score.category)}: ${score.score100}`)
                          .join(" | ")}
                      </small>
                    </div>
                    <div className="history-score">
                      <strong>{formatScore(visit.overallScore100)}</strong>
                      <span>{formatTimestamp(visit.timestamp)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-copy">
                  Once you browse with a local profile active, recent visits will appear here with scores, roasts,
                  and timing clues.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function DashboardSidebar({ hasVisits }: { hasVisits: boolean }) {
  return (
    <aside className="dashboard-sidebar">
      <div>
        <Link className="sidebar-brand" href="/">
          STW
        </Link>
        <p>Scores, roasts, and tiny performance consequences.</p>
      </div>
      <nav aria-label="Dashboard navigation">
        <a href="#dashboard">Overview</a>
        <a href="#scores">Scores</a>
        <a href="#offenders">Offenders</a>
        <a href="#education">Education</a>
        <a href="#history">History</a>
      </nav>
      <div className="sidebar-callout">
        <span>Coach Mode</span>
        <p>{hasVisits ? "Watching for slow pages, weird delays, and layout chaos." : "Waiting for a few pages to judge."}</p>
        <Link className="button button-primary" href="/">
          Back to Landing
        </Link>
      </div>
    </aside>
  );
}

function StepCard({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <article className="step-card">
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function MetricCard({ label, value, copy }: { label: string; value: string | number; copy: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{copy}</p>
    </article>
  );
}

function ScoreRow({ label, score, copy }: { label: string; score?: number; copy: string }) {
  const safeScore = typeof score === "number" ? score : 0;

  return (
    <article className="score-row">
      <div>
        <h3>{label}</h3>
        <p>{copy}</p>
      </div>
      <strong>{formatScore(score)}</strong>
      <div className="score-track" aria-label={`${label}: ${safeScore} out of 100`}>
        <span style={{ width: `${getScorePercent(safeScore)}%` }} />
      </div>
    </article>
  );
}

function getCategoryByScore(categoryAverages: Record<ScoreCategory, number>, mode: "strongest" | "weakest"): ScoreCategory {
  return categories.reduce<ScoreCategory>((selected, category) => {
    if (mode === "strongest") {
      return categoryAverages[category.key] > categoryAverages[selected] ? category.key : selected;
    }

    return categoryAverages[category.key] < categoryAverages[selected] ? category.key : selected;
  }, "speed");
}

function getCategoryLabel(category: ScoreCategory): string {
  return categories.find((item) => item.key === category)?.label ?? category;
}

function getScorePercent(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
