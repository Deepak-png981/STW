import { useCallback, useEffect, useRef, useState } from "react";

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
import { DashboardSettingsPanel } from "./components/DashboardSettingsPanel";
import { EducationPanel } from "./components/EducationPanel";
import { KnowledgeGraphPanel } from "./components/KnowledgeGraphPanel";
import { PrivacyPage } from "./pages/Privacy";
import { getCategoryLabel, scoreCategories } from "./lib/score-categories";

const DASHBOARD_NAV_IDS = ["dashboard", "scores", "offenders", "education", "history", "knowledge", "settings"] as const;
type DashboardNavId = (typeof DASHBOARD_NAV_IDS)[number];

function isDashboardNavId(id: string): id is DashboardNavId {
  return (DASHBOARD_NAV_IDS as readonly string[]).includes(id);
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>© 2026 ShameTheWeb. All rights reserved.</p>
    </footer>
  );
}

function Link({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const isInternal = href.startsWith("/") && !href.startsWith("//");

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isInternal) return;
    const [path, hash] = href.split("#");
    const targetPath = path || "/";
    e.preventDefault();
    navigate(targetPath);
    if (hash) {
      if (targetPath === "/dashboard" && isDashboardNavId(hash)) {
        window.history.replaceState(null, "", `#${hash}`);
        return;
      }
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

const landingStats = [
  { value: "1,248", label: "Pages Visited" },
  { value: "387", label: "Topics Discovered" },
  { value: "86", label: "Connections Made" },
  { value: "100%", label: "Private" }
] as const;

type LandingIcon = { path: string; filled?: boolean };

type LandingFeature = { title: string; copy: string; icon: LandingIcon };

const landingFeatures: LandingFeature[] = [
  {
    title: "Remembers what matters",
    copy: "We extract topics, ideas, and insights from the pages you visit.",
    icon: {
      path: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    }
  },
  {
    title: "Connects the dots",
    copy: "Related pages, concepts, and keywords are linked into a private graph.",
    icon: {
      path: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
    }
  },
  {
    title: "Search that actually works",
    copy: "Semantic search helps you find things you actually read.",
    icon: { path: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }
  },
  {
    title: "Chat with your own memory",
    copy: "Ask questions. Get answers with sources from your browsing.",
    icon: {
      path: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
    }
  }
];

type LandingStep = { number: string; title: string; copy: string; icon: LandingIcon };

const landingSteps: LandingStep[] = [
  {
    number: "01",
    title: "Install",
    copy: "Add the extension and create your local profile.",
    icon: {
      filled: true,
      path: "M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"
    }
  },
  {
    number: "02",
    title: "Browse",
    copy: "Use the web like normal. We observe, locally.",
    icon: {
      path: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    }
  },
  {
    number: "03",
    title: "Remember",
    copy: "Pages are processed and stored in your private graph.",
    icon: { path: "M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" }
  },
  {
    number: "04",
    title: "Search & Chat",
    copy: "Find anything. Ask anything. All from your own memory.",
    icon: { path: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" }
  }
];

const landingMemoryNodes = [
  { label: "Artificial Intelligence", className: "top-[-10px] left-6" },
  { label: "Design Systems", className: "top-[-5px] right-6" },
  { label: "React Performance", className: "left-[-28px] top-1/2 -translate-y-1/2" },
  { label: "Human Psychology", className: "right-[-28px] top-1/2 -translate-y-1/2" },
  { label: "Startups", className: "bottom-[-12px] left-12" },
  { label: "Reading List", className: "bottom-[-8px] right-10" }
] as const;

const landingDashboardMetrics = [
  { value: "1,248", label: "Pages" },
  { value: "387", label: "Topics" },
  { value: "86", label: "Conns" },
  { value: "42", label: "Tags" }
] as const;

const landingPrivacyItems = [
  "Everything is stored locally",
  "No cloud. No tracking. No selling.",
  "Open source models run on-device",
  "You own your memory."
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
        case "graphUpdated":
          // Handled inside KnowledgeGraphPanel via its own subscribeBridgeEvents hook.
          return;
        case "aiSetupProgress":
          // Handled inside KnowledgeGraphPanel via its own subscribeBridgeEvents hook.
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

  if (route === "privacy") {
    return (
      <main className="page-shell landing-page-shell" id="top">
        <PrivacyPage />
        <SiteFooter />
      </main>
    );
  }

  if (!isDashboardRoute) {
    return (
      <main className="page-shell landing-page-shell" id="top">
        <LandingPage />
        <SiteFooter />
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
    <div className="overflow-hidden rounded-3xl bg-[#15161a] shadow-2xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/20 bg-[#a9b277] px-6 py-6 sm:px-10">
        <Link href="/" className="flex h-14 items-center gap-2 overflow-hidden" aria-label="Shame The Web home">
          <img src="/Tlogo.png" alt="Shame The Web" className="h-16 w-auto object-contain" decoding="async" />
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-6 lg:gap-10" aria-label="Landing navigation">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold tracking-tight text-black lg:gap-10">
            <a className="transition-colors hover:text-black/70" href="#how-it-works">
              How it works
            </a>
            <a className="transition-colors hover:text-black/70" href="#features">
              Features
            </a>
            <Link className="transition-colors hover:text-black/70" href="/dashboard">
              Dashboard
            </Link>
            <Link className="transition-colors hover:text-black/70" href="/privacy">
              Privacy
            </Link>
          </div>
          <a
            className="rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-[#c4d36f] transition-all hover:brightness-110"
            href={EXTENSION_INSTALL_URL}
            target="_blank"
            rel="noreferrer"
          >
            Get Extension
          </a>
        </nav>
      </header>

      <main>
        <section className="grid grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-2 lg:px-10">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#c4d36f]">
              The Private Browsing Memory
            </p>
            <h1 className="mb-8 font-[Kablammo] text-4xl leading-tight text-white sm:text-5xl lg:text-7xl">
              YOUR BROWSING.
              <br />
              YOUR MEMORY.
              <br />
              <span className="text-[#c4d36f]">YOURS ALONE.</span>
            </h1>
            <p className="mb-10 max-w-md text-lg leading-relaxed text-white/70">
              Shame The Web builds a private memory of the web you visit and helps you search, understand, and learn
              from it &mdash; all on your device.
            </p>
            <div className="mb-10 flex flex-wrap gap-4">
              <a
                className="flex items-center gap-2 rounded-full bg-[#c4d36f] px-6 py-3 font-bold text-black transition-all duration-300 hover:scale-105 hover:opacity-90"
                href={EXTENSION_INSTALL_URL}
                target="_blank"
                rel="noreferrer"
              >
                <ChromeMark />
                Get Chrome Extension
              </a>
              <Link
                className="rounded-full border border-white/20 px-6 py-3 font-bold text-white transition-colors hover:bg-white/5"
                href="/dashboard"
              >
                Open Dashboard
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 text-[10px] font-bold uppercase tracking-widest text-white/50">
              <span className="flex items-center gap-1">
                <span className="text-[#c4d36f]">&#128274;</span> 100% Local
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#c4d36f]">&#9729;</span> No Cloud Sync
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#c4d36f]">&#128737;</span> Your Data Stays Yours
              </span>
            </div>
          </div>

          <HeroGraphic />
        </section>

        <section className="flex flex-col justify-center gap-8 border-t border-white/5 px-6 py-12 sm:flex-row sm:gap-16 lg:px-10">
          {landingStats.map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-3xl font-bold text-[#c4d36f]">{item.value}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-white/40">{item.label}</div>
            </div>
          ))}
        </section>

        <section className="bg-white/[0.02] px-6 py-20 lg:px-10" id="features">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#c4d36f]">
                Not just history. Understanding.
              </p>
              <h2 className="text-3xl font-bold leading-tight text-white">
                Your browsing history, upgraded to knowledge.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
              {landingFeatures.map((feature) => (
                <div key={feature.title} className="space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center text-[#c4d36f]">
                    <LandingGlyph icon={feature.icon} className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{feature.title}</h3>
                  <p className="text-xs leading-relaxed text-white/40">{feature.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-10 py-24 text-center" id="how-it-works">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#c4d36f]">How it works</p>
          <h2 className="mb-16 text-4xl font-bold text-white">Simple for you. Powerful under the hood.</h2>
          <div className="relative grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12%] right-[12%] top-12 hidden h-px border-t border-dashed border-white/20 lg:block" />
            {landingSteps.map((step) => (
              <div key={step.number} className="relative z-10 flex flex-col items-center">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-[#1b1c21]">
                  <LandingGlyph icon={step.icon} className="h-10 w-10 text-[#c4d36f]" />
                </div>
                <div className="mb-2 font-bold text-white">
                  {step.number}. {step.title}
                </div>
                <p className="px-6 text-xs text-white/40">{step.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#1b1c21]/50 px-10 py-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-20">
            <DashboardMockup />

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#c4d36f]">Private by Design</p>
              <h2 className="mb-8 text-3xl font-bold text-white">Your data never leaves your device.</h2>
              <ul className="mb-10 space-y-4">
                {landingPrivacyItems.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                    <svg
                      className="h-5 w-5 text-[#c4d36f]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-8">
                <p className="relative z-10 text-xl font-medium text-white">
                  <span className="text-[#c4d36f]">&ldquo;</span> The web forgets. Your browser doesn&apos;t have
                  to. <span className="text-[#c4d36f]">&rdquo;</span>
                </p>
                <svg
                  className="absolute bottom-[-20px] right-4 h-24 w-24 text-[#c4d36f] opacity-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function LandingGlyph({ icon, className }: { icon: LandingIcon; className?: string }) {
  if (icon.filled) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d={icon.path} />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d={icon.path} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
    </svg>
  );
}

function ChromeMark() {
  return (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/8/87/Google_Chrome_icon_%282011%29.png"
      alt=""
      className="h-5 w-5"
      aria-hidden="true"
    />
  );
}

function HeroGraphic() {
  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      <div className="relative flex h-80 w-80 items-center justify-center rounded-full border border-white/5">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-32 rounded-full bg-[#c4d36f]/20 blur-3xl" />
        </div>

        <div className="relative z-20 flex items-center justify-center rounded-full border border-[#c4d36f]/50 bg-[#15161a] p-6 shadow-[0_0_40px_rgba(196,211,111,0.35)]">
          <div className="absolute inset-0 scale-125 rounded-full border border-[#c4d36f]/20" />
          <svg className="h-10 w-10 text-[#c4d36f]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm-3 5c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm5 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>

        {landingMemoryNodes.map((node) => (
          <div key={node.label} className={`absolute z-30 ${node.className}`}>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1b1c21]/90 p-2.5 shadow-xl backdrop-blur-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c4d36f] shadow-[0_0_8px_rgba(196,211,111,0.6)]" />
              <span className="text-[10px] font-medium text-white">{node.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-[-20px] w-[90%] rounded-xl border border-white/10 bg-[#111] p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <svg className="h-4 w-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="w-full text-sm text-white/60">Search your browsing memory...</span>
          <div className="rounded-lg bg-[#c4d36f] p-2">
            <svg className="h-4 w-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        <div className="mt-3 text-[10px] font-medium text-white/40">Try: &ldquo;What did I read about AI agents?&rdquo;</div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="rounded-xl border border-[#333] bg-[#111111] p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#c4d36f]">
            <svg className="h-4 w-4 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-white">Browsing Memory</span>
        </div>
        <span className="rounded border border-white/10 bg-black/40 px-3 py-1 text-[10px] text-white/50">
          Search your memory...
        </span>
      </div>

      <div className="rounded-lg border border-white/5 bg-black/30 p-4">
        <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Recent Connections</div>
        <div className="relative flex h-24 items-center justify-center sm:h-32">
          <div className="absolute h-full w-full rounded border border-dashed border-white/10" />
          <div className="grid grid-cols-4 gap-2">
            <span className="h-2 w-2 rounded-full bg-[#c4d36f]" />
            <span className="h-2 w-2 rounded-full bg-[#8e84c4]" />
            <span className="h-2 w-2 rounded-full bg-[#7aa7c4]" />
            <span className="h-2 w-2 rounded-full bg-[#c4b56f]" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {landingDashboardMetrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <div className="text-xs text-white">{metric.value}</div>
              <div className="text-[8px] text-white/40">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
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

  const [activeNavId, setActiveNavId] = useState<DashboardNavId>(() => {
    const raw = window.location.hash.slice(1);
    return isDashboardNavId(raw) ? raw : "dashboard";
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  const goToPanel = useCallback((id: DashboardNavId) => {
    setActiveNavId(id);
    const hash = `#${id}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.scrollTop = 0;
    }
  }, [activeNavId]);

  useEffect(() => {
    function syncFromHash() {
      const raw = window.location.hash.slice(1);
      setActiveNavId(isDashboardNavId(raw) ? raw : "dashboard");
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("popstate", syncFromHash);
    };
  }, []);

  const isKnowledgeView = activeNavId === "knowledge";

  return (
    <section className="dashboard-frame" id="dashboard">
      <div className="dashboard-shell dashboard-shell--immersive">
        <DashboardSidebar activeNavId={activeNavId} onSelectPanel={goToPanel} />

        <div
          ref={canvasRef}
          className={`dashboard-canvas${isKnowledgeView ? " dashboard-canvas--immersive dashboard-canvas--knowledge" : " dashboard-canvas--flat"}`}
          role="main"
        >
          {activeNavId === "dashboard" ? (
            <>
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
                    Add to Chrome
                  </a>{" "}
                  from the Web Store.
                </p>
              ) : null}
            </div>
            <div className="header-actions">
              <button type="button" className="button button-dark" onClick={() => goToPanel("offenders")}>
                Review Worst Offender
              </button>
              <button type="button" className="button button-secondary" onClick={() => goToPanel("education")}>
                Learn Score Rules
              </button>
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
                <strong>{hasVisits ? coachGrade.grade : "N/A"}</strong>
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
            </>
          ) : null}

          {activeNavId === "scores" ? (
            <>
          <section className="section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Score analytics</p>
                <h2>Four ways the web can embarrass itself.</h2>
              </div>
              <button type="button" className="button button-secondary" onClick={() => goToPanel("history")}>
                Jump to History
              </button>
            </div>
            <div className="score-list">
              {scoreCategories.map((category) => (
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
                <div className="trend-chart" aria-label="Recent visit scores">
                  <div className="trend-chart-header">
                    <span className="trend-chart-caption">
                      Last {recentTrend.length} visits. Height is score (0-100).
                    </span>
                    <div className="trend-chart-scale" aria-hidden="true">
                      <span>100</span>
                      <span>50</span>
                      <span>0</span>
                    </div>
                  </div>
                  <div className="trend-chart-plot">
                    <div className="trend-bars">
                      {recentTrend.map((point, index) => (
                        <div className="trend-point" key={`${point.hostname}-${point.score}-${index}`}>
                          <span
                            aria-hidden="true"
                            className="trend-bar-fill"
                            style={{ height: `${Math.max(14, getScorePercent(point.score))}%` }}
                          />
                          <small>{point.score}</small>
                          <span className="trend-host-abbrev" title={point.hostname}>
                            {abbreviateHost(point.hostname)}
                          </span>
                          <span className="sr-only">
                            {point.hostname}: {point.score} out of 100
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
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
            </>
          ) : null}

          {activeNavId === "offenders" ? (
          <section className="section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Offender leaderboard</p>
                <h2>The sites most in need of a small public shaming.</h2>
              </div>
              <button type="button" className="button button-dark" onClick={() => goToPanel("history")}>
                Review Roast History
              </button>
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
          ) : null}

          {activeNavId === "education" ? <EducationPanel onNavigate={goToPanel} /> : null}

          {activeNavId === "history" ? (
          <section className="section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Roast history</p>
                <h2>Recent visits, scores, and coach commentary.</h2>
              </div>
            </div>
            <div className="history-list">
              {visits.length > 0 ? (
                visits.slice(0, 10).map((visit) => {
                  const visitTitle = (visit.title ?? "").trim();
                  const showTitle =
                    visitTitle && visitTitle.toLowerCase() !== visit.hostname.toLowerCase()
                      ? visitTitle
                      : visit.hostname;
                  const hostBelow = showTitle !== visit.hostname;
                  return (
                    <article className="history-item" key={visit.id}>
                      <div>
                        <h3 title={visit.url}>{showTitle}</h3>
                        {hostBelow ? <small className="history-host-line">{visit.hostname}</small> : null}
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
                  );
                })
              ) : (
                <p className="empty-copy">
                  Once you browse with a local profile active, recent visits will appear here with scores, roasts,
                  and timing clues.
                </p>
              )}
            </div>
          </section>
          ) : null}

          {activeNavId === "knowledge" ? <KnowledgeGraphPanel /> : null}
          {activeNavId === "settings" ? <DashboardSettingsPanel /> : null}
        </div>
      </div>
    </section>
  );
}

function DashboardSidebar({
  activeNavId,
  onSelectPanel
}: {
  activeNavId: DashboardNavId;
  onSelectPanel: (id: DashboardNavId) => void;
}) {
  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-top">
        <div className="sidebar-header">
          <Link className="sidebar-brand" href="/" aria-label="Shame The Web home">
            <img src="/Logof.png" alt="" className="sidebar-brand-logo" decoding="async" />
          </Link>
          <p className="sidebar-tagline">Scores, roasts, and a local, searchable web memory.</p>
        </div>
        <nav aria-label="Dashboard navigation">
          <button
            type="button"
            className={activeNavId === "dashboard" ? "is-active" : undefined}
            onClick={() => onSelectPanel("dashboard")}
          >
            Overview
          </button>
          <button
            type="button"
            className={activeNavId === "scores" ? "is-active" : undefined}
            onClick={() => onSelectPanel("scores")}
          >
            Scores
          </button>
          <button
            type="button"
            className={activeNavId === "offenders" ? "is-active" : undefined}
            onClick={() => onSelectPanel("offenders")}
          >
            Offenders
          </button>
          <button
            type="button"
            className={activeNavId === "education" ? "is-active" : undefined}
            onClick={() => onSelectPanel("education")}
          >
            Education
          </button>
          <button
            type="button"
            className={activeNavId === "history" ? "is-active" : undefined}
            onClick={() => onSelectPanel("history")}
          >
            History
          </button>
          <button
            type="button"
            className={activeNavId === "knowledge" ? "is-active" : undefined}
            onClick={() => onSelectPanel("knowledge")}
          >
            Knowledge
          </button>
          <button
            type="button"
            className={activeNavId === "settings" ? "is-active" : undefined}
            onClick={() => onSelectPanel("settings")}
          >
            Settings
          </button>
        </nav>
      </div>
      <Link className="sidebar-back" href="/" aria-label="Back to landing page">
        <span className="sidebar-back-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10.25 5.25h-4a1 1 0 00-1 1v11.5a1 1 0 001 1h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15.25 12.25h6.5m0 0l-2-2m2 2l-2 2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="sidebar-back-text">Back</span>
      </Link>
    </aside>
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

function abbreviateHost(hostname: string): string {
  const trimmed = hostname.replace(/^www\./, "");
  if (trimmed.length <= 10) {
    return trimmed;
  }
  return `${trimmed.slice(0, 8)}…`;
}

function getCategoryByScore(categoryAverages: Record<ScoreCategory, number>, mode: "strongest" | "weakest"): ScoreCategory {
  return scoreCategories.reduce<ScoreCategory>((selected, category) => {
    if (mode === "strongest") {
      return categoryAverages[category.key] > categoryAverages[selected] ? category.key : selected;
    }

    return categoryAverages[category.key] < categoryAverages[selected] ? category.key : selected;
  }, "speed");
}

function getScorePercent(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
