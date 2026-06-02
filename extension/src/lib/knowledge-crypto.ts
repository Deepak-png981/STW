import type { EncryptedKnowledgePack, KnowledgePackKdfParams } from "@shame-the-web/shared";

/**
 * Passphrase-based encryption for portable knowledge packs, built entirely on the
 * platform WebCrypto API (`crypto.subtle`) so it adds zero dependencies and runs in
 * the service worker, the dashboard, and Node test environments alike.
 *
 * Scheme: PBKDF2(SHA-256) stretches the passphrase into a 256-bit AES-GCM key, which
 * encrypts the plaintext JSON. The GCM authentication tag means a wrong passphrase or
 * any tampering with the ciphertext fails decryption instead of returning garbage.
 */

// 600k follows current NIST SP 800-132 / OWASP guidance for PBKDF2-HMAC-SHA256.
// The count is recorded in each envelope's `kdf.iterations`, so older packs still
// decrypt with whatever value they were created with.
const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const AES_KEY_BITS = 256;
const ENVELOPE_APP_NAME = "shame-the-web";

const DEFAULT_KDF: KnowledgePackKdfParams = {
  name: "PBKDF2",
  hash: "SHA-256",
  iterations: PBKDF2_ITERATIONS
};

const DECRYPT_FAILURE_MESSAGE =
  "Unable to decrypt this pack. The passphrase is incorrect or the file is corrupted.";

export async function encryptPack(json: string, passphrase: string): Promise<EncryptedKnowledgePack> {
  if (!passphrase) {
    throw new Error("A passphrase is required to encrypt a knowledge pack.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveAesKey(passphrase, salt, DEFAULT_KDF.iterations);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(json)
  );

  return {
    formatVersion: 2,
    app: ENVELOPE_APP_NAME,
    kdf: { ...DEFAULT_KDF },
    cipher: "AES-GCM",
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext))
  };
}

export async function decryptPack(envelope: EncryptedKnowledgePack, passphrase: string): Promise<string> {
  if (!passphrase) {
    throw new Error("A passphrase is required to decrypt this pack.");
  }

  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  const key = await deriveAesKey(passphrase, salt, envelope.kdf.iterations);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      fromBase64(envelope.ciphertext)
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
}

export function isEncryptedKnowledgePack(value: unknown): value is EncryptedKnowledgePack {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  const kdf = record["kdf"];
  return (
    record["formatVersion"] === 2 &&
    record["app"] === ENVELOPE_APP_NAME &&
    record["cipher"] === "AES-GCM" &&
    typeof record["salt"] === "string" &&
    typeof record["iv"] === "string" &&
    typeof record["ciphertext"] === "string" &&
    !!kdf &&
    typeof kdf === "object" &&
    (kdf as Record<string, unknown>)["name"] === "PBKDF2" &&
    typeof (kdf as Record<string, unknown>)["iterations"] === "number"
  );
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: AES_KEY_BITS },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  const chunkCount = Math.ceil(bytes.length / CHUNK);
  const parts = Array.from({ length: chunkCount }, (_unused, chunkIndex) => {
    const start = chunkIndex * CHUNK;
    return String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  });
  return btoa(parts.join(""));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
