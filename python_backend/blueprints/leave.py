# Leave: uses same DB as PHP – tblleaves, holiday (leave types from holiday table)
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required
from utils import mailer

bp = Blueprint("leave", __name__, url_prefix="/api/leave")


def _resolve_leave_type_id(cur, company_id: int, raw_leave_type):
    """
    Resolve incoming leave type payload to a valid holiday.id.
    Supports:
    - numeric id (existing holiday row)
    - title text (matches existing row by title, case-insensitive)
    - unknown title text (auto-creates holiday row, then returns new id)
    """
    if raw_leave_type is None:
        return None

    value = str(raw_leave_type).strip()
    if not value:
        return None

    # If frontend sent id directly
    if value.isdigit():
        leave_type_id = int(value)
        if leave_type_id > 0:
            cur.execute(
                "SELECT id FROM holiday WHERE id = %s AND Company_id = %s LIMIT 1",
                (leave_type_id, company_id),
            )
            row = cur.fetchone()
            if row:
                return int(row["id"])
        return None

    # Frontend sent title text; try existing type first
    cur.execute(
        "SELECT id FROM holiday WHERE Company_id = %s AND LOWER(title) = LOWER(%s) LIMIT 1",
        (company_id, value),
    )
    row = cur.fetchone()
    if row:
        return int(row["id"])

    # Create new leave type so tblleaves always stores a valid id
    cur.execute(
        """INSERT INTO holiday (title, leave_type, days_count, hours_per_duration, Company_id)
           VALUES (%s, %s, %s, %s, %s)""",
        (value, "1", 0, 0, company_id),
    )
    return int(cur.lastrowid)


@bp.route("/types", methods=["GET"])
@project_app_required
def list_leave_types():
    # PHP: leave types from holiday table (leave_type = '1' or '2', etc.)
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT id, title, leave_type, days_count, hours_per_duration, Company_id FROM holiday WHERE Company_id = %s ORDER BY title",
        (g.company_id,),
    )
    rows = cur.fetchall()
    types = [dict(r) for r in rows]
    # Also allow "Others" as in PHP
    return jsonify({"leave_types": types, "others_value": "Others"})


@bp.route("/applications", methods=["GET"])
@project_app_required
def list_applications():
    # PHP: tblleaves JOIN employee LEFT JOIN holiday; status 0=pending, 1=approved, 2=declined
    role_filter = request.args.get("role") or request.args.get("user_role")
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    sql = """SELECT tblleaves.id AS lid, tblleaves.empid, tblleaves.leave_type, tblleaves.posting_date, tblleaves.description,
                    tblleaves.status, tblleaves.from_date, tblleaves.to_date, tblleaves.starttime, tblleaves.endtime,
                    employee.full_name, employee.id AS employee_id, employee.user_role AS role,
                    CASE
                        WHEN holiday.id IS NOT NULL THEN holiday.title
                        WHEN tblleaves.leave_type IS NULL OR tblleaves.leave_type = '' OR tblleaves.leave_type = '0' THEN 'Others'
                        ELSE tblleaves.leave_type
                    END AS title,
                    CASE
                        WHEN holiday.id IS NOT NULL THEN holiday.title
                        WHEN tblleaves.leave_type IS NULL OR tblleaves.leave_type = '' OR tblleaves.leave_type = '0' THEN 'Others'
                        ELSE tblleaves.leave_type
                    END AS type_name
             FROM tblleaves
             JOIN employee ON tblleaves.empid = employee.id
             LEFT JOIN holiday ON tblleaves.leave_type = holiday.id
             WHERE tblleaves.Company_id = %s"""
    params = [g.company_id]
    if role_filter:
        sql += " AND TRIM(employee.user_role) = %s"
        params.append(role_filter.strip())
    sql += " ORDER BY tblleaves.id DESC"
    cur.execute(sql, tuple(params))
    rows = cur.fetchall()
    applications = []
    for r in rows:
        d = dict(r)
        for k in list(d.keys()):
            if hasattr(d.get(k), "isoformat"):
                d[k] = d[k].isoformat()
        applications.append(d)
    return jsonify({"applications": applications})


@bp.route("/applications", methods=["POST"])
@project_app_required
def apply_leave():
    # PHP: INSERT INTO tblleaves (empid, leave_type, description, Company_id, starttime, endtime, leave_lop) or (..., to_date, from_date, days_count, ...)
    data = request.get_json() or request.form
    leavetype_raw = data.get("leavetype") or data.get("leave_type") or data.get("leave_type_id")
    description = data.get("description") or ""
    fromdate = data.get("from_date") or data.get("fromdate")
    todate = data.get("to_date") or data.get("todate")
    starttime = data.get("starttime") or ""
    endtime = data.get("endtime") or ""
    days_count = data.get("days_count")
    leave_lop = data.get("leave_lop") or 0
    if not leavetype_raw:
        return jsonify({"success": False, "message": "leavetype required"}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
        leavetype = _resolve_leave_type_id(cur, g.company_id, leavetype_raw)
        if not leavetype:
            return jsonify({"success": False, "message": "Invalid leave type"}), 400
        if fromdate and todate:
            cur.execute(
                """INSERT INTO tblleaves (empid, leave_type, to_date, from_date, description, Company_id, days_count, leave_lop)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (g.user_id, leavetype, todate, fromdate, description, g.company_id, days_count or 0, leave_lop),
            )
        else:
            cur.execute(
                """INSERT INTO tblleaves (empid, leave_type, description, Company_id, starttime, endtime, leave_lop)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (g.user_id, leavetype, description, g.company_id, starttime, endtime, leave_lop),
            )
        leave_id = cur.lastrowid
        
        # Notify Technical Director if a BIM Lead applies for leave
        try:
            cur.execute("SELECT full_name, email FROM employee WHERE id = %s", (g.user_id,))
            user = cur.fetchone() or {}
            
            current_role = getattr(g, "user_role", "")
            if current_role == "BIM Lead":
                # Find active Technical Director(s) in the same company
                cur.execute(
                    "SELECT id FROM employee WHERE Company_id = %s AND user_role = 'Technical Director' AND active = 'active'", 
                    (g.company_id,)
                )
                tds = cur.fetchall()
                for td in tds:
                    td_id = td.get("id") or td[0]
                    title = "New Leave Application"
                    msg = f"{user.get('full_name', 'A BIM Lead')} has applied for leave."
                    cur.execute(
                        """
                        INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                        """,
                        (td_id, None, title, msg, "leave", "leave", leave_id, g.company_id),
                    )
        except Exception as e:
            # Silently log/ignore notification errors so leave application itself doesn't fail
            print(f"Leave notification error: {e}")
            pass

        # Leave Application Confirmation Email
        try:
            # We already fetched user above, reuse if possible
            type_name = "Leave"
            if str(leavetype).isdigit():
                cur.execute("SELECT title FROM holiday WHERE id = %s", (leavetype,))
                h_row = cur.fetchone() or {}
                type_name = h_row.get("title") or "Leave"
            
            if user.get("email"):
                mailer.send_leave_application_confirmation_email(user["full_name"], user["email"], type_name, fromdate or "N/A", todate or "N/A")
        except Exception:
            pass

        return jsonify({"success": True, "id": leave_id})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@bp.route("/applications/<int:app_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_leave(app_id: int):
    """
    Allow an employee to edit their own pending leave application.
    Only a subset of fields can be updated; status changes are handled
    separately by the approve/reject endpoints.
    """
    data = request.get_json() or request.form
    conn = get_db()
    cur = conn.cursor()

    # Map incoming keys to actual DB columns
    col_updates = {}
    leave_type_raw = None
    if "leavetype" in data:
        leave_type_raw = data["leavetype"]
    if "leave_type" in data:
        leave_type_raw = data["leave_type"]
    if "leave_type_id" in data:
        leave_type_raw = data["leave_type_id"]
    if leave_type_raw is not None:
        resolved_leave_type = _resolve_leave_type_id(cur, g.company_id, leave_type_raw)
        if not resolved_leave_type:
            return jsonify({"success": False, "message": "Invalid leave type"}), 400
        col_updates["leave_type"] = resolved_leave_type

    if "from_date" in data:
        col_updates["from_date"] = data["from_date"]
    if "to_date" in data:
        col_updates["to_date"] = data["to_date"]
    if "description" in data:
        col_updates["description"] = data["description"]
    if "days_count" in data:
        col_updates["days_count"] = data["days_count"]
    if "leave_lop" in data:
        col_updates["leave_lop"] = data["leave_lop"]

    if not col_updates:
        return jsonify({"success": False, "message": "No fields to update"}), 400

    set_clauses = []
    params = []
    for col, val in col_updates.items():
        set_clauses.append(f"{col} = %s")
        params.append(val)

    # Only allow editing own pending leaves
    params.extend([app_id, g.user_id, g.company_id])
    cur.execute(
        "UPDATE tblleaves SET "
        + ", ".join(set_clauses)
        + " WHERE id = %s AND empid = %s AND Company_id = %s AND status = '0'",
        params,
    )
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Not found or not editable"}), 404


@bp.route("/applications/<int:app_id>", methods=["DELETE"])
@project_app_required
def delete_leave(app_id: int):
    """
    Allow an employee to delete their own pending leave application.
    This prevents deleted items from reappearing after a frontend refresh.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM tblleaves WHERE id = %s AND empid = %s AND Company_id = %s AND status = '0'",
        (app_id, g.user_id, g.company_id),
    )
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Not found or not editable"}), 404


@bp.route("/applications/<int:app_id>/approve", methods=["POST"])
@project_app_required
def approve_leave(app_id):
    # PHP: UPDATE tblleaves SET status='1' WHERE id=?
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE tblleaves SET status = '1' WHERE id = %s AND Company_id = %s",
        (app_id, g.company_id),
    )
    if cur.rowcount:
        # Notify employee
        try:
            cur.execute("SELECT empid, from_date, to_date FROM tblleaves WHERE id = %s AND Company_id = %s", (app_id, g.company_id))
            row = cur.fetchone() or {}
            empid = row.get("empid")
            # ensure deep-link columns exist
            try:
                cur.execute(
                    "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'entity_type' LIMIT 1"
                )
                if cur.fetchone() is None:
                    cur.execute("ALTER TABLE notifications ADD COLUMN entity_type VARCHAR(50) NULL")
                cur.execute(
                    "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'entity_id' LIMIT 1"
                )
                if cur.fetchone() is None:
                    cur.execute("ALTER TABLE notifications ADD COLUMN entity_id INT NULL")
            except Exception:
                pass

            if empid:
                title = "Leave approved"
                msg = "Your leave request has been approved."
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                    """,
                    (empid, None, title, msg, "leave_status", "leave", app_id, g.company_id),
                )
        except Exception:
            pass
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Not found"}), 404


@bp.route("/applications/<int:app_id>/reject", methods=["POST"])
@project_app_required
def reject_leave(app_id):
    # PHP: UPDATE tblleaves SET status='2' WHERE id=?
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE tblleaves SET status = '2' WHERE id = %s AND Company_id = %s",
        (app_id, g.company_id),
    )
    if cur.rowcount:
        # Notify employee
        try:
            cur.execute("SELECT empid FROM tblleaves WHERE id = %s AND Company_id = %s", (app_id, g.company_id))
            row = cur.fetchone() or {}
            empid = row.get("empid")
            # ensure deep-link columns exist
            try:
                cur.execute(
                    "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'entity_type' LIMIT 1"
                )
                if cur.fetchone() is None:
                    cur.execute("ALTER TABLE notifications ADD COLUMN entity_type VARCHAR(50) NULL")
                cur.execute(
                    "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'entity_id' LIMIT 1"
                )
                if cur.fetchone() is None:
                    cur.execute("ALTER TABLE notifications ADD COLUMN entity_id INT NULL")
            except Exception:
                pass

            if empid:
                title = "Leave rejected"
                msg = "Your leave request has been rejected."
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                    """,
                    (empid, None, title, msg, "leave_status", "leave", app_id, g.company_id),
                )
        except Exception:
            pass
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Not found"}), 404
