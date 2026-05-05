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
    vendor_display_name VARCHAR(255) NULL,
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
    company_sign_name VARCHAR(255) NULL,
    company_sign_designation VARCHAR(255) NULL,
    company_sign_date DATE NULL,
    company_signature LONGTEXT NULL,
    vendor_sign_name VARCHAR(255) NULL,
    vendor_sign_designation VARCHAR(255) NULL,
    vendor_sign_date DATE NULL,
    vendor_signature LONGTEXT NULL,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    Company_id INT NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
"""


def _ensure_work_order_table():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(_WO_TABLE_SQL)
    try:
        # Convert existing table and its columns to a consistent collation
        cur.execute("ALTER TABLE work_orders CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci")
    except Exception:
        pass
    try:
        cur.execute("SHOW COLUMNS FROM work_orders LIKE 'deliverables'")
        if cur.fetchone() is None:
            cur.execute("ALTER TABLE work_orders ADD COLUMN deliverables TEXT NULL AFTER project_involves")
    except Exception:
        pass

    try:
        cur.execute("SHOW COLUMNS FROM work_orders LIKE 'exclusions'")
        if cur.fetchone() is None:
            cur.execute("ALTER TABLE work_orders ADD COLUMN exclusions TEXT NULL AFTER additional_terms")
    except Exception:
        pass
    
    # Add signature columns if missing
    sig_cols = [
        ("company_sign_name", "VARCHAR(255) NULL"),
        ("company_sign_designation", "VARCHAR(255) NULL"),
        ("company_sign_date", "DATE NULL"),
        ("company_signature", "LONGTEXT NULL"),
        ("vendor_sign_name", "VARCHAR(255) NULL"),
        ("vendor_sign_designation", "VARCHAR(255) NULL"),
        ("vendor_sign_date", "DATE NULL"),
        ("vendor_signature", "LONGTEXT NULL"),
    ]
    for col_name, col_def in sig_cols:
        try:
            cur.execute(f"SHOW COLUMNS FROM work_orders LIKE '{col_name}'")
            if cur.fetchone() is None:
                cur.execute(f"ALTER TABLE work_orders ADD COLUMN {col_name} {col_def} AFTER status")
        except Exception:
            pass

    conn.commit()


def _serialize_row(row: dict) -> dict:
    d = dict(row or {})
    for key in ("po_date", "created_at", "company_sign_date", "vendor_sign_date"):
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
                    wo.terms_and_conditions, wo.payment_terms, wo.additional_terms, wo.exclusions, wo.status,
                    wo.company_sign_name, wo.company_sign_designation, wo.company_sign_date, wo.company_signature,
                    wo.vendor_sign_name, wo.vendor_sign_designation, wo.vendor_sign_date, wo.vendor_signature,
                    wo.created_at
                FROM work_orders wo
                LEFT JOIN projects p ON p.project_name COLLATE utf8mb4_general_ci = wo.project_name COLLATE utf8mb4_general_ci
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
                    terms_and_conditions, payment_terms, additional_terms, exclusions, status,
                    company_sign_name, company_sign_designation, company_sign_date, company_signature,
                    vendor_sign_name, vendor_sign_designation, vendor_sign_date, vendor_signature,
                    created_at
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
                wo.terms_and_conditions, wo.payment_terms, wo.additional_terms, wo.exclusions, wo.status,
                wo.company_sign_name, wo.company_sign_designation, wo.company_sign_date, wo.company_signature,
                wo.vendor_sign_name, wo.vendor_sign_designation, wo.vendor_sign_date, wo.vendor_signature,
                wo.created_at
            FROM work_orders wo
            LEFT JOIN projects p ON p.project_name COLLATE utf8mb4_general_ci = wo.project_name COLLATE utf8mb4_general_ci
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
                    wo.terms_and_conditions, wo.payment_terms, wo.additional_terms, wo.exclusions, wo.status,
                    wo.company_sign_name, wo.company_sign_designation, wo.company_sign_date, wo.company_signature,
                    wo.vendor_sign_name, wo.vendor_sign_designation, wo.vendor_sign_date, wo.vendor_signature,
                    wo.created_at
                FROM work_orders wo
                LEFT JOIN projects p ON p.project_name COLLATE utf8mb4_general_ci = wo.project_name COLLATE utf8mb4_general_ci
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
                    terms_and_conditions, payment_terms, additional_terms, exclusions, status,
                    company_sign_name, company_sign_designation, company_sign_date, company_signature,
                    vendor_sign_name, vendor_sign_designation, vendor_sign_date, vendor_signature,
                    created_at
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
                wo.terms_and_conditions, wo.payment_terms, wo.additional_terms, wo.exclusions, wo.status,
                wo.company_sign_name, wo.company_sign_designation, wo.company_sign_date, wo.company_signature,
                wo.vendor_sign_name, wo.vendor_sign_designation, wo.vendor_sign_date, wo.vendor_signature,
                wo.created_at
            FROM work_orders wo
            LEFT JOIN projects p ON p.project_name COLLATE utf8mb4_general_ci = wo.project_name COLLATE utf8mb4_general_ci
            WHERE wo.id = %s AND wo.Company_id = %s
            LIMIT 1
            """,
            (work_order_id, g.company_id),
        )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Work order not found"}), 404
    return jsonify({"success": True, "work_order": _serialize_row(row)})


@bp.route("/latest-template", methods=["GET"])
@project_app_required
def get_latest_work_order_template():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT 
            work_description, scope_of_work, project_involves, deliverables, 
            duration, terms_and_conditions, payment_terms, additional_terms, exclusions
        FROM work_orders
        WHERE Company_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (g.company_id,),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": True, "template": None})
    return jsonify({"success": True, "template": row})


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
        "vendor_display_name": (data.get("vendorDisplayName") or data.get("vendor_display_name") or "").strip(),
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
        "exclusions": (data.get("exclusions") or "").strip(),
        "status": (data.get("status") or "Created").strip() or "Created",
        "company_sign_name": (data.get("company_sign_name") or data.get("companySignName") or "").strip(),
        "company_sign_designation": (data.get("company_sign_designation") or data.get("companySignDesignation") or "").strip(),
        "company_sign_date": data.get("company_sign_date") or data.get("companySignDate") or None,
        "company_signature": data.get("company_signature") or data.get("companySignature") or None,
        "vendor_sign_name": (data.get("vendor_sign_name") or data.get("vendorSignName") or "").strip(),
        "vendor_sign_designation": (data.get("vendor_sign_designation") or data.get("vendorSignDesignation") or "").strip(),
        "vendor_sign_date": data.get("vendor_sign_date") or data.get("vendorSignDate") or None,
        "vendor_signature": data.get("vendor_signature") or data.get("vendorSignature") or None,
        "created_by": getattr(g, "user_id", None),
        "company_id": g.company_id,
    }

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        INSERT INTO work_orders (
            proposal_id, project_name, vendor_name, vendor_display_name, vendor_address, po_date, po_number,
            project_location, work_description, scope_of_work, project_involves,
            deliverables, currency, amount_aed, duration, terms_and_conditions, payment_terms,
            additional_terms, exclusions, status, 
            company_sign_name, company_sign_designation, company_sign_date, company_signature,
            vendor_sign_name, vendor_sign_designation, vendor_sign_date, vendor_signature,
            created_by, Company_id
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s
        )
        """,
        (
            payload["proposal_id"],
            payload["project_name"],
            payload["vendor_name"],
            payload["vendor_display_name"],
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
            payload["company_sign_name"],
            payload["company_sign_designation"],
            payload["company_sign_date"],
            payload["company_signature"],
            payload["vendor_sign_name"],
            payload["vendor_sign_designation"],
            payload["vendor_sign_date"],
            payload["vendor_signature"],
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
        "vendor_display_name": (data.get("vendorDisplayName") or data.get("vendor_display_name") or "").strip(),
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
        "exclusions": (data.get("exclusions") or "").strip(),
        "status": (data.get("status") or "").strip(),
        "company_sign_name": (data.get("company_sign_name") or data.get("companySignName") or "").strip(),
        "company_sign_designation": (data.get("company_sign_designation") or data.get("companySignDesignation") or "").strip(),
        "company_sign_date": data.get("company_sign_date") or data.get("companySignDate") or None,
        "company_signature": data.get("company_signature") or data.get("companySignature") or None,
        "vendor_sign_name": (data.get("vendor_sign_name") or data.get("vendorSignName") or "").strip(),
        "vendor_sign_designation": (data.get("vendor_sign_designation") or data.get("vendorSignDesignation") or "").strip(),
        "vendor_sign_date": data.get("vendor_sign_date") or data.get("vendorSignDate") or None,
        "vendor_signature": data.get("vendor_signature") or data.get("vendorSignature") or None,
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
                vendor_display_name = %s,
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
                status = COALESCE(NULLIF(%s, ''), status),
                company_sign_name = %s,
                company_sign_designation = %s,
                company_sign_date = %s,
                company_signature = %s,
                vendor_sign_name = %s,
                vendor_sign_designation = %s,
                vendor_sign_date = %s,
                vendor_signature = %s
            WHERE id = %s AND Company_id = %s
            """,
            (
                payload["proposal_id"],
                payload["project_name"],
                payload["vendor_name"],
                payload["vendor_display_name"],
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
                payload["company_sign_name"],
                payload["company_sign_designation"],
                payload["company_sign_date"],
                payload["company_signature"],
                payload["vendor_sign_name"],
                payload["vendor_sign_designation"],
                payload["vendor_sign_date"],
                payload["vendor_signature"],
                work_order_id,
                g.company_id,
            ),
        )
    conn.commit()
    
    # On Acceptance -> Create Vendor Project if not exists
    if payload.get("status") == "Accepted":
        try:
            # Re-fetch or use existing data to ensure we have current state
            cur.execute("SELECT * FROM work_orders WHERE id = %s", (work_order_id,))
            wo = cur.fetchone()
            if wo:
                proposal_id = wo.get("proposal_id")
                # Check if a vendor project already exists for this work order or proposal
                cur.execute("SELECT id FROM vendor_projects WHERE proposal_id = %s OR project_name = %s LIMIT 1", (proposal_id, wo["project_name"]))
                existing_vp = cur.fetchone()
                if not existing_vp:
                    vendor_id = None
                    opportunity_id = None
                    main_project_id = None
                    
                    if proposal_id:
                        cur.execute("SELECT vendor_id, opportunity_id FROM new_swiftbim.proposals WHERE id = %s", (proposal_id,))
                        prop = cur.fetchone()
                        if prop:
                            vendor_id = prop.get("vendor_id")
                            opportunity_id = prop.get("opportunity_id")
                    
                    if not vendor_id:
                        # Fallback: find vendor_id by name
                        cur.execute("SELECT id FROM new_swiftbim.vendor_onboarding WHERE company_name = %s LIMIT 1", (wo["vendor_name"],))
                        v_onb = cur.fetchone()
                        if v_onb:
                            vendor_id = v_onb["id"]
                    
                    if opportunity_id:
                        cur.execute("SELECT project_id FROM snh6_swiftproject.vendor_bidding WHERE id = %s", (opportunity_id,))
                        vb = cur.fetchone()
                        if vb:
                            main_project_id = vb.get("project_id")
                    
                    # Insert into vendor_projects
                    # Note: Using snh6_swiftproject.vendor_projects safely by relying on current connection's DB
                    cur.execute("""
                        INSERT INTO vendor_projects (
                            main_project_id, proposal_id, opportunity_id, vendor_id,
                            project_name, description, deliverables, location,
                            budget, Company_id
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        main_project_id, proposal_id, opportunity_id, vendor_id,
                        wo["project_name"], wo["work_description"], wo["deliverables"],
                        wo["project_location"], wo["amount_aed"], wo["Company_id"]
                    ))
                    conn.commit()
        except Exception as e:
            # We don't want to fail the whole update if auto-project creation fails,
            # but we should log it.
            print(f"Error auto-creating vendor project from work order {work_order_id}: {e}")

    if cur.rowcount == 0 and payload.get("status") != "Accepted":
        # Note: if it was Accepted, we might have successfully run the logic above even if rowcount was 0
        # (e.g. if status was already Accepted). But usually rowcount 1 on success.
        return jsonify({"success": False, "message": "Work order not found"}), 404
    return jsonify({"success": True, "id": work_order_id})
