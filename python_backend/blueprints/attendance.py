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
    cur = conn.cursor()

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
            SELECT a.*, e.full_name, e.status AS employee_status
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
            SELECT a.*, e.full_name, e.status AS employee_status
            FROM attendance a
            JOIN employee e ON a.employee_id = e.email
            WHERE a.Company_id = %s
            ORDER BY a.id DESC
            """,
            (g.company_id,),
        )

    rows = cur.fetchall()
    records = []

    for r in rows:
        d = dict(r)

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

        records.append(
            {
                "id": d.get("id"),
                "employee_id": d.get("employee_id"),
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


