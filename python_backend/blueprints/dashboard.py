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

# Match tasks.list_tasks: do not count `tasks` rows for main projects tied to vendor_projects
# (those are shown as vendor_task / outsource on Team Task).
_TD_TASKS_EXCLUDE_OUTSOURCE_SQL = """NOT EXISTS (
    SELECT 1 FROM snh6_swiftproject.vendor_projects vp
    INNER JOIN projects mp ON mp.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci
    WHERE mp.id = t.projectid AND mp.Company_id = t.Company_id
)"""

def _count_vendor_projects_for_company(cur, company_id, only_completed=False):
    """
    Count outsource (vendor_projects) visible to a staff company.
    Must match vendor.py staff visibility rules (projects join, vp.Company_id fallback, vendor_bidding->projects link).
    """
    status_sql = ""
    if only_completed:
        status_sql = """
        AND (
            LOWER(COALESCE(vp.status, '')) = 'completed'
            OR (
                vp.progress REGEXP '^[0-9]+(\\.[0-9]+)?$'
                AND CAST(vp.progress AS DECIMAL(10,2)) >= 100
            )
        )
        """
    try:
        cur.execute(
            f"""
            SELECT COUNT(*) AS cnt
            FROM snh6_swiftproject.vendor_projects vp
            LEFT JOIN snh6_swiftproject.projects p
              ON (
                (vp.main_project_id IS NOT NULL AND p.id = vp.main_project_id)
                OR (p.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci)
              )
            WHERE (
                p.Company_id = %s
                OR vp.Company_id = %s
                OR EXISTS (
                    SELECT 1
                    FROM snh6_swiftproject.vendor_bidding vb2
                    JOIN snh6_swiftproject.projects p2 ON p2.id = vb2.project_id
                    WHERE vb2.id = vp.opportunity_id
                      AND p2.Company_id = %s
                )
            )
            {status_sql}
            """,
            (company_id, company_id, company_id),
        )
        row = cur.fetchone() or {}
        return int(row.get("cnt") or 0)
    except Exception:
        return 0


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

    def get_total_projects(uid, project_status=None):
        """Count projects the user is involved in."""
        params = [company_id]
        if user_role in MANAGEMENT_ROLES:
            pass
        elif user_role in ("BIM Coordinator", "BIM Lead", "BIM Modeler", "Project Manager"):
            params.append(uid)
        else:
            params.extend([uid] * 6)

        status_clause = ""
        if project_status == "Completed":
            status_clause = " AND ( (p.progress REGEXP '^[0-9]+(\\.[0-9]+)?$' AND CAST(p.progress AS DECIMAL(10,2)) >= 100) OR CAST(p.progress AS UNSIGNED) = 100 )"

        try:
            cur.execute(f"SELECT COUNT(*) AS total FROM projects p WHERE {_involved_where}{status_clause}", tuple(params))
            row = cur.fetchone()
            return (row or {}).get("total") or 0
        except Exception:
            return 0

    # Get current user's full name for matching (consistent with tasks.py)
    user_name = ""
    cur.execute("SELECT full_name FROM employee WHERE id = %s AND Company_id = %s", (user_id, company_id))
    u_row = cur.fetchone()
    if u_row:
        user_name = (u_row.get("full_name") or "").strip()

    def get_tasks_count(uid, task_status, assigned_to_me=None):
        """Count tasks with status and optional assignment filter (aligned with board logic)."""
        task_status_lower = task_status.lower()
        
        # Match board logic: delegated tasks pending review (status=Completed/progress=95)
        # appear in the assigner's TODO column on "My Task", but in COMPLETED on "Team Task".
        review_workflow_sql = """(
            t.uploaderid = %s
            AND TRIM(CAST(t.assigned_to AS CHAR)) <> TRIM(CAST(t.uploaderid AS CHAR))
            AND (t.status = 'Completed' OR t.progress = '95' OR t.status = 'Done')
            AND (t.Approval IS NULL OR t.Approval != 'Approved')
        )"""

        # Status clauses
        if task_status_lower == "completed":
            status_clause = "( (t.status LIKE '%%Complete%%' OR t.status = 'Done' OR t.Approval = 'Approved') AND (t.Approval IS NULL OR t.Approval <> 'Rejected') )"
            if assigned_to_me is True:
                # Exclude from My Completed (they are in My Todo)
                status_clause = f"( {status_clause} AND NOT {review_workflow_sql} )"
        elif task_status_lower == "inprogress":
            status_clause = "( (t.status LIKE '%%Progress%%' OR t.status = 'Started') AND (t.Approval IS NULL OR t.Approval NOT IN ('Approved', 'Rejected')) )"
        else:
            # Todo
            status_clause = "( t.status IN ('Todo', 'To Do') OR t.status IS NULL OR t.status = '' OR t.Approval = 'Rejected' )"
            if assigned_to_me is True:
                # Include in My Todo
                status_clause = f"( {status_clause} OR {review_workflow_sql} )"
        
        # Determine the base scope (Matches tasks.py:list_tasks role-based filtering)
        params = [company_id]
        if user_role in MANAGEMENT_ROLES:
            scope_clause = "1=1"
        else:
            scope_clause = f"(t.uploaderid = %s OR t.assigned_to = %s OR t.assigned_to = %s OR {_involved_where.replace('p.Company_id = %s AND ', '')})"
            params.extend([uid, uid, user_name])
            if user_role in ("BIM Coordinator", "BIM Lead", "BIM Modeler", "Project Manager"):
                params.append(uid)
            else:
                params.extend([uid] * 6)

        # Apply review_workflow_sql params if used in status_clause
        if task_status_lower in ("completed", "todo") and assigned_to_me is True:
            params.append(uid)

        # Assignment filter
        assignment_filter = ""
        if assigned_to_me is True:
            # Matches "My Task" scope in tasks.py
            assignment_filter = """ AND (
                TRIM(CAST(t.assigned_to AS CHAR)) = TRIM(CAST(%s AS CHAR))
                OR (t.assigned_to IS NOT NULL AND LOWER(TRIM(CAST(t.assigned_to AS CHAR))) = LOWER(TRIM(%s)))
                OR """ + review_workflow_sql + """
            )"""
            params.extend([uid, user_name, uid])
        elif assigned_to_me is False:
            # Team view (condition=1): exclude tasks assigned to the viewer
            assignment_filter = " AND (t.assigned_to IS NULL OR (TRIM(CAST(t.assigned_to AS CHAR)) <> TRIM(CAST(%s AS CHAR)) AND LOWER(TRIM(CAST(t.assigned_to AS CHAR))) <> LOWER(TRIM(%s))))"
            params.extend([uid, user_name])
            # Exclude self-assigned work (creator == assignee) from Team counts
            assignment_filter += """ AND (
                t.uploaderid IS NULL
                OR t.assigned_to IS NULL
                OR TRIM(CAST(t.assigned_to AS CHAR)) <> TRIM(CAST(t.uploaderid AS CHAR))
            )"""

        # Outsource delivery exclusion
        outsource_exclusion = f""" AND (
            NOT EXISTS (
                SELECT 1 FROM snh6_swiftproject.vendor_projects vp
                INNER JOIN projects mp ON mp.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci
                WHERE mp.id = t.projectid AND mp.Company_id = t.Company_id
            )
            OR t.uploaderid = %s
            OR TRIM(CAST(t.assigned_to AS CHAR)) = TRIM(CAST(%s AS CHAR))
            OR (t.assigned_to IS NOT NULL AND LOWER(TRIM(CAST(t.assigned_to AS CHAR))) = LOWER(TRIM(%s)))
        )"""
        params.extend([uid, uid, user_name])

        try:
            cur.execute(
                f"""SELECT COUNT(*) AS total_tasks FROM tasks t
                    LEFT JOIN projects p ON t.projectid = p.id
                    WHERE t.Company_id = %s AND {scope_clause} AND {status_clause}{assignment_filter}{outsource_exclusion}""",
                tuple(params),
            )
            row = cur.fetchone()
            return (row or {}).get("total_tasks") or 0
        except Exception:
            return 0




    def get_vendor_tasks_count(uid, task_status, assigned_to_me=None):
        """Count vendor_tasks with status and optional assignment filter (matches vendor.py)."""
        task_status_lower = task_status.lower()
        if task_status_lower == "completed":
            status_clause = "( (vt.status = 'Completed' OR vt.Approval = 'Approved') AND (vt.Approval IS NULL OR vt.Approval <> 'Rejected') )"
        elif task_status_lower == "inprogress":
            status_clause = "( vt.status = 'InProgress' AND (vt.Approval IS NULL OR vt.Approval NOT IN ('Approved', 'Rejected')) )"
        else:
            status_clause = "( vt.status = 'Todo' OR vt.status IS NULL OR vt.Approval = 'Rejected' )"

        params = []
        if assigned_to_me is True:
            # My Task (Outsource): Assigned to me OR (I created it and it's under review)
            where_clause = """(
                (vt.assigned_to = %s OR (vt.assigned_to IS NOT NULL AND TRIM(CAST(vt.assigned_to AS CHAR)) = %s))
                OR (vt.vendor_id = %s AND TRIM(CAST(vt.assigned_to AS CHAR)) <> TRIM(CAST(vt.vendor_id AS CHAR)) AND vt.progress IN ('95', '100', 'completed'))
            )"""
            params.extend([uid, user_name, uid, uid])
        elif assigned_to_me is False:
            # Team Task (Outsource): Not assigned to me, but in my projects
            where_clause = "NOT (vt.assigned_to = %s OR (vt.assigned_to IS NOT NULL AND TRIM(CAST(vt.assigned_to AS CHAR)) = %s))"
            params.extend([uid, user_name])
        else:
            where_clause = "1=1"

        # Security/Scope check: must be in a project linked to the user's company
        if user_role not in MANAGEMENT_ROLES:
            where_clause += """ AND (
                EXISTS (
                    SELECT 1 FROM vendor_projects vp2 
                    LEFT JOIN projects mp ON mp.project_name COLLATE utf8mb4_general_ci = vp2.project_name COLLATE utf8mb4_general_ci 
                    WHERE vp2.id = vt.project_id AND mp.Company_id = %s
                ) OR EXISTS (
                    SELECT 1 FROM projects mp2 
                    WHERE mp2.id = vt.project_id AND mp2.Company_id = %s
                )
            )"""
            params.extend([company_id, company_id])

        try:
            cur.execute(f"SELECT COUNT(*) AS total FROM vendor_task vt WHERE {status_clause} AND {where_clause}", tuple(params))
            row = cur.fetchone()
            return (row or {}).get("total") or 0
        except Exception:
            return 0



    total_projects = get_total_projects(user_id)
    completed_projects = get_total_projects(user_id, "Completed")
    
    # Task breakdowns (In-house)
    my_todo = get_tasks_count(user_id, "Todo", assigned_to_me=True)
    team_todo = get_tasks_count(user_id, "Todo", assigned_to_me=False)
    my_in_progress = get_tasks_count(user_id, "InProgress", assigned_to_me=True)
    team_in_progress = get_tasks_count(user_id, "InProgress", assigned_to_me=False)
    my_completed = get_tasks_count(user_id, "Completed", assigned_to_me=True)
    team_completed = get_tasks_count(user_id, "Completed", assigned_to_me=False)
    
    # Add vendor_task counts for BIM Lead, Coordinator, Modeler, PM
    if user_role in ("BIM Lead", "BIM Coordinator", "BIM Modeler", "Project Manager", "Technical Director"):
        v_my_ip = get_vendor_tasks_count(user_id, "InProgress", assigned_to_me=True)
        v_team_ip = get_vendor_tasks_count(user_id, "InProgress", assigned_to_me=False)
        v_my_comp = get_vendor_tasks_count(user_id, "Completed", assigned_to_me=True)
        v_team_comp = get_vendor_tasks_count(user_id, "Completed", assigned_to_me=False)
        v_my_todo = get_vendor_tasks_count(user_id, "Todo", assigned_to_me=True)
        v_team_todo = get_vendor_tasks_count(user_id, "Todo", assigned_to_me=False)

        my_in_progress += v_my_ip
        team_in_progress += v_team_ip
        my_completed += v_my_comp
        team_completed += v_team_comp
        my_todo += v_my_todo
        team_todo += v_team_todo

    # In Progress and Completed (Totals)
    in_progress_tasks = my_in_progress + team_in_progress
    completed_tasks = my_completed + team_completed
    
    # Include outsource (vendor_*) counts for Team Task counts if needed
    outsource_total_projects = _count_vendor_projects_for_company(cur, company_id, only_completed=False)
    outsource_completed_projects = _count_vendor_projects_for_company(cur, company_id, only_completed=True)
    total_projects += outsource_total_projects
    completed_projects += outsource_completed_projects
 
    if user_role == "Project Manager":
        vendor_ip = _count_vendor_tasks_td(cur, company_id, "InProgress")
        vendor_comp = _count_vendor_tasks_td(cur, company_id, "Completed")
        # Note: Project Manager team tasks already summed above for BIM roles, 
        # but PM might have specific vendor task counting needs from previous versions.
        # However, to avoid double counting if PM uses the new get_vendor_tasks_count,
        # we only add if not already included.
        # For now, let's keep PM logic consistent with the new unified approach above.
        pass


    today = date.today().isoformat()
    cur.execute(
        "SELECT COUNT(*) AS total_tasks FROM tasks WHERE (status IN ('Todo','InProgress','Pause')) AND assigned_to = %s AND DATE(due_date) = %s AND Company_id = %s",
        (user_id, today, company_id),
    )
    row = cur.fetchone()
    total_today = (row or {}).get("total_tasks") or 0

    return jsonify({
        "totalProjects": total_projects,
        "completedProjects": completed_projects,
        "inProgressTasks": in_progress_tasks,
        "completedTasks": completed_tasks,
        "myInProgressTasks": my_in_progress,
        "teamInProgressTasks": team_in_progress,
        "myCompletedTasks": my_completed,
        "teamCompletedTasks": team_completed,
        "myTodoTasks": my_todo,
        "teamTodoTasks": team_todo,
        "totaltoday": total_today,
    })


def _count_vendor_tasks_td(cur, company_id: int, status: str) -> int:
    """Count vendor_task rows for outsource work linked to main projects in this company (Team Task TD scope)."""
    try:
        cur.execute(
            """SELECT COUNT(*) AS total FROM snh6_swiftproject.vendor_task vt
               WHERE vt.status = %s
                 AND (
                   EXISTS (
                     SELECT 1 FROM snh6_swiftproject.vendor_projects vp2
                     LEFT JOIN snh6_swiftproject.projects mp
                       ON mp.project_name COLLATE utf8mb4_general_ci = vp2.project_name COLLATE utf8mb4_general_ci
                     WHERE vp2.id = vt.project_id AND mp.Company_id = %s
                   )
                   OR EXISTS (
                     SELECT 1 FROM snh6_swiftproject.projects mp2
                     WHERE mp2.id = vt.project_id AND mp2.Company_id = %s
                   )
                 )""",
            (status, company_id, company_id),
        )
        row = cur.fetchone()
        return int((row or {}).get("total") or 0)
    except Exception:
        return 0


@bp.route("/td-stats", methods=["GET"])
@project_app_required
def td_stats():
    """KPI stats for Technical Director: company projects plus task counts split by My/Team
    matching the exact filtering logic of My Task and Team Task pages."""
    company_id = g.company_id
    user_id = g.user_id
    user_name = ""
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # Get current user's full name for string-based assignment matching
    cur.execute("SELECT full_name FROM employee WHERE id = %s AND Company_id = %s", (user_id, company_id))
    emp_row = cur.fetchone()
    if emp_row:
        user_name = (emp_row["full_name"] or "").strip()

    # 1. Total Projects
    cur.execute("SELECT COUNT(*) AS total FROM projects WHERE Company_id = %s", (company_id,))
    total_projects = cur.fetchone()["total"] or 0

    # 2. Completed Projects
    cur.execute(
        """SELECT COUNT(*) AS total FROM projects
           WHERE Company_id = %s AND (
             (progress REGEXP '^[0-9]+(\\.[0-9]+)?$' AND CAST(progress AS DECIMAL(10,2)) >= 100)
             OR CAST(progress AS UNSIGNED) = 100
           )""",
        (company_id,),
    )
    completed_projects = cur.fetchone()["total"] or 0

    # 3. My In Progress: Assigned to current user
    cur.execute(
        """SELECT COUNT(*) AS total FROM tasks t
           WHERE t.Company_id = %s 
           AND t.status IN ('InProgress', 'Started')
           AND (t.Approval IS NULL OR t.Approval NOT IN ('Approved', 'Rejected'))
           AND (t.assigned_to = %s OR TRIM(t.assigned_to) = %s)
           AND (
             NOT EXISTS (
                 SELECT 1 FROM vendor_projects vp
                 INNER JOIN projects mp ON mp.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci
                 WHERE mp.id = t.projectid AND mp.Company_id = t.Company_id
             )
             OR t.uploaderid = %s
             OR TRIM(CAST(t.assigned_to AS CHAR)) = TRIM(CAST(%s AS CHAR))
             OR (t.assigned_to IS NOT NULL AND LOWER(TRIM(CAST(t.assigned_to AS CHAR))) = LOWER(TRIM(%s)))
           )""",
        (company_id, user_id, user_name, user_id, user_id, user_name),
    )
    my_in_progress = (cur.fetchone() or {}).get("total") or 0

    # 4. Team In Progress: Aligned with tasks.py:list_tasks (condition=1)
    # Excludes self-assigned tasks and tasks assigned to the viewer.
    cur.execute(
        """SELECT COUNT(*) AS total FROM tasks t
           WHERE t.Company_id = %s 
           AND t.status IN ('InProgress', 'Started')
           AND (t.Approval IS NULL OR t.Approval NOT IN ('Approved', 'Rejected'))
           AND (t.uploaderid IS NULL OR t.assigned_to IS NULL OR TRIM(CAST(t.assigned_to AS CHAR)) <> TRIM(CAST(t.uploaderid AS CHAR)))
           AND (t.assigned_to IS NOT NULL AND t.assigned_to <> %s AND TRIM(t.assigned_to) <> %s)
           AND (
             NOT EXISTS (
                 SELECT 1 FROM vendor_projects vp
                 INNER JOIN projects mp ON mp.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci
                 WHERE mp.id = t.projectid AND mp.Company_id = t.Company_id
             )
             OR t.uploaderid = %s
             OR TRIM(CAST(t.assigned_to AS CHAR)) = TRIM(CAST(%s AS CHAR))
             OR (t.assigned_to IS NOT NULL AND LOWER(TRIM(CAST(t.assigned_to AS CHAR))) = LOWER(TRIM(%s)))
           )""",
        (company_id, user_id, user_name, user_id, user_id, user_name),
    )
    team_in_progress = (cur.fetchone() or {}).get("total") or 0
    # Add vendor tasks to team count
    team_in_progress += _count_vendor_tasks_td(cur, company_id, "InProgress")

    # 5. My Completed
    cur.execute(
        """SELECT COUNT(*) AS total FROM tasks t
           WHERE t.Company_id = %s 
           AND (t.status = 'Completed' OR t.Approval IN ('Approved', 'Rejected'))
           AND (t.assigned_to = %s OR TRIM(t.assigned_to) = %s)
           AND (
             NOT EXISTS (
                 SELECT 1 FROM vendor_projects vp
                 INNER JOIN projects mp ON mp.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci
                 WHERE mp.id = t.projectid AND mp.Company_id = t.Company_id
             )
             OR t.uploaderid = %s
             OR TRIM(CAST(t.assigned_to AS CHAR)) = TRIM(CAST(%s AS CHAR))
             OR (t.assigned_to IS NOT NULL AND LOWER(TRIM(CAST(t.assigned_to AS CHAR))) = LOWER(TRIM(%s)))
           )""",
        (company_id, user_id, user_name, user_id, user_id, user_name),
    )
    my_completed = (cur.fetchone() or {}).get("total") or 0

    # 6. Team Completed
    cur.execute(
        """SELECT COUNT(*) AS total FROM tasks t
           WHERE t.Company_id = %s 
           AND (t.status = 'Completed' OR t.Approval IN ('Approved', 'Rejected'))
           AND (t.uploaderid IS NULL OR t.assigned_to IS NULL OR TRIM(CAST(t.assigned_to AS CHAR)) <> TRIM(CAST(t.uploaderid AS CHAR)))
           AND (t.assigned_to IS NOT NULL AND t.assigned_to <> %s AND TRIM(t.assigned_to) <> %s)
           AND (
             NOT EXISTS (
                 SELECT 1 FROM vendor_projects vp
                 INNER JOIN projects mp ON mp.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci
                 WHERE mp.id = t.projectid AND mp.Company_id = t.Company_id
             )
             OR t.uploaderid = %s
             OR TRIM(CAST(t.assigned_to AS CHAR)) = TRIM(CAST(%s AS CHAR))
             OR (t.assigned_to IS NOT NULL AND LOWER(TRIM(CAST(t.assigned_to AS CHAR))) = LOWER(TRIM(%s)))
           )""",
        (company_id, user_id, user_name, user_id, user_id, user_name),
    )
    team_completed = (cur.fetchone() or {}).get("total") or 0
    # Add vendor tasks to team count
    team_completed += _count_vendor_tasks_td(cur, company_id, "Completed")

    total_in_progress = my_in_progress + team_in_progress
    total_completed = my_completed + team_completed

    return jsonify({
        "totalProjects": total_projects,
        "completedProjects": completed_projects,
        "inProgressTasks": total_in_progress,
        "completedTasks": total_completed,
        "myInProgressTasks": my_in_progress,
        "teamInProgressTasks": team_in_progress,
        "myCompletedTasks": my_completed,
        "teamCompletedTasks": team_completed
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
