import { useCallback, useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

export const CHAT_RAIL_MIN_WIDTH = 300;
export const CHAT_RAIL_MAX_WIDTH = 720;
export const CHAT_RAIL_DEFAULT_WIDTH = 380;
const CHAT_RAIL_STORAGE_KEY = "stw-chat-rail-width";

export function clampChatRailWidth(value: number): number {
  return Math.min(CHAT_RAIL_MAX_WIDTH, Math.max(CHAT_RAIL_MIN_WIDTH, value));
}

export function readStoredChatRailWidth(): number {
  if (typeof window === "undefined") {
    return CHAT_RAIL_DEFAULT_WIDTH;
  }
  const stored = window.localStorage.getItem(CHAT_RAIL_STORAGE_KEY);
  if (!stored) {
    return CHAT_RAIL_DEFAULT_WIDTH;
  }
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? clampChatRailWidth(parsed) : CHAT_RAIL_DEFAULT_WIDTH;
}

export function useChatRailWidth() {
  const [width, setWidth] = useState(readStoredChatRailWidth);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(CHAT_RAIL_STORAGE_KEY, String(width));
  }, [width]);

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;
      setIsResizing(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = clampChatRailWidth(startWidth + (startX - moveEvent.clientX));
        setWidth(nextWidth);
      };

      const handlePointerUp = () => {
        setIsResizing(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        document.body.classList.remove("knowledge-chat-rail-resizing");
      };

      document.body.classList.add("knowledge-chat-rail-resizing");
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [width]
  );

  return { width, isResizing, startResize };
};
