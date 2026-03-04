from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required, client_required, get_token, decode_token

bp = Blueprint("messages", __name__, url_prefix="/api/messages")
chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")

# Roles that clients are allowed to chat with
CLIENT_VISIBLE_ROLES = ("Technical Director", "Project Manager", "BIM Lead")


# ---------------------------------------------------------------------------
# Existing message endpoints (preserved)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Helper: resolve current user from token (supports both employee and client)
# ---------------------------------------------------------------------------

def _resolve_chat_user():
    """Returns (user_id, company_id, user_type) or None."""
    token = get_token()
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    user_type = payload.get("user_type") or "employee"
    return payload.get("user_id"), payload.get("company_id"), user_type


def _chat_auth_required(f):
    """Decorator: accepts both employee and client JWTs for chat endpoints."""
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        result = _resolve_chat_user()
        if not result:
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        g.chat_user_id, g.company_id, g.chat_user_type = result
        return f(*args, **kwargs)

    return decorated


# ---------------------------------------------------------------------------
# Chat endpoints
# ---------------------------------------------------------------------------

@chat_bp.route("/contacts", methods=["GET"])
@_chat_auth_required
def get_contacts():
    """Return list of chat contacts sorted by most recent message (recent first).
    - Employees: all colleagues in same company (excluding self).
    - Clients: only employees with role in CLIENT_VISIBLE_ROLES.
    """
    conn = get_db()
    cur = conn.cursor()
    user_id = g.chat_user_id

    if g.chat_user_type == "client":
        placeholders = ", ".join(["%s"] * len(CLIENT_VISIBLE_ROLES))
        cur.execute(
            f"""SELECT e.id, e.full_name, e.user_role, e.profile_picture, e.status,
                       MAX(m.date) AS last_msg_time,
                       (SELECT m2.messages FROM messages m2
                        WHERE ((m2.outgoing = %s AND m2.incoming = e.id)
                               OR (m2.outgoing = e.id AND m2.incoming = %s))
                        ORDER BY m2.date DESC LIMIT 1) AS last_message
                FROM employee e
                LEFT JOIN messages m ON (
                    (m.outgoing = %s AND m.incoming = e.id)
                    OR (m.outgoing = e.id AND m.incoming = %s)
                )
                WHERE e.Company_id = %s AND e.active = 'active'
                  AND e.user_role IN ({placeholders})
                GROUP BY e.id
                ORDER BY last_msg_time DESC, e.full_name ASC""",
            (user_id, user_id, user_id, user_id, g.company_id, *CLIENT_VISIBLE_ROLES),
        )
    else:
        cur.execute(
            """SELECT e.id, e.full_name, e.user_role, e.profile_picture, e.status,
                      MAX(m.date) AS last_msg_time,
                      (SELECT m2.messages FROM messages m2
                       WHERE ((m2.outgoing = %s AND m2.incoming = e.id)
                              OR (m2.outgoing = e.id AND m2.incoming = %s))
                       ORDER BY m2.date DESC LIMIT 1) AS last_message
               FROM employee e
               LEFT JOIN messages m ON (
                   (m.outgoing = %s AND m.incoming = e.id)
                   OR (m.outgoing = e.id AND m.incoming = %s)
               )
               WHERE e.Company_id = %s AND e.id != %s AND e.active = 'active'
               GROUP BY e.id
               ORDER BY last_msg_time DESC, e.full_name ASC""",
            (user_id, user_id, user_id, user_id, g.company_id, user_id),
        )

    rows = cur.fetchall()
    contacts = []
    for r in rows:
        d = dict(r)
        if d.get("last_msg_time") and hasattr(d["last_msg_time"], "isoformat"):
            d["last_msg_time"] = d["last_msg_time"].isoformat()
        contacts.append(d)
    return jsonify({"contacts": contacts})


@chat_bp.route("/conversation/<int:contact_id>", methods=["GET"])
@_chat_auth_required
def get_conversation(contact_id):
    """Return last 50 messages between the current user and <contact_id>."""
    conn = get_db()
    cur = conn.cursor()

    user_id = g.chat_user_id

    cur.execute(
        """SELECT messages_id AS id, incoming, outgoing, messages AS message,
                  date, sender_type, message_status
           FROM messages
           WHERE (
               (outgoing = %s AND incoming = %s)
               OR
               (outgoing = %s AND incoming = %s)
           )
           ORDER BY date ASC
           LIMIT 50""",
        (user_id, contact_id, contact_id, user_id),
    )
    rows = cur.fetchall()
    msgs = []
    for r in rows:
        d = dict(r)
        if d.get("date") and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()
        msgs.append(d)
    return jsonify({"messages": msgs})


@chat_bp.route("/send", methods=["POST"])
@_chat_auth_required
def send_message():
    """Send a message to a contact. Body: { to_id, message }"""
    data = request.get_json() or request.form
    to_id = data.get("to_id")
    message_text = (data.get("message") or "").strip()

    if not to_id or not message_text:
        return jsonify({"success": False, "message": "to_id and message are required"}), 400

    sender_type = g.chat_user_type  # 'employee' or 'client'
    user_id = g.chat_user_id

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO messages (incoming, outgoing, messages, sender_type, message_status, date)
           VALUES (%s, %s, %s, %s, 0, NOW())""",
        (to_id, user_id, message_text, sender_type),
    )
    new_id = cur.lastrowid
    return jsonify({"success": True, "id": new_id})


@chat_bp.route("/conversation/<int:contact_id>/since/<int:last_id>", methods=["GET"])
@_chat_auth_required
def get_new_messages(contact_id, last_id):
    """Return messages with messages_id > last_id between current user and contact (for polling)."""
    conn = get_db()
    cur = conn.cursor()

    user_id = g.chat_user_id

    cur.execute(
        """SELECT messages_id AS id, incoming, outgoing, messages AS message,
                  date, sender_type
           FROM messages
           WHERE messages_id > %s
             AND (
               (outgoing = %s AND incoming = %s)
               OR
               (outgoing = %s AND incoming = %s)
             )
           ORDER BY date ASC""",
        (last_id, user_id, contact_id, contact_id, user_id),
    )
    rows = cur.fetchall()
    msgs = []
    for r in rows:
        d = dict(r)
        if d.get("date") and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()
        msgs.append(d)
    return jsonify({"messages": msgs})
