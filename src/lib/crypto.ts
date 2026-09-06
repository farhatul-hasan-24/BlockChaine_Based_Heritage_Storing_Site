import type { ArtifactMeta } from "./types";

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Buffer(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** deterministic hex digest without async — used to derive stable demo wallet addresses */
export function syncHex(input: string, bytes: number): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  let out = "";
  let i = 0;
  while (out.length < bytes * 2) {
    const ch = input.charCodeAt(i % input.length) + (i >> 2);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    const v = ((h1 ^ (h1 >>> 16)) >>> 0) ^ ((h2 ^ (h2 >>> 13)) >>> 0);
    out += (v >>> 0).toString(16).padStart(8, "0");
    i++;
  }
  return out.slice(0, bytes * 2);
}

export function addressFromEmail(email: string): string {
  return "0x" + syncHex("arca:" + email.toLowerCase().trim(), 20);
}

export function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function txHash(): string {
  return "0x" + randomHex(32);
}

/** base32-style CID built from a content hash (IPFS-compatible shape) */
export function makeCid(hashHex: string): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let out = "";
  for (let i = 0; i < hashHex.length && out.length < 46; i += 2) {
    const b = parseInt(hashHex.slice(i, i + 2), 16);
    out += alphabet[(b >> 5) & 31] + alphabet[b & 31];
  }
  return "bafybei" + out.padEnd(46, "q");
}

/** registry-authority signature over a canonical payload (demo ECDSA stand-in) */
export async function signPayload(payload: string, signer: string): Promise<string> {
  const h1 = await sha256Hex(payload + "·" + signer.toLowerCase());
  const h2 = await sha256Hex(h1 + payload);
  const h3 = await sha256Hex(h2 + signer + payload.length);
  return "0x" + h1.slice(0, 44) + h2.slice(0, 44) + h3.slice(0, 40) + "1b";
}

/** canonical serialization so the on-chain metadata hash is independently recomputable */
export function canonicalMeta(meta: ArtifactMeta, mediaHash: string): string {
  return JSON.stringify({
    category: meta.category,
    description: meta.description,
    era: meta.era,
    mediaHash,
    provenanceNotes: meta.provenanceNotes,
    title: meta.title,
    year: meta.year,
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
