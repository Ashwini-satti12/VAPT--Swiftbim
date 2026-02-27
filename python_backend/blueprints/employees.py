import hashlib
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
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
    # Accept both JSON and form/multipart requests without noisy warnings
    if request.is_json:
        data = request.get_json() or {}
    else:
        data = request.form
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

    # Optional profile picture upload
    profile_path = None
    file = request.files.get("profile_picture")
    if file and file.filename:
        # Save into UPLOAD_FOLDER/profiles and store relative path
        upload_root = current_app.config.get("UPLOAD_FOLDER")
        if upload_root:
            os.makedirs(upload_root, exist_ok=True)
            profiles_dir = os.path.join(upload_root, "profiles")
            os.makedirs(profiles_dir, exist_ok=True)
            filename = secure_filename(file.filename)
            save_path = os.path.join(profiles_dir, filename)
            file.save(save_path)
            # Store path relative to UPLOAD_FOLDER so frontend can build URL
            profile_path = os.path.join("profiles", filename).replace("\\", "/")

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
            """INSERT INTO employee (full_name, empid, phone_number, email, dob, password, doj, user_type, user_role, address, Company_id, department, Allpannel, profile_picture)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (full_name, empid, phone_number, email, dob, hashed, doj, user_type, user_role, address, g.company_id, department, Allpannel, profile_path),
        )
        emp_id = cur.lastrowid
        return jsonify({"success": True, "id": emp_id, "profile_picture": profile_path})
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

    # Accept list of emails (from frontend) or comma/space-separated string
    emails_raw = data.get("emails") or data.get("email") or ""
    if isinstance(emails_raw, (list, tuple)):
        emails = [str(e).strip() for e in emails_raw if str(e).strip()]
    else:
        emails = [e.strip() for e in str(emails_raw).replace(",", " ").split() if e.strip()]

    invite_message = (data.get("invite_message") or data.get("message") or "").strip()

    if not emails:
        return jsonify({"success": False, "message": "emails required"}), 400

    # Build email content
    subject = "Welcome to SwiftBIM"
    body_lines = []
    if invite_message:
        body_lines.append(invite_message)
        body_lines.append("")
    body_lines.append("You have been invited to join SwiftBIM as a consultant.")
    body_lines.append("Please contact your administrator for login details.")
    body = "\n".join(body_lines)

    # SMTP settings from config
    mail_server = current_app.config.get("MAIL_SERVER") or ""
    mail_port = int(current_app.config.get("MAIL_PORT") or 587)
    mail_use_tls = bool(current_app.config.get("MAIL_USE_TLS"))
    mail_username = current_app.config.get("MAIL_USERNAME") or ""
    mail_password = current_app.config.get("MAIL_PASSWORD") or ""
    sender = current_app.config.get("MAIL_DEFAULT_SENDER") or mail_username

    email_sent = False
    if mail_server and sender:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = ", ".join(emails)

        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(mail_server, mail_port, timeout=10) as server:
                if mail_use_tls:
                    server.starttls(context=context)
                if mail_username and mail_password:
                    server.login(mail_username, mail_password)
                server.sendmail(sender, emails, msg.as_string())
            email_sent = True
        except Exception:
            email_sent = False

    return jsonify({
        "success": True,
        "message": "Welcome email sent" if email_sent else "Invitations queued (email not configured)",
        "count": len(emails),
        "invite_message": invite_message,
        "email_sent": email_sent,
    })


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


@bp.route("/roles", methods=["GET"])
@project_app_required
def list_roles():
    """Return all role names from the `roles` table (name column)."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT name FROM roles ORDER BY name")
    rows = cur.fetchall()
    names = [r.get("name") for r in rows if r.get("name")]
    return jsonify({"roles": names})
