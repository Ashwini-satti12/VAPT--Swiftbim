/**
 * App-wide react-router wrapper:
 * - `useSearchParams()` reads/writes encrypted `?e=...`
 * - `useNavigate()` / `Link` encrypt `?key=value` in the address bar
 *
 * Configured via tsconfig + vite alias — pages keep importing from `"react-router-dom"`.
 */
import { useCallback } from 'react';
import {
  Link as RRLink,
  useNavigate as useRRNavigate,
  type LinkProps,
  type NavigateOptions,
  type To,
} from 'react-router-dom-original';
import { encryptPathWithSearch, encryptedPathFromPlainSearch } from '../utils/encryptedQuery';

export * from 'react-router-dom-original';
export { useEncryptedSearchParams as useSearchParams } from '../hooks/useEncryptedSearchParams';

function encryptTo(to: To): To {
  if (typeof to === 'number') return to;
  if (typeof to === 'string') return encryptPathWithSearch(to);
  if (to && typeof to === 'object' && to.pathname && to.search) {
    const enc = encryptedPathFromPlainSearch(
      to.pathname,
      to.search.startsWith('?') ? to.search : `?${to.search}`
    );
    if (enc) {
      const q = enc.indexOf('?');
      return { ...to, search: q >= 0 ? enc.slice(q) : '' };
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
