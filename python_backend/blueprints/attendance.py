from datetime import datetime
from flask import Blueprint, jsonify, g, request

from db import get_db
from auth_middleware import project_app_required


bp = Blueprint("attendance", __name__, url_prefix="/api/attendance")


@bp.route("/tracker", methods=["GET"])
@project_app_required
def attendance_tracker():
    """
    Return attendance records for the current company so that the
    Employee Tracking pages (TD / PM / BL) can show:
    - Date
    - Employee name
    - Time In
    - Time Out   (if available in table)
    - Total Hours (if available in table)
    - Status (Online / Offline)
    """
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # Optional role filter (comma-separated), e.g. roles=BIM Coordinator,BIM Modeler
    roles_param = (request.args.get("roles") or "").strip()
    roles_filter = [r.strip() for r in roles_param.split(",") if r.strip()] if roles_param else []

    # Optional date filter from query string (YYYY-MM-DD)
    date_param = (request.args.get("date") or "").strip()
    date_filter = None
    if date_param:
        try:
            d = datetime.strptime(date_param, "%Y-%m-%d")
            # attendance.date is stored as d-m-Y in the existing PHP schema
            date_filter = d.strftime("%d-%m-%Y")
        except Exception:
            date_filter = None

    # Fetch raw attendance rows plus employee info.
    # Use a.* so we don't depend on exact column list; if time_out/total_hours
    # exist in your table they will be included automatically.
    if date_filter:
        cur.execute(
            """
            SELECT a.*, e.full_name, e.status AS employee_status, e.id AS employee_db_id
            FROM attendance a
            JOIN employee e ON a.employee_id = e.email
            WHERE a.Company_id = %s AND a.date = %s
            ORDER BY a.id DESC
            """,
            (g.company_id, date_filter),
        )
    else:
        cur.execute(
            """
            SELECT a.*, e.full_name, e.status AS employee_status, e.id AS employee_db_id
            FROM attendance a
            JOIN employee e ON a.employee_id = e.email
            WHERE a.Company_id = %s
            ORDER BY a.id DESC
            """,
            (g.company_id,),
        )

    # Apply role filter in-memory (safe, avoids dynamic SQL on legacy schemas)
    # Cached per employee email to avoid N+1 queries.
    role_cache = {}

    rows = cur.fetchall()
    records = []

    # If we're looking at today's data and employee is Offline but time_out is still NULL,
    # auto-close the attendance row so tracker always shows the time out and total hours.
    today_ddmmyyyy = datetime.now().strftime("%d-%m-%Y")
    should_autoclose = bool(date_filter and date_filter == today_ddmmyyyy)

    for r in rows:
        d = dict(r)
        if roles_filter:
            # we need employee role; fetch once per unique email if requested
            try:
                emp_email = d.get("employee_id")
                if emp_email:
                    if emp_email in role_cache:
                        role = role_cache[emp_email]
                    else:
                        cur2 = conn.cursor(dictionary=True)
                        cur2.execute(
                            "SELECT user_role FROM employee WHERE email = %s AND Company_id = %s",
                            (emp_email, g.company_id),
                        )
                        erow = cur2.fetchone() or {}
                        role = (erow.get("user_role") or "").strip()
                        role_cache[emp_email] = role
                    if role not in roles_filter:
                        continue
            except Exception:
                continue

        # --- Date ---
        raw_date = d.get("date")
        date_str = ""
        date_iso = None
        if isinstance(raw_date, datetime):
            date_iso = raw_date.date().isoformat()
            date_str = raw_date.strftime("%d-%m-%Y")
        else:
            date_str = (str(raw_date or "")).strip()
            if date_str:
                for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
                    try:
                        parsed = datetime.strptime(date_str, fmt)
                        date_iso = parsed.date().isoformat()
                        break
                    except Exception:
                        continue

        # --- Time In ---
        raw_time_in = d.get("time_in")
        time_in = None
        if isinstance(raw_time_in, datetime):
            time_in = raw_time_in.strftime("%H:%M:%S")
        else:
            val = str(raw_time_in or "").strip()
            time_in = val or None

        # --- Time Out ---
        raw_time_out = d.get("time_out") or d.get("timeout")
        time_out = None
        if isinstance(raw_time_out, datetime):
            # Only time part is needed for the UI
            time_out = raw_time_out.strftime("%H:%M:%S")
        else:
            val = str(raw_time_out or "").strip()
            time_out = val or None

        # --- Total Hours / num_hr ---
        raw_num_hr = d.get("num_hr") or d.get("total_hours") or d.get("totalHours")
        total_hours = None
        if raw_num_hr is not None and str(raw_num_hr).strip() != "":
            total_hours = str(raw_num_hr)

        # --- Status ---
        raw_status = d.get("employee_status")
        if raw_status is None or str(raw_status).strip() == "":
            raw_status = d.get("status")
        status = None
        if raw_status is not None and str(raw_status).strip() != "":
            status = str(raw_status).strip()

        if should_autoclose:
            try:
                is_offline = (status or "").strip().lower() == "offline"
                if is_offline and not time_out and time_in and d.get("id"):
                    now_time = datetime.now().strftime("%H:%M:%S")
                    total_hms = None
                    total_decimal = None
                    try:
                        t_in = datetime.strptime(str(time_in).strip(), "%H:%M:%S")
                        t_out = datetime.strptime(now_time, "%H:%M:%S")
                        sec = int((t_out - t_in).total_seconds())
                        if sec < 0:
                            sec = 0
                        total_hms = f"{sec // 3600:02d}:{(sec % 3600) // 60:02d}:{sec % 60:02d}"
                        total_decimal = round(sec / 3600.0, 2)
                    except Exception:
                        total_hms = None
                        total_decimal = None

                    cur.execute(
                        "UPDATE attendance SET time_out = %s, num_hr = %s WHERE id = %s AND Company_id = %s",
                        (now_time, total_decimal, int(d.get("id")), g.company_id),
                    )
                    conn.commit()
                    time_out = now_time
                    if total_hms is not None:
                        total_hours = total_hms
            except Exception:
                pass

        records.append(
            {
                "id": d.get("id"),
                "employee_id": d.get("employee_id"),
                "employee_db_id": d.get("employee_db_id"),
                "full_name": d.get("full_name"),
                "date": date_str or None,
                "date_iso": date_iso,
                "time_in": time_in,
                "time_out": time_out,
                "total_hours": total_hours,
                "status": status,
            }
        )

    return jsonify({"records": records})


