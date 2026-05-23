import { useEffect, useState } from "react";

import type { ChatThread } from "../knowledge-chat-threads";
import { loadInitialChatState, writePersistedChatState } from "./knowledge-chat-storage";

export function usePersistedChatThreads() {
  const [initialState] = useState(loadInitialChatState);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>(initialState.threads);
  const [activeChatId, setActiveChatId] = useState(initialState.activeChatId);

  useEffect(() => {
    writePersistedChatState({
      version: 1,
      activeChatId,
      threads: chatThreads
    });
  }, [activeChatId, chatThreads]);

  return {
    chatThreads,
    setChatThreads,
    activeChatId,
    setActiveChatId
  };
};
