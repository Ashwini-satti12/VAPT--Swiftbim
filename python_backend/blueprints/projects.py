from flask import Blueprint, request, jsonify, g, current_app
from db import get_db
from auth_middleware import project_app_required
import mysql.connector as mysql_connector


def _get_vendor_db():
    """Return a connection to the new_swiftbim (vendor) database."""
    conn = mysql_connector.connect(
        host=current_app.config["MYSQL_HOST"],
        user=current_app.config["MYSQL_USER"],
        password=current_app.config["MYSQL_PASSWORD"],
        database="new_swiftbim",
        port=current_app.config.get("MYSQL_PORT", 3306),
        autocommit=True,
    )
    return conn


def _ensure_vendor_bidding_table(vendor_conn):
    """Create vendor_bidding table if it doesn't exist."""
    cur = vendor_conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS vendor_bidding (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id INT NOT NULL,
            project_name VARCHAR(255) NOT NULL,
            description TEXT,
            outsource_budget DECIMAL(15,2),
            budget_ceiling DECIMAL(15,2),
            bid_deadline DATE,
            status ENUM('active', 'closed') DEFAULT 'active',
            company_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_project (project_id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS vendor_bids (
            id INT AUTO_INCREMENT PRIMARY KEY,
            opportunity_id INT NOT NULL,
            vendor_id INT NOT NULL,
            bid_amount DECIMAL(15,2),
            notes TEXT,
            timeline VARCHAR(255),
            team_size INT DEFAULT 0,
            status ENUM('submitted','shortlisted','won','lost') DEFAULT 'submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_vendor_opportunity (vendor_id, opportunity_id)
        )
    """)

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


def _resolve_client_id(cur, company_id, value):
    """Resolve client by fullName to id. Stores ID only."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return int(value) if value == int(value) else None
    s = str(value).strip()
    if not s or s.isdigit():
        return int(s) if s.isdigit() else None
    cur.execute(
        "SELECT id FROM clientinformation WHERE fullName = %s AND Company_id = %s LIMIT 1",
        (s, company_id),
    )
    row = cur.fetchone()
    return int(row["id"]) if row else None


def _resolve_employee_id(cur, company_id, value):
    """Resolve employee by full_name to id."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return int(value) if value == int(value) else None
    s = str(value).strip()
    if not s or s.isdigit():
        return int(s) if s.isdigit() else None
    cur.execute(
        "SELECT id FROM employee WHERE full_name = %s AND Company_id = %s LIMIT 1",
        (s, company_id),
    )
    row = cur.fetchone()
    return int(row["id"]) if row else None


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
    cur.execute(
        """SELECT COUNT(*) AS total_tasks,
           SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks
           FROM tasks WHERE projectid = %s AND Company_id = %s""",
        (project_id, g.company_id),
    )
    counts = cur.fetchone() or {}
    d["total_tasks"] = int(counts.get("total_tasks") or 0)
    d["completed_tasks"] = int(counts.get("completed_tasks") or 0)
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
    raw_client = data.get("client_id") or None
    raw_pm = data.get("project_manager_id") or None
    raw_lead = data.get("lead_id") or None
    raw_bim_co = data.get("bim_coordinator_id") or None
    totalhours = data.get("totalhours") or data.get("total_hours") or None
    perday = data.get("perday") or data.get("per_day") or None
    location = data.get("location") or None
    description = data.get("description") or None
    start_date = data.get("start_date") or None
    resources = data.get("resources") or None
    required_resources = data.get("required_resources") or None
    if not project_name:
        return jsonify({"success": False, "message": "project_name required"}), 400
    conn = get_db()
    cur = conn.cursor()
    # Resolve names to IDs so we always store IDs in DB
    client_id = _resolve_client_id(cur, g.company_id, raw_client)
    project_manager_id = _resolve_employee_id(cur, g.company_id, raw_pm)
    lead_id = _resolve_employee_id(cur, g.company_id, raw_lead)
    bim_coordinator_id = _resolve_employee_id(cur, g.company_id, raw_bim_co)
    cur.execute(
        """INSERT INTO projects (project_name, uploaderid, members, department, due_date, priority, budget, modules,
           progress, Company_id, client_id, project_manager_id, lead_id, bim_coordinator_id, totalhours, perday, location, description, start_date, resources, required_resources)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (project_name, g.user_id, members, department, due_date, priority, budget, modules, g.company_id,
         client_id, project_manager_id, lead_id, bim_coordinator_id, totalhours, perday, location, description, start_date,
         resources, required_resources),
    )
    project_id = cur.lastrowid
    return jsonify({"success": True, "project_id": project_id})


@bp.route("/<int:project_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_project(project_id):
    raw = request.get_json() or request.form
    data = dict(raw) if raw else {}
    conn = get_db()
    cur = conn.cursor()
    # Resolve names to IDs so we always store IDs
    if data.get("client_id") is not None:
        data["client_id"] = _resolve_client_id(cur, g.company_id, data["client_id"])
    if data.get("project_manager_id") is not None:
        data["project_manager_id"] = _resolve_employee_id(cur, g.company_id, data["project_manager_id"])
    if data.get("lead_id") is not None:
        data["lead_id"] = _resolve_employee_id(cur, g.company_id, data["lead_id"])
    if data.get("bim_coordinator_id") is not None:
        data["bim_coordinator_id"] = _resolve_employee_id(cur, g.company_id, data["bim_coordinator_id"])
    allowed = ("project_name", "members", "department", "due_date", "priority", "budget", "modules", "progress",
               "client_id", "project_manager_id", "lead_id", "bim_coordinator_id", "totalhours", "perday", "location", "description", "start_date",
               "budget_ceiling", "bidding_end_date", "resources", "required_resources")
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
    if not cur.rowcount:
        return jsonify({"success": False, "message": "Project not found"}), 404

    # -----------------------------------------------------------------------
    # OUTSOURCE BRIDGE: if this update marks the project as Outsource
    # (department = "Submission Deadline"), push/update the opportunity in
    # the vendor-facing new_swiftbim.vendor_bidding table so all vendors
    # can see it immediately in their Opportunities page.
    # -----------------------------------------------------------------------
    department_val = data.get("department", "")
    budget_ceiling = data.get("budget_ceiling")
    bidding_end_date = data.get("bidding_end_date")
    is_outsource = (department_val == "Submission Deadline") or (budget_ceiling and bidding_end_date)

    if is_outsource:
        try:
            cur.execute("SELECT project_name, budget, description FROM projects WHERE id = %s AND Company_id = %s",
                        (project_id, g.company_id))
            proj = cur.fetchone()
            if proj:
                project_name = proj["project_name"]
                outsource_budget = proj["budget"]
                description = proj.get("description") or ""
                cur.execute(
                    """INSERT INTO vendor_bidding
                         (project_id, project_name, description, outsource_budget, budget_ceiling, bid_deadline, status, company_id)
                       VALUES (%s, %s, %s, %s, %s, %s, 'active', %s)
                       ON DUPLICATE KEY UPDATE
                         project_name   = VALUES(project_name),
                         description    = VALUES(description),
                         outsource_budget = VALUES(outsource_budget),
                         budget_ceiling = VALUES(budget_ceiling),
                         bid_deadline   = VALUES(bid_deadline),
                         status         = 'active',
                         company_id     = VALUES(company_id)
                    """,
                    (project_id, project_name, description, outsource_budget,
                     budget_ceiling or outsource_budget, bidding_end_date, g.company_id),
                )
        except Exception:
            pass

    return jsonify({"success": True})


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
