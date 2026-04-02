from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("timesheet", __name__, url_prefix="/api/timesheet")


@bp.route("/completed-tasks", methods=["POST"])
@project_app_required
def completed_tasks():
    data = request.get_json() or request.form
    # Allow wide date range if not specified
    raw_start = (data.get("startDate") or "").strip()
    raw_end = (data.get("endDate") or "").strip()
    start_date = raw_start or "1970-01-01"
    end_date = raw_end or "2999-12-31"
    employee_id = data.get("selectmembers")
    team_id = data.get("selectteam")

    conn = get_db()
    cur = conn.cursor()

    # Normalize range if client sends start > end (YYYY-MM-DD compares lexicographically)
    if start_date and end_date and start_date > end_date:
        start_date, end_date = end_date, start_date

    start_dt = start_date + " 00:00:00"
    end_dt = end_date + " 23:59:59"

    # If team_id is provided, get all employee IDs in that team
    if team_id:
        cur.execute("SELECT employee FROM team WHERE team_id = %s AND Company_id = %s", (team_id, g.company_id))
        rows = cur.fetchall()
        employee_ids = []
        for r in rows:
            emp = (r.get("employee") or "").strip()
            if emp:
                employee_ids.extend([x.strip() for x in emp.split(",") if x.strip()])
        if employee_ids:
            employee_id = ",".join(employee_ids)
        else:
            employee_id = None

    if isinstance(employee_id, list):
        employee_id = ",".join(str(x) for x in employee_id)
    
    # Build WHERE clause for employee filter
    emp_where = ""
    emp_params = []
    if employee_id:
        emp_list = [x.strip() for x in str(employee_id).split(",") if x.strip()]
        if emp_list:
            placeholders = ",".join(["%s"] * len(emp_list))
            emp_where = f"tasks.assigned_to IN ({placeholders})"
            emp_params = emp_list
    
    # Build full WHERE clause
    where_parts = ["tasks.Company_id = %s"]
    where_params = [g.company_id]
    
    if emp_where:
        where_parts.append(emp_where)
        where_params.extend(emp_params)
    
    # Filter by task start date range (prefer start_time, then Actual_start_time, then due_date as a last fallback)
    where_parts.append(
        "("
        "(tasks.start_time BETWEEN %s AND %s) "
        "OR (tasks.start_time IS NULL AND tasks.Actual_start_time BETWEEN %s AND %s) "
        "OR (tasks.start_time IS NULL AND tasks.Actual_start_time IS NULL AND tasks.due_date BETWEEN %s AND %s)"
        ")"
    )
    where_params.extend([start_dt, end_dt, start_dt, end_dt, start_dt, end_dt])
    
    where_clause = " AND ".join(where_parts)
    
    cur.execute(
        f"""SELECT tasks.id, tasks.start_time, tasks.end_time, tasks.Pause, tasks.restart, tasks.due_date,
                  tasks.task_name, tasks.perferstart_time, tasks.perferend_time, tasks.Actual_start_time,
                  e_assignee.full_name AS assigned_name,
                  e_uploader.full_name AS assigned_by_name,
                  CASE 
                      WHEN tasks.projectid IS NULL OR tasks.projectid = 0 THEN 'Others'
                      WHEN projects.project_name IS NULL THEN 'Others'
                      ELSE projects.project_name
                  END AS project_name,
                  t.teamname AS teamname
           FROM tasks
           JOIN employee e_assignee ON tasks.assigned_to = e_assignee.id
           LEFT JOIN employee e_uploader ON tasks.uploaderid = e_uploader.id
           LEFT JOIN projects ON tasks.projectid = projects.id AND projects.Company_id = %s
           LEFT JOIN team t ON FIND_IN_SET(e_assignee.id, REPLACE(CONCAT(',', t.employee, ','), ' ', '')) > 0 
               AND t.Company_id = %s
           WHERE {where_clause}
           ORDER BY tasks.id DESC""",
        [g.company_id, g.company_id] + where_params,
    )
    rows = cur.fetchall()
    tasks = []
    for r in rows:
        d = dict(r)
        for k, v in d.items():
            if v is not None:
                if isinstance(v, datetime):
                    d[k] = v.isoformat()
                elif isinstance(v, timedelta):
                    # Convert timedelta to total seconds (as integer)
                    d[k] = int(v.total_seconds())
        tasks.append(d)
    return jsonify({"completed_tasks": tasks})
