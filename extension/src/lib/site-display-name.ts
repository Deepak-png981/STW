import type { VisitRecord } from "@shame-the-web/shared";

function titleCaseWord(word: string): string {
  if (!word) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function prettifyHostname(hostname: string): string {
  const normalized = hostname.trim().toLowerCase().replace(/^www\./, "");
  if (!normalized) {
    return hostname;
  }
  if (normalized === "localhost") {
    return "Localhost";
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
    return "Local site";
  }

  const parts = normalized.split(".").filter(Boolean);
  if (parts.length === 0) {
    return hostname;
  }

  const siteLabel = parts.length >= 2 ? parts[0] : parts[0];
  return siteLabel.split("-").map(titleCaseWord).join(" ");
}

function cleanDocumentTitle(raw: string, hostname: string): string | null {
  const title = raw.replace(/\s+/g, " ").trim();
  if (title.length < 2) {
    return null;
  }
  const lower = title.toLowerCase();
  const host = hostname.toLowerCase();
  if (lower === host || lower.startsWith("http://") || lower.startsWith("https://")) {
    return null;
  }
  if (title.length > 56) {
    return `${title.slice(0, 53)}…`;
  }
  return title;
}

export function getSiteDisplayName(visit: VisitRecord): string {
  const fromTitle = cleanDocumentTitle(visit.title, visit.hostname);
  if (fromTitle) {
    return fromTitle;
  }
  return prettifyHostname(visit.hostname);
}
