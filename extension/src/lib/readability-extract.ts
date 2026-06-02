/**
 * Article extraction via Mozilla Readability (the engine behind Firefox Reader
 * View). It isolates the main prose of a page and discards chrome like nav,
 * sidebars, ads, and footers — far cleaner than walking `textContent`.
 *
 * Kept pure and testable: callers pass a `Document` rather than relying on the
 * global `document`. Readability *mutates* the DOM it parses, so we always work
 * on a detached clone and leave the caller's document untouched.
 */

import { Readability } from "@mozilla/readability";

export type ReadableArticle = {
  title: string;
  byline: string;
  textContent: string;
  excerpt: string;
};

const clean = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

/**
 * Returns the readable article for `doc`, or `null` when Readability decides
 * the page is not article-like (e.g. SPAs, dashboards, search results). A
 * `null` result is the signal for the caller to fall back to heuristics.
 */
export function extractReadableArticle(doc: Document): ReadableArticle | null {
  const clone = doc.cloneNode(true) as Document;
  const parsed = new Readability(clone).parse();
  if (!parsed) return null;

  const textContent = clean(parsed.textContent);
  if (!textContent) return null;

  return {
    title: clean(parsed.title),
    byline: clean(parsed.byline),
    textContent,
    excerpt: clean(parsed.excerpt)
  };
}
