import hashlib
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("employees", __name__, url_prefix="/api/employees")

# Role hierarchy: who can assign which roles (matches PHP employees.php)
def _restricted_roles_for_current_user():
    role = getattr(g, "user_role", "") or ""
    if role == "Technical Director":
        return []
    if role == "Project Manager":
        return ["CEO", "CTO", "Technical Director", "BIM Lead"]
    if role == "BIM Lead":
        return ["CEO", "CTO", "Technical Director", "Project Manager"]
    if role == "BIM Coordinator":
        return ["CEO", "CTO", "Technical Director", "Project Manager", "BIM Lead"]
    return []


@bp.route("", methods=["GET"])
@project_app_required
def list_employees():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, full_name, empid, email, phone_number, user_type, user_role, profile_picture, address, doj, dob, department, active, status, Allpannel FROM employee WHERE Company_id = %s ORDER BY full_name",
        (g.company_id,),
    )
    rows = cur.fetchall()
    employees = []
    for r in rows:
        d = dict(r)
        for k in ["doj", "dob"]:
            if d.get(k) and hasattr(d[k], "isoformat"):
                d[k] = d[k].isoformat()
        employees.append(d)
    return jsonify({"employees": employees})


@bp.route("", methods=["POST"])
@project_app_required
def create_employee():
    data = request.get_json() or request.form
    full_name = data.get("full_name") or data.get("fullName")
    email = data.get("email")
    password = data.get("password")
    phone_number = data.get("phone_number") or data.get("phoneNumber") or ""
    dob = data.get("dob")
    doj = data.get("doj")
    user_type = data.get("user_type") or data.get("userType") or "Employee"
    user_role = data.get("user_role") or data.get("userRole") or "Consultant"
    address = data.get("address") or ""
    department = data.get("department") or data.get("userdpt") or ""
    empid = data.get("empid") or ""
    roles = data.get("role") or data.get("roles") or []
    if isinstance(roles, str):
        roles = [roles]
    Allpannel = ",".join(roles) if roles else ""

    if not full_name or not email or not password:
        return jsonify({"success": False, "message": "full_name, email, password required"}), 400

    restricted = _restricted_roles_for_current_user()
    if user_role in restricted:
        return jsonify({"success": False, "message": "You are not allowed to assign the role '%s'." % user_role}), 403

    hashed = hashlib.md5(password.encode()).hexdigest()
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO employee (full_name, empid, phone_number, email, dob, password, doj, user_type, user_role, address, Company_id, department, Allpannel)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (full_name, empid, phone_number, email, dob, hashed, doj, user_type, user_role, address, g.company_id, department, Allpannel),
        )
        emp_id = cur.lastrowid
        return jsonify({"success": True, "id": emp_id})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@bp.route("/<int:emp_id>", methods=["GET"])
@project_app_required
def get_employee(emp_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM employee WHERE id = %s AND Company_id = %s",
        (emp_id, g.company_id),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Employee not found"}), 404
    d = dict(row)
    for k in ("dob", "doj"):
        if d.get(k) and hasattr(d[k], "isoformat"):
            d[k] = d[k].isoformat()
    if d.get("Allpannel"):
        d["roles"] = [x.strip() for x in d["Allpannel"].split(",") if x.strip()]
    return jsonify(d)


@bp.route("/<int:emp_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_employee(emp_id):
    data = request.get_json() or request.form
    new_role = data.get("user_role") or data.get("userRole")
    if new_role is not None:
        restricted = _restricted_roles_for_current_user()
        if new_role in restricted:
            return jsonify({"success": False, "message": "You are not allowed to assign the role '%s'." % new_role}), 403
    roles = data.get("role") or data.get("roles")
    if isinstance(roles, list):
        Allpannel = ",".join(roles)
    else:
        Allpannel = data.get("Allpannel")
    conn = get_db()
    cur = conn.cursor()
    allowed = ("full_name", "phone_number", "email", "dob", "doj", "user_type", "user_role", "address", "department", "salary", "accountnumber", "profile_picture")
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(data[key])
    if Allpannel is not None:
        sets.append("Allpannel = %s")
        params.append(Allpannel)
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
    params.extend([emp_id, g.company_id])
    cur.execute("UPDATE employee SET " + ", ".join(sets) + " WHERE id = %s AND Company_id = %s", params)
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Employee not found"}), 404


@bp.route("/<int:emp_id>/status", methods=["PATCH", "POST"])
@project_app_required
def update_status(emp_id):
    data = request.get_json() or request.form
    active = data.get("active")  # 'active' or 'inactive'
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE employee SET active = %s WHERE id = %s AND Company_id = %s",
        (active or "inactive", emp_id, g.company_id),
    )
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Employee not found"}), 404


@bp.route("/invite", methods=["POST"])
@project_app_required
def invite():
    data = request.get_json() or request.form
    emails_raw = data.get("emails") or data.get("email") or ""
    message = data.get("invite_message") or data.get("invite_message") or ""
    emails = [e.strip() for e in emails_raw.replace(",", " ").split() if e.strip()]
    if not emails:
        return jsonify({"success": False, "message": "emails required"}), 400
    # TODO: Send invitation emails (Flask-Mail). For now just return success.
    return jsonify({"success": True, "message": "Invitations sent", "count": len(emails)})


@bp.route("/bulk-status", methods=["POST"])
@project_app_required
def bulk_status():
    data = request.get_json() or request.form
    ids = data.get("ids") or data.get("id") or []
    action = data.get("action") or "inactive"  # active | inactive
    if isinstance(ids, (int, str)):
        ids = [ids]
    if not ids:
        return jsonify({"success": False, "message": "ids required"}), 400
    conn = get_db()
    cur = conn.cursor()
    placeholders = ",".join(["%s"] * len(ids))
    cur.execute(
        f"UPDATE employee SET active = %s WHERE id IN ({placeholders}) AND Company_id = %s",
        [action] + list(ids) + [g.company_id],
    )
    return jsonify({"success": True, "updated": cur.rowcount})


@bp.route("/members", methods=["GET"])
@project_app_required
def list_members():
    leader_id = request.args.get("leaderId")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, full_name, email, user_role, profile_picture FROM employee WHERE Company_id = %s AND active = 'active' ORDER BY full_name",
        (g.company_id,),
    )
    rows = cur.fetchall()
    members = [dict(r) for r in rows]
    return jsonify({"members": members})


@bp.route("/availability", methods=["GET"])
@project_app_required
def availability():
    # Placeholder: return active employees for assignee dropdown
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, full_name, user_role FROM employee WHERE Company_id = %s AND active = 'active' ORDER BY full_name",
        (g.company_id,),
    )
    rows = cur.fetchall()
    return jsonify({"employees": [dict(r) for r in rows]})
