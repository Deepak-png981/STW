const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
const OFFSCREEN_REASON: chrome.offscreen.Reason[] = ["WORKERS"];

export async function ensureOffscreenDocument(): Promise<boolean> {
  if (!chrome.offscreen?.createDocument) {
    return false;
  }

  try {
    const hasDocument = await hasOffscreenDocument();
    if (hasDocument) {
      return true;
    }

    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: OFFSCREEN_REASON,
      justification: "Run local embedding and chat runtimes without blocking the service worker."
    });
    return true;
  } catch {
    return false;
  }
}

async function hasOffscreenDocument(): Promise<boolean> {
  if (typeof chrome.offscreen.hasDocument === "function") {
    return chrome.offscreen.hasDocument();
  }

  const extensionOrigin = chrome.runtime.getURL("/");
  const matchedClients = await clients.matchAll();
  return matchedClients.some((client) => client.url.startsWith(extensionOrigin) && client.url.endsWith(OFFSCREEN_DOCUMENT_PATH));
}
