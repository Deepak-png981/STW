/**
 * Configuration for the optional "Better answers" cross-encoder re-ranking stage.
 *
 * Re-ranking downloads a second model (`Xenova/ms-marco-MiniLM-L-6-v2`, ~23 MB)
 * on top of the embedding model. To avoid forcing an extra download on day one,
 * the feature is OPT-IN and defaults to OFF. Flip it on via {@link setBetterAnswersEnabled}
 * (e.g. wired to a "Better answers" toggle in the dashboard). When off, search behaves
 * exactly as before and the cross-encoder is never initialized/downloaded.
 */
export const RERANK_MODEL_ID = "Xenova/ms-marco-MiniLM-L-6-v2" as const;

/** Max candidates re-scored by the cross-encoder per query (keeps latency bounded). */
export const RERANK_INPUT_LIMIT = 20;

/** Default state: re-ranking is off so no extra model download is forced. */
export const RERANK_DEFAULT_ENABLED = false;

const state: { enabled: boolean } = { enabled: RERANK_DEFAULT_ENABLED };

export function isBetterAnswersEnabled(): boolean {
  return state.enabled;
}

export function setBetterAnswersEnabled(enabled: boolean): void {
  state.enabled = enabled;
}
