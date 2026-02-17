from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("timeline", __name__, url_prefix="/api/timeline")


@bp.route("", methods=["GET"])
@project_app_required
def list_events():
    """Timeline/meeting events for calendar."""
    start = request.args.get("start")
    end = request.args.get("end")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT t.*, e.full_name AS creator_name
           FROM timeline t
           LEFT JOIN employee e ON t.emp_id = e.id
           WHERE (t.emp_id = %s OR FIND_IN_SET(%s, REPLACE(t.participate_id, ' ', '')) > 0) AND t.Company_id = %s
           ORDER BY t.start_t""",
        (g.user_id, g.user_id, g.company_id),
    )
    rows = cur.fetchall()
    events = []
    for r in rows:
        d = dict(r)
        for k in ("start_t", "end_t"):
            if d.get(k) and hasattr(d[k], "isoformat"):
                d[k] = d[k].isoformat()
        events.append(d)
    return jsonify({"events": events})


@bp.route("", methods=["POST"])
@project_app_required
def create_event():
    data = request.get_json() or request.form
    start_t = data.get("start_t")
    end_t = data.get("end_t")
    activity = data.get("activity") or "meeting"
    participate_id = data.get("participate_id") or ""
    if not start_t or not end_t:
        return jsonify({"success": False, "message": "start_t and end_t required"}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO timeline (emp_id, start_t, end_t, activity, participate_id, Company_id)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (g.user_id, start_t, end_t, activity, participate_id, g.company_id),
    )
    return jsonify({"success": True, "id": cur.lastrowid})


@bp.route("/<int:event_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_event(event_id):
    data = request.get_json() or request.form
    conn = get_db()
    cur = conn.cursor()
    allowed = ("start_t", "end_t", "activity", "participate_id")
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(data[key])
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
    params.extend([event_id, g.company_id])
    cur.execute(
        "UPDATE timeline SET " + ", ".join(sets) + " WHERE id = %s AND Company_id = %s",
        params,
    )
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Event not found"}), 404
