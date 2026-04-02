from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required
from utils import mailer

bp = Blueprint("teams", __name__, url_prefix="/api/teams")


@bp.route("", methods=["GET"])
@project_app_required
def list_teams():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT t.*, t.teamname AS team_name, e.full_name AS leader_name FROM team t LEFT JOIN employee e ON t.leader = e.id WHERE t.Company_id = %s",
        (g.company_id,),
    )
    rows = cur.fetchall()
    teams = [dict(r) for r in rows]
    return jsonify({"teams": teams})


@bp.route("", methods=["POST"])
@project_app_required
def create_team():
    data = request.get_json() or request.form
    teamname = data.get("team_name") or data.get("teamname", "")
    leader = data.get("leader")
    employee_ids = data.get("employee") or data.get("employees") or []
    project_lead = data.get("project_lead")
    project_id = data.get("project_id")
    if project_id is not None and project_id != "":
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            project_id = None
    project_name = data.get("project_name")
    if isinstance(employee_ids, str):
        employee_ids = [x.strip() for x in employee_ids.split(",") if x.strip()]
    employee_str = ",".join(str(x) for x in employee_ids)
    if not leader:
        return jsonify({"success": False, "message": "leader required"}), 400
    conn = get_db()
    cur = conn.cursor()
    # Resolve project_name from project_id if not provided
    if not project_name and project_id:
        cur.execute(
            "SELECT project_name FROM projects WHERE id = %s AND Company_id = %s",
            (project_id, g.company_id),
        )
        row = cur.fetchone()
        if row:
            project_name = row.get("project_name")
    cur.execute(
        "INSERT INTO team (teamname, leader, employee, project_lead, project_name, Company_id) VALUES (%s, %s, %s, %s, %s, %s)",
        (teamname, leader, employee_str, project_lead or 0, project_name, g.company_id),
    )
    team_id = cur.lastrowid
    
    # Team Creation Notification Email
    if employee_ids:
        for emp_id in employee_ids:
            try:
                cur.execute("SELECT full_name, email FROM employee WHERE id = %s", (emp_id,))
                member = cur.fetchone() or {}
                if member.get("email"):
                    mailer.send_team_creation_email(member["full_name"], member["email"])
            except Exception:
                pass
    
    return jsonify({"success": True, "id": team_id})


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
    sets = []
    params = []

    if "team_name" in data or "teamname" in data:
        sets.append("`teamname` = %s")
        params.append(data.get("team_name") or data.get("teamname"))

    for key in ("leader", "employee", "project_lead"):
        if key in data:
            val = data[key]
            if key == "employee":
                if isinstance(val, list):
                    val = ",".join(str(x) for x in val)
                elif isinstance(val, str):
                    val = ",".join(x.strip() for x in val.split(",") if x.strip())
            sets.append(f"`{key}` = %s")
            params.append(val)

    # Resolve and set project_name (from project_id or direct project_name)
    project_name = data.get("project_name")
    project_id = data.get("project_id")
    if project_id not in (None, "") and project_name is None:
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            project_id = None
    if project_name is None and project_id not in (None, ""):
        cur.execute(
            "SELECT project_name FROM projects WHERE id = %s AND Company_id = %s",
            (project_id, g.company_id),
        )
        row = cur.fetchone()
        if row:
            project_name = row.get("project_name")
    if project_name is not None:
        sets.append("`project_name` = %s")
        params.append(project_name)

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


@bp.route("/<int:team_id>", methods=["DELETE"])
@project_app_required
def delete_team(team_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM team WHERE team_id = %s AND Company_id = %s", (team_id, g.company_id))
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Team not found"}), 404
