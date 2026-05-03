import type { KnowledgeSearchResult, PageContent } from "@shame-the-web/shared";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall",
  "that", "this", "these", "those", "it", "its", "we", "our", "you", "your", "he", "his",
  "she", "her", "they", "their", "them", "what", "which", "who", "whom", "how", "when",
  "where", "why", "all", "any", "both", "each", "more", "most", "other", "some", "such",
  "no", "not", "only", "same", "so", "than", "too", "very", "just", "about", "up", "out",
  "if", "then", "now", "also", "can", "into", "through", "during", "before", "after",
  "above", "below", "between", "own", "use", "used", "using", "one", "two", "three",
  "new", "get", "go", "make", "time", "way", "me", "my", "i", "www", "http", "https",
  "com", "org", "net", "page", "site", "web", "click", "here", "read", "more", "see",
  "like", "well", "even", "much", "over", "back", "still", "want", "take", "put",
  "s", "re", "ve", "ll", "d", "t", "m", "ll"
]);

export function tokenize(text: string, minLength = 3): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((tok) => tok.length >= minLength && !STOPWORDS.has(tok));
}

export function extractKeywords(
  content: Pick<PageContent, "title" | "description" | "headings" | "bodyText">,
  topN = 15
): string[] {
  // Weight: title ×5, headings ×3, description ×2, body ×1
  const weighted =
    `${content.title} `.repeat(5) +
    `${content.headings.join(" ")} `.repeat(3) +
    `${content.description} `.repeat(2) +
    content.bodyText;

  const freq = new Map<string, number>();
  for (const tok of tokenize(weighted)) {
    freq.set(tok, (freq.get(tok) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term]) => term);
}

export function cosineSimilarity(termsA: string[], termsB: string[]): number {
  if (termsA.length === 0 || termsB.length === 0) {
    return 0;
  }
  const setA = new Set(termsA);
  const setB = new Set(termsB);
  let dot = 0;
  for (const term of setA) {
    if (setB.has(term)) dot++;
  }
  return dot / Math.sqrt(setA.size * setB.size);
}

export function searchPages(query: string, pages: PageContent[]): KnowledgeSearchResult[] {
  if (!query.trim() || pages.length === 0) {
    return [];
  }
  const queryTokens = tokenize(query, 2);
  if (queryTokens.length === 0) {
    return [];
  }

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const scored = pages.map((page) => {
    let score = 0;

    // Keyword vector overlap
    const keywordOverlap = page.keywords.filter((k) => queryTokens.includes(k)).length;
    score += keywordOverlap * 2;

    // Title and URL substring match (strong signal)
    const titleLower = page.title.toLowerCase();
    const urlLower = page.url.toLowerCase();
    for (const tok of queryTokens) {
      if (titleLower.includes(tok)) score += 3;
      if (urlLower.includes(tok)) score += 1.5;
    }

    // Headings match
    const headingsText = page.headings.join(" ").toLowerCase();
    for (const tok of queryTokens) {
      if (headingsText.includes(tok)) score += 2;
    }

    // Description match
    const descLower = page.description.toLowerCase();
    for (const tok of queryTokens) {
      if (descLower.includes(tok)) score += 1;
    }

    // Body text overlap
    const bodyTokenSet = new Set(tokenize(page.bodyText));
    for (const tok of queryTokens) {
      if (bodyTokenSet.has(tok)) score += 0.5;
    }

    // Description tokens (substring already scored; add bag overlap for stems / token boundaries)
    const descTokenSet = new Set(tokenize(page.description));
    for (const tok of queryTokens) {
      if (descTokenSet.has(tok)) score += 0.75;
    }

    // Recency bonus
    const age = now - new Date(page.visitedAt).getTime();
    if (age < sevenDaysMs) {
      score *= 1.2;
    }

    const snippet = extractSnippet(
      { bodyText: page.bodyText, description: page.description, title: page.title },
      queryTokens
    );
    return { page, score, snippet };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ page, score, snippet }) => ({
      url: page.url,
      title: page.title,
      hostname: safeHostname(page.url),
      lastVisited: page.visitedAt,
      snippet,
      score
    }));
}

function extractSnippet(
  page: Pick<PageContent, "bodyText" | "description" | "title">,
  queryTokens: string[]
): string {
  const sources = [page.description, page.bodyText, page.title].filter(Boolean);
  if (sources.length === 0 || queryTokens.length === 0) {
    const first = sources[0];
    return first ? first.slice(0, 150) : "";
  }

  let best = "";
  let bestScore = 0;

  for (const text of sources) {
    const s = snippetFromText(text, queryTokens);
    const score = queryTokens.filter((tok) => s.toLowerCase().includes(tok)).length;
    if (score > bestScore || (score === bestScore && s.length > best.length)) {
      bestScore = score;
      best = s;
    }
  }

  return best;
}

function snippetFromText(bodyText: string, queryTokens: string[]): string {
  if (!bodyText) return "";
  const lower = bodyText.toLowerCase();
  let bestPos = 0;
  let bestCount = 0;

  for (let i = 0; i < Math.max(0, lower.length - 150); i += 20) {
    const slice = lower.slice(i, i + 150);
    const count = queryTokens.filter((tok) => slice.includes(tok)).length;
    if (count > bestCount) {
      bestCount = count;
      bestPos = i;
    }
  }

  const start = bestPos;
  const excerpt = bodyText.slice(start, start + 150);
  return (start > 0 ? "\u2026" : "") + excerpt + (start + 150 < bodyText.length ? "\u2026" : "");
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
