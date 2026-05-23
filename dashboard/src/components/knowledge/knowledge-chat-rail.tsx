import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { ChatMessage, ChatSource } from "@shame-the-web/shared";

import { truncateChatTitle } from "../knowledge-chat-threads";
import type { ChatThread } from "../knowledge-chat-threads";
import { ChatMessageContent } from "./chat-message-content";
import { StwAvatar } from "./stw-avatar";

type StatusTone = "idle" | "working" | "ready" | "warning" | "error";

type KnowledgeChatRailProps = {
  threads: ChatThread[];
  activeChatId: string;
  activeChat: ChatThread | undefined;
  chatInput: string;
  isChatLoading: boolean;
  isHistoryOpen: boolean;
  isResizing: boolean;
  chatReadinessTone: StatusTone;
  chatReadinessLabel: string;
  onChatInputChange: (value: string) => void;
  onSendChat: () => void;
  onSelectChat: (threadId: string) => void;
  onCreateChat: () => void;
  onClearChat: () => void;
  onToggleHistory: () => void;
  onClose: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export function KnowledgeChatRail({
  threads,
  activeChatId,
  activeChat,
  chatInput,
  isChatLoading,
  isHistoryOpen,
  chatReadinessTone,
  chatReadinessLabel,
  onChatInputChange,
  onSendChat,
  onSelectChat,
  onCreateChat,
  onClearChat,
  onToggleHistory,
  onClose,
  isResizing,
  onResizeStart
}: KnowledgeChatRailProps) {
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const messages = activeChat?.messages ?? [];

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isChatLoading]);

  useEffect(() => {
    chatInputRef.current?.focus();
  }, [activeChatId]);

  return (
    <aside
      className={`knowledge-chat-rail${isResizing ? " is-resizing" : ""}`}
      aria-label="Conversations"
    >
      <div
        className="knowledge-chat-resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize conversations panel"
        onPointerDown={onResizeStart}
      />
      <header className="knowledge-chat-rail-header">
        <div className="knowledge-chat-rail-title">
          <h3>Conversations</h3>
          <span className={`ai-mini-badge ai-mini-badge--${chatReadinessTone}`}>{chatReadinessLabel}</span>
        </div>
        <div className="knowledge-chat-rail-toolbar">
          <IconButton label="Start new chat" onClick={onCreateChat}>
            <PlusIcon />
          </IconButton>
          <IconButton
            label={isHistoryOpen ? "Hide chat history" : "Show chat history"}
            onClick={onToggleHistory}
            isActive={isHistoryOpen}
          >
            <HistoryIcon />
          </IconButton>
          <IconButton label="Clear current chat" onClick={onClearChat}>
            <TrashIcon />
          </IconButton>
          <IconButton label="Close conversations panel" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
      </header>

      <div className={`knowledge-chat-rail-body${isHistoryOpen ? " is-history-open" : ""}`}>
        {isHistoryOpen ? (
          <nav className="knowledge-chat-history-rail" aria-label="Previous conversations">
            <button type="button" className="knowledge-chat-new-thread-btn" onClick={onCreateChat}>
              <PlusIcon />
              <span>Start new chat</span>
            </button>
            <div className="knowledge-chat-history-rail-list knowledge-chat-scroll">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`knowledge-chat-history-rail-item${thread.id === activeChatId ? " is-active" : ""}`}
                  onClick={() => onSelectChat(thread.id)}
                >
                  <strong>{truncateChatTitle(thread.title, 36)}</strong>
                  <small>{formatThreadDate(thread.updatedAt)}</small>
                </button>
              ))}
            </div>
          </nav>
        ) : null}

        <section className="knowledge-chat-main">
          <div className="knowledge-chat-thread knowledge-chat-scroll" aria-live="polite">
            {messages.length === 0 ? (
              <div className="knowledge-chat-empty">
                <StwAvatar size={48} className="knowledge-chat-empty-avatar" />
                <strong>Ask about pages you visited</strong>
                <p>
                  Your answers stay local. Try “Where did I read about offscreen documents?” or “What did I
                  browse on GitHub?”
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatTurn
                  key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
                  message={message}
                  showRetrieval={message.role === "assistant" && (message.sources?.length ?? 0) > 0}
                />
              ))
            )}
            {isChatLoading ? (
              <article className="knowledge-chat-turn knowledge-chat-turn--assistant">
                <div className="knowledge-chat-turn-avatar" aria-hidden="true">
                  <StwAvatar size={34} />
                </div>
                <div className="knowledge-chat-turn-body">
                  <div className="knowledge-chat-bubble knowledge-chat-bubble--assistant is-typing">
                    <span className="knowledge-chat-typing-dot" />
                    <span className="knowledge-chat-typing-dot" />
                    <span className="knowledge-chat-typing-dot" />
                  </div>
                </div>
              </article>
            ) : null}
            <div ref={threadEndRef} />
          </div>

          <form
            className="knowledge-chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              onSendChat();
            }}
          >
            <textarea
              ref={chatInputRef}
              className="knowledge-chat-composer-input"
              placeholder="Ask about pages you visited…"
              rows={2}
              value={chatInput}
              onChange={(event) => onChatInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSendChat();
                }
              }}
            />
            <button
              type="submit"
              className="knowledge-chat-send-btn"
              disabled={isChatLoading || !chatInput.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </form>
        </section>
      </div>
    </aside>
  );
}

function ChatTurn({ message, showRetrieval }: { message: ChatMessage; showRetrieval: boolean }) {
  const isUser = message.role === "user";

  return (
    <article className={`knowledge-chat-turn knowledge-chat-turn--${message.role}`}>
      {!isUser ? (
        <div className="knowledge-chat-turn-avatar" aria-hidden="true">
          <StwAvatar size={34} />
        </div>
      ) : null}
      <div className="knowledge-chat-turn-body">
        {showRetrieval && message.sources ? (
          <ChatRetrievalSources sources={message.sources} />
        ) : null}
        <div className={`knowledge-chat-bubble knowledge-chat-bubble--${message.role}`}>
          {isUser ? (
            <p className="knowledge-chat-user-text">{message.content}</p>
          ) : (
            <ChatMessageContent content={message.content} />
          )}
        </div>
      </div>
      {isUser ? (
        <div className="knowledge-chat-turn-avatar knowledge-chat-turn-avatar--user" aria-hidden="true">
          <UserAvatarIcon />
        </div>
      ) : null}
    </article>
  );
}

function ChatRetrievalSources({ sources }: { sources: readonly ChatSource[] }) {
  return (
    <div className="knowledge-chat-retrieval" role="note">
      <p className="knowledge-chat-retrieval-heading">
        Retrieved {sources.length} indexed chunk{sources.length === 1 ? "" : "s"} from your graph
        <span className="knowledge-chat-retrieval-note"> (search panel is separate)</span>
      </p>
      <ul className="knowledge-chat-retrieval-list">
        {sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer" className="knowledge-chat-source-chip">
              <img
                src={`https://www.google.com/s2/favicons?domain=${hostnameFromUrl(source.url)}&sz=16`}
                alt=""
                width={14}
                height={14}
                className="knowledge-chat-source-favicon"
              />
              <span className="knowledge-chat-source-chip-text">
                <strong>{source.title || hostnameFromUrl(source.url)}</strong>
                {source.snippet ? <small>{truncateSnippet(source.snippet)}</small> : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  isActive,
  children
}: {
  label: string;
  onClick: () => void;
  isActive?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`knowledge-chat-icon-btn${isActive ? " is-active" : ""}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function formatThreadDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  } catch {
    return iso;
  }
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "page";
  }
}

function truncateSnippet(value: string, maxLength = 88): string {
  const text = value.trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function UserAvatarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19c1.6-3 4.2-4.5 7-4.5s5.4 1.5 7 4.5" strokeLinecap="round" />
    </svg>
  );
}
