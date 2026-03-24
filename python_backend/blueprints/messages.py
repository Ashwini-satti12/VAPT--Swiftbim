from flask import Blueprint, request, jsonify, g, current_app
from db import get_db
from auth_middleware import project_app_required, client_required, get_token, decode_token
import mysql.connector as mysql_connector
from datetime import datetime

bp = Blueprint("messages", __name__, url_prefix="/api/messages")
chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")

# Roles that clients are allowed to chat with and that can see client chats
CLIENT_VISIBLE_ROLES = ("Technical Director", "Project Manager", "BIM Lead")


def _get_vendor_db():
    """Return a connection to the new_swiftbim (vendor/client) database."""
    conn = mysql_connector.connect(
        host=current_app.config["MYSQL_HOST"],
        user=current_app.config["MYSQL_USER"],
        password=current_app.config["MYSQL_PASSWORD"],
        database="new_swiftbim",
        port=current_app.config.get("MYSQL_PORT", 3306),
        autocommit=True,
    )
    return conn


def _parse_last_time(value):
    """Parse ISO datetime or return minimal value for sorting."""
    if not value:
        return datetime.min
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return datetime.min


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
    """Returns (user_id, company_id, user_type, user_role) or None."""
    token = get_token()
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    user_type = payload.get("user_type") or "employee"
    user_role = payload.get("user_role")
    return payload.get("user_id"), payload.get("company_id"), user_type, user_role


def _chat_auth_required(f):
    """Decorator: accepts both employee and client JWTs for chat endpoints."""
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        result = _resolve_chat_user()
        if not result:
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        g.chat_user_id, g.company_id, g.chat_user_type, g.chat_user_role = result
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
    company_id = g.company_id

    # Ensure we know the current employee's role (tokens may not include it)
    user_role = getattr(g, "chat_user_role", None)
    if g.chat_user_type != "client" and not user_role:
        cur.execute(
            "SELECT user_role FROM employee WHERE id = %s AND Company_id = %s LIMIT 1",
            (user_id, company_id),
        )
        row = cur.fetchone()
        if row:
            # row can be dict-like or tuple depending on cursor configuration
            if isinstance(row, dict):
                user_role = (row.get("user_role") or "").strip()
            else:
                user_role = (row[0] or "").strip()
        g.chat_user_role = user_role

    # 1) Client portal: show project team employees they have chatted with
    if g.chat_user_type == "client":
        client_id = user_id
        placeholders = ", ".join(["%s"] * len(CLIENT_VISIBLE_ROLES))
        cur.execute(
            f"""
                SELECT
                    e.id,
                    e.full_name,
                    e.user_role,
                    e.profile_picture,
                    e.status,
                    (
                        SELECT MAX(m.date)
                        FROM messages m
                        WHERE
                              (m.incoming = e.id AND m.client_id_outgoing = %s)
                           OR (m.outgoing = e.id AND m.client_id_incoming = %s)
                    ) AS last_msg_time,
                    (
                        SELECT m2.messages
                        FROM messages m2
                        WHERE
                              (m2.incoming = e.id AND m2.client_id_outgoing = %s)
                           OR (m2.outgoing = e.id AND m2.client_id_incoming = %s)
                        ORDER BY m2.date DESC
                        LIMIT 1
                    ) AS last_message
                FROM employee e
                WHERE e.Company_id = %s
                  AND e.active = 'active'
                  AND e.user_role IN ({placeholders})
                ORDER BY last_msg_time DESC, e.full_name ASC
            """,
            (
                client_id,
                client_id,
                client_id,
                client_id,
                company_id,
                *CLIENT_VISIBLE_ROLES,
            ),
        )
    # 2) Employee portal – all roles: show colleagues in the same company.
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
            (user_id, user_id, user_id, user_id, company_id, user_id),
        )

    rows = cur.fetchall()
    contacts = []
    for r in rows:
        d = dict(r)
        if d.get("last_msg_time") and hasattr(d["last_msg_time"], "isoformat"):
            d["last_msg_time"] = d["last_msg_time"].isoformat()
        contacts.append(d)

    # For employee-side chat, also surface client chat rooms based on messages
    # stored with client_id_outgoing/client_id_incoming, using client records
    # from the new_swiftbim.users table where role = 'client'.
    if g.chat_user_type != "client":
        try:
            vendor_conn = _get_vendor_db()
            vendor_cur = vendor_conn.cursor(dictionary=True)
            vendor_cur.execute(
                "SELECT id, full_name FROM users WHERE role = 'client'"
            )
            client_rows = vendor_cur.fetchall()
        except Exception:
            client_rows = []
        finally:
            if "vendor_conn" in locals() and vendor_conn.is_connected():
                vendor_conn.close()

        for crow in client_rows:
            cid = crow.get("id")
            if cid is None:
                continue
            client_id = int(cid)

            # Find last message between this employee and the client.
            cur.execute(
                """
                    SELECT messages, date
                    FROM messages
                    WHERE
                          (incoming = %s AND client_id_outgoing = %s)
                       OR (outgoing = %s AND client_id_incoming = %s)
                    ORDER BY date DESC
                    LIMIT 1
                """,
                (user_id, client_id, user_id, client_id),
            )
            mrow = cur.fetchone()
            if not mrow:
                # Skip clients with no conversation yet
                continue
            last_msg = mrow.get("messages") if isinstance(mrow, dict) else mrow[0]
            last_time = mrow.get("date") if isinstance(mrow, dict) else (mrow[1] if len(mrow) > 1 else None)
            if last_time and hasattr(last_time, "isoformat"):
                last_time = last_time.isoformat()

            contacts.append(
                {
                    "id": client_id,
                    "full_name": crow.get("full_name") or f"Client #{client_id}",
                    "user_role": "Client",
                    "profile_picture": None,
                    "status": None,
                    "last_msg_time": last_time,
                    "last_message": last_msg,
                }
            )
    # Sort all contacts so most recent conversation (employee or client)
    # appears first in the list.
    contacts.sort(
        key=lambda c: _parse_last_time(c.get("last_msg_time")),
        reverse=True,
    )
    return jsonify({"contacts": contacts})


@chat_bp.route("/conversation/<int:contact_id>", methods=["GET"])
@_chat_auth_required
def get_conversation(contact_id):
    """Return last 50 messages between the current user and <contact_id>."""
    conn = get_db()
    cur = conn.cursor()

    user_id = g.chat_user_id

    # For client portal, link by (employee_id, client_id) using the client-aware
    # fields in the messages table, but also fall back to the original
    # outgoing/incoming mapping so that legacy rows still appear.
    if g.chat_user_type == "client":
        client_id = user_id
        employee_id = contact_id
        # Primary: link via client-aware fields (client_id_outgoing/incoming)
        # so we don't depend on sender_type being perfect.
        cur.execute(
            """
                SELECT messages_id AS id,
                       incoming,
                       outgoing,
                       messages AS message,
                       date,
                       sender_type,
                       message_status
                FROM messages
                WHERE
                  (
                    (client_id_outgoing = %s OR client_id_incoming = %s)
                    AND (outgoing = %s OR incoming = %s)
                  )
                  OR
                  (
                    (client_id_outgoing IS NULL OR client_id_outgoing = '')
                    AND (client_id_incoming IS NULL OR client_id_incoming = '')
                    AND (
                          (outgoing = %s AND incoming = %s)
                       OR (outgoing = %s AND incoming = %s)
                    )
                  )
                ORDER BY date ASC
                LIMIT 50
            """,
            (
                client_id,
                client_id,
                employee_id,
                employee_id,
                # legacy fallbacks (old rows without client_id_* set)
                employee_id,
                client_id,
                client_id,
                employee_id,
            ),
        )
    else:
        # Employee portal:
        # - If contact_id is an employee, use outgoing/incoming (existing logic).
        # - Else, treat contact_id as a client id (from new_swiftbim.users) and
        #   use client-aware fields to fetch employee<->client conversation.
        #   This mirrors the first-phase chat implementation.
        cur.execute(
            "SELECT 1 FROM employee WHERE id = %s AND Company_id = %s LIMIT 1",
            (contact_id, g.company_id),
        )
        is_employee_contact = cur.fetchone() is not None

        if is_employee_contact:
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
        else:
            # Employee portal talking to a client contact. Use the same
            # matching logic as the client portal so both sides see all
            # legacy and new messages consistently.
            client_id = contact_id
            employee_id = user_id
            cur.execute(
                """
                    SELECT messages_id AS id,
                           incoming,
                           outgoing,
                           messages AS message,
                           date,
                           sender_type,
                           message_status
                    FROM messages
                    WHERE
                      (
                        (client_id_outgoing = %s OR client_id_incoming = %s)
                        AND (outgoing = %s OR incoming = %s)
                      )
                      OR
                      (
                        (client_id_outgoing IS NULL OR client_id_outgoing = '')
                        AND (client_id_incoming IS NULL OR client_id_incoming = '')
                        AND (
                              (outgoing = %s AND incoming = %s)
                           OR (outgoing = %s AND incoming = %s)
                        )
                      )
                    ORDER BY date ASC
                    LIMIT 50
                """,
                (
                    client_id,
                    client_id,
                    employee_id,
                    employee_id,
                    # legacy fallbacks
                    employee_id,
                    client_id,
                    client_id,
                    employee_id,
                ),
            )
    rows = cur.fetchall()
    msgs = []
    for r in rows:
        d = dict(r)
        if d.get("date") and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()

        # Normalized sender field to match client portal API:
        # - For client portal, 'client' rows are from the logged-in user.
        # - For employee portal, 'employee' rows are from the logged-in user.
        sender_type = (d.get("sender_type") or "").lower()
        if g.chat_user_type == "client":
            d["sender"] = "user" if sender_type == "client" else "contact"
        else:
            d["sender"] = "user" if sender_type == "employee" else "contact"

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
    company_id = g.company_id

    conn = get_db()
    cur = conn.cursor()

    # Client → Employee:
    #   outgoing = '' (no employee sender)
    #   incoming = <employee_id>
    #   client_id_outgoing = <client_id>
    #   client_id_incoming = ''
    # Employee → Client:
    #   outgoing = <employee_id>
    #   incoming = ''
    #   client_id_outgoing = ''
    #   client_id_incoming = <client_id>
    if sender_type == "client":
        # Client portal sending to an employee.
        employee_id = int(to_id)
        client_id = int(user_id)
        cur.execute(
            """
                INSERT INTO messages (
                    incoming,
                    outgoing,
                    client_id_outgoing,
                    client_id_incoming,
                    messages,
                    sender_type,
                    message_status,
                    date,
                    Company_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, 0, NOW(), %s)
            """,
            (
                employee_id,
                "",
                client_id,
                "",
                message_text,
                "client",
                company_id,
            ),
        )
    else:
        # Employee portal:
        # Decide whether `to_id` is another employee in this company or a client.
        cur.execute(
            "SELECT 1 FROM employee WHERE id = %s AND Company_id = %s LIMIT 1",
            (to_id, company_id),
        )
        is_employee_recipient = cur.fetchone() is not None

        if is_employee_recipient:
            # Employee → employee (existing behaviour).
            cur.execute(
                """
                    INSERT INTO messages (
                        incoming,
                        outgoing,
                        messages,
                        sender_type,
                        message_status,
                        date,
                        Company_id
                    )
                    VALUES (%s, %s, %s, %s, 0, NOW(), %s)
                """,
                (to_id, user_id, message_text, sender_type, company_id),
            )
        else:
            # Employee → client.
            # This must match the queries in get_conversation/get_new_messages
            # where we filter on client_id_incoming/client_id_outgoing.
            client_id = int(to_id)
            cur.execute(
                """
                    INSERT INTO messages (
                        incoming,
                        outgoing,
                        client_id_outgoing,
                        client_id_incoming,
                        messages,
                        sender_type,
                        message_status,
                        date,
                        Company_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                """,
                (
                    "",
                    user_id,
                    "",
                    client_id,
                    message_text,
                    "employee",
                    company_id,
                ),
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

    if g.chat_user_type == "client":
        client_id = user_id
        employee_id = contact_id
        cur.execute(
            """
                SELECT messages_id AS id,
                       incoming,
                       outgoing,
                       messages AS message,
                       date,
                       sender_type
                FROM messages
                WHERE messages_id > %s
                  AND (
                    (
                      (client_id_outgoing = %s OR client_id_incoming = %s)
                      AND (outgoing = %s OR incoming = %s)
                    )
                    OR
                    (
                      (client_id_outgoing IS NULL OR client_id_outgoing = '')
                      AND (client_id_incoming IS NULL OR client_id_incoming = '')
                      AND (
                            (outgoing = %s AND incoming = %s)
                         OR (outgoing = %s AND incoming = %s)
                      )
                    )
                  )
                ORDER BY date ASC
            """,
            (
                last_id,
                client_id,
                client_id,
                employee_id,
                employee_id,
                # legacy fallbacks
                employee_id,
                client_id,
                client_id,
                employee_id,
            ),
        )
    else:
        # Employee portal: detect if contact is employee or client.
        cur.execute(
            "SELECT 1 FROM employee WHERE id = %s AND Company_id = %s LIMIT 1",
            (contact_id, g.company_id),
        )
        is_employee_contact = cur.fetchone() is not None

        if is_employee_contact:
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
        else:
            # Employee portal polling for messages with a client contact.
            # Mirror the client-portal logic so both sides see the same data.
            client_id = contact_id
            employee_id = user_id
            cur.execute(
                """
                    SELECT messages_id AS id,
                           incoming,
                           outgoing,
                           messages AS message,
                           date,
                           sender_type
                    FROM messages
                    WHERE messages_id > %s
                      AND (
                        (
                          (client_id_outgoing = %s OR client_id_incoming = %s)
                          AND (outgoing = %s OR incoming = %s)
                        )
                        OR
                        (
                          (client_id_outgoing IS NULL OR client_id_outgoing = '')
                          AND (client_id_incoming IS NULL OR client_id_incoming = '')
                          AND (
                                (outgoing = %s AND incoming = %s)
                             OR (outgoing = %s AND incoming = %s)
                          )
                        )
                      )
                    ORDER BY date ASC
                """,
                (
                    last_id,
                    client_id,
                    client_id,
                    employee_id,
                    employee_id,
                    # legacy fallbacks
                    employee_id,
                    client_id,
                    client_id,
                    employee_id,
                ),
            )
    rows = cur.fetchall()
    msgs = []
    for r in rows:
        d = dict(r)
        if d.get("date") and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()

        sender_type = (d.get("sender_type") or "").lower()
        if g.chat_user_type == "client":
            d["sender"] = "user" if sender_type == "client" else "contact"
        else:
            d["sender"] = "user" if sender_type == "employee" else "contact"

        msgs.append(d)
    return jsonify({"messages": msgs})
