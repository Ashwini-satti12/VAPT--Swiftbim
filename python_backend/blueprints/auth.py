import hashlib
import time
from werkzeug.security import generate_password_hash, check_password_hash
import random
import jwt
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g, make_response
from db import get_db, query_one
from auth_middleware import login_required, client_required, get_token, decode_token_status
from config import Config
from blueprints.employees import _validate_password_strength

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

LOGIN_LOCK_MAX_ATTEMPTS = 7
LOGIN_LOCK_DURATION = timedelta(minutes=15)
LOGIN_LOCK_MESSAGE = "Too many attempts. Please try again after 15 minutes."


def _create_access_token(*, user_id, company_id, email, user_type):
    """Issue a JWT access token (same pattern as project APIs — Bearer + exp)."""
    now = int(time.time())
    expires_in = Config.JWT_ACCESS_TOKEN_EXPIRES
    payload = {
        "user_id": user_id,
        "company_id": company_id,
        "email": email,
        "user_type": user_type,
        "iat": now,
        "exp": now + expires_in,
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")
    if hasattr(token, "decode"):
        token = token.decode("utf-8")
    expires_at = datetime.utcfromtimestamp(payload["exp"]).isoformat() + "Z"
    return token, expires_in, expires_at


def _create_refresh_token(*, user_id, company_id, email, user_type):
    """Longer-lived refresh token (stored in cookie for browser session persistence)."""
    now = int(time.time())
    expires_in = Config.JWT_REFRESH_TOKEN_EXPIRES
    payload = {
        "user_id": user_id,
        "company_id": company_id,
        "email": email,
        "user_type": user_type,
        "iat": now,
        "exp": now + expires_in,
        "typ": "refresh",
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")
    if hasattr(token, "decode"):
        token = token.decode("utf-8")
    expires_at = datetime.utcfromtimestamp(payload["exp"]).isoformat() + "Z"
    return token, expires_in, expires_at


def _set_auth_cookies(resp, *, access_token: str, refresh_token: str | None = None):
    """Set cookies so tokens show in DevTools → Application → Cookies."""
    secure = bool(getattr(Config, "AUTH_COOKIE_SECURE", False))
    samesite = str(getattr(Config, "AUTH_COOKIE_SAMESITE", "Lax") or "Lax")

    resp.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )
    # Back-compat cookie key used by older middleware paths.
    resp.set_cookie(
        "token",
        access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )

    if refresh_token:
        resp.set_cookie(
            "refresh_token",
            refresh_token,
            httponly=True,
            secure=secure,
            samesite=samesite,
            path="/",
        )


def _clear_auth_cookies(resp):
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")
    resp.delete_cookie("token", path="/")
    return resp


def md5_hash(text):
    return hashlib.md5(text.encode()).hexdigest()


def _is_account_active(row, user_type: str) -> bool:
    """employee.active vs vendor_employee.status both mean 'can log in'."""
    if user_type == "vendor":
        status = str(row.get("status") or row.get("active") or "").lower()
    else:
        status = str(row.get("active") or row.get("status") or "").lower()
    return status in ("active", "1", "online")


OTP_EXPIRES_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
# In-process resend throttle (per email); fine for single-app-server deployments.
_otp_last_sent_at: dict[str, datetime] = {}


def _generate_otp() -> str:
    return f"{random.randint(0, 9999):04d}"


def _ensure_vendor_otp_column(cur) -> None:
    cur.execute("SHOW COLUMNS FROM vendor_employee LIKE 'OTP'")
    if not cur.fetchone():
        cur.execute("ALTER TABLE vendor_employee ADD COLUMN OTP VARCHAR(255) DEFAULT NULL")


def _lookup_reset_account(cur, email: str):
    """Return (user_type, row) for employee or vendor_employee, else None."""
    cur.execute(
        "SELECT id, full_name, profile_picture, email FROM employee WHERE email = %s LIMIT 1",
        (email,),
    )
    row = cur.fetchone()
    if row:
        return "employee", row

    cur.execute(
        "SELECT id, full_name, profile_picture, email FROM vendor_employee WHERE email = %s LIMIT 1",
        (email,),
    )
    row = cur.fetchone()
    if row:
        return "vendor", row
    return None, None


def _store_otp(cur, email: str, user_type: str, otp: str) -> None:
    if user_type == "employee":
        cur.execute("UPDATE employee SET OTP = %s WHERE email = %s", (otp, email))
    else:
        _ensure_vendor_otp_column(cur)
        cur.execute("UPDATE vendor_employee SET OTP = %s WHERE email = %s", (otp, email))


def _otp_is_expired(email: str) -> bool:
    sent = _otp_last_sent_at.get((email or "").lower())
    if not sent:
        return False
    return (datetime.now() - sent).total_seconds() > OTP_EXPIRES_MINUTES * 60


def _verify_stored_otp(cur, email: str, otp: str):
    """Return (user_type, user_id) if OTP matches, else (None, None)."""
    if _otp_is_expired(email):
        return None, None
    cur.execute(
        "SELECT id FROM employee WHERE email = %s AND OTP = %s LIMIT 1",
        (email, otp),
    )
    row = cur.fetchone()
    if row:
        return "employee", row["id"]

    cur.execute("SHOW COLUMNS FROM vendor_employee LIKE 'OTP'")
    if cur.fetchone():
        cur.execute(
            "SELECT id FROM vendor_employee WHERE email = %s AND OTP = %s LIMIT 1",
            (email, otp),
        )
        row = cur.fetchone()
        if row:
            return "vendor", row["id"]
    return None, None


def _clear_otp(cur, email: str, user_type: str) -> None:
    if user_type == "employee":
        cur.execute("UPDATE employee SET OTP = NULL WHERE email = %s", (email,))
    else:
        cur.execute("UPDATE vendor_employee SET OTP = NULL WHERE email = %s", (email,))


def _issue_and_email_reset_otp(email: str, *, is_resend: bool = False):
    from utils.mailer import send_password_reset_otp_email

    email = (email or "").strip()
    if not email:
        return None, (jsonify({"success": False, "message": "Email is required"}), 400)

    now = datetime.now()
    last_sent = _otp_last_sent_at.get(email.lower())
    if last_sent:
        elapsed = (now - last_sent).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            wait = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
            return None, (
                jsonify({
                    "success": False,
                    "message": f"Please wait {wait} seconds before requesting another code.",
                    "retry_after_seconds": wait,
                }),
                429,
            )

    conn = get_db()
    with conn.cursor() as cur:
        user_type, row = _lookup_reset_account(cur, email)

    if not row:
        return None, (
            jsonify({"success": False, "message": "No account found with this email address."}),
            404,
        )

    otp = _generate_otp()
    with conn.cursor() as cur:
        _store_otp(cur, email, user_type, otp)
        conn.commit()

    sent = send_password_reset_otp_email(
        email,
        row.get("full_name"),
        otp,
        expires_minutes=OTP_EXPIRES_MINUTES,
    )
    if not sent:
        return None, (
            jsonify({
                "success": False,
                "message": "Unable to send verification email. Please contact support or try again later.",
            }),
            503,
        )

    _otp_last_sent_at[email.lower()] = now
    msg = (
        "A new verification code has been sent to your email."
        if is_resend
        else "OTP sent successfully!"
    )
    return {
        "success": True,
        "message": msg,
        "email": email,
        "full_name": row.get("full_name"),
        "profile_path": row.get("profile_picture"),
    }, None


def _login_json_response(*, token, expires_in, expires_at, user):
    """Login payload + Authorization response header (visible in Network tab)."""
    body = {
        "success": True,
        "message": "Login successful",
        "token": token,
        "token_type": "Bearer",
        "expires_in": expires_in,
        "expires_at": expires_at,
        "user": user,
    }
    resp = make_response(jsonify(body))
    g.auth_token = token
    resp.headers["Authorization"] = f"Bearer {token}"
    # Also set cookies so tokens appear in DevTools Application → Cookies.
    refresh_token, _r_exp_in, _r_exp_at = _create_refresh_token(
        user_id=user["id"],
        company_id=user.get("company_id") or 0,
        email=user["email"],
        user_type=user.get("user_type") or "employee",
    )
    _set_auth_cookies(resp, access_token=token, refresh_token=refresh_token)
    return resp


def _session_confirm_from_bearer(*, allowed_user_types):
    """
  When POST /login is called with Authorization: Bearer <jwt> and no credentials in body,
  confirm the session (same Bearer pattern as project APIs).
    """
    data = request.get_json(silent=True) or {}
    email_in_body = (data.get("email") or "").strip()
    password_in_body = data.get("password")
    if email_in_body or (password_in_body is not None and str(password_in_body).strip()):
        return None

    raw_token = get_token()
    if not raw_token:
        return None

    payload, err = decode_token_status(raw_token)
    if not payload or err or payload.get("reset"):
        return None

    user_type = payload.get("user_type") or "employee"
    if user_type not in allowed_user_types:
        return None

    user_id = payload.get("user_id")
    email = (payload.get("email") or "").strip()
    company_id = payload.get("company_id") or 0
    if not user_id or not email:
        return None

    conn = get_db()
    row = None
    if user_type == "vendor":
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id, full_name, profile_picture, role AS user_role FROM vendor_employee WHERE id = %s",
                (user_id,),
            )
            row = cur.fetchone()
    elif user_type == "client":
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id, fullName AS full_name, email FROM clientinformation WHERE id = %s",
                (user_id,),
            )
            row = cur.fetchone()
    else:
        with conn.cursor(dictionary=True) as cur:
            if company_id:
                cur.execute(
                    "SELECT id, full_name, profile_picture, user_role FROM employee WHERE id = %s AND Company_id = %s",
                    (user_id, company_id),
                )
            else:
                cur.execute(
                    "SELECT id, full_name, profile_picture, user_role FROM employee WHERE id = %s",
                    (user_id,),
                )
            row = cur.fetchone()

    if not row:
        return None

    token, expires_in, expires_at = _create_access_token(
        user_id=user_id,
        company_id=company_id,
        email=email,
        user_type=user_type,
    )
    user = {
        "id": user_id,
        "full_name": row.get("full_name") or "",
        "email": email,
        "company_id": company_id,
        "profile_picture": row.get("profile_picture"),
        "user_role": row.get("user_role"),
        "user_type": user_type,
    }
    return _login_json_response(
        token=token,
        expires_in=expires_in,
        expires_at=expires_at,
        user=user,
    )


@bp.route("/login", methods=["POST"])
def login():
    confirmed = _session_confirm_from_bearer(allowed_user_types=("employee", "vendor"))
    if confirmed is not None:
        return confirmed

    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400

    def check_password(stored, attempt):
        if not stored:
            return False
        if stored.startswith("scrypt:") or stored.startswith("pbkdf2:"):
            return check_password_hash(stored, attempt)
        return md5_hash(attempt) == stored

    conn = get_db()
    target_row = None
    user_type = None
    
    # Pre-check locking
    with conn.cursor(dictionary=True) as cur:
        cur.execute("SELECT account_locked_until FROM employee WHERE email = %s", (email,))
        lock_row = cur.fetchone()
        if not lock_row:
            cur.execute("SELECT account_locked_until FROM vendor_employee WHERE email = %s", (email,))
            lock_row = cur.fetchone()
        
        if lock_row and lock_row.get("account_locked_until"):
            if lock_row["account_locked_until"] > datetime.now():
                return jsonify({"success": False, "message": LOGIN_LOCK_MESSAGE}), 429
    
    # 1. Try Employee table
    with conn.cursor(dictionary=True) as cur:
        cur.execute("SELECT * FROM employee WHERE email = %s", (email,))
        for row in cur.fetchall():
            if check_password(row.get("password") or "", password):
                user_type = "employee"
                target_row = row
                break

    # 2. Try Vendor table if no match yet
    if not target_row:
        with conn.cursor(dictionary=True) as cur:
            cur.execute("SELECT * FROM vendor_employee WHERE email = %s", (email,))
            for row in cur.fetchall():
                if check_password(row.get("password") or "", password):
                    user_type = "vendor"
                    target_row = row
                    break

    if not target_row:
        # If neither matches the password, check if email exists to return proper message
        with conn.cursor(dictionary=True) as cur:
            cur.execute("SELECT id, failed_login_attempts FROM employee WHERE email = %s", (email,))
            e_match = cur.fetchone()
            if e_match:
                table = "employee"
                match = e_match
            else:
                cur.execute("SELECT id, failed_login_attempts FROM vendor_employee WHERE email = %s", (email,))
                v_match = cur.fetchone()
                if v_match:
                    table = "vendor_employee"
                    match = v_match
                else:
                    table = None
                    match = None
            
            if not match:
                return jsonify({"success": False, "message": "The email ID is not available."}), 401
            else:
                fails = (match.get("failed_login_attempts") or 0) + 1
                if fails >= LOGIN_LOCK_MAX_ATTEMPTS:
                    lock_time = datetime.now() + LOGIN_LOCK_DURATION
                    cur.execute(f"UPDATE {table} SET failed_login_attempts = %s, account_locked_until = %s WHERE email = %s", (fails, lock_time, email))
                    conn.commit()
                    return jsonify({"success": False, "message": LOGIN_LOCK_MESSAGE}), 429
                else:
                    cur.execute(f"UPDATE {table} SET failed_login_attempts = %s WHERE email = %s", (fails, email))
                    conn.commit()
                    return jsonify({"success": False, "message": "Incorrect email or password. Please try again."}), 401

    row = target_row


    user_id = row["id"]
    full_name = row.get("full_name") or ""
    
    if user_type == "vendor":
        company_id = row.get("vendor_id") or 0
    else:
        company_id = row.get("Company_id") or 0
        
    if not _is_account_active(row, user_type):
        return jsonify({
            "success": False,
            "message": "Account is inactive."
        }), 403

    # Keep vendor phone_number synced from vendor_onboarding.contact_mobile (new_swiftbim)
    if user_type == "vendor":
        try:
            with conn.cursor(dictionary=True) as cur:
                cur.execute(
                    "SELECT contact_mobile FROM new_swiftbim.vendor_onboarding WHERE id = %s LIMIT 1",
                    (company_id,),
                )
                vo = cur.fetchone() or {}
                onboarding_phone = (vo.get("contact_mobile") or "").strip()
                current_phone = (row.get("phone_number") or "").strip()
                if onboarding_phone and onboarding_phone != current_phone:
                    cur.execute(
                        "UPDATE snh6_swiftproject.vendor_employee SET phone_number = %s WHERE id = %s",
                        (onboarding_phone, user_id),
                    )
                    conn.commit()
                    # Keep response consistent for any downstream use
                    row["phone_number"] = onboarding_phone
        except Exception:
            pass

    # Update status to Online and clear lock
    table_to_update = "vendor_employee" if user_type == "vendor" else "employee"
    with conn.cursor() as cur:
        cur.execute(f"UPDATE {table_to_update} SET status = 'Online', failed_login_attempts = 0, account_locked_until = NULL WHERE email = %s", (email,))

        # Track device
        ip_addr = request.remote_addr or ""
        device_info = request.user_agent.string or ""
        
        cur.execute("SELECT id FROM user_devices WHERE email = %s AND user_type = %s AND ip_address = %s AND device_info = %s", (email, user_type, ip_addr, device_info))
        if not cur.fetchone():
            cur.execute("INSERT INTO user_devices (email, user_type, ip_address, device_info) VALUES (%s, %s, %s, %s)", (email, user_type, ip_addr, device_info))
            try:
                from utils.mailer import send_new_device_alert
                send_new_device_alert(email, full_name, ip_addr, device_info, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            except Exception:
                pass
        else:
            cur.execute("UPDATE user_devices SET last_login = %s WHERE email = %s AND user_type = %s AND ip_address = %s AND device_info = %s", (datetime.now(), email, user_type, ip_addr, device_info))
        conn.commit()

    # Record attendance if not exists (date format d-m-Y as in PHP)
    today = datetime.now().strftime("%d-%m-%Y")
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM attendance WHERE employee_id = %s AND date = %s",
            (email, today),
        )
        if cur.fetchone() is None:
            time_in = datetime.now().strftime("%H:%M:%S")
            cur.execute(
                "INSERT INTO attendance (employee_id, date, time_in, status, send, Company_id) VALUES (%s, %s, %s, '1', 0, %s)",
                (email, today, time_in, company_id),
            )

    token, expires_in, expires_at = _create_access_token(
        user_id=user_id,
        company_id=company_id,
        email=email,
        user_type=user_type,
    )

    return _login_json_response(
        token=token,
        expires_in=expires_in,
        expires_at=expires_at,
        user={
            "id": user_id,
            "full_name": full_name,
            "email": email,
            "company_id": company_id,
            "profile_picture": row.get("profile_picture"),
            "user_role": row.get("user_role") or row.get("role"),
            "user_type": user_type,
        },
    )


@bp.route("/client-login", methods=["POST"])
def client_login():
    """Login for clients (clientinformation table). Returns JWT with user_type=client."""
    confirmed = _session_confirm_from_bearer(allowed_user_types=("client",))
    if confirmed is not None:
        return confirmed

    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400

    conn = get_db()
    with conn.cursor(dictionary=True) as cur:
        cur.execute("SELECT id, fullName, email, password, Company_id, account_locked_until, failed_login_attempts FROM clientinformation WHERE email = %s", (email,))
        row = cur.fetchone()

    if not row:
        return jsonify({"success": False, "message": "The email ID is not available."}), 401

    if row.get("account_locked_until") and row["account_locked_until"] > datetime.now():
        return jsonify({"success": False, "message": LOGIN_LOCK_MESSAGE}), 429

    stored_password = (row.get("password") or "").strip()
    if not stored_password or (password != stored_password and md5_hash(password) != stored_password):
        fails = (row.get("failed_login_attempts") or 0) + 1
        with conn.cursor() as cur:
            if fails >= LOGIN_LOCK_MAX_ATTEMPTS:
                lock_time = datetime.now() + LOGIN_LOCK_DURATION
                cur.execute("UPDATE clientinformation SET failed_login_attempts = %s, account_locked_until = %s WHERE email = %s", (fails, lock_time, email))
                conn.commit()
                return jsonify({"success": False, "message": LOGIN_LOCK_MESSAGE}), 429
            else:
                cur.execute("UPDATE clientinformation SET failed_login_attempts = %s WHERE email = %s", (fails, email))
                conn.commit()
                return jsonify({"success": False, "message": "Incorrect email or password. Please try again."}), 401

    user_id = row["id"]
    full_name = row.get("fullName") or ""
    company_id = row.get("Company_id") or 0

    token, expires_in, expires_at = _create_access_token(
        user_id=user_id,
        company_id=company_id,
        email=email,
        user_type="client",
    )

    return _login_json_response(
        token=token,
        expires_in=expires_in,
        expires_at=expires_at,
        user={
            "id": user_id,
            "full_name": full_name,
            "email": email,
            "company_id": company_id,
            "user_type": "client",
        },
    )


@bp.route("/logout", methods=["POST"])
@login_required
def logout():
    conn = get_db()
    user_type = getattr(g, "user_type", "employee")
    table = "vendor_employee" if user_type == "vendor" else "employee"
    with conn.cursor(dictionary=True) as cur:
        # Vendor employee uses 'status' (active/inactive), but maybe offline is not stored similarly. 
        # But we will update the relevant table if we track 'Offline' there.
        # Actually, vendor_employee status tracks 'active' vs 'inactive', so changing it to 'Offline' 
        # might break their login completely since it's used for active check!
        # employee uses 'active' for active/inactive, and 'status' for Online/Offline.
        if user_type in ["employee", "vendor"]:
            cur.execute(f"UPDATE {table} SET status = 'Offline' WHERE id = %s", (g.user_id,))
            try:
                conn.commit()
            except Exception:
                pass

        # Attendance: when employee logs out, set time_out and compute total hours for today.
        # (Vendor employees are in vendor_employee table and their 'status' column is used for active/inactive,
        # so we avoid touching attendance for them here unless explicitly required later.)
        if user_type == "employee":
            try:
                # attendance.employee_id stores email in this schema; use JWT email directly
                email = (getattr(g, "user_email", "") or "").strip()
                if email:
                    today = datetime.now().strftime("%d-%m-%Y")
                    now_time = datetime.now().strftime("%H:%M:%S")

                    def _pick_time(raw):
                        s = str(raw or "").strip()
                        if not s:
                            return ""
                        # "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS" -> HH:MM:SS
                        if " " in s:
                            s = s.split(" ")[-1]
                        if "T" in s:
                            s = s.split("T")[-1]
                        return s

                    # Find the latest attendance row for today (prefer matching Company_id, but fall back if needed)
                    cur.execute(
                        "SELECT id, time_in FROM attendance WHERE employee_id = %s AND date = %s AND Company_id = %s ORDER BY id DESC LIMIT 1",
                        (email, today, g.company_id),
                    )
                    arow = cur.fetchone() or {}
                    att_id = arow.get("id")
                    time_in = _pick_time(arow.get("time_in"))
                    if not att_id:
                        cur.execute(
                            "SELECT id, time_in FROM attendance WHERE employee_id = %s AND date = %s ORDER BY id DESC LIMIT 1",
                            (email, today),
                        )
                        arow = cur.fetchone() or {}
                        att_id = arow.get("id")
                        time_in = _pick_time(arow.get("time_in"))

                    total_hms = None
                    total_decimal = None
                    if time_in:
                        try:
                            t_in = datetime.strptime(time_in, "%H:%M:%S")
                            t_out = datetime.strptime(now_time, "%H:%M:%S")
                            sec = int((t_out - t_in).total_seconds())
                            if sec < 0:
                                sec = 0
                            h = sec // 3600
                            m = (sec % 3600) // 60
                            s = sec % 60
                            total_hms = f"{h:02d}:{m:02d}:{s:02d}"
                            total_decimal = round(sec / 3600.0, 2)
                        except Exception:
                            total_hms = None
                            total_decimal = None

                    if att_id:
                        # Update row even if Company_id mismatch (some legacy rows may not match token company_id)
                        # Uses existing field names only (no schema changes).
                        cur.execute(
                            "UPDATE attendance SET time_out = %s, num_hr = %s WHERE id = %s",
                            (now_time, total_decimal, att_id),
                        )
                        try:
                            conn.commit()
                        except Exception:
                            pass
            except Exception:
                # Don't block logout on attendance update problems
                pass
    resp = make_response(jsonify({"success": True, "message": "Logged out"}))
    return _clear_auth_cookies(resp)


@bp.route("/client-logout", methods=["POST"])
@client_required
def client_logout():
    """Client portal logout — requires Bearer JWT (same as project APIs)."""
    resp = make_response(jsonify({"success": True, "message": "Logged out"}))
    return _clear_auth_cookies(resp)


@bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    payload, err = _issue_and_email_reset_otp(email, is_resend=False)
    if err:
        return err
    return jsonify(payload)


@bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    payload, err = _issue_and_email_reset_otp(email, is_resend=True)
    if err:
        return err
    return jsonify(payload)


@bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    otp = (data.get("otp") or "").strip()
    if not email or not otp:
        return jsonify({"success": False, "message": "Email and OTP are required"}), 400
    if not otp.isdigit() or len(otp) != 4:
        return jsonify({"success": False, "message": "Please enter the 4-digit verification code."}), 400

    conn = get_db()
    with conn.cursor() as cur:
        user_type, user_id = _verify_stored_otp(cur, email, otp)

    if not user_id:
        if _otp_is_expired(email):
            return jsonify({
                "success": False,
                "message": f"Verification code expired. Codes are valid for {OTP_EXPIRES_MINUTES} minutes. Please request a new code.",
            }), 401
        return jsonify({"success": False, "message": "Invalid OTP. Please try again."}), 401

    with conn.cursor() as cur:
        _clear_otp(cur, email, user_type)
        conn.commit()

    payload = {
        "user_id": user_id,
        "email": email,
        "user_type": user_type,
        "reset": True,
        "exp": datetime.utcnow() + timedelta(minutes=OTP_EXPIRES_MINUTES),
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")
    if hasattr(token, "decode"):
        token = token.decode("utf-8")
    return jsonify({"success": True, "message": "OTP verified", "reset_token": token})


@bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    reset_token = data.get("reset_token")
    password1 = data.get("password1") or data.get("password")
    password2 = data.get("password2") or data.get("confirm_password")

    if not reset_token or not password1 or not password2:
        return jsonify({"success": False, "message": "Reset token and both passwords are required"}), 400
    if password1 != password2:
        return jsonify({"success": False, "message": "Passwords do not match. Please try again."}), 400

    pwd_err = _validate_password_strength(password1)
    if pwd_err:
        return jsonify({"success": False, "message": pwd_err}), 400

    try:
        payload = jwt.decode(reset_token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return jsonify({"success": False, "message": "Reset link expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"success": False, "message": "Invalid reset token"}), 401

    if not payload.get("reset") or not payload.get("email"):
        return jsonify({"success": False, "message": "Invalid reset token"}), 401

    email = payload["email"]
    user_type = payload.get("user_type") or "employee"
    hist_user_type = "vendor" if user_type == "vendor" else "employee"
    password_table = "vendor_employee" if user_type == "vendor" else "employee"
    new_hashed = md5_hash(password1)
    conn = get_db()

    with conn.cursor(dictionary=True) as cur:
        cur.execute(f"SELECT password FROM {password_table} WHERE email = %s", (email,))
        emp_row = cur.fetchone() or {}
        current_stored = (emp_row.get("password") or "").strip()
        current_md5 = current_stored if not (current_stored.startswith("scrypt:") or current_stored.startswith("pbkdf2:")) else None

        cur.execute(
            "SELECT password_hash FROM password_history WHERE email = %s AND user_type = %s ORDER BY created_at DESC",
            (email, hist_user_type),
        )
        history = cur.fetchall()
        all_history_hashes = {h["password_hash"] for h in history}
        recent_blocked_hashes = {h["password_hash"] for h in history[:2]}

        if new_hashed in recent_blocked_hashes:
            return jsonify({"success": False, "message": "You cannot reuse a previous password."}), 400

        if current_stored.startswith("scrypt:") or current_stored.startswith("pbkdf2:"):
            from werkzeug.security import check_password_hash as _chk
            if _chk(current_stored, password1):
                return jsonify({"success": False, "message": "You cannot reuse a previous password."}), 400
        else:
            if new_hashed == current_md5:
                return jsonify({"success": False, "message": "You cannot reuse a previous password."}), 400

    with conn.cursor() as cur:
        if current_md5 and current_md5 not in all_history_hashes:
            cur.execute(
                "INSERT INTO password_history (email, user_type, password_hash) VALUES (%s, %s, %s)",
                (email, hist_user_type, current_md5),
            )
        # Keep employee + vendor_employee in sync when the same email exists in both tables.
        cur.execute("UPDATE employee SET password = %s WHERE email = %s", (new_hashed, email))
        cur.execute("UPDATE vendor_employee SET password = %s WHERE email = %s", (new_hashed, email))
        cur.execute(
            "INSERT INTO password_history (email, user_type, password_hash) VALUES (%s, %s, %s)",
            (email, hist_user_type, new_hashed),
        )
        conn.commit()
    return jsonify({"success": True, "message": "Password updated successfully. You can now log in with your new password."})


@bp.route("/me", methods=["GET"])
@login_required
def me():
    """Return current user info including panels and role (for frontend RBAC / menu visibility)."""
    from db import get_db
    conn = get_db()
    cur = conn.cursor()
    
    user_type = getattr(g, "user_type", "employee")
    if user_type == "vendor":
        # Vendor employees can also have profile pictures; fetch them from vendor_employee.
        cur.execute(
            "SELECT full_name, profile_picture FROM vendor_employee WHERE id = %s",
            (g.user_id,),
        )
    else:
        cur.execute(
            "SELECT full_name, profile_picture FROM employee WHERE id = %s",
            (g.user_id,),
        )
        
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "User not found"}), 404
    # Panel type: 1 = management (PM/CEO/BIM etc), 2 = team leader, 3 = employee
    user_role = (getattr(g, "user_role", None) or "").strip()
    management_roles = ("Project Manager", "CEO", "BIM Coordinator", "Technical Director", "BIM Lead", "Vendor PM", "Vendor Bim Lead")
    is_management = user_role in management_roles
    cur.execute(
        "SELECT team_id FROM team WHERE leader = %s AND Company_id = %s LIMIT 1",
        (g.user_id, g.company_id),
    )
    is_team_leader = cur.fetchone() is not None
    if is_management:
        panel_type = 1
    elif is_team_leader:
        panel_type = 2
    else:
        panel_type = 3
    return jsonify({
        "success": True,
        "user": {
            "id": g.user_id,
            "full_name": row.get("full_name"),
            "email": g.user_email,
            "user_role": user_role or None,
            "panels": getattr(g, "allpannel", []) or [],
            "profile_picture": row.get("profile_picture"),
            "company_id": g.company_id,
            "is_super_admin": getattr(g, "is_super_admin", False),
            "panel_type": panel_type,
            "user_type": user_type,
        },
    })


@bp.route("/admin/reset-password", methods=["POST"])
@login_required
def admin_reset_password():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    new_password = data.get("new_password")
    if not user_id or not new_password:
        return jsonify({"success": False, "message": "user_id and new_password required"}), 400

    pwd_err = _validate_password_strength(new_password)
    if pwd_err:
        return jsonify({"success": False, "message": pwd_err}), 400

    conn = get_db()
    hashed = md5_hash(new_password)
    
    with conn.cursor(dictionary=True) as cur:
        # Check password history
        cur.execute("SELECT email FROM employee WHERE id = %s AND Company_id = %s", (user_id, g.company_id))
        emp_row = cur.fetchone()
        if emp_row:
            email = emp_row["email"]
            cur.execute("SELECT password_hash FROM password_history WHERE email = %s AND user_type = 'employee' ORDER BY created_at DESC", (email,))
            history = cur.fetchall()
            for h in history[:2]:
                if h["password_hash"] == hashed:
                    return jsonify({"success": False, "message": "You cannot reuse a previous password for this user."}), 400
                    
    with conn.cursor() as cur:
        cur.execute("UPDATE employee SET password = %s WHERE id = %s AND Company_id = %s", (hashed, user_id, g.company_id))
        if emp_row:
            cur.execute("INSERT INTO password_history (email, user_type, password_hash) VALUES (%s, 'employee', %s)", (email, hashed))
        conn.commit()
    return jsonify({"success": True, "message": "Password reset successfully"})

@bp.route("/refresh", methods=["POST"])
def refresh():
    data = request.get_json() or {}
    refresh_token = data.get("refresh_token")

    if not refresh_token:
        return jsonify({"success": False, "message": "Refresh token missing"}), 400

    try:
        payload = jwt.decode(refresh_token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get("token_type") != "refresh":
            return jsonify({"success": False, "message": "Invalid token type"}), 401
            
        user_id = payload.get("user_id")
        company_id = payload.get("company_id")
        email = payload.get("email")
        user_type = payload.get("user_type")

        new_payload = {
            "user_id": user_id,
            "company_id": company_id,
            "email": email,
            "user_type": user_type,
            "exp": datetime.utcnow() + timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES),
        }
        new_token = jwt.encode(new_payload, Config.JWT_SECRET_KEY, algorithm="HS256")
        if hasattr(new_token, "decode"):
            new_token = new_token.decode("utf-8")
            
        return jsonify({
            "success": True,
            "token": new_token
        })
    except jwt.ExpiredSignatureError:
        return jsonify({"success": False, "message": "Refresh token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"success": False, "message": "Invalid refresh token"}), 401