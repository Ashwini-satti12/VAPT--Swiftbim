# Leave: uses same DB as PHP – tblleaves, holiday (leave types from holiday table)
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required
from utils import mailer

bp = Blueprint("leave", __name__, url_prefix="/api/leave")

# tblleaves.status:
# 0=pending first approver, 1=approved, 2=rejected,
# 3=pending BIM Lead (BIM Modeler after BIM Coordinator),
# 4=pending Project Manager (BIM Coordinator after BIM Lead),
# 5=pending Technical Director (BIM Lead after Project Manager)


def _is_bim_modeler_role(role: str | None) -> bool:
    r = (role or "").strip().lower()
    if r == "bim modeler":
        return True
    return "bim modeler" in r


def _is_bim_coordinator_role(role: str | None) -> bool:
    r = (role or "").strip().lower()
    if r == "bim coordinator":
        return True
    return "bim coordinator" in r


def _is_bim_lead_role(role: str | None) -> bool:
    r = (role or "").strip().lower()
    if r == "bim lead":
        return True
    return "bim lead" in r


def _is_project_manager_role(role: str | None) -> bool:
    r = (role or "").strip().lower()
    if r == "project manager":
        return True
    return "project manager" in r


def _notify_users_by_role(cur, company_id: int, role_name: str, title: str, message: str, entity_id: int):
    """Insert notifications for all active employees with the given user_role."""
    try:
        cur.execute(
            "SELECT id FROM employee WHERE Company_id = %s AND user_role = %s AND active = 'active'",
            (company_id, role_name),
        )
        rows = cur.fetchall() or []
        for u in rows:
            uid = u.get("id") if isinstance(u, dict) else u[0]
            if not uid:
                continue
            cur.execute(
                """
                INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                """,
                (uid, None, title, message, "leave", "leave", entity_id, company_id),
            )
    except Exception as e:
        print(f"Leave notification (role={role_name}): {e}")


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
    # PHP: tblleaves JOIN employee LEFT JOIN holiday; status 0/3/4/5=pending chain, 1=approved, 2=declined
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

        # Notify next approver in the leave chain based on applicant role.
        try:
            cur.execute("SELECT full_name, email FROM employee WHERE id = %s", (g.user_id,))
            user = cur.fetchone() or {}

            current_role = getattr(g, "user_role", "") or ""
            if _is_bim_lead_role(current_role):
                nm = user.get("full_name", "A BIM Lead")
                _notify_users_by_role(
                    cur,
                    g.company_id,
                    "Project Manager",
                    "New leave application",
                    f"{nm} has applied for leave and needs your approval.",
                    leave_id,
                )
            elif _is_project_manager_role(current_role):
                nm = user.get("full_name", "A Project Manager")
                _notify_users_by_role(
                    cur,
                    g.company_id,
                    "Technical Director",
                    "New leave application",
                    f"{nm} has applied for leave and needs your approval.",
                    leave_id,
                )
            elif _is_bim_modeler_role(current_role):
                nm = user.get("full_name", "A team member")
                _notify_users_by_role(
                    cur,
                    g.company_id,
                    "BIM Coordinator",
                    "New leave application",
                    f"{nm} has applied for leave and needs your approval.",
                    leave_id,
                )
            elif _is_bim_coordinator_role(current_role):
                nm = user.get("full_name", "A BIM Coordinator")
                _notify_users_by_role(
                    cur,
                    g.company_id,
                    "BIM Lead",
                    "New leave application",
                    f"{nm} has applied for leave and needs your approval.",
                    leave_id,
                )
        except Exception as e:
            print(f"Leave notification error: {e}")

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


def _ensure_notification_entity_columns(cur):
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


def _notify_leave_final_approved(cur, app_id: int, empid):
    try:
        _ensure_notification_entity_columns(cur)
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


def _notify_leave_rejected(cur, app_id: int, empid):
    try:
        _ensure_notification_entity_columns(cur)
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


@bp.route("/applications/<int:app_id>/approve", methods=["POST"])
@project_app_required
def approve_leave(app_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT tblleaves.status, tblleaves.empid, e.user_role AS applicant_role
        FROM tblleaves
        JOIN employee e ON tblleaves.empid = e.id
        WHERE tblleaves.id = %s AND tblleaves.Company_id = %s
        LIMIT 1
        """,
        (app_id, g.company_id),
    )
    row = cur.fetchone() or {}
    if row.get("empid") is None:
        return jsonify({"success": False, "message": "Not found"}), 404

    st = str(row.get("status") or "0").strip()
    applicant_role = row.get("applicant_role") or ""
    actor = (getattr(g, "user_role", None) or "").strip()
    empid = row.get("empid")

    if _is_bim_modeler_role(applicant_role):
        if st in ("1", "2"):
            return jsonify({"success": False, "message": "Leave request is already finalized"}), 400
        if st == "0":
            if actor != "BIM Coordinator":
                return jsonify({"success": False, "message": "BIM Coordinator approval is required first"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '3' WHERE id = %s AND Company_id = %s AND status = '0'",
                (app_id, g.company_id),
            )
            if not cur.rowcount:
                return jsonify({"success": False, "message": "Not found"}), 404
            cur.execute("SELECT full_name FROM employee WHERE id = %s", (empid,))
            nm_row = cur.fetchone() or {}
            nm = nm_row.get("full_name") if isinstance(nm_row, dict) else None
            if not nm:
                nm = "A BIM Modeler"
            _notify_users_by_role(
                cur,
                g.company_id,
                "BIM Lead",
                "Leave pending your approval",
                f"{nm}'s leave was approved by BIM Coordinator and awaits your final approval.",
                app_id,
            )
            return jsonify({"success": True, "stage": "pending_bim_lead"})
        if st == "3":
            if actor != "BIM Lead":
                return jsonify({"success": False, "message": "Only BIM Lead can give final approval"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '1' WHERE id = %s AND Company_id = %s AND status = '3'",
                (app_id, g.company_id),
            )
            if not cur.rowcount:
                return jsonify({"success": False, "message": "Not found"}), 404
            _notify_leave_final_approved(cur, app_id, empid)
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "Invalid leave status"}), 400

    if _is_bim_coordinator_role(applicant_role):
        if st in ("1", "2"):
            return jsonify({"success": False, "message": "Leave request is already finalized"}), 400
        if st == "0":
            if actor != "BIM Lead":
                return jsonify({"success": False, "message": "BIM Lead approval is required first"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '4' WHERE id = %s AND Company_id = %s AND status = '0'",
                (app_id, g.company_id),
            )
            if not cur.rowcount:
                return jsonify({"success": False, "message": "Not found"}), 404
            cur.execute("SELECT full_name FROM employee WHERE id = %s", (empid,))
            nm_row = cur.fetchone() or {}
            nm = nm_row.get("full_name") if isinstance(nm_row, dict) else None
            if not nm:
                nm = "A BIM Coordinator"
            _notify_users_by_role(
                cur,
                g.company_id,
                "Project Manager",
                "Leave pending your approval",
                f"{nm}'s leave was approved by BIM Lead and awaits your final approval.",
                app_id,
            )
            return jsonify({"success": True, "stage": "pending_project_manager"})
        if st == "4":
            if actor != "Project Manager":
                return jsonify({"success": False, "message": "Only Project Manager can give final approval"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '1' WHERE id = %s AND Company_id = %s AND status = '4'",
                (app_id, g.company_id),
            )
            if not cur.rowcount:
                return jsonify({"success": False, "message": "Not found"}), 404
            _notify_leave_final_approved(cur, app_id, empid)
            return jsonify({"success": True})
        if st == "3":
            return jsonify({"success": False, "message": "Invalid stage for BIM Coordinator leave"}), 400
        return jsonify({"success": False, "message": "Invalid leave status"}), 400

    if _is_bim_lead_role(applicant_role):
        if st in ("1", "2"):
            return jsonify({"success": False, "message": "Leave request is already finalized"}), 400
        if st == "0":
            if actor != "Project Manager":
                return jsonify({"success": False, "message": "Project Manager approval is required first"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '5' WHERE id = %s AND Company_id = %s AND status = '0'",
                (app_id, g.company_id),
            )
            if not cur.rowcount:
                return jsonify({"success": False, "message": "Not found"}), 404
            cur.execute("SELECT full_name FROM employee WHERE id = %s", (empid,))
            nm_row = cur.fetchone() or {}
            nm = nm_row.get("full_name") if isinstance(nm_row, dict) else None
            if not nm:
                nm = "A BIM Lead"
            _notify_users_by_role(
                cur,
                g.company_id,
                "Technical Director",
                "Leave pending your approval",
                f"{nm}'s leave was approved by Project Manager and awaits your final approval.",
                app_id,
            )
            return jsonify({"success": True, "stage": "pending_technical_director"})
        if st == "5":
            if actor != "Technical Director":
                return jsonify({"success": False, "message": "Only Technical Director can give final approval"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '1' WHERE id = %s AND Company_id = %s AND status = '5'",
                (app_id, g.company_id),
            )
            if not cur.rowcount:
                return jsonify({"success": False, "message": "Not found"}), 404
            _notify_leave_final_approved(cur, app_id, empid)
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "Invalid leave status"}), 400

    if _is_project_manager_role(applicant_role):
        if st in ("1", "2"):
            return jsonify({"success": False, "message": "Leave request is already finalized"}), 400
        if st == "0":
            if actor != "Technical Director":
                return jsonify({"success": False, "message": "Technical Director approval is required"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '1' WHERE id = %s AND Company_id = %s AND status = '0'",
                (app_id, g.company_id),
            )
            if not cur.rowcount:
                return jsonify({"success": False, "message": "Not found"}), 404
            _notify_leave_final_approved(cur, app_id, empid)
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "Invalid leave status"}), 400

    cur.execute(
        "UPDATE tblleaves SET status = '1' WHERE id = %s AND Company_id = %s",
        (app_id, g.company_id),
    )
    if cur.rowcount:
        _notify_leave_final_approved(cur, app_id, empid)
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Not found"}), 404


@bp.route("/applications/<int:app_id>/reject", methods=["POST"])
@project_app_required
def reject_leave(app_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT tblleaves.status, tblleaves.empid, e.user_role AS applicant_role
        FROM tblleaves
        JOIN employee e ON tblleaves.empid = e.id
        WHERE tblleaves.id = %s AND tblleaves.Company_id = %s
        LIMIT 1
        """,
        (app_id, g.company_id),
    )
    row = cur.fetchone() or {}
    if row.get("empid") is None:
        return jsonify({"success": False, "message": "Not found"}), 404

    st = str(row.get("status") or "0").strip()
    applicant_role = row.get("applicant_role") or ""
    actor = (getattr(g, "user_role", None) or "").strip()
    empid = row.get("empid")

    if _is_bim_modeler_role(applicant_role):
        if st in ("1", "2"):
            return jsonify({"success": False, "message": "Leave request is already finalized"}), 400
        if st == "0":
            if actor != "BIM Coordinator":
                return jsonify({"success": False, "message": "Only BIM Coordinator can reject at this stage"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '2' WHERE id = %s AND Company_id = %s AND status = '0'",
                (app_id, g.company_id),
            )
        elif st == "3":
            if actor != "BIM Lead":
                return jsonify({"success": False, "message": "Only BIM Lead can reject at this stage"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '2' WHERE id = %s AND Company_id = %s AND status = '3'",
                (app_id, g.company_id),
            )
        else:
            return jsonify({"success": False, "message": "Invalid leave status"}), 400
    elif _is_bim_coordinator_role(applicant_role):
        if st in ("1", "2"):
            return jsonify({"success": False, "message": "Leave request is already finalized"}), 400
        if st == "0":
            if actor != "BIM Lead":
                return jsonify({"success": False, "message": "Only BIM Lead can reject at this stage"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '2' WHERE id = %s AND Company_id = %s AND status = '0'",
                (app_id, g.company_id),
            )
        elif st == "4":
            if actor != "Project Manager":
                return jsonify({"success": False, "message": "Only Project Manager can reject at this stage"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '2' WHERE id = %s AND Company_id = %s AND status = '4'",
                (app_id, g.company_id),
            )
        else:
            return jsonify({"success": False, "message": "Invalid leave status"}), 400
    elif _is_bim_lead_role(applicant_role):
        if st in ("1", "2"):
            return jsonify({"success": False, "message": "Leave request is already finalized"}), 400
        if st == "0":
            if actor != "Project Manager":
                return jsonify({"success": False, "message": "Only Project Manager can reject at this stage"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '2' WHERE id = %s AND Company_id = %s AND status = '0'",
                (app_id, g.company_id),
            )
        elif st == "5":
            if actor != "Technical Director":
                return jsonify({"success": False, "message": "Only Technical Director can reject at this stage"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '2' WHERE id = %s AND Company_id = %s AND status = '5'",
                (app_id, g.company_id),
            )
        else:
            return jsonify({"success": False, "message": "Invalid leave status"}), 400
    elif _is_project_manager_role(applicant_role):
        if st in ("1", "2"):
            return jsonify({"success": False, "message": "Leave request is already finalized"}), 400
        if st == "0":
            if actor != "Technical Director":
                return jsonify({"success": False, "message": "Only Technical Director can reject at this stage"}), 403
            cur.execute(
                "UPDATE tblleaves SET status = '2' WHERE id = %s AND Company_id = %s AND status = '0'",
                (app_id, g.company_id),
            )
        else:
            return jsonify({"success": False, "message": "Invalid leave status"}), 400
    else:
        cur.execute(
            "UPDATE tblleaves SET status = '2' WHERE id = %s AND Company_id = %s",
            (app_id, g.company_id),
        )

    if cur.rowcount:
        _notify_leave_rejected(cur, app_id, empid)
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Not found"}), 404
