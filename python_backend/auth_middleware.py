import jwt
from functools import wraps
from flask import request, g, jsonify
from config import Config


def get_token():
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth[7:]
    return request.cookies.get("token") or request.args.get("token")


def decode_token(token):
    """Return JWT payload dict, or None if missing/invalid/expired."""
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def decode_token_status(token):
    """Return (payload, error_code) where error_code is None, 'expired', or 'invalid'."""
    if not token:
        return None, "missing"
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"]), None
    except jwt.ExpiredSignatureError:
        return None, "expired"
    except jwt.InvalidTokenError:
        return None, "invalid"


def _unauthorized_message(token_error: str | None) -> str:
    if token_error == "expired":
        return "Session expired. Please log in again."
    if token_error == "missing":
        return "Unauthorized"
    return "Invalid or expired token"


def get_current_user():
    token = get_token()
    payload, _err = decode_token_status(token)
    if not payload:
        return None
    user_type = payload.get("user_type") or "employee"
    return payload.get("user_id"), payload.get("company_id"), payload.get("email"), user_type


def get_current_client():
    """Like get_current_user but returns (client_id, company_id, email) only when user_type is 'client'."""
    token = get_token()
    payload, _err = decode_token_status(token)
    if not payload:
        return None
    if payload.get("user_type") != "client":
        return None
    return payload.get("user_id"), payload.get("company_id"), payload.get("email")


def load_user_context():
    """Load user's Allpannel, user_role, and id into g. Call once per request for protected routes."""
    if getattr(g, "user_role_loaded", False):
        return
    from db import get_db
    conn = get_db()
    cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), 'dictionary') else conn.cursor()

    user_type = getattr(g, "user_type", "employee")
    if user_type == "vendor":
        cur.execute(
            "SELECT id, full_name, role AS user_role, 'Vendor' AS Allpannel, status AS active FROM vendor_employee WHERE id = %s",
            (g.user_id,),
        )
    else:
        cur.execute(
            "SELECT id, full_name, user_role, Allpannel, active FROM employee WHERE id = %s AND Company_id = %s",
            (g.user_id, g.company_id),
        )
    row = cur.fetchone()
    if not row:
        g.user_role = None
        g.allpannel = []
        g.is_super_admin = False
    else:
        g.user_role = (row.get("user_role") or "").strip()
        g.user_full_name = (row.get("full_name") or "").strip()
        raw = (row.get("Allpannel") or "").strip()
        g.allpannel = [p.strip() for p in raw.split(",") if p.strip()]
        g.is_super_admin = row.get("id") == 1
    g.user_role_loaded = True


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token()
        payload, token_err = decode_token_status(token)
        if not payload:
            return jsonify({
                "success": False,
                "message": _unauthorized_message(token_err),
                "code": "SESSION_EXPIRED" if token_err == "expired" else "UNAUTHORIZED",
            }), 401
        user_type = payload.get("user_type") or "employee"
        user = (
            payload.get("user_id"),
            payload.get("company_id"),
            payload.get("email"),
            user_type,
        )
        if not user[0]:
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        g.user_id, g.company_id, g.user_email, g.user_type = user
        if g.user_type == "client":
            return jsonify({"success": False, "message": "Use the client portal."}), 403
        load_user_context()
        return f(*args, **kwargs)
    return decorated


def client_required(f):
    """Require a valid JWT with user_type=client (from client login). Sets g.client_id, g.company_id, g.client_email."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token()
        payload, token_err = decode_token_status(token)
        if not payload or payload.get("user_type") != "client":
            return jsonify({
                "success": False,
                "message": _unauthorized_message(token_err),
                "code": "SESSION_EXPIRED" if token_err == "expired" else "UNAUTHORIZED",
            }), 401
        client = (
            payload.get("user_id"),
            payload.get("company_id"),
            payload.get("email"),
        )
        if not client[0]:
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        g.client_id, g.company_id, g.client_email = client
        return f(*args, **kwargs)
    return decorated


def optional_auth(f):
    """Attach user to g if token present, but do not require it."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if user:
            g.user_id, g.company_id, g.user_email, g.user_type = user
            if g.user_type != "client":
                load_user_context()
            else:
                g.client_id, g.company_id, g.client_email = g.user_id, g.company_id, g.user_email
        else:
            g.user_id = g.company_id = g.user_email = None
            g.user_role = g.allpannel = None
            g.is_super_admin = False
            g.user_role_loaded = True
        return f(*args, **kwargs)
    return decorated


def require_panels(*allowed_panels):
    """
    Require the user to have at least one of the given panels in Allpannel.
    Matches PHP: FIND_IN_SET('Employee', Allpannel) OR FIND_IN_SET('All', Allpannel).
    Use for project app: @require_panels('Employee', 'All').
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            load_user_context()
            if g.is_super_admin:
                return f(*args, **kwargs)
            panels = getattr(g, "allpannel", []) or []
            # Be tolerant to case differences in stored panel names.
            panels_norm = {str(p).strip().lower() for p in panels if str(p).strip()}
            if "all" in panels_norm:
                return f(*args, **kwargs)
            for p in allowed_panels:
                if str(p).strip().lower() in panels_norm:
                    return f(*args, **kwargs)
            return jsonify({
                "success": False,
                "message": "Access denied. You do not have access to this panel.",
            }), 403
        return decorated
    return decorator


def require_roles(*allowed_roles):
    """Require the user to have one of the given roles (user_role)."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            load_user_context()
            if g.is_super_admin:
                return f(*args, **kwargs)
            role = getattr(g, "user_role", "") or ""
            if role in allowed_roles:
                return f(*args, **kwargs)
            return jsonify({
                "success": False,
                "message": "Access denied. This action is not allowed for your role.",
            }), 403
        return decorated
    return decorator


def require_super_admin(f):
    """Require user id == 1 (super admin). Matches PHP: $_SESSION['id'] == 1."""
    @wraps(f)
    def decorated(*args, **kwargs):
        load_user_context()
        if g.is_super_admin:
            return f(*args, **kwargs)
        return jsonify({"success": False, "message": "Super admin access required."}), 403
    return decorated


def require_not_roles(*blocked_roles):
    """Require the user to NOT have any of the given roles (e.g. block BIM Lead from Clients)."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            load_user_context()
            if g.is_super_admin:
                return f(*args, **kwargs)
            role = getattr(g, "user_role", "") or ""
            if role in blocked_roles:
                return jsonify({
                    "success": False,
                    "message": "Access denied. This section is not available for your role.",
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# Combined decorator for project app: same as PHP – user must have Employee or All panel to use project APIs.
def project_app_required(f):
    """Login + require Employee or All panel (matches PHP project/index.php and sidebar Allpannel check)."""
    # Project APIs are used across multiple internal panels (management + employee).
    # Vendor users have Allpannel "Vendor" and need access to profile, dropdowns, etc. on vendor pages.
    return login_required(
        require_panels(
            "Employee",
            "All",
            "Management",
            "Accounts",
            "Technical Director",
            "Admin",
            "Project Manager",
            "Sales",
            "BIM Lead",
            "BIM Coordinator",
            "Vendor",
        )(f)
    )
