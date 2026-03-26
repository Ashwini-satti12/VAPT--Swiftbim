from datetime import datetime
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("calendar", __name__, url_prefix="/api/calendar")


@bp.route("/events", methods=["GET"])
@project_app_required
def events():
    """Birthdays, work anniversaries, and project due dates for selected date."""
    selected_date = request.args.get("selectedDate")
    if not selected_date:
        selected_date = datetime.now().strftime("%Y-%m-%d")
    try:
        # selected_date is guaranteed to be a string at this point (from strftime or request.args.get)
        # We slice to 10 chars to ensure it's just 'YYYY-MM-DD'
        dt = datetime.strptime(str(selected_date)[:10], "%Y-%m-%d")
    except ValueError:
        return jsonify({"success": False, "message": "Invalid date"}), 400
    month_day = dt.strftime("%m-%d")
    table_date = dt.strftime("%Y-%m-%d")
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        """SELECT id, full_name, dob, doj, profile_picture, Company_id,
                  YEAR(CURDATE()) - YEAR(doj) - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(doj, '%m%d')) AS working_years
           FROM employee
           WHERE (DATE_FORMAT(dob, '%m-%d') = %(md)s OR DATE_FORMAT(doj, '%m-%d') = %(md)s)
             AND active = 'active'
             AND Company_id = %(cid)s""",
        {"md": month_day, "cid": g.company_id},
    )
    rows = cur.fetchall()
    events_list = []
    for r in rows:
        full_name = r.get("full_name")
        dob = r.get("dob")
        doj = r.get("doj")
        image = r.get("profile_picture")
        working_years = r.get("working_years") or 0
        dob_md = dob.strftime("%m-%d") if dob else ""
        doj_md = doj.strftime("%m-%d") if doj else ""
        current_md = dt.strftime("%m-%d")
        if dob_md == current_md:
            events_list.append({"type": "birthday", "full_name": full_name, "image": image})
        elif doj_md == current_md:
            events_list.append({"type": "work_anniversary", "full_name": full_name, "working_years": working_years})

    # MANAGEMENT_ROLES same as dashboard.py (could be imported if shared, but keeping it simple)
    MANAGEMENT_ROLES = ("Technical Director", "CEO", "Project Manager", "BIM Lead", "BIM Coordinator")
    user_role = (getattr(g, "user_role", None) or "").strip()

    from datetime import timedelta
    ten_days_later = (dt + timedelta(days=30)).strftime("%Y-%m-%d")
    
    if user_role in MANAGEMENT_ROLES:
        cur.execute(
            """SELECT id, project_name, due_date FROM projects
               WHERE due_date BETWEEN %s AND %s AND Company_id = %s
               ORDER BY due_date LIMIT 10""",
            (table_date, ten_days_later, g.company_id),
        )
    else:
        cur.execute(
            """SELECT id, project_name, due_date FROM projects
               WHERE due_date BETWEEN %s AND %s AND FIND_IN_SET(%s, REPLACE(members, ' ', '')) AND Company_id = %s
               ORDER BY due_date LIMIT 10""",
            (table_date, ten_days_later, g.user_id, g.company_id),
        )
    project_rows = cur.fetchall()
    for r in project_rows:
        events_list.append({
            "type": "project_due",
            "project_name": r.get("project_name"),
            "due_date": r.get("due_date").isoformat() if r.get("due_date") and hasattr(r["due_date"], "isoformat") else str(r.get("due_date")),
        })

    return jsonify({"events": events_list, "date": selected_date})
