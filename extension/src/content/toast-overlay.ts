import { getRoastCategory, pickRoast } from "../lib/roast-templates";
import { calculateScores, collectPageMetrics, createVisitRecord } from "../lib/scoring";
import {
  appendVisit,
  chromeStorageDriver,
  getActiveUser,
  getRecentRoastTemplateIds,
  rememberRoastTemplate
} from "../lib/storage";
import { renderRoastToast, shouldShowToast } from "./toast";

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

  await appendVisit(chromeStorageDriver, visit);
  await rememberRoastTemplate(chromeStorageDriver, {
    userId: activeUser.id,
    category: roast.category,
    templateId: roast.templateId
  });

  renderRoastToast({
    message: roast.message,
    subline: roast.subline,
    durationMs: 2500
  });
}
