from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required
import hashlib

bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@bp.route("", methods=["GET"])
@project_app_required
def get_profile():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    user_type = getattr(g, "user_type", "employee")
    if user_type == "vendor":
        cur.execute(
            "SELECT id, full_name, email, phone_number, role AS user_role, profile_picture, status, vendor_id AS Company_id, empid FROM vendor_employee WHERE id = %s",
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

            if len(locations) == 1:
                d["address"] = locations[0]
            elif len(locations) > 1:
                d["address"] = "\n".join([f"{i + 1}. {loc}" for i, loc in enumerate(locations)])
        except Exception:
            # Keep response compatible even if onboarding DB isn't reachable
            pass
    return jsonify(d)


@bp.route("", methods=["PUT", "PATCH"])
@project_app_required
def update_profile():
    data = request.get_json() or request.form
    conn = get_db()
    cur = conn.cursor()
    user_type = getattr(g, "user_type", "employee")
    
    if user_type == "vendor":
        allowed = ("full_name", "phone_number", "email", "profile_picture")
    else:
        allowed = ("full_name", "phone_number", "email", "dob", "doj", "address", "department", "profile_picture")
        
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(data[key])
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
        
    if user_type == "vendor":
        params.extend([g.user_id])
        cur.execute("UPDATE vendor_employee SET " + ", ".join(sets) + " WHERE id = %s", params)
    else:
        params.extend([g.user_id, g.company_id])
        cur.execute("UPDATE employee SET " + ", ".join(sets) + " WHERE id = %s AND Company_id = %s", params)
        
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Not found"}), 404


@bp.route("/change-password", methods=["POST"])
@project_app_required
def change_password():
    data = request.get_json() or request.form
    current = data.get("current_password")
    new_password = data.get("new_password")
    if not current or not new_password:
        return jsonify({"success": False, "message": "current_password and new_password required"}), 400
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    user_type = getattr(g, "user_type", "employee")
    table = "vendor_employee" if user_type == "vendor" else "employee"
    
    cur.execute(f"SELECT password FROM {table} WHERE id = %s", (g.user_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "User not found"}), 404
    if hashlib.md5(current.encode()).hexdigest() != (row.get("password") or ""):
        return jsonify({"success": False, "message": "Current password is incorrect"}), 401
    hashed = hashlib.md5(new_password.encode()).hexdigest()
    cur.execute(f"UPDATE {table} SET password = %s WHERE id = %s", (hashed, g.user_id))
    return jsonify({"success": True, "message": "Password updated"})
