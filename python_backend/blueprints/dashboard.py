from datetime import date, datetime, time, timedelta
from typing import Any
from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def _time_to_hhmmss(v):
    """Convert time or timedelta to HH:MM:SS string for consistent API output."""
    if isinstance(v, time):
        return v.strftime("%H:%M:%S") if v else None
    if isinstance(v, timedelta):
        total = int(v.total_seconds())
        if total < 0:
            total = 0
        h, r = divmod(total, 3600)
        m, s = divmod(r, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
    return None


def _serialize_value(v):
    if v is None:
        return None
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, timedelta):
        return _time_to_hhmmss(v)
    if isinstance(v, time):
        return _time_to_hhmmss(v)
    if isinstance(v, Decimal):
        return float(v)
    return v


def _serialize_row(d):
    return {k: _serialize_value(v) for k, v in d.items()}


# Roles that see all company projects and tasks
MANAGEMENT_ROLES = ("Technical Director", "CEO")


@bp.route("/stats", methods=["GET"])
@project_app_required
def stats():
    """KPI stats: projects the logged-in user is involved in and task counts in those projects.
    BIM Coordinator: only bim_coordinator_id or members. BIM Modeler: only members."""
    user_id = request.args.get("userid") or g.user_id
    company_id = g.company_id
    user_role = (getattr(g, "user_role", None) or "").strip()

    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # BIM Coordinator: matching frontend ProjectsBC.tsx (only bim_coordinator_id)
    if user_role in MANAGEMENT_ROLES:
        # Management roles: see all company projects and tasks
        _involved_where = "p.Company_id = %s"
    elif user_role == "BIM Coordinator":
        _involved_where = """p.Company_id = %s AND FIND_IN_SET(%s, REPLACE(IFNULL(p.bim_coordinator_id, ''), ' ', '')) > 0"""
    elif user_role == "BIM Lead":
        _involved_where = """p.Company_id = %s AND FIND_IN_SET(%s, REPLACE(IFNULL(p.lead_id, ''), ' ', '')) > 0"""
    elif user_role == "Project Manager":
        # Match projects.py: ONLY projects where they are explicitly the Project Manager
        _involved_where = """p.Company_id = %s AND FIND_IN_SET(%s, REPLACE(IFNULL(p.project_manager_id, ''), ' ', '')) > 0"""
    # BIM Modeler: only projects where user is in members list (team member)
    elif user_role == "BIM Modeler":
        _involved_where = """p.Company_id = %s AND FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(p.members,''), ','), ' ', '')) > 0"""
    else:
        # Other roles (like Project Manager): client_id, PM, lead, bim_coordinator_id, uploaderid, members
        _involved_where = """p.Company_id = %s AND (
                p.client_id = %s OR p.project_manager_id = %s OR p.lead_id = %s OR p.bim_coordinator_id = %s OR p.uploaderid = %s
                OR FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(p.members,''), ','), ' ', '')) > 0
            )"""

    def get_tasks_in_my_projects(uid, task_status):
        """Count tasks with status (InProgress/Completed/Todo) in projects the user is involved in."""
        # Aligned with frontend normalizeStatus logic
        task_status_lower = task_status.lower()
        if task_status_lower == "completed":
            status_clause = "(t.status LIKE '%%Complete%%' OR t.status = 'Done' OR t.Approval IN ('Approved', 'Rejected'))"
            status_params = []
        elif task_status_lower == "inprogress":
            status_clause = "(t.status LIKE '%%Progress%%' OR t.status = 'Started') AND (t.Approval IS NULL OR t.Approval NOT IN ('Approved', 'Rejected'))"
            status_params = []
        elif task_status_lower == "todo":
            status_clause = "t.status IN ('Todo', 'To Do', 'To_Do', 'New', 'Pending')"
            status_params = []
        else:
            status_clause = "t.status = %s"
            status_params = [task_status]

        # Use different parameters based on the _involved_where placeholders
        if user_role in MANAGEMENT_ROLES:
            t_params = (company_id,)
        elif user_role in ("BIM Coordinator", "BIM Lead", "BIM Modeler"):
            t_params = (company_id, uid)
        elif user_role == "Project Manager":
            # PM specific: only tasks in projects they manage (to match projects.py PM list)
            t_params = (company_id, uid)
        else:
            t_params = (company_id, uid, uid, uid, uid, uid, uid)

        # Append status params
        t_params += tuple(status_params)
        
        # Append modeler filter param if needed
        if user_role == "BIM Modeler":
            t_params += (uid,)

        modeler_filter = " AND t.assigned_to = %s" if user_role == "BIM Modeler" else ""

        try:
            cur.execute(
                f"""SELECT COUNT(*) AS total_tasks FROM tasks t
                    INNER JOIN projects p ON t.projectid = p.id AND {_involved_where}
                    WHERE {status_clause}{modeler_filter}""",
                t_params,
            )
            row = cur.fetchone()
            return (row or {}).get("total_tasks") or 0
        except Exception:
            return 0

    def get_total_projects(uid, status=None):
        if user_role in MANAGEMENT_ROLES:
            sql = "SELECT COUNT(*) AS total_projects FROM projects WHERE Company_id = %s"
            params = [company_id]
        elif user_role == "BIM Coordinator":
            sql = """SELECT COUNT(*) AS total_projects FROM projects
                     WHERE Company_id = %s
                       AND FIND_IN_SET(%s, REPLACE(IFNULL(bim_coordinator_id, ''), ' ', '')) > 0"""
            params = [company_id, uid]
        elif user_role == "BIM Lead":
            sql = """SELECT COUNT(*) AS total_projects FROM projects
                     WHERE Company_id = %s
                       AND FIND_IN_SET(%s, REPLACE(IFNULL(lead_id, ''), ' ', '')) > 0"""
            params = [company_id, uid]
        elif user_role == "BIM Modeler":
            sql = """SELECT COUNT(*) AS total_projects FROM projects
                     WHERE Company_id = %s
                       AND FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(members,''), ','), ' ', '')) > 0"""
            params = [company_id, uid]
        elif user_role == "Project Manager":
            # PM: ONLY projects where they are the Project Manager (matching projects.py)
            sql = """SELECT COUNT(*) AS total_projects FROM projects
                     WHERE Company_id = %s
                       AND FIND_IN_SET(%s, REPLACE(IFNULL(project_manager_id, ''), ' ', '')) > 0"""
            params = [company_id, uid]
        else:
            sql = """SELECT COUNT(*) AS total_projects FROM projects
                     WHERE Company_id = %s
                       AND (
                         client_id = %s
                         OR project_manager_id = %s
                         OR lead_id = %s
                         OR bim_coordinator_id = %s
                         OR uploaderid = %s
                         OR FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(members,''), ','), ' ', '')) > 0
                       )"""
            params = [company_id, uid, uid, uid, uid, uid, uid]
        if status == "Completed":
            sql += " AND progress = 100"
        try:
            cur.execute(sql, tuple(params))
            row = cur.fetchone()
            return (row or {}).get("total_projects") or 0
        except Exception:
            if user_role in MANAGEMENT_ROLES:
                fallback_sql = "SELECT COUNT(*) AS total_projects FROM projects WHERE Company_id = %s"
                if status == "Completed":
                    fallback_sql += " AND progress = 100"
                cur.execute(fallback_sql, (company_id,))
            elif user_role == "BIM Coordinator":
                fallback_sql = "SELECT COUNT(*) AS total_projects FROM projects WHERE Company_id = %s AND FIND_IN_SET(%s, REPLACE(IFNULL(bim_coordinator_id, ''), ' ', '')) > 0"
                if status == "Completed":
                    fallback_sql += " AND progress = 100"
                cur.execute(fallback_sql, (company_id, uid))
            elif user_role == "BIM Lead":
                fallback_sql = "SELECT COUNT(*) AS total_projects FROM projects WHERE Company_id = %s AND FIND_IN_SET(%s, REPLACE(IFNULL(lead_id, ''), ' ', '')) > 0"
                if status == "Completed":
                    fallback_sql += " AND progress = 100"
                cur.execute(fallback_sql, (company_id, uid))
            elif user_role == "BIM Modeler":
                fallback_sql = "SELECT COUNT(*) AS total_projects FROM projects WHERE Company_id = %s AND FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(members,''), ','), ' ', '')) > 0"
                if status == "Completed":
                    fallback_sql += " AND progress = 100"
                cur.execute(fallback_sql, (company_id, uid))
            else:
                fallback_sql = "SELECT COUNT(*) AS total_projects FROM projects WHERE Company_id = %s AND FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(members,''), ','), ' ', '')) > 0"
                if status == "Completed":
                    fallback_sql += " AND progress = 100"
                cur.execute(fallback_sql, (company_id, uid))
            row = cur.fetchone()
            return (row or {}).get("total_projects") or 0

    today = date.today().isoformat()
    # keeping totaltoday as is
    cur.execute(
        "SELECT COUNT(*) AS total_tasks FROM tasks WHERE (status IN ('Todo','InProgress','Pause')) AND assigned_to = %s AND DATE(due_date) = %s AND Company_id = %s",
        (user_id, today, company_id),
    )
    row = cur.fetchone()
    total_today = (row or {}).get("total_tasks") or 0

    total_projects = get_total_projects(user_id)
    completed_projects = get_total_projects(user_id, "Completed")
    # In-progress and completed task counts: all tasks in projects user is involved in (by projectid + status)
    in_progress_tasks = get_tasks_in_my_projects(user_id, "InProgress")
    completed_tasks = get_tasks_in_my_projects(user_id, "Completed")
    new_tasks = get_tasks_in_my_projects(user_id, "Todo")

    return jsonify({
        "totalProjects": total_projects,
        "completedProjects": completed_projects,
        "inProgressTasks": in_progress_tasks,
        "completedTasks": completed_tasks,
        "newTasks": new_tasks, # keeping for backward comp if needed
        "totaltoday": total_today,
    })


@bp.route("/td-stats", methods=["GET"])
@project_app_required
def td_stats():
    """Special KPI stats for Technical Director: counts all company projects and all tasks 
    (independent of project joining) to match the Team Task view counts."""
    company_id = g.company_id
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # 1. Total Projects
    cur.execute("SELECT COUNT(*) AS total FROM projects WHERE Company_id = %s", (company_id,))
    total_projects = cur.fetchone()["total"] or 0

    # 2. Completed Projects
    cur.execute("SELECT COUNT(*) AS total FROM projects WHERE Company_id = %s AND progress = 100", (company_id,))
    completed_projects = cur.fetchone()["total"] or 0

    # 3. In Progress Tasks (matching Team Task view logic)
    cur.execute(
        """SELECT COUNT(*) AS total FROM tasks 
           WHERE Company_id = %s AND status = 'InProgress' 
           AND (Approval IS NULL OR Approval NOT IN ('Approved', 'Rejected'))""",
        (company_id,)
    )
    in_progress_tasks = cur.fetchone()["total"] or 0

    # 4. Completed Tasks (matching Team Task view logic)
    cur.execute(
        """SELECT COUNT(*) AS total FROM tasks 
           WHERE Company_id = %s AND (status = 'Completed' OR Approval IN ('Approved', 'Rejected'))""",
        (company_id,)
    )
    completed_tasks = cur.fetchone()["total"] or 0

    return jsonify({
        "totalProjects": total_projects,
        "completedProjects": completed_projects,
        "inProgressTasks": in_progress_tasks,
        "completedTasks": completed_tasks
    })


@bp.route("/priority-tasks", methods=["GET"])
@project_app_required
def priority_tasks():
    """Today's priority tasks: user's tasks or team tasks (tasks in projects the user is involved in),
    using each task's due_date for today. Status Todo/InProgress/Pause. Returns task name, start/end time,
    project_name, involved persons (assignee + uploader). Ordered by due_date and start time."""
    user_id = g.user_id
    company_id = g.company_id
    user_role = (getattr(g, "user_role", None) or "").strip()
    today = date.today().isoformat()
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # Same role-based "involved projects" as stats: tasks in projects the user is involved in
    if user_role in MANAGEMENT_ROLES:
        _involved_where = "p.Company_id = %s"
        params = [company_id, company_id, today]
    elif user_role == "BIM Coordinator":
        _involved_where = """p.Company_id = %s AND FIND_IN_SET(%s, REPLACE(IFNULL(p.bim_coordinator_id, ''), ' ', '')) > 0"""
        params = [company_id, user_id, company_id, today]
    elif user_role == "BIM Lead":
        _involved_where = """p.Company_id = %s AND FIND_IN_SET(%s, REPLACE(IFNULL(p.lead_id, ''), ' ', '')) > 0"""
        params = [company_id, user_id, company_id, today]
    elif user_role == "BIM Modeler":
        _involved_where = """p.Company_id = %s AND FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(p.members,''), ','), ' ', '')) > 0"""
        params = [company_id, user_id, company_id, today]
    else:
        _involved_where = """p.Company_id = %s AND (
                p.client_id = %s OR p.project_manager_id = %s OR p.lead_id = %s OR p.bim_coordinator_id = %s OR p.uploaderid = %s
                OR FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(p.members,''), ','), ' ', '')) > 0
            )"""
        params = [company_id, user_id, user_id, user_id, user_id, user_id, user_id, company_id, today]

    if user_role in MANAGEMENT_ROLES:
        cur.execute(
            """SELECT t.id, t.task_name, t.due_date, t.status, t.category, t.perferstart_time, t.perferend_time,
                      t.projectid, t.assigned_to, t.uploaderid, t.start_time, t.end_time,
                      e_assigned.full_name AS assigned_full_name, e_assigned.profile_picture AS assigned_profile_picture,
                      e_uploader.full_name AS uploader_full_name, e_uploader.profile_picture AS uploader_profile_picture,
                      p.project_name
               FROM tasks t
               LEFT JOIN projects p ON t.projectid = p.id
               LEFT JOIN employee e_assigned ON t.assigned_to = e_assigned.id
               LEFT JOIN employee e_uploader ON t.uploaderid = e_uploader.id
               WHERE t.Company_id = %s
                 AND (t.status IN ('Todo', 'InProgress', 'Pause'))
                 AND DATE(t.due_date) = %s
               ORDER BY t.due_date ASC, COALESCE(t.perferstart_time, '00:00:00') ASC
               LIMIT 20""",
            (company_id, today),
        )
    else:
        cur.execute(
            """SELECT t.id, t.task_name, t.due_date, t.status, t.category, t.perferstart_time, t.perferend_time,
                      t.projectid, t.assigned_to, t.uploaderid, t.start_time, t.end_time,
                      e_assigned.full_name AS assigned_full_name, e_assigned.profile_picture AS assigned_profile_picture,
                      e_uploader.full_name AS uploader_full_name, e_uploader.profile_picture AS uploader_profile_picture,
                      p.project_name
               FROM tasks t
               INNER JOIN projects p ON t.projectid = p.id AND """ + _involved_where + """
               LEFT JOIN employee e_assigned ON t.assigned_to = e_assigned.id
               LEFT JOIN employee e_uploader ON t.uploaderid = e_uploader.id
               WHERE t.Company_id = %s
                 AND (t.status IN ('Todo', 'InProgress', 'Pause'))
                 AND DATE(t.due_date) = %s
               ORDER BY t.due_date ASC, COALESCE(t.perferstart_time, '00:00:00') ASC
               LIMIT 20""",
            tuple(params),
        )
    rows = cur.fetchall()
    tasks = []
    for r in rows:
        d: Any = _serialize_row(dict(r))
        # Build involved persons: assignee + uploader (dedupe by id)
        involved = []
        if d.get("assigned_to") and d.get("assigned_full_name"):
            involved.append({
                "id": d["assigned_to"],
                "full_name": d["assigned_full_name"],
                "profile_picture": d.get("assigned_profile_picture"),
            })
        if d.get("uploaderid") and d.get("uploader_full_name"):
            if not any(p.get("id") == d["uploaderid"] for p in involved):
                involved.append({
                    "id": d["uploaderid"],
                    "full_name": d["uploader_full_name"],
                    "profile_picture": d.get("uploader_profile_picture"),
                })
        d["involved_persons"] = involved
        tasks.append(d)
    return jsonify({"tasks": tasks})


@bp.route("/events", methods=["GET"])
@project_app_required
def list_events():
    """Company events (from events table) for Events & Notice section."""
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, title, detials AS details, date, start_time, end_time, location FROM events WHERE Company_id = %s ORDER BY date ASC",
            (g.company_id,),
        )
    except Exception:
        return jsonify({"events": []})
    rows = cur.fetchall()
    events = []
    for r in rows:
        d = dict(r)
        for k in ("date", "start_time", "end_time"):
            val = d.get(k)
            if isinstance(val, (datetime, date, time)):
                d[k] = val.isoformat() if hasattr(val, 'isoformat') else str(val)
            elif isinstance(val, timedelta):
                d[k] = _time_to_hhmmss(val)
        events.append(d)
    return jsonify({"events": events})


@bp.route("/announcements", methods=["GET"])
@project_app_required
def list_announcements():
    """Company announcements for dashboard."""
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, announcement_title AS title, announcement_content AS content, announcement_date AS date FROM announcements WHERE Company_id = %s ORDER BY announcement_date ASC",
            (g.company_id,),
        )
    except Exception:
        return jsonify({"announcements": []})
    rows = cur.fetchall()
    announcements = []
    for r in rows:
        d = dict(r)
        val = d.get("date")
        if isinstance(val, (datetime, date)):
            d["date"] = val.isoformat()
        announcements.append(d)
    return jsonify({"announcements": announcements})
