import hashlib
from werkzeug.security import generate_password_hash, check_password_hash
import random
import jwt
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from db import get_db, query_one
from auth_middleware import login_required
from config import Config

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def md5_hash(text):
    return hashlib.md5(text.encode()).hexdigest()


@bp.route("/login", methods=["POST"])
def login():
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
            cur.execute("SELECT id FROM employee WHERE email = %s", (email,))
            e_match = cur.fetchone()
            cur.execute("SELECT id FROM vendor_employee WHERE email = %s", (email,))
            v_match = cur.fetchone()
            
            if not e_match and not v_match:
                return jsonify({"success": False, "message": "The email ID is not available."}), 401
            else:
                return jsonify({"success": False, "message": "Incorrect email or password. Please try again."}), 401

    row = target_row


    user_id = row["id"]
    full_name = row.get("full_name") or ""
    
    if user_type == "vendor":
        company_id = row.get("vendor_id") or 0
    else:
        company_id = row.get("Company_id") or 0
        
    # vendor_employee uses 'status', employee uses 'active'
    active_status = str(row.get("active", row.get("status", ""))).lower()
    if active_status not in ["active", "1"]:
        return jsonify({"success": False, "message": "Account is inactive."}), 403

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

    # Update status to Online
    with conn.cursor() as cur:
        cur.execute("UPDATE employee SET status = 'Online' WHERE email = %s", (email,))

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

    # JWT token
    payload = {
        "user_id": user_id,
        "company_id": company_id,
        "email": email,
        "user_type": user_type,
        "exp": datetime.utcnow() + timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES),
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")
    if hasattr(token, "decode"):
        token = token.decode("utf-8")

    return jsonify({
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user_id,
            "full_name": full_name,
            "email": email,
            "company_id": company_id,
            # Surface profile_picture and basic role data so frontend has it immediately after login.
            "profile_picture": row.get("profile_picture"),
            "user_role": row.get("user_role") or row.get("role"),
            "user_type": user_type,
        },
    })


@bp.route("/client-login", methods=["POST"])
def client_login():
    """Login for clients (clientinformation table). Returns JWT with user_type=client."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400

    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, fullName, email, password, Company_id FROM clientinformation WHERE email = %s", (email,))
        row = cur.fetchone()

    if not row:
        return jsonify({"success": False, "message": "The email ID is not available."}), 401

    stored_password = (row.get("password") or "").strip()
    if not stored_password:
        return jsonify({"success": False, "message": "Incorrect email or password. Please try again."}), 401
    # Support both plain and MD5 (PHP sometimes stores plain)
    if password != stored_password and md5_hash(password) != stored_password:
        return jsonify({"success": False, "message": "Incorrect email or password. Please try again."}), 401

    user_id = row["id"]
    full_name = row.get("fullName") or ""
    company_id = row.get("Company_id") or 0

    payload = {
        "user_id": user_id,
        "company_id": company_id,
        "email": email,
        "user_type": "client",
        "exp": datetime.utcnow() + timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES),
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")
    if hasattr(token, "decode"):
        token = token.decode("utf-8")

    return jsonify({
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user_id,
            "full_name": full_name,
            "email": email,
            "company_id": company_id,
            "user_type": "client",
        },
    })


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
        if user_type == "employee":
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
    return jsonify({"success": True, "message": "Logged out"})


@bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, full_name, profile_picture, email FROM employee WHERE email = %s", (email,))
        row = cur.fetchone()

    if not row:
        return jsonify({"success": False, "message": "No employee found with this email address."}), 404

    otp = str(random.randint(1000, 99999))
    with conn.cursor() as cur:
        cur.execute("UPDATE employee SET OTP = %s WHERE email = %s", (otp, email))

    # TODO: Send email with OTP (Flask-Mail or similar). For now return OTP in dev only.
    return jsonify({
        "success": True,
        "message": "OTP sent successfully!",
        "email": email,
        "full_name": row.get("full_name"),
        "profile_path": row.get("profile_picture"),
        # "otp": otp,  # Only in development
    })


@bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    otp = (data.get("otp") or "").strip()
    if not email or not otp:
        return jsonify({"success": False, "message": "Email and OTP are required"}), 400

    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM employee WHERE email = %s AND OTP = %s", (email, otp))
        row = cur.fetchone()

    if not row:
        return jsonify({"success": False, "message": "Invalid OTP. Please try again."}), 401

    # Return a short-lived token to allow reset-password (or use same JWT with short expiry)
    payload = {
        "user_id": row["id"],
        "email": email,
        "reset": True,
        "exp": datetime.utcnow() + timedelta(minutes=15),
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

    try:
        payload = jwt.decode(reset_token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return jsonify({"success": False, "message": "Reset link expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"success": False, "message": "Invalid reset token"}), 401

    if not payload.get("reset") or not payload.get("email"):
        return jsonify({"success": False, "message": "Invalid reset token"}), 401

    email = payload["email"]
    hashed = md5_hash(password1)
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("UPDATE employee SET password = %s WHERE email = %s", (hashed, email))
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
    # Optional: check g.user_id is admin (e.g. id == 1 or role)
    conn = get_db()
    hashed = md5_hash(new_password)
    with conn.cursor() as cur:
        cur.execute("UPDATE employee SET password = %s WHERE id = %s AND Company_id = %s", (hashed, user_id, g.company_id))
    return jsonify({"success": True, "message": "Password reset successfully"})