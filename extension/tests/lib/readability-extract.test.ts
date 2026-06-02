/**
 * Tests for the pure Readability helper. It must:
 *   - extract clean article text (dropping chrome like nav / footer / ads)
 *     so the result is materially better than naive `body.textContent`,
 *   - return `null` for pages that are not articles (caller falls back),
 *   - never mutate the input document (Readability mutates, so we clone).
 *
 * The helper takes a `Document` so it stays unit-testable without globals.
 */

// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { extractReadableArticle } from "../../src/lib/readability-extract";

const NOISE_PHRASE = "Subscribe to our newsletter for daily deals";

/**
 * A realistic article: real prose wrapped in an <article>, surrounded by the
 * usual site chrome (nav, sidebar ads, footer) that Readability should strip.
 * Body is long enough to clear Readability's default character threshold.
 */
const ARTICLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>How Sea Otters Engineer Kelp Forests — Tide Pool Times</title>
    <meta name="author" content="Dr. Marina Reyes" />
  </head>
  <body>
    <header><a href="/">Tide Pool Times</a> · Home · Science · Oceans</header>
    <nav>Politics Sports Weather ${NOISE_PHRASE}</nav>
    <aside class="ad">Buy sea otter plushies now! ${NOISE_PHRASE}</aside>
    <main>
      <article>
        <h1>How Sea Otters Engineer Kelp Forests</h1>
        <p>
          Sea otters are a textbook keystone species, exerting an influence on
          their coastal ecosystems that is wildly out of proportion to their
          modest population. By relentlessly hunting sea urchins, they keep
          urchin numbers low enough that kelp forests can flourish along the
          rocky shorelines of the northern Pacific.
        </p>
        <p>
          When otters disappear from a stretch of coast, urchin populations
          explode and graze the kelp down to barren rock, producing what
          ecologists grimly call an urchin barren. The cascading loss of habitat
          removes shelter and food for fish, invertebrates, and countless other
          organisms that depend on the three-dimensional structure of the forest.
        </p>
        <p>
          Restoring otters therefore restores an entire community. Decades of
          monitoring along the California and Alaskan coasts show kelp density
          rebounding within just a few seasons of an otter population recovering,
          a vivid reminder that protecting a single predator can ripple outward
          through dozens of interdependent species.
        </p>
      </article>
    </main>
    <footer>${NOISE_PHRASE}. Copyright Tide Pool Times.</footer>
  </body>
</html>`;

const NON_ARTICLE_HTML = `<!doctype html>
<html lang="en">
  <head><title>Dashboard</title></head>
  <body>
    <nav>Home · Settings · Logout</nav>
    <div class="grid"><button>Open</button><button>Close</button></div>
  </body>
</html>`;

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("extractReadableArticle", () => {
  it("extracts clean article text that beats naive body.textContent", () => {
    const doc = parse(ARTICLE_HTML);
    const article = extractReadableArticle(doc);

    expect(article).not.toBeNull();
    expect(article?.textContent).toContain("keystone species");
    expect(article?.textContent).toContain("urchin barren");

    // The naive baseline includes the surrounding chrome...
    expect(doc.body.textContent).toContain(NOISE_PHRASE);
    // ...but the readable extraction drops it.
    expect(article?.textContent).not.toContain(NOISE_PHRASE);
  });

  it("surfaces the title and byline", () => {
    const article = extractReadableArticle(parse(ARTICLE_HTML));
    expect(article?.title).toContain("Sea Otters");
    expect(article?.byline).toContain("Marina Reyes");
  });

  it("yields nothing useful for non-article pages so the caller can fall back", () => {
    // Readability is policy-free here: it returns either null or a body too
    // short to be useful. Either way the caller's length threshold triggers the
    // heuristic fallback, which is the "falls back gracefully" guarantee.
    const article = extractReadableArticle(parse(NON_ARTICLE_HTML));
    const usefulChars = article?.textContent.length ?? 0;
    expect(usefulChars).toBeLessThan(400);
  });

  it("does not mutate the input document (operates on a clone)", () => {
    const doc = parse(ARTICLE_HTML);
    const before = doc.body.innerHTML;
    extractReadableArticle(doc);
    expect(doc.body.innerHTML).toBe(before);
  });
});
