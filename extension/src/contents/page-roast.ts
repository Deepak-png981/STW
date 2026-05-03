import type { PlasmoCSConfig } from "plasmo";

import { getRoastCategory, pickRoast } from "../lib/roast-templates";
import { calculateScores, collectPageMetrics, createVisitRecord } from "../lib/scoring";
import { chromeStorageDriver, getActiveUser, getRecentRoastTemplateIds } from "../lib/storage";
import { renderRoastToast, shouldShowToast } from "../content/toast";
import { extractPageContent } from "../lib/content-extractor";
import type { RawPageContent } from "../lib/content-extractor";
import { waitForStableDom } from "../lib/wait-for-stable-dom";

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  exclude_matches: [
    "http://localhost:5173/*",
    "https://shametheweb.com/*",
    "https://www.shametheweb.com/*"
  ],
  run_at: "document_idle"
};

declare global {
  interface Window {
    __stwSpaNavHooks?: true;
    __stwIndexAbort?: AbortController;
  }
}

function installSpaNavigationHooks(onHrefChange: () => void): void {
  if (typeof window === "undefined" || window.__stwSpaNavHooks) {
    return;
  }
  window.__stwSpaNavHooks = true;

  let lastUrl = window.location.href;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    debounceTimer = null;
    const href = window.location.href;
    if (href !== lastUrl) {
      lastUrl = href;
      onHrefChange();
    }
  };

  const schedule = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(flush, 600);
  };

  // Patch history API — catches most SPAs (React Router, Next.js, Svelte Kit, …)
  const { pushState, replaceState } = history;

  history.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
    pushState.apply(this, args);
    schedule();
  };

  history.replaceState = function (this: History, ...args: Parameters<History["replaceState"]>) {
    replaceState.apply(this, args);
    schedule();
  };

  window.addEventListener("popstate", schedule);

  // Polling fallback — catches edge cases where the framework bypasses pushState
  // (e.g. some X.com / React Navigation builds, hash-only routers, etc.).
  // Runs every second; cheap because it's just a string comparison.
  setInterval(() => {
    const href = window.location.href;
    if (href !== lastUrl) {
      lastUrl = href;
      // Skip the debounce: the interval already provides natural spacing.
      onHrefChange();
    }
  }, 1000);
}

export async function runPageRoast() {
  // Capture URL and title before any await — if the user navigates away during
  // async operations (getActiveUser, sendMessage, etc.) the URL would change and
  // we would store content under the wrong key.
  const urlAtStart = window.location.href;
  const titleAtStart = (typeof document !== "undefined" ? document.title : "") || window.location.hostname;

  const activeUser = await getActiveUser(chromeStorageDriver);
  if (!activeUser) {
    return;
  }

  // If the user navigated away while we were fetching the active user, abort.
  if (window.location.href !== urlAtStart) {
    return;
  }

  const canShowToast = shouldShowToast(urlAtStart);
  if (!canShowToast) {
    // We still want to index in the background even if the toast was suppressed
    // (e.g. duplicate URL within the cooldown). Indexing is idempotent: same URL
    // overwrites in IndexedDB.
    void indexCurrentPage(urlAtStart);
    return;
  }

  const metrics = collectPageMetrics();
  const provisionalScore = calculateScores(metrics).speedScore100;
  const category = getRoastCategory(provisionalScore);
  const recentTemplateIds = await getRecentRoastTemplateIds(chromeStorageDriver, activeUser.id, category);
  const roast = pickRoast({
    score: provisionalScore,
    hostname: new URL(urlAtStart).hostname,
    recentTemplateIds
  });
  const visit = createVisitRecord({
    userId: activeUser.id,
    url: urlAtStart,
    title: titleAtStart,
    metrics,
    roast
  });

  const response = await chrome.runtime.sendMessage({
    type: "recordVisit",
    visit,
    roast: {
      category: roast.category,
      templateId: roast.templateId
    }
  });

  if (response?.ok !== true) {
    return;
  }

  renderRoastToast({
    message: roast.message,
    subline: roast.subline,
    durationMs: 2500
  });

  void indexCurrentPage(urlAtStart);
}

/**
 * Background-indexes whatever page is currently visible.
 *
 * Strategy (no site-specific logic):
 *   1. Take an immediate best-effort snapshot so very fast pages get indexed
 *      right away.
 *   2. Wait for the DOM to stabilize (no mutations for ~1.5s, body has some
 *      text). This handles SPA navigations that fill content asynchronously.
 *   3. Take a second snapshot. If anything materially improved (title length,
 *      description length, or body length), re-store it.
 *   4. If the URL changes mid-flight, abort — the new navigation will start
 *      its own indexing pass.
 */
async function indexCurrentPage(urlAtStart: string): Promise<void> {
  // Cancel any in-flight indexing for the previous URL before starting a new one.
  window.__stwIndexAbort?.abort();
  const controller = new AbortController();
  window.__stwIndexAbort = controller;
  const { signal } = controller;

  const sendIfFresh = async (content: RawPageContent): Promise<boolean> => {
    if (signal.aborted || window.location.href !== urlAtStart) {
      return false;
    }
    try {
      await chrome.runtime.sendMessage({ type: "storePageContent", content });
      return true;
    } catch {
      return false;
    }
  };

  let initial: RawPageContent;
  try {
    initial = extractPageContent();
  } catch {
    return;
  }
  const sent = await sendIfFresh(initial);
  if (!sent) {
    return;
  }

  await waitForStableDom({
    signal,
    quietMs: 1500,
    maxWaitMs: 8000,
    minBodyChars: 400
  });

  if (signal.aborted || window.location.href !== urlAtStart) {
    return;
  }

  let stable: RawPageContent;
  try {
    stable = extractPageContent();
  } catch {
    return;
  }

  if (isMaterialImprovement(initial, stable)) {
    await sendIfFresh(stable);
  }
}

function isMaterialImprovement(prev: RawPageContent, next: RawPageContent): boolean {
  const titleGrew = next.title.length > prev.title.length + 4 && next.title !== prev.title;
  const descGrew = next.description.length > prev.description.length + 64;
  const bodyGrew = next.bodyText.length > prev.bodyText.length + 512;
  const headingsGrew = next.headings.length > prev.headings.length;
  return titleGrew || descGrew || bodyGrew || headingsGrew;
}

if (typeof window !== "undefined" && typeof chrome !== "undefined") {
  installSpaNavigationHooks(() => {
    void runPageRoast();
  });
  void runPageRoast();
}
