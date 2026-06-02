import type {
  KnowledgeGraphExportV1,
  KnowledgeImportMode,
  PageContent,
  StoredState,
  VisitRecord
} from "@shame-the-web/shared";

import { decryptPack, encryptPack, isEncryptedKnowledgePack } from "./knowledge-crypto";

const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;
const EXPORT_APP_NAME = "shame-the-web";

export type KnowledgeExportResult = {
  filename: string;
  json: string;
  encrypted: boolean;
  payload: KnowledgeGraphExportV1;
};

export async function buildKnowledgeExport(input: {
  pages: readonly PageContent[];
  visits: readonly VisitRecord[];
  graph: import("@shame-the-web/shared").KnowledgeGraph;
  /** When provided, the pack is wrapped in an encrypted v2 envelope. */
  passphrase?: string;
}): Promise<KnowledgeExportResult> {
  const payload: KnowledgeGraphExportV1 = {
    formatVersion: 1,
    app: EXPORT_APP_NAME,
    exportedAt: new Date().toISOString(),
    pages: input.pages,
    graph: input.graph,
    visits: input.visits
  };
  const date = payload.exportedAt.slice(0, 10);
  const plaintextJson = JSON.stringify(payload, null, 2);

  if (input.passphrase) {
    const envelope = await encryptPack(plaintextJson, input.passphrase);
    return {
      filename: `shame-the-web-export-${date}.stw.enc`,
      json: JSON.stringify(envelope, null, 2),
      encrypted: true,
      payload
    };
  }

  return {
    filename: `shame-the-web-export-${date}.stw.json`,
    json: plaintextJson,
    encrypted: false,
    payload
  };
}

export async function parseKnowledgeImport(
  fileContents: string,
  passphrase?: string
): Promise<KnowledgeGraphExportV1> {
  const size = new TextEncoder().encode(fileContents).byteLength;
  if (size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("Import file is too large. Maximum supported size is 50MB.");
  }

  const parsed = parseJson(fileContents, "Import file is not valid JSON.");

  if (isEncryptedKnowledgePack(parsed)) {
    if (!passphrase) {
      throw new Error("This pack is encrypted. Enter the passphrase used when it was exported.");
    }
    const decryptedJson = await decryptPack(parsed, passphrase);
    const decrypted = parseJson(decryptedJson, "Decrypted pack contents are not valid JSON.");
    if (!isKnowledgeGraphExportV1(decrypted)) {
      throw new Error("Decrypted pack format is invalid or unsupported.");
    }
    return decrypted;
  }

  if (!isKnowledgeGraphExportV1(parsed)) {
    throw new Error("Import file format is invalid or unsupported.");
  }

  return parsed;
}

function parseJson(value: string, errorMessage: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(errorMessage);
  }
}

export function mergePageContents(
  existingPages: readonly PageContent[],
  importedPages: readonly PageContent[],
  mode: KnowledgeImportMode
): PageContent[] {
  if (mode === "replace") {
    return [...importedPages];
  }

  const byUrl = new Map(existingPages.map((page) => [page.url, page]));
  importedPages.forEach((page) => {
    const current = byUrl.get(page.url);
    if (!current) {
      byUrl.set(page.url, page);
      return;
    }
    byUrl.set(page.url, chooseLatestPage(current, page));
  });
  return [...byUrl.values()];
}

export function mergeImportedVisits(
  state: StoredState,
  importedVisits: readonly VisitRecord[],
  mode: KnowledgeImportMode
): VisitRecord[] {
  const activeUserId = state.activeUserId;
  const sanitizedImported = importedVisits.map((visit) =>
    activeUserId ? { ...visit, userId: activeUserId } : visit
  );
  if (mode === "replace") {
    return sanitizedImported.slice(-500);
  }

  const keyed = new Map<string, VisitRecord>();
  state.visits.forEach((visit) => {
    keyed.set(`${visit.url}|${visit.timestamp}`, visit);
  });
  sanitizedImported.forEach((visit) => {
    keyed.set(`${visit.url}|${visit.timestamp}`, visit);
  });
  return [...keyed.values()]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-500);
}

function isKnowledgeGraphExportV1(value: unknown): value is KnowledgeGraphExportV1 {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record["formatVersion"] !== 1 || record["app"] !== EXPORT_APP_NAME) {
    return false;
  }
  if (typeof record["exportedAt"] !== "string") {
    return false;
  }
  const pages = record["pages"];
  const visits = record["visits"];
  const graph = record["graph"];
  if (!Array.isArray(pages) || !pages.every(isPageContent)) {
    return false;
  }
  if (!Array.isArray(visits) || !visits.every(isVisitRecord)) {
    return false;
  }
  return isKnowledgeGraph(graph);
}

function isPageContent(value: unknown): value is PageContent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record["url"] === "string" &&
    typeof record["title"] === "string" &&
    typeof record["description"] === "string" &&
    Array.isArray(record["headings"]) &&
    record["headings"].every((item) => typeof item === "string") &&
    typeof record["bodyText"] === "string" &&
    Array.isArray(record["keywords"]) &&
    record["keywords"].every((item) => typeof item === "string") &&
    typeof record["visitedAt"] === "string"
  );
}

function isVisitRecord(value: unknown): value is VisitRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  const metrics = record["metrics"];
  const roast = record["roast"];
  const categoryScores = record["categoryScores"];
  return (
    typeof record["id"] === "string" &&
    typeof record["userId"] === "string" &&
    typeof record["url"] === "string" &&
    typeof record["hostname"] === "string" &&
    typeof record["title"] === "string" &&
    typeof record["timestamp"] === "string" &&
    !!metrics &&
    typeof metrics === "object" &&
    isNullableNumber((metrics as Record<string, unknown>)["loadMs"]) &&
    isNullableNumber((metrics as Record<string, unknown>)["fcpMs"]) &&
    isNullableNumber((metrics as Record<string, unknown>)["lcpMs"]) &&
    isNullableNumber((metrics as Record<string, unknown>)["domInteractiveMs"]) &&
    typeof record["speedScore100"] === "number" &&
    Array.isArray(categoryScores) &&
    categoryScores.every(isCategoryScore) &&
    typeof record["overallScore100"] === "number" &&
    !!roast &&
    typeof roast === "object" &&
    typeof (roast as Record<string, unknown>)["category"] === "string" &&
    typeof (roast as Record<string, unknown>)["templateId"] === "string" &&
    typeof (roast as Record<string, unknown>)["message"] === "string" &&
    typeof (roast as Record<string, unknown>)["subline"] === "string"
  );
}

function isCategoryScore(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record["category"] === "string" &&
    typeof record["score10"] === "number" &&
    typeof record["score100"] === "number"
  );
}

function isKnowledgeGraph(value: unknown): value is import("@shame-the-web/shared").KnowledgeGraph {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record["nodes"]) &&
    record["nodes"].every(isKnowledgeNode) &&
    Array.isArray(record["edges"]) &&
    record["edges"].every(isKnowledgeEdge) &&
    typeof record["builtAt"] === "string"
  );
}

function isKnowledgeNode(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record["id"] === "string" &&
    typeof record["label"] === "string" &&
    typeof record["hostname"] === "string" &&
    typeof record["url"] === "string" &&
    Array.isArray(record["keywords"]) &&
    record["keywords"].every((item) => typeof item === "string") &&
    typeof record["visitCount"] === "number" &&
    typeof record["lastVisited"] === "string" &&
    typeof record["clusterId"] === "number"
  );
}

function isKnowledgeEdge(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record["source"] === "string" &&
    typeof record["target"] === "string" &&
    typeof record["weight"] === "number"
  );
}

function isNullableNumber(value: unknown): boolean {
  return value === null || typeof value === "number";
}

function chooseLatestPage(a: PageContent, b: PageContent): PageContent {
  return a.visitedAt >= b.visitedAt ? a : b;
}
