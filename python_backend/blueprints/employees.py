import hashlib
import os
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from db import get_db
from auth_middleware import project_app_required
from utils import mailer

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

    user_type = getattr(g, "user_type", "employee")

    if user_type == "vendor":
        cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), "dictionary") else conn.cursor()

        # Prefer selecting a real profile_picture column if it exists on vendor_employee.
        # Fallback to the previous behaviour (NULL AS profile_picture) if the column
        # is missing so older databases keep working.
        try:
            cur.execute(
                """
                SELECT
                    id,
                    empid,
                    full_name,
                    email,
                    phone_number,
                    'vendor' AS user_type,
                    role AS user_role,
                    profile_picture,
                    NULL AS address,
                    NULL AS doj,
                    NULL AS dob,
                    'Vendor' AS department,
                    status AS active,
                    'Vendor' AS Allpannel,
                    NULL AS salary,
                    NULL AS accountnumber
                FROM vendor_employee
                WHERE vendor_id = %s
                ORDER BY full_name
                """,
                (g.company_id,),
            )
        except Exception:
            # Older schema without profile_picture column on vendor_employee.
            cur.execute(
                """
                SELECT
                    id,
                    empid,
                    full_name,
                    email,
                    phone_number,
                    'vendor' AS user_type,
                    role AS user_role,
                    NULL AS profile_picture,
                    NULL AS address,
                    NULL AS doj,
                    NULL AS dob,
                    'Vendor' AS department,
                    status AS active,
                    'Vendor' AS Allpannel,
                    NULL AS salary,
                    NULL AS accountnumber
                FROM vendor_employee
                WHERE vendor_id = %s
                ORDER BY full_name
                """,
                (g.company_id,),
            )

        rows = cur.fetchall()
        employees = [dict(r) for r in rows]
        return jsonify({"employees": employees})

    cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), 'dictionary') else conn.cursor()
    # Join with department table so we can return the department NAME
    # while still storing the numeric id in employee.department.
    cur.execute(
        """
        SELECT
            e.id,
            e.full_name,
            e.empid,
            e.email,
            e.phone_number,
            e.user_type,
            e.user_role,
            e.profile_picture,
            e.address,
            e.doj,
            e.dob,
            COALESCE(d.name, e.department) AS department,
            e.active,
            e.status,
            e.Allpannel,
            e.salary,
            e.accountnumber
        FROM employee e
        LEFT JOIN department d ON d.id = e.department
        WHERE e.Company_id = %s
        ORDER BY e.full_name
        """,
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


@bp.route("/by-role", methods=["GET"])
@project_app_required
def employees_by_role():
    """
    Return active employees filtered by a specific user_role.

    Query params:
    - role: exact value of employee.user_role (e.g. "BIM Lead")
    """
    role = request.args.get("role")
    if not role:
        return jsonify({"success": False, "message": "role is required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, full_name, user_role, email, profile_picture
        FROM employee
        WHERE Company_id = %s
          AND active = 'active'
          AND user_role = %s
        ORDER BY full_name
        """,
        (g.company_id, role),
    )
    rows = cur.fetchall()
    employees = [dict(r) for r in rows]
    return jsonify({"success": True, "employees": employees})


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
    # Optional numeric/financial fields
    salary = data.get("salary")
    accountnumber = data.get("accountnumber")
    active = data.get("active") or "active"  # Default to 'active' if not provided
    roles = data.get("role") or data.get("roles") or []
    if isinstance(roles, str):
        roles = [roles]
    Allpannel = ",".join(roles) if roles else ""

    # Optional profile picture upload
    profile_path = None
    file = request.files.get("profile_picture")
    if file and file.filename:
        # Save into UPLOAD_FOLDER/employee and store just filename
        upload_root = current_app.config.get("UPLOAD_FOLDER")
        if upload_root:
            os.makedirs(upload_root, exist_ok=True)
            employee_dir = os.path.join(upload_root, "employee")
            os.makedirs(employee_dir, exist_ok=True)
            filename = secure_filename(file.filename)
            # If filename already exists, add timestamp to make it unique
            save_path = os.path.join(employee_dir, filename)
            if os.path.exists(save_path):
                name, ext = os.path.splitext(filename)
                from datetime import datetime
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{name}_{timestamp}{ext}"
                save_path = os.path.join(employee_dir, filename)
            file.save(save_path)
            # Store just the filename (frontend will add employee/ prefix)
            profile_path = filename

    if not full_name or not email or not password:
        return jsonify({"success": False, "message": "full_name, email, password required"}), 400
    # Vendor logic
    user_type_env = getattr(g, "user_type", "employee")
    if user_type_env == "vendor":
        conn = get_db()
        cur = conn.cursor()
        # check duplicate
        cur.execute("SELECT id FROM vendor_employee WHERE email = %s AND vendor_id = %s LIMIT 1", (email, g.company_id))
        if cur.fetchone():
            return jsonify({"success": False, "message": "Email already exists"}), 400
        
        hashed = hashlib.md5(password.encode()).hexdigest()
        try:
            cur.execute(
                "INSERT INTO vendor_employee (vendor_id, empid, full_name, email, password, phone_number, role, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (g.company_id, empid, full_name, email, hashed, phone_number, user_role, active)
            )
            emp_id = cur.lastrowid
            
            # Send welcome email
            mailer.send_welcome_email(email, full_name, user_role, password)
            
            return jsonify({"success": True, "id": emp_id, "profile_picture": None})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 400

    # Internal employee fallback

    # Check for duplicate email within the same company
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM employee WHERE email = %s AND Company_id = %s LIMIT 1",
        (email, g.company_id),
    )
    if cur.fetchone():
        return jsonify({"success": False, "message": "Email already exists"}), 400

    restricted = _restricted_roles_for_current_user()
    if user_role in restricted:
        return jsonify({"success": False, "message": "You are not allowed to assign the role '%s'." % user_role}), 403

    hashed = hashlib.md5(password.encode()).hexdigest()

    # If department is a name (not numeric), map it to the corresponding id
    if department and not str(department).isdigit():
        try:
            cur.execute("SELECT id FROM department WHERE name = %s LIMIT 1", (department,))
            row = cur.fetchone()
            if row and row.get("id") is not None:
                department = row["id"]
        except Exception:
            # If lookup fails, keep original value so existing behavior is unchanged
            pass
    try:
        cur.execute(
            """INSERT INTO employee (full_name, empid, phone_number, email, dob, password, doj, user_type, user_role, address, Company_id, department, Allpannel, profile_picture, salary, accountnumber, active)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                full_name,
                empid,
                phone_number,
                email,
                dob,
                hashed,
                doj,
                user_type,
                user_role,
                address,
                g.company_id,
                department,
                Allpannel,
                profile_path,
                salary,
                accountnumber,
                active,
            ),
        )
        emp_id = cur.lastrowid
        
        # Send welcome email
        mailer.send_welcome_email(email, full_name, user_role, password)
        
        return jsonify({"success": True, "id": emp_id, "profile_picture": profile_path})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@bp.route("/<int:emp_id>", methods=["GET"])
@project_app_required
def get_employee(emp_id):
    conn = get_db()
    cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), 'dictionary') else conn.cursor()
    
    user_type = getattr(g, "user_type", "employee")
    if user_type == "vendor":
        cur.execute(
            "SELECT id, empid, full_name, email, phone_number, 'vendor' AS user_type, role AS user_role, NULL AS profile_picture, NULL AS address, NULL AS doj, NULL AS dob, 'Vendor' AS department, status AS active, 'Vendor' AS Allpannel, NULL AS salary, NULL AS accountnumber FROM vendor_employee WHERE id = %s AND vendor_id = %s",
            (emp_id, g.company_id)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Employee not found"}), 404
        return jsonify(dict(row))
    
    # Internal employee fallback
    # Join department to return department NAME instead of numeric id
    cur.execute(
        """
        SELECT
            e.*,
            COALESCE(d.name, e.department) AS department
        FROM employee e
        LEFT JOIN department d ON d.id = e.department
        WHERE e.id = %s AND e.Company_id = %s
        """,
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
    # Accept both JSON and form/multipart without raising 415
    if request.is_json:
        data = request.get_json() or {}
    else:
        data = request.form
    new_role = data.get("user_role") or data.get("userRole")
    if new_role is not None:
        restricted = _restricted_roles_for_current_user()
        if new_role in restricted:
            return jsonify({"success": False, "message": "You are not allowed to assign the role '%s'." % new_role}), 403
    roles = data.get("role") or data.get("roles")
    # Frontend may send panel access as:
    # - roles: list[str]
    # - roles: "A,B,C" (comma-separated string in form-data)
    # - Allpannel: "A,B,C" (legacy)
    if isinstance(roles, list):
        Allpannel = ",".join([str(r).strip() for r in roles if str(r).strip()])
    elif isinstance(roles, str) and roles.strip():
        Allpannel = roles.strip()
    else:
        Allpannel = data.get("Allpannel")
    
    # Handle profile picture upload if provided
    profile_path = None
    file = request.files.get("profile_picture")
    if file and file.filename:
        # Save into UPLOAD_FOLDER/employee and store just filename
        upload_root = current_app.config.get("UPLOAD_FOLDER")
        if upload_root:
            os.makedirs(upload_root, exist_ok=True)
            employee_dir = os.path.join(upload_root, "employee")
            os.makedirs(employee_dir, exist_ok=True)
            filename = secure_filename(file.filename)
            # If filename already exists, add timestamp to make it unique
            save_path = os.path.join(employee_dir, filename)
            if os.path.exists(save_path):
                name, ext = os.path.splitext(filename)
                from datetime import datetime
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{name}_{timestamp}{ext}"
                save_path = os.path.join(employee_dir, filename)
            file.save(save_path)
            # Store just the filename (frontend will add employee/ prefix)
            profile_path = filename
    
    conn = get_db()
    # Use dict cursor when available (better compatibility across connectors)
    cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), "dictionary") else conn.cursor()

    # Load current employee (for email + notifications, and for better "changed fields" messages)
    before = {}
    try:
        cur.execute(
            "SELECT id, full_name, email, phone_number, dob, doj, user_type, user_role, address, department, salary, accountnumber, active, profile_picture "
            "FROM employee WHERE id = %s AND Company_id = %s LIMIT 1",
            (emp_id, g.company_id),
        )
        row = cur.fetchone()
        before = dict(row) if row else {}
    except Exception:
        before = {}
    allowed = ("full_name", "phone_number", "email", "dob", "doj", "user_type", "user_role", "address", "department", "salary", "accountnumber", "active")
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            value = data[key]
            # If updating department with a name (not numeric), map to id
            if key == "department" and value and not str(value).isdigit():
                try:
                    cur.execute("SELECT id FROM department WHERE name = %s LIMIT 1", (value,))
                    row = cur.fetchone()
                    if row and row.get("id") is not None:
                        value = row["id"]
                except Exception:
                    pass
            sets.append(f"`{key}` = %s")
            params.append(value)

    # Password update (never returned back to frontend)
    password = data.get("password")
    if password is not None and str(password).strip():
        hashed = hashlib.md5(str(password).encode()).hexdigest()
        sets.append("`password` = %s")
        params.append(hashed)
    
    # Add profile_picture if uploaded
    if profile_path is not None:
        sets.append("`profile_picture` = %s")
        params.append(profile_path)
    elif "profile_picture" in data and data["profile_picture"] is not None:
        # Allow updating profile_picture path from JSON/form data
        sets.append("`profile_picture` = %s")
        params.append(data["profile_picture"])
    
    if Allpannel is not None:
        sets.append("Allpannel = %s")
        params.append(Allpannel)
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
    params.extend([emp_id, g.company_id])
    # Use a separate cursor for the UPDATE to avoid connector edge-cases with mixed fetch/update usage
    update_cur = conn.cursor()
    update_cur.execute("UPDATE employee SET " + ", ".join(sets) + " WHERE id = %s AND Company_id = %s", params)
    if update_cur.rowcount:
        # Send email + in-app notification (best-effort; never fail the update itself)
        try:
            employee_email = (before.get("email") or "").strip()
            employee_name = before.get("full_name") or ""

            def _clean_str(v):
                try:
                    return str(v).strip()
                except Exception:
                    return ""

            def _mask_sensitive(label):
                # Never include sensitive values in email
                if label in ("Password",):
                    return "Updated"
                return ""

            # Human-readable list of updated fields + new values (from request payload)
            label_map = {
                "full_name": "Full Name",
                "phone_number": "Phone Number",
                "email": "Email ID",
                "dob": "Date of Birth",
                "doj": "Date of Joining",
                "user_type": "Type",
                "user_role": "Role",
                "address": "Address",
                "department": "Department",
                "salary": "Salary",
                "accountnumber": "Account Number",
                "active": "Status",
                "profile_picture": "Profile Picture",
                "Allpannel": "Panel Access",
                "password": "Password",
            }

            def _norm_before(v):
                if v is None:
                    return ""
                if hasattr(v, "isoformat"):
                    try:
                        return v.isoformat()
                    except Exception:
                        pass
                return _clean_str(v)

            def _same(a, b):
                return _clean_str(a) == _clean_str(b)

            updated_items = []
            # Only include fields that truly changed (before vs new value from request).
            for k in allowed:
                if k not in data or data[k] is None:
                    continue
                lbl = label_map.get(k, k)
                new_val = _clean_str(data.get(k))
                old_val = _norm_before(before.get(k))

                # Normalize status comparisons
                if k == "active":
                    new_val = new_val.lower()
                    old_val = _clean_str(old_val).lower()

                if _same(new_val, old_val):
                    continue

                updated_items.append((lbl, new_val if new_val else "Updated"))
            if profile_path is not None or ("profile_picture" in data and data.get("profile_picture") is not None):
                # Only include if it changed
                old_pic = _norm_before(before.get("profile_picture"))
                new_pic = profile_path if profile_path is not None else _clean_str(data.get("profile_picture"))
                if not _same(new_pic, old_pic):
                    updated_items.append(("Profile Picture", "Updated"))
            if Allpannel is not None:
                panels = [p.strip() for p in str(Allpannel).split(",") if p.strip()]
                old_panels = [p.strip() for p in _norm_before(before.get("Allpannel")).split(",") if p.strip()]
                if set([p.lower() for p in panels]) != set([p.lower() for p in old_panels]):
                    updated_items.append(("Panel Access", ", ".join(panels) if panels else "Updated"))
            if password is not None and str(password).strip():
                # Always consider password a change if provided
                updated_items.append(("Password", _mask_sensitive("Password") or "Updated"))

            # Email
            if employee_email:
                mailer.send_employee_profile_updated_email(
                    employee_email,
                    employee_name,
                    updated_fields=updated_items,
                    updated_by_role=getattr(g, "user_role", "") or "Administrator",
                )

            # In-app notification (bell icon)
            try:
                title = "Profile updated"
                actor = getattr(g, "user_role", "") or "Administrator"
                msg = f"Your profile details were updated by {actor}."
                if updated_items:
                    only_labels = [x[0] for x in updated_items if isinstance(x, (tuple, list)) and x]
                    if only_labels:
                        msg += " Updated: " + ", ".join(only_labels[:8]) + ("..." if len(only_labels) > 8 else "")

                ncur = conn.cursor()
                ncur.execute(
                    """
                    INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                    """,
                    (emp_id, None, title, msg, "profile_update", "employee", emp_id, g.company_id),
                )
            except Exception:
                pass
        except Exception as e:
            current_app.logger.warning(f"Employee update notification/email failed: {e}")

        return jsonify({"success": True, "profile_picture": profile_path} if profile_path else {"success": True})
    return jsonify({"success": False, "message": "Employee not found"}), 404


@bp.route("/<int:emp_id>/status", methods=["PATCH", "POST"])
@project_app_required
def update_status(emp_id):
    data = request.get_json() or request.form
    active = data.get("active")  # 'active' or 'inactive'
    user_type = getattr(g, "user_type", "employee")
    conn = get_db()
    cur = conn.cursor()
    
    if user_type == "vendor":
        cur.execute(
            "UPDATE vendor_employee SET status = %s WHERE id = %s AND vendor_id = %s",
            (active or "inactive", emp_id, g.company_id),
        )
        if cur.rowcount:
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "Employee not found"}), 404

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

    sent_count = 0
    conn = get_db()
    cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), 'dictionary') else conn.cursor()
    
    for email in emails:
        # Try to find if user exists to get their name, otherwise fallback to "Employee" or similar
        cur.execute("SELECT full_name FROM employee WHERE email = %s AND Company_id = %s LIMIT 1", (email, g.company_id))
        row = cur.fetchone()
        name_placeholder = row["full_name"] if row and row.get("full_name") else email
        
        invitation_link = "https://projectmanagement.swifterz.ae/login"
        if mailer.send_invitation_email(email, name_placeholder, invitation_link):
            sent_count += 1

    return jsonify({
        "success": True,
        "message": f"Welcome email sent to {sent_count} recipients" if sent_count > 0 else "Invitations queued (email not configured)",
        "count": len(emails),
        "invite_message": invite_message,
        "email_sent": sent_count > 0,
    })


@bp.route("/bulk-status", methods=["POST"])
@project_app_required
def bulk_status():
    data = request.get_json() or request.form
    ids = data.get("ids") or data.get("id") or []
    action = (data.get("action") or "inactive").strip().lower()  # active | inactive
    if isinstance(ids, (int, str)):
        ids = [ids]
    if not ids:
        return jsonify({"success": False, "message": "ids required"}), 400
    if action not in ("active", "inactive"):
        return jsonify({"success": False, "message": "action must be 'active' or 'inactive'"}), 400
    user_type = getattr(g, "user_type", "employee")
    placeholders = ",".join(["%s"] * len(ids))
    
    if user_type == "vendor":
        conn = get_db()
        cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), "dictionary") else conn.cursor()

        # Fetch recipients first (best-effort; don't fail status update if this query fails)
        recipients = []
        try:
            cur.execute(
                f"SELECT id, full_name, email FROM vendor_employee WHERE id IN ({placeholders}) AND vendor_id = %s",
                list(ids) + [g.company_id],
            )
            rows = cur.fetchall()
            if rows and isinstance(rows[0], dict):
                recipients = [dict(r) for r in rows]
            else:
                cols = [d[0] for d in (cur.description or [])]
                recipients = [dict(zip(cols, r)) for r in (rows or [])]
        except Exception as e:
            current_app.logger.warning(f"Could not fetch vendor_employee recipients for status email: {e}")

        # Update status
        update_cur = conn.cursor()
        update_cur.execute(
            f"UPDATE vendor_employee SET status = %s WHERE id IN ({placeholders}) AND vendor_id = %s",
            [action] + list(ids) + [g.company_id],
        )
        updated = update_cur.rowcount

        # Send emails (best-effort)
        emailed = 0
        for r in recipients:
            email = (r.get("email") or "").strip()
            if not email:
                continue
            if mailer.send_employee_status_email(email, r.get("full_name") or "", action):
                emailed += 1
        return jsonify({"success": True, "updated": updated, "email_sent": emailed})

    # Internal employee update
    conn = get_db()
    cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), "dictionary") else conn.cursor()

    recipients = []
    try:
        cur.execute(
            f"SELECT id, full_name, email FROM employee WHERE id IN ({placeholders}) AND Company_id = %s",
            list(ids) + [g.company_id],
        )
        rows = cur.fetchall()
        if rows and isinstance(rows[0], dict):
            recipients = [dict(r) for r in rows]
        else:
            cols = [d[0] for d in (cur.description or [])]
            recipients = [dict(zip(cols, r)) for r in (rows or [])]
    except Exception as e:
        current_app.logger.warning(f"Could not fetch employee recipients for status email: {e}")

    update_cur = conn.cursor()
    update_cur.execute(
        f"UPDATE employee SET active = %s WHERE id IN ({placeholders}) AND Company_id = %s",
        [action] + list(ids) + [g.company_id],
    )
    updated = update_cur.rowcount

    emailed = 0
    for r in recipients:
        email = (r.get("email") or "").strip()
        if not email:
            continue
        if mailer.send_employee_status_email(email, r.get("full_name") or "", action):
            emailed += 1

    return jsonify({"success": True, "updated": updated, "email_sent": emailed})


@bp.route("/members", methods=["GET"])
@project_app_required
def list_members():
    leader_id = request.args.get("leaderId")
    user_type = getattr(g, "user_type", "employee")
    conn = get_db()
    cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), 'dictionary') else conn.cursor()
    
    if user_type == "vendor":
        cur.execute(
            "SELECT id, full_name, email, role AS user_role, NULL AS profile_picture FROM vendor_employee WHERE vendor_id = %s AND status = 'active' ORDER BY full_name",
            (g.company_id,),
        )
    else:
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
    user_type = getattr(g, "user_type", "employee")
    conn = get_db()
    cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), 'dictionary') else conn.cursor()
    
    if user_type == "vendor":
        cur.execute(
            "SELECT id, full_name, role AS user_role FROM vendor_employee WHERE vendor_id = %s AND status = 'active' ORDER BY full_name",
            (g.company_id,),
        )
    else:
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
