from datetime import date, datetime, time, timedelta
from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def _serialize_value(v):
    if v is None:
        return None
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, timedelta):
        return str(v)
    if isinstance(v, time):
        return v.strftime("%H:%M:%S") if v else None
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

    def get_total_tasks(status, uid):
        cur.execute(
            "SELECT COUNT(*) AS total_tasks FROM tasks WHERE status = %s AND assigned_to = %s AND Company_id = %s",
            (status, uid, company_id),
        )
        row = cur.fetchone()
        return (row or {}).get("total_tasks") or 0

    def get_total_projects(uid):
        cur.execute(
            "SELECT COUNT(*) AS total_projects FROM projects WHERE FIND_IN_SET(%s, REPLACE(members, ' ', '')) AND Company_id = %s",
            (uid, company_id),
        )
        row = cur.fetchone()
        return (row or {}).get("total_projects") or 0

    from datetime import date
    today = date.today().isoformat()
    cur.execute(
        "SELECT COUNT(*) AS total_tasks FROM tasks WHERE (status IN ('Todo','InProgress','Pause')) AND assigned_to = %s AND DATE(due_date) = %s AND Company_id = %s",
        (user_id, today, company_id),
    )
    row = cur.fetchone()
    total_today = (row or {}).get("total_tasks") or 0

    total_projects = get_total_projects(user_id)
    new_tasks = get_total_tasks("Todo", user_id)
    in_progress_tasks = get_total_tasks("InProgress", user_id)

    return jsonify({
        "newTasks": new_tasks,
        "newTask": new_tasks,
        "inProgressTasks": in_progress_tasks,
        "completedTasks": total_projects,
        "totaltoday": total_today,
    })


@bp.route("/priority-tasks", methods=["GET"])
@project_app_required
def priority_tasks():
    """Today's priority tasks: assigned to user, status Todo/InProgress/Pause, due today. Limit 4."""
    user_id = g.user_id
    company_id = g.company_id
    today = date.today().isoformat()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT t.id, t.task_name, t.due_date, t.status, t.category, t.perferstart_time, t.perferend_time,
                  t.projectid, e_assigned.full_name AS assigned_full_name, e_assigned.profile_picture AS assigned_profile_picture,
                  e_uploader.profile_picture AS uploader_profile_picture, p.project_name
           FROM tasks t
           LEFT JOIN employee e_assigned ON t.assigned_to = e_assigned.id
           LEFT JOIN employee e_uploader ON t.uploaderid = e_uploader.id
           LEFT JOIN projects p ON t.projectid = p.id
           WHERE t.assigned_to = %s AND t.Company_id = %s
             AND (t.status IN ('Todo', 'InProgress', 'Pause'))
             AND DATE(t.due_date) <= %s AND DATE(t.due_date) >= %s
           ORDER BY t.due_date LIMIT 4""",
        (user_id, company_id, today, today),
    )
    rows = cur.fetchall()
    tasks = [_serialize_row(dict(r)) for r in rows]
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
