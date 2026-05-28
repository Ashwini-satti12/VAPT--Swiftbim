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

/** Encrypt a path segment id (e.g. `123` → token for `/view/123`). */
export function encryptPathId(id: string | number): string {
  return encryptQueryString(String(id));
}

/** Decrypt a path segment; returns null if not a valid encrypted/plain id token. */
export function decryptPathId(token: string): string | null {
  if (!token) return null;
  if (/^\d+$/.test(token)) return token;
  return decryptQueryString(token);
}

const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Numeric or UUID segments in the URL path (not route labels like `mytasks`). */
export function shouldEncryptPathSegment(segment: string): boolean {
  if (!segment) return false;
  if (/^\d+$/.test(segment)) return true;
  if (UUID_SEGMENT.test(segment)) return true;
  const dec = decryptPathId(segment);
  if (dec != null && (/^\d+$/.test(dec) || UUID_SEGMENT.test(dec))) return false;
  return false;
}

/** Encrypt numeric/uuid segments in a pathname. */
export function encryptPathname(pathname: string): string {
  if (!shouldEncryptQueryForPath(pathname)) return pathname;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return pathname;

  const encrypted = parts.map((seg) =>
    shouldEncryptPathSegment(seg) ? encryptPathId(seg) : seg
  );
  const next = `/${encrypted.join('/')}`;
  return next;
}

/** `/td/mytasks/view/42` → `/td/mytasks/view/<token>` when needed. */
export function encryptedPathFromPlainPath(pathname: string): string | null {
  if (!shouldEncryptQueryForPath(pathname)) return null;
  const enc = encryptPathname(pathname);
  return enc !== pathname ? enc : null;
}

/** Upgrade pathname + search (query + path ids) in one step. */
export function upgradePlainLocation(pathname: string, search: string): string | null {
  if (!shouldEncryptQueryForPath(pathname)) return null;

  const encPathname = encryptPathname(pathname);
  let result = encPathname;

  if (search) {
    const encWithSearch = encryptedPathFromPlainSearch(encPathname, search);
    result = encWithSearch ?? `${encPathname}${search}`;
  }

  const current = `${pathname}${search}`;
  return result !== current ? result : null;
}

/** Encrypt `pathname?a=1` and path ids (for navigate / Link). */
export function encryptPathWithSearch(pathWithOptionalSearch: string): string {
  const qIndex = pathWithOptionalSearch.indexOf('?');
  const pathname =
    qIndex === -1 ? pathWithOptionalSearch : pathWithOptionalSearch.slice(0, qIndex);
  const search = qIndex === -1 ? '' : pathWithOptionalSearch.slice(qIndex);

  const encPathname = encryptPathname(pathname);
  if (!search) return encPathname;

  return encryptedPathFromPlainSearch(encPathname, search) ?? `${encPathname}${search}`;
}

export const GMAIL_REDIRECT_PATH = '/redirect/gmail';

/** Plain Gmail compose URL (Google requires plain `to=` on mail.google.com). */
export function buildGmailComposeUrl(email: string): string {
  const mail = email.trim();
  return `https://mail.google.com/mail/u/0/?fs=1&to=${encodeURIComponent(mail)}&tf=cm`;
}

/** In-app redirect with encrypted `to` → `/redirect/gmail?e=...` */
export function buildGmailComposeRedirectPath(email: string): string {
  return buildEncryptedSearchPath(GMAIL_REDIRECT_PATH, { to: email.trim() });
}

/** Open Gmail via encrypted app URL first, then redirect to mail.google.com. */
export function openGmailCompose(email: string): void {
  const mail = email.trim();
  if (!mail) return;
  const popup = window.open(buildGmailComposeRedirectPath(mail), '_blank', 'noopener,noreferrer');
  if (!popup) window.location.href = `mailto:${mail}`;
}
