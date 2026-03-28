from flask import Blueprint, request, jsonify, g, current_app
from db import get_db
from auth_middleware import project_app_required
import mysql.connector as mysql_connector
import os
from werkzeug.utils import secure_filename
import re
import calendar
import json
from datetime import date, datetime


def _get_vendor_db():
    """Return a connection to the new_swiftbim (vendor) database."""
    conn = mysql_connector.connect(
        host=current_app.config["MYSQL_HOST"],
        user=current_app.config["MYSQL_USER"],
        password=current_app.config["MYSQL_PASSWORD"],
        database="new_swiftbim",
        port=current_app.config.get("MYSQL_PORT", 3306),
        autocommit=True,
    )
    return conn


def _ensure_vendor_bidding_table(vendor_conn):
    """Create vendor_bidding table if it doesn't exist."""
    cur = vendor_conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS vendor_bidding (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id INT NOT NULL,
            project_name VARCHAR(255) NOT NULL,
            description TEXT,
            outsource_budget DECIMAL(15,2),
            budget_ceiling DECIMAL(15,2),
            bid_deadline DATE,
            status ENUM('active', 'closed') DEFAULT 'active',
            company_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_project (project_id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS vendor_bids (
            id INT AUTO_INCREMENT PRIMARY KEY,
            opportunity_id INT NOT NULL,
            vendor_id INT NOT NULL,
            bid_amount DECIMAL(15,2),
            notes TEXT,
            timeline VARCHAR(255),
            team_size INT DEFAULT 0,
            status ENUM('submitted','shortlisted','won','lost') DEFAULT 'submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_vendor_opportunity (vendor_id, opportunity_id)
        )
    """)

bp = Blueprint("projects", __name__, url_prefix="/api/projects")

# Roles that see all company projects (like PHP session id 1 / type_id=1)
PROJECTS_SEE_ALL_ROLES = ("Technical Director", "CEO")


@bp.route("", methods=["GET"])
@project_app_required
def list_projects():
    user_id = request.args.get("userid") or g.user_id
    type_id = request.args.get("type_id")
    status = request.args.get("status")
    company_id = g.company_id
    user_role = (getattr(g, "user_role", None) or "").strip()
    # Management roles (Technical Director, etc.) see all company projects by default, like PHP type_id=1
    see_all_by_role = user_role in PROJECTS_SEE_ALL_ROLES

    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # Base WHERE clauses
    where_clauses = ["Company_id = %s"]
    params = [company_id]

    # Visibility filters based on role/type
    if type_id is None and not see_all_by_role:
        if user_role == "BIM Lead":
            # BIM Lead: ONLY projects where they are the Lead
            where_clauses.append("FIND_IN_SET(%s, REPLACE(IFNULL(lead_id, ''), ' ', '')) > 0")
            params.append(user_id)
        elif user_role == "Project Manager":
            # Project Manager: ONLY projects where they are the Project Manager
            where_clauses.append("FIND_IN_SET(%s, REPLACE(IFNULL(project_manager_id, ''), ' ', '')) > 0")
            params.append(user_id)
        elif user_role == "BIM Coordinator":
            # BIM Coordinator: ONLY projects where they are the Coordinator
            where_clauses.append("FIND_IN_SET(%s, REPLACE(IFNULL(bim_coordinator_id, ''), ' ', '')) > 0")
            params.append(user_id)
        else:
            # Default for other roles (BIM Modeler, etc.): involved in any capacity
            where_clauses.append("""(
                 uploaderid = %s
                 OR FIND_IN_SET(%s, REPLACE(IFNULL(members, ''), ' ', '')) > 0
                 OR FIND_IN_SET(%s, REPLACE(IFNULL(project_manager_id, ''), ' ', '')) > 0
                 OR FIND_IN_SET(%s, REPLACE(IFNULL(lead_id, ''), ' ', '')) > 0
                 OR FIND_IN_SET(%s, REPLACE(IFNULL(bim_coordinator_id, ''), ' ', '')) > 0
               )""")
            params.extend([user_id, user_id, user_id, user_id, user_id])
    elif type_id is not None and str(type_id) != "1":
        # Specific type_id filter (usually similar to broad involvement)
        where_clauses.append("""(
             FIND_IN_SET(%s, REPLACE(IFNULL(members, ''), ' ', '')) > 0
             OR FIND_IN_SET(%s, REPLACE(IFNULL(project_manager_id, ''), ' ', '')) > 0
             OR FIND_IN_SET(%s, REPLACE(IFNULL(lead_id, ''), ' ', '')) > 0
             OR FIND_IN_SET(%s, REPLACE(IFNULL(bim_coordinator_id, ''), ' ', '')) > 0
           )""")
        params.extend([user_id, user_id, user_id, user_id])
    
    # Apply Status filter if present
    if status == "Completed":
        where_clauses.append("progress = 100")
    elif status:
        # Handling for other potential statuses if needed, though Completed is most common
        pass

    # Final execution
    where_sql = " AND ".join(where_clauses)
    sql = f"SELECT * FROM projects WHERE {where_sql} ORDER BY project_name"
    cur.execute(sql, tuple(params))

    rows = cur.fetchall()
    project_ids = [r["id"] for r in rows]
    task_counts = {}
    if project_ids:
        placeholders = ",".join(["%s"] * len(project_ids))
        cur.execute(
            f"""SELECT projectid, COUNT(*) AS total_tasks,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks
                FROM tasks WHERE projectid IN ({placeholders}) AND Company_id = %s GROUP BY projectid""",
            (*project_ids, company_id),
        )
        for row in cur.fetchall():
            task_counts[row["projectid"]] = {
                "total_tasks": row["total_tasks"] or 0,
                "completed_tasks": row["completed_tasks"] or 0,
            }
    def _serialize_row(d):
        if d.get("due_date") and hasattr(d["due_date"], "isoformat"):
            d["due_date"] = d["due_date"].isoformat()
        if d.get("start_date") and hasattr(d["start_date"], "isoformat"):
            d["start_date"] = d["start_date"].isoformat()
        if d.get("bidding_end_date") and hasattr(d["bidding_end_date"], "isoformat"):
            d["bidding_end_date"] = d["bidding_end_date"].isoformat()

    projects = []
    for r in rows:
        d = dict(r)
        _serialize_row(d)
        # Backwards-compat for frontend field names
        if "no_resource" in d and "resources" not in d:
            d["resources"] = d.get("no_resource")
        if "no_resources_requried" in d and "required_resources" not in d:
            d["required_resources"] = d.get("no_resources_requried")
        counts = task_counts.get(d["id"], {"total_tasks": 0, "completed_tasks": 0})
        d["total_tasks"] = counts["total_tasks"]
        d["completed_tasks"] = counts["completed_tasks"]
        projects.append(d)
    _hydrate_project_display_fields(cur, company_id, projects)
    _hydrate_project_phase1_fields(projects)
    return jsonify({"projects": projects})


def _resolve_client_id(cur, company_id, value):
    """Resolve client by fullName to id. Stores ID only."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return int(value) if value == int(value) else None
    s = str(value).strip()
    if not s or s.isdigit():
        return int(s) if s.isdigit() else None
    try:
        vendor_conn = _get_vendor_db()
        vendor_cur = vendor_conn.cursor(dictionary=True)
        vendor_cur.execute(
            "SELECT id FROM users WHERE full_name = %s LIMIT 1",
            (s,)
        )
        row = vendor_cur.fetchone()
        return int(row["id"]) if row else None
    except Exception:
        return None
    finally:
        if 'vendor_conn' in locals() and vendor_conn.is_connected():
            vendor_conn.close()


def _resolve_employee_id(cur, company_id, value):
    """Resolve employee by full_name to id, handling comma-separated lists."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(int(value) if value == int(value) else value)
    s = str(value).strip()
    if not s:
        return None

    parts = [p.strip() for p in s.split(',')]
    resolved_parts = []
    
    for p in parts:
        if not p:
            continue
        if p.isdigit():
            resolved_parts.append(p)
        else:
            cur.execute(
                "SELECT id FROM employee WHERE full_name = %s AND Company_id = %s LIMIT 1",
                (p, company_id),
            )
            row = cur.fetchone()
            if row and "id" in row:
                resolved_parts.append(str(row["id"]))
            else:
                # Keep original string if no such employee ID is found
                resolved_parts.append(p)
                
    return ",".join(resolved_parts) if resolved_parts else None


_PROJECT_SPECIAL_DEPARTMENT_VALUES = {"Budget Ceiling", "Submission Deadline"}


def _as_int_id(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return int(value) if value == int(value) else None
    s = str(value).strip()
    return int(s) if s.isdigit() else None


def _parse_csv_int_ids(value):
    if not value:
        return []
    out = []
    for part in str(value).split(","):
        s = part.strip()
        if s.isdigit():
            out.append(int(s))
    return out


def _resolve_project_department(cur, company_id, value):
    """
    Normalize project `department` to store department.id (numeric) instead of name.

    Notes:
    - Some flows overload `department` as a "source" field for outsourcing.
      We preserve those special values.
    """
    if value is None:
        return ""
    s = str(value).strip()
    if not s:
        return ""
    if s in _PROJECT_SPECIAL_DEPARTMENT_VALUES:
        return s
    if s.isdigit():
        return s
    cur.execute(
        "SELECT id FROM department WHERE name = %s AND Company_id = %s LIMIT 1",
        (s, company_id),
    )
    row = cur.fetchone()
    return str(row["id"]) if row and row.get("id") is not None else s


def _hydrate_project_display_fields(cur, company_id, project_dicts):
    """
    Add display-friendly name fields while keeping ID fields unchanged.

    Adds:
    - client_name (from clientinformation.fullName)
    - project_manager_name, lead_name, bim_coordinator_name, uploader_name (from employee.full_name)
    - department_name (from department.name when department is numeric)
    - members_names (list[str]) from employee.full_name for members CSV IDs
    """
    employee_ids = set()
    client_ids = set()
    department_ids = set()
    project_members_map = {}

    for d in project_dicts:
        for k in ("project_manager_id", "lead_id", "bim_coordinator_id", "uploaderid"):
            val = d.get(k)
            if not val:
                continue
            for p in str(val).split(','):
                p = p.strip()
                if p.isdigit():
                    employee_ids.add(int(p))

        mids = _parse_csv_int_ids(d.get("members"))
        project_members_map[d.get("id")] = mids
        for mid in mids:
            employee_ids.add(mid)

        cid = _as_int_id(d.get("client_id"))
        if cid is not None:
            client_ids.add(cid)

        dep_id = _as_int_id(d.get("department"))
        if dep_id is not None:
            department_ids.add(dep_id)

    employees_by_id = {}
    if employee_ids:
        placeholders = ",".join(["%s"] * len(employee_ids))
        cur.execute(
            f"SELECT id, full_name FROM employee WHERE Company_id = %s AND id IN ({placeholders})",
            (company_id, *list(employee_ids)),
        )
        for r in cur.fetchall():
            employees_by_id[int(r["id"])] = r.get("full_name") or ""

    # clients_by_id = {}
    # if client_ids:
    #     placeholders = ",".join(["%s"] * len(client_ids))
    #     cur.execute(
    #         f"SELECT id, fullName FROM clientinformation WHERE Company_id = %s AND id IN ({placeholders})",
    #         (company_id, *list(client_ids)),
    #     )
    #     for r in cur.fetchall():
    #         clients_by_id[int(r["id"])] = r.get("fullName") or ""

    clients_by_id = {}
    if client_ids:
        try:
            vendor_conn = _get_vendor_db()
            vendor_cur = vendor_conn.cursor(dictionary=True)
            placeholders = ",".join(["%s"] * len(client_ids))
            vendor_cur.execute(
                f"SELECT id, full_name FROM users WHERE id IN ({placeholders})",
                (*list(client_ids),)
            )
            for r in vendor_cur.fetchall():
                clients_by_id[int(r["id"])] = r.get("full_name") or ""
        except Exception:
            pass
        finally:
            if 'vendor_conn' in locals() and vendor_conn.is_connected():
                vendor_conn.close()

    departments_by_id = {}
    if department_ids:
        placeholders = ",".join(["%s"] * len(department_ids))
        cur.execute(
            f"SELECT id, name FROM department WHERE Company_id = %s AND id IN ({placeholders})",
            (company_id, *list(department_ids)),
        )
        for r in cur.fetchall():
            departments_by_id[int(r["id"])] = r.get("name") or ""

    for d in project_dicts:
        cid = _as_int_id(d.get("client_id"))
        d["client_name"] = clients_by_id.get(cid, "") if cid is not None else ""

        def get_names_for_mixed(val):
            if not val: return ""
            parts = [p.strip() for p in str(val).split(',')]
            out = []
            for p in parts:
                if not p: continue
                if p.isdigit():
                    name = employees_by_id.get(int(p))
                    if name: out.append(name)
                else:
                    out.append(p)
            return ", ".join(out)

        d["project_manager_name"] = get_names_for_mixed(d.get("project_manager_id"))
        d["lead_name"] = get_names_for_mixed(d.get("lead_id"))
        d["bim_coordinator_name"] = get_names_for_mixed(d.get("bim_coordinator_id"))
        
        up = _as_int_id(d.get("uploaderid"))
        d["uploader_name"] = employees_by_id.get(up, "") if up is not None else ""

        dep_id = _as_int_id(d.get("department"))
        if dep_id is not None:
            d["department_name"] = departments_by_id.get(dep_id, "")
        else:
            d["department_name"] = d.get("department") if d.get("department") in _PROJECT_SPECIAL_DEPARTMENT_VALUES else ""

        mids = project_members_map.get(d.get("id"), [])
        d["members_names"] = [employees_by_id.get(mid, "") for mid in mids if employees_by_id.get(mid, "")]


def _parse_iso_date(val):
    if not val:
        return None
    if isinstance(val, (datetime, date)):
        return val.date() if isinstance(val, datetime) else val
    s = str(val).strip()
    if not s:
        return None
    # Accept "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS"
    try:
        return datetime.fromisoformat(s.replace("Z", "")).date()
    except Exception:
        pass
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s[:10], fmt).date()
        except Exception:
            continue
    return None


def _add_months(d: date, months: int) -> date:
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1
    last = calendar.monthrange(y, m)[1]
    return date(y, m, min(d.day, last))


def _duration_to_months(text: str) -> int | None:
    s = (text or "").strip().lower()
    if not s:
        return None
    # examples: "2 month", "3 months", "1 year", "2 years"
    m = re.search(r"(\d+)\s*(month|months|mon|mons|year|years|yr|yrs)\b", s)
    if not m:
        return None
    n = int(m.group(1))
    unit = m.group(2)
    if unit.startswith("year") or unit in {"yr", "yrs"}:
        return n * 12
    return n


def _get_table_columns(vendor_cur, table_name: str) -> set[str]:
    vendor_cur.execute(
        """
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'new_swiftbim' AND TABLE_NAME = %s
        """,
        (table_name,),
    )
    return {r["COLUMN_NAME"] for r in (vendor_cur.fetchall() or [])}


def _first_nonempty(row: dict, keys: list[str]) -> str:
    for k in keys:
        if k in row and row.get(k) not in (None, "", "NULL"):
            v = row.get(k)
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                return str(int(v) if v == int(v) else v)
            return str(v).strip()
    return ""


def _hydrate_project_phase1_fields(project_dicts: list[dict]):
    """
    Enrich projects with values sourced from new_swiftbim phase-1 tables:
    - bim_enquiry
    - proposals
    - contracts

    Adds / overrides:
    - resources (Total Resources Available)
    - location
    - end_date (computed from start_date + completion_time when needed)
    """
    if not project_dicts:
        return

    try:
        vendor_conn = _get_vendor_db()
        vendor_cur = vendor_conn.cursor(dictionary=True)

        cols_enq = _get_table_columns(vendor_cur, "bim_enquiry")
        cols_prop = _get_table_columns(vendor_cur, "proposals")
        cols_con = _get_table_columns(vendor_cur, "contracts")

        # Candidate columns (we'll probe whichever exist)
        name_cols = ["project_name", "project", "title", "name"]
        # bim_enquiry location pieces (preferred)
        enq_loc_parts = ["address", "city", "state", "country"]
        # Some schemas store a prebuilt location field
        enq_loc_fallback = ["project_location", "location", "projectLocation"]
        # proposals resources column is the source of truth (but many rows are empty in current DB)
        proposal_res_cols = ["resources"]
        start_cols = ["project_start_date", "start_date", "startDate"]
        # completion timeline is in bim_enquiry; some schemas use other names
        duration_cols = ["completion_timeline", "project_completion_time", "completion_time", "completionTime", "project_duration", "duration", "project_completion"]

        def fetch_by_name(table: str, cols: set[str], project_name: str) -> dict | None:
            # Legacy fallback only: most phase-1 tables don't have project_name
            if not project_name:
                return None
            key = next((c for c in name_cols if c in cols), None)
            if not key:
                return None
            vendor_cur.execute(
                f"SELECT * FROM {table} WHERE {key} = %s ORDER BY id DESC LIMIT 1",
                (project_name,),
            )
            return vendor_cur.fetchone()

        def fetch_phase1_chain_for_project(p: dict) -> tuple[dict, dict, dict]:
            """
            Resolve (enquiry, proposal, contract) for a project using the most reliable links available:
            1) contracts.client_id == projects.client_id  -> contracts.proposal_id -> proposals.service_id -> bim_enquiry.id
            2) fallback: proposals.email_address == users.email (users.id == projects.client_id) -> proposals.service_id -> enquiry
            3) legacy fallback: by project_name (if present in schema)
            """
            enq, prop, con = {}, {}, {}
            client_id = _as_int_id(p.get("client_id"))

            # 1) contract -> proposal -> enquiry (best)
            if client_id is not None:
                try:
                    vendor_cur.execute(
                        "SELECT * FROM contracts WHERE client_id = %s ORDER BY id DESC LIMIT 1",
                        (client_id,),
                    )
                    con = vendor_cur.fetchone() or {}
                    pid = _as_int_id(con.get("proposal_id"))
                    if pid is not None:
                        vendor_cur.execute(
                            "SELECT * FROM proposals WHERE id = %s LIMIT 1",
                            (pid,),
                        )
                        prop = vendor_cur.fetchone() or {}
                except Exception:
                    con, prop = {}, {}

            # 2) proposal by client email (fallback)
            if not prop and client_id is not None:
                try:
                    vendor_cur.execute(
                        "SELECT email FROM users WHERE id = %s LIMIT 1",
                        (client_id,),
                    )
                    u = vendor_cur.fetchone() or {}
                    email = (u.get("email") or "").strip()
                    if email:
                        vendor_cur.execute(
                            "SELECT * FROM proposals WHERE email_address = %s ORDER BY id DESC LIMIT 1",
                            (email,),
                        )
                        prop = vendor_cur.fetchone() or {}
                except Exception:
                    prop = {}

            # 3) enquiry from proposal.service_id (or legacy by name)
            sid = _as_int_id(prop.get("service_id")) if prop else None
            if sid is not None:
                try:
                    vendor_cur.execute(
                        "SELECT * FROM bim_enquiry WHERE id = %s LIMIT 1",
                        (sid,),
                    )
                    enq = vendor_cur.fetchone() or {}
                except Exception:
                    enq = {}
            else:
                # very last resort
                project_name = (p.get("project_name") or "").strip()
                enq = fetch_by_name("bim_enquiry", cols_enq, project_name) or {}
                prop = prop or fetch_by_name("proposals", cols_prop, project_name) or {}
                con = con or fetch_by_name("contracts", cols_con, project_name) or {}

            return enq, prop, con

        for p in project_dicts:
            project_name = (p.get("project_name") or "").strip()

            enq_row, prop_row, con_row = fetch_phase1_chain_for_project(p)

            # Resources + Required Resources: from proposals.resources when available
            prop_resources = _first_nonempty(prop_row, [c for c in proposal_res_cols if c in prop_row])
            if prop_resources:
                p["resources"] = prop_resources
                p["required_resources"] = prop_resources
            else:
                # Fallback: if proposals.resources is empty in DB, derive total resources from proposals.commercial_offer
                # (sum of each milestone's `resources`), else fall back to enquiry list counts.
                derived = 0
                try:
                    raw_offer = prop_row.get("commercial_offer")
                    offer = raw_offer
                    if isinstance(raw_offer, str):
                        offer = json.loads(raw_offer) if raw_offer.strip() else []
                    if isinstance(offer, list):
                        for item in offer:
                            if not isinstance(item, dict):
                                continue
                            rv = item.get("resources")
                            if rv is None:
                                continue
                            s = str(rv).strip()
                            if s.isdigit():
                                derived += int(s)
                except Exception:
                    derived = 0

                if not derived:
                    def _count_listish(val):
                        if val is None:
                            return 0
                        s = str(val).strip()
                        if not s:
                            return 0
                        parts = [p.strip() for p in re.split(r"[,\n;]+", s) if p.strip()]
                        return len(parts)

                    derived = _count_listish(enq_row.get("disciplines_required")) or _count_listish(
                        enq_row.get("bim_services_required")
                    )

                if derived:
                    p["resources"] = str(derived)
                    p["required_resources"] = str(derived)

            # Location: build from enquiry as "address, city, state, country"
            loc_parts = []
            for k in enq_loc_parts:
                v = (enq_row.get(k) or "").strip() if isinstance(enq_row.get(k), str) else enq_row.get(k)
                v = str(v).strip() if v not in (None, "", "NULL") else ""
                if v:
                    loc_parts.append(v)
            combined_loc = ", ".join(loc_parts).strip(", ").strip()
            if not combined_loc:
                combined_loc = _first_nonempty(enq_row, [c for c in enq_loc_fallback if c in enq_row])
            if combined_loc and (not p.get("location") or str(p.get("location")).strip().lower() in {"empty", "n/a", "na"}):
                p["location"] = combined_loc

            # End date calculation
            start_dt = _parse_iso_date(p.get("start_date") or p.get("startDate"))
            if not start_dt:
                # bim_enquiry uses projectstart_date (not start_date)
                start_dt = (
                    _parse_iso_date(_first_nonempty(enq_row, ["projectstart_date"]))
                    or _parse_iso_date(_first_nonempty(enq_row, [c for c in start_cols if c in enq_row]))
                    or _parse_iso_date(_first_nonempty(prop_row, [c for c in start_cols if c in prop_row]))
                    or _parse_iso_date(_first_nonempty(con_row, [c for c in start_cols if c in con_row]))
                )

            # We only trust end_date if it's a real date; due_date may be a duration string ("6 months")
            end_dt_existing = _parse_iso_date(p.get("end_date"))
            duration_text = (
                _first_nonempty(enq_row, [c for c in duration_cols if c in enq_row])
                or _first_nonempty(prop_row, [c for c in duration_cols if c in prop_row])
                or _first_nonempty(con_row, [c for c in duration_cols if c in con_row])
                or (str(p.get("due_date") or "").strip())
            )
            months = _duration_to_months(duration_text)

            # If frontend is getting "Invalid Date", it's usually because end_date is empty/garbled.
            # Only compute if we have a start date + duration.
            if months is not None and start_dt and not end_dt_existing:
                p["end_date"] = _add_months(start_dt, months).isoformat()
    except Exception:
        return
    finally:
        try:
            if "vendor_conn" in locals() and vendor_conn.is_connected():
                vendor_conn.close()
        except Exception:
            pass


@bp.route("/<int:project_id>", methods=["GET"])
@project_app_required
def get_project(project_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM projects WHERE id = %s AND Company_id = %s",
        (project_id, g.company_id),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Project not found"}), 404
    d = dict(row)
    cur.execute(
        """SELECT COUNT(*) AS total_tasks,
           SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks
           FROM tasks WHERE projectid = %s AND Company_id = %s""",
        (project_id, g.company_id),
    )
    counts = cur.fetchone() or {}
    d["total_tasks"] = int(counts.get("total_tasks") or 0)
    d["completed_tasks"] = int(counts.get("completed_tasks") or 0)
    if d.get("due_date") and hasattr(d["due_date"], "isoformat"):
        d["due_date"] = d["due_date"].isoformat()
    if d.get("start_date") and hasattr(d["start_date"], "isoformat"):
        d["start_date"] = d["start_date"].isoformat()
    if d.get("bidding_end_date") and hasattr(d["bidding_end_date"], "isoformat"):
        d["bidding_end_date"] = d["bidding_end_date"].isoformat()
    # Backwards-compat for frontend field names
    if "no_resource" in d and "resources" not in d:
        d["resources"] = d.get("no_resource")
    if "no_resources_requried" in d and "required_resources" not in d:
        d["required_resources"] = d.get("no_resources_requried")
    _hydrate_project_display_fields(cur, g.company_id, [d])
    _hydrate_project_phase1_fields([d])
    return jsonify(d)


def _normalize_module_key(module_name: str) -> str:
    """
    Normalize modules_name values so different panels group consistently.
    Examples:
    - "PD - Package1" -> "PD"
    - "PD/Package1" -> "PD"
    - "m1" -> "m1"
    """
    s = (module_name or "").strip()
    if not s:
        return ""
    if " - " in s:
        return s.split(" - ", 1)[0].strip()
    if "/" in s:
        return s.split("/", 1)[0].strip()
    return s


def _normalize_task_status(status: str) -> str:
    s = (status or "").strip().lower()
    if s in {"todo", "to do", "to_do"}:
        return "todo"
    if s in {"inprogress", "in progress", "in_progress"}:
        return "inprogress"
    if s in {"pause", "paused"}:
        return "paused"
    if s in {"completed", "complete"}:
        return "completed"
    return s


@bp.route("/<int:project_id>/module-progress", methods=["GET"])
@project_app_required
def project_module_progress(project_id):
    """
    Returns module-wise completion percentage and overall project completion percentage.

    Completion % = (Completed / Total) * 100
    Completed = tasks.status == 'Completed'
    Total = all tasks for that module
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, modules FROM projects WHERE id = %s AND Company_id = %s",
        (project_id, g.company_id),
    )
    proj = cur.fetchone()
    if not proj:
        return jsonify({"success": False, "message": "Project not found"}), 404

    # Fetch tasks for project (only needed columns)
    cur.execute(
        "SELECT status, modules_name FROM tasks WHERE projectid = %s AND Company_id = %s",
        (project_id, g.company_id),
    )
    tasks = cur.fetchall()

    # Aggregate overall
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if _normalize_task_status(str(t.get("status") or "")) == "completed")
    project_completion_percentage = round((completed_tasks / total_tasks) * 100, 2) if total_tasks else 0.0

    status_counts = {"todo": 0, "inprogress": 0, "paused": 0, "completed": 0}
    for t in tasks:
        ns = _normalize_task_status(str(t.get("status") or ""))
        if ns in status_counts:
            status_counts[ns] += 1

    # Determine module list: prefer projects.modules, otherwise derive from tasks
    raw_modules = (proj.get("modules") or "").strip()
    module_names = []
    if raw_modules:
        module_names = [m.strip() for m in raw_modules.split(",") if m.strip()]
    else:
        derived = {_normalize_module_key(t.get("modules_name") or "") for t in tasks}
        module_names = [m for m in sorted(derived) if m]

    # Aggregate by normalized module key
    module_totals = {}
    module_completed = {}
    for t in tasks:
        key = _normalize_module_key(t.get("modules_name") or "")
        if not key:
            key = "Unassigned"
        module_totals[key] = module_totals.get(key, 0) + 1
        if _normalize_task_status(str(t.get("status") or "")) == "completed":
            module_completed[key] = module_completed.get(key, 0) + 1

    modules_out = []
    for name in module_names:
        # use normalized key for lookups, but keep original name for display
        key = _normalize_module_key(name)
        tot = int(module_totals.get(key, 0))
        comp = int(module_completed.get(key, 0))
        pct = round((comp / tot) * 100, 2) if tot else 0.0
        modules_out.append(
            {
                "module_name": name,
                "total_tasks": tot,
                "completed_tasks": comp,
                "completion_percentage": pct,
            }
        )

    # Include Unassigned if exists
    if module_totals.get("Unassigned"):
        tot = int(module_totals.get("Unassigned", 0))
        comp = int(module_completed.get("Unassigned", 0))
        pct = round((comp / tot) * 100, 2) if tot else 0.0
        modules_out.append(
            {
                "module_name": "Unassigned",
                "total_tasks": tot,
                "completed_tasks": comp,
                "completion_percentage": pct,
            }
        )

    return jsonify(
        {
            "success": True,
            "project_id": project_id,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "project_completion_percentage": project_completion_percentage,
            "status_counts": status_counts,
            "modules": modules_out,
        }
    )


def _sync_vendor_bidding_for_outsource_project(cur, company_id, project_id, department_val, budget_ceiling, bidding_end_date):
    """
    When a project is outsource (Submission Deadline) or has bidding fields set,
    upsert vendor_bidding so vendor Opportunities lists stay in sync.
    Same rules as update_project OUTSOURCE BRIDGE.
    """
    department_val = department_val or ""
    is_outsource = (department_val == "Submission Deadline") or (budget_ceiling and bidding_end_date)
    if not is_outsource:
        return
    try:
        cur.execute(
            "SELECT project_name, budget, description FROM projects WHERE id = %s AND Company_id = %s",
            (project_id, company_id),
        )
        proj = cur.fetchone()
        if not proj:
            return
        project_name = proj["project_name"]
        outsource_budget = proj["budget"]
        description = proj.get("description") or ""
        cur.execute(
            """INSERT INTO vendor_bidding
                 (project_id, project_name, description, outsource_budget, budget_ceiling, bid_deadline, status, company_id)
               VALUES (%s, %s, %s, %s, %s, %s, 'active', %s)
               ON DUPLICATE KEY UPDATE
                 project_name   = VALUES(project_name),
                 description    = VALUES(description),
                 outsource_budget = VALUES(outsource_budget),
                 budget_ceiling = VALUES(budget_ceiling),
                 bid_deadline   = VALUES(bid_deadline),
                 status         = 'active',
                 company_id     = VALUES(company_id)
            """,
            (project_id, project_name, description, outsource_budget, budget_ceiling or outsource_budget, bidding_end_date, company_id),
        )
    except Exception:
        pass


@bp.route("", methods=["POST"])
@project_app_required
def create_project():
    # Handle both JSON and Form data for flexibility
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    project_name = data.get("project_name") or data.get("projectname")
    members = data.get("members") or ""
    department = data.get("department") or ""
    due_date = data.get("due_date")
    priority = data.get("priority") or "Low"
    budget = data.get("budget") or "0"
    modules = data.get("modules") or ""
    raw_client = data.get("client_id") or None
    raw_pm = data.get("project_manager_id") or None
    raw_lead = data.get("lead_id") or None
    raw_bim_co = data.get("bim_coordinator_id") or None
    totalhours = data.get("totalhours") or data.get("total_hours") or None
    perday = data.get("perday") or data.get("per_day") or None
    location = data.get("location") or None
    description = data.get("description") or None
    start_date = data.get("start_date") or None
    resources = data.get("resources") or data.get("no_resource") or None
    required_resources = data.get("required_resources") or data.get("no_resources_requried") or None
    tasks = data.get("tasks") or ""
    budget_ceiling = data.get("budget_ceiling")
    bidding_end_date = data.get("bidding_end_date")

    if not project_name:
        return jsonify({"success": False, "message": "project_name required"}), 400

    # Handle file uploads
    uploaded_files = request.files.getlist("files")
    file_paths = []
    if uploaded_files:
        upload_folder = current_app.config.get("UPLOAD_FOLDER")
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        
        for file in uploaded_files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                # Prefix with project name or timestamp for uniqueness if needed, but keeping it simple for now
                file.save(os.path.join(upload_folder, filename))
                file_paths.append(filename)

    document_attachment = ",".join(file_paths) if file_paths else ""

    conn = get_db()
    cur = conn.cursor()
    # Resolve names to IDs
    client_id = _resolve_client_id(cur, g.company_id, raw_client)
    project_manager_id = _resolve_employee_id(cur, g.company_id, raw_pm)
    lead_id = _resolve_employee_id(cur, g.company_id, raw_lead)
    bim_coordinator_id = _resolve_employee_id(cur, g.company_id, raw_bim_co)
    department = _resolve_project_department(cur, g.company_id, department)

    cur.execute(
        """INSERT INTO projects (project_name, uploaderid, members, department, due_date, priority, budget, modules,
           progress, Company_id, client_id, project_manager_id, lead_id, bim_coordinator_id, totalhours, perday, location, description, start_date, no_resource, no_resources_requried, tasks, document_attachment, budget_ceiling, bidding_end_date)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (project_name, g.user_id, members, department, due_date, priority, budget, modules, g.company_id,
         client_id, project_manager_id, lead_id, bim_coordinator_id, totalhours, perday, location, description, start_date,
         resources, required_resources, tasks, document_attachment, budget_ceiling, bidding_end_date),
    )
    project_id = cur.lastrowid

    _sync_vendor_bidding_for_outsource_project(cur, g.company_id, project_id, department, budget_ceiling, bidding_end_date)

    # Notifications: inform everyone involved in this project
    try:
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

        # Parse members CSV -> ids
        member_ids = _parse_csv_int_ids(members) if members else []
        involved = set(member_ids)
        for rid in (project_manager_id, lead_id, bim_coordinator_id):
            if rid:
                try:
                    involved.add(int(rid))
                except Exception:
                    pass
        # Don't notify creator about their own action
        try:
            involved.discard(int(g.user_id))
        except Exception:
            pass

        # uploader name
        cur.execute(
            "SELECT full_name FROM employee WHERE id = %s AND Company_id = %s",
            (g.user_id, g.company_id),
        )
        urow = cur.fetchone() or {}
        uploader_name = urow.get("full_name") or "Someone"

        title = "New project assignment"
        msg = f"You are involved in project '{project_name}' (assigned by {uploader_name})."

        for uid in involved:
            cur.execute(
                """
                INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                """,
                (uid, project_id, title, msg, "project_assignment", "project", project_id, g.company_id),
            )
        if involved:
            conn.commit()
    except Exception:
        pass

    return jsonify({"success": True, "project_id": project_id})


@bp.route("/<int:project_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_project(project_id):
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form
        data = dict(data) # Convert to mutable dict

    conn = get_db()
    cur = conn.cursor()
    # MySQL may report rowcount=0 when an UPDATE doesn't change any values.
    # So we check existence up front to avoid returning a false 404.
    cur.execute("SELECT 1 FROM projects WHERE id = %s AND Company_id = %s", (project_id, g.company_id))
    project_exists = cur.fetchone() is not None
    if not project_exists:
        return jsonify({"success": False, "message": "Project not found"}), 404

    # Handle file uploads
    uploaded_files = request.files.getlist("files")
    file_paths = []
    
    # Get existing files if any (preserving them if the user didn't explicitly remove them, handles below)
    cur.execute("SELECT document_attachment FROM projects WHERE id = %s", (project_id,))
    row = cur.fetchone()
    existing_file_str = row.get("document_attachment") if row else ""
    existing_files = [f.strip() for f in existing_file_str.split(",") if f.strip()] if existing_file_str else []

    # If the user provides a 'removed_files' list, filter existing_files
    removed_files = data.get("removed_files", "")
    if removed_files:
        if isinstance(removed_files, str):
            removed_list = [f.strip() for f in removed_files.split(",") if f.strip()]
        else:
            removed_list = removed_files # already a list if JSON
        existing_files = [f for f in existing_files if f not in removed_list]

    if uploaded_files:
        upload_folder = current_app.config.get("UPLOAD_FOLDER")
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        
        for file in uploaded_files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                file.save(os.path.join(upload_folder, filename))
                file_paths.append(filename)

    # Combine existing (not removed) and newly uploaded files
    all_files = list(set(existing_files + file_paths))
    data["document_attachment"] = ",".join(all_files)

    # Resolve names to IDs so we always store IDs
    if data.get("client_id") is not None:
        data["client_id"] = _resolve_client_id(cur, g.company_id, data["client_id"])
    if data.get("project_manager_id") is not None:
        data["project_manager_id"] = _resolve_employee_id(cur, g.company_id, data["project_manager_id"])
    if data.get("lead_id") is not None:
        data["lead_id"] = _resolve_employee_id(cur, g.company_id, data["lead_id"])
    if data.get("bim_coordinator_id") is not None:
        data["bim_coordinator_id"] = _resolve_employee_id(cur, g.company_id, data["bim_coordinator_id"])
    if data.get("department") is not None:
        data["department"] = _resolve_project_department(cur, g.company_id, data["department"])
    # Map API field names -> DB column names for resource fields
    if data.get("resources") is not None and data.get("no_resource") is None:
        data["no_resource"] = data.get("resources")
    if data.get("required_resources") is not None and data.get("no_resources_requried") is None:
        data["no_resources_requried"] = data.get("required_resources")

    allowed = ("project_name", "members", "department", "due_date", "priority", "budget", "modules", "progress",
               "client_id", "project_manager_id", "lead_id", "bim_coordinator_id", "totalhours", "perday", "location", "description", "start_date",
               "budget_ceiling", "bidding_end_date", "no_resource", "no_resources_requried", "tasks", "document_attachment")
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(data[key])
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
    params.extend([project_id, g.company_id])
    cur.execute("UPDATE projects SET " + ", ".join(sets) + " WHERE id = %s AND Company_id = %s", params)

    # -----------------------------------------------------------------------
    # OUTSOURCE BRIDGE: if this update marks the project as Outsource
    # (department = "Submission Deadline"), push/update the opportunity in
    # the vendor-facing new_swiftbim.vendor_bidding table so all vendors
    # can see it immediately in their Opportunities page.
    # -----------------------------------------------------------------------
    department_val = data.get("department", "")
    budget_ceiling = data.get("budget_ceiling")
    bidding_end_date = data.get("bidding_end_date")
    _sync_vendor_bidding_for_outsource_project(cur, g.company_id, project_id, department_val, budget_ceiling, bidding_end_date)

    return jsonify({"success": True})


@bp.route("/<int:project_id>", methods=["DELETE"])
@project_app_required
def delete_project(project_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM projects WHERE id = %s AND Company_id = %s", (project_id, g.company_id))
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Project not found"}), 404


# Member filter endpoints (from memberfiler.php)
@bp.route("/filters/leaders", methods=["POST"])
@project_app_required
def filter_leaders():
    data = request.get_json() or request.form
    manager_id = data.get("manager_id")
    project_lead_id = data.get("projectleadId")
    if not manager_id:
        return jsonify({"success": False, "leaders": []}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT t.*, e.full_name, e.id, e.user_role
           FROM team t JOIN employee e ON t.leader = e.id
           WHERE t.project_lead = %s""",
        (manager_id,),
    )
    rows = cur.fetchall()
    leaders = [{"id": r["id"], "full_name": r["full_name"], "user_role": r["user_role"], "selected": r["id"] == project_lead_id} for r in rows]
    return jsonify({"success": True, "leaders": leaders})


@bp.route("/filters/members", methods=["POST"])
@project_app_required
def filter_members():
    data = request.get_json() or request.form
    leader_id = data.get("leader_id")
    if not leader_id:
        return jsonify({"success": False, "members": []}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT e.id, e.full_name, e.user_role
           FROM team t
           JOIN employee e ON FIND_IN_SET(e.id, REPLACE(t.employee, ' ', '')) > 0
           WHERE t.leader = %s""",
        (leader_id,),
    )
    rows = cur.fetchall()
    members = [{"value": r["id"], "name": f"{r['full_name']}({r['user_role']})"} for r in rows]
    return jsonify({"success": True, "members": members})


@bp.route("/filters/modules", methods=["POST"])
@project_app_required
def filter_modules():
    data = request.get_json() or request.form
    project_id = data.get("projectId")
    selected_module = data.get("projectmodules")
    if not project_id:
        return jsonify({"success": False, "modules": []}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT modules FROM projects WHERE id = %s AND Company_id = %s", (project_id, g.company_id))
    row = cur.fetchone()
    if not row or not row.get("modules"):
        return jsonify({"success": True, "modules": []})
    modules = [m.strip() for m in str(row["modules"]).split(",") if m.strip()]
    out = [{"value": m, "label": m, "selected": m == selected_module} for m in modules]
    return jsonify({"success": True, "modules": out})
