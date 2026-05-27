import { useCallback, useMemo } from 'react';
import {
  useLocation,
  useNavigate,
  type NavigateOptions,
  type URLSearchParamsInit,
} from 'react-router-dom-original';
import {
  buildEncryptedSearchPath,
  parseEncryptedSearch,
  shouldEncryptQueryForPath,
} from '../utils/encryptedQuery';

type SetSearchParams = (
  next?:
    | URLSearchParamsInit
    | ((prev: URLSearchParams) => URLSearchParamsInit),
  options?: NavigateOptions
) => void;

function toURLSearchParams(init: URLSearchParamsInit): URLSearchParams {
  if (init instanceof URLSearchParams) {
    return new URLSearchParams(init);
  }
  if (typeof init === 'string') {
    const raw = init.startsWith('?') ? init.slice(1) : init;
    return new URLSearchParams(raw);
  }
  if (Array.isArray(init)) {
    return new URLSearchParams(init);
  }
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(init)) {
    if (value == null) continue;
    sp.set(key, String(value));
  }
  return sp;
}

/**
 * Drop-in replacement for react-router `useSearchParams`.
 * Reads/writes decrypted params while the address bar shows `?e=<encrypted>`.
 */
export function useEncryptedSearchParams(): [URLSearchParams, SetSearchParams] {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = useMemo(() => {
    if (!shouldEncryptQueryForPath(location.pathname)) {
      return new URLSearchParams(location.search);
    }
    return parseEncryptedSearch(location.search);
  }, [location.pathname, location.search]);

  const setSearchParams: SetSearchParams = useCallback(
    (next, options) => {
      const resolved =
        typeof next === 'function' ? next(searchParams) : next;
      const sp =
        resolved === undefined || resolved === null
          ? new URLSearchParams()
          : toURLSearchParams(resolved);
      const plain = sp.toString();

      if (!plain) {
        navigate(location.pathname, { replace: options?.replace });
        return;
      }

      if (!shouldEncryptQueryForPath(location.pathname)) {
        navigate(`${location.pathname}?${plain}`, {
          replace: options?.replace,
          state: options?.state,
        });
        return;
      }

      const path = buildEncryptedSearchPath(
        location.pathname,
        Object.fromEntries(sp.entries()) as Record<string, string>
      );
      navigate(path, { replace: options?.replace, state: options?.state });
    },
    [location.pathname, navigate, searchParams]
  );

  return [searchParams, setSearchParams];
}
