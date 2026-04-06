from datetime import date, datetime, timedelta
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("timesheet", __name__, url_prefix="/api/timesheet")

# Same scope as dashboard._count_vendor_tasks_td / vendor list_vendor_tasks (company outsource)
_VENDOR_TASK_COMPANY_SCOPE = """EXISTS (
    SELECT 1 FROM snh6_swiftproject.vendor_projects vp2
    LEFT JOIN snh6_swiftproject.projects mp
      ON mp.project_name COLLATE utf8mb4_general_ci = vp2.project_name COLLATE utf8mb4_general_ci
    WHERE vp2.id = vt.project_id AND mp.Company_id = %s
)"""


def _serialize_timesheet_row(d):
    out = dict(d)
    for k, v in list(out.items()):
        if v is None:
            continue
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, date):
            out[k] = v.isoformat()
        elif isinstance(v, timedelta):
            out[k] = int(v.total_seconds())
    return out


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

    assignee_filter_ids = None
    if employee_id:
        assignee_filter_ids = [x.strip() for x in str(employee_id).split(",") if x.strip()]
        if not assignee_filter_ids:
            assignee_filter_ids = None

    # Build WHERE clause for employee filter (internal `tasks` uses employee.id)
    emp_where = ""
    emp_params = []
    if assignee_filter_ids:
        placeholders = ",".join(["%s"] * len(assignee_filter_ids))
        emp_where = f"tasks.assigned_to IN ({placeholders})"
        emp_params = assignee_filter_ids

    # Build full WHERE clause
    where_parts = ["tasks.Company_id = %s"]
    where_params = [g.company_id]

    if emp_where:
        where_parts.append(emp_where)
        where_params.extend(emp_params)

    # Project involvement filter – matches projects.py list_projects logic
    user_role = (getattr(g, "user_role", None) or "").strip()
    # Management roles that see all company tasks for reporting
    SEE_ALL_ROLES = ("Technical Director", "CEO", "Admin", "Super Admin")

    if user_role not in SEE_ALL_ROLES:
        if user_role == "Project Manager":
            where_parts.append("FIND_IN_SET(%s, REPLACE(IFNULL(projects.project_manager_id, ''), ' ', '')) > 0")
            where_params.append(g.user_id)
        elif user_role == "BIM Lead":
            where_parts.append("FIND_IN_SET(%s, REPLACE(IFNULL(projects.lead_id, ''), ' ', '')) > 0")
            where_params.append(g.user_id)
        elif user_role == "BIM Coordinator":
            where_parts.append("FIND_IN_SET(%s, REPLACE(IFNULL(projects.bim_coordinator_id, ''), ' ', '')) > 0")
            where_params.append(g.user_id)
        else:
            # Same project involvement as list_projects — not tasks.uploaderid (task assigner),
            # which would show other people's work on projects the viewer is not on.
            where_parts.append("""(
                projects.uploaderid = %s
                OR FIND_IN_SET(%s, REPLACE(IFNULL(projects.members, ''), ' ', '')) > 0
                OR FIND_IN_SET(%s, REPLACE(IFNULL(projects.project_manager_id, ''), ' ', '')) > 0
                OR FIND_IN_SET(%s, REPLACE(IFNULL(projects.lead_id, ''), ' ', '')) > 0
                OR FIND_IN_SET(%s, REPLACE(IFNULL(projects.bim_coordinator_id, ''), ' ', '')) > 0
            )""")
            where_params.extend([g.user_id, g.user_id, g.user_id, g.user_id, g.user_id])
    
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
    
    # teamname via scalar subquery — a LEFT JOIN team would duplicate one row per team
    # the assignee belongs to (e.g. 9 teams => same task 9 times).
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
                  (SELECT GROUP_CONCAT(DISTINCT t2.teamname SEPARATOR ', ')
                   FROM team t2
                   WHERE t2.Company_id = %s
                     AND e_assignee.id IS NOT NULL
                     AND FIND_IN_SET(e_assignee.id, REPLACE(CONCAT(',', t2.employee, ','), ' ', '')) > 0
                  ) AS teamname
           FROM tasks
           LEFT JOIN employee e_assignee ON tasks.assigned_to = e_assignee.id
           LEFT JOIN employee e_uploader ON tasks.uploaderid = e_uploader.id
           LEFT JOIN projects ON tasks.projectid = projects.id AND projects.Company_id = %s
           WHERE {where_clause}
           ORDER BY tasks.id DESC""",
        [g.company_id, g.company_id] + where_params,
    )
    rows = cur.fetchall()
    tasks = [_serialize_timesheet_row(dict(r)) for r in rows]

    # TD / CEO / Admin: Team Report = in-house tasks + outsource vendor_task (same company linkage as Team Task TD)
    if user_role in SEE_ALL_ROLES:
        try:
            v_where = [_VENDOR_TASK_COMPANY_SCOPE]
            # JOIN params first (employee.Company_id matches main app scope), then EXISTS company, filters, dates
            v_params = [g.company_id, g.company_id, g.company_id]
            if assignee_filter_ids:
                ph = ",".join(["%s"] * len(assignee_filter_ids))
                v_where.append(f"vt.assigned_to IN ({ph})")
                v_params.extend(assignee_filter_ids)
            # Mirror internal date window: primary start timestamp, else due_date, else created_at
            v_where.append(
                "("
                "COALESCE("
                "TIMESTAMP(vt.start_date, COALESCE(vt.start_time, '00:00:00')), "
                "TIMESTAMP(vt.due_date, '00:00:00'), "
                "vt.created_at"
                ") BETWEEN %s AND %s"
                ")"
            )
            v_params.extend([start_dt, end_dt])
            v_sql = f"""
                SELECT
                    -vt.id AS id,
                    COALESCE(
                        TIMESTAMP(vt.start_date, COALESCE(vt.start_time, '00:00:00')),
                        vt.created_at
                    ) AS start_time,
                    CASE
                        WHEN vt.end_time IS NOT NULL
                        THEN TIMESTAMP(COALESCE(vt.start_date, vt.due_date), vt.end_time)
                        ELSE NULL
                    END AS end_time,
                    NULL AS Pause,
                    NULL AS restart,
                    vt.due_date AS due_date,
                    vt.task_name AS task_name,
                    NULL AS perferstart_time,
                    NULL AS perferend_time,
                    COALESCE(
                        TIMESTAMP(vt.start_date, COALESCE(vt.start_time, '00:00:00')),
                        vt.created_at
                    ) AS Actual_start_time,
                    COALESCE(va.full_name, e_as.full_name) AS assigned_name,
                    COALESCE(ve_cr.full_name, e_by.full_name) AS assigned_by_name,
                    COALESCE(NULLIF(TRIM(vp.project_name), ''), 'Outsource') AS project_name,
                    'Outsource' AS teamname
                FROM snh6_swiftproject.vendor_task vt
                LEFT JOIN snh6_swiftproject.vendor_projects vp ON vp.id = vt.project_id
                LEFT JOIN snh6_swiftproject.vendor_employee ve_cr ON ve_cr.id = vt.vendor_id
                LEFT JOIN employee e_by ON e_by.id = vt.vendor_id
                    AND ve_cr.id IS NULL AND e_by.Company_id = %s
                LEFT JOIN snh6_swiftproject.vendor_employee va ON va.id = vt.assigned_to
                LEFT JOIN employee e_as ON e_as.id = vt.assigned_to
                    AND va.id IS NULL AND e_as.Company_id = %s
                WHERE {' AND '.join(v_where)}
                ORDER BY vt.id DESC
            """
            cur.execute(v_sql, v_params)
            for r in cur.fetchall():
                tasks.append(_serialize_timesheet_row(dict(r)))
        except Exception:
            pass

    tasks.sort(
        key=lambda row: (row.get("start_time") or row.get("due_date") or row.get("Actual_start_time") or ""),
        reverse=True,
    )
    return jsonify({"completed_tasks": tasks})
