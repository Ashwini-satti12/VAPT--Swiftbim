from flask import Blueprint, request, jsonify, g, current_app
from db import get_db
from auth_middleware import login_required
from blueprints.employees import _validate_password_strength
from werkzeug.utils import secure_filename
from upload_resolver import secure_save_upload
from werkzeug.security import check_password_hash
import hashlib
import os
import json

bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@bp.route("", methods=["GET"])
@login_required
def get_profile():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    user_type = getattr(g, "user_type", "employee")
    if user_type == "vendor":
        cur.execute(
            "SELECT id, full_name, email, phone_number, role AS user_role, profile_picture, status, vendor_id AS Company_id, empid, address FROM vendor_employee WHERE id = %s",
            (g.user_id,)
        )
    else:
        cur.execute(
            "SELECT id, full_name, email, phone_number, dob, doj, user_type, user_role, profile_picture, address, department, empid FROM employee WHERE id = %s AND Company_id = %s",
            (g.user_id, g.company_id),
        )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "User not found"}), 404
    d = dict(row)
    d.pop("password", None)
    # Normalize legacy/invalid values so frontend doesn't request v={}
    pic = d.get("profile_picture")
    if pic is not None:
        s = str(pic).strip()
        if s in ("", "{}", "[]", "[object Object]", "null", "undefined"):
            d["profile_picture"] = None
    for k in ("dob", "doj"):
        if d.get(k) and hasattr(d[k], "isoformat"):
            d[k] = d[k].isoformat()

    # For vendor users, fetch and combine address(es) from new_swiftbim.vendor_onboarding
    if user_type == "vendor":
        try:
            vendor_company_id = d.get("Company_id")
            onboarding_cur = conn.cursor(dictionary=True)
            onboarding_cur.execute(
                "SELECT company_name FROM new_swiftbim.vendor_onboarding WHERE id = %s LIMIT 1",
                (vendor_company_id,),
            )
            base = onboarding_cur.fetchone() or {}
            company_name = (base.get("company_name") or "").strip()

            rows = []
            if company_name:
                onboarding_cur.execute(
                    """
                    SELECT *
                    FROM new_swiftbim.vendor_onboarding
                    WHERE company_name = %s
                    ORDER BY id
                    """,
                    (company_name,),
                )
                rows = onboarding_cur.fetchall() or []

            def _fmt_location(r: dict) -> str:
                parts = []
                for key in ("address", "city", "state", "country"):
                    v = (r.get(key) or "").strip()
                    if v:
                        parts.append(v)
                return ", ".join(parts).strip(", ").strip()

            locations = []
            for r in rows:
                s = _fmt_location(r)
                if s:
                    locations.append(s)

            # Only fall back to company address if employee-specific address is missing
            if not d.get("address"):
                if len(locations) == 1:
                    d["address"] = locations[0]
                elif len(locations) > 1:
                    d["address"] = "\n".join([f"{i + 1}. {loc}" for i, loc in enumerate(locations)])
        except Exception:
            # Keep response compatible even if onboarding DB isn't reachable
            pass
    return jsonify(d)


@bp.route("", methods=["PUT", "PATCH"])
@login_required
def update_profile():
    # Support both JSON and multipart/form-data
    if request.is_json:
        data = request.get_json() or {}
    else:
        data = request.form

    conn = get_db()
    user_type = getattr(g, "user_type", "employee")

    # Handle file upload for profile picture
    profile_path = None
    file = request.files.get("profile_picture")
    if file and file.filename:
        upload_root = current_app.config.get("UPLOAD_FOLDER")
        if upload_root:
            os.makedirs(upload_root, exist_ok=True)
            subdir = "vendor_employee" if user_type == "vendor" else "employee"
            upload_dir = os.path.join(upload_root, subdir)
            os.makedirs(upload_dir, exist_ok=True)
            filename = secure_filename(file.filename)
            name, ext = os.path.splitext(filename)
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{name}_{timestamp}{ext}"
            saved, upload_err = secure_save_upload(
                file,
                upload_dir,
                category="image",
                filename=filename,
                app_config=current_app.config,
            )
            if upload_err:
                return jsonify({"success": False, "message": upload_err}), 400
            profile_path = f"{subdir}/{os.path.basename(saved or filename)}"

    cur = conn.cursor(dictionary=True)

    def _to_db_value(value):
        """Convert nested JSON values (dict/list) into DB-safe scalars."""
        if value is None:
            return None
        if isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, dict):
            # Common UI select payloads: {value,label} or {id,name}
            for key in ("value", "id", "name", "label"):
                v = value.get(key)
                if v is not None and not isinstance(v, (dict, list)):
                    return v
            return json.dumps(value, ensure_ascii=False)
        if isinstance(value, list):
            # Prefer readable CSV for simple arrays, JSON otherwise
            if all(not isinstance(v, (dict, list)) for v in value):
                return ", ".join(str(v) for v in value)
            return json.dumps(value, ensure_ascii=False)
        return str(value)

    def _normalize_profile_picture_value(value):
        """Accept only a valid profile path/filename; reject '{}'/object-like junk."""
        v = _to_db_value(value)
        if v is None:
            return None
        s = str(v).strip()
        if not s:
            return None
        if s in ("{}", "[]", "[object Object]", "null", "undefined"):
            return None
        return s
    
    if user_type == "vendor":
        allowed = ("full_name", "phone_number", "email", "address", "role")
    else:
        allowed = ("full_name", "phone_number", "email", "dob", "doj", "address", "department", "user_role")

    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(_to_db_value(data[key]))

    # Navbar sends "role" for designation; employee table uses user_role.
    if user_type != "vendor" and data.get("role") is not None:
        sets.append("`user_role` = %s")
        params.append(_to_db_value(data.get("role")))
            
    # Add profile picture to update if uploaded
    if profile_path:
        sets.append("`profile_picture` = %s")
        params.append(profile_path)
    elif "profile_picture" in data and data["profile_picture"] is not None:
        # If passed as path in JSON, write only when valid.
        normalized_pic = _normalize_profile_picture_value(data["profile_picture"])
        if normalized_pic:
            sets.append("`profile_picture` = %s")
            params.append(normalized_pic)

    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
        
    try:
        if user_type == "vendor":
            params.extend([g.user_id])
            cur.execute("UPDATE vendor_employee SET " + ", ".join(sets) + " WHERE id = %s", params)
        else:
            params.extend([g.user_id, g.company_id])
            cur.execute(
                "UPDATE employee SET " + ", ".join(sets) + " WHERE id = %s AND Company_id = %s",
                params,
            )
        conn.commit()
    except Exception as exc:
        current_app.logger.exception("Profile update failed")
        return jsonify({"success": False, "message": str(exc)}), 500

    cur.execute(
        "SELECT profile_picture FROM vendor_employee WHERE id = %s"
        if user_type == "vendor"
        else "SELECT profile_picture FROM employee WHERE id = %s AND Company_id = %s",
        (g.user_id,) if user_type == "vendor" else (g.user_id, g.company_id),
    )
    pic_row = cur.fetchone() or {}
    saved_pic = pic_row.get("profile_picture") or profile_path
    return jsonify({"success": True, "profile_picture": saved_pic})


@bp.route("/change-password", methods=["POST"])
@login_required
def change_password():
    data = request.get_json() or request.form
    current = data.get("current_password")
    new_password = data.get("new_password")
    if not current or not new_password:
        return jsonify({"success": False, "message": "current_password and new_password required"}), 400

    pwd_err = _validate_password_strength(new_password)
    if pwd_err:
        return jsonify({"success": False, "message": pwd_err}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    user_type = getattr(g, "user_type", "employee")
    table = "vendor_employee" if user_type == "vendor" else "employee"
    hist_user_type = "vendor" if user_type == "vendor" else "employee"

    cur.execute(f"SELECT password FROM {table} WHERE id = %s", (g.user_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "User not found"}), 404

    stored = (row.get("password") or "").strip()
    # Verify current password (supports werkzeug hash, md5, and legacy plain-text)
    is_valid = False
    if stored.startswith("scrypt:") or stored.startswith("pbkdf2:"):
        is_valid = check_password_hash(stored, current)
    else:
        current_md5 = hashlib.md5(current.encode()).hexdigest()
        is_valid = (current_md5 == stored) or (current == stored)

    if not is_valid:
        return jsonify({"success": False, "message": "Current password is incorrect"}), 401

    # Store md5 hash for compatibility with legacy schema/data.
    # (Other auth paths already support md5 and this avoids column-length issues.)
    new_hashed = hashlib.md5(new_password.encode()).hexdigest()

    email = getattr(g, "user_email", None)

    # --- Password reuse prevention ---
    # Normalise stored hash to md5 for history comparison
    stored_md5 = stored if not (stored.startswith("scrypt:") or stored.startswith("pbkdf2:")) else None

    if email:
        # Load full history for this user
        cur.execute(
            "SELECT password_hash FROM password_history WHERE email = %s AND user_type = %s ORDER BY created_at DESC",
            (email, hist_user_type),
        )
        history = cur.fetchall()
        all_history_hashes = {h["password_hash"] for h in history}
        # Block only the 2 most recently used passwords; older ones (3rd+) may be reused.
        recent_blocked_hashes = {h["password_hash"] for h in history[:2]}

        if new_hashed in recent_blocked_hashes:
            return jsonify({"success": False, "message": "You cannot reuse a previous password."}), 400

        # Also check new password is not the same as current (covers werkzeug hashes too)
        if stored.startswith("scrypt:") or stored.startswith("pbkdf2:"):
            if check_password_hash(stored, new_password):
                return jsonify({"success": False, "message": "You cannot reuse a previous password."}), 400
        else:
            if new_hashed == stored_md5:
                return jsonify({"success": False, "message": "You cannot reuse a previous password."}), 400

        # Save current password to history (if not already recorded) to prevent X->Y->X cycling
        if stored_md5 and stored_md5 not in all_history_hashes:
            cur.execute(
                "INSERT INTO password_history (email, user_type, password_hash) VALUES (%s, %s, %s)",
                (email, hist_user_type, stored_md5),
            )

    # Apply the new password across all tables sharing the same email
    if email:
        cur.execute("UPDATE employee SET password = %s WHERE email = %s", (new_hashed, email))
        cur.execute("UPDATE vendor_employee SET password = %s WHERE email = %s", (new_hashed, email))
        # Record new password in history
        cur.execute(
            "INSERT INTO password_history (email, user_type, password_hash) VALUES (%s, %s, %s)",
            (email, hist_user_type, new_hashed),
        )
    else:
        # Fallback to ID-based update if email is somehow missing from context
        cur.execute(f"UPDATE {table} SET password = %s WHERE id = %s", (new_hashed, g.user_id))

    conn.commit()
    return jsonify({"success": True, "message": "Password updated successfully"})
