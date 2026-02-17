"""
Client portal API: dashboard, projects, milestones for logged-in clients (clientinformation).
All routes require client_required (JWT with user_type=client).
"""
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import client_required

bp = Blueprint("client_panel", __name__, url_prefix="/api/client")


def _serialize_row(d):
    out = {}
    for k, v in d.items():
        if v is None:
            out[k] = None
        elif hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        elif hasattr(v, "strftime"):
            out[k] = v.strftime("%H:%M") if "time" in k.lower() else v.isoformat()
        else:
            out[k] = v
    return out


@bp.route("/me", methods=["GET"])
@client_required
def me():
    """Return current client info."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, fullName, email, phoneNumber, Company_id FROM clientinformation WHERE id = %s AND Company_id = %s",
        (g.client_id, g.company_id),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Client not found"}), 404
    d = dict(row)
    return jsonify({
        "success": True,
        "user": {
            "id": d["id"],
            "full_name": d.get("fullName"),
            "email": d.get("email"),
            "company_id": d.get("Company_id"),
            "user_type": "client",
        },
    })


@bp.route("/dashboard", methods=["GET"])
@client_required
def dashboard():
    """Dashboard stats and project list for client."""
    conn = get_db()
    cur = conn.cursor()
    client_id = g.client_id
    company_id = g.company_id

    # Projects for this client (projects.client_id may not exist in all schemas - try both)
    try:
        cur.execute(
            """SELECT p.*, COUNT(t.id) AS task_count,
                SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count
               FROM projects p
               LEFT JOIN tasks t ON t.projectid = p.id AND t.Company_id = p.Company_id
               WHERE p.client_id = %s AND p.Company_id = %s
               GROUP BY p.id ORDER BY p.project_name""",
            (client_id, company_id),
        )
    except Exception:
        cur.execute(
            "SELECT * FROM projects WHERE Company_id = %s ORDER BY project_name LIMIT 0",
            (company_id,),
        )
    rows = cur.fetchall()
    projects = []
    for r in rows:
        d = _serialize_row(dict(r))
        if d.get("due_date") and hasattr(r.get("due_date"), "isoformat"):
            d["due_date"] = r["due_date"].isoformat()
        projects.append(d)

    # Simple stats
    total_projects = len(projects)
    total_tasks = sum((r.get("task_count") or 0) for r in rows)
    completed_tasks = sum((r.get("completed_count") or 0) for r in rows)

    # Payment milestone summary
    total_budget = 0
    total_paid = 0
    total_pending = 0
    for p in rows:
        pid = p.get("id")
        if not pid:
            continue
        cur.execute(
            "SELECT milestone_amount, status FROM payment_milestones WHERE project_id = %s AND Company_id = %s",
            (pid, company_id),
        )
        for m in cur.fetchall() or []:
            amt = float(m.get("milestone_amount") or 0)
            total_budget += amt
            if (m.get("status") or "").strip() == "Paid":
                total_paid += amt
            else:
                total_pending += amt
    payment_progress = round((total_paid / total_budget * 100), 1) if total_budget else 0
    if payment_progress > 100:
        payment_progress = 100

    return jsonify({
        "success": True,
        "stats": {
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "total_budget": total_budget,
            "total_paid": total_paid,
            "total_pending": total_pending,
            "payment_progress": payment_progress,
        },
        "projects": projects,
    })


@bp.route("/projects", methods=["GET"])
@client_required
def list_projects():
    """List projects for this client."""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT p.*, COUNT(t.id) AS total_tasks,
                SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks
               FROM projects p
               LEFT JOIN tasks t ON t.projectid = p.id AND t.Company_id = p.Company_id
               WHERE p.client_id = %s AND p.Company_id = %s
               GROUP BY p.id ORDER BY p.project_name""",
            (g.client_id, g.company_id),
        )
    except Exception:
        cur.execute(
            "SELECT * FROM projects WHERE Company_id = %s AND 1=0",
            (g.company_id,),
        )
    rows = cur.fetchall()
    projects = []
    for r in rows:
        d = _serialize_row(dict(r))
        if d.get("due_date") and r.get("due_date") and hasattr(r["due_date"], "isoformat"):
            d["due_date"] = r["due_date"].isoformat()
        projects.append(d)
    return jsonify({"success": True, "projects": projects})


@bp.route("/projects/<int:project_id>", methods=["GET"])
@client_required
def get_project(project_id):
    """Project detail (only if owned by this client)."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM projects WHERE id = %s AND client_id = %s AND Company_id = %s",
        (project_id, g.client_id, g.company_id),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Project not found"}), 404
    d = _serialize_row(dict(row))
    if d.get("due_date") and row.get("due_date") and hasattr(row["due_date"], "isoformat"):
        d["due_date"] = row["due_date"].isoformat()
    return jsonify(d)


@bp.route("/projects/<int:project_id>/milestones", methods=["GET"])
@client_required
def get_milestones(project_id):
    """Payment milestones for a project (only if project belongs to this client)."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM projects WHERE id = %s AND client_id = %s AND Company_id = %s",
        (project_id, g.client_id, g.company_id),
    )
    if not cur.fetchone():
        return jsonify({"success": False, "message": "Project not found"}), 404
    cur.execute(
        "SELECT * FROM payment_milestones WHERE project_id = %s AND Company_id = %s ORDER BY due_date",
        (project_id, g.company_id),
    )
    rows = cur.fetchall()
    milestones = [_serialize_row(dict(r)) for r in rows]
    return jsonify({"success": True, "milestones": milestones})


@bp.route("/projects/<int:project_id>/tasks", methods=["GET"])
@client_required
def get_tasks(project_id):
    """Tasks for a project (only if project belongs to this client)."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM projects WHERE id = %s AND client_id = %s AND Company_id = %s",
        (project_id, g.client_id, g.company_id),
    )
    if not cur.fetchone():
        return jsonify({"success": False, "message": "Project not found"}), 404
    cur.execute(
        """SELECT t.id, t.task_name, t.status, t.due_date, t.category
           FROM tasks t WHERE t.projectid = %s AND t.Company_id = %s ORDER BY t.due_date""",
        (project_id, g.company_id),
    )
    rows = cur.fetchall()
    tasks = [_serialize_row(dict(r)) for r in rows]
    return jsonify({"success": True, "tasks": tasks})
