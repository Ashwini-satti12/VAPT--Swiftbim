/** Encrypted query string — URL looks like `/td/projects?e=<token>` */
export const ENCRYPTED_QUERY_PARAM = 'e';

const DEV_FALLBACK_SECRET = 'swiftbim-url-query-dev-secret';

const SKIP_ENCRYPT_PATHS = new Set(['/login', '/client-login', '/']);

function getSecret(): string {
  const fromEnv = (import.meta.env.VITE_URL_QUERY_SECRET as string | undefined)?.trim();
  return fromEnv || DEV_FALLBACK_SECRET;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function xorWithKey(data: Uint8Array, key: string): Uint8Array {
  const keyBytes = new TextEncoder().encode(key);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

export function encryptQueryString(plain: string): string {
  const enc = new TextEncoder().encode(plain);
  return toBase64Url(xorWithKey(enc, getSecret()));
}

export function decryptQueryString(encrypted: string): string | null {
  try {
    const xored = fromBase64Url(encrypted);
    return new TextDecoder().decode(xorWithKey(xored, getSecret()));
  } catch {
    return null;
  }
}

/** True for all app routes except login screens. */
export function shouldEncryptQueryForPath(pathname: string): boolean {
  if (!pathname || SKIP_ENCRYPT_PATHS.has(pathname)) return false;
  return true;
}

export function parseEncryptedSearch(search: string): URLSearchParams {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return new URLSearchParams();

  const outer = new URLSearchParams(raw);
  const blob = outer.get(ENCRYPTED_QUERY_PARAM);
  if (blob) {
    const plain = decryptQueryString(blob);
    if (plain) return new URLSearchParams(plain);
  }
  return outer;
}

export function buildEncryptedSearchPath(
  pathname: string,
  params: Record<string, string | undefined | null>
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && String(value).trim() !== '') {
      sp.set(key, String(value));
    }
  }
  const plain = sp.toString();
  if (!plain) return pathname;
  return `${pathname}?${ENCRYPTED_QUERY_PARAM}=${encryptQueryString(plain)}`;
}

/** `/path?status=Completed` → `/path?e=...` (or null if already encrypted / empty). */
export function encryptedPathFromPlainSearch(
  pathname: string,
  search: string
): string | null {
  if (!shouldEncryptQueryForPath(pathname)) return null;

  const raw = search.startsWith('?') ? search.slice(1) : search;
  const outer = new URLSearchParams(raw);
  if (!outer.toString() || outer.has(ENCRYPTED_QUERY_PARAM)) return null;

  return buildEncryptedSearchPath(
    pathname,
    Object.fromEntries(outer.entries()) as Record<string, string>
  );
}

/** Encrypt `pathname?a=1&b=2` style paths (for navigate / Link). */
export function encryptPathWithSearch(pathWithOptionalSearch: string): string {
  const qIndex = pathWithOptionalSearch.indexOf('?');
  if (qIndex === -1) return pathWithOptionalSearch;

  const pathname = pathWithOptionalSearch.slice(0, qIndex);
  const search = pathWithOptionalSearch.slice(qIndex);
  return encryptedPathFromPlainSearch(pathname, search) ?? pathWithOptionalSearch;
}
