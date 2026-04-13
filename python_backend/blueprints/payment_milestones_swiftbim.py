"""
Read-only payment milestones from new_swiftbim (contract / proposal terms).

Does not modify the legacy snh6 `payment_milestones` + `/api/milestones` workflow.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

import mysql.connector as mysql_connector
from flask import Blueprint, current_app, g, jsonify, request

from auth_middleware import project_app_required
from db import get_db

bp = Blueprint(
    "payment_milestones_swiftbim",
    __name__,
    url_prefix="/api/payment-milestones/new-swiftbim",
)


def _vendor_conn():
    return mysql_connector.connect(
        host=current_app.config["MYSQL_HOST"],
        user=current_app.config["MYSQL_USER"],
        password=current_app.config["MYSQL_PASSWORD"],
        database="new_swiftbim",
        port=current_app.config.get("MYSQL_PORT", 3306),
        autocommit=True,
    )


def _as_int(v):
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _serialize(v):
    if v is None:
        return None
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    return v


def _parse_terms_percentage(terms_val):
    if terms_val is None:
        return None
    s = str(terms_val).strip().replace("%", "").strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _resolve_contract_proposal(vcur, client_id: int | None, project_name: str):
    """Match projects.py phase-1 chain: client_id -> contract -> proposal."""
    con, prop = {}, {}
    if client_id is not None:
        try:
            vcur.execute(
                "SELECT * FROM contracts WHERE client_id = %s ORDER BY id DESC LIMIT 1",
                (client_id,),
            )
            con = vcur.fetchone() or {}
        except Exception:
            con = {}
        pid = _as_int(con.get("proposal_id"))
        if pid is not None:
            try:
                vcur.execute(
                    "SELECT * FROM proposals WHERE id = %s LIMIT 1",
                    (pid,),
                )
                prop = vcur.fetchone() or {}
            except Exception:
                prop = {}

    if not prop and client_id is not None:
        try:
            vcur.execute(
                "SELECT email FROM users WHERE id = %s LIMIT 1",
                (client_id,),
            )
            u = vcur.fetchone() or {}
            email = (u.get("email") or "").strip()
            if email:
                vcur.execute(
                    "SELECT * FROM proposals WHERE email_address = %s ORDER BY id DESC LIMIT 1",
                    (email,),
                )
                prop = vcur.fetchone() or {}
        except Exception:
            pass

    if not con and project_name:
        for table in ("contracts", "proposals"):
            try:
                vcur.execute(
                    f"""
                    SELECT * FROM {table}
                    WHERE project_name = %s OR title = %s OR `name` = %s
                    ORDER BY id DESC LIMIT 1
                    """,
                    (project_name, project_name, project_name),
                )
                row = vcur.fetchone()
                if row:
                    if table == "contracts":
                        con = row
                    else:
                        prop = row
                    break
            except Exception:
                continue

    cid = _as_int(con.get("id")) if con else None
    pid = _as_int(prop.get("id")) if prop else None
    if cid is None and con:
        cid = _as_int(con.get("contract_id"))
    if pid is None and prop:
        pid = _as_int(prop.get("proposal_id"))
    return cid, pid


def _format_display_date(val) -> str:
    if not val:
        return "—"
    if isinstance(val, datetime):
        d = val.date() if hasattr(val, "date") else val
        return d.isoformat() if hasattr(d, "isoformat") else str(val)
    if isinstance(val, date):
        return val.isoformat()
    s = str(val).strip()
    if not s:
        return "—"
    if "T" in s:
        return s.split("T")[0]
    return s[:10] if len(s) >= 10 else s


def _build_td_invoice_view(
    inv: dict,
    milestone_title: str | None,
    payments: list[dict],
    project_name: str,
    client: dict | None,
) -> dict:
    """Shape response for Technical Director invoice detail page (phase-1)."""
    total = float(inv.get("invoice_total") or 0)
    gst = 18.0
    if total > 0 and gst:
        subtotal = round(total / (1.0 + gst / 100.0), 2)
        tax_amount = round(total - subtotal, 2)
    else:
        subtotal = 0.0
        tax_amount = 0.0
    st = (inv.get("status") or "").strip().lower()
    status_paid = st in ("paid", "completed", "settled")
    status_pending = not status_paid and bool(st)

    client = client or {}
    client_name = (client.get("client_full_name") or "").strip() or "—"
    cr = inv.get("created_at")

    return {
        "id": inv.get("id"),
        "invoice_number": str(inv.get("invoice_number") or "").strip() or "—",
        "date_str": _format_display_date(cr),
        "due_str": "—",
        "client_name": client_name,
        "company_name": client_name if client_name != "—" else "",
        "email": (client.get("client_email") or "").strip(),
        "phone": (client.get("client_phone") or "").strip(),
        "address": (client.get("client_address") or "").strip(),
        "project_name": project_name or "",
        "project_id": None,
        "milestone_name": (milestone_title or "").strip(),
        "line_description": (
            f"{(milestone_title or 'Milestone').strip()} — professional / BIM services"
            if (milestone_title or "").strip()
            else "Professional / BIM services"
        ),
        "qty": 1,
        "unit_price": total,
        "line_amount": total,
        "subtotal": subtotal,
        "tax_amount": tax_amount,
        "total_amount": total,
        "gst_percent": gst,
        "payment_method_label": "UPI, Bank transfer, NEFT/RTGS (as per contract)",
        "upi_id": "",
        "bank_name": "",
        "account_no": "",
        "ifsc": "",
        "status_pending": status_pending,
        "status_paid": status_paid,
        "note_due_days": "30",
        "status": inv.get("status") or "",
        "side": inv.get("side") or "client",
        "contract_id": inv.get("contract_id"),
        "proposal_id": inv.get("proposal_id"),
        "milestone_id": inv.get("milestone_id"),
        "created_at": _serialize(inv.get("created_at")),
        "payments": payments,
    }


def _table_exists(vcur, table: str) -> bool:
    try:
        vcur.execute(
            """
            SELECT 1 FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = 'new_swiftbim' AND TABLE_NAME = %s
            LIMIT 1
            """,
            (table,),
        )
        return vcur.fetchone() is not None
    except Exception:
        return False


@bp.route("", methods=["GET"])
@project_app_required
def list_swiftbim_payment_milestones():
    """
    Query params:
      project_id (required) — internal snh6 project id
      side (optional) — default `client` for phase-1 in-house display
    """
    project_id = request.args.get("project_id")
    if not project_id:
        return jsonify({"success": False, "message": "project_id required"}), 400

    side = (request.args.get("side") or "client").strip().lower()
    if side not in ("client", "vendor", "all"):
        side = "client"

    main = get_db()
    mcur = main.cursor()
    mcur.execute(
        "SELECT id, client_id, project_name, department FROM projects WHERE id = %s AND Company_id = %s LIMIT 1",
        (project_id, g.company_id),
    )
    proj = mcur.fetchone()
    if not proj:
        return jsonify({"success": False, "message": "Project not found"}), 404

    proj = dict(proj) if not isinstance(proj, dict) else proj
    client_id = _as_int(proj.get("client_id"))
    project_name = (proj.get("project_name") or "").strip()

    vendor_conn = _vendor_conn()
    try:
        vcur = vendor_conn.cursor(dictionary=True)
        if not _table_exists(vcur, "payment_milestones"):
            return jsonify(
                {
                    "success": True,
                    "milestones": [],
                    "read_only": True,
                    "source": "new_swiftbim",
                    "message": "payment_milestones not present in new_swiftbim",
                }
            )

        contract_id, proposal_id = _resolve_contract_proposal(
            vcur, client_id, project_name
        )
        if contract_id is None and proposal_id is None:
            return jsonify(
                {
                    "success": True,
                    "milestones": [],
                    "read_only": True,
                    "source": "new_swiftbim",
                    "contract_id": None,
                    "proposal_id": None,
                }
            )

        side_sql = ""
        params: list = []
        if side == "all":
            side_sql = "1=1"
        else:
            side_sql = "LOWER(COALESCE(pm.side, 'client')) = %s"
            params.append(side)

        params.extend([contract_id, contract_id, proposal_id, proposal_id])

        has_invoices = _table_exists(vcur, "invoices")
        pm_cols = """
            pm.id, pm.contract_id, pm.proposal_id, pm.side, pm.title, pm.terms, pm.timeline,
            pm.amount, pm.sequence_no, pm.status, pm.created_at, pm.updated_at
        """
        if has_invoices:
            inv_join = """
                LEFT JOIN invoices inv ON inv.id = (
                    SELECT i2.id FROM invoices i2
                    WHERE i2.milestone_id = pm.id
                    ORDER BY i2.id DESC
                    LIMIT 1
                )
            """
            select_extra = """,
                inv.invoice_number AS inv_invoice_number,
                inv.id AS inv_invoice_id,
                inv.invoice_total AS inv_invoice_total,
                inv.status AS inv_invoice_status"""
        else:
            inv_join = ""
            select_extra = ""

        sql = f"""
            SELECT {pm_cols.strip()}{select_extra}
            FROM payment_milestones pm
            {inv_join}
            WHERE ({side_sql})
              AND (
                (%s IS NOT NULL AND pm.contract_id = %s)
                OR (%s IS NOT NULL AND pm.proposal_id = %s)
              )
            ORDER BY pm.sequence_no ASC, pm.id ASC
        """

        vcur.execute(sql, tuple(params))
        rows = vcur.fetchall() or []
    except Exception as exc:
        return jsonify(
            {
                "success": False,
                "message": str(exc),
                "milestones": [],
                "read_only": True,
                "source": "new_swiftbim",
            }
        ), 500
    finally:
        try:
            vendor_conn.close()
        except Exception:
            pass

    milestones = []
    for r in rows:
        raw = {k: _serialize(v) for k, v in dict(r).items()}
        st = (raw.get("status") or "pending").strip()
        st_norm = st.lower()
        if st_norm == "pending":
            display_status = "Pending"
        elif st_norm in ("paid", "completed", "done"):
            display_status = "Paid"
        else:
            display_status = st[:1].upper() + st[1:] if st else "Pending"

        terms_pct = _parse_terms_percentage(raw.get("terms"))
        inv_num = raw.pop("inv_invoice_number", None) if has_invoices else None
        inv_id = raw.pop("inv_invoice_id", None) if has_invoices else None
        inv_total = raw.pop("inv_invoice_total", None) if has_invoices else None
        inv_st = raw.pop("inv_invoice_status", None) if has_invoices else None

        milestones.append(
            {
                "id": raw.get("id"),
                "milestone_name": raw.get("title") or "Milestone",
                "milestone_amount": float(raw.get("amount") or 0),
                "due_date": "",
                "timeline_raw": raw.get("timeline") or "",
                "status": display_status,
                "notes": raw.get("terms") or "",
                "milestone_percentage": terms_pct if terms_pct is not None else "",
                "invoice_number": inv_num,
                "invoice_ref": inv_num,
                "swiftbim_invoice_id": inv_id,
                "swiftbim_invoice_total": inv_total,
                "swiftbim_invoice_status": inv_st,
                "contract_id": raw.get("contract_id"),
                "proposal_id": raw.get("proposal_id"),
                "side": raw.get("side"),
                "sequence_no": raw.get("sequence_no"),
            }
        )

    return jsonify(
        {
            "success": True,
            "milestones": milestones,
            "read_only": True,
            "source": "new_swiftbim",
            "contract_id": contract_id,
            "proposal_id": proposal_id,
        }
    )


@bp.route("/invoices/<int:invoice_id>", methods=["GET"])
@project_app_required
def get_swiftbim_invoice(invoice_id: int):
    """
    Fetch a single invoice from new_swiftbim, scoped to the project's
    resolved contract/proposal (same linkage as the milestone list).
    Query: project_id (required) — internal snh6 project id.
    """
    project_id = request.args.get("project_id")
    if not project_id:
        return jsonify({"success": False, "message": "project_id required"}), 400

    main = get_db()
    mcur = main.cursor()
    mcur.execute(
        """
        SELECT p.id, p.client_id, p.project_name,
               c.fullName AS client_full_name, c.email AS client_email,
               c.phoneNumber AS client_phone, c.address AS client_address
        FROM projects p
        LEFT JOIN clientinformation c
          ON c.id = p.client_id AND c.Company_id = p.Company_id
        WHERE p.id = %s AND p.Company_id = %s
        LIMIT 1
        """,
        (project_id, g.company_id),
    )
    proj = mcur.fetchone()
    if not proj:
        return jsonify({"success": False, "message": "Project not found"}), 404

    proj = dict(proj) if not isinstance(proj, dict) else proj
    client_id = _as_int(proj.get("client_id"))
    project_name = (proj.get("project_name") or "").strip()
    client_row = {
        "client_full_name": proj.get("client_full_name"),
        "client_email": proj.get("client_email"),
        "client_phone": proj.get("client_phone"),
        "client_address": proj.get("client_address"),
    }

    vendor_conn = _vendor_conn()
    inv_out = None
    milestone_title = None
    payments_out: list[dict] = []
    try:
        vcur = vendor_conn.cursor(dictionary=True)
        if not _table_exists(vcur, "invoices") or not _table_exists(
            vcur, "payment_milestones"
        ):
            return jsonify(
                {"success": False, "message": "Invoice data not available"}
            ), 404

        contract_id, proposal_id = _resolve_contract_proposal(
            vcur, client_id, project_name
        )
        if contract_id is None and proposal_id is None:
            return jsonify(
                {"success": False, "message": "No contract link for this project"}
            ), 404

        vcur.execute(
            """
            SELECT inv.*, pm.title AS milestone_title
            FROM invoices inv
            INNER JOIN payment_milestones pm ON pm.id = inv.milestone_id
            WHERE inv.id = %s
              AND (
                (%s IS NOT NULL AND pm.contract_id = %s)
                OR (%s IS NOT NULL AND pm.proposal_id = %s)
              )
            LIMIT 1
            """,
            (
                invoice_id,
                contract_id,
                contract_id,
                proposal_id,
                proposal_id,
            ),
        )
        row = vcur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Invoice not found"}), 404

        raw = dict(row) if not isinstance(row, dict) else dict(row)
        milestone_title = raw.pop("milestone_title", None)
        inv_out = {k: _serialize(v) for k, v in raw.items()}

        if _table_exists(vcur, "invoice_payments"):
            try:
                vcur.execute(
                    """
                    SELECT id, payment_mode, transaction_id, amount_paid, payment_date,
                           remarks, payment_proof, approval_status
                    FROM invoice_payments
                    WHERE invoice_id = %s
                    ORDER BY id DESC
                    """,
                    (invoice_id,),
                )
                for pr in vcur.fetchall() or []:
                    pd = dict(pr) if not isinstance(pr, dict) else dict(pr)
                    payments_out.append(
                        {
                            "id": _serialize(pd.get("id")),
                            "payment_mode": str(pd.get("payment_mode") or ""),
                            "transaction_id": str(pd.get("transaction_id") or ""),
                            "amount_paid": _serialize(pd.get("amount_paid")),
                            "payment_date": _serialize(pd.get("payment_date")),
                            "remarks": str(pd.get("remarks") or ""),
                            "payment_proof": str(pd.get("payment_proof") or ""),
                            "approval_status": str(pd.get("approval_status") or ""),
                        }
                    )
            except Exception:
                payments_out = []
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500
    finally:
        try:
            vendor_conn.close()
        except Exception:
            pass

    view = _build_td_invoice_view(
        inv_out, milestone_title, payments_out, project_name, client_row
    )

    return jsonify(
        {
            "success": True,
            "invoice": inv_out,
            "milestone_title": milestone_title,
            "view": view,
            "read_only": True,
        }
    )
