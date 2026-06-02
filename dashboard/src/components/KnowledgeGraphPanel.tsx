import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Graph from "graphology";
import { Sigma } from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { AiSetupStatus, ChatMessage, SemanticReason, SemanticSearchResult } from "@shame-the-web/shared";
import { DEFAULT_AI_SETUP_STATUS } from "@shame-the-web/shared";
import type { KnowledgeGraph, KnowledgeNode } from "@shame-the-web/shared";

import { requestBridge, subscribeBridgeEvents } from "../lib/bridge";
import { KnowledgeChatRail } from "./knowledge/knowledge-chat-rail";
import { useChatRailWidth } from "./knowledge/use-chat-rail-width";
import { usePersistedChatThreads } from "./knowledge/use-persisted-chat-threads";
import {
  clearThreadMessages,
  createEmptyChatThread,
  prependThread,
  updateThreadById,
  withThreadMessages
} from "./knowledge-chat-threads";

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

const SUGGESTED_SEARCHES = [
  "What did I read about AI?",
  "Find pages from YouTube",
  "What did I see on GitHub?"
] as const;

function edgeColorForWeight(weight: number): string {
  const a = Math.round(40 + Math.min(1, weight) * 140);
  const alpha = a.toString(16).padStart(2, "0");
  return `#22d3ee${alpha}`;
}

export function KnowledgeGraphPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [graphData, setGraphData] = useState<KnowledgeGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<KnowledgeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [aiStatus, setAiStatus] = useState<AiSetupStatus>(DEFAULT_AI_SETUP_STATUS);
  const { chatThreads, setChatThreads, activeChatId, setActiveChatId } = usePersistedChatThreads();
  const [chatInput, setChatInput] = useState("");
  const [openFlyout, setOpenFlyout] = useState<null | "search">(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true);
  const { width: chatRailWidth, isResizing: isChatRailResizing, startResize: startChatRailResize } =
    useChatRailWidth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const showNodeLabelsRef = useRef(showNodeLabels);
  showNodeLabelsRef.current = showNodeLabels;

  const activeChat = chatThreads.find((thread) => thread.id === activeChatId) ?? chatThreads[0];
  const isChatLoading = activeChat?.pendingRequestId !== null;

  useEffect(() => {
    const hasActiveChat = chatThreads.some((thread) => thread.id === activeChatId);
    if ((!activeChatId || !hasActiveChat) && chatThreads[0]) {
      setActiveChatId(chatThreads[0].id);
    }
  }, [activeChatId, chatThreads]);

  const toggleFlyout = useCallback((panel: "search") => {
    setOpenFlyout((current) => (current === panel ? null : panel));
  }, []);

  const toggleChatRail = useCallback(() => {
    setIsChatOpen((current) => !current);
  }, []);

  const closeFlyout = useCallback(() => {
    setOpenFlyout(null);
  }, []);

  useEffect(() => {
    if (openFlyout === null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenFlyout(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openFlyout]);

  useEffect(() => {
    if (openFlyout === "search") {
      searchInputRef.current?.focus();
    }
  }, [openFlyout]);

  const fetchGraph = useCallback(() => {
    Promise.all([requestBridge("getKnowledgeGraph"), requestBridge("getAiSetupStatus")])
      .then(([graphResponse, statusResponse]) => {
        setGraphData(graphResponse.data.graph);
        setAiStatus(statusResponse.data.status);
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
      switch (event.event) {
        case "graphUpdated":
          fetchGraph();
          break;
        case "aiSetupProgress":
          setAiStatus(event.status);
          break;
        default:
          break;
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
    const graphContainer = graphContainerRef.current;
    if (!graphContainer) {
      return;
    }

    const refreshGraphSize = () => {
      sigmaRef.current?.resize();
      sigmaRef.current?.scheduleRefresh();
    };

    refreshGraphSize();
    const observer = new ResizeObserver(refreshGraphSize);
    observer.observe(graphContainer);
    return () => observer.disconnect();
  }, [graphData, isChatOpen, chatRailWidth]);

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
      const response = await requestBridge("semanticSearchKnowledge", { query: q });
      setResults(response.data.results);
    } catch {
      try {
        const fallback = await requestBridge("searchKnowledge", { query: q });
        setResults(
          fallback.data.results.map((result) => ({
            ...result,
            reasons: ["keyword"] as const,
            matchedChunkId: null
          }))
        );
      } catch {
        setResults([]);
      }
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

  const createNewChat = useCallback(() => {
    const nextThread = createEmptyChatThread();
    setChatThreads((current) => prependThread(current, nextThread));
    setActiveChatId(nextThread.id);
    setChatInput("");
    setIsChatHistoryOpen(false);
  }, []);

  const clearCurrentChat = useCallback(() => {
    if (!activeChat) {
      return;
    }
    setChatThreads((current) => updateThreadById(current, activeChat.id, clearThreadMessages));
    setChatInput("");
    setIsChatHistoryOpen(false);
  }, [activeChat]);

  const selectChat = useCallback((threadId: string) => {
    setActiveChatId(threadId);
  }, []);

  const sendChat = useCallback(async () => {
    if (!activeChat) {
      return;
    }
    const message = chatInput.trim();
    if (!message) {
      return;
    }

    const chatId = activeChat.id;
    const requestId = `${chatId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const priorHistory = activeChat.messages;
    const nextUserMessage: ChatMessage = { role: "user", content: message };
    setChatThreads((current) =>
      updateThreadById(current, chatId, (thread) =>
        withThreadMessages(thread, [...thread.messages, nextUserMessage], requestId)
      )
    );
    setChatInput("");

    try {
      const response = await requestBridge("chatKnowledge", {
        query: message,
        sessionId: "local-default",
        history: priorHistory
      });
      console.warn("[STW][chat-debug]", {
        chatQuery: message,
        model: response.data.model,
        sourceCount: response.data.sources.length,
        sources: response.data.sources
      });
      const assistantReply: ChatMessage = {
        role: "assistant",
        content: response.data.text,
        sources: response.data.sources
      };
      setChatThreads((current) =>
        updateThreadById(current, chatId, (thread) =>
          thread.pendingRequestId === requestId
            ? withThreadMessages(thread, [...thread.messages, assistantReply], null)
            : thread
        )
      );
    } catch (error) {
      const errorReply: ChatMessage = {
        role: "assistant",
        content:
          error instanceof Error
            ? `Local chat failed: ${error.message}`
            : "Local chat failed. You can continue using semantic search results."
      };
      setChatThreads((current) =>
        updateThreadById(current, chatId, (thread) =>
          thread.pendingRequestId === requestId
            ? withThreadMessages(thread, [...thread.messages, errorReply], null)
            : thread
        )
      );
    } finally {
      setChatThreads((current) =>
        updateThreadById(current, chatId, (thread) =>
          thread.pendingRequestId === requestId
            ? {
                ...thread,
                pendingRequestId: null,
                updatedAt: new Date().toISOString()
              }
            : thread
        )
      );
    }
  }, [activeChat, chatInput]);

  const runSuggestedSearch = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      void runSearch(suggestion);
    },
    [runSearch]
  );

  const tooltipNode = selectedNode ?? hoveredNode;
  const hasData = graphData && graphData.nodes.length > 0;
  const aiReadiness = getAiReadiness(aiStatus);
  const stageStyle = isChatOpen
    ? ({ ["--chat-rail-width"]: `${chatRailWidth}px` } as CSSProperties)
    : undefined;

  return (
    <section className="section-card knowledge-graph-section knowledge-graph-nexus knowledge-graph-immersive">
      <div className="knowledge-graph-immersive-header knowledge-graph-nexus-heading">
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

      <div className="ai-readiness-grid" aria-label="Local AI setup status">
        <StatusPill
          label="Search index"
          tone={aiReadiness.searchTone}
          value={aiReadiness.searchLabel}
          detail={aiReadiness.searchDetail}
        />
        <StatusPill
          label="Chat model"
          tone={aiReadiness.chatTone}
          value={aiReadiness.chatLabel}
          detail={aiReadiness.chatDetail}
        />
        <StatusPill
          label="Current activity"
          tone={aiReadiness.activityTone}
          value={aiReadiness.activityLabel}
          detail={aiReadiness.activityDetail}
        />
      </div>

      <div
        className={`knowledge-graph-stage${isChatOpen ? " is-chat-open" : ""}`}
        style={stageStyle}
      >
        <div ref={graphContainerRef} className="knowledge-graph-container knowledge-graph-canvas-wrap">
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

        {openFlyout !== null ? (
          <button
            type="button"
            className="knowledge-flyout-backdrop"
            aria-label="Close panel"
            onClick={closeFlyout}
          />
        ) : null}

        <div className="knowledge-fab-stack" aria-label="Knowledge graph tools">
          <button
            type="button"
            className={`knowledge-fab knowledge-fab--search${openFlyout === "search" ? " is-active" : ""}`}
            aria-label="Search browsing history"
            aria-expanded={openFlyout === "search"}
            onClick={() => toggleFlyout("search")}
          >
            <SearchFabIcon />
          </button>
          <button
            type="button"
            className={`knowledge-fab knowledge-fab--chat${isChatOpen ? " is-active" : ""}`}
            aria-label={isChatOpen ? "Hide conversations" : "Show conversations"}
            aria-expanded={isChatOpen}
            onClick={toggleChatRail}
          >
            <ChatFabIcon />
          </button>
        </div>

        {openFlyout === "search" ? (
          <aside className="knowledge-flyout knowledge-flyout--search" aria-label="Search panel">
            <div className="knowledge-flyout-header">
              <h3>Search</h3>
              <button type="button" className="knowledge-flyout-close" onClick={closeFlyout}>
                Close
              </button>
            </div>
            <div className="knowledge-flyout-body">
              <section className="knowledge-side-section">
                <div className="knowledge-panel-heading-row">
                  <div>
                    <p className="knowledge-search-heading">Search your browsing history</p>
                    <p className="knowledge-panel-subcopy">Find pages by topic, site, title, or remembered snippets.</p>
                  </div>
                  {results.length > 0 ? (
                    <span className="ai-mini-badge ai-mini-badge--ready">{results.length} hits</span>
                  ) : null}
                </div>

                <div className="knowledge-search-row">
                  <input
                    ref={searchInputRef}
                    type="search"
                    className="knowledge-search-input knowledge-search-input--nexus"
                    placeholder="Example: diamonds, LinkedIn, local AI, YouTube…"
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
                    {searching ? "Searching" : "Find"}
                  </button>
                </div>

                {!hasSearched ? (
                  <div className="knowledge-suggestion-row" aria-label="Suggested searches">
                    {SUGGESTED_SEARCHES.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="knowledge-suggestion-chip"
                        onClick={() => runSuggestedSearch(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="knowledge-search-results knowledge-search-results--pages">
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
                        {result.reasons.length > 0 ? (
                          <p className="knowledge-result-date">
                            {result.reasons.map((reason) => reasonLabel(reason)).join(" · ")}
                          </p>
                        ) : null}
                        <small className="knowledge-result-date">{formatDate(result.lastVisited)}</small>
                      </article>
                      ))
                    : hasSearched && !searching
                      ? (
                        <div className="knowledge-empty-state">
                          <strong>No matching pages found.</strong>
                          <p>Try a broader word, a hostname, or browse the page again so the extension can index it.</p>
                        </div>
                      )
                      : (
                        <div className="knowledge-empty-state">
                          <strong>Start with search.</strong>
                          <p>Search results become the strongest context for conversation.</p>
                        </div>
                      )}
                </div>
              </section>
            </div>
          </aside>
        ) : null}

        {isChatOpen ? (
          <KnowledgeChatRail
            threads={chatThreads}
            activeChatId={activeChatId}
            activeChat={activeChat}
            chatInput={chatInput}
            isChatLoading={isChatLoading}
            isHistoryOpen={isChatHistoryOpen}
            isResizing={isChatRailResizing}
            chatReadinessTone={aiReadiness.chatTone}
            chatReadinessLabel={aiReadiness.chatLabel}
            onChatInputChange={setChatInput}
            onSendChat={() => void sendChat()}
            onSelectChat={selectChat}
            onCreateChat={createNewChat}
            onClearChat={clearCurrentChat}
            onToggleHistory={() => setIsChatHistoryOpen((current) => !current)}
            onClose={toggleChatRail}
            onResizeStart={startChatRailResize}
          />
        ) : null}
      </div>
    </section>
  );
}

function SearchFabIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" strokeLinecap="round" />
    </svg>
  );
}

function ChatFabIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path
        d="M5 6.5h14a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H10l-4.5 3V8.5a2 2 0 0 1 2-2Z"
        strokeLinejoin="round"
      />
    </svg>
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

function reasonLabel(reason: SemanticReason): string {
  switch (reason) {
    case "semantic":
      return "Semantic match";
    case "keyword":
      return "Keyword overlap";
    case "graph":
      return "Graph neighbor";
    case "recent":
      return "Recently visited";
    case "visited":
      return "Frequent page";
    case "reranked":
      return "Re-ranked match";
    default: {
      const exhaustiveCheck: never = reason;
      return exhaustiveCheck;
    }
  }
}

type StatusTone = "idle" | "working" | "ready" | "warning" | "error";

type AiReadiness = {
  searchTone: StatusTone;
  searchLabel: string;
  searchDetail: string;
  chatTone: StatusTone;
  chatLabel: string;
  chatDetail: string;
  activityTone: StatusTone;
  activityLabel: string;
  activityDetail: string;
};

function StatusPill({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  tone: StatusTone;
}) {
  return (
    <article className={`ai-status-card ai-status-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function getAiReadiness(status: AiSetupStatus): AiReadiness {
  switch (status.phase) {
    case "idle":
      return {
        searchTone: "idle",
        searchLabel: "Waiting",
        searchDetail: "Browse a few pages to build a searchable index.",
        chatTone: "idle",
        chatLabel: "Waiting",
        chatDetail: "Chat starts after search is ready.",
        activityTone: "idle",
        activityLabel: "Not started",
        activityDetail: status.message
      };
    case "downloading_embed":
      return {
        searchTone: "working",
        searchLabel: "Preparing",
        searchDetail: "Downloading the local embedding model once.",
        chatTone: "idle",
        chatLabel: "Waiting",
        chatDetail: "Chat starts after indexing completes.",
        activityTone: "working",
        activityLabel: "Downloading embeddings",
        activityDetail: status.message
      };
    case "indexing":
      return {
        searchTone: "working",
        searchLabel: `${status.progressPct ?? 0}% indexed`,
        searchDetail:
          status.current !== null && status.total !== null
            ? `${status.current}/${status.total} pages embedded locally.`
            : "Embedding your saved pages locally.",
        chatTone: "idle",
        chatLabel: "Waiting",
        chatDetail: "Chat starts after semantic search is ready.",
        activityTone: "working",
        activityLabel: "Indexing pages",
        activityDetail: status.message
      };
    case "ready_search":
      return {
        searchTone: "ready",
        searchLabel: "Ready",
        searchDetail: "Semantic search is available.",
        chatTone: status.message.toLowerCase().includes("fallback") ? "warning" : "idle",
        chatLabel: status.message.toLowerCase().includes("fallback") ? "Snippet fallback" : "Not loaded",
        chatDetail: status.message.toLowerCase().includes("fallback")
          ? "Answers use retrieved snippets because the chat model is unavailable."
          : "Ask a question to prepare the local chat model.",
        activityTone: "ready",
        activityLabel: "Search ready",
        activityDetail: status.message
      };
    case "downloading_slm":
      return {
        searchTone: "ready",
        searchLabel: "Ready",
        searchDetail: "Semantic search is available while chat prepares.",
        chatTone: "working",
        chatLabel: "Preparing",
        chatDetail: "Loading the optional local conversation model.",
        activityTone: "working",
        activityLabel: "Preparing chat",
        activityDetail: status.message
      };
    case "ready_chat":
      return {
        searchTone: "ready",
        searchLabel: "Ready",
        searchDetail: "Semantic search is available.",
        chatTone: "ready",
        chatLabel: "Ready",
        chatDetail: "The local conversation model is available.",
        activityTone: "ready",
        activityLabel: "All local AI ready",
        activityDetail: status.message
      };
    case "error":
      return {
        searchTone: "error",
        searchLabel: "Needs attention",
        searchDetail: "Search setup hit an error. Reload the extension and dashboard.",
        chatTone: "warning",
        chatLabel: "Fallback only",
        chatDetail: "Chat can still answer from snippets if search works.",
        activityTone: "error",
        activityLabel: "Error",
        activityDetail: status.message
      };
    default: {
      const exhaustiveCheck: never = status.phase;
      return exhaustiveCheck;
    }
  }
}
