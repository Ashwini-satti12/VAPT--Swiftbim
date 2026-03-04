import mysql.connector as mysql_connector
from flask import Blueprint, request, jsonify, g, current_app
from auth_middleware import login_required

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
        # Ensure tables exist
        cur.execute("""CREATE TABLE IF NOT EXISTS vendor_bidding (
            id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL,
            project_name VARCHAR(255) NOT NULL, description TEXT,
            outsource_budget DECIMAL(15,2), budget_ceiling DECIMAL(15,2),
            bid_deadline DATE, status ENUM('active','closed') DEFAULT 'active',
            company_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_project (project_id))"""
        )
        cur.execute("""CREATE TABLE IF NOT EXISTS vendor_bids (
            id INT AUTO_INCREMENT PRIMARY KEY, opportunity_id INT NOT NULL,
            vendor_id INT NOT NULL, bid_amount DECIMAL(15,2), notes TEXT,
            timeline VARCHAR(255), team_size INT DEFAULT 0,
            status ENUM('submitted','shortlisted','won','lost') DEFAULT 'submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_vendor_opportunity (vendor_id, opportunity_id))"""
        )
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM vendor_bidding WHERE status = 'active'"
        )
        r = cur.fetchone()
        active_opportunities = r["cnt"] if r else 0
    except Exception:
        active_opportunities = 0

    if vendor_id:
        try:
            cur.execute(
                "SELECT COUNT(*) AS cnt FROM vendor_bids WHERE vendor_id = %s",
                (vendor_id,),
            )
            r = cur.fetchone()
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
    cur = vendor_cursor()
    vendor_id = getattr(g, "user_id", None)

    try:
        # Ensure table exists
        cur.execute("""CREATE TABLE IF NOT EXISTS vendor_bidding (
            id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL,
            project_name VARCHAR(255) NOT NULL, description TEXT,
            outsource_budget DECIMAL(15,2), budget_ceiling DECIMAL(15,2),
            bid_deadline DATE, status ENUM('active','closed') DEFAULT 'active',
            company_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_project (project_id))"""
        )
        cur.execute("""CREATE TABLE IF NOT EXISTS vendor_bids (
            id INT AUTO_INCREMENT PRIMARY KEY, opportunity_id INT NOT NULL,
            vendor_id INT NOT NULL, bid_amount DECIMAL(15,2), notes TEXT,
            timeline VARCHAR(255), team_size INT DEFAULT 0,
            status ENUM('submitted','shortlisted','won','lost') DEFAULT 'submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_vendor_opportunity (vendor_id, opportunity_id))"""
        )
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

    cur = vendor_cursor()

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

    cur = vendor_cursor()

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
    Returns proposals sent to the current vendor from Technical Director.
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

    try:
        cur.execute(
            """SELECT * FROM vendor_proposals WHERE vendor_id = %s ORDER BY created_at DESC""",
            (vendor_id,),
        )
        rows = cur.fetchall()
        proposals = [{k: _serialize(v) for k, v in r.items()} for r in rows]
    except Exception:
        proposals = []

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
    Returns all bidding entries for the Technical Director view.
    """
    cur = vendor_cursor()
    try:
        cur.execute(
            "SELECT * FROM vendor_bidding ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        bidding = [{k: _serialize(v) for k, v in r.items()} for r in rows]
    except Exception:
        bidding = []
    return jsonify({"bidding": bidding})


@bp.route("/bidding/<int:bidding_id>/bids", methods=["GET"])
@login_required
def bidding_bids(bidding_id):
    """
    GET /api/vendors/bidding/<id>/bids
    Returns all bids placed on a specific bidding opportunity (TD view).
    Auto-ranks by lowest bid amount; top 4 are highlighted.
    """
    cur = vendor_cursor()
    try:
        cur.execute(
            """SELECT vb.*, vo.company_name, vo.contact_name, vo.contact_email,
                      vo.technical_team_size, vo.sectors, vo.service_categories
               FROM vendor_bids vb
               JOIN vendor_onboarding vo ON vo.id = vb.vendor_id
               WHERE vb.opportunity_id = %s
               ORDER BY vb.bid_amount ASC""",
            (bidding_id,),
        )
        rows = cur.fetchall()
        bids = []
        for i, r in enumerate(rows):
            entry = {k: _serialize(v) for k, v in r.items()}
            entry["rank"] = i + 1
            entry["is_top4"] = i < 4
            bids.append(entry)
    except Exception:
        bids = []
    return jsonify({"bids": bids})
