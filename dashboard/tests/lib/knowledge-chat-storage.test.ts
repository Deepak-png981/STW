import { describe, expect, it } from "vitest";

import type { ChatThread } from "../../src/components/knowledge-chat-threads";
import {
  KNOWLEDGE_CHAT_STORAGE_KEY,
  loadInitialChatState,
  parsePersistedChatState,
  readPersistedChatState,
  sanitizeThreadsForStorage,
  writePersistedChatState
} from "../../src/components/knowledge/knowledge-chat-storage";

function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(seed));
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    }
  };
}

function sampleThread(overrides: Partial<ChatThread> = {}): ChatThread {
  return {
    id: "chat-1",
    title: "Offscreen docs",
    createdAt: "2026-05-23T10:00:00.000Z",
    updatedAt: "2026-05-23T11:00:00.000Z",
    pendingRequestId: "pending-1",
    messages: [
      { role: "user", content: "Where did I read about offscreen?" },
      {
        role: "assistant",
        content: "You read it on Chrome docs.",
        sources: [
          {
            url: "https://developer.chrome.com/docs/extensions/reference/api/offscreen",
            title: "chrome.offscreen",
            snippet: "Offscreen documents"
          }
        ]
      }
    ],
    ...overrides
  };
}

describe("knowledge chat storage", () => {
  it("loads a default thread when nothing is stored", () => {
    const storage = createMemoryStorage();
    const initial = loadInitialChatState(storage);

    expect(initial.threads).toHaveLength(1);
    expect(initial.activeChatId).toBe(initial.threads[0]?.id);
    expect(initial.threads[0]?.messages).toEqual([]);
  });

  it("round-trips persisted threads and clears pending requests", () => {
    const storage = createMemoryStorage();
    const thread = sampleThread();

    writePersistedChatState(
      {
        version: 1,
        activeChatId: thread.id,
        threads: [thread]
      },
      storage
    );

    const restored = readPersistedChatState(storage);
    expect(restored?.activeChatId).toBe("chat-1");
    expect(restored?.threads[0]?.pendingRequestId).toBeNull();
    expect(restored?.threads[0]?.messages).toHaveLength(2);
    expect(restored?.threads[0]?.messages[1]?.sources?.[0]?.title).toBe("chrome.offscreen");
  });

  it("sanitizes invalid stored payloads", () => {
    expect(parsePersistedChatState(null)).toBeNull();
    expect(parsePersistedChatState({ version: 2, activeChatId: "x", threads: [] })).toBeNull();
    expect(parsePersistedChatState({ version: 1, activeChatId: "x", threads: [{ id: "bad" }] })).toBeNull();
  });

  it("falls back to the first thread when the active id is missing", () => {
    const storage = createMemoryStorage({
      [KNOWLEDGE_CHAT_STORAGE_KEY]: JSON.stringify({
        version: 1,
        activeChatId: "missing-thread",
        threads: [sampleThread(), sampleThread({ id: "chat-2", title: "GitHub docs" })]
      })
    });

    const initial = loadInitialChatState(storage);
    expect(initial.activeChatId).toBe("chat-1");
    expect(initial.threads).toHaveLength(2);
  });

  it("strips in-flight pending state before writing", () => {
    const sanitized = sanitizeThreadsForStorage([sampleThread()]);
    expect(sanitized[0]?.pendingRequestId).toBeNull();
  });
});
