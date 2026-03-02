from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("projects", __name__, url_prefix="/api/projects")

# Roles that see all company projects (like PHP session id 1 / type_id=1)
PROJECTS_SEE_ALL_ROLES = ("Technical Director", "CEO", "Project Manager", "BIM Lead", "BIM Coordinator")


@bp.route("", methods=["GET"])
@project_app_required
def list_projects():
    user_id = request.args.get("userid") or g.user_id
    type_id = request.args.get("type_id")
    status = request.args.get("status")
    company_id = g.company_id
    user_role = (getattr(g, "user_role", None) or "").strip()
    # Management roles (Technical Director, etc.) see all company projects by default, like PHP type_id=1
    see_all_by_role = user_role in PROJECTS_SEE_ALL_ROLES

    conn = get_db()
    cur = conn.cursor()

    if type_id is None and not see_all_by_role:
        # Default: only projects created by me (restrictive)
        cur.execute(
            "SELECT * FROM projects WHERE Company_id = %s AND uploaderid = %s ORDER BY project_name",
            (company_id, user_id),
        )
    elif type_id is not None and str(type_id) != "1":
        # type_id 2 or 3: projects where user is in members
        cur.execute(
            """SELECT * FROM projects WHERE FIND_IN_SET(%s, REPLACE(CONCAT(',', members, ','), ' ', '')) AND Company_id = %s
               ORDER BY project_name""",
            (user_id, company_id),
        )
    elif status:
        # Completed projects only
        cur.execute(
            "SELECT * FROM projects WHERE progress = 100 AND Company_id = %s ORDER BY project_name",
            (company_id,),
        )
    else:
        # type_id=1 or management role: all company projects
        cur.execute(
            "SELECT * FROM projects WHERE Company_id = %s ORDER BY project_name",
            (company_id,),
        )

    rows = cur.fetchall()
    project_ids = [r["id"] for r in rows]
    task_counts = {}
    if project_ids:
        placeholders = ",".join(["%s"] * len(project_ids))
        cur.execute(
            f"""SELECT projectid, COUNT(*) AS total_tasks,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks
                FROM tasks WHERE projectid IN ({placeholders}) AND Company_id = %s GROUP BY projectid""",
            (*project_ids, company_id),
        )
        for row in cur.fetchall():
            task_counts[row["projectid"]] = {
                "total_tasks": row["total_tasks"] or 0,
                "completed_tasks": row["completed_tasks"] or 0,
            }
    def _serialize_row(d):
        if d.get("due_date") and hasattr(d["due_date"], "isoformat"):
            d["due_date"] = d["due_date"].isoformat()
        if d.get("start_date") and hasattr(d["start_date"], "isoformat"):
            d["start_date"] = d["start_date"].isoformat()
        if d.get("bidding_end_date") and hasattr(d["bidding_end_date"], "isoformat"):
            d["bidding_end_date"] = d["bidding_end_date"].isoformat()

    projects = []
    for r in rows:
        d = dict(r)
        _serialize_row(d)
        counts = task_counts.get(d["id"], {"total_tasks": 0, "completed_tasks": 0})
        d["total_tasks"] = counts["total_tasks"]
        d["completed_tasks"] = counts["completed_tasks"]
        projects.append(d)
    return jsonify({"projects": projects})


@bp.route("/<int:project_id>", methods=["GET"])
@project_app_required
def get_project(project_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM projects WHERE id = %s AND Company_id = %s",
        (project_id, g.company_id),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Project not found"}), 404
    d = dict(row)
    if d.get("due_date") and hasattr(d["due_date"], "isoformat"):
        d["due_date"] = d["due_date"].isoformat()
    if d.get("start_date") and hasattr(d["start_date"], "isoformat"):
        d["start_date"] = d["start_date"].isoformat()
    if d.get("bidding_end_date") and hasattr(d["bidding_end_date"], "isoformat"):
        d["bidding_end_date"] = d["bidding_end_date"].isoformat()
    return jsonify(d)


@bp.route("", methods=["POST"])
@project_app_required
def create_project():
    data = request.get_json() or request.form
    project_name = data.get("project_name") or data.get("projectname")
    members = data.get("members") or ""
    department = data.get("department") or ""
    due_date = data.get("due_date")
    priority = data.get("priority") or "Low"
    budget = data.get("budget") or "0"
    modules = data.get("modules") or ""
    client_id = data.get("client_id") or None
    project_manager_id = data.get("project_manager_id") or None
    lead_id = data.get("lead_id") or None
    bim_coordinator_id = data.get("bim_coordinator_id") or None
    totalhours = data.get("totalhours") or data.get("total_hours") or None
    perday = data.get("perday") or data.get("per_day") or None
    location = data.get("location") or None
    description = data.get("description") or None
    start_date = data.get("start_date") or None
    if not project_name:
        return jsonify({"success": False, "message": "project_name required"}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO projects (project_name, uploaderid, members, department, due_date, priority, budget, modules,
           progress, Company_id, client_id, project_manager_id, lead_id, bim_coordinator_id, totalhours, perday, location, description, start_date)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (project_name, g.user_id, members, department, due_date, priority, budget, modules, g.company_id,
         client_id, project_manager_id, lead_id, bim_coordinator_id, totalhours, perday, location, description, start_date),
    )
    project_id = cur.lastrowid
    return jsonify({"success": True, "project_id": project_id})


@bp.route("/<int:project_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_project(project_id):
    data = request.get_json() or request.form
    conn = get_db()
    cur = conn.cursor()
    allowed = ("project_name", "members", "department", "due_date", "priority", "budget", "modules", "progress",
               "client_id", "project_manager_id", "lead_id", "bim_coordinator_id", "totalhours", "perday", "location", "description", "start_date",
               "budget_ceiling", "bidding_end_date")
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(data[key])
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
    params.extend([project_id, g.company_id])
    cur.execute("UPDATE projects SET " + ", ".join(sets) + " WHERE id = %s AND Company_id = %s", params)
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Project not found"}), 404


@bp.route("/<int:project_id>", methods=["DELETE"])
@project_app_required
def delete_project(project_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM projects WHERE id = %s AND Company_id = %s", (project_id, g.company_id))
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Project not found"}), 404


# Member filter endpoints (from memberfiler.php)
@bp.route("/filters/leaders", methods=["POST"])
@project_app_required
def filter_leaders():
    data = request.get_json() or request.form
    manager_id = data.get("manager_id")
    project_lead_id = data.get("projectleadId")
    if not manager_id:
        return jsonify({"success": False, "leaders": []}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT t.*, e.full_name, e.id, e.user_role
           FROM team t JOIN employee e ON t.leader = e.id
           WHERE t.project_lead = %s""",
        (manager_id,),
    )
    rows = cur.fetchall()
    leaders = [{"id": r["id"], "full_name": r["full_name"], "user_role": r["user_role"], "selected": r["id"] == project_lead_id} for r in rows]
    return jsonify({"success": True, "leaders": leaders})


@bp.route("/filters/members", methods=["POST"])
@project_app_required
def filter_members():
    data = request.get_json() or request.form
    leader_id = data.get("leader_id")
    if not leader_id:
        return jsonify({"success": False, "members": []}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT e.id, e.full_name, e.user_role
           FROM team t
           JOIN employee e ON FIND_IN_SET(e.id, REPLACE(t.employee, ' ', '')) > 0
           WHERE t.leader = %s""",
        (leader_id,),
    )
    rows = cur.fetchall()
    members = [{"value": r["id"], "name": f"{r['full_name']}({r['user_role']})"} for r in rows]
    return jsonify({"success": True, "members": members})


@bp.route("/filters/modules", methods=["POST"])
@project_app_required
def filter_modules():
    data = request.get_json() or request.form
    project_id = data.get("projectId")
    selected_module = data.get("projectmodules")
    if not project_id:
        return jsonify({"success": False, "modules": []}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT modules FROM projects WHERE id = %s AND Company_id = %s", (project_id, g.company_id))
    row = cur.fetchone()
    if not row or not row.get("modules"):
        return jsonify({"success": True, "modules": []})
    modules = [m.strip() for m in str(row["modules"]).split(",") if m.strip()]
    out = [{"value": m, "label": m, "selected": m == selected_module} for m in modules]
    return jsonify({"success": True, "modules": out})
