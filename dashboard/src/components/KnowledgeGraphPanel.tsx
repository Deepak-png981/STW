import { useCallback, useEffect, useRef, useState } from "react";
import Graph from "graphology";
import { Sigma } from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { KnowledgeGraph, KnowledgeNode, KnowledgeSearchResult } from "@shame-the-web/shared";

import { requestBridge, subscribeBridgeEvents } from "../lib/bridge";

/** Saturated neon palette (GitNexus-inspired: purple, cyan, lime, coral, amber…) */
const CLUSTER_COLORS = [
  "#c084fc",
  "#22d3ee",
  "#a3e635",
  "#fb923c",
  "#f472b6",
  "#38bdf8",
  "#facc15",
  "#4ade80",
  "#818cf8",
  "#2dd4bf"
];

function edgeColorForWeight(weight: number): string {
  const a = Math.round(40 + Math.min(1, weight) * 140);
  const alpha = a.toString(16).padStart(2, "0");
  return `#22d3ee${alpha}`;
}

export function KnowledgeGraphPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [graphData, setGraphData] = useState<KnowledgeGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<KnowledgeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const showNodeLabelsRef = useRef(showNodeLabels);
  showNodeLabelsRef.current = showNodeLabels;

  const fetchGraph = useCallback(() => {
    requestBridge("getKnowledgeGraph")
      .then((response) => {
        setGraphData(response.data.graph);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Auto-refresh the graph whenever the background signals it has been rebuilt.
  useEffect(() => {
    return subscribeBridgeEvents((event) => {
      // TypeScript 6 strict narrowing: cast through unknown to compare the event
      // discriminant without hitting TS2367 "no overlap" errors.
      if ((event as unknown as { event: string }).event === "graphUpdated") {
        fetchGraph();
      }
    });
  }, [fetchGraph]);

  useEffect(() => {
    if (!graphData || !containerRef.current || graphData.nodes.length === 0) return;

    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }

    const g = new Graph({ multi: false, type: "undirected" });
    let selectedGraphKey: string | null = null;

    graphData.nodes.forEach((node, i) => {
      const angle = (i / graphData.nodes.length) * 2 * Math.PI;
      const r = 5 + Math.random() * 3;
      const baseSize = Math.max(5, Math.min(16, 4.5 + node.visitCount * 1.6));
      g.addNode(node.id, {
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
        size: baseSize,
        color: CLUSTER_COLORS[node.clusterId % CLUSTER_COLORS.length],
        label: node.label,
        forceLabel: showNodeLabels,
        _node: node,
        _baseSize: baseSize
      });
    });

    graphData.edges.forEach((edge) => {
      if (g.hasNode(edge.source) && g.hasNode(edge.target) && !g.hasEdge(edge.source, edge.target)) {
        g.addEdge(edge.source, edge.target, {
          size: Math.max(0.6, 0.8 + edge.weight * 2.2),
          color: edgeColorForWeight(edge.weight)
        });
      }
    });

    if (g.order > 1) {
      const iterations = Math.max(80, Math.min(400, 520 - g.order * 2));
      forceAtlas2.assign(g, {
        iterations,
        settings: {
          ...forceAtlas2.inferSettings(g),
          gravity: 0.08,
          scalingRatio: 12,
          strongGravityMode: true,
          barnesHutOptimize: g.order > 80
        }
      });
    }

    const renderer = new Sigma(g, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeType: "line",
      defaultEdgeColor: "#22d3ee55",
      minEdgeThickness: 0.85,
      antiAliasingFeather: 1.25,
      labelSize: 11,
      labelWeight: "600",
      labelFont: "Inter, ui-sans-serif, system-ui, sans-serif",
      labelColor: { color: "#cbd5e1" },
      labelDensity: 1.15,
      labelRenderedSizeThreshold: 4,
      labelGridCellSize: 90,
      stagePadding: 28,
      renderLabels: showNodeLabels,
      minCameraRatio: 0.08,
      maxCameraRatio: 12,
      zIndex: true,
      nodeReducer(node, data) {
        const next = { ...data };
        next.forceLabel = showNodeLabelsRef.current;
        if (selectedGraphKey === node) {
          const base = (data._baseSize as number) ?? data.size ?? 6;
          next.size = base * 1.45;
          next.zIndex = 2;
        }
        return next;
      }
    });

    renderer.on("enterNode", ({ node }) => {
      const nodeData = g.getNodeAttribute(node, "_node") as KnowledgeNode;
      setHoveredNode(nodeData);
    });

    renderer.on("leaveNode", () => {
      setHoveredNode(null);
    });

    renderer.on("clickNode", ({ node }) => {
      const nodeData = g.getNodeAttribute(node, "_node") as KnowledgeNode;
      const nextSelected = selectedGraphKey === node ? null : nodeData;
      selectedGraphKey = nextSelected?.id ?? null;
      setSelectedNode(nextSelected);
      renderer.scheduleRefresh();
    });

    renderer.on("clickStage", () => {
      selectedGraphKey = null;
      setSelectedNode(null);
      renderer.scheduleRefresh();
    });

    sigmaRef.current = renderer;
    renderer.scheduleRefresh();

    return () => {
      renderer.kill();
      sigmaRef.current = null;
    };
  }, [graphData]);

  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;
    sigma.setSetting("renderLabels", showNodeLabels);
    sigma.scheduleRefresh();
  }, [showNodeLabels]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const response = await requestBridge("searchKnowledge", { query: q });
      setResults(response.data.results);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => void runSearch(val), 350);
  };

  const tooltipNode = selectedNode ?? hoveredNode;
  const hasData = graphData && graphData.nodes.length > 0;

  return (
    <section className="section-card knowledge-graph-section knowledge-graph-nexus">
      <div className="section-heading knowledge-graph-nexus-heading">
        <div>
          <p className="eyebrow knowledge-graph-eyebrow">Your browsing knowledge graph</p>
          <h2 className="knowledge-graph-title">Every page you&apos;ve visited, connected by topic.</h2>
        </div>
        {hasData ? (
          <div className="knowledge-graph-heading-tools">
            <p className="bridge-status knowledge-graph-meta">
              {graphData.nodes.length} pages &middot; {graphData.edges.length} connections
            </p>
            <label className="knowledge-graph-label-toggle">
              <input
                type="checkbox"
                checked={showNodeLabels}
                onChange={(e) => setShowNodeLabels(e.target.checked)}
              />
              <span>Show page names</span>
            </label>
          </div>
        ) : null}
      </div>

      <div className="knowledge-graph-layout">
        <div className="knowledge-graph-container knowledge-graph-canvas-wrap">
          {loading ? (
            <div className="knowledge-graph-empty knowledge-graph-empty--nexus">
              <span>Building your knowledge graph…</span>
            </div>
          ) : !hasData ? (
            <div className="knowledge-graph-empty knowledge-graph-empty--nexus">
              <strong>No pages indexed yet.</strong>
              <p>
                Browse a few websites with the extension active and they&apos;ll appear here automatically, connected
                by shared topics.
              </p>
            </div>
          ) : (
            <div ref={containerRef} className="knowledge-graph-canvas knowledge-graph-canvas--sigma" />
          )}

          {tooltipNode ? (
            <div className="knowledge-graph-tooltip knowledge-graph-tooltip--nexus">
              <strong>{tooltipNode.label}</strong>
              <span className="knowledge-tooltip-host">{tooltipNode.hostname}</span>
              {urlPath(tooltipNode.url) ? (
                <span className="knowledge-tooltip-path">{urlPath(tooltipNode.url)}</span>
              ) : null}
              <span className="knowledge-tooltip-meta">
                Visited {tooltipNode.visitCount}× &middot; {formatDate(tooltipNode.lastVisited)}
              </span>
              {tooltipNode.keywords.length > 0 ? (
                <span className="knowledge-tooltip-keywords">{tooltipNode.keywords.slice(0, 6).join(", ")}</span>
              ) : null}
              {selectedNode ? (
                <a href={selectedNode.url} target="_blank" rel="noreferrer" className="button knowledge-graph-open-btn">
                  Open page
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="knowledge-search-panel knowledge-search-panel--nexus">
          <p className="knowledge-search-heading">Ask your browsing history</p>

          <div className="knowledge-search-row">
            <input
              type="search"
              className="knowledge-search-input knowledge-search-input--nexus"
              placeholder="Where did I see that local knowledge graph tool?"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSearch(query);
              }}
            />
            <button
              type="button"
              className="button knowledge-graph-find-btn"
              onClick={() => void runSearch(query)}
              disabled={searching || !query.trim()}
            >
              {searching ? "…" : "Find"}
            </button>
          </div>

          <div className="knowledge-search-results">
            {results.length > 0
              ? results.map((result) => (
                  <article key={result.url} className="knowledge-result-card knowledge-result-card--nexus">
                    <div className="knowledge-result-header">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${result.hostname}&sz=16`}
                        alt=""
                        width={16}
                        height={16}
                        className="knowledge-result-favicon"
                      />
                      <div className="knowledge-result-meta">
                        <strong>{result.title || result.hostname}</strong>
                        <span>{result.hostname}</span>
                        {urlPath(result.url) ? (
                          <span className="knowledge-result-path">{urlPath(result.url)}</span>
                        ) : null}
                      </div>
                      <a href={result.url} target="_blank" rel="noreferrer" className="button knowledge-result-open">
                        Open
                      </a>
                    </div>
                    {result.snippet ? (
                      <p className="knowledge-result-snippet">{result.snippet}</p>
                    ) : null}
                    <small className="knowledge-result-date">{formatDate(result.lastVisited)}</small>
                  </article>
                ))
              : hasSearched && !searching
                ? (
                  <p className="empty-copy knowledge-empty-copy">No matching pages found. Try different keywords.</p>
                )
                : (
                  <p className="empty-copy knowledge-empty-copy">
                    Type something you remember — a topic, a tool name, or a concept. We&apos;ll find the page.
                  </p>
                )}
          </div>
        </div>
      </div>
    </section>
  );
}

function urlPath(url: string): string {
  try {
    const u = new URL(url);
    const path = (u.pathname + u.search).replace(/\/$/, "");
    if (path.length <= 1) return "";
    return path.length > 60 ? `${path.slice(0, 60)}…` : path;
  } catch {
    return "";
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}
