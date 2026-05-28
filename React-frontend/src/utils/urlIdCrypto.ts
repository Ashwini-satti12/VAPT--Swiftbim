/**
 * Reversible URL-safe encoding for numeric IDs (VAPT: hide sequential IDs in browser URLs).
 * Not a substitute for server-side authorization.
 */

const SECRET =
  import.meta.env.VITE_URL_ID_SECRET || "swiftbim-vapt-url-id-key-change-me";

function keyBytes(): Uint8Array {
  const enc = new TextEncoder().encode(SECRET);
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = enc[i % enc.length] ^ ((i * 31) & 0xff);
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(encoded: string): Uint8Array {
  let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Encode a numeric ID for use in path or query segments. */
export function encodeUrlId(id: number | string): string {
  const plain = String(id);
  if (!plain || !/^\d+$/.test(plain)) return plain;
  const key = keyBytes();
  const data = new TextEncoder().encode(plain);
  const out = new Uint8Array(data.length + 1);
  out[0] = data.length;
  for (let i = 0; i < data.length; i++) {
    out[i + 1] = data[i] ^ key[i % key.length] ^ ((i * 17) & 0xff);
  }
  return bytesToBase64Url(out);
}

/** Decode an encoded ID; accepts legacy plain numeric strings. */
export function decodeUrlId(encoded: string | null | undefined): string | null {
  if (encoded == null || encoded === "") return null;
  if (/^\d+$/.test(encoded)) return encoded;
  try {
    const raw = base64UrlToBytes(encoded);
    if (raw.length < 2) return null;
    const len = raw[0];
    if (len + 1 > raw.length) return null;
    const key = keyBytes();
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = raw[i + 1] ^ key[i % key.length] ^ ((i * 17) & 0xff);
    }
    const s = new TextDecoder().decode(out);
    return /^\d+$/.test(s) ? s : null;
  } catch {
    return null;
  }
}

export function parseUrlId(encoded: string | null | undefined): number | null {
  const d = decodeUrlId(encoded);
  if (d == null) return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}

/** True when the app route should use encrypted IDs in URLs (vendor panels). */
export function shouldEncryptUrlIds(pathname: string): boolean {
  return /^\/(v|vpm|ve|vendor-bim-lead)(\/|$)/.test(pathname);
}

export function vendorProjectIdQuery(id: number): string {
  return `project_id=${encodeURIComponent(encodeUrlId(id))}`;
}
