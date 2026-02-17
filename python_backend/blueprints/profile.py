from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required
import hashlib

bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@bp.route("", methods=["GET"])
@project_app_required
def get_profile():
    conn = get_db()
    cur = conn.cursor()
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
    return jsonify(d)


@bp.route("", methods=["PUT", "PATCH"])
@project_app_required
def update_profile():
    data = request.get_json() or request.form
    conn = get_db()
    cur = conn.cursor()
    allowed = ("full_name", "phone_number", "email", "dob", "doj", "address", "department", "profile_picture")
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(data[key])
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
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
    cur = conn.cursor()
    cur.execute("SELECT password FROM employee WHERE id = %s", (g.user_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "User not found"}), 404
    if hashlib.md5(current.encode()).hexdigest() != (row.get("password") or ""):
        return jsonify({"success": False, "message": "Current password is incorrect"}), 401
    hashed = hashlib.md5(new_password.encode()).hexdigest()
    cur.execute("UPDATE employee SET password = %s WHERE id = %s", (hashed, g.user_id))
    return jsonify({"success": True, "message": "Password updated"})
