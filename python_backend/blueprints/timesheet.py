from datetime import datetime
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("timesheet", __name__, url_prefix="/api/timesheet")


@bp.route("/completed-tasks", methods=["POST"])
@project_app_required
def completed_tasks():
    data = request.get_json() or request.form
    start_date = (data.get("startDate") or "").strip() or datetime.now().strftime("%Y-%m-%d")
    end_date = (data.get("endDate") or "").strip() or datetime.now().strftime("%Y-%m-%d")
    employee_id = data.get("selectmembers") or g.user_id
    team_id = data.get("selectteam")

    conn = get_db()
    cur = conn.cursor()

    if team_id:
        cur.execute("SELECT employee FROM team WHERE team_id = %s AND Company_id = %s", (team_id, g.company_id))
        rows = cur.fetchall()
        employee_ids = []
        for r in rows:
            emp = (r.get("employee") or "").strip()
            if emp:
                employee_ids.extend([x.strip() for x in emp.split(",") if x.strip()])
        employee_id = ",".join(employee_ids) if employee_ids else g.user_id

    start_dt = start_date + " 00:00:00"
    end_dt = end_date + " 23:59:59"

    if isinstance(employee_id, list):
        employee_id = ",".join(str(x) for x in employee_id)
    emp_list = [x.strip() for x in str(employee_id).split(",") if x.strip()]
    if not emp_list:
        emp_list = [g.user_id]
    placeholders = ",".join(["%s"] * len(emp_list))
    cur.execute(
        """SELECT tasks.id, tasks.start_time, tasks.end_time, tasks.Pause, tasks.restart, tasks.due_date,
                  tasks.task_name, tasks.perferstart_time, tasks.perferend_time, tasks.Actual_start_time,
                  employee.full_name AS assigned_name,
                  CASE WHEN tasks.projectid = 0 THEN 'Others' ELSE projects.project_name END AS project_name
           FROM tasks
           JOIN employee ON tasks.assigned_to = employee.id
           LEFT JOIN projects ON tasks.projectid = projects.id
           WHERE tasks.assigned_to IN (%s) AND tasks.end_time BETWEEN %%s AND %%s AND tasks.status = 'Completed'
           ORDER BY tasks.id DESC""" % placeholders,
        emp_list + [start_dt, end_dt],
    )
    rows = cur.fetchall()
    tasks = []
    for r in rows:
        d = dict(r)
        for k in ("start_time", "end_time", "Pause", "restart", "due_date"):
            if d.get(k) and hasattr(d[k], "isoformat"):
                d[k] = d[k].isoformat()
        tasks.append(d)
    return jsonify({"completed_tasks": tasks})
