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
      1. vendor_proposals (original table)
      2. td_proposals (TD-created proposals via bid acceptance flow)
    """
    email = getattr(g, "user_email", None)
    cur = vendor_cursor()

    vendor_id = None
    if email:
        cur.execute(
            "SELECT id FROM vendor_onboarding WHERE contact_email = %s OR email = %s LIMIT 1",
            (email, email),
        )
        row = cur.fetchone()
        if row:
            vendor_id = row["id"]

    if not vendor_id:
        return jsonify({"proposals": []})

    proposals = []
    # 1. Original vendor_proposals table
    try:
        cur.execute(
            """SELECT * FROM vendor_proposals WHERE vendor_id = %s ORDER BY created_at DESC""",
            (vendor_id,),
        )
        for r in cur.fetchall():
            p = {k: _serialize(v) for k, v in r.items()}
            p["source"] = "vendor_proposals"
            proposals.append(p)
    except Exception:
        pass

    # 2. TD-created proposals (td_proposals table)
    try:
        _ensure_td_proposals_table()
        cur.execute(
            """SELECT * FROM td_proposals WHERE vendor_onboarding_id = %s ORDER BY created_at DESC""",
            (vendor_id,),
        )
        for r in cur.fetchall():
            p = {k: _serialize(v) for k, v in r.items()}
            p["source"] = "td_proposals"
            # normalise field names to match existing Proposal type in frontend
            if "project_name" not in p or not p.get("project_name"):
                p["project_name"] = p.get("project_name") or ""
            proposals.append(p)
    except Exception:
        pass

    # Sort all proposals by created_at descending
    proposals.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return jsonify({"proposals": proposals})


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

    cur = vendor_cursor()
    try:
        cur.execute(
            "UPDATE vendor_proposals SET status = %s, reason = %s WHERE id = %s",
            (new_status, reason, proposal_id),
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    return jsonify({"success": True, "status": new_status})


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
                f"""SELECT id, full_name, email, phone_number, user_role
                   FROM employee WHERE id IN ({placeholders})""",
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
            LEFT JOIN employee e ON e.id = vb.vendor_id
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
            LEFT JOIN employee e ON e.id = vb.vendor_id
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

