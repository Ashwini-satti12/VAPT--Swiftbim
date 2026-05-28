import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom-original';
import { useSearchParams } from 'react-router-dom';
import {
  GMAIL_REDIRECT_PATH,
  buildGmailComposeUrl,
  upgradePlainLocation,
} from '../utils/encryptedQuery';

type Props = { gmail?: boolean };

/**
 * Global URL guard + Gmail compose redirect (no extra files).
 * - Default: encrypt plain `?status=...` and path ids (`/view/123`)
 * - `/redirect/gmail`: decrypt `?e=...` then open Gmail
 */
export default function EncryptedQueryRedirect({ gmail = false }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGmail = gmail || location.pathname === GMAIL_REDIRECT_PATH;

  useEffect(() => {
    if (isGmail) {
      const to = searchParams.get('to')?.trim();
      if (to) window.location.replace(buildGmailComposeUrl(to));
      else window.close();
      return;
    }

    const upgraded = upgradePlainLocation(location.pathname, location.search);
    if (!upgraded) return;

    const current = `${location.pathname}${location.search}`;
    if (upgraded !== current) {
      navigate(upgraded, { replace: true });
    }
  }, [isGmail, location.pathname, location.search, navigate, searchParams]);

  if (isGmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Opening Gmail…
      </div>
    );
  }

  return null;
}
