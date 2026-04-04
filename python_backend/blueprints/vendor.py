import mysql.connector as mysql_connector
from datetime import date, datetime, time, timedelta
import re
import calendar
import json
from decimal import Decimal
from flask import Blueprint, request, jsonify, g, current_app
from auth_middleware import login_required
from db import get_db
import hashlib
import random
import smtplib
import ssl
from email.mime.text import MIMEText

bp = Blueprint("vendors", __name__, url_prefix="/api/vendors")


# ---------------------------------------------------------------------------
# Dedicated connection helper for the new_swiftbim database.
# Re-uses the same host / user / password / port as the main DB (from app
# config / .env) but overrides the database name to "new_swiftbim".
# ---------------------------------------------------------------------------

def get_vendor_db():
    """Return a per-request dict-cursor connection to the new_swiftbim DB."""
    if "vendor_db" not in g:
        conn = mysql_connector.connect(
            host=current_app.config["MYSQL_HOST"],
            user=current_app.config["MYSQL_USER"],
            password=current_app.config["MYSQL_PASSWORD"],
            database="new_swiftbim",
            port=current_app.config.get("MYSQL_PORT", 3306),
            autocommit=current_app.config.get("MYSQL_AUTOCOMMIT", True),
        )
        g.vendor_db = conn
    return g.vendor_db


def vendor_cursor():
    """Return a dictionary cursor from the vendor DB connection."""
    return get_vendor_db().cursor(dictionary=True)

def _get_profile_ids_for_employees(employee_ids):
    """Helper to resolve profile IDs in new_swiftbim from employee IDs in snh6_swiftproject."""
    if not employee_ids:
        return []
    try:
        vcur = vendor_cursor()
        ps = ",".join(["%s"] * len(employee_ids))
        vcur.execute(
            f"SELECT id FROM vendor_resource_profiles WHERE vendor_employee_id IN ({ps})",
            employee_ids
        )
        return [int(rp["id"]) for rp in vcur.fetchall() or []]
    except Exception:
        return []

def _md5_hash(text: str) -> str:
    return hashlib.md5((text or "").encode()).hexdigest()


# NOTE: Blueprint does not support teardown decorators directly.
# Cleanup is handled in app.py via @app.teardown_appcontext (see app.py).


# ---------------------------------------------------------------------------
# Serialisation helper
# ---------------------------------------------------------------------------

def _serialize(value):
    """Convert non-JSON-serialisable types (date, time, timedelta, Decimal) to strings/numbers."""
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, timedelta):
        total = int(value.total_seconds())
        h, r = divmod(max(total, 0), 3600)
        m, s = divmod(r, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
    if isinstance(value, time):
        return value.strftime("%H:%M:%S")
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


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


def _is_concrete_calendar_date(val) -> bool:
    """True if value is a parseable calendar date (not empty / N/A / free text)."""
    if val is None:
        return False
    s = str(val).strip()
    if not s or s.lower() in {"n/a", "na", "6 months"}:
        return False
    return _parse_iso_date(val) is not None


def _add_months(d: date, months: int) -> date:
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1
    last = calendar.monthrange(y, m)[1]
    return date(y, m, min(d.day, last))


def _duration_to_months(text: str) -> int | None:
    s = (text or "").strip().lower()
    if not s:
        return None
    m = re.search(r"(\d+)\s*(month|months|mon|mons|year|years|yr|yrs)\b", s)
    if not m:
        return None
    val = int(m.group(1))
    unit = m.group(2)
    if unit.startswith("year") or unit.startswith("yr"):
        return val * 12
    return val


def _first_nonempty_val(d: dict, keys: list[str]):
    for k in keys:
        v = d.get(k)
        if v not in (None, "", "N/A", "na", "NULL"):
            return str(v)
    return None


def _hydrate_vendor_projects_phase1(vendor_cur, project_dicts: list[dict]):
    """
    Enrich vendor projects with values from phase-1 tables (bim_enquiry, proposals, contracts).
    Ported logic from projects.py for robust data resolution.
    """
    if not project_dicts or not vendor_cur:
        return

    try:
        enq_loc_parts = ["address", "city", "state", "country"]
        duration_cols = ["completion_timeline", "project_completion_time", "completion_time", "project_duration", "duration"]
        start_cols = ["project_start_date", "start_date"]
        proposal_res_cols = ["resources", "no_resource", "total_resources"]

        for p in project_dicts:
            p_name = (p.get("project_name") or "").strip()
            client_id = p.get("client_id")
            prop_id = p.get("proposal_id")
            opp_id = p.get("opportunity_id")
            
            enq, prop, con = {}, {}, {}
            
            # 0) Direct ID lookups (Best if they exist)
            if prop_id:
                try:
                    vendor_cur.execute("SELECT * FROM proposals WHERE id = %s LIMIT 1", (prop_id,))
                    prop = vendor_cur.fetchone() or {}
                except Exception: pass
            
            if opp_id:
                try:
                    vendor_cur.execute("SELECT * FROM bim_enquiry WHERE id = %s LIMIT 1", (opp_id,))
                    enq = vendor_cur.fetchone() or {}
                except Exception: pass
            
            # 1) Try resolve chain by client_id -> contracts -> proposals -> enquiry (Legacy/Sync)
            if not prop and client_id:
                try:
                    vendor_cur.execute(
                        "SELECT * FROM contracts WHERE client_id = %s ORDER BY id DESC LIMIT 1",
                        (client_id,),
                    )
                    con = vendor_cur.fetchone() or {}
                    
                    found_prop_id = con.get("proposal_id")
                    if found_prop_id:
                        vendor_cur.execute("SELECT * FROM proposals WHERE id = %s LIMIT 1", (found_prop_id,))
                        prop = vendor_cur.fetchone() or {}
                    
                    if not enq:
                        svc_id = prop.get("service_id")
                        if svc_id:
                            vendor_cur.execute("SELECT * FROM bim_enquiry WHERE id = %s LIMIT 1", (svc_id,))
                            enq = vendor_cur.fetchone() or {}
                except Exception: pass

            # 2) Fallback to name-based matching if chain failed
            if not prop and p_name:
                try:
                    name_cols = ["project_name", "enquiry_name", "name", "service_name", "title"]
                    for col in name_cols:
                        vendor_cur.execute(
                            f"SELECT * FROM proposals WHERE {col} = %s ORDER BY id DESC LIMIT 1",
                            (p_name,),
                        )
                        prop = vendor_cur.fetchone()
                        if prop: break
                    prop = prop or {}

                    if not enq:
                        # Try find enquiry by name columns
                        for col in name_cols:
                            vendor_cur.execute(
                                f"SELECT * FROM bim_enquiry WHERE {col} = %s ORDER BY id DESC LIMIT 1",
                                (p_name,),
                            )
                            enq = vendor_cur.fetchone()
                            if enq: break
                        enq = enq or {}
                except Exception: pass

            # 2b) Fallback to client-email-based matching for enquiry if still missing
            if not enq and client_id:
                try:
                    vendor_cur.execute("SELECT email FROM users WHERE id = %s LIMIT 1", (client_id,))
                    u = vendor_cur.fetchone()
                    if u and u.get("email"):
                        vendor_cur.execute(
                            "SELECT * FROM bim_enquiry WHERE email_address = %s ORDER BY id DESC LIMIT 1",
                            (u["email"],),
                        )
                        enq = vendor_cur.fetchone() or {}
                except Exception: pass

            # 3) Global Fallback: If still empty, look for any other project in same batch with same name that found something
            if not prop and p_name:
                for other in project_dicts:
                    if other.get("project_name") == p_name and other.get("_hydrated_prop"):
                        prop = other["_hydrated_prop"]
                        enq = other.get("_hydrated_enq", {})
                        break
            
            # Store for global fallback pass
            if prop: p["_hydrated_prop"] = prop
            if enq: p["_hydrated_enq"] = enq

            # Hydrate fields
            # 1. Resources
            prop_res = _first_nonempty_val(prop, proposal_res_cols)
            if prop_res:
                p["resources"] = prop_res
                p["required_resources"] = prop_res
            elif not p.get("resources") or str(p.get("resources")).strip().lower() in ("n/a", "na", "", "0"):
                # Derived count from commercial offer
                derived = 0
                try:
                    raw_offer = prop.get("commercial_offer")
                    offer = json.loads(raw_offer) if isinstance(raw_offer, str) and raw_offer.strip() else []
                    if isinstance(offer, list):
                        for item in offer:
                            if isinstance(item, dict) and item.get("resources"):
                                val = str(item.get("resources")).strip()
                                derived += int(val) if val.isdigit() else 0
                except Exception: derived = 0
                
                if not derived:
                    disc = enq.get("disciplines_required")
                    if disc:
                        # Handle JSON disciplines or raw string
                        try:
                            d_json = json.loads(disc)
                            if isinstance(d_json, dict):
                                # Count across all categories (Core, Additional, etc.)
                                count = 0
                                for v in d_json.values():
                                    if isinstance(v, list): count += len(v)
                                derived = count
                        except Exception:
                            derived = len([x for x in re.split(r"[,\n;]+", str(disc)) if x.strip()])
                
                if derived:
                    p["resources"] = str(derived)
                    p["required_resources"] = str(derived)

            # 2. Date Calculation (6 months rule)
            start_dt_raw = p.get("start_date")
            due_dt_raw = p.get("due_date")
            
            # If due_date is "6 months" or empty, and we have a start_date, calculate it
            if start_dt_raw and (not due_dt_raw or str(due_dt_raw).strip().lower() in {"", "6 months", "n/a", "na"}):
                try:
                    # Try parse start date (could be YYYY-MM-DD or datetime)
                    if isinstance(start_dt_raw, str):
                        s_dt = datetime.strptime(start_dt_raw.split(" ")[0], "%Y-%m-%d")
                    else:
                        s_dt = start_dt_raw
                    
                    # Add 6 months
                    # Simple approximation or exact
                    if s_dt:
                        plus_6 = s_dt + timedelta(days=183) # ~6 months
                        p["due_date"] = plus_6.strftime("%Y-%m-%d")
                        p["end_date"] = p["due_date"] # Aliasing
                except Exception: pass
            elif not p.get("resources") or str(p.get("resources")).strip().lower() in ("n/a", "na", ""):
                # Derived count from commercial offer
                derived = 0
                try:
                    raw_offer = prop.get("commercial_offer")
                    offer = json.loads(raw_offer) if isinstance(raw_offer, str) and raw_offer.strip() else []
                    if isinstance(offer, list):
                        for item in offer:
                            if isinstance(item, dict) and item.get("resources"):
                                derived += int(str(item.get("resources")).strip() or 0)
                except Exception: derived = 0
                
                if not derived:
                    disc = enq.get("disciplines_required")
                    if disc:
                        derived = len([x for x in re.split(r"[,\n;]+", str(disc)) if x.strip()])
                
                if derived:
                    p["resources"] = str(derived)
                    p["required_resources"] = str(derived)

            # 2. Location
            if not p.get("location") or str(p.get("location")).strip().lower() in {"empty", "n/a", "na", ""}:
                # Combine address, city, state, country from enquiry
                loc_parts = []
                for k in ["address", "city", "state", "country"]:
                    val = str(enq.get(k) or "").strip()
                    if val and val.lower() != "null":
                        loc_parts.append(val)
                
                combined_loc = ", ".join(loc_parts).strip(", ").strip()
                if combined_loc:
                    p["location"] = combined_loc

            # 3. End Date Calculation — do not overwrite dates saved on vendor_projects / main merge
            if not _is_concrete_calendar_date(p.get("due_date") or p.get("end_date")):
                start_dt = _parse_iso_date(p.get("start_date"))
                if not start_dt:
                    start_dt = _parse_iso_date(enq.get("project_start_date") or prop.get("project_start_date") or con.get("start_date"))

                duration_text = _first_nonempty_val(enq, duration_cols) or _first_nonempty_val(prop, duration_cols) or _first_nonempty_val(con, duration_cols) or (p.get("due_date") or "")
                months = _duration_to_months(str(duration_text))

                if months and start_dt:
                    computed_end = _add_months(start_dt, months)
                    p["end_date"] = computed_end.isoformat()
                    p["due_date"] = computed_end.isoformat()
    except Exception:
        pass


def _fetch_vendor_full(vendor_id):
    """
    Fetch a complete vendor record from the three tables:
      - vendor_onboarding        → main onboarding form data
      - vendor_portfolio         → portfolio / project entries (1-to-many)
      - vendor_resource_profile  → resource profile entries  (1-to-many)

    Returns None if the vendor does not exist.
    """
    cur = vendor_cursor()

    # 1. Main onboarding record
    cur.execute(
        "SELECT * FROM vendor_onboarding WHERE id = %s",
        (vendor_id,),
    )
    row = cur.fetchone()
    if not row:
        return None

    vendor = {k: _serialize(v) for k, v in row.items()}

    # 2. Portfolio projects
    cur.execute(
        "SELECT * FROM vendor_portfolio WHERE vendor_id = %s ORDER BY id",
        (vendor_id,),
    )
    portfolio_rows = cur.fetchall()
    vendor["portfolio_projects"] = [
        {k: _serialize(v) for k, v in r.items()} for r in portfolio_rows
    ]

    # 3. Resource profiles
    cur.execute(
        "SELECT * FROM vendor_resource_profiles WHERE vendor_id = %s ORDER BY id",
        (vendor_id,),
    )
    resource_rows = cur.fetchall()
    vendor["resource_profiles"] = [
        {k: _serialize(v) for k, v in r.items()} for r in resource_rows
    ]

    return vendor


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@bp.route("/client-budget", methods=["GET"])
@login_required
def get_client_budget():
    """
    GET /api/vendors/client-budget?client_id=<id>
    Returns the client's total contract cost (total_cost) from new_swiftbim.contracts.
    This is shown as the 'Client Budget' read-only field in the project edit modal.
    """
    client_id = request.args.get("client_id")
    if not client_id:
        return jsonify({"client_budget": None, "message": "client_id required"}), 400

    cur = vendor_cursor()
    try:
        cur.execute(
            """SELECT SUM(total_cost) AS client_budget
               FROM contracts
               WHERE client_id = %s
               AND status NOT IN ('Draft', 'cancelled')
               LIMIT 1""",
            (client_id,),
        )
        row = cur.fetchone()
        if row and row["client_budget"] is not None:
            return jsonify({"client_budget": float(row["client_budget"])})
        # Try without status filter in case all are draft
        cur.execute(
            "SELECT total_cost FROM contracts WHERE client_id = %s ORDER BY id DESC LIMIT 1",
            (client_id,),
        )
        row2 = cur.fetchone()
        if row2 and row2["total_cost"] is not None:
            return jsonify({"client_budget": float(row2["total_cost"])})
    except Exception as e:
        return jsonify({"client_budget": None, "error": str(e)})

    return jsonify({"client_budget": None})


@bp.route("/vendor-by-role", methods=["GET"])
@login_required
def vendor_employees_by_role():
    """
    GET /api/vendors/vendor-by-role?role=Vendor PM
    or  /api/vendors/vendor-by-role?role=Vendor Bim Lead

    Returns active vendor employees filtered by vendor_employee.role.
    Used by the vendor Projects page to populate Project Manager and BIM Lead
    dropdowns with vendor-side roles.
    """
    role = request.args.get("role")
    if not role:
        return jsonify({"success": False, "message": "role is required"}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """
            SELECT
                id,
                full_name,
                role AS user_role,
                email,
                phone_number,
                vendor_id
            FROM vendor_employee
            WHERE status = 'active'
              AND role = %s
            ORDER BY full_name
            """,
            (role,),
        )
        rows = cur.fetchall()
        employees = [{k: _serialize(v) for k, v in r.items()} for r in rows]
    except Exception as e:
        return jsonify({"success": False, "message": str(e), "employees": []}), 500

    return jsonify({"success": True, "employees": employees})

@bp.route("", methods=["GET"])
@login_required
def list_vendors():
    """
    GET /api/vendors
    Returns all vendors from vendor_onboarding, optionally filtered by
    ?status=pending|approved|rejected
    """
    status_filter = request.args.get("status")
    cur = vendor_cursor()

    if status_filter:
        cur.execute(
            "SELECT * FROM vendor_onboarding WHERE status = %s ORDER BY created_at DESC",
            (status_filter,),
        )
    else:
        cur.execute(
            "SELECT * FROM vendor_onboarding ORDER BY created_at DESC"
        )

    rows = cur.fetchall()
    vendors = [{k: _serialize(v) for k, v in r.items()} for r in rows]
    return jsonify({"vendors": vendors})


@bp.route("/<int:vendor_id>", methods=["GET"])
@login_required
def get_vendor(vendor_id):
    """
    GET /api/vendors/<id>
    Returns the full vendor record including portfolio projects and resource
    profiles. This is the endpoint consumed by PartnerView.tsx.
    """
    vendor = _fetch_vendor_full(vendor_id)
    if not vendor:
        return jsonify({"error": "Vendor not found"}), 404
    return jsonify(vendor)


@bp.route("/by-email", methods=["GET"])
@login_required
def get_vendor_by_email():
    """
    GET /api/vendors/by-email?email=<email>
    Cross-database lookup: the bid stores vendor_email from the main DB
    (employee.email).  This endpoint finds the matching vendor_onboarding
    record in new_swiftbim by checking both the `email` column and the
    `contact_email` column so the frontend can navigate to /td/partner/:id.
    Returns { vendor: { id, company_name, email, ... } } or { vendor: null }.
    """
    email = request.args.get("email", "").strip()
    if not email:
        return jsonify({"vendor": None, "error": "email param required"}), 400

    cur = vendor_cursor()
    try:
        cur.execute(
            """SELECT * FROM vendor_onboarding
               WHERE contact_email = %s
               ORDER BY id DESC LIMIT 1""",
            (email,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"vendor": None})
        vendor = {k: _serialize(v) for k, v in row.items()}
        return jsonify({"vendor": vendor})
    except Exception as e:
        return jsonify({"vendor": None, "error": str(e)}), 500


@bp.route("/<int:vendor_id>/approve", methods=["POST"])
@login_required
def approve_vendor(vendor_id):
    """
    POST /api/vendors/<id>/approve
    Sets the vendor status to 'approved'.
    """
    cur = vendor_cursor()
    cur.execute(
        "UPDATE vendor_onboarding SET status = 'approved' WHERE id = %s",
        (vendor_id,),
    )
    if cur.rowcount == 0:
        return jsonify({"error": "Vendor not found"}), 404
    return jsonify({"success": True, "status": "approved"})


@bp.route("/<int:vendor_id>/reject", methods=["POST"])
@login_required
def reject_vendor(vendor_id):
    """
    POST /api/vendors/<id>/reject
    Sets the vendor status to 'rejected'.
    Tries to store rejection_reason if the column exists; skips it safely if not.
    Body JSON: { "reason": "..." }  (optional)
    """
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "")

    cur = vendor_cursor()

    # Try with rejection_reason column first; fall back gracefully if it doesn't exist
    try:
        cur.execute(
            "UPDATE vendor_onboarding SET status = 'rejected', rejection_reason = %s WHERE id = %s",
            (reason, vendor_id),
        )
    except mysql_connector.errors.DatabaseError:
        # Column rejection_reason doesn't exist yet — update status only
        cur.execute(
            "UPDATE vendor_onboarding SET status = 'rejected' WHERE id = %s",
            (vendor_id,),
        )

    if cur.rowcount == 0:
        return jsonify({"error": "Vendor not found"}), 404
    return jsonify({"success": True, "status": "rejected"})


# ---------------------------------------------------------------------------
# Vendor Dashboard Stats
# ---------------------------------------------------------------------------

@bp.route("/dashboard/stats", methods=["GET"])
@login_required
def vendor_dashboard_stats():
    """
    GET /api/vendors/dashboard/stats
    Returns KPI counts for the vendor's own dashboard.
    Looks up the vendor employee record from the main DB
    (`snh6_swiftproject.vendor_employee`) using the logged-in user's email.
    """

    # My Bids endpoint counts for the logged-in vendor employee only:
    #   WHERE vb.vendor_id = g.user_id
    # Dashboard card "Total Bids Submitted" must match that count.
    conn = get_db()
    user_id = getattr(g, "user_id", None)

    # Count active opportunities (bidding entries that are active)
    active_opportunities = 0
    bids_submitted = 0
    proposals_awaiting = 0
    active_projects = 0

    try:
        main_cur = conn.cursor(dictionary=True)
        # Ensure tables exist (now in main DB)
        main_cur.execute("""CREATE TABLE IF NOT EXISTS snh6_swiftproject.vendor_bidding (
            id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL,
            project_name VARCHAR(255) NOT NULL, description TEXT,
            outsource_budget DECIMAL(15,2), budget_ceiling DECIMAL(15,2),
            bid_deadline DATE, status ENUM('active','closed') DEFAULT 'active',
            company_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_project (project_id))"""
        )
        main_cur.execute("""CREATE TABLE IF NOT EXISTS snh6_swiftproject.vendor_bids (
            id INT AUTO_INCREMENT PRIMARY KEY, opportunity_id INT NOT NULL,
            vendor_id INT NOT NULL, bid_amount DECIMAL(15,2), notes TEXT,
            timeline VARCHAR(255), team_size INT DEFAULT 0,
            status ENUM('submitted','shortlisted','won','lost') DEFAULT 'submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_vendor_opportunity (vendor_id, opportunity_id))"""
        )
        main_cur.execute(
            "SELECT COUNT(*) AS cnt FROM snh6_swiftproject.vendor_bidding WHERE status = 'active'"
        )
        r = main_cur.fetchone()
        active_opportunities = r["cnt"] if r else 0
    except Exception:
        active_opportunities = 0

    if user_id:
        try:
            main_cur = conn.cursor(dictionary=True)
            # 1. Count bids and proposals
            main_cur.execute(
                """
                SELECT
                    COUNT(*) AS total_cnt,
                    SUM(CASE WHEN status = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted_cnt
                FROM snh6_swiftproject.vendor_bids
                WHERE vendor_id = %s
                """,
                (user_id,),
            )
            r = main_cur.fetchone()
            bids_submitted = int((r or {}).get("total_cnt") or 0)
            proposals_awaiting = int((r or {}).get("shortlisted_cnt") or 0)

            # 2. Count active vendor_projects
            try:
                vcur = vendor_cursor() # new_swiftbim DB
                # Resolve profile IDs for these employees
                vcur.execute(
                    f"SELECT id FROM vendor_resource_profiles WHERE vendor_employee_id IN ({pslots})",
                    v_emp_ids
                )
                profile_ids = [int(rp["id"]) for rp in vcur.fetchall() or []]
                
                # Combine both employee IDs and profile IDs for filtering as a failsafe
                combined_ids = list(set(v_emp_ids + profile_ids))
                ids_placeholders = ",".join(["%s"] * len(combined_ids))

                main_cur.execute(
                    f"""SELECT COUNT(*) AS cnt FROM snh6_swiftproject.vendor_projects 
                       WHERE vendor_id IN ({ids_placeholders}) 
                       AND (LOWER(COALESCE(status, '')) NOT IN ('completed', 'done') OR status IS NULL)""",
                    combined_ids
                )
                r_proj = main_cur.fetchone()
                active_projects = r_proj["cnt"] if r_proj else 0
            except Exception:
                active_projects = 0

        except Exception:
            bids_submitted = 0
            proposals_awaiting = 0
            active_projects = 0

    return jsonify({
        "active_opportunities": active_opportunities,
        "bids_submitted": bids_submitted,
        "proposals_awaiting": proposals_awaiting,
        "active_projects": active_projects,
    })


# ---------------------------------------------------------------------------
# Vendor Dashboard Priority Tasks
# ---------------------------------------------------------------------------

@bp.route("/dashboard/priority-tasks", methods=["GET"])
@login_required
def vendor_dashboard_priority_tasks():
    """
    GET /api/vendors/dashboard/priority-tasks
    Returns upcoming (due today or later) vendor tasks that are not completed,
    for the logged-in vendor company (all vendor_employee under same vendor_id).
    """
    from datetime import date, datetime, time, timedelta
    from decimal import Decimal

    user_id = getattr(g, "user_id", None)
    if not user_id:
        return jsonify({"tasks": []})

    today = date.today().isoformat()
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    def _time_to_hhmmss(v):
        if isinstance(v, time):
            return v.strftime("%H:%M:%S") if v else None
        if isinstance(v, timedelta):
            total = int(v.total_seconds())
            if total < 0:
                total = 0
            h, r = divmod(total, 3600)
            m, s = divmod(r, 60)
            return f"{h:02d}:{m:02d}:{s:02d}"
        return None

    def _serialize_value(v):
        if v is None:
            return None
        if isinstance(v, (datetime, date)):
            return v.isoformat()
        if isinstance(v, timedelta):
            return _time_to_hhmmss(v)
        if isinstance(v, time):
            return _time_to_hhmmss(v)
        if isinstance(v, Decimal):
            return float(v)
        return v

    # Resolve vendor company employees for the logged-in vendor employee id.
    # We derive the vendor "company key" from snh6_swiftproject.vendor_employee.vendor_id
    # so this works even if g.user_type / g.company_id are not set consistently.
    vendor_employee_ids = [user_id]
    try:
        ecur = conn.cursor(dictionary=True)
        ecur.execute(
            "SELECT vendor_id FROM snh6_swiftproject.vendor_employee WHERE id = %s LIMIT 1",
            (user_id,),
        )
        row = ecur.fetchone() or {}
        company_vendor_id = row.get("vendor_id")
        if company_vendor_id is not None:
            ecur.execute(
                "SELECT id FROM snh6_swiftproject.vendor_employee WHERE vendor_id = %s",
                (company_vendor_id,),
            )
            rows = ecur.fetchall() or []
            ids = [r["id"] for r in rows if r.get("id") is not None]
            if ids:
                vendor_employee_ids = ids
    except Exception:
        vendor_employee_ids = [user_id]

    placeholders = ",".join(["%s"] * len(vendor_employee_ids))

    _ensure_vendor_task_table()
    _ensure_vp_table()

    try:
        # Resolve profile IDs for these employees
        v_prof_ids = []
        try:
            v_prof_ids = _get_profile_ids_for_employees(vendor_employee_ids)
        except Exception: pass
        
        combined_ids = list(set(vendor_employee_ids + v_prof_ids))
        pslots_final = ",".join(["%s"] * len(combined_ids))

        cur.execute(
            f"""
            SELECT
                vt.id,
                vt.task_name,
                vt.due_date,
                vt.status,
                vt.category,
                vt.perferstart_time,
                vt.perferend_time,
                vt.project_id AS projectid,
                vp.project_name,
                vt.assigned_to,
                vt.vendor_id AS uploaderid,
                COALESCE(ve_uploader.full_name, e_uploader.full_name) AS uploader_full_name,
                COALESCE(ve_uploader.profile_picture, e_uploader.profile_picture) AS uploader_profile_picture
            FROM snh6_swiftproject.vendor_task vt
            LEFT JOIN snh6_swiftproject.vendor_projects vp ON vt.project_id = vp.id
            LEFT JOIN snh6_swiftproject.vendor_employee ve_uploader ON vt.vendor_id = ve_uploader.id
            LEFT JOIN employee e_uploader ON e_uploader.id = vt.vendor_id AND ve_uploader.id IS NULL
            WHERE (vt.vendor_id IN ({pslots_final}) OR vt.assigned_to IN ({pslots_final}))
              AND LOWER(vt.status) IN ('todo', 'inprogress', 'in progress', 'pause', 'active')
              AND DATE(vt.due_date) >= %s
            ORDER BY DATE(vt.due_date) ASC, COALESCE(vt.perferstart_time, '00:00:00') ASC
            LIMIT 20
            """,
            [*combined_ids, *combined_ids, today],
        )
        rows = cur.fetchall() or []

        tasks = []
        for r in rows:
            d = {k: _serialize_value(v) for k, v in r.items()}
            involved = []
            if d.get("uploaderid") and d.get("uploader_full_name"):
                involved.append(
                    {
                        "id": d["uploaderid"],
                        "full_name": d["uploader_full_name"],
                        "profile_picture": d.get("uploader_profile_picture"),
                    }
                )
            d["involved_persons"] = involved
            tasks.append(d)
    except Exception:
        tasks = []

    return jsonify({"tasks": tasks})


# ---------------------------------------------------------------------------
# Vendor Dashboard Project/Task Stats (for main vendor Dashboard)
# ---------------------------------------------------------------------------

@bp.route("/dashboard/project-stats", methods=["GET"])
@login_required
def vendor_dashboard_project_stats():
    """
    GET /api/vendors/dashboard/project-stats

    Returns high-level project / task KPIs for the logged-in vendor company
    (all vendor_employee under same vendor_id), to drive the Vendor Dashboard cards:

    - totalProjects: count of vendor_projects visible to the vendor company
    - completedProjects: vendor_projects with progress = 100 (or status = 'Completed')
    - inProgressTasks: vendor_task rows (created-by anyone in vendor company OR assigned_to anyone in company) with status = 'InProgress'
    - completedTasks: vendor_task rows (created-by anyone in vendor company OR assigned_to anyone in company) with status = 'Completed'
    """
    user_id = getattr(g, "user_id", None)
    if not user_id:
        return jsonify(
            {
                "total_projects": 0,
                "completed_projects": 0,
                "in_progress_tasks": 0,
                "completed_tasks": 0,
            }
        )

    try:
        _ensure_vp_table()
        _ensure_vendor_task_table()
        conn = get_db()
        cur = conn.cursor(dictionary=True)

        # Vendor dashboards are company-wide: resolve all vendor_employee ids
        # for the same `vendor_employee.vendor_id` as the logged-in employee.
        vendor_employee_ids = [int(user_id)]
        try:
            ecur = conn.cursor(dictionary=True)
            ecur.execute(
                "SELECT vendor_id FROM snh6_swiftproject.vendor_employee WHERE id = %s LIMIT 1",
                (user_id,),
            )
            row = ecur.fetchone() or {}
            company_vendor_id = row.get("vendor_id")
            if company_vendor_id is not None:
                ecur.execute(
                    "SELECT id FROM snh6_swiftproject.vendor_employee WHERE vendor_id = %s",
                    (company_vendor_id,),
                )
                rows = ecur.fetchall() or []
                ids = [int(r["id"]) for r in rows if r.get("id") is not None]
                if ids:
                    vendor_employee_ids = ids
        except Exception:
            vendor_employee_ids = [int(user_id)]

        # Resolve profile IDs from new_swiftbim for these employees
        v_prof_ids = []
        try:
            v_prof_ids = _get_profile_ids_for_employees(vendor_employee_ids)
        except Exception: pass
        
        vendor_id_filter = list(set(vendor_employee_ids + v_prof_ids))

        placeholders_final = ",".join(["%s"] * len(vendor_id_filter))

        try:
            cur.execute(
                """
                SELECT
                    COUNT(*) AS total_projects,
                    SUM(
                        CASE
                            WHEN (vp.progress IS NOT NULL AND (vp.progress REGEXP '^[0-9]+' AND CAST(vp.progress AS DECIMAL(10,2)) >= 100))
                              OR (LOWER(COALESCE(vp.status, '')) IN ('completed', 'done', 'complete'))
                            THEN 1 ELSE 0
                        END
                    ) AS completed_projects
                FROM snh6_swiftproject.vendor_projects vp
                WHERE vp.vendor_id IN ("""
                + placeholders_final
                + """)
                """,
                vendor_id_filter,
            )
            row = cur.fetchone() or {}
            total_projects = int(row.get("total_projects") or 0)
            completed_projects = int(row.get("completed_projects") or 0)
        except Exception:
            total_projects = 0
            completed_projects = 0

        # Tasks: count items created by/assigned to anyone in the resolved profile list.
        try:
            cur.execute(
                """
                SELECT
                    SUM(CASE WHEN LOWER(status) IN ('inprogress', 'in progress', 'active') THEN 1 ELSE 0 END) AS in_progress_tasks,
                    SUM(CASE WHEN LOWER(status) IN ('completed', 'done') THEN 1 ELSE 0 END) AS completed_tasks
                FROM snh6_swiftproject.vendor_task
                WHERE vendor_id IN ("""
                + placeholders_final
                + """)
                   OR assigned_to IN ("""
                + placeholders_final
                + """)
                """,
                [*vendor_id_filter, *vendor_id_filter],
            )
            row = cur.fetchone() or {}
            in_progress_tasks = int(row.get("in_progress_tasks") or 0)
            completed_tasks = int(row.get("completed_tasks") or 0)
        except Exception:
            in_progress_tasks = 0
            completed_tasks = 0

        return jsonify(
            {
                "totalProjects": total_projects,
                "completedProjects": completed_projects,
                "inProgressTasks": in_progress_tasks,
                "completedTasks": completed_tasks,
            }
        )
    except Exception:
        # Fail-safe: do not break the dashboard if something goes wrong.
        return jsonify(
            {
                "totalProjects": 0,
                "completedProjects": 0,
                "inProgressTasks": 0,
                "completedTasks": 0,
            }
        )


# ---------------------------------------------------------------------------
# Opportunities (Bidding Inbox for Vendors)
# ---------------------------------------------------------------------------

@bp.route("/opportunities", methods=["GET"])
@login_required
def list_opportunities():
    """
    GET /api/vendors/opportunities
    Returns active bidding opportunities that vendors can bid on.
    Opportunities are created when a TD marks a project as Outsource.
    """
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    vendor_id = getattr(g, "user_id", None)

    try:
        # Check which ones current vendor already bid on
        already_bid = set()
        if vendor_id:
            cur.execute("SELECT opportunity_id FROM snh6_swiftproject.vendor_bids WHERE vendor_id = %s", (vendor_id,))
            already_bid = {r["opportunity_id"] for r in cur.fetchall()}

        cur.execute(
            """SELECT * FROM vendor_bidding
               WHERE status = 'active'
               ORDER BY bid_deadline ASC"""
        )
        rows = cur.fetchall()
        opportunities = []
        for r in rows:
            item = {k: _serialize(v) for k, v in r.items()}
            item["already_bid"] = item["id"] in already_bid
            opportunities.append(item)
    except Exception:
        # Table may not exist yet — return empty list gracefully
        opportunities = []

    return jsonify({"opportunities": opportunities})


@bp.route("/opportunities/<int:opportunity_id>/bid", methods=["POST"])
@login_required
def submit_bid(opportunity_id):
    """
    POST /api/vendors/opportunities/<id>/bid
    Vendor submits a bid on an opportunity.
    Body JSON: { "bid_amount": 50000, "notes": "...", "timeline": "...", "team_size": 5 }
    Uses employee ID (g.user_id) as vendor identifier — works for Vendor role users.
    """
    data = request.get_json(silent=True) or {}
    bid_amount = data.get("bid_amount")
    notes = data.get("notes", "")
    timeline = data.get("timeline", "")
    team_size = data.get("team_size", 0)

    if not bid_amount:
        return jsonify({"success": False, "message": "bid_amount is required"}), 400

    # Use employee ID directly — vendor users are in the employee table
    vendor_id = getattr(g, "user_id", None)
    if not vendor_id:
        return jsonify({"success": False, "message": "Not authenticated"}), 401

    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # Verify the opportunity exists and is still active
    try:
        cur.execute(
            """SELECT id, project_name, bid_deadline, outsource_budget, budget_ceiling
               FROM snh6_swiftproject.vendor_bidding WHERE id = %s AND status = 'active'""",
            (opportunity_id,),
        )
        opp = cur.fetchone()
        if not opp:
            return jsonify({"success": False, "message": "Opportunity not found or already closed"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    def _to_float_budget(v):
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        s = str(v).replace(",", "").replace("₹", "").strip()
        if not s:
            return None
        try:
            return float(s)
        except ValueError:
            return None

    def _parse_bid_amount(val):
        if val is None:
            raise ValueError("missing")
        if isinstance(val, (int, float)):
            return float(val)
        s = str(val).replace(",", "").replace("₹", "").strip()
        return float(s)

    try:
        bid_val = _parse_bid_amount(bid_amount)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Invalid bid amount"}), 400

    caps = []
    for key in ("outsource_budget", "budget_ceiling"):
        fv = _to_float_budget(opp.get(key))
        if fv is not None and fv > 0:
            caps.append(fv)
    if caps:
        max_bid = min(caps)
        if bid_val > max_bid:
            return jsonify(
                {
                    "success": False,
                    "message": f"Your bid amount is too high. It cannot exceed ₹{max_bid:,.2f} for this opportunity.",
                }
            ), 400

    try:
        cur.execute(
            """INSERT INTO snh6_swiftproject.vendor_bids (vendor_id, opportunity_id, bid_amount, notes, timeline, team_size, status, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, 'submitted', NOW())
               ON DUPLICATE KEY UPDATE bid_amount = VALUES(bid_amount), notes = VALUES(notes),
               timeline = VALUES(timeline), team_size = VALUES(team_size), status = 'submitted'""",
            (vendor_id, opportunity_id, bid_amount, notes, timeline, team_size),
        )
        conn.commit()
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    # Notification to Technical Director(s): new bid submitted
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

        # vendor name
        vendor_name = "Vendor"
        try:
            cur.execute(
                "SELECT full_name FROM snh6_swiftproject.vendor_employee WHERE id = %s LIMIT 1",
                (vendor_id,),
            )
            vrow = cur.fetchone()
            if vrow and vrow.get("full_name"):
                vendor_name = vrow["full_name"]
        except Exception:
            pass

        title = "New bid received"
        msg = f"New bid received from {vendor_name} for \"{opp.get('project_name') or 'a project'}\"."

        # TDs in this company
        if getattr(g, "company_id", None):
            cur.execute(
                "SELECT id FROM employee WHERE Company_id = %s AND user_role = 'Technical Director' AND active = 1",
                (g.company_id,),
            )
            td_ids = [r["id"] for r in (cur.fetchall() or []) if r.get("id")]
            for td_id in td_ids:
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                    """,
                    (td_id, None, title, msg, "bidding_submitted", "bidding", opportunity_id, g.company_id),
                )
            if td_ids:
                conn.commit()
    except Exception:
        pass

    return jsonify({"success": True, "message": "Bid submitted successfully for " + opp["project_name"]})


# ---------------------------------------------------------------------------
# My Bids
# ---------------------------------------------------------------------------

@bp.route("/mybids", methods=["GET"])
@login_required
def my_bids():
    """
    GET /api/vendors/mybids
    Returns all bids submitted by the current vendor.
    Uses employee ID (g.user_id) directly.
    """
    vendor_id = getattr(g, "user_id", None)
    if not vendor_id:
        return jsonify({"bids": []})

    conn = get_db()
    cur = conn.cursor(dictionary=True)

    try:
        cur.execute(
            """SELECT vb.*, vbidding.project_name, vbidding.outsource_budget,
                      vbidding.budget_ceiling, vbidding.bid_deadline
               FROM snh6_swiftproject.vendor_bids vb
               LEFT JOIN vendor_bidding vbidding ON vbidding.id = vb.opportunity_id
               WHERE vb.vendor_id = %s
               ORDER BY vb.created_at DESC""",
            (vendor_id,),
        )
        rows = cur.fetchall()
        bids = [{k: _serialize(v) for k, v in r.items()} for r in rows]
    except Exception:
        bids = []

    return jsonify({"bids": bids})


# ---------------------------------------------------------------------------
# Vendor Proposals
# ---------------------------------------------------------------------------

@bp.route("/proposals", methods=["GET"])
@login_required
def vendor_proposals():
    """
    GET /api/vendors/proposals
    Returns proposals sent to the current vendor — merges:
      1. vendor_proposals (original table, keyed by vendor_onboarding.id)
      2. td_proposals (TD-created proposals, keyed by employee id)
    """
    email = getattr(g, "user_email", None)
    user_id = getattr(g, "user_id", None)
    cur = vendor_cursor()

    # Resolve vendor_onboarding.id (may be None if vendor isn't in onboarding table)
    vendor_onboarding_id = None
    if email:
        cur.execute(
            "SELECT id FROM vendor_onboarding WHERE contact_email=%s LIMIT 1",
            (email,),
        )
        row = cur.fetchone()
        if row:
            vendor_onboarding_id = row["id"]

    proposals = []

    # 1. Original vendor_proposals table (uses vendor_onboarding.id)
    if vendor_onboarding_id:
        try:
            cur.execute(
                """SELECT * FROM vendor_proposals WHERE vendor_id = %s ORDER BY created_at DESC""",
                (vendor_onboarding_id,),
            )
            for r in cur.fetchall():
                p = {k: _serialize(v) for k, v in r.items()}
                p["source"] = "vendor_proposals"
                proposals.append(p)
        except Exception:
            pass

    # 2. TD-created proposals (td_proposals table — lives in main DB)
    #    td_proposals.vendor_id stores the *employee* id (g.user_id), not vendor_onboarding.id
    if user_id:
        try:
            main_conn = get_db()
            main_cur = main_conn.cursor(dictionary=True)
            # Auto-expire TD proposals after 2 days (Sent/Pending only) and notify TD once
            try:
                main_cur.execute(
                    "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'td_proposals' AND COLUMN_NAME = 'expired_notified' LIMIT 1"
                )
                has_flag = main_cur.fetchone() is not None
                if not has_flag:
                    main_cur.execute("ALTER TABLE td_proposals ADD COLUMN expired_notified TINYINT(1) NOT NULL DEFAULT 0")
                    main_conn.commit()

                main_cur.execute(
                    """
                    SELECT id, project_name, vendor_name
                    FROM td_proposals
                    WHERE vendor_id = %s
                      AND (status = 'sent' OR status = 'pending')
                      AND created_at < (NOW() - INTERVAL 2 DAY)
                      AND expired_notified = 0
                    """,
                    (user_id,),
                )
                to_expire = main_cur.fetchall() or []
                if to_expire:
                    main_cur.execute(
                        """
                        UPDATE td_proposals
                        SET status = 'expired'
                        WHERE vendor_id = %s
                          AND (status = 'sent' OR status = 'pending')
                          AND created_at < (NOW() - INTERVAL 2 DAY)
                        """,
                        (user_id,),
                    )
                    # Mark notified for these rows
                    ids = [r["id"] for r in to_expire if r.get("id")]
                    if ids:
                        placeholders = ",".join(["%s"] * len(ids))
                        main_cur.execute(
                            f"UPDATE td_proposals SET expired_notified = 1 WHERE id IN ({placeholders})",
                            ids,
                        )
                    main_conn.commit()

                    # Send notification(s) to TD
                    try:
                        if getattr(g, "company_id", None):
                            ncur = main_conn.cursor(dictionary=True)
                            ncur.execute(
                                "SELECT id FROM employee WHERE Company_id = %s AND user_role = 'Technical Director' AND active = 1",
                                (g.company_id,),
                            )
                            td_ids = [r["id"] for r in (ncur.fetchall() or []) if r.get("id")]
                            for r in to_expire:
                                project_name = r.get("project_name") or "Proposal"
                                vendor_name = r.get("vendor_name") or "Vendor"
                                title = "Proposal expired"
                                msg = f"Proposal for '{project_name}' from {vendor_name} expired (no response within 2 days)."
                                for td_id in td_ids:
                                    ncur.execute(
                                        """
                                        INSERT INTO notifications (user_id, project_id, title, message, type, is_read, created_at, Company_id)
                                        VALUES (%s, %s, %s, %s, %s, 0, NOW(), %s)
                                        """,
                                        (td_id, None, title, msg, "proposal_expired", g.company_id),
                                    )
                            main_conn.commit()
                    except Exception:
                        pass
            except Exception:
                pass
            main_cur.execute(
                """SELECT * FROM td_proposals WHERE vendor_id = %s ORDER BY created_at DESC""",
                (user_id,),
            )
            for r in main_cur.fetchall():
                p = {k: _serialize(v) for k, v in r.items()}
                p["source"] = "td_proposals"
                if "project_name" not in p or not p.get("project_name"):
                    p["project_name"] = p.get("project_name") or ""
                proposals.append(p)
        except Exception:
            pass

    # Sort all proposals by created_at descending
    proposals.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return jsonify({"proposals": proposals})


@bp.route("/proposals/phase-one", methods=["GET"])
@login_required
def get_phase_one_proposal():
    """
    GET /api/vendors/proposals/phase-one
    Fetch the first-phase proposal from the marketing (new_swiftbim) DB
    for a specific project/opportunity.

    Query params:
      - opportunity_id (preferred) or service_id: numeric id linking to proposals.service_id
    """
    service_id = request.args.get("opportunity_id", type=int) or request.args.get(
        "service_id", type=int
    )
    if not service_id:
        return jsonify({"proposal": None}), 400

    # If this is called from TD/Vendor with `opportunity_id` (vendor_bidding.id),
    # we need to find the specific proposal linked to this project.
    target_proposal_id = None
    if request.args.get("opportunity_id"):
        try:
            from .auth import get_db
            main_conn = get_db()
            main_cur = main_conn.cursor(dictionary=True)
            # Find the project details
            main_cur.execute("""
                SELECT b.project_id, p.client_id, p.budget 
                FROM vendor_bidding b
                JOIN projects p ON b.project_id = p.id
                WHERE b.id = %s
            """, (service_id,))
            bidding_row = main_cur.fetchone()
            
            if bidding_row:
                p2_client_id = bidding_row.get("client_id")
                p2_budget = bidding_row.get("budget")
                
                # Check for a verified contract in Phase 1 matching this client and budget
                cur_temp = vendor_cursor()
                cur_temp.execute("""
                    SELECT proposal_id FROM contracts 
                    WHERE client_id = %s AND total_cost = %s 
                    AND status NOT IN ('Draft', 'cancelled')
                    ORDER BY id DESC LIMIT 1
                """, (p2_client_id, p2_budget))
                contract_row = cur_temp.fetchone()
                if contract_row:
                    target_proposal_id = contract_row["proposal_id"]
                
                # Update service_id for fallback/queries if needed
                service_id = bidding_row["project_id"]
        except Exception:
            pass

    cur = vendor_cursor()

    if target_proposal_id:
        sql = """
            SELECT p.*, e.project_type_sector, e.bim_services_required 
            FROM proposals p 
            LEFT JOIN bim_enquiry e ON p.service_id = e.id 
            WHERE p.id = %s
        """
        params = [target_proposal_id]
    else:
        sql = """
            SELECT p.*, e.project_type_sector, e.bim_services_required 
            FROM proposals p 
            LEFT JOIN bim_enquiry e ON p.service_id = e.id 
            WHERE p.service_id = %s 
            ORDER BY p.created_at DESC LIMIT 1
        """
        params = [service_id]

    try:
        cur.execute(sql, tuple(params))
        row = cur.fetchone()

        # If nothing matches, fall back to the latest globally
        if not row:
            cur.execute("""
                SELECT p.*, e.project_type_sector, e.bim_services_required 
                FROM proposals p 
                LEFT JOIN bim_enquiry e ON p.service_id = e.id 
                ORDER BY p.created_at DESC LIMIT 1
            """)
            row = cur.fetchone()

        if not row:
            return jsonify({"proposal": None})

        proposal = {k: _serialize(v) for k, v in row.items()}
        return jsonify({"proposal": proposal})
    except Exception:
        return jsonify({"proposal": None})


@bp.route("/proposals/<int:proposal_id>/respond", methods=["POST"])
@login_required
def respond_to_proposal(proposal_id):
    """
    POST /api/vendors/proposals/<id>/respond
    Vendor accepts/rejects a proposal.
    Body JSON: { "action": "accept"|"reject"|"clarification", "reason": "..." }
    """
    data = request.get_json(silent=True) or {}
    action = data.get("action")
    reason = data.get("reason", "")

    if action not in ("accept", "reject", "clarification"):
        return jsonify({"success": False, "message": "Invalid action"}), 400

    status_map = {"accept": "accepted", "reject": "rejected", "clarification": "clarification_requested"}
    new_status = status_map[action]

    updated = False

    # Try vendor_proposals (new_swiftbim)
    cur = vendor_cursor()
    try:
        cur.execute(
            "UPDATE vendor_proposals SET status = %s, reason = %s WHERE id = %s",
            (new_status, reason, proposal_id),
        )
        if cur.rowcount > 0:
            updated = True
    except Exception:
        pass

    # Try td_proposals (main DB)
    proposal_data = None
    try:
        main_conn = get_db()
        main_cur = main_conn.cursor(dictionary=True)
        # Block responses after 2 days: if expired, update status and return error
        main_cur.execute("SELECT * FROM td_proposals WHERE id = %s", (proposal_id,))
        proposal_row = main_cur.fetchone()
        if proposal_row:
            try:
                from datetime import datetime, timedelta
                created_at = proposal_row.get("created_at")
                if created_at and datetime.now() > (created_at + timedelta(days=2)):
                    if (proposal_row.get("status") or "").lower() not in ("accepted", "rejected", "expired"):
                        main_cur.execute(
                            "UPDATE td_proposals SET status = 'expired' WHERE id = %s",
                            (proposal_id,),
                        )
                        main_conn.commit()
                    return jsonify({"success": False, "message": "Proposal expired"}), 400
            except Exception:
                pass
        # Ensure td_proposals has 'reason' column (older DBs may not)
        try:
            main_cur.execute(
                "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'td_proposals' AND COLUMN_NAME = 'reason' LIMIT 1"
            )
            has_reason = main_cur.fetchone() is not None
            if not has_reason:
                main_cur.execute("ALTER TABLE td_proposals ADD COLUMN reason TEXT NULL")
                main_conn.commit()
        except Exception:
            pass

        main_cur.execute(
            "UPDATE td_proposals SET status = %s, reason = %s WHERE id = %s",
            (new_status, reason, proposal_id),
        )
        if main_cur.rowcount > 0:
            updated = True
        # Fetch proposal data for project creation
        main_cur.execute("SELECT * FROM td_proposals WHERE id = %s", (proposal_id,))
        proposal_data = main_cur.fetchone()
    except Exception:
        pass

    if not updated:
        return jsonify({"success": False, "message": "Proposal not found"}), 404

    # Notify Technical Director(s) about vendor response / expiry
    try:
        if proposal_data and getattr(g, "company_id", None):
            main_conn = get_db()
            ncur = main_conn.cursor(dictionary=True)
            # Find all TDs in this company
            ncur.execute(
                "SELECT id FROM employee WHERE Company_id = %s AND user_role = 'Technical Director' AND active = 1",
                (g.company_id,),
            )
            td_ids = [r["id"] for r in (ncur.fetchall() or []) if r.get("id")]
            if td_ids:
                project_name = proposal_data.get("project_name") or "Proposal"
                vendor_name = proposal_data.get("vendor_name") or "Vendor"
                title = "Proposal update"
                msg = f"{vendor_name} {new_status.replace('_', ' ')} for '{project_name}'."
                if action in ("reject", "clarification") and reason:
                    msg += f" Note: {reason}"
                for td_id in td_ids:
                    ncur.execute(
                        """
                        INSERT INTO notifications (user_id, project_id, title, message, type, is_read, created_at, Company_id)
                        VALUES (%s, %s, %s, %s, %s, 0, NOW(), %s)
                        """,
                        (td_id, None, title, msg, "proposal_status", g.company_id),
                    )
                main_conn.commit()
    except Exception:
        pass

    # On accept → auto-create vendor project
    project_id = None
    if action == "accept" and proposal_data:
        try:
            _ensure_vp_table()
            main_conn = get_db()
            main_cur = main_conn.cursor(dictionary=True)
            # Check if project already exists for this proposal
            main_cur.execute("SELECT id FROM vendor_projects WHERE proposal_id = %s", (proposal_id,))
            existing = main_cur.fetchone()
            if not existing:
                technologies = proposal_data.get("technologies_used")
                if technologies:
                    try:
                        # If it's a JSON string, parse it first
                        if isinstance(technologies, str):
                            import json
                            parsed = json.loads(technologies)
                            if isinstance(parsed, list):
                                modules_str = ", ".join(map(str, parsed))
                            else:
                                modules_str = str(technologies)
                        elif isinstance(technologies, list):
                            modules_str = ", ".join(map(str, technologies))
                        else:
                            modules_str = str(technologies)
                    except Exception:
                        modules_str = str(technologies)
                else:
                    modules_str = ""

                # Also copy document_attachment from main projects table if exists
                main_cur.execute(
                    "SELECT document_attachment FROM snh6_swiftproject.projects WHERE project_name = %s LIMIT 1",
                    (proposal_data.get("project_name"),)
                )
                source_proj = main_cur.fetchone()
                doc_attachment = source_proj.get("document_attachment") if source_proj else None

                main_cur.execute("""
                    INSERT INTO vendor_projects (
                        proposal_id, opportunity_id, vendor_id, project_name, 
                        description, modules, deliverables, budget, document_attachment
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    proposal_id,
                    proposal_data.get("opportunity_id"),
                    proposal_data.get("vendor_id"),
                    proposal_data.get("project_name"),
                    proposal_data.get("scope_of_work"),
                    modules_str,
                    proposal_data.get("deliverables"),
                    "0",
                    doc_attachment
                ))
                project_id = main_cur.lastrowid
                main_conn.commit()
            else:
                project_id = existing["id"]
        except Exception as e:
            import traceback
            traceback.print_exc()

    return jsonify({"success": True, "status": new_status, "project_id": project_id})


# ---------------------------------------------------------------------------
# Bidding management (for Technical Director)
# ---------------------------------------------------------------------------

@bp.route("/bidding", methods=["GET"])
@login_required
def list_bidding():
    """
    GET /api/vendors/bidding
    Returns all bidding entries for the Technical Director view,
    including bid counts and computed status based on bid_deadline.
    """
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """SELECT vb.*,
                  (SELECT COUNT(*) FROM snh6_swiftproject.vendor_bids vbid WHERE vbid.opportunity_id = vb.id) AS total_bids,
                  CASE
                    WHEN vb.bid_deadline IS NULL THEN 'active'
                    WHEN vb.bid_deadline >= CURDATE() THEN 'active'
                    ELSE 'closed'
                  END AS computed_status
               FROM vendor_bidding vb
               ORDER BY vb.created_at DESC"""
        )
        rows = cur.fetchall()
        bidding = [{k: _serialize(v) for k, v in r.items()} for r in rows]
    except Exception as e:
        bidding = []
    return jsonify({"bidding": bidding})


@bp.route("/bidding/<int:bidding_id>/bids", methods=["GET"])
@login_required
def bidding_bids(bidding_id):
    """
    GET /api/vendors/bidding/<id>/bids
    Returns all bids placed on a specific bidding opportunity (TD view).
    Joins the employee table from snh6_swiftproject for vendor info
    (since vendor users are in employee table with user_role='Vendor').
    Also fetches the opportunity summary.
    Auto-ranks by lowest bid amount.
    """
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # Fetch opportunity summary
    try:
        cur.execute(
            "SELECT * FROM vendor_bidding WHERE id = %s",
            (bidding_id,),
        )
        opp_row = cur.fetchone()
        opportunity = {k: _serialize(v) for k, v in opp_row.items()} if opp_row else None
    except Exception:
        opportunity = None

    # Fetch bids - join vendor_employee table for vendor info
    bids = []
    try:
        # Pull bids and vendor identity in one query.
        # IMPORTANT: vendor_bids.vendor_id is expected to reference vendor_employee.id.
        cur.execute(
            """
            SELECT vb.*,
                   ve.full_name AS vendor_name,
                   ve.email AS vendor_email,
                   ve.phone_number AS vendor_phone,
                   ve.full_name AS company_name
            FROM snh6_swiftproject.vendor_bids vb
            LEFT JOIN snh6_swiftproject.vendor_employee ve ON ve.id = vb.vendor_id
            WHERE vb.opportunity_id = %s
            ORDER BY vb.bid_amount ASC
            """,
            (bidding_id,),
        )
        rows = cur.fetchall() or []

        for i, r in enumerate(rows):
            entry = {k: _serialize(v) for k, v in r.items()}
            # Fallbacks if vendor_employee row is missing
            entry["vendor_name"] = entry.get("vendor_name") or f"Vendor #{entry.get('vendor_id')}"
            entry["vendor_email"] = entry.get("vendor_email") or ""
            entry["vendor_phone"] = entry.get("vendor_phone") or ""
            entry["company_name"] = entry.get("company_name") or entry["vendor_name"]
            entry["rank"] = i + 1
            entry["is_top4"] = i < 4
            bids.append(entry)

    except Exception as e:
        bids = []

    return jsonify({"opportunity": opportunity, "bids": bids})


# ---------------------------------------------------------------------------
# Bid Accept / Reject (Technical Director actions)
# ---------------------------------------------------------------------------

@bp.route("/bidding/<int:bidding_id>/bids/<int:bid_id>/accept", methods=["POST"])
@login_required
def accept_bid(bidding_id, bid_id):
    """
    POST /api/vendors/bidding/<bidding_id>/bids/<bid_id>/accept
    TD accepts a vendor bid — marks it as 'shortlisted'.
    Returns full bid info to pre-fill the proposal creation form.
    """
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "UPDATE snh6_swiftproject.vendor_bids SET status = 'shortlisted' WHERE id = %s AND opportunity_id = %s",
            (bid_id, bidding_id),
        )
        if cur.rowcount == 0:
            return jsonify({"success": False, "message": "Bid not found"}), 404
        conn.commit()

        # Return bid + vendor info for proposal pre-fill
        cur.execute(
            """
            SELECT vb.*, vbi.project_name, vbi.outsource_budget, vbi.budget_ceiling,
                   e.full_name AS vendor_name, e.email AS vendor_email, e.phone_number AS vendor_phone
            FROM snh6_swiftproject.vendor_bids vb
            LEFT JOIN vendor_bidding vbi ON vbi.id = vb.opportunity_id
            LEFT JOIN snh6_swiftproject.vendor_employee e ON e.id = vb.vendor_id
            WHERE vb.id = %s
            """,
            (bid_id,),
        )
        row = cur.fetchone()
        bid_info = {k: _serialize(v) for k, v in row.items()} if row else {}
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    # Notification to Vendor: bid shortlisted
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

        vendor_emp_id = bid_info.get("vendor_id")
        project_name = bid_info.get("project_name") or "a project"

        # TD name
        td_name = "Technical Director"
        if getattr(g, "company_id", None) and getattr(g, "user_id", None):
            cur.execute(
                "SELECT full_name FROM employee WHERE id = %s AND Company_id = %s",
                (g.user_id, g.company_id),
            )
            r = cur.fetchone() or {}
            if r.get("full_name"):
                td_name = r["full_name"]

        if vendor_emp_id and getattr(g, "company_id", None):
            title = "Bid shortlisted"
            msg = f"Your bid for \"{project_name}\" has been shortlisted by {td_name}."
            cur.execute(
                """
                INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                """,
                (vendor_emp_id, None, title, msg, "bidding_shortlisted", "bidding", bidding_id, g.company_id),
            )
            conn.commit()
    except Exception:
        pass

    return jsonify({"success": True, "bid": bid_info})


@bp.route("/bidding/<int:bidding_id>/bids/<int:bid_id>/reject", methods=["POST"])
@login_required
def reject_bid(bidding_id, bid_id):
    """
    POST /api/vendors/bidding/<bidding_id>/bids/<bid_id>/reject
    TD rejects a vendor bid — marks it as 'lost'.
    """
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "UPDATE snh6_swiftproject.vendor_bids SET status = 'lost' WHERE id = %s AND opportunity_id = %s",
            (bid_id, bidding_id),
        )
        if cur.rowcount == 0:
            return jsonify({"success": False, "message": "Bid not found"}), 404
        conn.commit()
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    # Notification to Vendor: bid rejected
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

        cur.execute(
            """
            SELECT vb.vendor_id, vbi.project_name
            FROM snh6_swiftproject.vendor_bids vb
            LEFT JOIN vendor_bidding vbi ON vbi.id = vb.opportunity_id
            WHERE vb.id = %s
            """,
            (bid_id,),
        )
        r = cur.fetchone() or {}
        vendor_emp_id = r.get("vendor_id")
        project_name = r.get("project_name") or "a project"

        td_name = "Technical Director"
        if getattr(g, "company_id", None) and getattr(g, "user_id", None):
            cur.execute(
                "SELECT full_name FROM employee WHERE id = %s AND Company_id = %s",
                (g.user_id, g.company_id),
            )
            rr = cur.fetchone() or {}
            if rr.get("full_name"):
                td_name = rr["full_name"]

        if vendor_emp_id and getattr(g, "company_id", None):
            title = "Bid rejected"
            msg = f"Your bid for \"{project_name}\" has been rejected by {td_name}."
            cur.execute(
                """
                INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                """,
                (vendor_emp_id, None, title, msg, "bidding_rejected", "bidding", bidding_id, g.company_id),
            )
            conn.commit()
    except Exception:
        pass

    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# Vendor lookup by email (for View Vendor modal in ViewBidsTD)
# ---------------------------------------------------------------------------

@bp.route("/by-email", methods=["GET"])
@login_required
def vendor_by_email():
    """
    GET /api/vendors/by-email?email=<email>
    Returns the vendor_onboarding id + basic info for the given email.
    Used by the View Vendor modal to resolve employee email → vendor profile id.
    """
    email = request.args.get("email", "").strip()
    if not email:
        return jsonify({"vendor": None}), 400

    cur = vendor_cursor()
    cur.execute(
        "SELECT id FROM vendor_onboarding WHERE contact_email = %s OR email = %s LIMIT 1",
        (email, email),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"vendor": None})
    vendor = _fetch_vendor_full(row["id"])
    return jsonify({"vendor": vendor})


# ---------------------------------------------------------------------------
# Accepted bids list — for ProposalTD page
# ---------------------------------------------------------------------------

@bp.route("/bidding/accepted-bids", methods=["GET"])
@login_required
def accepted_bids():
    """
    GET /api/vendors/bidding/accepted-bids
    Returns all bids with status 'shortlisted' across all opportunities.
    Used by ProposalTD.tsx to list accepted vendors awaiting a proposal.
    """
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """
            SELECT vb.*, vbi.project_name, vbi.outsource_budget, vbi.budget_ceiling,
                   e.full_name AS vendor_name, e.email AS vendor_email,
                   tp.id AS proposal_id, tp.status AS proposal_status,
                   (tp.id IS NOT NULL) AS proposal_exists
            FROM snh6_swiftproject.vendor_bids vb
            LEFT JOIN vendor_bidding vbi ON vbi.id = vb.opportunity_id
            LEFT JOIN snh6_swiftproject.vendor_employee e ON e.id = vb.vendor_id
            LEFT JOIN (
                SELECT t1.*
                FROM td_proposals t1
                INNER JOIN (
                    SELECT bid_id, MAX(id) AS max_id
                    FROM td_proposals
                    GROUP BY bid_id
                ) t2 ON t1.id = t2.max_id
            ) tp ON tp.bid_id = vb.id
            WHERE vb.status = 'shortlisted'
            ORDER BY vb.created_at DESC
            """
        )
        rows = cur.fetchall()
        bids = [{k: _serialize(v) for k, v in r.items()} for r in rows]
    except Exception as e:
        bids = []
    return jsonify({"bids": bids})


@bp.route("/proposals/td/<int:proposal_id>", methods=["GET"])
@login_required
def td_get_proposal(proposal_id: int):
    """
    GET /api/vendors/proposals/td/<proposal_id>
    Fetch a single TD-created proposal from td_proposals (main DB).
    """
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM td_proposals WHERE id = %s", (proposal_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"proposal": None}), 404
        proposal = {k: _serialize(v) for k, v in row.items()}
        return jsonify({"proposal": proposal})
    except Exception:
        return jsonify({"proposal": None}), 500


@bp.route("/proposals/td-create", methods=["POST"])
@login_required
def td_create_proposal():
    """
    POST /api/vendors/proposals/td-create
    Technical Director creates a formal proposal for an accepted vendor bid.
    Data is stored in new_swiftbim.td_proposals.
    """
    data = request.get_json() or {}
    
    # Required IDs
    bid_id = data.get("bid_id")
    opportunity_id = data.get("opportunity_id")
    vendor_id = data.get("vendor_employee_id") # employee id from main DB
    
    if not all([bid_id, opportunity_id, vendor_id]):
        return jsonify({"success": False, "message": "Missing required IDs (bid_id, opportunity_id, vendor_id)"}), 400

    import json
    
    conn = get_db() # main database connection
    cur = conn.cursor(dictionary=True)
    
    try:
        # 1. Ensure table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS td_proposals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bid_id INT NOT NULL,
                opportunity_id INT NOT NULL,
                vendor_id INT NOT NULL,
                project_name VARCHAR(255),
                vendor_name VARCHAR(255),
                executive_summary TEXT,
                about_us TEXT,
                address TEXT,
                website_url VARCHAR(255),
                email_address VARCHAR(255),
                selected_currency VARCHAR(10),
                scope_of_work TEXT,
                technologies_used JSON,
                deliverables TEXT,
                exclusions TEXT,
                commercial_offer JSON,
                payment_terms JSON,
                reason TEXT,
                status VARCHAR(50) DEFAULT 'Sent',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        # 2. Insert proposal
        sql = """
            INSERT INTO td_proposals (
                bid_id, opportunity_id, vendor_id, project_name, vendor_name,
                executive_summary, about_us, address, website_url, email_address,
                selected_currency, scope_of_work, technologies_used, deliverables,
                exclusions, commercial_offer, payment_terms
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            bid_id,
            opportunity_id,
            vendor_id,
            data.get("project_name"),
            data.get("vendor_name"),
            data.get("executive_summary"),
            data.get("aboutus"),
            data.get("address"),
            data.get("website_url"),
            data.get("email_address"),
            data.get("selected_currency"),
            data.get("scope_of_work"),
            json.dumps(data.get("technologies_used", [])),
            data.get("deliverables"),
            data.get("exclusions"),
            json.dumps(data.get("commercial_offer", [])),
            json.dumps(data.get("payment_terms", []))
        )
        
        cur.execute(sql, params)
        proposal_id = cur.lastrowid
        conn.commit()

        # Notify vendor: proposal created/sent
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

            # TD name
            td_name = "Technical Director"
            if getattr(g, "company_id", None) and getattr(g, "user_id", None):
                cur.execute(
                    "SELECT full_name FROM employee WHERE id = %s AND Company_id = %s",
                    (g.user_id, g.company_id),
                )
                r = cur.fetchone() or {}
                if r.get("full_name"):
                    td_name = r["full_name"]

            project_name = data.get("project_name") or "a project"
            title = "New proposal received"
            msg = f"A new proposal has been sent for \"{project_name}\" by {td_name}. Please respond within 2 days."

            if getattr(g, "company_id", None):
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, project_id, title, message, type, entity_type, entity_id, is_read, created_at, Company_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 0, NOW(), %s)
                    """,
                    (vendor_id, None, title, msg, "proposal_sent", "proposal", proposal_id, g.company_id),
                )
                conn.commit()
        except Exception:
            pass

        return jsonify({"success": True, "message": "Proposal created and sent to vendor.", "proposal_id": proposal_id})
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ===========================================================================
# MODULE 2 — COMPANY PROFILE
# ===========================================================================

def _ensure_vendor_profile_tables():
    """Auto-create vendor_documents table and ensure vendor_onboarding has new cols."""
    cur = vendor_cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS vendor_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        doc_type VARCHAR(100),
        filename VARCHAR(255),
        file_url VARCHAR(500),
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    # Add optional columns to vendor_onboarding if missing
    cur.execute("SHOW COLUMNS FROM vendor_onboarding")
    existing_cols = {row["Field"] for row in cur.fetchall()}

    for col, defn in [
        # ... and all the other fields
        ("country", "VARCHAR(100)"),
        ("state", "VARCHAR(100)"),
        ("city", "VARCHAR(100)"),
        ("year_established", "VARCHAR(20)"),
        ("website", "VARCHAR(255)"),
        ("linkedin", "VARCHAR(255)"),
        ("phone", "VARCHAR(50)"),
        ("trade_license_file", "VARCHAR(255)"),
        ("gst_certificate_file", "VARCHAR(255)"),
        ("nda_agreement_file", "VARCHAR(255)"),
        ("contact_mobile", "VARCHAR(50)"),
        ("contact_designation", "VARCHAR(150)"),
        ("alternate_contact", "VARCHAR(50)"),
        ("num_employees", "VARCHAR(50)"),
        ("turnover_range", "VARCHAR(100)"),
        ("core_business_areas", "TEXT"),
        ("technical_team_size", "VARCHAR(50)"),
        ("description", "LONGTEXT"),
        ("sectors", "TEXT"),
        ("other_sector", "VARCHAR(255)"),
        ("services", "TEXT"),
        ("service_categories", "TEXT"),
        ("other_service", "VARCHAR(255)"),
        ("keywords", "TEXT"),
        ("portfolio_json", "LONGTEXT"),
        ("software_tools", "TEXT"),
        ("other_software", "VARCHAR(255)"),
        ("gst_number", "VARCHAR(50)"),
        ("reg_id", "VARCHAR(100)"),
        ("billing_currency", "VARCHAR(50)"),
        ("payment_terms", "TEXT"),
        ("nda_agreed", "TINYINT DEFAULT 0"),
        ("data_protection_compliant", "TINYINT DEFAULT 0"),
    ]:
        if col not in existing_cols:
            try:
                cur.execute(f"ALTER TABLE vendor_onboarding ADD COLUMN `{col}` {defn}")
            except Exception:
                pass


def _ensure_vendor_profile_child_tables():
    """Ensure vendor_portfolio and vendor_resource_profiles exist in new_swiftbim."""
    cur = vendor_cursor()

    # Main portfolio table
    cur.execute(
        """CREATE TABLE IF NOT EXISTS vendor_portfolio (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        project_name VARCHAR(255),
        project_client VARCHAR(255),
        project_sector VARCHAR(255),
        project_description LONGTEXT,
        project_role VARCHAR(255),
        project_tools VARCHAR(255),
        project_duration VARCHAR(255),
        project_year VARCHAR(50),
        project_files LONGTEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )"""
    )

    # Resource profiles table (new_swiftbim DB)
    cur.execute(
        """CREATE TABLE IF NOT EXISTS vendor_resource_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        name VARCHAR(255),
        designation VARCHAR(255),
        discipline VARCHAR(255),
        years_of_experience VARCHAR(50),
        expertise TEXT,
        role VARCHAR(255),
        software TEXT,
        certifications TEXT,
        projects_worked_on TEXT,
        email VARCHAR(255),
        login_role VARCHAR(100),
        vendor_employee_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )"""
    )

    # Backward compat: some older DBs created vendor_resource_profiles without the
    # newer login-related columns. MySQL 5.7 does not support "ADD COLUMN IF NOT EXISTS",
    # so we emulate it by checking SHOW COLUMNS first.
    try:
        cur.execute("SHOW COLUMNS FROM vendor_resource_profiles")
        existing_cols = {row["Field"].lower() for row in cur.fetchall()}
    except Exception:
        existing_cols = set()

    for col, defn in [
        ("email", "VARCHAR(255)"),
        ("login_role", "VARCHAR(100)"),
        ("vendor_employee_id", "INT"),
        ("active", "VARCHAR(32) DEFAULT 'active'"),
    ]:
        if col.lower() not in existing_cols:
            try:
                cur.execute(f"ALTER TABLE vendor_resource_profiles ADD COLUMN `{col}` {defn}")
            except Exception:
                # If this fails we simply continue; worst case the assign-login
                # endpoint will surface an error which can be debugged separately.
                pass
    try:
        cur.execute(
            "UPDATE vendor_resource_profiles SET active = 'active' WHERE active IS NULL OR TRIM(IFNULL(active,'')) = ''"
        )
        get_vendor_db().commit()
    except Exception:
        pass


def _send_login_email(to_email: str, role: str, temp_password: str):
    mail_server = current_app.config.get("MAIL_SERVER") or ""
    mail_port = int(current_app.config.get("MAIL_PORT") or 587)
    mail_use_tls = bool(current_app.config.get("MAIL_USE_TLS"))
    mail_username = current_app.config.get("MAIL_USERNAME") or ""
    mail_password = current_app.config.get("MAIL_PASSWORD") or ""
    sender = current_app.config.get("MAIL_DEFAULT_SENDER") or mail_username
    frontend_url = current_app.config.get("FRONTEND_URL") or "http://localhost:5174"
    login_url = f"{frontend_url}/"

    subject = "SwiftBIM Resource Login"
    body = "\n".join([
        "You have been added as a resource in SwiftBIM.",
        f"Role: {role}",
        "",
        f"Login email: {to_email}",
        f"Temporary password: {temp_password}",
        "",
        f"Login here: {login_url}",
        "",
        "Please login and change your password after first login.",
    ])

    if not (mail_server and sender and to_email):
        return False
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_email
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(mail_server, mail_port, timeout=10) as server:
            if mail_use_tls:
                server.starttls(context=context)
            if mail_username and mail_password:
                server.login(mail_username, mail_password)
            server.sendmail(sender, [to_email], msg.as_string())
        return True
    except Exception:
        return False


def _profile_completeness(v: dict) -> int:
    """Return 0-100 completeness % for a vendor_onboarding row."""
    fields = ["company_name", "contact_email", "contact_name", "address",
              "sectors", "services", "keywords", "gst_number"]
    filled = sum(1 for f in fields if v.get(f))
    has_portfolio = bool(v.get("portfolio_projects") or v.get("portfolio_json"))
    has_docs = bool(v.get("documents"))
    return int(((filled + has_portfolio + has_docs) / (len(fields) + 2)) * 100)


def _current_vendor_onboarding_id():
    """
    Resolve the vendor_onboarding.id for the current user.
    - For vendor users (user_type=='vendor'), company_id is vendor_employee.vendor_id
      which is the vendor_onboarding id in new_swiftbim — use it directly.
    - Otherwise resolve by g.user_email (contact_email or email in vendor_onboarding).
    Returns None if not found.
    """
    cur = vendor_cursor()
    if getattr(g, "user_type", None) == "vendor":
        cid = getattr(g, "company_id", None)
        if cid is not None:
            cur.execute("SELECT id FROM vendor_onboarding WHERE id = %s LIMIT 1", (cid,))
            row = cur.fetchone()
            if row:
                return row["id"]
    email = getattr(g, "user_email", None)
    if email:
        cur.execute(
            "SELECT id FROM vendor_onboarding WHERE contact_email=%s OR email=%s LIMIT 1",
            (email, email),
        )
        row = cur.fetchone()
        if row:
            return row["id"]
    return None


def _ensure_vendor_employee_table():
    """
    Ensure vendor_employee exists in the main DB (snh6_swiftproject).
    Many auth/team endpoints read vendor_employee via get_db().
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS vendor_employee (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        empid VARCHAR(50),
        full_name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        phone_number VARCHAR(50),
        role VARCHAR(100),
        status VARCHAR(30) DEFAULT 'active'
    )""")
    conn.commit()


@bp.route("/company-resources", methods=["GET"])
@login_required
def vendor_company_resources():
    """
    GET /api/vendors/company-resources
    Return the current vendor's resources (team) from vendor_employee.
    Works even if current session user_type isn't 'vendor' by resolving vendor_onboarding id.
    """
    _ensure_vendor_employee_table()
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"resources": []})
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """SELECT id, full_name, email, phone_number, role, status
           FROM vendor_employee
           WHERE vendor_id = %s
           ORDER BY full_name""",
        (vendor_id,),
    )
    rows = cur.fetchall()
    return jsonify({"resources": [{k: _serialize(v) for k, v in r.items()} for r in rows]})


@bp.route("/company-resources", methods=["POST"])
@login_required
def add_vendor_company_resource():
    """
    POST /api/vendors/company-resources
    Body JSON: { full_name?: string, email: string, role: string }
    Creates a vendor_employee row for the current vendor.
    """
    _ensure_vendor_employee_table()
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    role = (data.get("role") or "").strip()
    full_name = (data.get("full_name") or "").strip() or email.split("@")[0]
    phone_number = (data.get("phone_number") or "").strip()
    if not email or not role:
        return jsonify({"success": False, "message": "email and role are required"}), 400
    if role not in ["Vendor PM", "Vendor Bim Lead", "Vendor Employee"]:
        return jsonify({"success": False, "message": "Invalid role"}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT id FROM vendor_employee WHERE email = %s AND vendor_id = %s LIMIT 1",
        (email, vendor_id),
    )
    if cur.fetchone():
        return jsonify({"success": False, "message": "Email already exists"}), 400

    # Create a temporary password (vendor can share it; user can change later)
    temp_password = "V" + str(random.randint(100000, 999999))
    hashed = _md5_hash(temp_password)
    cur2 = conn.cursor()
    cur2.execute(
        "INSERT INTO vendor_employee (vendor_id, full_name, email, password, phone_number, role, status) VALUES (%s,%s,%s,%s,%s,%s,'active')",
        (vendor_id, full_name, email, hashed, phone_number, role),
    )
    conn.commit()
    return jsonify({"success": True, "id": cur2.lastrowid, "temp_password": temp_password})


@bp.route("/profile", methods=["GET"])
@login_required
def get_vendor_profile():
    """GET /api/vendors/profile — vendor's own company profile (from vendor_onboarding). Same shape as GET /api/vendors/<id> for PartnerView sections."""
    _ensure_vendor_profile_tables()
    _ensure_vendor_profile_child_tables()
    vendor_id = _current_vendor_onboarding_id()

    if not vendor_id:
        return jsonify({"profile": None, "completeness": 0, "verified": False})

    cur = vendor_cursor()
    cur.execute("SELECT * FROM vendor_onboarding WHERE id=%s", (vendor_id,))
    profile = {k: _serialize(v) for k, v in (cur.fetchone() or {}).items()}

    # Phone number should come from vendor_employee (snh6_swiftproject DB)
    try:
        conn = get_db()
        ecur = conn.cursor(dictionary=True)
        ecur.execute(
            "SELECT phone_number FROM snh6_swiftproject.vendor_employee WHERE id = %s LIMIT 1",
            (getattr(g, "user_id", None),),
        )
        erow = ecur.fetchone() or {}
        phone = (erow.get("phone_number") or "").strip()
        if phone:
            profile["phone"] = phone
            # Keep contact_mobile in sync for UIs that read it
            profile["contact_mobile"] = profile.get("contact_mobile") or phone
    except Exception:
        pass

    # Address should be combined from vendor_onboarding (new_swiftbim DB), supporting multiple locations
    try:
        company_name = (profile.get("company_name") or "").strip()
        loc_rows = []
        if company_name:
            cur.execute(
                """
                SELECT *
                FROM vendor_onboarding
                WHERE company_name = %s
                ORDER BY id
                """,
                (company_name,),
            )
            loc_rows = cur.fetchall() or []

        def _fmt_location(r: dict) -> str:
            parts = []
            for key in ("address", "city", "state", "country"):
                v = (r.get(key) or "").strip()
                if v:
                    parts.append(v)
            return ", ".join(parts).strip(", ").strip()

        locations = []
        for r in (loc_rows or [profile]):
            s = _fmt_location(r)
            if s:
                locations.append(s)

        combined = ""
        if len(locations) == 1:
            combined = locations[0]
        elif len(locations) > 1:
            combined = "\n".join([f"{i + 1}. {loc}" for i, loc in enumerate(locations)])

        if combined:
            profile["address"] = combined
            profile["address_locations"] = locations
    except Exception:
        pass

    # Portfolio projects (same as _fetch_vendor_full)
    cur.execute("SELECT * FROM vendor_portfolio WHERE vendor_id=%s ORDER BY id", (vendor_id,))
    profile["portfolio_projects"] = [{k: _serialize(v) for k, v in r.items()} for r in cur.fetchall()]

    # Resource profiles (same as _fetch_vendor_full, for TD-style view)
    cur.execute(
        "SELECT * FROM vendor_resource_profiles WHERE vendor_id = %s ORDER BY id",
        (vendor_id,),
    )
    profile["resource_profiles"] = [
        {k: _serialize(v) for k, v in r.items()} for r in cur.fetchall()
    ]

    # Documents (vendor_documents for profile uploads)
    cur.execute("SELECT * FROM vendor_documents WHERE vendor_id=%s ORDER BY uploaded_at DESC", (vendor_id,))
    profile["documents"] = [{k: _serialize(v) for k, v in r.items()} for r in cur.fetchall()]

    completeness = _profile_completeness(profile)
    verified = profile.get("status") == "approved"

    return jsonify({"profile": profile, "completeness": completeness, "verified": verified})


@bp.route("/profile", methods=["PUT"])
@login_required
def update_vendor_profile():
    """PUT /api/vendors/profile — update company details."""
    _ensure_vendor_profile_tables()
    data = request.get_json(silent=True) or {}
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404
    cur = vendor_cursor()

    allowed = [
        # Company details
        "company_name",
        "country",
        "state",
        "city",
        "year_established",
        "website",
        "linkedin",
        "address",
        "gst_number",
        "reg_id",
        # Contact person
        "contact_name",
        "contact_designation",
        "contact_email",
        "phone",
        "contact_mobile",
        "alternate_contact",
        # Company overview
        "num_employees",
        "turnover_range",
        "core_business_areas",
        "technical_team_size",
        "description",
        # Sector/service/software
        "sectors",
        "other_sector",
        "services",
        "service_categories",
        "other_service",
        "software_tools",
        "other_software",
        # Existing
        "keywords",
        "portfolio_json",
        "billing_currency",
        "payment_terms",
        "nda_agreed",
        "data_protection_compliant",
    ]
    sets, params = [], []
    for key in allowed:
        if key in data:
            sets.append(f"`{key}` = %s")
            params.append(data[key])

    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400

    params.append(vendor_id)
    cur.execute(f"UPDATE vendor_onboarding SET {', '.join(sets)} WHERE id = %s", params)
    get_vendor_db().commit()

    # If vendor updated contact_mobile (or phone), keep vendor_employee.phone_number in sync.
    try:
        new_phone = (data.get("contact_mobile") or data.get("phone") or "").strip()
        if new_phone:
            conn = get_db()
            mcur = conn.cursor(dictionary=True)
            mcur.execute(
                "SELECT phone_number FROM snh6_swiftproject.vendor_employee WHERE id = %s LIMIT 1",
                (getattr(g, "user_id", None),),
            )
            row = mcur.fetchone() or {}
            current_phone = (row.get("phone_number") or "").strip()
            if current_phone != new_phone:
                mcur.execute(
                    "UPDATE snh6_swiftproject.vendor_employee SET phone_number = %s WHERE id = %s",
                    (new_phone, getattr(g, "user_id", None)),
                )
                conn.commit()
    except Exception:
        pass
    return jsonify({"success": True})


@bp.route("/profile/resource-profiles", methods=["POST"])
@login_required
def add_vendor_resource_profile():
    """POST /api/vendors/profile/resource-profiles — add a resource profile for current vendor."""
    import os, uuid
    from werkzeug.utils import secure_filename

    _ensure_vendor_profile_tables()
    _ensure_vendor_profile_child_tables()
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404

    # Support both JSON and multipart (for files)
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    cert_path = data.get("certifications") # original filename or current value
    file = request.files.get("certifications_file")
    if file:
        upload_root = current_app.config.get("UPLOAD_FOLDER", "static/uploads")
        upload_dir = os.path.join(upload_root, "vendors") # Unified vendors directory
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
        filename = secure_filename(file.filename)
        # Avoid empty filename
        if not filename:
             filename = f"res_{uuid.uuid4().hex}"
        file.save(os.path.join(upload_dir, filename))
        cert_path = filename # Store the original filename

    cur = vendor_cursor()
    cur.execute(
        """INSERT INTO vendor_resource_profiles
           (vendor_id, name, designation, discipline, years_of_experience, expertise, role, software, certifications, projects_worked_on)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (
            vendor_id,
            data.get("name"),
            data.get("designation"),
            data.get("discipline"),
            data.get("years_of_experience"),
            data.get("expertise"),
            data.get("role"),
            data.get("software"),
            cert_path,
            data.get("projects_worked_on"),
        ),
    )
    get_vendor_db().commit()
    return jsonify({"success": True, "id": cur.lastrowid})


@bp.route("/profile/resource-profiles/<int:resource_id>", methods=["PUT"])
@login_required
def update_vendor_resource_profile(resource_id):
    """PUT /api/vendors/profile/resource-profiles/<id> — update a resource profile."""
    from werkzeug.utils import secure_filename
    import os, uuid
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404

    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    cur = vendor_cursor()
    allowed = ["name", "designation", "discipline", "years_of_experience", "expertise", "role", "software", "certifications", "projects_worked_on"]
    sets, params = [], []

    for key in allowed:
        if key in data:
            sets.append(f"`{key}` = %s")
            params.append(data[key])

    # Handle file upload for certification
    file = request.files.get("certifications_file")
    if file:
        upload_root = current_app.config.get("UPLOAD_FOLDER", "static/uploads")
        upload_dir = os.path.join(upload_root, "vendors") # Unified vendors directory
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
        filename = secure_filename(file.filename)
        if not filename:
            filename = f"res_{uuid.uuid4().hex}"
        file.save(os.path.join(upload_dir, filename))
        sets.append("`certifications` = %s")
        params.append(filename) # Store the original filename

    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400

    params.extend([resource_id, vendor_id])
    cur.execute(f"UPDATE vendor_resource_profiles SET {', '.join(sets)} WHERE id = %s AND vendor_id = %s", params)
    get_vendor_db().commit()
    return jsonify({"success": True})


@bp.route("/profile/resource-profiles/<int:resource_id>", methods=["DELETE"])
@login_required
def delete_vendor_resource_profile(resource_id):
    """DELETE /api/vendors/profile/resource-profiles/<id>."""
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404
    cur = vendor_cursor()
    cur.execute("DELETE FROM vendor_resource_profiles WHERE id = %s AND vendor_id = %s", (resource_id, vendor_id))
    get_vendor_db().commit()
    return jsonify({"success": True})


@bp.route("/profile/resource-profiles", methods=["GET"])
@login_required
def list_vendor_resource_profiles():
    """GET /api/vendors/profile/resource-profiles — list current vendor's resource profiles from new_swiftbim."""
    _ensure_vendor_profile_tables()
    _ensure_vendor_profile_child_tables()
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"resources": []})
    cur = vendor_cursor()
    cur.execute("SELECT * FROM vendor_resource_profiles WHERE vendor_id = %s ORDER BY id", (vendor_id,))
    rows = cur.fetchall()
    return jsonify({"resources": [{k: _serialize(v) for k, v in r.items()} for r in rows]})


@bp.route("/profile/resource-profiles/bulk-status", methods=["POST"])
@login_required
def bulk_status_vendor_resource_profiles():
    """
    POST /api/vendors/profile/resource-profiles/bulk-status
    Body: { "ids": [1,2,3], "action": "active" | "inactive" }
    Persists active/inactive on vendor_resource_profiles (new_swiftbim) and syncs linked vendor_employee rows.
    """
    _ensure_vendor_profile_tables()
    _ensure_vendor_profile_child_tables()
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404

    data = request.get_json(silent=True) or {}
    raw_ids = data.get("ids") or data.get("id") or []
    if isinstance(raw_ids, (int, str)):
        raw_ids = [raw_ids]
    ids = []
    for x in raw_ids:
        try:
            ids.append(int(x))
        except (TypeError, ValueError):
            continue
    if not ids:
        return jsonify({"success": False, "message": "ids required"}), 400

    action = (data.get("action") or "inactive").strip().lower()
    if action not in ("active", "inactive"):
        return jsonify({"success": False, "message": "action must be active or inactive"}), 400

    vcur = vendor_cursor()
    placeholders = ",".join(["%s"] * len(ids))
    vcur.execute(
        f"SELECT id, vendor_employee_id FROM vendor_resource_profiles WHERE vendor_id = %s AND id IN ({placeholders})",
        [vendor_id] + ids,
    )
    rows = vcur.fetchall() or []
    if not rows:
        return jsonify({"success": False, "message": "No matching resources"}), 404

    vcur.execute(
        f"UPDATE vendor_resource_profiles SET active = %s WHERE vendor_id = %s AND id IN ({placeholders})",
        [action, vendor_id] + ids,
    )
    profile_updated = vcur.rowcount
    get_vendor_db().commit()

    ve_ids = [
        int(r["vendor_employee_id"])
        for r in rows
        if r.get("vendor_employee_id") is not None
    ]
    ve_updated = 0
    if ve_ids:
        try:
            conn = get_db()
            cur = conn.cursor()
            ph2 = ",".join(["%s"] * len(ve_ids))
            cur.execute(
                f"UPDATE vendor_employee SET status = %s WHERE vendor_id = %s AND id IN ({ph2})",
                [action, vendor_id] + ve_ids,
            )
            ve_updated = cur.rowcount
            conn.commit()
        except Exception:
            pass

    return jsonify(
        {
            "success": True,
            "updated_profiles": profile_updated,
            "updated_logins": ve_updated,
        }
    )


@bp.route("/profile/resource-profiles/<int:resource_id>/assign-login", methods=["POST"])
@login_required
def assign_resource_login(resource_id):
    """
    POST /api/vendors/profile/resource-profiles/<id>/assign-login
    Body JSON: { email: string, role: 'Vendor PM'|'Vendor Bim Lead'|'Vendor Employee' }
    - Stores email+login_role in vendor_resource_profiles (new_swiftbim)
    - Creates vendor_employee login (main DB) with generated password
    - Sends email with default password + login link
    """
    _ensure_vendor_profile_tables()
    _ensure_vendor_profile_child_tables()
    _ensure_vendor_employee_table()
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    role = (data.get("role") or "").strip()
    # Optional explicit password from frontend (e.g. ResourcesV edit form)
    # If blank, we will keep the existing password for existing logins.
    raw_password = (data.get("password") or "").strip()
    full_name = (data.get("full_name") or "").strip()
    phone_number = (data.get("phone_number") or "").strip()

    if not email or not role:
        return jsonify({"success": False, "message": "email and role are required"}), 400
    if role not in ["Vendor PM", "Vendor Bim Lead", "Vendor Employee"]:
        return jsonify({"success": False, "message": "Invalid role"}), 400

    # Ensure resource belongs to this vendor
    vcur = vendor_cursor()
    vcur.execute(
        "SELECT id, name FROM vendor_resource_profiles WHERE id=%s AND vendor_id=%s",
        (resource_id, vendor_id),
    )
    res = vcur.fetchone()
    if not res:
        return jsonify({"success": False, "message": "Resource not found"}), 404

    # Create or update vendor_employee login in main DB
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT id, full_name, phone_number, password FROM vendor_employee WHERE email=%s AND vendor_id=%s LIMIT 1", (email, vendor_id))
    existing = cur.fetchone()

    if existing:
        # Email already exists for this vendor.
        vemp_id = existing.get("id")
        c2 = conn.cursor()

        if raw_password:
            # Caller explicitly wants to change the password.
            temp_password = raw_password
            hashed = _md5_hash(temp_password)
            c2.execute(
                "UPDATE vendor_employee SET password=%s, role=%s, status='active', full_name=%s, phone_number=%s WHERE id=%s AND vendor_id=%s",
                (hashed, role, full_name or None, phone_number or None, vemp_id, vendor_id),
            )
        else:
            # No password provided: keep existing password and only update role/status.
            temp_password = None
            c2.execute(
                "UPDATE vendor_employee SET role=%s, status='active', full_name=%s, phone_number=%s WHERE id=%s AND vendor_id=%s",
                (role, full_name or None, phone_number or None, vemp_id, vendor_id),
            )

        conn.commit()
        vendor_employee_id = vemp_id
    else:
        # Fresh login for this resource
        c2 = conn.cursor()
        # Either use caller‑provided password or generate a temporary one.
        if raw_password:
            temp_password = raw_password
        else:
            temp_password = "V" + str(random.randint(100000, 999999))

        hashed = _md5_hash(temp_password)
        # Default full name: provided value, or resource name, or email local part.
        if not full_name:
            full_name = (res.get("name") or email.split("@")[0])
        c2.execute(
            "INSERT INTO vendor_employee (vendor_id, empid, full_name, email, password, phone_number, role, status) VALUES (%s,%s,%s,%s,%s,%s,%s,'active')",
            (vendor_id, None, full_name, email, hashed, phone_number or None, role),
        )
        conn.commit()
        vendor_employee_id = c2.lastrowid

    # Persist mapping + synced display fields on resource profile (new_swiftbim)
    if full_name:
        vcur.execute(
            "UPDATE vendor_resource_profiles SET name=%s, email=%s, login_role=%s, vendor_employee_id=%s WHERE id=%s AND vendor_id=%s",
            (full_name, email, role, vendor_employee_id, resource_id, vendor_id),
        )
    else:
        vcur.execute(
            "UPDATE vendor_resource_profiles SET email=%s, login_role=%s, vendor_employee_id=%s WHERE id=%s AND vendor_id=%s",
            (email, role, vendor_employee_id, resource_id, vendor_id),
        )
    get_vendor_db().commit()

    # Only send password email if we actually changed/created a password.
    email_sent = False
    if temp_password:
        email_sent = _send_login_email(email, role, temp_password)
    return jsonify({"success": True, "email_sent": email_sent})


@bp.route("/profile/portfolio-projects", methods=["POST"])
@login_required
def add_vendor_portfolio_project():
    """POST /api/vendors/profile/portfolio-projects — add a portfolio project."""
    from werkzeug.utils import secure_filename
    import os, uuid
    _ensure_vendor_profile_tables()
    _ensure_vendor_profile_child_tables()
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404

    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    file = request.files.get("project_file")
    project_files_path = data.get("project_files")
    if file:
        upload_root = current_app.config.get("UPLOAD_FOLDER", "static/uploads")
        upload_dir = os.path.join(upload_root, "vendors")
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
        filename = secure_filename(file.filename)
        if not filename:
             filename = f"port_{uuid.uuid4().hex}"
        file.save(os.path.join(upload_dir, filename))
        project_files_path = filename # Store the original filename

    cur = vendor_cursor()
    cur.execute(
        """INSERT INTO vendor_portfolio
           (vendor_id, project_name, project_client, project_sector, project_description, project_role, project_tools, project_duration, project_year, project_files)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (
            vendor_id,
            data.get("project_name"),
            data.get("project_client"),
            data.get("project_sector"),
            data.get("project_description"),
            data.get("project_role"),
            data.get("project_tools"),
            data.get("project_duration"),
            data.get("project_year"),
            project_files_path,
        ),
    )
    get_vendor_db().commit()
    return jsonify({"success": True, "id": cur.lastrowid})


@bp.route("/profile/portfolio-projects/<int:project_id>", methods=["PUT"])
@login_required
def update_vendor_portfolio_project(project_id):
    """PUT /api/vendors/profile/portfolio-projects/<id> — update a portfolio project."""
    from werkzeug.utils import secure_filename
    import os, uuid
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404

    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    cur = vendor_cursor()
    allowed = ["project_name", "project_client", "project_sector", "project_description", "project_role", "project_tools", "project_duration", "project_year", "project_files"]
    sets, params = [], []

    for key in allowed:
        if key in data:
            sets.append(f"`{key}` = %s")
            params.append(data[key])

    # Handle file upload
    file = request.files.get("project_file")
    if file:
        upload_root = current_app.config.get("UPLOAD_FOLDER", "static/uploads")
        upload_dir = os.path.join(upload_root, "vendors")
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
        filename = secure_filename(file.filename)
        if not filename:
            filename = f"port_{uuid.uuid4().hex}"
        file.save(os.path.join(upload_dir, filename))
        sets.append("`project_files` = %s")
        params.append(filename) # Store the original filename

    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400

    params.extend([project_id, vendor_id])
    cur.execute(f"UPDATE vendor_portfolio SET {', '.join(sets)} WHERE id = %s AND vendor_id = %s", params)
    get_vendor_db().commit()
    return jsonify({"success": True})

    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400

    params.extend([project_id, vendor_id])
    cur.execute(f"UPDATE vendor_portfolio SET {', '.join(sets)} WHERE id = %s AND vendor_id = %s", params)
    get_vendor_db().commit()
    return jsonify({"success": True})


@bp.route("/profile/portfolio-projects/<int:project_id>", methods=["DELETE"])
@login_required
def delete_vendor_portfolio_project(project_id):
    """DELETE /api/vendors/profile/portfolio-projects/<id>."""
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404
    cur = vendor_cursor()
    cur.execute("DELETE FROM vendor_portfolio WHERE id = %s AND vendor_id = %s", (project_id, vendor_id))
    get_vendor_db().commit()
    return jsonify({"success": True})


@bp.route("/profile/documents", methods=["POST"])
@login_required
def upload_vendor_document():
    """POST /api/vendors/profile/documents — upload a document (multipart)."""
    import os, uuid
    _ensure_vendor_profile_tables()
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404
    cur = vendor_cursor()

    file = request.files.get("file")
    doc_type = request.form.get("doc_type", "general")

    if not file:
        return jsonify({"success": False, "message": "No file provided"}), 400

    upload_root = current_app.config.get("UPLOAD_FOLDER", "uploads")
    upload_dir = os.path.join(upload_root, "vendor_docs")
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)
    # Keep stored URLs compatible with existing frontend expectations
    file_url = f"/static/uploads/vendor_docs/{filename}"

    cur.execute(
        "INSERT INTO vendor_documents (vendor_id, doc_type, filename, file_url) VALUES (%s,%s,%s,%s)",
        (vendor_id, doc_type, file.filename, file_url),
    )
    get_vendor_db().commit()
    return jsonify({"success": True, "id": cur.lastrowid, "file_url": file_url})


@bp.route("/profile/documents/<int:doc_id>", methods=["DELETE"])
@login_required
def delete_vendor_document(doc_id):
    """DELETE /api/vendors/profile/documents/<id>."""
    _ensure_vendor_profile_tables()
    vendor_id = _current_vendor_onboarding_id()
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor not found"}), 404
    cur = vendor_cursor()

    cur.execute("DELETE FROM vendor_documents WHERE id=%s AND vendor_id=%s", (doc_id, vendor_id))
    get_vendor_db().commit()
    return jsonify({"success": True})


# ===========================================================================
# MODULE 8 — PAYMENTS & MILESTONES (Vendor-side)
# ===========================================================================

def _ensure_vendor_invoices_table():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""CREATE TABLE IF NOT EXISTS vendor_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        milestone_id INT NOT NULL,
        vendor_id INT NOT NULL,
        file_url VARCHAR(500),
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status ENUM('submitted','approved','paid') DEFAULT 'submitted'
    )""")


@bp.route("/milestones", methods=["GET"])
@login_required
def vendor_milestones():
    """GET /api/vendors/milestones — milestones for projects the vendor is involved in."""
    from datetime import date, datetime, timedelta
    from decimal import Decimal

    _ensure_vendor_invoices_table()
    user_id = getattr(g, "user_id", None)
    if not user_id:
        return jsonify({"milestones": []})

    conn = get_db()
    cur = conn.cursor(dictionary=True)

    def sv(v):
        if v is None:
            return None
        if isinstance(v, (date, datetime)):
            return v.isoformat()
        if isinstance(v, timedelta):
            total = int(v.total_seconds())
            h, r = divmod(max(total, 0), 3600)
            m, s = divmod(r, 60)
            return f"{h:02d}:{m:02d}:{s:02d}"
        if isinstance(v, Decimal):
            return float(v)
        return v

    try:
        cur.execute(
            """SELECT pm.*, p.project_name
               FROM payment_milestones pm
               LEFT JOIN projects p ON pm.project_id = p.id
               WHERE (
                   p.project_manager_id = %s OR p.lead_id = %s
                   OR FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(p.members,''), ','), ' ', '')) > 0
               )
               ORDER BY pm.due_date ASC""",
            (user_id, user_id, user_id),
        )
        rows = cur.fetchall()
        milestones = []
        for r in rows:
            d = {k: sv(v) for k, v in r.items()}
            # Attach any invoice submitted by this vendor
            cur.execute(
                "SELECT * FROM vendor_invoices WHERE milestone_id=%s AND vendor_id=%s ORDER BY submitted_at DESC LIMIT 1",
                (r["id"], user_id),
            )
            inv = cur.fetchone()
            d["invoice"] = {k: sv(v) for k, v in inv.items()} if inv else None
            milestones.append(d)
    except Exception as e:
        milestones = []

    return jsonify({"milestones": milestones})


@bp.route("/milestones/<int:milestone_id>/submit-invoice", methods=["POST"])
@login_required
def submit_vendor_invoice(milestone_id):
    """POST /api/vendors/milestones/<id>/submit-invoice — upload invoice PDF."""
    import os, uuid
    _ensure_vendor_invoices_table()
    user_id = getattr(g, "user_id", None)
    if not user_id:
        return jsonify({"success": False, "message": "Not authenticated"}), 401

    file = request.files.get("file")
    if not file:
        return jsonify({"success": False, "message": "No file provided"}), 400

    upload_dir = current_app.config.get("UPLOAD_FOLDER", "static/uploads/vendor_invoices")
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)
    file_url = f"/static/uploads/vendor_invoices/{filename}"

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "INSERT INTO vendor_invoices (milestone_id, vendor_id, file_url) VALUES (%s,%s,%s)",
        (milestone_id, user_id, file_url),
    )
    conn.commit()
    return jsonify({"success": True, "file_url": file_url})


# ===========================================================================
# MODULE 9 — COMMUNICATION CENTER
# ===========================================================================

VENDOR_ALLOWED_STAFF_ROLES = ("Technical Director", "BIM Coordinator", "Project Manager")


def _ensure_comm_tables():
    cur = vendor_cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS vendor_threads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        context_type ENUM('opportunity','proposal','contract','general') DEFAULT 'general',
        context_id INT DEFAULT NULL,
        subject VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )""")
    cur.execute("""CREATE TABLE IF NOT EXISTS vendor_thread_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        thread_id INT NOT NULL,
        sender_id INT NOT NULL,
        sender_type ENUM('vendor','staff') DEFAULT 'vendor',
        message TEXT NOT NULL,
        attachment_url VARCHAR(500) DEFAULT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    get_vendor_db().commit()


def _get_vendor_id_from_email(email):
    if not email:
        return None
    cur = vendor_cursor()
    cur.execute(
        "SELECT id FROM vendor_onboarding WHERE contact_email=%s OR email=%s LIMIT 1",
        (email, email),
    )
    row = cur.fetchone()
    return row["id"] if row else None


@bp.route("/threads", methods=["GET"])
@login_required
def list_vendor_threads():
    """GET /api/vendors/threads — list this vendor's clarification threads."""
    _ensure_comm_tables()
    email = getattr(g, "user_email", None)
    vendor_id = _get_vendor_id_from_email(email)
    if not vendor_id:
        return jsonify({"threads": []})

    cur = vendor_cursor()
    cur.execute(
        "SELECT * FROM vendor_threads WHERE vendor_id=%s ORDER BY updated_at DESC",
        (vendor_id,),
    )
    threads = [{k: _serialize(v) for k, v in r.items()} for r in cur.fetchall()]
    # Attach last message preview
    for t in threads:
        cur.execute(
            "SELECT message, sent_at, sender_type FROM vendor_thread_messages WHERE thread_id=%s ORDER BY sent_at DESC LIMIT 1",
            (t["id"],),
        )
        last = cur.fetchone()
        t["last_message"] = {k: _serialize(v) for k, v in last.items()} if last else None
    return jsonify({"threads": threads})


@bp.route("/threads", methods=["POST"])
@login_required
def create_vendor_thread():
    """POST /api/vendors/threads — create a new clarification thread."""
    _ensure_comm_tables()
    data = request.get_json(silent=True) or {}
    email = getattr(g, "user_email", None)
    vendor_id = _get_vendor_id_from_email(email)
    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404

    subject = (data.get("subject") or "").strip()
    context_type = data.get("context_type", "general")
    context_id = data.get("context_id")
    if not subject:
        return jsonify({"success": False, "message": "Subject is required"}), 400

    cur = vendor_cursor()
    cur.execute(
        "INSERT INTO vendor_threads (vendor_id, context_type, context_id, subject) VALUES (%s,%s,%s,%s)",
        (vendor_id, context_type, context_id, subject),
    )
    get_vendor_db().commit()
    return jsonify({"success": True, "id": cur.lastrowid})


@bp.route("/threads/<int:thread_id>/messages", methods=["GET"])
@login_required
def get_thread_messages(thread_id):
    """GET /api/vendors/threads/<id>/messages — messages in a thread."""
    _ensure_comm_tables()
    email = getattr(g, "user_email", None)
    vendor_id = _get_vendor_id_from_email(email)

    cur = vendor_cursor()
    # Verify ownership or staff access
    cur.execute("SELECT * FROM vendor_threads WHERE id=%s", (thread_id,))
    thread = cur.fetchone()
    if not thread:
        return jsonify({"messages": [], "thread": None})

    cur.execute(
        "SELECT * FROM vendor_thread_messages WHERE thread_id=%s ORDER BY sent_at ASC",
        (thread_id,),
    )
    messages = [{k: _serialize(v) for k, v in r.items()} for r in cur.fetchall()]

    # Enrich with sender name from main DB
    conn = get_db()
    main_cur = conn.cursor(dictionary=True)
    for m in messages:
        if m.get("sender_type") == "staff":
            main_cur.execute("SELECT full_name, user_role FROM employee WHERE id=%s", (m["sender_id"],))
            emp = main_cur.fetchone()
            m["sender_name"] = emp["full_name"] if emp else f"Staff #{m['sender_id']}"
            m["sender_role"] = emp["user_role"] if emp else ""
        else:
            m["sender_name"] = "You"
            m["sender_role"] = "Vendor"

    return jsonify({"thread": {k: _serialize(v) for k, v in thread.items()}, "messages": messages})


@bp.route("/threads/<int:thread_id>/messages", methods=["POST"])
@login_required
def send_thread_message(thread_id):
    """POST /api/vendors/threads/<id>/messages — send a message in a thread."""
    import os, uuid
    _ensure_comm_tables()
    user_id = getattr(g, "user_id", None)
    user_role = getattr(g, "user_role", "Vendor")

    # Determine sender type
    sender_type = "vendor" if user_role == "Vendor" else "staff"
    if sender_type == "staff" and user_role not in VENDOR_ALLOWED_STAFF_ROLES:
        return jsonify({"success": False, "message": "Not authorised to message in vendor threads"}), 403

    message_text = ""
    attachment_url = None

    if request.content_type and "multipart" in request.content_type:
        message_text = (request.form.get("message") or "").strip()
        file = request.files.get("attachment")
        if file:
            upload_dir = current_app.config.get("UPLOAD_FOLDER", "static/uploads/vendor_comm")
            os.makedirs(upload_dir, exist_ok=True)
            ext = os.path.splitext(file.filename)[1]
            filename = f"{uuid.uuid4().hex}{ext}"
            filepath = os.path.join(upload_dir, filename)
            file.save(filepath)
            attachment_url = f"/static/uploads/vendor_comm/{filename}"
    else:
        data = request.get_json(silent=True) or {}
        message_text = (data.get("message") or "").strip()

    if not message_text and not attachment_url:
        return jsonify({"success": False, "message": "Message or attachment required"}), 400

    cur = vendor_cursor()
    # Verify thread exists
    cur.execute("SELECT id FROM vendor_threads WHERE id=%s", (thread_id,))
    if not cur.fetchone():
        return jsonify({"success": False, "message": "Thread not found"}), 404

    cur.execute(
        "INSERT INTO vendor_thread_messages (thread_id, sender_id, sender_type, message, attachment_url) VALUES (%s,%s,%s,%s,%s)",
        (thread_id, user_id, sender_type, message_text, attachment_url),
    )
    # Update thread timestamp
    cur.execute("UPDATE vendor_threads SET updated_at=NOW() WHERE id=%s", (thread_id,))
    get_vendor_db().commit()
    return jsonify({"success": True, "id": cur.lastrowid})


# ===========================================================================
# MODULE 10 — PERFORMANCE & RATINGS (Read-only vendor-side)
# ===========================================================================

def _ensure_ratings_table():
    cur = vendor_cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS vendor_ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        project_id INT DEFAULT NULL,
        project_name VARCHAR(255),
        rating INT NOT NULL DEFAULT 0,
        feedback TEXT,
        rated_by INT DEFAULT NULL,
        rated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")


@bp.route("/performance", methods=["GET"])
@login_required
def vendor_performance():
    """GET /api/vendors/performance — current rating + past project ratings."""
    _ensure_ratings_table()
    email = getattr(g, "user_email", None)
    vendor_id = _get_vendor_id_from_email(email)
    if not vendor_id:
        return jsonify({"avg_rating": 0, "total_ratings": 0, "ratings": []})

    cur = vendor_cursor()
    cur.execute(
        "SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM vendor_ratings WHERE vendor_id=%s",
        (vendor_id,),
    )
    agg = cur.fetchone() or {}
    avg_rating = round(float(agg.get("avg_rating") or 0), 1)
    total_ratings = int(agg.get("total") or 0)

    cur.execute(
        "SELECT * FROM vendor_ratings WHERE vendor_id=%s ORDER BY rated_at DESC",
        (vendor_id,),
    )
    ratings = [{k: _serialize(v) for k, v in r.items()} for r in cur.fetchall()]

    # Enrich with rater name
    if ratings:
        conn = get_db()
        main_cur = conn.cursor(dictionary=True)
        for r in ratings:
            if r.get("rated_by"):
                main_cur.execute("SELECT full_name FROM employee WHERE id=%s", (r["rated_by"],))
                emp = main_cur.fetchone()
                r["rated_by_name"] = emp["full_name"] if emp else "Staff"
            else:
                r["rated_by_name"] = "—"

    return jsonify({
        "avg_rating": avg_rating,
        "total_ratings": total_ratings,
        "ratings": ratings,
    })


# ---------------------------------------------------------------------------
# Vendor Projects — stored in snh6_swiftproject.vendor_projects
# Same columns as the main "projects" table + vendor_id, proposal_id, opportunity_id
# ---------------------------------------------------------------------------

_VP_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS vendor_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(255),
    client_id VARCHAR(255),
    description MEDIUMTEXT,
    category VARCHAR(100) DEFAULT '0',
    due_date VARCHAR(255) DEFAULT '',
    department VARCHAR(2555),
    progress VARCHAR(12),
    document_attachment VARCHAR(255),
    priority VARCHAR(255),
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    members VARCHAR(255),
    budget VARCHAR(255) DEFAULT '0',
    budget_ceiling DECIMAL(15,2),
    bidding_end_date DATE,
    location VARCHAR(255) DEFAULT 'empty',
    modules VARCHAR(2555),
    no_resource VARCHAR(255),
    no_resources_required VARCHAR(255),
    lead_id VARCHAR(255),
    project_manager_id VARCHAR(255),
    totalhours VARCHAR(255),
    perday VARCHAR(255),
    Company_id VARCHAR(255),
    tasks VARCHAR(2555),
    uploaderid VARCHAR(255),
    payment_status VARCHAR(255) DEFAULT 'Pending',
    paid_date VARCHAR(254),
    deliverables MEDIUMTEXT,
    bim_coordinator_id VARCHAR(255),
    total_paid_amount DECIMAL(12,2) DEFAULT 0.00,
    payment_completion_status ENUM('NotStarted','InProgress','Completed') DEFAULT 'NotStarted',
    vendor_id INT,
    proposal_id INT,
    opportunity_id INT
)
"""


def _ensure_vp_table():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(_VP_TABLE_SQL)
    conn.commit()

    # Dynamic migration: Add missing columns if they don't exist
    cur.execute("SHOW COLUMNS FROM vendor_projects")
    existing_cols = {row['Field'].lower() for row in cur.fetchall()}

    # List of columns and types from _VP_TABLE_SQL (simplified)
    expected = {
        "client_id": "VARCHAR(255)",
        "description": "MEDIUMTEXT",
        "category": "VARCHAR(100) DEFAULT '0'",
        "due_date": "VARCHAR(255) DEFAULT ''",
        "department": "VARCHAR(2555)",
        "progress": "VARCHAR(12)",
        "document_attachment": "VARCHAR(255)",
        "priority": "VARCHAR(255)",
        "members": "VARCHAR(255)",
        "budget": "VARCHAR(255) DEFAULT '0'",
        "budget_ceiling": "DECIMAL(15,2)",
        "bidding_end_date": "DATE",
        "location": "VARCHAR(255) DEFAULT 'empty'",
        "modules": "VARCHAR(2555)",
        "no_resource": "VARCHAR(255)",
        "no_resources_required": "VARCHAR(255)",
        "lead_id": "VARCHAR(255)",
        "project_manager_id": "VARCHAR(255)",
        "totalhours": "VARCHAR(255)",
        "perday": "VARCHAR(255)",
        "company_id": "VARCHAR(255)",
        "tasks": "VARCHAR(2555)",
        "uploaderid": "VARCHAR(255)",
        "payment_status": "VARCHAR(255) DEFAULT 'Pending'",
        "paid_date": "VARCHAR(254)",
        "deliverables": "MEDIUMTEXT",
        "bim_coordinator_id": "VARCHAR(255)",
        "total_paid_amount": "DECIMAL(12,2) DEFAULT 0.00",
        "payment_completion_status": "ENUM('NotStarted','InProgress','Completed') DEFAULT 'NotStarted'"
    }

    for col, col_type in expected.items():
        if col.lower() not in existing_cols:
            try:
                cur.execute(f"ALTER TABLE vendor_projects ADD COLUMN {col} {col_type}")
                conn.commit()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Vendor Tasks (vendor_task table)
# ---------------------------------------------------------------------------

_VT_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS vendor_task (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    project_id INT NULL,
    task_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT '',
    status ENUM('Todo','InProgress','Completed') DEFAULT 'Todo',
    due_date DATE NULL,
    start_date DATE NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    assigned_to INT NULL,
    modules VARCHAR(255) DEFAULT '',
    description TEXT,
    checklist TEXT,
    outputfilepath TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
"""


def _ensure_vendor_task_table():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    # Create table if missing
    cur.execute(_VT_TABLE_SQL)
    conn.commit()

    # Ensure newer columns exist (for backward-compat on old DBs)
    cur.execute("SHOW COLUMNS FROM vendor_task")
    existing_cols = {row["Field"].lower() for row in cur.fetchall()}
    expected = {
        "category": "VARCHAR(100) DEFAULT ''",
        "start_date": "DATE NULL",
        "start_time": "TIME NULL",
        "end_time": "TIME NULL",
        "assigned_to": "INT NULL",
        "modules": "VARCHAR(255) DEFAULT ''",
        "outputfilepath": "TEXT NULL",
    }
    for col, col_type in expected.items():
        if col.lower() not in existing_cols:
            try:
                cur.execute(f"ALTER TABLE vendor_task ADD COLUMN {col} {col_type}")
                conn.commit()
            except Exception:
                pass


def _vendor_can_access_vendor_task(cur, task_id, user_id):
    """
    Allow access if user created the task, or shares the same vendor company
    (vendor_employee.vendor_id) as the task creator — matches team task visibility.
    """
    if not user_id:
        return None
    cur.execute(
        "SELECT id, vendor_id, outputfilepath FROM vendor_task WHERE id = %s",
        (task_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    if int(row.get("vendor_id") or 0) == int(user_id):
        return row
    try:
        cur.execute(
            "SELECT vendor_id AS company_id FROM snh6_swiftproject.vendor_employee WHERE id = %s LIMIT 1",
            (user_id,),
        )
        u = cur.fetchone()
        cur.execute(
            "SELECT vendor_id AS company_id FROM snh6_swiftproject.vendor_employee WHERE id = %s LIMIT 1",
            (row.get("vendor_id"),),
        )
        t = cur.fetchone()
        if (
            u
            and t
            and u.get("company_id") is not None
            and u.get("company_id") == t.get("company_id")
        ):
            return row
    except Exception:
        pass
    return None


def _resolve_assignee_from_main_employee(cur, assignee_id, company_id=None):
    """
    vendor_task.assigned_to may reference main app employee.id (TD/PM assign from
    /api/employees), not vendor_employee.id — resolve full_name from employee table.
    """
    if assignee_id is None:
        return None
    try:
        aid = int(assignee_id)
    except (TypeError, ValueError):
        return None
    try:
        if company_id is not None:
            cur.execute(
                "SELECT full_name FROM employee WHERE id = %s AND Company_id = %s LIMIT 1",
                (aid, company_id),
            )
        else:
            cur.execute(
                "SELECT full_name FROM employee WHERE id = %s LIMIT 1",
                (aid,),
            )
        row = cur.fetchone()
        if row and row.get("full_name"):
            return str(row["full_name"]).strip() or None
    except Exception:
        pass
    return None


@bp.route("/vendor-tasks", methods=["GET"])
@login_required
def list_vendor_tasks():
    """
    GET /api/vendors/vendor-tasks
    Basic "My Task" style listing for vendors, backed by vendor_task table.

    Optional query params:
    - status: Todo | InProgress | Completed
    - project_id: filter by vendor_projects.id
    """
    user_id = getattr(g, "user_id", None)
    if not user_id:
        return jsonify({"tasks": []})

    _ensure_vendor_task_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    status = request.args.get("status")
    if status:
        s = str(status).strip().lower().replace("-", "_").replace(" ", "_")
        if s == "in_progress":
            status = "InProgress"
        elif s in ("completed", "complete", "done"):
            status = "Completed"
        elif s in ("todo", "to_do"):
            status = "Todo"
    project_id = request.args.get("project_id")
    # When condition=1 (team view in frontend) we want ALL vendor tasks,
    # otherwise restrict to tasks created by the logged‑in vendor.
    is_team_view = request.args.get("condition") == "1"

    is_vendor_user_task = getattr(g, "user_type", None) == "vendor"
    task_company_id = getattr(g, "company_id", None)

    where = []
    params = []
    if not is_team_view:
        # My task view: restrict to tasks created by this user
        where.append("vt.vendor_id = %s")
        params.append(user_id)
    elif is_vendor_user_task:
        # Team view for vendor: no vendor_id restriction (all tasks in project)
        pass
    else:
        # Team view for staff (TD/PM/BL/BC): filter by company via vendor_projects join
        if task_company_id is not None:
            where.append(
                "EXISTS (SELECT 1 FROM snh6_swiftproject.vendor_projects vp2 "
                "LEFT JOIN snh6_swiftproject.projects mp ON mp.project_name COLLATE utf8mb4_general_ci = vp2.project_name COLLATE utf8mb4_general_ci "
                "WHERE vp2.id = vt.project_id AND mp.Company_id = %s)"
            )
            params.append(task_company_id)
    if status:
        where.append("vt.status = %s")
        params.append(status)
    if project_id:
        where.append("vt.project_id = %s")
        params.append(project_id)

    cur.execute(
        f"""
        SELECT
            vt.*,
            vp.project_name,
            COALESCE(ve.full_name, e_up.full_name) AS uploader_full_name,
            COALESCE(ve.profile_picture, e_up.profile_picture) AS uploader_profile_picture,
            COALESCE(va.full_name, e_as.full_name) AS assigned_full_name,
            COALESCE(va.profile_picture, e_as.profile_picture) AS assigned_profile_picture
        FROM vendor_task vt
        LEFT JOIN vendor_projects vp ON vt.project_id = vp.id
        LEFT JOIN snh6_swiftproject.vendor_employee ve ON ve.id = vt.vendor_id
        LEFT JOIN employee e_up ON e_up.id = vt.vendor_id AND ve.id IS NULL
        LEFT JOIN snh6_swiftproject.vendor_employee va ON va.id = vt.assigned_to
        LEFT JOIN employee e_as ON e_as.id = vt.assigned_to AND va.id IS NULL
        WHERE {(' AND '.join(where)) if where else '1=1'}
        ORDER BY vt.created_at DESC
        """,
        params,
    )
    rows = cur.fetchall()

    # Build assignee name map from vendor_resource_profiles (new_swiftbim)
    name_map = {}
    try:
        vendor_onboard_id = _current_vendor_onboarding_id()
        if vendor_onboard_id:
            vcur = vendor_cursor()
            vcur.execute(
                "SELECT id, name FROM vendor_resource_profiles WHERE vendor_id = %s",
                (vendor_onboard_id,),
            )
            for vr in vcur.fetchall():
                vid = vr.get("id")
                nm = vr.get("name")
                if vid is not None and nm:
                    name_map[vid] = nm
    except Exception:
        name_map = {}

    tasks = []
    for r in rows:
        d = {k: _serialize(v) for k, v in r.items()}
        # Resolve assignee name from vendor_resource_profiles using assigned_to id
        # only when assignee is not already resolved from vendor_employee.
        assignee_id = d.get("assigned_to")
        if (not d.get("assigned_full_name")) and assignee_id in name_map:
            d["assigned_full_name"] = name_map[assignee_id]
        if not d.get("assigned_full_name") and assignee_id is not None:
            nm = _resolve_assignee_from_main_employee(
                cur, assignee_id, task_company_id
            )
            if nm:
                d["assigned_full_name"] = nm
        # For frontend compatibility
        d["projectid"] = d.get("project_id")
        d["due_date"] = d.get("due_date")
        tasks.append(d)
    return jsonify({"tasks": tasks})


@bp.route("/vendor-tasks", methods=["POST"])
@login_required
def create_vendor_task():
    """
    POST /api/vendors/vendor-tasks
    Minimal fields used by Vendor My Task page.
    """
    data = request.get_json(silent=True) or request.form
    user_id = getattr(g, "user_id", None)
    if not user_id:
        return jsonify({"success": False, "message": "Not authenticated"}), 401

    _ensure_vendor_task_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    project_id = data.get("projectid") or data.get("project_id")
    project_name = data.get("project_name") or data.get("projectName")
    if not project_id and project_name:
        # Resolve vendor project id by name for this vendor
        cur.execute(
            "SELECT id FROM vendor_projects WHERE vendor_id = %s AND project_name = %s ORDER BY id DESC LIMIT 1",
            (user_id, project_name),
        )
        row = cur.fetchone()
        if row:
            project_id = row.get("id")

    task_name = data.get("task_name") or data.get("taskName") or ""
    due_date = data.get("due_date") or data.get("dueDate")
    start_date = data.get("start_date") or data.get("startdate")
    start_time = data.get("start_time") or data.get("startTime")
    end_time = data.get("due_time") or data.get("dueTime")
    category = data.get("category") or data.get("type") or ""
    modules = data.get("modules") or data.get("module") or ""

    assigned_to = data.get("assigned_to") or data.get("assignedTo")
    # If assigned_to is a name, try main employee table, then vendor_resource_profiles
    if assigned_to and not str(assigned_to).isdigit():
        cur.execute(
            "SELECT id FROM employee WHERE full_name = %s",
            (assigned_to,),
        )
        row = cur.fetchone()
        if row:
            assigned_to = row.get("id")
        else:
            try:
                vendor_onboard_id = _current_vendor_onboarding_id()
                if vendor_onboard_id:
                    vcur = vendor_cursor()
                    vcur.execute(
                        "SELECT id FROM vendor_resource_profiles WHERE vendor_id = %s AND name = %s LIMIT 1",
                        (vendor_onboard_id, str(assigned_to).strip()),
                    )
                    vr = vcur.fetchone()
                    if vr and vr.get("id") is not None:
                        assigned_to = vr.get("id")
            except Exception:
                pass

    if assigned_to is not None and str(assigned_to).strip() != "":
        try:
            assigned_to = int(str(assigned_to).strip())
        except (TypeError, ValueError):
            pass

    description = data.get("description") or ""
    checklist = data.get("checklist") or ""
    status = data.get("status") or "Todo"

    cur.execute(
        """
        INSERT INTO vendor_task
            (vendor_id, project_id, task_name, category, status,
             due_date, start_date, start_time, end_time,
             assigned_to, modules, description, checklist)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user_id,
            project_id,
            task_name,
            category,
            status,
            due_date,
            start_date,
            start_time,
            end_time,
            assigned_to,
            modules,
            description,
            checklist,
        ),
    )
    conn.commit()
    task_id = cur.lastrowid
    return jsonify({"success": True, "task_id": task_id})


@bp.route("/vendor-tasks/add", methods=["POST"])
@login_required
def add_vendor_task():
    """
    POST /api/vendors/vendor-tasks/add
    Thin wrapper around create_vendor_task so the frontend can use
    a dedicated "add task" endpoint.
    Accepts the same payload shape as /api/vendors/vendor-tasks.
    """
    return create_vendor_task()


@bp.route("/vendor-tasks/<int:task_id>", methods=["PATCH", "PUT"])
@login_required
def update_vendor_task(task_id):
    data = request.get_json(silent=True) or request.form
    _ensure_vendor_task_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    allowed = (
        "task_name",
        "status",
        "due_date",
        "start_date",
        "start_time",
        "end_time",
        "category",
        "modules",
        "assigned_to",
        "description",
        "checklist",
        "project_id",
        "outputfilepath",
    )
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            val = data[key]
            if key == "assigned_to":
                try:
                    val = int(str(val).strip())
                except (TypeError, ValueError):
                    pass
            sets.append(f"`{key}` = %s")
            params.append(val)
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400

    params.append(task_id)
    cur.execute(
        "UPDATE vendor_task SET " + ", ".join(sets) + " WHERE id = %s",
        params,
    )
    conn.commit()
    return jsonify({"success": True})


@bp.route("/vendor-tasks/<int:task_id>", methods=["GET"])
@login_required
def get_vendor_task(task_id):
    """
    GET /api/vendors/vendor-tasks/<id>
    Fetch a single vendor task with resolved project and assignee names.
    """
    _ensure_vendor_task_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    cur.execute(
        """
        SELECT
            vt.*,
            vp.project_name,
            COALESCE(ve.full_name, e_up.full_name) AS uploader_full_name,
            COALESCE(ve.profile_picture, e_up.profile_picture) AS uploader_profile_picture,
            COALESCE(va.full_name, e_as.full_name) AS assigned_full_name,
            COALESCE(va.profile_picture, e_as.profile_picture) AS assigned_profile_picture
        FROM vendor_task vt
        LEFT JOIN vendor_projects vp ON vt.project_id = vp.id
        LEFT JOIN snh6_swiftproject.vendor_employee ve ON ve.id = vt.vendor_id
        LEFT JOIN employee e_up ON e_up.id = vt.vendor_id AND ve.id IS NULL
        LEFT JOIN snh6_swiftproject.vendor_employee va ON va.id = vt.assigned_to
        LEFT JOIN employee e_as ON e_as.id = vt.assigned_to AND va.id IS NULL
        WHERE vt.id = %s
        """,
        (task_id,),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Task not found"}), 404

    d = {k: _serialize(v) for k, v in row.items()}

    # Resolve assignee name from vendor_resource_profiles (new_swiftbim)
    try:
        assignee_id = d.get("assigned_to")
        if assignee_id and not d.get("assigned_full_name"):
            vendor_onboard_id = _current_vendor_onboarding_id()
            if vendor_onboard_id:
                vcur = vendor_cursor()
                vcur.execute(
                    "SELECT name FROM vendor_resource_profiles WHERE id = %s AND vendor_id = %s",
                    (assignee_id, vendor_onboard_id),
                )
                vr = vcur.fetchone()
                if vr and vr.get("name"):
                    d["assigned_full_name"] = vr["name"]
    except Exception:
        pass

    assignee_id = d.get("assigned_to")
    if not d.get("assigned_full_name") and assignee_id is not None:
        nm = _resolve_assignee_from_main_employee(
            cur,
            assignee_id,
            getattr(g, "company_id", None),
        )
        if nm:
            d["assigned_full_name"] = nm

    # For frontend compatibility
    d["projectid"] = d.get("project_id")
    d["due_date"] = d.get("due_date")

    return jsonify(d)


@bp.route("/vendor-tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_vendor_task(task_id):
    _ensure_vendor_task_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("DELETE FROM vendor_task WHERE id = %s", (task_id,))
    conn.commit()
    return jsonify({"success": True})


@bp.route("/vendor-tasks/<int:task_id>/status", methods=["PATCH", "POST"])
@login_required
def update_vendor_task_status(task_id):
    """
    PATCH /api/vendors/vendor-tasks/<id>/status
    Body: { status: 'Todo' | 'InProgress' | 'Completed' }
    """
    data = request.get_json(silent=True) or request.form
    status = data.get("status")
    if status not in ("Todo", "InProgress", "Completed"):
        return jsonify({"success": False, "message": "Invalid status"}), 400

    _ensure_vendor_task_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "UPDATE vendor_task SET status = %s WHERE id = %s",
        (status, task_id),
    )
    conn.commit()
    return jsonify({"success": True})


@bp.route("/vendor-tasks/<int:task_id>/output-files", methods=["POST"])
@login_required
def upload_vendor_task_output_files(task_id):
    """
    POST /api/vendors/vendor-tasks/<id>/output-files
    Multipart field: image (same as /api/tasks/.../output-files).
    Stores comma-separated filenames on vendor_task.outputfilepath under uploads/task/.
    """
    import os
    import uuid

    user_id = getattr(g, "user_id", None)
    if not user_id:
        return jsonify({"success": False, "message": "Not authenticated"}), 401

    _ensure_vendor_task_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    row = _vendor_can_access_vendor_task(cur, task_id, user_id)
    if not row:
        return jsonify({"success": False, "message": "Task not found"}), 404

    files = request.files.getlist("image") or request.files.getlist("image[]")
    if not files:
        return jsonify({"success": False, "message": "No files uploaded"}), 400

    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "task")
    os.makedirs(upload_dir, exist_ok=True)

    existing = (row.get("outputfilepath") or "").strip()
    names = []
    for f in files:
        if f and f.filename:
            name = str(uuid.uuid4()) + "_" + "".join(
                c for c in f.filename if c.isalnum() or c in "._-"
            )
            path = os.path.join(upload_dir, name)
            f.save(path)
            names.append(name)

    if not names:
        return jsonify({"success": False, "message": "No valid files"}), 400

    new_path = (existing + "," + ",".join(names)) if existing else ",".join(names)
    cur.execute(
        "UPDATE vendor_task SET outputfilepath = %s WHERE id = %s",
        (new_path, task_id),
    )
    conn.commit()
    return jsonify({"success": True, "files": names})


def _hydrate_vendor_employee_names(cur, rows):
    """Resolves vendor employee IDs into names (PM, Lead, Coordinator, Members)."""
    # Collect all unique IDs
    emp_ids = set()
    for r in rows:
        for f in ["project_manager_id", "lead_id", "bim_coordinator_id"]:
            val = r.get(f)
            if val:
                emp_ids.add(str(val))
        members = r.get("members")
        if members:
            for m_id in str(members).split(","):
                if m_id.strip():
                    emp_ids.add(m_id.strip())
    
    if not emp_ids:
        return
    
    # Fetch names
    placeholders = ",".join(["%s"] * len(emp_ids))
    cur.execute(
        f"SELECT id, full_name FROM snh6_swiftproject.vendor_employee WHERE id IN ({placeholders})",
        list(emp_ids)
    )
    name_map = {str(r["id"]): r["full_name"] for r in cur.fetchall()}
    
    # Hydrate
    for r in rows:
        r["project_manager_name"] = name_map.get(str(r.get("project_manager_id")), "")
        r["lead_name"] = name_map.get(str(r.get("lead_id")), "")
        r["bim_coordinator_name"] = name_map.get(str(r.get("bim_coordinator_id")), "")
        
        m_names = []
        members = r.get("members")
        if members:
            for m_id in str(members).split(","):
                m_id = m_id.strip()
                if m_id in name_map:
                    m_names.append(name_map[m_id])
        r["members_names"] = ", ".join(m_names)


@bp.route("/vendor-projects", methods=["GET"])
@login_required
def list_vendor_projects():
    """
    GET /api/vendors/vendor-projects
    Returns vendor projects for the logged-in vendor.
    """
    user_id = getattr(g, "user_id", None)
    if not user_id:
        return jsonify({"projects": []})

    _ensure_vp_table()
    _ensure_vendor_task_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    status_filter = (request.args.get("status") or "").strip().lower()

    # Determine which vendor employee IDs' projects should be visible:
    # - For vendor users, show projects created by ANY employee in the same vendor company
    #   (so Vendor, Vendor PM, Vendor BIM Lead etc. all see the same project list).
    # - For non-vendor (staff) users, show all vendor_projects linked to their company via
    #   the main projects table (department = 'Submission Deadline' means Outsource).
    is_vendor_user = getattr(g, "user_type", None) == "vendor"
    company_id = getattr(g, "company_id", None)
    vendor_employee_ids = [user_id]
    if is_vendor_user:
        company_id = getattr(g, "company_id", None)
        if company_id is not None:
            try:
                ecur = conn.cursor(dictionary=True)
                ecur.execute(
                    "SELECT id FROM snh6_swiftproject.vendor_employee WHERE vendor_id = %s",
                    (company_id,),
                )
                rows = ecur.fetchall() or []
                ids = [r["id"] for r in rows if r.get("id") is not None]
                if ids:
                    vendor_employee_ids = ids
            except Exception:
                # On any error, keep the default [user_id] fallback
                vendor_employee_ids = [user_id]

    placeholders = ",".join(["%s"] * len(vendor_employee_ids))

    # Resolve client_id and budget from the main projects table using project_name,
    # Mappings:
    #   projects.client_id      -> new_swiftbim.users.id
    #   projects.budget(_ceiling) -> exposed as budget / budget_ceiling for vendor view
    status_sql = ""
    if status_filter in {"completed", "complete", "done"}:
        status_sql = """
        AND (
            LOWER(COALESCE(vp.status, '')) = 'completed'
            OR (
                vp.progress REGEXP '^[0-9]+(\\.[0-9]+)?$'
                AND CAST(vp.progress AS DECIMAL(10,2)) >= 100
            )
        )
        """
    elif status_filter in {"inprogress", "in_progress", "in-progress", "active", "ongoing"}:
        status_sql = """
        AND (
            LOWER(COALESCE(vp.status, '')) IN ('inprogress', 'in progress', 'active', 'ongoing')
            OR (
                vp.progress REGEXP '^[0-9]+(\\.[0-9]+)?$'
                AND CAST(vp.progress AS DECIMAL(10,2)) > 0
                AND CAST(vp.progress AS DECIMAL(10,2)) < 100
            )
        )
        """
    elif status_filter in {"todo", "pending", "not_started", "not-started"}:
        status_sql = """
        AND (
            LOWER(COALESCE(vp.status, '')) IN ('todo', 'pending', 'not started', 'not_started')
            OR (
                vp.progress REGEXP '^[0-9]+(\\.[0-9]+)?$'
                AND CAST(vp.progress AS DECIMAL(10,2)) <= 0
            )
        )
        """

    if is_vendor_user:
        # Vendor user: filter by vendor employee IDs
        where_clause = f"vp.vendor_id IN ({placeholders})"
        query_params = vendor_employee_ids
    else:
        # Staff user: only TD/PM/BL can see outsource vendor projects
        # BC, BM and other roles should NOT see vendor_projects
        staff_role = (getattr(g, "user_role", None) or "").strip()
        VENDOR_PROJECTS_STAFF_ROLES = {"Technical Director", "CEO", "Project Manager", "BIM Lead"}
        if staff_role not in VENDOR_PROJECTS_STAFF_ROLES:
            # Role not allowed to see outsource projects – return empty
            return jsonify({"projects": []})

        # Show all outsource vendor_projects for their company
        if company_id is not None:
            where_clause = "p.Company_id = %s"
            query_params = [company_id]
        else:
            where_clause = "1=0"  # no company, show nothing
            query_params = []

    placeholders = ",".join(["%s"] * len(query_params)) if query_params else "%s"

    cur.execute(
        f"""
        SELECT
            vp.*,
            COALESCE(NULLIF(p.client_id, ''), NULLIF(vp.client_id, '')) AS client_id,
            -- Prefer client name from new_swiftbim.users; fall back to raw ids
            COALESCE(u.full_name, u.email, p.client_id, vp.client_id) AS client_name,
            -- Prefer main projects.budget_ceiling / budget over vendor_projects values
            COALESCE(p.budget_ceiling, p.budget, vp.budget)       AS budget,
            COALESCE(p.budget_ceiling, vp.budget_ceiling)         AS budget_ceiling,
            -- Sync additional project metrics from main projects table using TD-compatible aliases
            COALESCE(NULLIF(vp.no_resource, ''), NULLIF(p.no_resource, ''))     AS resources,
            COALESCE(NULLIF(vp.no_resources_required, ''), NULLIF(p.no_resources_requried, '')) AS required_resources,
            -- Prefer vendor_projects row: edits from vendor UI update vp.* and must win over linked main projects.*
            COALESCE(vp.totalhours, p.totalhours)               AS totalhours,
            COALESCE(vp.perday, p.perday)                       AS per_day,
            -- Maintain old aliases for backward compatibility with existing frontend code (edit modals, etc.)
            COALESCE(NULLIF(vp.no_resource, ''), NULLIF(p.no_resource, ''))     AS no_resource,
            COALESCE(NULLIF(vp.no_resources_required, ''), NULLIF(p.no_resources_requried, '')) AS no_resources_required,
            COALESCE(vp.perday, p.perday)                       AS perday,
            COALESCE(p.location, vp.location)                   AS location,
            COALESCE(vp.start_date, p.start_date)               AS start_date,
            COALESCE(vp.due_date, p.due_date)                   AS due_date,
            COALESCE(vp.bidding_end_date, p.bidding_end_date)   AS bidding_end_date,
            p.department                                        AS department_name
        FROM snh6_swiftproject.vendor_projects vp
        LEFT JOIN snh6_swiftproject.projects p
            ON p.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci
        LEFT JOIN new_swiftbim.users u
            ON u.id = p.client_id
        WHERE {where_clause}
        {status_sql}
        ORDER BY vp.id DESC
        """,
        query_params,
    )
    rows = cur.fetchall()
    
    # Hydrate results with phase-1 and employee names
    vcur = vendor_cursor()
    projects = [dict(r) for r in rows]
    _hydrate_vendor_projects_phase1(vcur, projects)
    _hydrate_vendor_employee_names(vcur, projects)
    
    # Aggregate vendor_task counts per project for task statistics
    project_ids = [p["id"] for p in projects if p.get("id") is not None]
    task_counts = {}
    if project_ids:
        placeholders = ",".join(["%s"] * len(project_ids))
        cur.execute(
            f"""
            SELECT
                project_id,
                COUNT(*) AS total_tasks,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks
            FROM snh6_swiftproject.vendor_task
            WHERE project_id IN ({placeholders})
            GROUP BY project_id
            """,
            project_ids,
        )
        for r in cur.fetchall():
            task_counts[int(r["project_id"])] = {
                "total_tasks": int(r.get("total_tasks") or 0),
                "completed_tasks": int(r.get("completed_tasks") or 0),
            }

    final_projects = []
    for p in projects:
        d = {k: _serialize(v) for k, v in p.items()}
        pid = int(d.get("id") or 0)
        counts = task_counts.get(pid, {"total_tasks": 0, "completed_tasks": 0})
        d["total_tasks"] = counts["total_tasks"]
        d["completed_tasks"] = counts["completed_tasks"]
        # Tag every vendor_project row as Outsource so frontend can route correctly
        d["source"] = "Outsource"
        final_projects.append(d)

    # Enrich from new_swiftbim phase-1 (enquiry/proposal/contract) when fields are missing
    try:
        import re, calendar
        from datetime import date, datetime

        def _parse_iso_date(val):
            if not val:
                return None
            if isinstance(val, (datetime, date)):
                return val.date() if isinstance(val, datetime) else val
            s = str(val).strip()
            if not s:
                return None
            try:
                return datetime.fromisoformat(s.replace("Z", "")).date()
            except Exception:
                return None

        def _add_months(d: date, months: int) -> date:
            y = d.year + (d.month - 1 + months) // 12
            m = (d.month - 1 + months) % 12 + 1
            last = calendar.monthrange(y, m)[1]
            return date(y, m, min(d.day, last))

        def _duration_to_months(text: str):
            s = (text or "").strip().lower()
            if not s:
                return None
            m = re.search(r"(\\d+)\\s*(month|months|mon|mons|year|years|yr|yrs)\\b", s)
            if not m:
                return None
            n = int(m.group(1))
            unit = m.group(2)
            return n * 12 if unit.startswith("year") or unit in {"yr", "yrs"} else n

        vcur = vendor_cursor()
        # Probe columns once (avoid hard-failing on schema differences)
        try:
            vcur.execute(
                """
                SELECT COLUMN_NAME
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = 'new_swiftbim' AND TABLE_NAME = 'bim_enquiry'
                """
            )
            enq_cols = {r["COLUMN_NAME"] for r in (vcur.fetchall() or [])}
        except Exception:
            enq_cols = set()
        try:
            vcur.execute(
                """
                SELECT COLUMN_NAME
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = 'new_swiftbim' AND TABLE_NAME = 'proposals'
                """
            )
            prop_cols = {r["COLUMN_NAME"] for r in (vcur.fetchall() or [])}
        except Exception:
            prop_cols = set()
        try:
            vcur.execute(
                """
                SELECT COLUMN_NAME
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = 'new_swiftbim' AND TABLE_NAME = 'contracts'
                """
            )
            con_cols = {r["COLUMN_NAME"] for r in (vcur.fetchall() or [])}
        except Exception:
            con_cols = set()

        name_cols = ["project_name", "project", "title", "name"]
        enq_loc_parts = ["address", "city", "state", "country"]
        enq_loc_fallback = ["project_location", "location"]
        proposal_res_cols = ["resources"]
        start_cols = ["project_start_date", "start_date"]
        duration_cols = ["completion_timeline", "project_completion_time", "completion_time", "project_duration", "duration"]

        def _first(row, keys):
            for k in keys:
                if k in row and row.get(k) not in (None, "", "NULL"):
                    return str(row.get(k)).strip()
            return ""

        def _fetch(table, cols, project_name):
            key = next((c for c in name_cols if c in cols), None)
            if not key or not project_name:
                return None
            vcur.execute(
                f"SELECT * FROM {table} WHERE {key} = %s ORDER BY id DESC LIMIT 1",
                (project_name,),
            )
            return vcur.fetchone()

        def _fetch_chain_for_vendor_project(p: dict):
            # Prefer contract->proposal->enquiry via client_id (projects table uses new_swiftbim.users.id)
            enq, prop, con = {}, {}, {}
            client_id = p.get("client_id") or None
            try:
                client_id = int(client_id) if str(client_id).isdigit() else None
            except Exception:
                client_id = None

            if client_id is not None:
                try:
                    vcur.execute(
                        "SELECT * FROM contracts WHERE client_id = %s ORDER BY id DESC LIMIT 1",
                        (client_id,),
                    )
                    con = vcur.fetchone() or {}
                    pid = con.get("proposal_id")
                    pid = int(pid) if pid is not None and str(pid).isdigit() else pid
                    if pid:
                        vcur.execute("SELECT * FROM proposals WHERE id = %s LIMIT 1", (pid,))
                        prop = vcur.fetchone() or {}
                except Exception:
                    con, prop = {}, {}

            if not prop and client_id is not None:
                try:
                    vcur.execute("SELECT email FROM users WHERE id = %s LIMIT 1", (client_id,))
                    u = vcur.fetchone() or {}
                    email = (u.get("email") or "").strip()
                    if email:
                        vcur.execute(
                            "SELECT * FROM proposals WHERE email_address = %s ORDER BY id DESC LIMIT 1",
                            (email,),
                        )
                        prop = vcur.fetchone() or {}
                        
                        # Direct fetch enquiry by email if proposal linkage is missing
                        vcur.execute(
                            "SELECT * FROM bim_enquiry WHERE email_address = %s ORDER BY id DESC LIMIT 1",
                            (email,),
                        )
                        enq_by_email = vcur.fetchone() or {}
                        if enq_by_email and not enq:
                            enq = enq_by_email
                except Exception:
                    prop = {}

            sid = prop.get("service_id") if prop else None
            try:
                sid = int(sid) if sid is not None and str(sid).isdigit() else None
            except Exception:
                sid = None
            if sid is not None and not enq:
                try:
                    vcur.execute("SELECT * FROM bim_enquiry WHERE id = %s LIMIT 1", (sid,))
                    enq = vcur.fetchone() or {}
                except Exception:
                    pass

            if not enq and not prop and not con:
                pname = (p.get("project_name") or "").strip()
                enq = _fetch("bim_enquiry", enq_cols, pname) or {}
                prop = _fetch("proposals", prop_cols, pname) or {}
                con = _fetch("contracts", con_cols, pname) or {}
            return enq, prop, con

        for p in projects:
            pname = (p.get("project_name") or "").strip()
            enq_row, prop_row, con_row = _fetch_chain_for_vendor_project(p)

            prop_resources = _first(prop_row, [c for c in proposal_res_cols if c in prop_row])
            if prop_resources and not p.get("resources") and not p.get("no_resource"):
                p["resources"] = prop_resources
                p["required_resources"] = prop_resources
            elif not p.get("resources") and not p.get("no_resource"):
                # Fallback: derive total resources from proposals.commercial_offer (sum of milestones' `resources`)
                derived = 0
                try:
                    import json
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
                    # Last resort: derive from enquiry list-ish fields
                    def _count_listish(val):
                        if val is None:
                            return 0
                        s = str(val).strip()
                        if not s:
                            return 0
                        parts = [x.strip() for x in re.split(r"[,\n;]+", s) if x.strip()]
                        return len(parts)

                    derived = _count_listish(enq_row.get("disciplines_required")) or _count_listish(
                        enq_row.get("bim_services_required")
                    )

                if derived:
                    p["resources"] = str(derived)
                    p["required_resources"] = str(derived)

            loc_parts = []
            for k in enq_loc_parts:
                v = enq_row.get(k)
                v = str(v).strip() if v not in (None, "", "NULL") else ""
                if v:
                    loc_parts.append(v)
            combined_loc = ", ".join(loc_parts).strip(", ").strip()
            if not combined_loc:
                combined_loc = _first(enq_row, [c for c in enq_loc_fallback if c in enq_row])
            if combined_loc and (not p.get("location") or str(p.get("location")).strip().lower() in {"empty", "n/a", "na"}):
                p["location"] = combined_loc

            start_dt = _parse_iso_date(p.get("start_date"))
            if not start_dt:
                start_dt = (
                    _parse_iso_date(_first(enq_row, ["projectstart_date"]))
                    or _parse_iso_date(_first(enq_row, [c for c in start_cols if c in enq_row]))
                    or _parse_iso_date(_first(prop_row, [c for c in start_cols if c in prop_row]))
                    or _parse_iso_date(_first(con_row, [c for c in start_cols if c in con_row]))
                )
            end_dt = _parse_iso_date(p.get("end_date"))
            duration_text = _first(enq_row, [c for c in duration_cols if c in enq_row]) or _first(prop_row, [c for c in duration_cols if c in prop_row]) or _first(con_row, [c for c in duration_cols if c in con_row]) or str(p.get("due_date") or "").strip()
            months = _duration_to_months(duration_text)
            if months is not None and start_dt and not end_dt:
                p["end_date"] = _add_months(start_dt, months).isoformat()
    except Exception:
        pass
    return jsonify({"projects": projects})


@bp.route("/vendor-projects/<int:project_id>/task-stats", methods=["GET"])
@login_required
def vendor_project_task_stats(project_id: int):
    """
    GET /api/vendors/vendor-projects/<id>/task-stats

    Returns status-wise task counts for a vendor project, based on vendor_task:
      - Todo
      - InProgress
      - Completed
    """
    _ensure_vendor_task_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # Count all tasks for this vendor project (regardless of which vendor user created them)
    cur.execute(
        """
        SELECT
            COUNT(*) AS total_tasks,
            SUM(CASE WHEN status = 'Todo' THEN 1 ELSE 0 END) AS todo,
            SUM(CASE WHEN status = 'InProgress' THEN 1 ELSE 0 END) AS inprogress,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
        FROM snh6_swiftproject.vendor_task
        WHERE project_id = %s
        """,
        (project_id,),
    )
    row = cur.fetchone() or {}

    total_tasks = int(row.get("total_tasks") or 0)
    todo = int(row.get("todo") or 0)
    inprogress = int(row.get("inprogress") or 0)
    completed = int(row.get("completed") or 0)

    return jsonify(
        {
            "success": True,
            "project_id": project_id,
            "total_tasks": total_tasks,
            "status_counts": {
                "todo": todo,
                "inprogress": inprogress,
                "paused": 0,
                "completed": completed,
            },
        }
    )


@bp.route("/vendor-projects/<int:project_id>", methods=["GET"])
@login_required
def get_vendor_project_detail(project_id):
    """
    GET /api/vendors/vendor-projects/<id>
    Returns a single vendor project for staff/vendor view.
    Includes hydrated client and employee names.
    """
    _ensure_vp_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    
    # Join with projects and users to get display names, same as list_vendor_projects
    cur.execute(
        """
        SELECT
            vp.*,
            COALESCE(NULLIF(p.client_id, ''), NULLIF(vp.client_id, '')) AS client_id,
            -- Prefer client name from new_swiftbim.users; fall back to raw ids
            COALESCE(u.full_name, u.email, p.client_id, vp.client_id) AS client_name,
            -- Prefer main projects.budget_ceiling / budget over vendor_projects values
            COALESCE(p.budget_ceiling, p.budget, vp.budget)       AS budget,
            COALESCE(p.budget_ceiling, vp.budget_ceiling)         AS budget_ceiling,
            -- Sync additional project metrics from main projects table using TD-compatible aliases
            COALESCE(NULLIF(vp.no_resource, ''), NULLIF(p.no_resource, ''))     AS resources,
            COALESCE(NULLIF(vp.no_resources_required, ''), NULLIF(p.no_resources_requried, '')) AS required_resources,
            -- Prefer vendor_projects row: edits from vendor UI update vp.* and must win over linked main projects.*
            COALESCE(vp.totalhours, p.totalhours)               AS totalhours,
            COALESCE(vp.perday, p.perday)                       AS per_day,
            -- Maintain old aliases for backward compatibility with existing frontend code (edit modals, etc.)
            COALESCE(NULLIF(vp.no_resource, ''), NULLIF(p.no_resource, ''))     AS no_resource,
            COALESCE(NULLIF(vp.no_resources_required, ''), NULLIF(p.no_resources_requried, '')) AS no_resources_required,
            COALESCE(vp.perday, p.perday)                       AS perday,
            COALESCE(p.location, vp.location)                   AS location,
            COALESCE(vp.start_date, p.start_date)               AS start_date,
            COALESCE(vp.due_date, p.due_date)                   AS due_date,
            COALESCE(vp.bidding_end_date, p.bidding_end_date)   AS bidding_end_date,
            p.department                                        AS department_name
        FROM snh6_swiftproject.vendor_projects vp
        LEFT JOIN snh6_swiftproject.projects p
            ON p.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci
        LEFT JOIN new_swiftbim.users u
            ON u.id = p.client_id
        WHERE vp.id = %s
        """,
        (project_id,),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"error": "Project not found"}), 404

    project = dict(row)
    vcur = vendor_cursor()
    _hydrate_vendor_projects_phase1(vcur, [project])
    _hydrate_vendor_employee_names(vcur, [project])

    # Aggregate vendor_task counts for this project
    cur.execute(
        """
        SELECT
            COUNT(*) AS total_tasks,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks
        FROM snh6_swiftproject.vendor_task
        WHERE project_id = %s
        """,
        (project_id,),
    )
    trow = cur.fetchone() or {}
    project["total_tasks"] = int(trow.get("total_tasks") or 0)
    project["completed_tasks"] = int(trow.get("completed_tasks") or 0)
    project["source"] = "Outsource"

    return jsonify({k: _serialize(v) for k, v in project.items()})


def _vendor_task_module_label(row: dict) -> str:
    """vendor_task uses `modules` in schema; some DBs may have `modules_name` from older migrations."""
    v = row.get("modules_name")
    if v is None or (isinstance(v, str) and not v.strip()):
        v = row.get("modules")
    return str(v or "").strip()


@bp.route("/vendor-projects/<int:project_id>/module-progress", methods=["GET"])
@login_required
def vendor_project_module_progress(project_id):
    """
    GET /api/vendors/vendor-projects/<id>/module-progress
    Returns module-wise completion percentage and status counts for an outsourced project.
    Ported logic from projects.py project_module_progress to ensure frontend compatibility.
    """
    _ensure_vendor_task_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # 1. Fetch project to get its defined modules
    cur.execute(
        "SELECT id, modules FROM snh6_swiftproject.vendor_projects WHERE id = %s",
        (project_id,),
    )
    proj = cur.fetchone()
    if not proj:
        return jsonify({"success": False, "message": "Project not found"}), 404

    # 2. Fetch all vendor tasks (column is `modules`, not modules_name — wrong column caused HTTP 500)
    cur.execute(
        "SELECT status, modules FROM snh6_swiftproject.vendor_task WHERE project_id = %s",
        (project_id,),
    )
    tasks = cur.fetchall()

    # Aggregate status counts
    status_counts = {"todo": 0, "inprogress": 0, "paused": 0, "completed": 0}
    for t in tasks:
        s = str(t.get("status") or "").lower()
        if s in {"todo", "pending"}: status_counts["todo"] += 1
        elif s in {"inprogress", "in progress", "active"}: status_counts["inprogress"] += 1
        elif s in {"pause", "paused"}: status_counts["paused"] += 1
        elif s in {"completed", "complete", "done"}: status_counts["completed"] += 1

    # Overall completion %
    total_tasks = len(tasks)
    completed_tasks = status_counts["completed"]
    overall_percentage = round((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0.0

    # 3. Determine module list
    raw_modules = (proj.get("modules") or "").strip()
    module_names = []
    if raw_modules:
        if raw_modules.startswith("["):
            try:
                parsed = json.loads(raw_modules)
                if isinstance(parsed, list):
                    module_names = [str(m).strip() for m in parsed if str(m).strip()]
            except Exception:
                module_names = []
        if not module_names:
            # Compatibility: split by semicolon or comma
            sep = ";" if ";" in raw_modules else ","
            module_names = [m.strip() for m in raw_modules.split(sep) if m.strip()]
    else:
        # Fallback to tasks
        derived = {_vendor_task_module_label(t) for t in tasks}
        module_names = sorted([m for m in derived if m])

    # 4. Aggregate by module
    module_stats = []
    for mname in module_names:
        m_tasks = [t for t in tasks if _vendor_task_module_label(t) == mname]
        m_total = len(m_tasks)
        m_completed = sum(1 for t in m_tasks if str(t.get("status") or "").lower() in {"completed", "complete", "done"})
        m_pct = round((m_completed / m_total * 100), 2) if m_total > 0 else 0.0
        
        module_stats.append({
            "module_name": mname,
            "total_tasks": m_total,
            "completed_tasks": m_completed,
            "completion_percentage": m_pct
        })

    return jsonify({
        "success": True,
        "project_id": project_id,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "project_completion_percentage": overall_percentage,
        "status_counts": status_counts,
        "modules": module_stats
    })


@bp.route("/vendor-projects/filters/modules", methods=["POST"])
@login_required
def get_vendor_project_modules():
    """
    POST /api/vendors/vendor-projects/filters/modules
    Returns modules for a given vendor project.
    """
    data = request.get_json(silent=True) or {}
    project_id = data.get("projectId")
    if not project_id:
        return jsonify({"modules": []})

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT modules FROM snh6_swiftproject.vendor_projects WHERE id = %s",
        (project_id,),
    )
    row = cur.fetchone()
    if not row or not row.get("modules"):
        return jsonify({"modules": []})

    raw = row["modules"]
    # Usually modules are stored as "Mod1;Mod2" or similar in this system
    sep = ";" if ";" in raw else ","
    parts = [p.strip() for p in raw.split(sep) if p.strip()]
    modules = [{"label": p} for p in parts]

    return jsonify({"modules": modules})


@bp.route("/vendor-projects", methods=["POST"])
@login_required
def create_vendor_project():
    """
    POST /api/vendors/vendor-projects
    Create a new vendor project.
    """
    data = request.get_json(silent=True) or {}
    user_id = getattr(g, "user_id", None)

    _ensure_vp_table()
    conn = get_db()
    cur = conn.cursor()

    cols = [
        "project_name", "client_id", "description", "category", "due_date",
        "department", "priority", "start_date", "members", "budget",
        "budget_ceiling", "bidding_end_date", "location", "modules",
        "no_resource", "no_resources_required", "lead_id",
        "project_manager_id", "totalhours", "perday", "vendor_id",
        "proposal_id", "opportunity_id", "bim_coordinator_id", "deliverables",
    ]
    values = []
    placeholders = []
    insert_cols = []
    for c in cols:
        if c == "vendor_id":
            val = user_id
        else:
            val = data.get(c)
        if val is not None:
            insert_cols.append(c)
            placeholders.append("%s")
            values.append(val)

    if not insert_cols:
        return jsonify({"success": False, "message": "No data provided"}), 400

    sql = f"INSERT INTO snh6_swiftproject.vendor_projects ({', '.join(insert_cols)}) VALUES ({', '.join(placeholders)})"
    try:
        cur.execute(sql, tuple(values))
        conn.commit()
        return jsonify({"success": True, "project_id": cur.lastrowid})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@bp.route("/vendor-projects/<int:project_id>", methods=["PUT", "PATCH"])
@login_required
def update_vendor_project(project_id):
    """
    PUT/PATCH /api/vendors/vendor-projects/<id>
    Update a vendor project with multi-file support.
    """
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # 1. Check existence
    cur.execute("SELECT document_attachment FROM snh6_swiftproject.vendor_projects WHERE id = %s", (project_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Project not found"}), 404

    # 2. Handle Document Attachments (Multi-file logic)
    existing_file_str = row.get("document_attachment") or ""
    existing_files = [f.strip() for f in existing_file_str.split(",") if f.strip()] if existing_file_str else []

    # Filter out removed files
    removed_files = data.get("removed_files", "")
    if removed_files:
        if isinstance(removed_files, str):
            removed_list = [f.strip() for f in removed_files.split(",") if f.strip()]
        else:
            removed_list = removed_files
        existing_files = [f for f in existing_files if f not in removed_list]

    # Handle new uploads
    uploaded_files = request.files.getlist("files")
    new_file_paths = []
    if uploaded_files:
        upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
        vendor_docs_dir = os.path.join(upload_folder, "vendor_docs")
        if not os.path.exists(vendor_docs_dir):
            os.makedirs(vendor_docs_dir)
        
        for file in uploaded_files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                file.save(os.path.join(vendor_docs_dir, unique_filename))
                new_file_paths.append(unique_filename)

    # Combine and update data
    all_files = list(set(existing_files + new_file_paths))
    data["document_attachment"] = ",".join(all_files)

    # 3. Update database
    allowed = [
        "project_name", "client_id", "description", "category", "due_date",
        "end_date", "department", "progress", "priority", "start_date", "members",
        "budget", "budget_ceiling", "bidding_end_date", "location", "modules",
        "no_resource", "no_resources_required", "lead_id",
        "project_manager_id", "totalhours", "perday", "bim_coordinator_id",
        "document_attachment", "payment_status", "deliverables",
    ]
    fields = []
    values = []
    for col in allowed:
        if col in data and data[col] is not None:
            fields.append(f"{col} = %s")
            values.append(data[col])

    if not fields:
        return jsonify({"success": False, "message": "No fields to update"}), 400

    values.append(project_id)
    sql = f"UPDATE snh6_swiftproject.vendor_projects SET {', '.join(fields)} WHERE id = %s"
    try:
        cur.execute(sql, tuple(values))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


import os
import uuid
from werkzeug.utils import secure_filename

@bp.route("/vendor-projects/<int:project_id>/upload-document", methods=["POST"])
@login_required
def upload_vendor_project_document(project_id):
    """
    POST /api/vendors/vendor-projects/<id>/upload-document
    Uploads a document for an outsourced project and stores it in vendor_projects.
    """
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"}), 400
        
    if file:
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
        vendor_docs_dir = os.path.join(upload_folder, "vendor_docs")
        
        if not os.path.exists(vendor_docs_dir):
            os.makedirs(vendor_docs_dir)
            
        file_path = os.path.join(vendor_docs_dir, unique_filename)
        file.save(file_path)
        
        # Save to database (append for multi-file support)
        conn = get_db()
        cur = conn.cursor()
        try:
            # First fetch existing attachments
            cur.execute("SELECT document_attachment FROM snh6_swiftproject.vendor_projects WHERE id = %s", (project_id,))
            row = cur.fetchone()
            existing = row[0] if row and row[0] else ""
            
            # Append new filename
            new_value = f"{existing}, {unique_filename}" if existing else unique_filename
            
            cur.execute(
                "UPDATE snh6_swiftproject.vendor_projects SET document_attachment = %s WHERE id = %s",
                (new_value, project_id)
            )
            conn.commit()
            return jsonify({
                "success": True, 
                "filename": unique_filename,
                "url": f"/static/uploads/vendor_docs/{unique_filename}"
            })
        except Exception as e:
            conn.rollback()
            # If DB update fails, attempt to delete the uploaded file
            try:
                os.remove(file_path)
            except OSError:
                pass
            return jsonify({"success": False, "message": str(e)}), 500



# ---------------------------------------------------------------------------
# Vendor Teams (vendor_team table)
# ---------------------------------------------------------------------------

_VT_TEAM_SQL = """
CREATE TABLE IF NOT EXISTS vendor_team (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    team_name VARCHAR(255) NOT NULL,
    leader INT NOT NULL,
    employee TEXT NOT NULL,
    project_lead INT DEFAULT NULL,
    project_id INT NULL,
    project_name VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
"""


def _ensure_vendor_team_table():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(_VT_TEAM_SQL)
    conn.commit()
    # Add columns on existing DBs (may already have company_name etc. from manual ALTERs)
    try:
        cur.execute("SHOW COLUMNS FROM vendor_team")
        existing_cols = {row["Field"].lower() for row in cur.fetchall()}
        expected = {
            "project_id": "INT NULL",
            "project_name": "VARCHAR(255) NULL",
        }
        for col, col_type in expected.items():
            if col.lower() not in existing_cols:
                try:
                    cur.execute(
                        f"ALTER TABLE vendor_team ADD COLUMN `{col}` {col_type}"
                    )
                    conn.commit()
                except Exception:
                    pass
    except Exception:
        pass


@bp.route("/vendor-teams", methods=["GET"])
@login_required
def list_vendor_teams():
    """
    GET /api/vendors/vendor-teams
    Returns teams created by the logged-in vendor user.
    """
    user_id = getattr(g, "user_id", None)
    if not user_id:
        return jsonify({"teams": []})

    _ensure_vendor_team_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    cur.execute(
        """
        SELECT
            vt.id AS team_id,
            vt.team_name,
            vt.leader,
            vt.employee,
            vt.project_lead,
            vt.project_id,
            vt.project_name,
            vt.created_at,
            e_leader.full_name AS leader_name,
            e_pl.full_name AS project_lead_name
        FROM vendor_team vt
        LEFT JOIN employee e_leader ON vt.leader = e_leader.id
        LEFT JOIN employee e_pl ON vt.project_lead = e_pl.id
        WHERE vt.vendor_id = %s
        ORDER BY vt.created_at DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    teams = [{k: _serialize(v) for k, v in r.items()} for r in rows]
    return jsonify({"teams": teams})


@bp.route("/vendor-teams", methods=["POST"])
@login_required
def create_vendor_team():
    """
    POST /api/vendors/vendor-teams
    Body JSON: { team_name, leader, employee (comma CSV), project_lead?, project_id?, project_name? }
    """
    _ensure_vendor_team_table()
    data = request.get_json(silent=True) or request.form
    user_id = getattr(g, "user_id", None)
    if not user_id:
        return jsonify({"success": False, "message": "Not authenticated"}), 401

    team_name = (data.get("team_name") or "").strip()
    leader = data.get("leader")
    employee = (data.get("employee") or "").strip()
    project_lead = data.get("project_lead")
    project_id = data.get("project_id")
    project_name = (data.get("project_name") or "").strip() or None
    if project_id is not None and project_id != "":
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            project_id = None
    else:
        project_id = None

    if not team_name or not leader or not employee:
        return jsonify({"success": False, "message": "team_name, leader, employee are required"}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """
            INSERT INTO vendor_team (vendor_id, team_name, leader, employee, project_lead, project_id, project_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                team_name,
                leader,
                employee,
                project_lead or None,
                project_id,
                project_name,
            ),
        )
        conn.commit()
        return jsonify({"success": True, "team_id": cur.lastrowid})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@bp.route("/vendor-teams/<int:team_id>", methods=["PATCH"])
@login_required
def update_vendor_team(team_id):
    """
    PATCH /api/vendors/vendor-teams/<id>
    Body JSON: any of { team_name, leader, employee, project_lead, project_id, project_name }
    """
    _ensure_vendor_team_table()
    data = request.get_json(silent=True) or request.form
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    allowed = (
        "team_name",
        "leader",
        "employee",
        "project_lead",
        "project_id",
        "project_name",
    )
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(data[key])
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400

    params.append(team_id)
    try:
        cur.execute(
            "UPDATE vendor_team SET " + ", ".join(sets) + " WHERE id = %s",
            params,
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@bp.route("/vendor-teams/<int:team_id>", methods=["DELETE"])
@login_required
def delete_vendor_team(team_id):
    """
    DELETE /api/vendors/vendor-teams/<id>
    """
    _ensure_vendor_team_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("DELETE FROM vendor_team WHERE id = %s", (team_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@bp.route("/vendor-resource-profiles", methods=["GET"])
@login_required
def list_all_vendor_resource_profiles():
    """
    GET /api/vendors/vendor-resource-profiles
    Returns all resource profiles from vendor_resource_profiles table (new_swiftbim).
    Used for Team Members dropdown in vendor projects.
    """
    cur = vendor_cursor()
    try:
        cur.execute(
            """
            SELECT
                id,
                name AS full_name,
                email,
                designation,
                role,
                vendor_id
            FROM vendor_resource_profiles
            ORDER BY name
            """
        )
        rows = cur.fetchall()
        resources = [{k: _serialize(v) for k, v in r.items()} for r in rows]
        return jsonify({"success": True, "resources": resources})
    except Exception as e:
        return jsonify({"success": False, "message": str(e), "resources": []}), 500


@bp.route("/vendor-projects/<int:project_id>", methods=["DELETE"])
@login_required
def delete_vendor_project(project_id):
    """
    DELETE /api/vendors/vendor-projects/<id>
    """
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM snh6_swiftproject.vendor_projects WHERE id = %s", (project_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


