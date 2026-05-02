import type { PlasmoCSConfig } from "plasmo";
import { getRoastCategory, pickRoast } from "../lib/roast-templates";
import { calculateScores, collectPageMetrics, createVisitRecord } from "../lib/scoring";
import { chromeStorageDriver, getActiveUser, getRecentRoastTemplateIds } from "../lib/storage";
import { renderRoastToast, shouldShowToast } from "../content/toast";

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  exclude_matches: [
    "http://localhost:5173/*",
    "https://shametheweb.com/*",
    "https://www.shametheweb.com/*"
  ],
  run_at: "document_idle"
};

void runPageRoast();

async function runPageRoast() {
  const activeUser = await getActiveUser(chromeStorageDriver);

  if (!activeUser || !shouldShowToast(window.location.href)) {
    return;
  }

  const metrics = collectPageMetrics();
  const provisionalScore = calculateScores(metrics).speedScore100;
  const category = getRoastCategory(provisionalScore);
  const recentTemplateIds = await getRecentRoastTemplateIds(chromeStorageDriver, activeUser.id, category);
  const roast = pickRoast({
    score: provisionalScore,
    hostname: window.location.hostname,
    recentTemplateIds
  });
  const visit = createVisitRecord({
    userId: activeUser.id,
    url: window.location.href,
    title: document.title || window.location.hostname,
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
}
