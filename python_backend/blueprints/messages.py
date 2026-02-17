from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("messages", __name__, url_prefix="/api/messages")


@bp.route("", methods=["GET"])
@project_app_required
def list_messages():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT m.messages_id AS id, m.ring, m.incoming, m.outgoing, m.messages AS message, m.date, m.sender_type,
                  CASE WHEN m.sender_type = 'client' THEN c.fullName WHEN m.sender_type = 'employee' THEN e.full_name ELSE COALESCE(e.full_name, c.fullName) END AS name,
                  CASE WHEN m.sender_type = 'employee' THEN e.profile_picture ELSE NULL END AS image
           FROM messages m
           LEFT JOIN employee e ON m.outgoing = e.id AND m.sender_type = 'employee'
           LEFT JOIN clientinformation c ON m.outgoing = c.id AND m.sender_type = 'client'
           WHERE m.incoming = %s AND m.message_status = 0
           ORDER BY m.date DESC LIMIT 10""",
        (g.user_id,),
    )
    rows = cur.fetchall()
    messages = []
    for r in rows:
        d = dict(r)
        if d.get("date") and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()
        d["tablename"] = "messages"
        messages.append(d)
    return jsonify({"count": len(messages), "messages": messages})


@bp.route("/<int:message_id>/read", methods=["POST"])
@project_app_required
def mark_read(message_id):
    data = request.get_json() or request.form
    ring_id = data.get("ringid") or 1
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE messages SET ring = %s WHERE messages_id = %s AND incoming = %s",
        (ring_id, message_id, g.user_id),
    )
    return jsonify({"success": True})
