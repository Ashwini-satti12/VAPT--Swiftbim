from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("teams", __name__, url_prefix="/api/teams")


@bp.route("", methods=["GET"])
@project_app_required
def list_teams():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT t.*, e.full_name AS leader_name FROM team t LEFT JOIN employee e ON t.leader = e.id WHERE t.Company_id = %s",
        (g.company_id,),
    )
    rows = cur.fetchall()
    teams = [dict(r) for r in rows]
    return jsonify({"teams": teams})


@bp.route("", methods=["POST"])
@project_app_required
def create_team():
    data = request.get_json() or request.form
    leader = data.get("leader")
    employee_ids = data.get("employee") or data.get("employees") or []
    project_lead = data.get("project_lead")
    if isinstance(employee_ids, str):
        employee_ids = [x.strip() for x in employee_ids.split(",") if x.strip()]
    employee_str = ",".join(str(x) for x in employee_ids)
    if not leader:
        return jsonify({"success": False, "message": "leader required"}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO team (leader, employee, project_lead, Company_id) VALUES (%s, %s, %s, %s)",
        (leader, employee_str, project_lead or 0, g.company_id),
    )
    return jsonify({"success": True, "id": cur.lastrowid})


@bp.route("/<int:team_id>", methods=["GET"])
@project_app_required
def get_team(team_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM team WHERE team_id = %s AND Company_id = %s",
        (team_id, g.company_id),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Team not found"}), 404
    return jsonify(dict(row))


@bp.route("/<int:team_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_team(team_id):
    data = request.get_json() or request.form
    conn = get_db()
    cur = conn.cursor()
    employee = data.get("employee") or data.get("employees")
    if isinstance(employee, list):
        employee = ",".join(str(x) for x in employee)
    sets = []
    params = []
    for key in ("leader", "employee", "project_lead"):
        if key in data:
            val = data[key]
            if key == "employee" and isinstance(val, list):
                val = ",".join(str(x) for x in val)
            sets.append(f"`{key}` = %s")
            params.append(val)
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
    params.extend([team_id, g.company_id])
    cur.execute(
        "UPDATE team SET " + ", ".join(sets) + " WHERE team_id = %s AND Company_id = %s",
        params,
    )
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Team not found"}), 404
