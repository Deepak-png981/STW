import type { ChatMessage } from "@shame-the-web/shared";

export type ChatThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pendingRequestId: string | null;
  messages: ChatMessage[];
};

export const MAX_CHAT_THREADS = 12;

export function createEmptyChatThread(): ChatThread {
  const now = new Date().toISOString();
  return {
    id: `chat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    pendingRequestId: null,
    messages: []
  };
}

export function prependThread(threads: ChatThread[], thread: ChatThread): ChatThread[] {
  return [thread, ...threads].slice(0, MAX_CHAT_THREADS);
}

export function updateThreadById(
  threads: ChatThread[],
  threadId: string,
  updater: (thread: ChatThread) => ChatThread
): ChatThread[] {
  const nextThreads = threads.map((thread) => (thread.id === threadId ? updater(thread) : thread));
  return sortThreads(nextThreads).slice(0, MAX_CHAT_THREADS);
}

export function withThreadMessages(
  thread: ChatThread,
  messages: ChatMessage[],
  pendingRequestId: string | null
): ChatThread {
  return {
    ...thread,
    messages,
    title: deriveChatTitle(messages),
    updatedAt: new Date().toISOString(),
    pendingRequestId
  };
}

export function clearThreadMessages(thread: ChatThread): ChatThread {
  return {
    ...thread,
    title: "New chat",
    messages: [],
    pendingRequestId: null,
    updatedAt: new Date().toISOString()
  };
}

export function truncateChatTitle(value: string, maxLength = 30): string {
  const text = value.trim();
  if (!text) {
    return "New chat";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function deriveChatTitle(messages: readonly ChatMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) {
    return "New chat";
  }
  return truncateChatTitle(firstUserMessage.content.trim(), 42);
}

function sortThreads(threads: ChatThread[]): ChatThread[] {
  return sortThreadsForDisplay(threads);
}

export function sortThreadsForDisplay(threads: readonly ChatThread[]): ChatThread[] {
  return threads
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
