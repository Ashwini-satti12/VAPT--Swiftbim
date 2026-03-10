# Leave: uses same DB as PHP – tblleaves, holiday (leave types from holiday table)
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("leave", __name__, url_prefix="/api/leave")


@bp.route("/types", methods=["GET"])
@project_app_required
def list_leave_types():
    # PHP: leave types from holiday table (leave_type = '1' or '2', etc.)
    conn = get_db()
    cur = conn.cursor()
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
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT tblleaves.id AS lid, tblleaves.empid, tblleaves.leave_type, tblleaves.posting_date, tblleaves.description,
                  tblleaves.status, tblleaves.from_date, tblleaves.to_date, tblleaves.starttime, tblleaves.endtime,
                  employee.full_name, employee.id AS employee_id, employee.user_role AS role,
                  CASE WHEN holiday.id IS NULL THEN 'Others' ELSE holiday.title END AS title
           FROM tblleaves
           JOIN employee ON tblleaves.empid = employee.id
           LEFT JOIN holiday ON tblleaves.leave_type = holiday.id
           WHERE tblleaves.Company_id = %s
           ORDER BY tblleaves.id DESC""",
        (g.company_id,),
    )
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
    leavetype = data.get("leavetype") or data.get("leave_type") or data.get("leave_type_id")
    description = data.get("description") or ""
    fromdate = data.get("from_date") or data.get("fromdate")
    todate = data.get("to_date") or data.get("todate")
    starttime = data.get("starttime") or ""
    endtime = data.get("endtime") or ""
    days_count = data.get("days_count")
    leave_lop = data.get("leave_lop") or 0
    if not leavetype:
        return jsonify({"success": False, "message": "leavetype required"}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
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
        return jsonify({"success": True, "id": cur.lastrowid})
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
    if "leavetype" in data:
        col_updates["leave_type"] = data["leavetype"]
    if "leave_type" in data:
        col_updates["leave_type"] = data["leave_type"]
    if "leave_type_id" in data:
        col_updates["leave_type"] = data["leave_type_id"]

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
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Not found"}), 404
