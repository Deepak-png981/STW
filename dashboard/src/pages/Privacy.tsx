import React from "react";

export function PrivacyPage() {
  return (
    <section className="content-page privacy-page" style={{ padding: "36px", maxWidth: 880, margin: "0 auto" }}>
      <h1>Privacy Policy: Shame The Web</h1>
      <p>
        <strong>Effective date:</strong> 2026-05-03
      </p>

      <h2>Overview</h2>
      <p>
        Shame The Web is a browser extension that provides a short, friendly "roast" about page performance and
        (optionally) builds a private, local knowledge graph of pages you visit so you can search and revisit content.
        This policy explains what we collect, why, and how you can control or remove that data.
      </p>

      <h2>Data we collect and why</h2>
      <ul>
        <li>
          <strong>Page metadata</strong>: URL, hostname, page title, and URL path. Used to identify visits and label
          graph nodes.
        </li>
        <li>
          <strong>Short visible text snippets</strong>: small excerpts used for local search and to provide context in the
          graph and search results.
        </li>
        <li>
          <strong>Lightweight performance metrics</strong>: timing-like metrics (load/LCP/FCP-like) used to compute the
          roast and speed score.
        </li>
        <li>
          <strong>Timestamps</strong>: stored to order history and compute visit counts.
        </li>
      </ul>

      <h2>How data is stored and shared</h2>
      <p>
        All data is stored locally in your browser (IndexedDB and/or extension storage) by default. The extension does not
        transmit browsing content off-device unless you explicitly export or enable a sync feature. We do not sell or share
        your browsing data with third parties.
      </p>
      <p>
        Local AI models are downloaded on-device and cached by the browser for semantic search and conversation features.
        If browser cache data is cleared, the extension re-downloads model assets and notifies you in the dashboard status.
      </p>

      <h2>Permissions explained</h2>
      <ul>
        <li>
          <strong>storage</strong>: persists settings, roast history, and the local knowledge graph on your device so the
          dashboard and search work across restarts.
        </li>
        <li>
          <strong>tabs</strong>: reads the active tab URL/metadata to tie a roast to the correct page and to implement the
          dashboard “Open” action.
        </li>
        <li>
          <strong>host permissions (http(s)://*/*)</strong>: allows the content script to run on pages you visit and extract
          the small set of metadata described above. This broad pattern is requested so the extension can index pages the
          user actually visits.
        </li>
      </ul>

      <h2>User controls</h2>
      <ul>
        <li>You can disable indexing (the knowledge graph) in the extension Options.</li>
        <li>You can clear all stored data from the extension settings at any time.</li>
        <li>If you export data, you will be prompted to choose the exported file location on your own device.</li>
        <li>
          Imported graph files are processed locally in the extension; model binaries are not included in export files and
          are re-downloaded locally if needed.
        </li>
      </ul>

      <h2>Data retention</h2>
      <p>Data is retained on-device until you clear it from the extension settings or uninstall the extension.</p>

      <h2>Contact</h2>
      <p>
        If you have questions about privacy, contact:{" "}
        <a href="mailto:deepakakashujoshi@gmail.com">deepakakashujoshi@gmail.com</a>
      </p>

      <hr />
      <p style={{ fontSize: 13, color: "#666" }}>Last updated: 2026-05-03</p>
    </section>
  );
}

