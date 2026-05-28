"""
VAPT Security Module – XSS Protection & Secure HTTP Headers
============================================================
Implements OWASP-recommended security headers and input sanitisation helpers.

Usage in app.py
---------------
    from security import apply_security_headers, xss_reject, escape_html, strip_xss
    app.after_request(apply_security_headers)

Usage in blueprints (optional – reject requests that contain XSS payloads)
---------------------------------------------------------------------------
    from security import xss_reject

    @bp.route("/comment", methods=["POST"])
    @login_required
    @xss_reject          # blocks the request before the view runs
    def add_comment():
        ...

Input sanitisation helpers
--------------------------
    escape_html(text)          – HTML-escape a plain-text field before storing / returning
    strip_xss(text)            – strip dangerous tags/attrs (uses bleach if installed)
    sanitize_rich_text(text)   – allow a safe whitelist of tags (community posts, etc.)
    contains_xss(text)         – True when an obvious XSS payload is detected
"""

from __future__ import annotations

import html
import logging
import re
from functools import wraps

from flask import jsonify, request

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# XSS detection regex
# ---------------------------------------------------------------------------
_XSS_RE = re.compile(
    r"(<\s*script[\s\S]*?>[\s\S]*?<\s*/\s*script\s*>)"   # <script>…</script>
    r"|(<\s*script[\s\S]*?>)"                              # unclosed <script
    r"|(javascript\s*:)"                                   # javascript: URI
    r"|(vbscript\s*:)"                                     # vbscript: URI
    r"|(on\w+\s*=\s*['\"]?[^>]*)"                         # inline event handlers
    r"|(<\s*iframe[\s\S]*?>)"                              # <iframe>
    r"|(<\s*object[\s\S]*?>)"                              # <object>
    r"|(<\s*embed[\s\S]*?>)"                               # <embed>
    r"|(<\s*svg[\s\S]*?on\w+[\s\S]*?>)"                   # <svg onload=…>
    r"|(expression\s*\()"                                  # CSS expression()
    r"|(data\s*:\s*text/html)",                            # data:text/html URIs
    re.IGNORECASE,
)

# Whitelist of HTML tags allowed in rich-text fields (community posts, messages)
_SAFE_TAGS: frozenset[str] = frozenset(
    [
        "b", "i", "u", "em", "strong", "s", "del",
        "p", "br", "hr",
        "ul", "ol", "li",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "blockquote", "pre", "code", "kbd",
        "span", "div", "a",
        "table", "thead", "tbody", "tr", "th", "td",
    ]
)
_SAFE_ATTRS: dict = {
    "*": ["class", "id"],
    "a": ["href", "title", "rel"],
    "td": ["colspan", "rowspan"],
    "th": ["colspan", "rowspan", "scope"],
}

# ---------------------------------------------------------------------------
# Input sanitisation helpers
# ---------------------------------------------------------------------------


def escape_html(text: str | None) -> str:
    """
    HTML-escape special characters for plain-text fields.
    Converts <, >, &, ", ' to their HTML entities.
    Safe to use before storing or returning any user-supplied string.
    """
    if text is None:
        return ""
    return html.escape(str(text), quote=True)


def strip_xss(text: str | None) -> str:
    """
    Strip all HTML tags and obvious XSS payloads from *text*.
    Uses bleach.clean (strip=True) when available; falls back to
    regex scrubbing + html.escape.
    Suitable for plain-text fields that must never contain markup.
    """
    if text is None:
        return ""
    value = str(text)
    try:
        import bleach  # type: ignore[import]

        return bleach.clean(value, tags=[], attributes={}, strip=True)
    except ImportError:
        # Regex scrub first, then escape residual HTML chars
        value = _XSS_RE.sub("", value)
        return html.escape(value, quote=True)


def sanitize_rich_text(text: str | None) -> str:
    """
    Allow a safe whitelist of HTML tags (suitable for community posts, chat).
    Strips any tag/attribute not in the whitelist.
    Falls back to full html.escape when bleach is not installed.
    """
    if text is None:
        return ""
    value = str(text)
    try:
        import bleach  # type: ignore[import]

        return bleach.clean(value, tags=_SAFE_TAGS, attributes=_SAFE_ATTRS, strip=True)
    except ImportError:
        logger.warning(
            "bleach not installed – falling back to html.escape for rich-text sanitisation. "
            "Run: pip install bleach"
        )
        return html.escape(value, quote=True)


def contains_xss(text: str | None) -> bool:
    """
    Return True if *text* contains an obvious XSS payload.
    Use this to **reject** input outright rather than sanitise it.
    """
    if not text:
        return False
    return bool(_XSS_RE.search(str(text)))


# ---------------------------------------------------------------------------
# xss_reject decorator
# ---------------------------------------------------------------------------


def xss_reject(f):
    """
    Route decorator: scan every JSON body / form field for XSS payloads
    and return HTTP 400 before the view function runs.

    Apply to sensitive write endpoints:
        @bp.route("/comment", methods=["POST"])
        @login_required
        @xss_reject
        def add_comment(): ...
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        data: dict = {}
        if request.is_json:
            try:
                data = request.get_json(silent=True) or {}
            except Exception:
                pass
        elif request.form:
            data = request.form.to_dict(flat=False)
            # Flatten multi-value fields to their first value for scanning
            data = {k: v[0] if isinstance(v, list) else v for k, v in data.items()}

        for field, value in data.items():
            if isinstance(value, str) and contains_xss(value):
                logger.warning(
                    "XSS payload blocked | field=%s | ip=%s | path=%s",
                    field,
                    request.remote_addr,
                    request.path,
                )
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": f"Unsafe content detected in field '{field}'.",
                            "code": "XSS_BLOCKED",
                        }
                    ),
                    400,
                )
        return f(*args, **kwargs)

    return decorated


# ---------------------------------------------------------------------------
# Security-header constants
# ---------------------------------------------------------------------------

# API responses contain JSON only – no resources needed.
_CSP_API = (
    "default-src 'none'; "
    "frame-ancestors 'none';"
)

# Upload / static file serving – allow images inline, block everything else.
_CSP_UPLOADS = (
    "default-src 'none'; "
    "img-src 'self' data: blob:; "
    "media-src 'self'; "
    "frame-ancestors 'none';"
)

# Restrictive Permissions-Policy: opt out of every powerful browser feature.
_PERMISSIONS_POLICY = (
    "accelerometer=(), "
    "ambient-light-sensor=(), "
    "autoplay=(), "
    "battery=(), "
    "camera=(), "
    "display-capture=(), "
    "document-domain=(), "
    "encrypted-media=(), "
    "fullscreen=(self), "
    "geolocation=(), "
    "gyroscope=(), "
    "magnetometer=(), "
    "microphone=(), "
    "midi=(), "
    "payment=(), "
    "picture-in-picture=(), "
    "publickey-credentials-get=(), "
    "screen-wake-lock=(), "
    "sync-xhr=(), "
    "usb=(), "
    "web-share=(), "
    "xr-spatial-tracking=()"
)

# ---------------------------------------------------------------------------
# apply_security_headers  (register as app.after_request)
# ---------------------------------------------------------------------------


def apply_security_headers(response):
    """
    Attach OWASP-recommended security headers to every Flask response.
    Register once in create_app():
        app.after_request(apply_security_headers)

    Headers applied
    ---------------
    Universal (all paths)
        X-Content-Type-Options   – prevent MIME-type sniffing
        X-Frame-Options          – block framing / clickjacking
        X-XSS-Protection         – legacy browser XSS filter
        Referrer-Policy          – limit referrer leakage
        Permissions-Policy       – opt-out of browser features
        Strict-Transport-Security – enforce HTTPS (only over TLS)

    API paths  (/api/*)
        Content-Security-Policy  – default-src 'none' (JSON only)
        Cache-Control            – no-store (prevent caching tokens/PII)

    Upload paths  (/uploads/*, /static/uploads/*)
        Content-Security-Policy  – allow images, block scripts
        Cache-Control            – private short-lived cache

    Fingerprint suppression
        Server / X-Powered-By headers are removed.
    """
    path = request.path

    # ------------------------------------------------------------------
    # 1. Universal headers
    # ------------------------------------------------------------------
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = _PERMISSIONS_POLICY

    # HSTS – only meaningful over HTTPS; include it so staging/prod benefit immediately.
    # For local HTTP development this header is ignored by browsers.
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains; preload"
    )

    # Suppress framework fingerprinting
    response.headers.remove("X-Powered-By")
    response.headers.remove("Server")

    # ------------------------------------------------------------------
    # 2. API JSON endpoints – strict CSP + no caching
    # ------------------------------------------------------------------
    if path.startswith("/api/"):
        response.headers.setdefault("Content-Security-Policy", _CSP_API)
        # Never cache API responses (may contain auth tokens / PII)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    # ------------------------------------------------------------------
    # 3. Upload / static file serving
    # ------------------------------------------------------------------
    elif path.startswith(("/uploads/", "/static/uploads/")):
        response.headers.setdefault("Content-Security-Policy", _CSP_UPLOADS)
        # Short-lived private cache; do not share across users (CDN)
        response.headers.setdefault(
            "Cache-Control", "private, max-age=3600, no-transform"
        )

    # ------------------------------------------------------------------
    # 4. Everything else (health check, root, etc.)
    # ------------------------------------------------------------------
    else:
        response.headers.setdefault("Content-Security-Policy", _CSP_API)

    return response
