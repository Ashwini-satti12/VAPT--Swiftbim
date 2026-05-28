/**
 * App-wide react-router wrapper:
 * - `useSearchParams()` reads/writes encrypted `?e=...`
 * - `useParams()` decrypts encrypted path ids (`/view/<token>` → `id`)
 * - `useNavigate()` / `Link` encrypt query strings and numeric path ids
 *
 * Configured via tsconfig + vite alias — pages keep importing from `"react-router-dom"`.
 */
import { useCallback } from 'react';
import {
  Link as RRLink,
  useNavigate as useRRNavigate,
  useParams as useRRParams,
  type LinkProps,
  type NavigateOptions,
  type To,
} from 'react-router-dom-original';
import {
  encryptPathname,
  encryptPathWithSearch,
  encryptedPathFromPlainSearch,
  decryptPathId,
} from '../utils/encryptedQuery';

export * from 'react-router-dom-original';
export { useEncryptedSearchParams as useSearchParams } from '../hooks/useEncryptedSearchParams';

const DECRYPT_PARAM_KEY = /^(id|.*Id|.*_id)$/i;

/** Decrypt `:id`, `:invoiceId`, `:resourceId`, etc. from the URL bar token. */
export function useParams<
  T extends Record<string, string | undefined> = Record<string, string | undefined>,
>(): T {
  const params = useRRParams<T>();
  const out = { ...params } as Record<string, string | undefined>;
  for (const key of Object.keys(out)) {
    const raw = out[key];
    if (!raw || !DECRYPT_PARAM_KEY.test(key)) continue;
    const dec = decryptPathId(raw);
    if (dec != null) out[key] = dec;
  }
  return out as T;
}

function encryptTo(to: To): To {
  if (typeof to === 'number') return to;
  if (typeof to === 'string') return encryptPathWithSearch(to);
  if (to && typeof to === 'object') {
    const pathname = to.pathname ? encryptPathname(to.pathname) : to.pathname;
    if (pathname && to.search) {
      const search = to.search.startsWith('?') ? to.search : `?${to.search}`;
      const enc = encryptedPathFromPlainSearch(pathname, search);
      if (enc) {
        const q = enc.indexOf('?');
        return {
          ...to,
          pathname: q >= 0 ? enc.slice(0, q) : enc,
          search: q >= 0 ? enc.slice(q) : '',
        };
      }
      return { ...to, pathname };
    }
    if (pathname && pathname !== to.pathname) {
      return { ...to, pathname };
    }
  }
  return to;
}

export function useNavigate() {
  const navigate = useRRNavigate();
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }
      navigate(encryptTo(to), options);
    },
    [navigate]
  );
}

export function Link({ to, ...rest }: LinkProps) {
  return <RRLink to={encryptTo(to)} {...rest} />;
}
