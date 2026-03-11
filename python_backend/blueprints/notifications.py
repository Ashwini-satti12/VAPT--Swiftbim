from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@bp.route("", methods=["GET"])
@project_app_required
def list_notifications():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT n.*, p.project_name
           FROM notifications n
           LEFT JOIN projects p ON n.project_id = p.id
           WHERE n.user_id = %s AND n.Company_id = %s AND n.is_read = 0
           ORDER BY n.created_at DESC
           LIMIT 10""",
        (g.user_id, g.company_id),
    )
    rows = cur.fetchall()
    notifications = []
    for r in rows:
        notifications.append({
            "id": r["id"],
            "title": r.get("title"),
            "message": r.get("message"),
            "type": r.get("type"),
            "project_name": r.get("project_name") or "Project",
            "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
        })
    return jsonify({"count": len(notifications), "notifications": notifications})


@bp.route("/<int:notification_id>/read", methods=["POST"])
@project_app_required
def mark_read(notification_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE notifications SET is_read = 1 WHERE id = %s AND user_id = %s AND Company_id = %s",
        (notification_id, g.user_id, g.company_id),
    )
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Failed to mark notification as read"}), 400


@bp.route("/read-all", methods=["POST"])
@project_app_required
def mark_all_read():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE notifications SET is_read = 1 WHERE user_id = %s AND Company_id = %s",
        (g.user_id, g.company_id),
    )
    return jsonify({"success": True})


@bp.route("/tasks", methods=["GET"])
@project_app_required
def task_notifications():
    """Task-based notifications (unread assignments, due today, etc.) - for bell dropdown."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT t.id AS taskId, t.task_name AS taskName, t.due_date, t.status, t.ring, t.description AS description_text, t.created_at,
                  e_uploader.full_name AS uploader_full_name, e_uploader.profile_picture AS uploader_profile_picture
           FROM tasks t
           LEFT JOIN employee e_assigned ON t.assigned_to = e_assigned.id
           LEFT JOIN employee e_uploader ON t.uploaderid = e_uploader.id
           WHERE t.assigned_to = %s AND t.uploaderid != t.assigned_to AND t.ring = 0
           ORDER BY t.created_at DESC""",
        (g.user_id,),
    )
    rows = cur.fetchall()
    from datetime import datetime
    today_str = datetime.now().strftime("%d %B %Y")
    notifications = []
    for r in rows:
        due = r.get("due_date")
        due_str = due.strftime("%d %B %Y") if due else ""
        status = r.get("status") or ""
        created = r.get("created_at")
        created_str = created.strftime("%d %B %Y") if created else ""
        message = ""
        if status in ("Todo", "InProgress") and due_str == today_str and due_str != created_str:
            message = "Due today"
        elif status == "Todo" and due:
            # Check if actual start time passed
            pass  # Can add "Need to initiate" logic
        notifications.append({
            "taskId": r["taskId"],
            "taskName": r.get("taskName"),
            "image": r.get("uploader_profile_picture"),
            "date": due_str,
            "message": message,
            "uploader": r.get("uploader_full_name"),
            "dec": due_str,
            "ring": r.get("ring"),
        })
    return jsonify({"count": len(notifications), "notifications": notifications})


@bp.route("/tasks/<int:task_id>/read", methods=["POST"])
@project_app_required
def mark_task_notification_read(task_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE tasks SET ring = 1 WHERE id = %s AND Company_id = %s AND assigned_to = %s",
        (task_id, g.company_id, g.user_id),
    )
    if cur.rowcount:
        return jsonify({"success": True, "message": "Task notification marked as read"})
    return jsonify({"success": False, "message": "Failed to mark notification as read"}), 400
