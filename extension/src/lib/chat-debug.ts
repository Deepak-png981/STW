import type { ChatMessage, ChatSource, SemanticSearchResult } from "@shame-the-web/shared";

export const CHAT_DEBUG_PREFIX = "[STW][chat-debug]" as const;

const SNIPPET_PREVIEW_LENGTH = 180;
const MESSAGE_PREVIEW_LENGTH = 240;

export type ChatDebugSearchRow = {
  rank: number;
  url: string;
  title: string;
  score: number;
  reasons: readonly string[];
  matchedChunkId: string | null;
  snippetPreview: string;
};

export type ChatDebugMessageRow = {
  role: ChatMessage["role"];
  chars: number;
  preview: string;
};

export function summarizeSearchResults(
  results: readonly SemanticSearchResult[]
): readonly ChatDebugSearchRow[] {
  return results.map((result, index) => ({
    rank: index + 1,
    url: result.url,
    title: result.title || result.hostname,
    score: roundScore(result.score),
    reasons: result.reasons,
    matchedChunkId: result.matchedChunkId,
    snippetPreview: previewText(result.snippet, SNIPPET_PREVIEW_LENGTH)
  }));
}

export function summarizeSources(sources: readonly ChatSource[]): readonly ChatDebugSearchRow[] {
  return sources.map((source, index) => ({
    rank: index + 1,
    url: source.url,
    title: source.title,
    score: 0,
    reasons: ["attached"],
    matchedChunkId: null,
    snippetPreview: previewText(source.snippet, SNIPPET_PREVIEW_LENGTH)
  }));
}

export function summarizeModelMessages(
  messages: readonly { role: ChatMessage["role"]; content: string }[]
): readonly ChatDebugMessageRow[] {
  return messages.map((message) => ({
    role: message.role,
    chars: message.content.length,
    preview: previewText(message.content, MESSAGE_PREVIEW_LENGTH)
  }));
}

export function logChatDebug(event: string, payload: Record<string, unknown>): void {
  const line = JSON.stringify({ event, ...payload });
  console.warn(CHAT_DEBUG_PREFIX, line);
  console.info(CHAT_DEBUG_PREFIX, event);
  console.info(CHAT_DEBUG_PREFIX, JSON.stringify(payload, null, 2));
}

function previewText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength).trim()}…`;
}

function roundScore(value: number): number {
  return Math.round(value * 10000) / 10000;
}
