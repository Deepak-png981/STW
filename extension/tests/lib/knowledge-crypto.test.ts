import { describe, expect, it } from "vitest";

import {
  decryptPack,
  encryptPack,
  isEncryptedKnowledgePack
} from "../../src/lib/knowledge-crypto";
import { buildKnowledgeExport, parseKnowledgeImport } from "../../src/lib/knowledge-transfer";
import type { KnowledgeGraph, PageContent, VisitRecord } from "@shame-the-web/shared";

const SAMPLE_JSON = JSON.stringify({ hello: "world", items: [1, 2, 3] });
const PASSPHRASE = "correct horse battery staple";

const pages: PageContent[] = [
  {
    url: "https://a.example.com",
    title: "A",
    description: "Desc A",
    headings: ["h1"],
    bodyText: "Body A",
    keywords: ["a"],
    visitedAt: "2026-05-20T10:00:00.000Z"
  }
];

const graph: KnowledgeGraph = {
  nodes: [],
  edges: [],
  builtAt: "2026-05-20T12:00:00.000Z"
};

const visits: VisitRecord[] = [
  {
    id: "v1",
    userId: "u1",
    url: "https://a.example.com",
    hostname: "a.example.com",
    title: "A",
    timestamp: "2026-05-20T10:00:00.000Z",
    metrics: { loadMs: 1, fcpMs: 1, lcpMs: 1, domInteractiveMs: 1 },
    speedScore100: 90,
    categoryScores: [],
    overallScore100: 90,
    roast: { category: "good", templateId: "t1", message: "m", subline: "s" }
  }
];

describe("knowledge-crypto", () => {
  it("round-trips encrypt then decrypt with the correct passphrase", async () => {
    const envelope = await encryptPack(SAMPLE_JSON, PASSPHRASE);

    expect(envelope.formatVersion).toBe(2);
    expect(envelope.cipher).toBe("AES-GCM");
    expect(envelope.kdf.name).toBe("PBKDF2");
    expect(envelope.kdf.iterations).toBeGreaterThanOrEqual(200_000);
    expect(typeof envelope.salt).toBe("string");
    expect(typeof envelope.iv).toBe("string");
    expect(typeof envelope.ciphertext).toBe("string");
    expect(envelope.ciphertext).not.toContain("hello");

    const decrypted = await decryptPack(envelope, PASSPHRASE);
    expect(decrypted).toBe(SAMPLE_JSON);
  });

  it("uses a fresh random salt and iv per encryption", async () => {
    const first = await encryptPack(SAMPLE_JSON, PASSPHRASE);
    const second = await encryptPack(SAMPLE_JSON, PASSPHRASE);
    expect(first.salt).not.toBe(second.salt);
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("rejects an empty passphrase on encrypt", async () => {
    await expect(encryptPack(SAMPLE_JSON, "")).rejects.toThrow();
  });

  it("rejects the wrong passphrase on decrypt", async () => {
    const envelope = await encryptPack(SAMPLE_JSON, PASSPHRASE);
    await expect(decryptPack(envelope, "wrong passphrase")).rejects.toThrow();
  });

  it("rejects tampered ciphertext (AES-GCM auth tag)", async () => {
    const envelope = await encryptPack(SAMPLE_JSON, PASSPHRASE);
    const tampered = { ...envelope, ciphertext: flipFirstBase64Char(envelope.ciphertext) };
    await expect(decryptPack(tampered, PASSPHRASE)).rejects.toThrow();
  });

  it("detects encrypted envelopes via the type guard", async () => {
    const envelope = await encryptPack(SAMPLE_JSON, PASSPHRASE);
    expect(isEncryptedKnowledgePack(envelope)).toBe(true);
    expect(isEncryptedKnowledgePack({ formatVersion: 1 })).toBe(false);
    expect(isEncryptedKnowledgePack(null)).toBe(false);
    expect(isEncryptedKnowledgePack("nope")).toBe(false);
  });
});

describe("knowledge-transfer encryption integration", () => {
  it("exports plaintext with .stw.json by default and imports it", async () => {
    const exported = await buildKnowledgeExport({ pages, visits, graph });
    expect(exported.encrypted).toBe(false);
    expect(exported.filename.endsWith(".stw.json")).toBe(true);

    const parsed = await parseKnowledgeImport(exported.json);
    expect(parsed.pages).toHaveLength(1);
    expect(parsed.visits).toHaveLength(1);
    expect(parsed.app).toBe("shame-the-web");
  });

  it("exports an encrypted .stw.enc pack and imports it with the passphrase", async () => {
    const exported = await buildKnowledgeExport({ pages, visits, graph, passphrase: PASSPHRASE });
    expect(exported.encrypted).toBe(true);
    expect(exported.filename.endsWith(".stw.enc")).toBe(true);
    expect(exported.json).not.toContain("a.example.com");

    const parsed = await parseKnowledgeImport(exported.json, PASSPHRASE);
    expect(parsed.pages[0]?.url).toBe("https://a.example.com");
  });

  it("rejects encrypted import without a passphrase", async () => {
    const exported = await buildKnowledgeExport({ pages, visits, graph, passphrase: PASSPHRASE });
    await expect(parseKnowledgeImport(exported.json)).rejects.toThrow();
  });

  it("rejects encrypted import with the wrong passphrase", async () => {
    const exported = await buildKnowledgeExport({ pages, visits, graph, passphrase: PASSPHRASE });
    await expect(parseKnowledgeImport(exported.json, "nope")).rejects.toThrow();
  });

  it("still imports a legacy v1 plaintext pack", async () => {
    const legacy = JSON.stringify({
      formatVersion: 1,
      app: "shame-the-web",
      exportedAt: "2026-05-20T12:00:00.000Z",
      pages,
      graph,
      visits
    });
    const parsed = await parseKnowledgeImport(legacy);
    expect(parsed.pages).toHaveLength(1);
  });
});

function flipFirstBase64Char(value: string): string {
  const replacement = value[0] === "A" ? "B" : "A";
  return `${replacement}${value.slice(1)}`;
}
