from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("workorder", __name__, url_prefix="/api/workorders")
def _current_vendor_match_names() -> list[str]:
    """
    Resolve all possible vendor names used in work_orders.vendor_name.
    Includes onboarding company_name and current vendor employee full_name.
    """
    try:
        names: list[str] = []
        company_id = getattr(g, "company_id", None)
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        if company_id:
            cur.execute(
                """
                SELECT company_name
                FROM new_swiftbim.vendor_onboarding
                WHERE id = %s
                LIMIT 1
                """,
                (company_id,),
            )
            row = cur.fetchone() or {}
            company_name = (row.get("company_name") or "").strip()
            if company_name:
                names.append(company_name)

        user_id = getattr(g, "user_id", None)
        if user_id:
            cur.execute(
                """
                SELECT full_name
                FROM vendor_employee
                WHERE id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone() or {}
            full_name = (row.get("full_name") or "").strip()
            if full_name:
                names.append(full_name)

        # De-duplicate (case-insensitive) while preserving order
        seen = set()
        unique = []
        for n in names:
            k = n.lower()
            if k and k not in seen:
                seen.add(k)
                unique.append(n)
        return unique
    except Exception:
        return []




_WO_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS work_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_id INT NULL,
    project_name VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_address TEXT NULL,
    po_date DATE NULL,
    po_number VARCHAR(255) NULL,
    project_location VARCHAR(255) NULL,
    work_description TEXT NULL,
    scope_of_work TEXT NULL,
    project_involves TEXT NULL,
    deliverables TEXT NULL,
    currency VARCHAR(10) DEFAULT 'AED',
    amount_aed DECIMAL(15,2) DEFAULT 0,
    duration TEXT NULL,
    terms_and_conditions TEXT NULL,
    payment_terms TEXT NULL,
    additional_terms TEXT NULL,
    exclusions TEXT NULL,
    status VARCHAR(50) DEFAULT 'Created',
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    Company_id INT NOT NULL
)
"""


def _ensure_work_order_table():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(_WO_TABLE_SQL)
    try:
        cur.execute("SHOW COLUMNS FROM work_orders LIKE 'exclusions'")
        if cur.fetchone() is None:
            cur.execute("ALTER TABLE work_orders ADD COLUMN exclusions TEXT NULL AFTER additional_terms")
    except Exception:
        pass
    conn.commit()


def _serialize_row(row: dict) -> dict:
    d = dict(row or {})
    for key in ("po_date", "created_at"):
        val = d.get(key)
        if val is not None and hasattr(val, "isoformat"):
            d[key] = val.isoformat()
    amount = d.get("amount_aed")
    if amount is not None:
        try:
            d["amount_aed"] = float(amount)
        except Exception:
            pass
    return d


@bp.route("", methods=["GET"])
@project_app_required
def list_work_orders():
    _ensure_work_order_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    user_type = (getattr(g, "user_type", "") or "").strip().lower()
    if user_type == "vendor":
        names = _current_vendor_match_names()
        if names:
            placeholders = ", ".join(["%s"] * len(names))
            cur.execute(
                f"""
                SELECT
                    wo.id, wo.proposal_id, wo.project_name, wo.vendor_name, wo.vendor_address, wo.po_date,
                    wo.po_number, wo.project_location, wo.work_description, wo.scope_of_work,
                    wo.project_involves, wo.deliverables,
                    COALESCE(NULLIF(TRIM(p.currency), ''), NULLIF(TRIM(wo.currency), ''), 'AED') AS currency,
                    wo.amount_aed, wo.duration,
                    wo.terms_and_conditions, wo.payment_terms, wo.additional_terms, wo.exclusions, wo.status, wo.created_at
                FROM work_orders wo
                LEFT JOIN projects p ON p.project_name = wo.project_name
                WHERE LOWER(TRIM(wo.vendor_name)) IN ({placeholders})
                ORDER BY id DESC
                """,
                tuple(n.lower() for n in names),
            )
        else:
            cur.execute(
                """
                SELECT
                    id, proposal_id, project_name, vendor_name, vendor_address, po_date,
                    po_number, project_location, work_description, scope_of_work,
                    project_involves, deliverables, currency, amount_aed, duration,
                    terms_and_conditions, payment_terms, additional_terms, exclusions, status, created_at
                FROM work_orders
                WHERE 1 = 0
                """
            )
    else:
        cur.execute(
            """
            SELECT
                wo.id, wo.proposal_id, wo.project_name, wo.vendor_name, wo.vendor_address, wo.po_date,
                wo.po_number, wo.project_location, wo.work_description, wo.scope_of_work,
                wo.project_involves, wo.deliverables,
                COALESCE(NULLIF(TRIM(p.currency), ''), NULLIF(TRIM(wo.currency), ''), 'AED') AS currency,
                wo.amount_aed, wo.duration,
                wo.terms_and_conditions, wo.payment_terms, wo.additional_terms, wo.exclusions, wo.status, wo.created_at
            FROM work_orders wo
            LEFT JOIN projects p ON p.project_name = wo.project_name
            WHERE wo.Company_id = %s
            ORDER BY id DESC
            """,
            (g.company_id,),
        )
    rows = cur.fetchall() or []
    return jsonify({"success": True, "work_orders": [_serialize_row(r) for r in rows]})


@bp.route("/<int:work_order_id>", methods=["GET"])
@project_app_required
def get_work_order(work_order_id: int):
    _ensure_work_order_table()
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    user_type = (getattr(g, "user_type", "") or "").strip().lower()
    if user_type == "vendor":
        names = _current_vendor_match_names()
        if names:
            placeholders = ", ".join(["%s"] * len(names))
            cur.execute(
                f"""
                SELECT
                    wo.id, wo.proposal_id, wo.project_name, wo.vendor_name, wo.vendor_address, wo.po_date,
                    wo.po_number, wo.project_location, wo.work_description, wo.scope_of_work,
                    wo.project_involves, wo.deliverables,
                    COALESCE(NULLIF(TRIM(p.currency), ''), NULLIF(TRIM(wo.currency), ''), 'AED') AS currency,
                    wo.amount_aed, wo.duration,
                    wo.terms_and_conditions, wo.payment_terms, wo.additional_terms, wo.exclusions, wo.status, wo.created_at
                FROM work_orders wo
                LEFT JOIN projects p ON p.project_name = wo.project_name
                WHERE wo.id = %s AND LOWER(TRIM(wo.vendor_name)) IN ({placeholders})
                LIMIT 1
                """,
                (work_order_id, *tuple(n.lower() for n in names)),
            )
        else:
            cur.execute(
                """
                SELECT
                    id, proposal_id, project_name, vendor_name, vendor_address, po_date,
                    po_number, project_location, work_description, scope_of_work,
                    project_involves, deliverables, currency, amount_aed, duration,
                    terms_and_conditions, payment_terms, additional_terms, exclusions, status, created_at
                FROM work_orders
                WHERE 1 = 0
                """
            )
    else:
        cur.execute(
            """
            SELECT
                wo.id, wo.proposal_id, wo.project_name, wo.vendor_name, wo.vendor_address, wo.po_date,
                wo.po_number, wo.project_location, wo.work_description, wo.scope_of_work,
                wo.project_involves, wo.deliverables,
                COALESCE(NULLIF(TRIM(p.currency), ''), NULLIF(TRIM(wo.currency), ''), 'AED') AS currency,
                wo.amount_aed, wo.duration,
                wo.terms_and_conditions, wo.payment_terms, wo.additional_terms, wo.exclusions, wo.status, wo.created_at
            FROM work_orders wo
            LEFT JOIN projects p ON p.project_name = wo.project_name
            WHERE wo.id = %s AND wo.Company_id = %s
            LIMIT 1
            """,
            (work_order_id, g.company_id),
        )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Work order not found"}), 404
    return jsonify({"success": True, "work_order": _serialize_row(row)})


@bp.route("/vendor-address", methods=["GET"])
@project_app_required
def get_vendor_address_by_name():
    vendor_name = (request.args.get("vendor_name") or "").strip()
    if not vendor_name:
        return jsonify({"success": False, "message": "vendor_name is required"}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)

    # Prefer exact company_name first, then fallback to partial match.
    cur.execute(
        """
        SELECT company_name, country, state, city, address
        FROM new_swiftbim.vendor_onboarding
        WHERE TRIM(company_name) = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (vendor_name,),
    )
    row = cur.fetchone()
    if not row:
        cur.execute(
            """
            SELECT company_name, country, state, city, address
            FROM new_swiftbim.vendor_onboarding
            WHERE company_name LIKE %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (f"%{vendor_name}%",),
        )
        row = cur.fetchone()

    if not row:
        return jsonify({"success": True, "vendor_name": vendor_name, "address": ""})

    address_parts = []
    for key in ("country", "state", "city", "address"):
        value = (row.get(key) or "").strip()
        if value:
            address_parts.append(value)
    combined_address = ", ".join(address_parts)

    return jsonify(
        {
            "success": True,
            "vendor_name": row.get("company_name") or vendor_name,
            "address": combined_address,
        }
    )


@bp.route("", methods=["POST"])
@project_app_required
def create_work_order():
    _ensure_work_order_table()
    data = request.get_json(silent=True) or request.form

    project_name = (data.get("projectName") or data.get("project_name") or "").strip()
    vendor_name = (data.get("vendorName") or data.get("vendor_name") or "").strip()
    if not project_name or not vendor_name:
        return jsonify({"success": False, "message": "projectName and vendorName are required"}), 400

    amount_raw = data.get("amountAED")
    if amount_raw is None:
        amount_raw = data.get("amount_aed")
    try:
        amount_aed = float(amount_raw or 0)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "amountAED must be a valid number"}), 400

    payload = {
        "proposal_id": data.get("proposalId") or data.get("proposal_id"),
        "project_name": project_name,
        "vendor_name": vendor_name,
        "vendor_address": (data.get("vendorAddress") or data.get("vendor_address") or "").strip(),
        "po_date": data.get("poDate") or data.get("po_date") or None,
        "po_number": (data.get("poNumber") or data.get("po_number") or "").strip(),
        "project_location": (data.get("projectLocation") or data.get("project_location") or "").strip(),
        "work_description": (data.get("workDescription") or data.get("work_description") or "").strip(),
        "scope_of_work": (data.get("scopeOfWork") or data.get("scope_of_work") or "").strip(),
        "project_involves": (data.get("projectInvolves") or data.get("project_involves") or "").strip(),
        "deliverables": (data.get("deliverables") or "").strip(),
        "currency": (data.get("currency") or "AED").strip().upper() or "AED",
        "amount_aed": amount_aed,
        "duration": (data.get("duration") or "").strip(),
        "terms_and_conditions": (data.get("termsAndConditions") or data.get("terms_and_conditions") or "").strip(),
        "payment_terms": (data.get("paymentTerms") or data.get("payment_terms") or "").strip(),
        "additional_terms": (data.get("additionalTerms") or data.get("additional_terms") or "").strip(),
        "status": (data.get("status") or "Created").strip() or "Created",
        "created_by": getattr(g, "user_id", None),
        "company_id": g.company_id,
    }

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        INSERT INTO work_orders (
            proposal_id, project_name, vendor_name, vendor_address, po_date, po_number,
            project_location, work_description, scope_of_work, project_involves,
            deliverables, currency, amount_aed, duration, terms_and_conditions, payment_terms,
            additional_terms, exclusions, status, created_by, Company_id
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s
        )
        """,
        (
            payload["proposal_id"],
            payload["project_name"],
            payload["vendor_name"],
            payload["vendor_address"],
            payload["po_date"],
            payload["po_number"],
            payload["project_location"],
            payload["work_description"],
            payload["scope_of_work"],
            payload["project_involves"],
            payload["deliverables"],
            payload["currency"],
            payload["amount_aed"],
            payload["duration"],
            payload["terms_and_conditions"],
            payload["payment_terms"],
            payload["additional_terms"],
            payload["exclusions"],
            payload["status"],
            payload["created_by"],
            payload["company_id"],
        ),
    )
    conn.commit()
    return jsonify({"success": True, "id": cur.lastrowid})


@bp.route("/<int:work_order_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_work_order(work_order_id: int):
    _ensure_work_order_table()
    data = request.get_json(silent=True) or request.form

    project_name = (data.get("projectName") or data.get("project_name") or "").strip()
    vendor_name = (data.get("vendorName") or data.get("vendor_name") or "").strip()
    if not project_name or not vendor_name:
        return jsonify({"success": False, "message": "projectName and vendorName are required"}), 400

    amount_raw = data.get("amountAED")
    if amount_raw is None:
        amount_raw = data.get("amount_aed")
    try:
        amount_aed = float(amount_raw or 0)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "amountAED must be a valid number"}), 400

    payload = {
        "proposal_id": data.get("proposalId") or data.get("proposal_id"),
        "project_name": project_name,
        "vendor_name": vendor_name,
        "vendor_address": (data.get("vendorAddress") or data.get("vendor_address") or "").strip(),
        "po_date": data.get("poDate") or data.get("po_date") or None,
        "po_number": (data.get("poNumber") or data.get("po_number") or "").strip(),
        "project_location": (data.get("projectLocation") or data.get("project_location") or "").strip(),
        "work_description": (data.get("workDescription") or data.get("work_description") or "").strip(),
        "scope_of_work": (data.get("scopeOfWork") or data.get("scope_of_work") or "").strip(),
        "project_involves": (data.get("projectInvolves") or data.get("project_involves") or "").strip(),
        "deliverables": (data.get("deliverables") or "").strip(),
        "currency": (data.get("currency") or "AED").strip().upper() or "AED",
        "amount_aed": amount_aed,
        "duration": (data.get("duration") or "").strip(),
        "terms_and_conditions": (data.get("termsAndConditions") or data.get("terms_and_conditions") or "").strip(),
        "payment_terms": (data.get("paymentTerms") or data.get("payment_terms") or "").strip(),
        "additional_terms": (data.get("additionalTerms") or data.get("additional_terms") or "").strip(),
        "status": (data.get("status") or "").strip(),
    }

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    user_type = (getattr(g, "user_type", "") or "").strip().lower()
    if user_type == "vendor":
        names = _current_vendor_match_names()
        if names:
            placeholders = ", ".join(["%s"] * len(names))
            cur.execute(
                f"""
                UPDATE work_orders
                SET status = COALESCE(NULLIF(%s, ''), status)
                WHERE id = %s AND LOWER(TRIM(vendor_name)) IN ({placeholders})
                """,
                (
                    payload["status"],
                    work_order_id,
                    *tuple(n.lower() for n in names),
                ),
            )
        else:
            cur.execute("SELECT 1 WHERE 1 = 0")
    else:
        cur.execute(
            """
            UPDATE work_orders
            SET
                proposal_id = %s,
                project_name = %s,
                vendor_name = %s,
                vendor_address = %s,
                po_date = %s,
                po_number = %s,
                project_location = %s,
                work_description = %s,
                scope_of_work = %s,
                project_involves = %s,
                deliverables = %s,
                currency = %s,
                amount_aed = %s,
                duration = %s,
                terms_and_conditions = %s,
                payment_terms = %s,
                additional_terms = %s,
                exclusions = %s,
                status = COALESCE(NULLIF(%s, ''), status)
            WHERE id = %s AND Company_id = %s
            """,
            (
                payload["proposal_id"],
                payload["project_name"],
                payload["vendor_name"],
                payload["vendor_address"],
                payload["po_date"],
                payload["po_number"],
                payload["project_location"],
                payload["work_description"],
                payload["scope_of_work"],
                payload["project_involves"],
                payload["deliverables"],
                payload["currency"],
                payload["amount_aed"],
                payload["duration"],
                payload["terms_and_conditions"],
                payload["payment_terms"],
                payload["additional_terms"],
                payload["exclusions"],
                payload["status"],
                work_order_id,
                g.company_id,
            ),
        )
    conn.commit()
    if cur.rowcount == 0:
        return jsonify({"success": False, "message": "Work order not found"}), 404
    return jsonify({"success": True, "id": work_order_id})
