from datetime import date, datetime, time, timedelta
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


@bp.route("/stats", methods=["GET"])
@project_app_required
def stats():
    user_id = request.args.get("userid") or g.user_id
    company_id = g.company_id

    conn = get_db()
    cur = conn.cursor()

    # Projects where user is involved (client_id, PM, lead, bim_coordinator, uploaderid, members)
    _involved_where = """p.Company_id = %s AND (
            p.client_id = %s OR p.project_manager_id = %s OR p.lead_id = %s OR p.bim_coordinator_id = %s OR p.uploaderid = %s
            OR FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(p.members,''), ','), ' ', '')) > 0
        )"""
    def get_tasks_in_my_projects(uid, task_status):
        """Count tasks with status (InProgress/Completed/Todo) in projects the user is involved in.
        Uses JOIN to projects so we match tasks.projectid and tasks.status from the tasks table."""
        # Params: company_id, uid×6 for JOIN; then task_status for WHERE
        params = [company_id, uid, uid, uid, uid, uid, uid, task_status]
        try:
            cur.execute(
                f"""SELECT COUNT(*) AS total_tasks FROM tasks t
                    INNER JOIN projects p ON t.projectid = p.id AND {_involved_where}
                    WHERE t.status = %s""",
                params,
            )
            row = cur.fetchone()
            return (row or {}).get("total_tasks") or 0
        except Exception:
            # Fallback: subquery by members only, no JOIN (in case project columns missing)
            try:
                cur.execute(
                    """SELECT COUNT(*) AS total_tasks FROM tasks t
                       WHERE t.status = %s AND t.projectid IN (
                           SELECT id FROM projects p WHERE p.Company_id = %s
                           AND FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(p.members,''), ','), ' ', '')) > 0
                       )""",
                    (task_status, company_id, uid),
                )
                row = cur.fetchone()
                return (row or {}).get("total_tasks") or 0
            except Exception:
                return 0

    def get_total_projects(uid, status=None):
        # Count projects where user is involved: client_id, project_manager_id, lead_id,
        # bim_coordinator_id, uploaderid, or in members list
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
            # Fallback if columns missing (e.g. older schema): count by members only
            fallback_sql = "SELECT COUNT(*) AS total_projects FROM projects WHERE Company_id = %s AND FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(members,''), ','), ' ', '')) > 0"
            if status == "Completed":
                fallback_sql += " AND progress = 100"
            cur.execute(fallback_sql, (company_id, uid))
            row = cur.fetchone()
            return (row or {}).get("total_projects") or 0

    from datetime import date
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


@bp.route("/priority-tasks", methods=["GET"])
@project_app_required
def priority_tasks():
    """Today's priority tasks for current user: assigned_to = user, status Todo/InProgress/Pause, due today.
    Returns task name, start/end time (perferstart_time, perferend_time), and involved persons (assignee + uploader)
    for dynamic display and progress bar based on end time. Limit 4, ordered by due_date and start time."""
    user_id = g.user_id
    company_id = g.company_id
    today = date.today().isoformat()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT t.id, t.task_name, t.due_date, t.status, t.category, t.perferstart_time, t.perferend_time,
                  t.projectid, t.assigned_to, t.uploaderid,
                  e_assigned.full_name AS assigned_full_name, e_assigned.profile_picture AS assigned_profile_picture,
                  e_uploader.full_name AS uploader_full_name, e_uploader.profile_picture AS uploader_profile_picture,
                  p.project_name
           FROM tasks t
           LEFT JOIN employee e_assigned ON t.assigned_to = e_assigned.id
           LEFT JOIN employee e_uploader ON t.uploaderid = e_uploader.id
           LEFT JOIN projects p ON t.projectid = p.id
           WHERE t.assigned_to = %s AND t.Company_id = %s
             AND (t.status IN ('Todo', 'InProgress', 'Pause'))
             AND DATE(t.due_date) = %s
           ORDER BY t.due_date ASC, COALESCE(t.perferstart_time, '00:00:00') ASC
           LIMIT 4""",
        (user_id, company_id, today),
    )
    rows = cur.fetchall()
    tasks = []
    for r in rows:
        d = _serialize_row(dict(r))
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
    cur = conn.cursor()
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
            if d.get(k) and hasattr(d[k], "isoformat"):
                d[k] = d[k].isoformat()
            elif d.get(k) and hasattr(d[k], "strftime"):
                d[k] = d[k].strftime("%H:%M") if "time" in k else d[k].isoformat()
        events.append(d)
    return jsonify({"events": events})


@bp.route("/announcements", methods=["GET"])
@project_app_required
def list_announcements():
    """Company announcements for dashboard."""
    conn = get_db()
    cur = conn.cursor()
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
        if d.get("date") and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()
        announcements.append(d)
    return jsonify({"announcements": announcements})
