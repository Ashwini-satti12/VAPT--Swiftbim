from datetime import datetime, date, timedelta, time
from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")


def _serialize_value(v):
    """Convert datetime/timedelta/time/Decimal to JSON-serializable form."""
    if v is None:
        return None
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, timedelta):
        return str(v)
    if isinstance(v, time):
        return v.strftime("%H:%M:%S")
    if isinstance(v, Decimal):
        return float(v)
    return v


def _serialize_row(d):
    """Ensure all values in dict are JSON-serializable."""
    out = {}
    for k, v in d.items():
        out[k] = _serialize_value(v)
    return out


def _task_row_merge_joined_project_name(row_dict):
    """
    SELECT t.*, p.project_name yields duplicate keys in some MySQL clients:
    tasks.project_name may be NULL while projects.project_name is set.
    Prefer the explicit join column when present.
    """
    d = dict(row_dict)
    join_name = d.pop("_join_project_name", None)
    if join_name is not None and str(join_name).strip() != "":
        d["project_name"] = join_name
    return d


# Roles that see all company projects and tasks
MANAGEMENT_ROLES = ("Technical Director", "CEO")


def _ensure_tasks_review_remark_column(cur):
    """Ensure `tasks.review_remark` exists for review/rework loop."""
    try:
        cur.execute(
            """
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'tasks'
              AND COLUMN_NAME = 'review_remark'
            LIMIT 1
            """
        )
        if cur.fetchone() is None:
            cur.execute("ALTER TABLE tasks ADD COLUMN review_remark TEXT NULL")
    except Exception:
        # fail open: feature will just not persist remark if schema can't be altered
        pass


def _progress(conn, project_id):
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) AS completed_count FROM tasks WHERE projectid = %s AND status = 'Completed'",
        (project_id,),
    )
    completed = (cur.fetchone() or {}).get("completed_count") or 0
    cur.execute("SELECT COUNT(*) AS total_count FROM tasks WHERE projectid = %s", (project_id,))
    total = (cur.fetchone() or {}).get("total_count") or 0
    if total == 0:
        return 0
    return round(float(completed / total) * 100, 2)


@bp.route("/<int:task_id>/status", methods=["PATCH", "POST"])
@project_app_required
def update_status(task_id):
    data = request.get_json() or request.form
    status = data.get("status")
    project_id = data.get("projectId")
    if not status:
        return jsonify({"success": False, "error": "status required"}), 400

    conn = get_db()
    cur = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    status_lower = status.lower().replace(" ", "")
    
    if status_lower in ["inprogress", "started"]:
        cur.execute("UPDATE tasks SET status = 'InProgress', start_time = %s WHERE id = %s", (now, task_id))
    elif status_lower in ["completed", "done"]:
        cur.execute("UPDATE tasks SET status = 'Completed', end_time = %s WHERE id = %s", (now, task_id))
    elif status_lower in ["todo", "new", "pending"]:
        cur.execute("UPDATE tasks SET status = 'To Do', start_time = NULL, end_time = NULL WHERE id = %s", (task_id,))
    elif status_lower == "pause":
        cur.execute("UPDATE tasks SET status = 'Pause', Pause = %s WHERE id = %s", (now, task_id))
    elif status_lower == "continue":
        cur.execute("UPDATE tasks SET status = 'InProgress', restart = %s WHERE id = %s", (now, task_id))
    elif status_lower == "approved":
        cur.execute("UPDATE tasks SET Approval = 'Approved' WHERE id = %s", (task_id,))
    elif status_lower == "rejected":
        cur.execute("UPDATE tasks SET Approval = 'Rejected' WHERE id = %s", (task_id,))
    else:
        return jsonify({"success": False, "error": f"Invalid status: {status}"}), 400

    progress = 0
    if project_id:
        progress = _progress(conn, project_id)
        cur.execute("UPDATE projects SET progress = %s WHERE id = %s", (progress, project_id))

    return jsonify({"success": True, "progress": progress})


@bp.route("", methods=["GET"])
@project_app_required
def list_tasks():
    """List tasks with optional filters: employeeid, condition, status, project.
    When condition=1 (management/team view), omit employeeid or pass employeeid=all for all
    assignees in scope; pass a numeric employeeid to restrict to one assignee."""
    employeeid_param = request.args.get("employeeid")
    condition = request.args.get("condition")
    assigned_by = request.args.get("assignedby")
    status = request.args.get("status")
    project_id = request.args.get("project_id")
    company_id = g.company_id

    conn = get_db()
    cur = conn.cursor()
    where = ["t.Company_id = %s"]
    params = [company_id]

    user_role = (getattr(g, "user_role", None) or "").strip()

    is_team_view = condition == "1"
    if is_team_view:
        # Management view: can see all tasks, or filter by Myself/Others or by employee
        if assigned_by == "Myself":
            where.append("t.assigned_to = t.uploaderid")
        elif assigned_by == "Others":
            where.append("t.assigned_to != t.uploaderid")
        elif (
            employeeid_param is not None
            and str(employeeid_param).strip() != ""
            and str(employeeid_param) != "all"
        ):
            where.append("t.assigned_to = %s")
            params.append(employeeid_param)
        # else: no assigned_to filter → all tasks in scope (not defaulted to current user;
        # defaulting omitted employeeid to g.user_id broke team/tracker views that need every assignee.)

        # Add project level filtering for non-management roles to match dashboard.
        # Always include tasks directly assigned to / created by current user.
        if user_role not in MANAGEMENT_ROLES:
            if user_role == "BIM Coordinator":
                where.append(
                    """(
                        t.assigned_to = %s
                        OR t.uploaderid = %s
                        OR FIND_IN_SET(%s, REPLACE(IFNULL(p.bim_coordinator_id, ''), ' ', '')) > 0
                    )"""
                )
                params.extend([g.user_id, g.user_id, g.user_id])
            elif user_role == "BIM Lead":
                where.append(
                    """(
                        t.assigned_to = %s
                        OR t.uploaderid = %s
                        OR FIND_IN_SET(%s, REPLACE(IFNULL(p.lead_id, ''), ' ', '')) > 0
                    )"""
                )
                params.extend([g.user_id, g.user_id, g.user_id])
            elif user_role == "BIM Modeler":
                where.append(
                    """(
                        t.assigned_to = %s
                        OR t.uploaderid = %s
                        OR FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(p.members,''), ','), ' ', '')) > 0
                    )"""
                )
                params.extend([g.user_id, g.user_id, g.user_id])
            elif user_role == "Project Manager":
                # Match projects.py and dashboard /stats: only projects where user is Project Manager
                where.append(
                    """(
                        t.assigned_to = %s
                        OR t.uploaderid = %s
                        OR FIND_IN_SET(%s, REPLACE(IFNULL(p.project_manager_id, ''), ' ', '')) > 0
                    )"""
                )
                params.extend([g.user_id, g.user_id, g.user_id])
            else:
                # Consultant and other roles: any project involvement
                where.append(
                    """(
                        t.assigned_to = %s
                        OR t.uploaderid = %s
                        OR p.client_id = %s OR p.project_manager_id = %s OR p.lead_id = %s OR p.bim_coordinator_id = %s OR p.uploaderid = %s
                        OR FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(p.members,''), ','), ' ', '')) > 0
                    )"""
                )
                params.extend([g.user_id, g.user_id, g.user_id, g.user_id, g.user_id, g.user_id, g.user_id, g.user_id])
    else:
        # My task / employee view:
        # 1) Keep all tasks assigned to me.
        # 2) Keep self-created/self-assigned tasks.
        # 3) For tasks I assigned to others:
        #    - hide until they are completed (then return to creator for review in My Task -> To Do)
        #    - if creator moves to InProgress for review AND review_remark is empty, keep in creator My Task
        #    - once review_remark is entered (send back), remove from creator My Task (it will be visible in Team Task)
        # Legacy frontend may send employeeid=all even for My Task. In that case,
        # default to current user instead of filtering by literal string "all".
        if employeeid_param is None or str(employeeid_param).strip() == "" or str(employeeid_param).strip().lower() == "all":
            employee_id = g.user_id
        else:
            employee_id = employeeid_param
        where.append(
            """(
                t.assigned_to = %s
                OR (t.uploaderid = %s AND t.assigned_to = t.uploaderid)
                OR (
                    t.uploaderid = %s
                    AND t.assigned_to <> t.uploaderid
                    AND (
                        t.status = 'Completed'
                        OR (
                            t.status = 'InProgress'
                            AND (t.review_remark IS NULL OR TRIM(t.review_remark) = '')
                        )
                    )
                )
            )"""
        )
        params.extend([employee_id, employee_id, employee_id])

    if status:
        if status == 'todo':
            # Backward compatibility: old rows may use "To Do", "Todo", or NULL.
            if is_team_view:
                where.append("(t.status IN ('Todo', 'To Do') OR t.status IS NULL OR TRIM(t.status) = '')")
            else:
                # In My Task, completed tasks assigned by me to others are review items:
                # surface them under To Do.
                where.append(
                    """(
                        t.status IN ('Todo', 'To Do')
                        OR t.status IS NULL
                        OR TRIM(t.status) = ''
                        OR (
                            t.uploaderid = %s
                            AND t.assigned_to <> t.uploaderid
                            AND t.status = 'Completed'
                        )
                    )"""
                )
                params.append(g.user_id)
        elif status == 'in_progress':
            where.append(
                "(t.status IN ('InProgress', 'Started')) AND (t.Approval IS NULL OR t.Approval NOT IN ('Approved', 'Rejected'))"
            )
        elif status == 'completed':
            if is_team_view:
                where.append("(t.status = 'Completed' OR t.Approval IN ('Approved', 'Rejected'))")
            else:
                # Exclude creator review items from My Task completed bucket;
                # they are intentionally shown in To Do.
                where.append(
                    """(
                        (t.status = 'Completed' OR t.Approval IN ('Approved', 'Rejected'))
                        AND NOT (
                            t.uploaderid = %s
                            AND t.assigned_to <> t.uploaderid
                            AND t.status = 'Completed'
                        )
                    )"""
                )
                params.append(g.user_id)
        else:
            where.append("t.status = %s")
            params.append(status)
    if project_id:
        where.append("t.projectid = %s")
        params.append(project_id)

    # Outsource delivery is tracked in vendor_task; generally avoid parallel rows from `tasks`
    # for linked vendor projects. But keep directly involved rows visible so creators/assignees
    # (e.g., BIM Modeler who just added task) never lose their task.
    where.append(
        """(
            NOT EXISTS (
                SELECT 1 FROM snh6_swiftproject.vendor_projects vp
                INNER JOIN projects mp ON mp.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci
                WHERE mp.id = t.projectid AND mp.Company_id = t.Company_id
            )
            OR t.uploaderid = %s
            OR t.assigned_to = %s
        )"""
    )
    params.extend([g.user_id, g.user_id])

    sql = f"""SELECT t.*, e_assigned.full_name AS assigned_full_name, e_uploader.full_name AS uploader_full_name,
              e_assigned.profile_picture AS assigned_profile_picture, e_uploader.profile_picture AS uploader_profile_picture,
              p.project_name AS _join_project_name
              FROM tasks t
              LEFT JOIN employee e_assigned ON t.assigned_to = e_assigned.id
              LEFT JOIN employee e_uploader ON t.uploaderid = e_uploader.id
              LEFT JOIN projects p ON t.projectid = p.id
              WHERE {' AND '.join(where)}
              ORDER BY t.created_at DESC"""
    cur.execute(sql, params)
    rows = cur.fetchall()
    tasks = [_serialize_row(_task_row_merge_joined_project_name(dict(r))) for r in rows]
    if not is_team_view:
        # Creator-review flow: once assignee completes a delegated task, show it in My Task as To Do.
        for t in tasks:
            try:
                assigned_to = t.get("assigned_to")
                uploaderid = t.get("uploaderid")
                if (
                    assigned_to is not None
                    and uploaderid is not None
                    and str(assigned_to) != str(uploaderid)
                    and str(uploaderid) == str(g.user_id)
                    and str(t.get("status") or "").strip().lower() == "completed"
                ):
                    # Mark as review item for frontend.
                    t["review_required"] = True
                    t["status_original"] = t.get("status")
                    t["status"] = "Todo"
            except Exception:
                continue
    return jsonify({"tasks": tasks})


@bp.route("", methods=["POST"])
@project_app_required
def create_task():
    data = request.get_json() or request.form
    conn = get_db()
    cur = conn.cursor()

    # Robust extraction of fields with aliases
    project_id = (
        data.get("project_id")
        or data.get("projectid")
        or data.get("projectId")
    )
    project_name = data.get("project_name")
    if not project_id and project_name:
        cur.execute(
            "SELECT id FROM projects WHERE project_name = %s AND Company_id = %s",
            (project_name, g.company_id),
        )
        row = cur.fetchone()
        if row:
            # handle dict-like or tuple-like row
            project_id = row["id"] if isinstance(row, dict) else row[0]

    task_name = data.get("task_name") or data.get("taskName")
    assigned_to = (
        data.get("assigned_to")
        or data.get("assignedTo")
        or data.get("assign_to")
        or data.get("assignedToId")
    )
    # If assigned_to is a name, try to resolve to ID (optional but helpful)
    if assigned_to and not str(assigned_to).isdigit():
        cur.execute(
            "SELECT id FROM employee WHERE full_name = %s AND Company_id = %s",
            (assigned_to, g.company_id),
        )
        row = cur.fetchone()
        if row:
            assigned_to = row["id"] if isinstance(row, dict) else row[0]

    due_date = data.get("due_date") or data.get("dueDate")
    category = data.get("category") or data.get("type") or ""
    description = data.get("description") or ""
    checklist = data.get("checklist") or ""
    start_date = (
        data.get("start_date")
        or data.get("startdate")
        or data.get("actualStartDate")
        or ""
    )
    modules = data.get("modules_name") or data.get("modules") or data.get("module") or ""

    # Preferred times
    prefer_start = data.get("perferstart_time") or data.get("startTime") or data.get("start_time")
    prefer_end = data.get("perferend_time") or data.get("dueTime") or data.get("due_time")

    status = data.get("status") or "Todo"
    import random

    ticket = "T-" + str(random.randint(10, 10000))
    document_attachment = ""

    cur.execute(
        """INSERT INTO tasks (projectid, uploaderid, task_name, assigned_to, due_date, category, description, checklist,
           document_attachment, status, ticket, Actual_start_time, modules_name, perferstart_time, perferend_time, Company_id)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            project_id,
            g.user_id,
            task_name,
            assigned_to,
            due_date,
            category,
            description,
            checklist,
            document_attachment,
            status,
            ticket,
            start_date,
            modules,
            prefer_start,
            prefer_end,
            g.company_id,
        ),
    )
    task_id = cur.lastrowid

    # Notification: assigned task to someone else
    try:
        if assigned_to and str(assigned_to).isdigit() and int(assigned_to) != int(g.user_id):
            # ensure deep-link columns exist
            try:
                cur.execute(
                    "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'entity_type' LIMIT 1"
                )
                if cur.fetchone() is None:
                    cur.execute("ALTER TABLE notifications ADD COLUMN entity_type VARCHAR(50) NULL")
                cur.execute(
                    "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'entity_id' LIMIT 1"
                )
                if cur.fetchone() is None:
                    cur.execute("ALTER TABLE notifications ADD COLUMN entity_id INT NULL")
            except Exception:
                pass

            # Fetch project name and uploader name for message
            pname = ""
            if project_id:
                cur.execute(
                    "SELECT project_name FROM projects WHERE id = %s AND Company_id = %s",
                    (project_id, g.company_id),
                )
                prow = cur.fetchone()
                if prow:
                    pname = prow.get("project_name") or ""
            cur.execute(
                "SELECT full_name FROM employee WHERE id = %s AND Company_id = %s",
                (g.user_id, g.company_id),
            )
            urow = cur.fetchone() or {}
            uploader_name = urow.get("full_name") or "Someone"

            title = "Task assigned"
            msg = f"{uploader_name} assigned a task to you"
            if pname:
                msg += f" in '{pname}'"
            if task_name:
                msg += f": {task_name}"

            cur.execute(
                """
                INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                """,
                (int(assigned_to), project_id or None, title, msg, "task_assigned", "task", task_id, g.company_id),
            )
    except Exception:
        pass

    return jsonify({"success": True, "task_id": task_id, "ticket": ticket})


@bp.route("/<int:task_id>", methods=["GET"])
@project_app_required
def get_task(task_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT t.*, e_assigned.full_name AS assigned_full_name, e_uploader.full_name AS uploader_full_name,
              p.project_name AS _join_project_name FROM tasks t
              LEFT JOIN employee e_assigned ON t.assigned_to = e_assigned.id
              LEFT JOIN employee e_uploader ON t.uploaderid = e_uploader.id
              LEFT JOIN projects p ON t.projectid = p.id
              WHERE t.id = %s AND t.Company_id = %s""",
        (task_id, g.company_id),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Task not found"}), 404
    merged = _task_row_merge_joined_project_name(dict(row))
    return jsonify(_serialize_row(merged))


@bp.route("/<int:task_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_task(task_id):
    data = request.get_json() or request.form
    conn = get_db()
    cur = conn.cursor()
    _ensure_tasks_review_remark_column(cur)
    # Build dynamic update
    allowed = ("task_name", "assigned_to", "due_date", "category", "description", "checklist", "review_remark", "status", "modules_name", "Actual_start_time", "perferstart_time", "perferend_time", "outputfilepath")
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(data[key])
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
    params.append(task_id)
    params.append(g.company_id)
    cur.execute(
        "UPDATE tasks SET " + ", ".join(sets) + " WHERE id = %s AND Company_id = %s",
        params,
    )
    # Review cycle rule:
    # If assigner enters a review remark on a delegated task, return it to assignee in To Do.
    try:
        remark = ""
        if isinstance(data, dict):
            remark = str(data.get("review_remark") or "").strip()
        if remark:
            cur.execute(
                "SELECT uploaderid, assigned_to FROM tasks WHERE id = %s AND Company_id = %s LIMIT 1",
                (task_id, g.company_id),
            )
            row = cur.fetchone() or {}
            uploaderid = row.get("uploaderid")
            assigned_to = row.get("assigned_to")
            is_delegated = (
                uploaderid is not None
                and assigned_to is not None
                and str(uploaderid) != str(assigned_to)
            )
            is_current_user_assigner = uploaderid is not None and str(uploaderid) == str(
                getattr(g, "user_id", None)
            )
            if is_delegated and is_current_user_assigner:
                cur.execute(
                    """
                    UPDATE tasks
                    SET status = 'To Do',
                        Approval = NULL,
                        start_time = NULL,
                        end_time = NULL
                    WHERE id = %s AND Company_id = %s
                    """,
                    (task_id, g.company_id),
                )
    except Exception:
        pass

    conn.commit()
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Task not found"}), 404


@bp.route("/<int:task_id>", methods=["DELETE"])
@project_app_required
def delete_task(task_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM tasks WHERE id = %s AND Company_id = %s", (task_id, g.company_id))
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Task not found"}), 404


@bp.route("/<int:task_id>/output-files", methods=["POST"])
@project_app_required
def upload_output_files(task_id):
    files = request.files.getlist("image") or request.files.getlist("image[]")
    if not files:
        return jsonify({"success": False, "message": "No files uploaded"}), 400
    import os
    import uuid
    from flask import current_app
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "task")
    os.makedirs(upload_dir, exist_ok=True)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT outputfilepath FROM tasks WHERE id = %s AND Company_id = %s", (task_id, g.company_id))
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Task not found"}), 404
    existing = (row.get("outputfilepath") or "").strip()
    names = []
    for f in files:
        if f.filename:
            ext = os.path.splitext(f.filename)[1]
            name = str(uuid.uuid4()) + "_" + "".join(c for c in f.filename if c.isalnum() or c in "._-")
            path = os.path.join(upload_dir, name)
            f.save(path)
            names.append(name)
    new_path = (existing + "," + ",".join(names)) if existing else ",".join(names)
    cur.execute("UPDATE tasks SET outputfilepath = %s WHERE id = %s AND Company_id = %s", (new_path, task_id, g.company_id))
    return jsonify({"success": True, "files": names})
