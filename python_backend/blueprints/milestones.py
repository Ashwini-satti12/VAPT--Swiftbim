from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("milestones", __name__, url_prefix="/api/milestones")


@bp.route("", methods=["GET"])
@project_app_required
def list_milestones():
    project_id = request.args.get("project_id")
    if not project_id:
        return jsonify({"success": False, "message": "project_id required"}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM payment_milestones WHERE project_id = %s AND Company_id = %s ORDER BY due_date",
        (project_id, g.company_id),
    )
    rows = cur.fetchall()
    milestones = []
    for r in rows:
        d = dict(r)
        if d.get("due_date") and hasattr(d["due_date"], "isoformat"):
            d["due_date"] = d["due_date"].isoformat()
        milestones.append(d)
    return jsonify({"milestones": milestones})


@bp.route("", methods=["POST"])
@project_app_required
def create_milestone():
    data = request.get_json() or request.form
    action = data.get("action", "add")
    if action != "add":
        return jsonify({"success": False, "message": "Invalid action"}), 400
    project_id = data.get("project_id")
    milestone_name = (data.get("milestone_name") or "").strip()
    milestone_amount = float(data.get("milestone_amount") or 0)
    due_date = data.get("due_date")
    notes = (data.get("notes") or "").strip()
    if not project_id or not milestone_name or milestone_amount <= 0 or not due_date:
        return jsonify({"success": False, "message": "Please fill all required fields"}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO payment_milestones (project_id, milestone_name, milestone_amount, due_date, notes, Company_id)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (project_id, milestone_name, milestone_amount, due_date, notes, g.company_id),
    )
    return jsonify({"success": True, "id": cur.lastrowid})


@bp.route("/<int:milestone_id>", methods=["GET"])
@project_app_required
def get_milestone(milestone_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM payment_milestones WHERE id = %s AND Company_id = %s",
        (milestone_id, g.company_id),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Milestone not found"}), 404
    d = dict(row)
    if d.get("due_date") and hasattr(d["due_date"], "isoformat"):
        d["due_date"] = d["due_date"].isoformat()
    return jsonify(d)


@bp.route("/<int:milestone_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_milestone(milestone_id):
    data = request.get_json() or request.form
    conn = get_db()
    cur = conn.cursor()
    allowed = ("milestone_name", "milestone_amount", "due_date", "notes")
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(data[key])
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
    params.extend([milestone_id, g.company_id])
    cur.execute(
        "UPDATE payment_milestones SET " + ", ".join(sets) + " WHERE id = %s AND Company_id = %s",
        params,
    )
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Milestone not found"}), 404


@bp.route("/<int:milestone_id>", methods=["DELETE"])
@project_app_required
def delete_milestone(milestone_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM payment_milestones WHERE id = %s AND Company_id = %s",
        (milestone_id, g.company_id),
    )
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Milestone not found"}), 404


@bp.route("/<int:milestone_id>/mark-paid", methods=["POST"])
@project_app_required
def mark_paid(milestone_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE payment_milestones SET paid = 1 WHERE id = %s AND Company_id = %s",
        (milestone_id, g.company_id),
    )
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Milestone not found"}), 404
