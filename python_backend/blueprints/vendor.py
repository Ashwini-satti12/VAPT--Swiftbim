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
      - vendor_onbording        → main onboarding form data
      - vendor_portfolio        → portfolio / project entries (1-to-many)
      - vendor_resource_profile → resource profile entries  (1-to-many)

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
    Returns all vendors from vendor_onbording, optionally filtered by
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
