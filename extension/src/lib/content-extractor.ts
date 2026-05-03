/**
 * Generic, site-agnostic page content extraction.
 *
 * Goals:
 *   - Read everything via standards (OpenGraph, Twitter cards, schema.org JSON-LD,
 *     `<main>` / `<article>`, plus shadow DOM walking) so this works on any site,
 *     including SPAs that swap content via history.pushState (X, YouTube, Reddit,
 *     Mastodon, news sites with virtual scrolling, etc).
 *   - No per-host special-casing.
 */

const NOISY_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "SVG",
  "IFRAME",
  "NAV",
  "FOOTER",
  "ASIDE",
  "FORM"
]);

const MAX_BODY_CHARS = 16_000;
const MAX_DESCRIPTION_CHARS = 4_000;
const MAX_HEADING_CHARS = 200;
const MAX_HEADINGS = 24;
const MAX_STRUCTURED_TEXT_CHARS = 6_000;

export type RawPageContent = {
  url: string;
  title: string;
  description: string;
  headings: string[];
  bodyText: string;
  visitedAt: string;
};

export function extractPageContent(): RawPageContent {
  const url = window.location.href;
  const visitedAt = new Date().toISOString();
  const ld = readJsonLd();

  const title = pickTitle(ld);
  const description = pickDescription(ld);
  const headings = pickHeadings();
  const mainText = pickMainText();
  const structuredText = pickStructuredBodyText(ld);

  const composed = mergeBodyText([structuredText, description, mainText]).slice(0, MAX_BODY_CHARS);

  return {
    url,
    title,
    description: description.slice(0, MAX_DESCRIPTION_CHARS),
    headings: headings.slice(0, MAX_HEADINGS),
    bodyText: composed,
    visitedAt
  };
}

/* -------------------------------------------------------------------------- */
/* Title / description selection                                              */
/* -------------------------------------------------------------------------- */

function pickTitle(ld: JsonLdValue[]): string {
  const candidates: string[] = [];

  pushIfMeaningful(candidates, metaContent('meta[property="og:title"]'));
  pushIfMeaningful(candidates, metaContent('meta[name="twitter:title"]'));
  pushIfMeaningful(candidates, metaContent('meta[itemprop="name"]'));
  pushIfMeaningful(candidates, ldString(ld, "headline"));
  pushIfMeaningful(candidates, ldString(ld, "name"));
  pushIfMeaningful(candidates, document.title);

  // Fallback: first meaningful <h1>.
  const h1 = document.querySelector("h1");
  pushIfMeaningful(candidates, h1?.textContent ?? "");

  for (const candidate of candidates) {
    const cleaned = candidate.replace(/\s+/g, " ").trim();
    if (cleaned.length >= 2) {
      return cleaned.length > 240 ? `${cleaned.slice(0, 237)}…` : cleaned;
    }
  }

  try {
    return new URL(window.location.href).hostname;
  } catch {
    return "";
  }
}

function pickDescription(ld: JsonLdValue[]): string {
  const candidates: string[] = [];

  pushIfMeaningful(candidates, metaContent('meta[property="og:description"]'));
  pushIfMeaningful(candidates, metaContent('meta[name="twitter:description"]'));
  pushIfMeaningful(candidates, metaContent('meta[name="description"]'));
  pushIfMeaningful(candidates, metaContent('meta[itemprop="description"]'));
  pushIfMeaningful(candidates, ldString(ld, "description"));
  pushIfMeaningful(candidates, ldString(ld, "abstract"));

  // Prefer the first meaningful candidate (priority order). `description` is a
  // short summary; we deliberately don't fall back to `articleBody` here — that
  // belongs in `bodyText` via `pickStructuredBodyText`.
  for (const candidate of candidates) {
    const cleaned = candidate.replace(/\s+/g, " ").trim();
    if (cleaned.length >= 12) {
      return cleaned;
    }
  }
  return candidates[0]?.replace(/\s+/g, " ").trim() ?? "";
}

function pickHeadings(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  walkElements(document.body, (el) => {
    if (out.length >= MAX_HEADINGS) return;
    const tag = el.tagName;
    if (tag !== "H1" && tag !== "H2" && tag !== "H3" && tag !== "H4") return;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text.length < 3 || text.length > MAX_HEADING_CHARS) return;
    if (seen.has(text)) return;
    seen.add(text);
    out.push(text);
  });

  return out;
}

/* -------------------------------------------------------------------------- */
/* Body text                                                                  */
/* -------------------------------------------------------------------------- */

function pickMainText(): string {
  const root = pickMainRoot();
  return collectVisibleText(root, MAX_BODY_CHARS);
}

function pickMainRoot(): ParentNode {
  // Prefer landmarks; fall back to the largest text-bearing block.
  const main = document.querySelector("main");
  if (main) return main;

  const article = document.querySelector("article");
  if (article) return article;

  const role = document.querySelector('[role="main"]');
  if (role) return role;

  const largest = pickLargestTextContainer();
  return largest ?? document.body ?? document;
}

/**
 * Best-effort: scan candidate containers and pick the one whose text-to-link
 * ratio looks most like article content. We avoid `body` here so we can score
 * against "noise" (header/footer/nav/aside) by exclusion.
 */
function pickLargestTextContainer(): Element | null {
  const candidates = document.querySelectorAll(
    [
      "[role=main]",
      "main",
      "article",
      "section",
      "[itemprop=articleBody]",
      "[data-testid=primaryColumn]",
      "[data-testid=tweet]",
      "#content",
      "#main",
      ".content",
      ".main",
      ".post",
      ".article",
      ".entry"
    ].join(",")
  );
  let best: Element | null = null;
  let bestScore = 0;
  candidates.forEach((el) => {
    const text = (el as HTMLElement).innerText ?? el.textContent ?? "";
    const score = text.replace(/\s+/g, " ").trim().length;
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  });
  return best;
}

function collectVisibleText(root: ParentNode, maxChars: number): string {
  const parts: string[] = [];
  let total = 0;

  const visit = (node: Node): void => {
    if (total >= maxChars) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (!text) return;
      const cleaned = text.replace(/\s+/g, " ").trim();
      if (!cleaned) return;
      total += cleaned.length + 1;
      parts.push(cleaned);
      return;
    }
    if (node instanceof Element) {
      if (NOISY_TAGS.has(node.tagName)) return;
      if (node.getAttribute("aria-hidden") === "true") return;
      if (node instanceof HTMLElement && node.hidden) return;

      // Walk shadow DOM if open.
      if (node.shadowRoot) {
        node.shadowRoot.childNodes.forEach(visit);
      }
      node.childNodes.forEach(visit);
      return;
    }
    if (node instanceof ShadowRoot || node instanceof DocumentFragment) {
      node.childNodes.forEach(visit);
    }
  };

  if (root instanceof Node) {
    visit(root);
  } else {
    document.body?.childNodes.forEach(visit);
  }

  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function walkElements(root: ParentNode | null, visit: (el: Element) => void): void {
  if (!root) return;
  const stack: Node[] = [];
  if (root instanceof Element || root instanceof Document) {
    stack.push(root);
  } else {
    root.childNodes.forEach((c) => stack.push(c));
  }
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node instanceof Element) {
      if (NOISY_TAGS.has(node.tagName)) continue;
      visit(node);
      if (node.shadowRoot) {
        node.shadowRoot.childNodes.forEach((c) => stack.push(c));
      }
      node.childNodes.forEach((c) => stack.push(c));
    } else if (node instanceof ShadowRoot || node instanceof DocumentFragment || node instanceof Document) {
      node.childNodes.forEach((c) => stack.push(c));
    }
  }
}

/* -------------------------------------------------------------------------- */
/* JSON-LD                                                                    */
/* -------------------------------------------------------------------------- */

type JsonLdValue = unknown;

function readJsonLd(): JsonLdValue[] {
  const out: JsonLdValue[] = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    const text = script.textContent;
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      out.push(parsed);
    } catch {
      // Some sites embed invalid trailing content; ignore.
    }
  });
  return out;
}

const STRUCTURED_TEXT_FIELDS = new Set([
  "name",
  "headline",
  "alternateName",
  "description",
  "abstract",
  "about",
  "articleBody",
  "text",
  "caption",
  "transcript",
  "summary",
  "keywords"
]);

function pickStructuredBodyText(ld: JsonLdValue[]): string {
  const out: string[] = [];
  let total = 0;

  const push = (value: string): void => {
    if (total >= MAX_STRUCTURED_TEXT_CHARS) return;
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    out.push(cleaned);
    total += cleaned.length + 1;
  };

  const walk = (value: JsonLdValue): void => {
    if (total >= MAX_STRUCTURED_TEXT_CHARS) return;
    if (value === null || value === undefined) return;
    if (typeof value === "string") {
      if (value.length >= 3) push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === "object") {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (STRUCTURED_TEXT_FIELDS.has(key)) {
          if (typeof child === "string") {
            push(child);
          } else if (Array.isArray(child)) {
            child.forEach(walk);
          } else if (child && typeof child === "object") {
            walk(child);
          }
        } else if (child && typeof child === "object") {
          walk(child);
        }
      }
    }
  };

  ld.forEach(walk);

  return out.join("\n").slice(0, MAX_STRUCTURED_TEXT_CHARS);
}

function ldString(ld: JsonLdValue[], field: string): string {
  let best = "";
  const walk = (value: JsonLdValue): void => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const candidate = record[field];
      if (typeof candidate === "string" && candidate.length > best.length) {
        best = candidate;
      } else if (candidate && typeof candidate === "object") {
        walk(candidate);
      }
      for (const child of Object.values(record)) {
        if (child && typeof child === "object") {
          walk(child);
        }
      }
    }
  };
  ld.forEach(walk);
  return best;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function metaContent(selector: string): string {
  const el = document.querySelector<HTMLMetaElement>(selector);
  return el?.content?.trim() ?? "";
}

function pushIfMeaningful(target: string[], value: string | null | undefined): void {
  if (!value) return;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length >= 2) target.push(cleaned);
}

function mergeBodyText(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const cleaned = part.trim();
    if (!cleaned) continue;
    const key = cleaned.slice(0, 96);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out.join("\n\n");
}
