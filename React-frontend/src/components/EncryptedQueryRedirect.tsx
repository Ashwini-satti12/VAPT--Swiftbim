import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom-original';
import { encryptedPathFromPlainSearch } from '../utils/encryptedQuery';

/**
 * Single global guard: any plain `?status=...&foo=bar` becomes `?e=<encrypted>`.
 * Mounted once in App.tsx — no per-page changes required.
 */
export default function EncryptedQueryRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const upgraded = encryptedPathFromPlainSearch(location.pathname, location.search);
    if (!upgraded) return;

    const current = `${location.pathname}${location.search}`;
    if (upgraded !== current) {
      navigate(upgraded, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return null;
}
