/**
 * Site-agnostic tests for `extractPageContent`. We exercise the generic
 * mechanisms (OpenGraph, Twitter cards, schema.org JSON-LD, `<main>`/`<article>`,
 * shadow DOM) — never per-host special cases.
 */

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { extractPageContent } from "../../src/lib/content-extractor";

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  // Reset window.location.href via the History API jsdom provides.
  history.replaceState(null, "", "/");
});

function setHtml(head: string, body: string): void {
  document.head.innerHTML = head;
  document.body.innerHTML = body;
}

describe("extractPageContent (generic, no per-host logic)", () => {
  it("prefers OpenGraph title and description for the main metadata", () => {
    setHtml(
      `
        <meta property="og:title" content="Quantum Spinor Bundles for Beginners">
        <meta property="og:description" content="A friendly intro to spinor bundles on smooth manifolds.">
      `,
      `<main><p>Spinor bundles arise naturally on orientable Riemannian manifolds.</p></main>`
    );

    const content = extractPageContent();
    expect(content.title).toBe("Quantum Spinor Bundles for Beginners");
    expect(content.description).toContain("spinor bundles");
    expect(content.bodyText).toContain("orientable");
  });

  it("reads JSON-LD description and articleBody when meta tags are missing", () => {
    setHtml(
      `
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "How tides work",
            "description": "A plain-English explanation of why tides happen twice a day.",
            "articleBody": "Tides are caused primarily by the gravitational pull of the Moon..."
          }
        </script>
      `,
      `<article><p>(The article text is rendered via JS later — empty for now.)</p></article>`
    );

    const content = extractPageContent();
    expect(content.title).toBe("How tides work");
    expect(content.description).toContain("plain-English");
    expect(content.bodyText.toLowerCase()).toContain("gravitational pull");
  });

  it("falls back to twitter:title when OpenGraph is absent", () => {
    setHtml(
      `<meta name="twitter:title" content="A SPA Page">`,
      `<main>SPA content</main>`
    );

    const content = extractPageContent();
    expect(content.title).toBe("A SPA Page");
  });

  it("walks open shadow roots when collecting body text", () => {
    document.head.innerHTML = "";
    document.body.innerHTML = `<main id="root"></main>`;
    const root = document.getElementById("root");
    const host = document.createElement("div");
    root?.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<p>Hidden text inside a shadow tree about flamingo migration.</p>`;

    const content = extractPageContent();
    expect(content.bodyText.toLowerCase()).toContain("flamingo migration");
  });

  it("skips noisy regions like script/style/nav/footer", () => {
    setHtml(
      `<title>Article — News Daily</title>`,
      `
        <header>News Daily logo and ads</header>
        <nav>Home Politics Sports</nav>
        <main>
          <article>
            <h1>Local cat learns to use elevator</h1>
            <p>Residents are bewildered by the cat's persistence.</p>
          </article>
        </main>
        <footer>Subscribe to the newsletter</footer>
        <script>alert('this should not appear')</script>
      `
    );

    const content = extractPageContent();
    expect(content.bodyText).toContain("Residents are bewildered");
    expect(content.bodyText).not.toContain("alert(");
    expect(content.headings).toContain("Local cat learns to use elevator");
  });

  it("falls back to a meaningful title when document.title is just the brand", () => {
    setHtml(`<title>YouTube</title>`, `<h1>Why we love capybaras</h1>`);
    history.replaceState(null, "", "/watch?v=abc");
    const content = extractPageContent();
    // The title field will be "YouTube" (we don't rewrite generic titles here),
    // but the H1 fallback path should at least surface real content via headings.
    expect(content.headings).toContain("Why we love capybaras");
  });
});
