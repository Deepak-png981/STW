import type { ChatMessage, ChatRole, ChatSource } from "@shame-the-web/shared";

import {
  MAX_CHAT_THREADS,
  createEmptyChatThread,
  sortThreadsForDisplay
} from "../knowledge-chat-threads";
import type { ChatThread } from "../knowledge-chat-threads";

export const KNOWLEDGE_CHAT_STORAGE_KEY = "stw-knowledge-chat-v1";

export type PersistedChatState = {
  version: 1;
  activeChatId: string;
  threads: ChatThread[];
};

export type InitialChatState = {
  threads: ChatThread[];
  activeChatId: string;
};

export function sanitizeThreadsForStorage(threads: readonly ChatThread[]): ChatThread[] {
  return threads.map((thread) => ({
    ...thread,
    pendingRequestId: null
  }));
}

export function readPersistedChatState(storage: Storage = window.localStorage): PersistedChatState | null {
  const raw = storage.getItem(KNOWLEDGE_CHAT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return parsePersistedChatState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writePersistedChatState(
  state: PersistedChatState,
  storage: Storage = window.localStorage
): void {
  const payload: PersistedChatState = {
    version: 1,
    activeChatId: state.activeChatId,
    threads: sortThreadsForDisplay(sanitizeThreadsForStorage(state.threads)).slice(0, MAX_CHAT_THREADS)
  };
  storage.setItem(KNOWLEDGE_CHAT_STORAGE_KEY, JSON.stringify(payload));
}

export function loadInitialChatState(storage: Storage = window.localStorage): InitialChatState {
  const persisted = readPersistedChatState(storage);
  if (!persisted || persisted.threads.length === 0) {
    const thread = createEmptyChatThread();
    return {
      threads: [thread],
      activeChatId: thread.id
    };
  }

  const firstThread = persisted.threads[0];
  if (!firstThread) {
    const thread = createEmptyChatThread();
    return {
      threads: [thread],
      activeChatId: thread.id
    };
  }

  const activeChatId = persisted.threads.some((thread) => thread.id === persisted.activeChatId)
    ? persisted.activeChatId
    : firstThread.id;

  return {
    threads: persisted.threads,
    activeChatId
  };
}

export function parsePersistedChatState(value: unknown): PersistedChatState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.version !== 1 || typeof record.activeChatId !== "string") {
    return null;
  }

  if (!Array.isArray(record.threads)) {
    return null;
  }

  const threads = record.threads
    .map(parseChatThread)
    .filter((thread): thread is ChatThread => thread !== null);

  if (threads.length === 0) {
    return null;
  }

  return {
    version: 1,
    activeChatId: record.activeChatId,
    threads: sortThreadsForDisplay(threads).slice(0, MAX_CHAT_THREADS)
  };
}

function parseChatThread(value: unknown): ChatThread | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.title !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.updatedAt !== "string" ||
    !Array.isArray(record.messages)
  ) {
    return null;
  }

  const messages = record.messages
    .map(parseChatMessage)
    .filter((message): message is ChatMessage => message !== null);

  return {
    id: record.id,
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    pendingRequestId: null,
    messages
  };
}

function parseChatMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.content !== "string" || !isChatRole(record.role)) {
    return null;
  }

  const sources = parseChatSources(record.sources);
  return sources.length > 0
    ? {
        role: record.role,
        content: record.content,
        sources
      }
    : {
        role: record.role,
        content: record.content
      };
}

function parseChatSources(value: unknown): readonly ChatSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(parseChatSource)
    .filter((source): source is ChatSource => source !== null);
}

function parseChatSource(value: unknown): ChatSource | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.url !== "string" ||
    typeof record.title !== "string" ||
    typeof record.snippet !== "string"
  ) {
    return null;
  }

  return {
    url: record.url,
    title: record.title,
    snippet: record.snippet
  };
}

function isChatRole(value: unknown): value is ChatRole {
  return value === "system" || value === "user" || value === "assistant";
}
