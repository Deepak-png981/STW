# Page visit pipeline

When a user with the extension installed lands on a page, **`background.ts` does not run automatically**. Chrome injects a **content script** first. The content script sends messages that wake the **service worker**.

## Preconditions

- Extension installed and enabled
- User **logged in** (`getActiveUser` in `page-roast.ts`) — without an active user, `runPageRoast` exits early and **no messages** are sent to the background

Excluded URLs (no content script): localhost dashboard, `shametheweb.com` — see `exclude_matches` in `page-roast.ts`.

## Timeline (typical visit)

```
T+0ms     Page loads; Plasmo injects page-roast.ts at document_idle
T+~50ms   runPageRoast() starts in the tab
T+~100ms  Background: recordVisit
          → visit saved to Chrome storage
          → dashboard tabs notified (visitRecorded)
T+~120ms  Roast toast shown (if not suppressed by cooldown)
T+~150ms  Background: storePageContent (snapshot #1)
          → PageContent written to IndexedDB
          → scheduleGraphRebuild (+5s debounce)
          → scheduleAiSetup (+1.5s debounce)
T+~1.7s   DOM stable; maybe storePageContent (snapshot #2) if content grew materially
          → debounce timers reset from this moment
T+~3s     runAiSetupInBackground → ensureSearchReady (chunk + embed)
T+~8s     Graph rebuild (5s after last storePageContent)
          → dashboard notified (graphUpdated)
```

Debouncing means rapid browsing coalesces work: three quick page loads ideally produce **one** graph rebuild and **one** AI indexing pass after activity settles.

## Step 1 — Content script: `runPageRoast()`

Entry point at the bottom of `extension/src/contents/page-roast.ts`:

```ts
installSpaNavigationHooks(() => { void runPageRoast(); });
void runPageRoast();
```

`runPageRoast` flow:

1. Snapshot `urlAtStart` and title **before any await** (SPA navigation safety)
2. `getActiveUser()` — abort if no user
3. Score page, pick roast template, build `VisitRecord`
4. `chrome.runtime.sendMessage({ type: "recordVisit", ... })`
5. Render toast
6. `void indexCurrentPage(urlAtStart)` — fire-and-forget indexing

### Toast suppressed but indexing continues

If `shouldShowToast` returns false (e.g. duplicate URL within cooldown), `recordVisit` is **skipped** but `indexCurrentPage` still runs. Indexing is idempotent: same URL overwrites in IndexedDB.

## Step 2 — Indexing: `indexCurrentPage()`

Strategy (no site-specific logic):

1. **Immediate snapshot** — `extractPageContent()` → `storePageContent`
2. **Wait for stable DOM** — `waitForStableDom` (~1.5s quiet, max 8s, min 400 body chars)
3. **Second snapshot** — if title/description/body/headings improved materially, store again
4. **Abort** if URL changed mid-flight (new navigation starts its own pass)

SPA navigations re-trigger `runPageRoast` via patched `history.pushState` / `replaceState`, `popstate`, and a 1s URL poll fallback.

## Step 3 — Background message handler

All messages go through `chrome.runtime.onMessage` → `handleRuntimeMessage` in `extension/background.ts`.

### `recordVisit`

```ts
await appendVisit(chromeStorageDriver, message.visit);
await rememberRoastTemplate(...);
await broadcastVisitRecorded(message.visit, sender.tab?.id);
```

Does **not** schedule graph rebuild or AI setup.

### `storePageContent`

```ts
await storePageContent(message.content);  // IndexedDB + TF-IDF keywords
scheduleGraphRebuild();                   // 5s debounce
scheduleAiSetup(1500);                    // 1.5s debounce
```

`storePageContent` in `content-storage.ts`:

- Runs `extractKeywords` (TF-IDF keywords on the page)
- Writes `PageContent` to IndexedDB `pageContent` store
- Prunes oldest pages when count exceeds 5000

## Debounced background jobs

### `scheduleGraphRebuild()` — 5 second debounce

On fire:

1. `getAllPageContents()` + `getState()` (visits)
2. `buildKnowledgeGraph(pages, visits)` — max 300 most recent nodes
3. `storeKnowledgeGraph(graph)`
4. `broadcastGraphUpdated` to open dashboard tabs

Timer resets on every `storePageContent`, so rebuild runs once after browsing pauses.

### `scheduleAiSetup(delayMs)` — default 1500ms after page store

On fire → `runAiSetupInBackground()`:

1. `ensureOffscreenDocument()`
2. `ensureSearchReady(pages)` — chunk + embed all pages
3. If pages exist and search ready → `ensureConversationReady()` (optional chat warmup)

Also triggered:

- `chrome.runtime.onInstalled` → `scheduleAiSetup(0)` immediately
- Dashboard `ping` bridge message → `scheduleAiSetup(0)`

## Dashboard-initiated paths (not on every page load)

When the user searches or chats from the dashboard, the background handles bridge messages directly:

| Message | Flow |
|---------|------|
| `semanticSearchKnowledge` | `ensureSearchReady` → `runSemanticSearch` |
| `chatKnowledge` | `ensureSearchReady` → `runSemanticSearch` → `ensureConversationReady` → `answerFromLocalKnowledge` |
| `getKnowledgeGraph` | Return cached graph or build synchronously if missing |
| `searchKnowledge` | TF-IDF only (no embeddings required) |

`ensureSearchReady` is idempotent: if all pages already have matching embeddings, indexing is skipped.

## Mental model

Two front doors into the background on a normal browse:

1. **`recordVisit`** — “the user saw this page” (analytics / roast layer)
2. **`storePageContent`** — “here is what the page says” (knowledge layer)

Only **#2** triggers graph rebuild and AI indexing schedulers.

## Related docs

- [Architecture overview](./architecture-overview.md)
- [Local AI and search](./local-ai-and-search.md)
- [Knowledge chunks and hashing](./knowledge-chunks-and-hashing.md)
