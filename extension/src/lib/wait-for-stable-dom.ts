/**
 * Generic SPA-aware DOM stabilization.
 *
 * Resolves once one of:
 *   - `document.title` changes from its value at the start of the wait (the
 *     fastest and most reliable SPA signal — React, Vue, Svelte-based SPAs like
 *     X, Reddit, GitHub all update the title synchronously or within a few
 *     frames when the route changes),
 *   - the document body has gone `quietMs` without mutations and the body has
 *     at least `minBodyChars` of visible text,
 *   - we hit `maxWaitMs`, or
 *   - the supplied `signal` is aborted (e.g. URL changed again).
 *
 * No site-specific logic — works for any page.
 */
export async function waitForStableDom(options: {
  signal?: AbortSignal;
  quietMs?: number;
  maxWaitMs?: number;
  minBodyChars?: number;
}): Promise<void> {
  const quietMs = options.quietMs ?? 1500;
  const maxWaitMs = options.maxWaitMs ?? 8000;
  const minBodyChars = options.minBodyChars ?? 400;
  const signal = options.signal;

  if (!document.body) {
    return;
  }
  if (signal?.aborted) {
    return;
  }

  const startedAt = performance.now();
  const initialTitle = document.title;

  await new Promise<void>((resolve) => {
    let lastChange = performance.now();
    let bodyObserver: MutationObserver | null = null;
    let titleObserver: MutationObserver | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let finished = false;

    const cleanup = (): void => {
      if (finished) return;
      finished = true;
      bodyObserver?.disconnect();
      titleObserver?.disconnect();
      if (intervalId !== null) clearInterval(intervalId);
      signal?.removeEventListener("abort", finish);
      resolve();
    };

    const finish = (): void => {
      cleanup();
    };

    signal?.addEventListener("abort", finish, { once: true });

    // Watch body mutations — signals heavy content load (articles, threads, etc.)
    bodyObserver = new MutationObserver(() => {
      lastChange = performance.now();
    });
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false
    });

    // Watch <title> mutations — the fastest reliable SPA routing signal.
    // X.com, YouTube, Reddit, GitHub, Mastodon etc. all update document.title
    // synchronously (or within milliseconds) when the route changes.
    // A title change means the SPA has committed to the new page — resolve
    // immediately so the caller can take a fresh snapshot with the real content.
    const onTitleMutated = (): void => {
      if (document.title !== initialTitle) {
        finish();
      }
    };

    titleObserver = new MutationObserver(onTitleMutated);

    const titleEl = document.querySelector("title");
    if (titleEl) {
      // Observe the text node inside <title>
      titleObserver.observe(titleEl, { childList: true, characterData: true });
    }
    // Also observe <head> in case the <title> element itself is replaced
    titleObserver.observe(document.head, { childList: true });

    // Polling loop — resolves when body quiets down enough
    intervalId = setInterval(() => {
      if (finished) return;
      const now = performance.now();
      if (now - startedAt >= maxWaitMs) {
        finish();
        return;
      }
      const bodyLen = document.body?.innerText?.length ?? 0;
      if (now - lastChange >= quietMs && bodyLen >= minBodyChars) {
        finish();
      }
    }, 200);
  });
}
