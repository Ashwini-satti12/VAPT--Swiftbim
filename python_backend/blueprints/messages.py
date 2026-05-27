from flask import Blueprint, request, jsonify, g, current_app
from db import get_db
from auth_middleware import project_app_required, client_required, get_token, decode_token
import mysql.connector as mysql_connector
from datetime import datetime
import os
import uuid
import json
from upload_resolver import secure_save_upload

bp = Blueprint("messages", __name__, url_prefix="/api/messages")
chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")

# Roles that clients are allowed to chat with and that can see client chats
CLIENT_VISIBLE_ROLES = ("Technical Director", "Project Manager", "BIM Lead")

# In-band WebRTC signaling for video calls (see ChatPanel). Do not spam chat notifications for these.
VIDEO_SIGNAL_PREFIX = "[[SB_VIDEO]]"
CHAT_HISTORY_LIMIT = 200


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


def _preview_message_text(text):
    """Normalize a message row for the contacts list preview."""
    if not text or not str(text).strip():
        return ""
    s = str(text).strip()
    if s.startswith(VIDEO_SIGNAL_PREFIX):
        return "[Video call]"
    if s.startswith("Video call") or s.startswith("📹"):
        return "[Video call]"
    if s.startswith("↪ Forwarded"):
        return "Forwarded"
    return s


def _preview_from_row(msg_text, attachments_raw):
    """Build contact preview from message text + attachments JSON."""
    preview = _preview_message_text(msg_text)
    if preview:
        return preview
    if attachments_raw and str(attachments_raw) not in ("[]", "null", ""):
        att_s = str(attachments_raw)
        if '"type": "image"' in att_s or '"type":"image"' in att_s:
            return "[Image]"
        return "[Attachment]"
    return ""


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


def _assign_message_sender(d, user_id, user_type):
    """Normalized sender for chat UI: user = logged-in viewer, contact = other party."""
    sender_type = (d.get("sender_type") or "").lower()
    if user_type == "client":
        d["sender"] = "user" if sender_type == "client" else "contact"
        return
    if sender_type == "client":
        d["sender"] = "contact"
        return
    if sender_type == "employee":
        out = d.get("outgoing")
        try:
            out_id = int(str(out).strip()) if out is not None and str(out).strip() != "" else None
        except (TypeError, ValueError):
            out_id = None
        d["sender"] = "user" if out_id == int(user_id) else "contact"
        return
    d["sender"] = "contact"


def _get_cleared_at(cur, user_id, user_type, contact_id):
    """Return the last cleared_at timestamp for this user-contact pair."""
    cur.execute(
        "SELECT cleared_at FROM chat_clearing WHERE user_id = %s AND user_type = %s AND contact_id = %s",
        (user_id, user_type, contact_id)
    )
    row = cur.fetchone()
    return row["cleared_at"] if row else None


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

def _get_sender_name(cur, user_id, sender_type, company_id):
    if sender_type == "client":
        try:
            vendor_conn = _get_vendor_db()
            vendor_cur = vendor_conn.cursor(dictionary=True)
            vendor_cur.execute("SELECT full_name FROM users WHERE id = %s", (user_id,))
            crow = vendor_cur.fetchone()
            vendor_conn.close()
            if crow and crow.get("full_name"):
                return crow.get("full_name")
        except Exception:
            pass
        return "Client"
    else:
        cur.execute("SELECT full_name FROM employee WHERE id = %s AND Company_id = %s LIMIT 1", (user_id, company_id))
        row = cur.fetchone()
        if row:
            return row.get("full_name") if isinstance(row, dict) else row[0]
        return "Colleague"


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
                        SELECT m.date
                        FROM messages m
                        WHERE
                              (m.incoming = e.id AND m.client_id_outgoing = %s)
                           OR (m.outgoing = e.id AND m.client_id_incoming = %s)
                        ORDER BY m.messages_id DESC
                        LIMIT 1
                    ) AS last_msg_time,
                    (
                        SELECT m2.messages
                        FROM messages m2
                        WHERE
                              (m2.incoming = e.id AND m2.client_id_outgoing = %s)
                           OR (m2.outgoing = e.id AND m2.client_id_incoming = %s)
                        ORDER BY m2.messages_id DESC
                        LIMIT 1
                    ) AS _last_msg_raw,
                    (
                        SELECT m2.attachments
                        FROM messages m2
                        WHERE
                              (m2.incoming = e.id AND m2.client_id_outgoing = %s)
                           OR (m2.outgoing = e.id AND m2.client_id_incoming = %s)
                        ORDER BY m2.messages_id DESC
                        LIMIT 1
                    ) AS _last_att_raw
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
                      (SELECT m.date FROM messages m
                       WHERE (m.outgoing = %s AND m.incoming = e.id)
                          OR (m.outgoing = e.id AND m.incoming = %s)
                       ORDER BY m.messages_id DESC LIMIT 1) AS last_msg_time,
                      (SELECT m2.messages FROM messages m2
                       WHERE (m2.outgoing = %s AND m2.incoming = e.id)
                          OR (m2.outgoing = e.id AND m2.incoming = %s)
                       ORDER BY m2.messages_id DESC LIMIT 1) AS _last_msg_raw,
                      (SELECT m2.attachments FROM messages m2
                       WHERE (m2.outgoing = %s AND m2.incoming = e.id)
                          OR (m2.outgoing = e.id AND m2.incoming = %s)
                       ORDER BY m2.messages_id DESC LIMIT 1) AS _last_att_raw
               FROM employee e
               WHERE e.Company_id = %s AND e.id != %s AND e.active = 'active'
               ORDER BY last_msg_time DESC, e.full_name ASC""",
            (user_id, user_id, user_id, user_id, user_id, user_id, company_id, user_id),
        )

    rows = cur.fetchall()
    contacts = []
    for r in rows:
        d = dict(r)
        if d.get("last_msg_time") and hasattr(d["last_msg_time"], "isoformat"):
            d["last_msg_time"] = d["last_msg_time"].isoformat()
        d["last_message"] = _preview_from_row(d.pop("_last_msg_raw", None), d.pop("_last_att_raw", None))
        contacts.append(d)

    # Employee portal: always list client chat rooms (not only after first message).
    if g.chat_user_type != "client":
        employee_ids = {int(c["id"]) for c in contacts if c.get("id") is not None}
        client_name_by_id = {}

        try:
            vendor_conn = _get_vendor_db()
            vendor_cur = vendor_conn.cursor(dictionary=True)
            vendor_cur.execute(
                "SELECT id, full_name FROM users WHERE role = 'client'"
            )
            for crow in vendor_cur.fetchall():
                cid = crow.get("id")
                if cid is not None:
                    client_name_by_id[int(cid)] = crow.get("full_name") or f"Client #{cid}"
        except Exception:
            pass
        finally:
            if "vendor_conn" in locals() and vendor_conn.is_connected():
                vendor_conn.close()

        try:
            cur.execute(
                """
                SELECT DISTINCT CAST(client_id AS UNSIGNED) AS cid
                FROM project
                WHERE Company_id = %s
                  AND client_id IS NOT NULL
                  AND TRIM(CAST(client_id AS CHAR)) != ''
                  AND CAST(client_id AS UNSIGNED) > 0
                """,
                (company_id,),
            )
            for row in cur.fetchall():
                cid = row.get("cid") if isinstance(row, dict) else row[0]
                if cid is not None:
                    client_name_by_id.setdefault(int(cid), f"Client #{int(cid)}")
        except Exception:
            pass

        for client_id, full_name in client_name_by_id.items():
            if client_id in employee_ids:
                continue
            crow = {"id": client_id, "full_name": full_name}
            # Find last message between this employee and the client (new + legacy rows).
            cur.execute(
                """
                    SELECT messages, attachments, date
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
                    ORDER BY messages_id DESC
                    LIMIT 1
                """,
                (
                    client_id,
                    client_id,
                    user_id,
                    user_id,
                    user_id,
                    client_id,
                    client_id,
                    user_id,
                ),
            )
            mrow = cur.fetchone()
            last_msg = None
            last_time = None
            if mrow:
                if isinstance(mrow, dict):
                    raw_text = mrow.get("messages")
                    raw_att = mrow.get("attachments")
                    last_time = mrow.get("date")
                else:
                    raw_text = mrow[0]
                    raw_att = mrow[1] if len(mrow) > 1 else None
                    last_time = mrow[2] if len(mrow) > 2 else None
                last_msg = _preview_from_row(raw_text, raw_att)
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


def _video_signal_recipient_sql(user_type):
    """SQL fragment: rows addressed TO the logged-in chat user (not sent by them)."""
    if user_type == "client":
        return (
            "CAST(client_id_incoming AS CHAR) = %s",
            lambda uid: (str(uid),),
        )
    # Employee: peer employee (incoming = me) or client thread (client_id_outgoing set, I am incoming)
    return (
        """(
            CAST(incoming AS UNSIGNED) = %s
            OR (
                CAST(client_id_outgoing AS CHAR) != ''
                AND CAST(client_id_outgoing AS CHAR) IS NOT NULL
                AND CAST(incoming AS UNSIGNED) = %s
            )
        )""",
        lambda uid: (uid, uid),
    )


@chat_bp.route("/video-signals/watermark", methods=["GET"])
@_chat_auth_required
def get_video_signals_watermark():
    """Highest video-signal message id already addressed to this user (skip replay on connect)."""
    conn = get_db()
    cur = conn.cursor()
    user_id = g.chat_user_id
    where, params_fn = _video_signal_recipient_sql(g.chat_user_type)
    prefix = VIDEO_SIGNAL_PREFIX + "%"
    cur.execute(
        f"""
            SELECT COALESCE(MAX(messages_id), 0) AS last_id
            FROM messages
            WHERE messages LIKE %s AND {where}
        """,
        (prefix, *params_fn(user_id)),
    )
    row = cur.fetchone()
    last_id = 0
    if row:
        last_id = row.get("last_id") if isinstance(row, dict) else row[0]
    return jsonify({"last_id": int(last_id or 0)})


@chat_bp.route("/video-signals/since/<int:last_id>", methods=["GET"])
@_chat_auth_required
def get_video_signals_since(last_id):
    """Poll in-band WebRTC signaling for any contact (not only the open conversation)."""
    conn = get_db()
    cur = conn.cursor()
    user_id = g.chat_user_id
    where, params_fn = _video_signal_recipient_sql(g.chat_user_type)
    prefix = VIDEO_SIGNAL_PREFIX + "%"
    cur.execute(
        f"""
            SELECT messages_id AS id,
                   incoming,
                   outgoing,
                   messages AS message,
                   date,
                   sender_type,
                   client_id_outgoing,
                   client_id_incoming
            FROM messages
            WHERE messages_id > %s
              AND messages LIKE %s
              AND {where}
              AND date > DATE_SUB(NOW(), INTERVAL 3 MINUTE)
            ORDER BY messages_id ASC
            LIMIT 50
        """,
        (last_id, prefix, *params_fn(user_id)),
    )
    rows = cur.fetchall()
    msgs = []
    for r in rows:
        d = dict(r)
        if d.get("date") and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()
        _assign_message_sender(d, user_id, g.chat_user_type)
        msgs.append(d)
    return jsonify({"messages": msgs})


@chat_bp.route("/conversation/<int:contact_id>/clear", methods=["POST"])
@_chat_auth_required
def clear_conversation(contact_id):
    """Mark the conversation as cleared for the current user."""
    conn = get_db()
    cur = conn.cursor()
    user_id = g.chat_user_id
    user_type = g.chat_user_type

    cur.execute(
        """
        INSERT INTO chat_clearing (user_id, user_type, contact_id, cleared_at)
        VALUES (%s, %s, %s, NOW())
        ON DUPLICATE KEY UPDATE cleared_at = NOW()
        """,
        (user_id, user_type, contact_id)
    )
    return jsonify({"success": True})


@chat_bp.route("/conversation/<int:contact_id>", methods=["GET"])
@_chat_auth_required
def get_conversation(contact_id):
    """Return recent messages between the current user and <contact_id>."""
    conn = get_db()
    cur = conn.cursor()

    user_id = g.chat_user_id
    cleared_at = _get_cleared_at(cur, user_id, g.chat_user_type, contact_id)

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
                       message_status,
                       attachments
                FROM messages
                WHERE
                  (
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
                  AND (date > %s OR %s IS NULL)
                ORDER BY date ASC
                LIMIT %s
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
                cleared_at,
                cleared_at,
                CHAT_HISTORY_LIMIT,
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
                          date, sender_type, message_status, attachments
                   FROM messages
                   WHERE (
                       (outgoing = %s AND incoming = %s)
                       OR
                       (outgoing = %s AND incoming = %s)
                   )
                   AND (date > %s OR %s IS NULL)
                   ORDER BY date ASC
                   LIMIT %s""",
                (user_id, contact_id, contact_id, user_id, cleared_at, cleared_at, CHAT_HISTORY_LIMIT),
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
                           message_status,
                           attachments
                    FROM messages
                    WHERE
                      (
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
                      AND (date > %s OR %s IS NULL)
                    ORDER BY date ASC
                    LIMIT %s
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
                    cleared_at,
                    cleared_at,
                    CHAT_HISTORY_LIMIT,
                ),
            )
    rows = cur.fetchall()
    msgs = []
    for r in rows:
        d = dict(r)
        if d.get("date") and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()

        # Deserialize attachments JSON if stored as a string
        raw_att = d.get("attachments")
        if raw_att and isinstance(raw_att, str):
            try:
                d["attachments"] = json.loads(raw_att)
            except Exception:
                d["attachments"] = None

        _assign_message_sender(d, user_id, g.chat_user_type)
        msgs.append(d)
    return jsonify({"messages": msgs})


@chat_bp.route("/send", methods=["POST"])
@_chat_auth_required
def send_message():
    """Send a message to a contact.

    Accepts both:
      - JSON body: { to_id, message }
      - multipart/form-data: to_id, message (optional), attachments[] (files)
    """
    # Determine content type to decide how to parse the request
    is_multipart = request.content_type and "multipart" in request.content_type

    if is_multipart:
        to_id = request.form.get("to_id")
        message_text = (request.form.get("message") or "").strip()
    else:
        data = request.get_json() or request.form
        to_id = data.get("to_id")
        message_text = (data.get("message") or "").strip()

    is_video_signal = message_text.startswith(VIDEO_SIGNAL_PREFIX)

    # Handle file uploads (multipart only)
    uploaded_files = []
    if is_multipart:
        files = request.files.getlist("attachments") or request.files.getlist("attachments[]")
        if files:
            upload_root = current_app.config.get("UPLOAD_FOLDER", "uploads")
            chat_upload_dir = os.path.join(upload_root, "chat")
            os.makedirs(chat_upload_dir, exist_ok=True)
            for f in files:
                if not f or not f.filename:
                    continue
                ext = os.path.splitext(f.filename)[1].lower()
                filename = f"{uuid.uuid4().hex}{ext}"
                saved, upload_err = secure_save_upload(
                    f,
                    chat_upload_dir,
                    category="chat",
                    filename=filename,
                    app_config=current_app.config,
                )
                if upload_err:
                    return jsonify({"success": False, "message": upload_err}), 400
                filepath = saved
                # Derive MIME type category for rendering on frontend
                mime = (f.content_type or "").lower()
                att_type = "image" if mime.startswith("image/") else "file"
                uploaded_files.append({
                    "url": os.path.basename(filepath or filename),
                    "name": f.filename,
                    "type": att_type,
                })

    attachments_json = json.dumps(uploaded_files) if uploaded_files else None

    if not to_id or (not message_text and not uploaded_files):
        return jsonify({"success": False, "message": "to_id and message or attachments are required"}), 400

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
                    Company_id,
                    attachments
                )
                VALUES (%s, %s, %s, %s, %s, %s, 0, NOW(), %s, %s)
            """,
            (
                employee_id,
                "",
                client_id,
                "",
                message_text,
                "client",
                company_id,
                attachments_json,
            ),
        )
        sender_name = _get_sender_name(cur, client_id, "client", company_id)
        if not is_video_signal:
            cur.execute(
                """
                INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                VALUES (%s, NULL, %s, %s, %s, 'chat', %s, 0, NOW(), %s)
                """,
                (employee_id, f"New Message from {sender_name}", f"{sender_name} sent you a message.", "message", client_id, company_id)
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
                        Company_id,
                        attachments
                    )
                    VALUES (%s, %s, %s, %s, 0, NOW(), %s, %s)
                """,
                (to_id, user_id, message_text, sender_type, company_id, attachments_json),
            )
            sender_name = _get_sender_name(cur, user_id, "employee", company_id)
            if not is_video_signal:
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                    VALUES (%s, NULL, %s, %s, %s, 'chat', %s, 0, NOW(), %s)
                    """,
                    (to_id, f"New Message from {sender_name}", f"{sender_name} sent you a message.", "message", user_id, company_id)
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
                        Company_id,
                        attachments
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, 0, NOW(), %s, %s)
                """,
                (
                    "",
                    user_id,
                    "",
                    client_id,
                    message_text,
                    "employee",
                    company_id,
                    attachments_json,
                ),
            )
            sender_name = _get_sender_name(cur, user_id, "employee", company_id)
            if not is_video_signal:
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                    VALUES (%s, NULL, %s, %s, %s, 'chat', %s, 0, NOW(), %s)
                    """,
                    (client_id, f"New Message from {sender_name}", f"{sender_name} sent you a message.", "message", user_id, company_id)
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
    cleared_at = _get_cleared_at(cur, user_id, g.chat_user_type, contact_id)

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
                       sender_type,
                       attachments
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
                  AND (date > %s OR %s IS NULL)
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
                cleared_at,
                cleared_at,
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
                          date, sender_type, attachments
                   FROM messages
                   WHERE messages_id > %s
                     AND (
                       (outgoing = %s AND incoming = %s)
                       OR
                       (outgoing = %s AND incoming = %s)
                     )
                     AND (date > %s OR %s IS NULL)
                   ORDER BY date ASC""",
                (last_id, user_id, contact_id, contact_id, user_id, cleared_at, cleared_at),
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
                           sender_type,
                           attachments
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
                      AND (date > %s OR %s IS NULL)
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
                    cleared_at,
                    cleared_at,
                ),
            )
    rows = cur.fetchall()
    msgs = []
    for r in rows:
        d = dict(r)
        if d.get("date") and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()

        # Deserialize attachments JSON if stored as a string
        raw_att = d.get("attachments")
        if raw_att and isinstance(raw_att, str):
            try:
                d["attachments"] = json.loads(raw_att)
            except Exception:
                d["attachments"] = None

        _assign_message_sender(d, user_id, g.chat_user_type)
        msgs.append(d)
    return jsonify({"messages": msgs})
