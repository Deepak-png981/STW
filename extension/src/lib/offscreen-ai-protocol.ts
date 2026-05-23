import type { ChatMessage, ChatTurnResponse, SemanticSearchResult } from "@shame-the-web/shared";

export const OFFSCREEN_AI_MESSAGE = "stw-offscreen-ai" as const;

export type OffscreenAiRequest =
  | { kind: "warmup" }
  | { kind: "embedTexts"; texts: readonly string[] }
  | { kind: "primeChat" }
  | {
      kind: "chatKnowledge";
      query: string;
      history: readonly ChatMessage[];
      results: readonly SemanticSearchResult[];
    };

export type OffscreenAiResponse =
  | { ok: true; vectors?: readonly (readonly number[])[]; answer?: ChatTurnResponse; ready?: boolean }
  | { ok: false; error: string };

export type OffscreenAiEnvelope = {
  readonly channel: typeof OFFSCREEN_AI_MESSAGE;
  readonly request: OffscreenAiRequest;
};

export type OffscreenAiReply = {
  readonly channel: typeof OFFSCREEN_AI_MESSAGE;
  readonly response: OffscreenAiResponse;
};

export function isOffscreenAiEnvelope(message: unknown): message is OffscreenAiEnvelope {
  if (!message || typeof message !== "object") {
    return false;
  }
  const candidate = message as Partial<OffscreenAiEnvelope>;
  return candidate.channel === OFFSCREEN_AI_MESSAGE && candidate.request !== undefined;
}

export function isOffscreenAiReply(message: unknown): message is OffscreenAiReply {
  if (!message || typeof message !== "object") {
    return false;
  }
  const candidate = message as Partial<OffscreenAiReply>;
  return candidate.channel === OFFSCREEN_AI_MESSAGE && candidate.response !== undefined;
}
