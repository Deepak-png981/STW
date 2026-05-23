// TODO: I need to experiment more with this ( i feel like dealing with SLM prompts is a little different with dealing with system instructions in LLM  ( will read about it though..))
export const LOCAL_CHAT_SYSTEM_PROMPT =
  "You are an AI Agent named ShameTheWeb. assist users with there queries. You will be provided with the user's history if it exists. Use chat history and any provided local snippets; when snippets exist, name the best page and include its URL and share what your thoughts on the page based on the user query in a structured manner please.";


export function isLowQualityModelReply(value: string): boolean {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return true;
  }
  const promptLine = normalized.split("\n")[0]?.trim() ?? normalized;
  if (LOCAL_CHAT_SYSTEM_PROMPT.includes(promptLine)) {
    return true;
  }

  return false;
}
