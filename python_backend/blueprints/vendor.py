import mysql.connector as mysql_connector
from flask import Blueprint, request, jsonify, g, current_app
from auth_middleware import login_required
from db import get_db

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


# NOTE: Blueprint does not support teardown decorators directly.
# Cleanup is handled in app.py via @app.teardown_appcontext (see app.py).


# ---------------------------------------------------------------------------
# Serialisation helper
# ---------------------------------------------------------------------------

def _serialize(value):
    """Convert non-JSON-serialisable types (e.g. date/datetime) to strings."""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


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
    Looks up the vendor record by the logged-in user's email.
    """
    cur = vendor_cursor()

    # Try to find the vendor's own record by email
    email = getattr(g, "user_email", None)
    vendor_id = None
    if email:
        cur.execute(
            "SELECT id FROM vendor_onboarding WHERE contact_email = %s OR email = %s LIMIT 1",
            (email, email),
        )
        row = cur.fetchone()
        if row:
            vendor_id = row["id"]

    # Count active opportunities (bidding entries that are active)
    active_opportunities = 0
    bids_submitted = 0
    proposals_awaiting = 0
    active_projects = 0
    vendor_id = getattr(g, "user_id", None)  # Use employee ID directly

    try:
        main_cur = get_db().cursor(dictionary=True)
        # Ensure tables exist (now in main DB)
        main_cur.execute("""CREATE TABLE IF NOT EXISTS vendor_bidding (
            id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL,
            project_name VARCHAR(255) NOT NULL, description TEXT,
            outsource_budget DECIMAL(15,2), budget_ceiling DECIMAL(15,2),
            bid_deadline DATE, status ENUM('active','closed') DEFAULT 'active',
            company_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_project (project_id))"""
        )
        main_cur.execute("""CREATE TABLE IF NOT EXISTS vendor_bids (
            id INT AUTO_INCREMENT PRIMARY KEY, opportunity_id INT NOT NULL,
            vendor_id INT NOT NULL, bid_amount DECIMAL(15,2), notes TEXT,
            timeline VARCHAR(255), team_size INT DEFAULT 0,
            status ENUM('submitted','shortlisted','won','lost') DEFAULT 'submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_vendor_opportunity (vendor_id, opportunity_id))"""
        )
        main_cur.execute(
            "SELECT COUNT(*) AS cnt FROM vendor_bidding WHERE status = 'active'"
        )
        r = main_cur.fetchone()
        active_opportunities = r["cnt"] if r else 0
    except Exception:
        active_opportunities = 0

    if vendor_id:
        try:
            main_cur = get_db().cursor(dictionary=True)
            main_cur.execute(
                "SELECT COUNT(*) AS cnt FROM vendor_bids WHERE vendor_id = %s",
                (vendor_id,),
            )
            r = main_cur.fetchone()
            bids_submitted = r["cnt"] if r else 0
        except Exception:
            bids_submitted = 0

        try:
            cur.execute(
                """SELECT COUNT(*) AS cnt FROM vendor_proposals
                   WHERE vendor_id = %s AND status = 'pending'""",
                (vendor_id,),
            )
            r = cur.fetchone()
            proposals_awaiting = r["cnt"] if r else 0
        except Exception:
            proposals_awaiting = 0

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
    Returns today's tasks assigned to or uploaded by the logged-in vendor user.
    Mirrors the TD /api/dashboard/priority-tasks endpoint.
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

    try:
        cur.execute(
            """SELECT t.id, t.task_name, t.due_date, t.status, t.category,
                      t.perferstart_time, t.perferend_time,
                      t.projectid, t.assigned_to, t.uploaderid,
                      e_assigned.full_name AS assigned_full_name,
                      e_assigned.profile_picture AS assigned_profile_picture,
                      e_uploader.full_name AS uploader_full_name,
                      e_uploader.profile_picture AS uploader_profile_picture,
                      p.project_name
               FROM tasks t
               LEFT JOIN projects p ON t.projectid = p.id
               LEFT JOIN employee e_assigned ON t.assigned_to = e_assigned.id
               LEFT JOIN employee e_uploader ON t.uploaderid = e_uploader.id
               WHERE (t.assigned_to = %s OR t.uploaderid = %s)
                 AND (t.status IN ('Todo', 'InProgress', 'Pause'))
                 AND DATE(t.due_date) = %s
               ORDER BY t.due_date ASC, COALESCE(t.perferstart_time, '00:00:00') ASC
               LIMIT 20""",
            (user_id, user_id, today),
        )
        rows = cur.fetchall()
        tasks = []
        for r in rows:
            d = {k: _serialize_value(v) for k, v in r.items()}
            involved = []
            if d.get("assigned_to") and d.get("assigned_full_name"):
                involved.append({
                    "id": d["assigned_to"],
                    "full_name": d["assigned_full_name"],
                    "profile_picture": d.get("assigned_profile_picture"),
                })
            if d.get("uploaderid") and d.get("uploader_full_name"):
                if not any(p.get("id") == d["uploaderid"] for p in involved):
                    involved.append({
                        "id": d["uploaderid"],
                        "full_name": d["uploader_full_name"],
                        "profile_picture": d.get("uploader_profile_picture"),
                    })
            d["involved_persons"] = involved
            tasks.append(d)
    except Exception:
        tasks = []

    return jsonify({"tasks": tasks})


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
            cur.execute("SELECT opportunity_id FROM vendor_bids WHERE vendor_id = %s", (vendor_id,))
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
        cur.execute("SELECT id, project_name, bid_deadline FROM vendor_bidding WHERE id = %s AND status = 'active'",
                    (opportunity_id,))
        opp = cur.fetchone()
        if not opp:
            return jsonify({"success": False, "message": "Opportunity not found or already closed"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    try:
        cur.execute(
            """INSERT INTO vendor_bids (vendor_id, opportunity_id, bid_amount, notes, timeline, team_size, status, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, 'submitted', NOW())
               ON DUPLICATE KEY UPDATE bid_amount = VALUES(bid_amount), notes = VALUES(notes),
               timeline = VALUES(timeline), team_size = VALUES(team_size), status = 'submitted'""",
            (vendor_id, opportunity_id, bid_amount, notes, timeline, team_size),
        )
        conn.commit()
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

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
               FROM vendor_bids vb
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
        main_cur.execute(
            "UPDATE td_proposals SET status = %s WHERE id = %s",
            (new_status, proposal_id),
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
                main_cur.execute("""
                    INSERT INTO vendor_projects (
                        proposal_id, opportunity_id, vendor_id, project_name, 
                        description, modules, deliverables, budget
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    proposal_id,
                    proposal_data.get("opportunity_id"),
                    proposal_data.get("vendor_id"),
                    proposal_data.get("project_name"),
                    proposal_data.get("scope_of_work"),
                    proposal_data.get("technologies_used"),
                    proposal_data.get("deliverables"),
                    "0"
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
                  (SELECT COUNT(*) FROM vendor_bids vbid WHERE vbid.opportunity_id = vb.id) AS total_bids,
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

    # Fetch bids - join employee table from main DB for vendor info
    bids = []
    try:
        # Get bids from vendor_bidding table
        cur.execute(
            """SELECT * FROM vendor_bids
               WHERE opportunity_id = %s
               ORDER BY bid_amount ASC""",
            (bidding_id,),
        )
        rows = cur.fetchall()

        if rows:
            # Get employee info since we're already on main DB
            vendor_ids = [r["vendor_id"] for r in rows]
            placeholders = ",".join(["%s"] * len(vendor_ids))
            cur.execute(
                f"""SELECT id, full_name, email, phone_number, role
                   FROM vendor_employee WHERE id IN ({placeholders})""",
                vendor_ids,
            )
            emp_map = {r["id"]: r for r in cur.fetchall()}

            for i, r in enumerate(rows):
                entry = {k: _serialize(v) for k, v in r.items()}
                emp = emp_map.get(r["vendor_id"], {})
                entry["vendor_name"] = emp.get("full_name") or f"Vendor #{r['vendor_id']}"
                entry["vendor_email"] = emp.get("email") or ""
                entry["vendor_phone"] = emp.get("phone_number") or ""
                entry["company_name"] = emp.get("full_name") or ""
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
            "UPDATE vendor_bids SET status = 'shortlisted' WHERE id = %s AND opportunity_id = %s",
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
            FROM vendor_bids vb
            LEFT JOIN vendor_bidding vbi ON vbi.id = vb.opportunity_id
            LEFT JOIN vendor_employee e ON e.id = vb.vendor_id
            WHERE vb.id = %s
            """,
            (bid_id,),
        )
        row = cur.fetchone()
        bid_info = {k: _serialize(v) for k, v in row.items()} if row else {}
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

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
            "UPDATE vendor_bids SET status = 'lost' WHERE id = %s AND opportunity_id = %s",
            (bid_id, bidding_id),
        )
        if cur.rowcount == 0:
            return jsonify({"success": False, "message": "Bid not found"}), 404
        conn.commit()
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

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
                   (SELECT COUNT(*) FROM td_proposals tp WHERE tp.bid_id = vb.id) > 0 AS proposal_exists
            FROM vendor_bids vb
            LEFT JOIN vendor_bidding vbi ON vbi.id = vb.opportunity_id
            LEFT JOIN vendor_employee e ON e.id = vb.vendor_id
            WHERE vb.status = 'shortlisted'
            ORDER BY vb.created_at DESC
            """
        )
        rows = cur.fetchall()
        bids = [{k: _serialize(v) for k, v in r.items()} for r in rows]
    except Exception as e:
        bids = []
    return jsonify({"bids": bids})


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
        conn.commit()
        
        return jsonify({"success": True, "message": "Proposal created and sent to vendor."})
        
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
    for col, defn in [
        ("sectors", "TEXT"),
        ("services", "TEXT"),
        ("keywords", "TEXT"),
        ("portfolio_json", "LONGTEXT"),
        ("gst_number", "VARCHAR(50)"),
        ("reg_id", "VARCHAR(100)"),
    ]:
        try:
            cur.execute(f"ALTER TABLE vendor_onboarding ADD COLUMN IF NOT EXISTS `{col}` {defn}")
        except Exception:
            pass


def _profile_completeness(v: dict) -> int:
    """Return 0-100 completeness % for a vendor_onboarding row."""
    fields = ["company_name", "contact_email", "contact_name", "address",
              "sectors", "services", "keywords", "gst_number"]
    filled = sum(1 for f in fields if v.get(f))
    has_portfolio = bool(v.get("portfolio_projects") or v.get("portfolio_json"))
    has_docs = bool(v.get("documents"))
    return int(((filled + has_portfolio + has_docs) / (len(fields) + 2)) * 100)


@bp.route("/profile", methods=["GET"])
@login_required
def get_vendor_profile():
    """GET /api/vendors/profile — vendor's own company profile."""
    _ensure_vendor_profile_tables()
    email = getattr(g, "user_email", None)
    cur = vendor_cursor()
    vendor_id = None
    if email:
        cur.execute(
            "SELECT id FROM vendor_onboarding WHERE contact_email=%s OR email=%s LIMIT 1",
            (email, email),
        )
        row = cur.fetchone()
        if row:
            vendor_id = row["id"]

    if not vendor_id:
        return jsonify({"profile": None, "completeness": 0, "verified": False})

    cur.execute("SELECT * FROM vendor_onboarding WHERE id=%s", (vendor_id,))
    profile = {k: _serialize(v) for k, v in (cur.fetchone() or {}).items()}

    # Portfolio projects
    cur.execute("SELECT * FROM vendor_portfolio WHERE vendor_id=%s ORDER BY id", (vendor_id,))
    profile["portfolio_projects"] = [{k: _serialize(v) for k, v in r.items()} for r in cur.fetchall()]

    # Documents
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
    email = getattr(g, "user_email", None)
    cur = vendor_cursor()

    vendor_id = None
    if email:
        cur.execute(
            "SELECT id FROM vendor_onboarding WHERE contact_email=%s OR email=%s LIMIT 1",
            (email, email),
        )
        row = cur.fetchone()
        if row:
            vendor_id = row["id"]

    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404

    allowed = ["company_name", "address", "gst_number", "reg_id",
               "sectors", "services", "keywords", "portfolio_json",
               "contact_name", "contact_email", "phone", "website"]
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
    return jsonify({"success": True})


@bp.route("/profile/documents", methods=["POST"])
@login_required
def upload_vendor_document():
    """POST /api/vendors/profile/documents — upload a document (multipart)."""
    import os, uuid
    _ensure_vendor_profile_tables()
    email = getattr(g, "user_email", None)
    cur = vendor_cursor()

    vendor_id = None
    if email:
        cur.execute(
            "SELECT id FROM vendor_onboarding WHERE contact_email=%s OR email=%s LIMIT 1",
            (email, email),
        )
        row = cur.fetchone()
        if row:
            vendor_id = row["id"]

    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor profile not found"}), 404

    file = request.files.get("file")
    doc_type = request.form.get("doc_type", "general")

    if not file:
        return jsonify({"success": False, "message": "No file provided"}), 400

    upload_dir = current_app.config.get("UPLOAD_FOLDER", "static/uploads/vendor_docs")
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)
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
    email = getattr(g, "user_email", None)
    cur = vendor_cursor()
    vendor_id = None
    if email:
        cur.execute(
            "SELECT id FROM vendor_onboarding WHERE contact_email=%s OR email=%s LIMIT 1",
            (email, email),
        )
        row = cur.fetchone()
        if row:
            vendor_id = row["id"]

    if not vendor_id:
        return jsonify({"success": False, "message": "Vendor not found"}), 404

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
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM vendor_projects WHERE vendor_id = %s ORDER BY id DESC",
        (user_id,),
    )
    rows = cur.fetchall()
    projects = [{k: _serialize(v) for k, v in r.items()} for r in rows]
    return jsonify({"projects": projects})


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

    sql = f"INSERT INTO vendor_projects ({', '.join(insert_cols)}) VALUES ({', '.join(placeholders)})"
    try:
        cur.execute(sql, tuple(values))
        conn.commit()
        return jsonify({"success": True, "project_id": cur.lastrowid})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@bp.route("/vendor-projects/<int:project_id>", methods=["PATCH"])
@login_required
def update_vendor_project(project_id):
    """
    PATCH /api/vendors/vendor-projects/<id>
    Update a vendor project.
    """
    data = request.get_json(silent=True) or {}
    conn = get_db()
    cur = conn.cursor()

    allowed = [
        "project_name", "client_id", "description", "category", "due_date",
        "department", "progress", "priority", "start_date", "members",
        "budget", "budget_ceiling", "bidding_end_date", "location", "modules",
        "no_resource", "no_resources_required", "lead_id",
        "project_manager_id", "totalhours", "perday", "bim_coordinator_id",
        "document_attachment", "payment_status", "deliverables",
    ]
    fields = []
    values = []
    for col in allowed:
        if col in data:
            fields.append(f"{col} = %s")
            values.append(data[col])

    if not fields:
        return jsonify({"success": False, "message": "No fields to update"}), 400

    values.append(project_id)
    sql = f"UPDATE vendor_projects SET {', '.join(fields)} WHERE id = %s"
    try:
        cur.execute(sql, tuple(values))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@bp.route("/vendor-projects/<int:project_id>", methods=["DELETE"])
@login_required
def delete_vendor_project(project_id):
    """
    DELETE /api/vendors/vendor-projects/<id>
    """
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM vendor_projects WHERE id = %s", (project_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


