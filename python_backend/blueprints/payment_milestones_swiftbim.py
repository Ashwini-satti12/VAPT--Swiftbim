"""
Read-only payment milestones from new_swiftbim (contract / proposal terms).

Does not modify the legacy snh6 `payment_milestones` + `/api/milestones` workflow.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO

import mysql.connector as mysql_connector
from flask import Blueprint, current_app, g, jsonify, request, send_file

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


def _ensure_milestones_from_vendor_proposal_terms(
    mcur, vcur, proposal_id: int | None, contract_id: int | None = None
):
    """
    Backfill payment_milestones from accepted vendor_submitted_proposals.payment_terms.
    Non-destructive: only runs when no existing milestones are linked to the same proposal_id.
    """
    pid = _as_int(proposal_id)
    if pid is None:
        return
    try:
        vcur.execute(
            "SELECT COUNT(*) AS c FROM payment_milestones WHERE proposal_id = %s",
            (pid,),
        )
        existing = int((vcur.fetchone() or {}).get("c") or 0)
        if existing > 0:
            return
    except Exception:
        return

    prop = {}
    try:
        mcur.execute(
            """
            SELECT id, status, payment_terms
            FROM vendor_submitted_proposals
            WHERE id = %s
            LIMIT 1
            """,
            (pid,),
        )
        prop = mcur.fetchone() or {}
    except Exception:
        prop = {}
    if not prop:
        return

    prop_status = str(prop.get("status") or "").strip().lower()
    if prop_status != "accepted":
        return

    raw_terms = prop.get("payment_terms")
    terms = []
    if isinstance(raw_terms, list):
        terms = raw_terms
    elif isinstance(raw_terms, str):
        s = raw_terms.strip()
        if s:
            try:
                parsed = json.loads(s)
                if isinstance(parsed, list):
                    terms = parsed
            except Exception:
                terms = []

    if not terms:
        return

    seq = 1
    for t in terms:
        if not isinstance(t, dict):
            continue
        title = str(
            t.get("basis")
            or t.get("payment_basis")
            or t.get("title")
            or t.get("name")
            or f"Milestone {seq}"
        ).strip()
        terms_txt = str(t.get("terms") or t.get("term") or "").strip()
        timeline_txt = str(
            t.get("timeline") or t.get("timeline_weeks") or t.get("duration") or ""
        ).strip()
        amount_raw = t.get("amount")
        if amount_raw in (None, ""):
            amount_raw = t.get("value")
        amount = 0.0
        try:
            if isinstance(amount_raw, str):
                amount_raw = amount_raw.replace(",", "").strip()
            amount = float(amount_raw) if amount_raw not in (None, "") else 0.0
        except Exception:
            amount = 0.0
        try:
            vcur.execute(
                """
                INSERT INTO payment_milestones
                    (contract_id, proposal_id, side, title, terms, timeline, amount, sequence_no, status)
                VALUES (%s, %s, 'vendor', %s, %s, %s, %s, %s, 'pending')
                """,
                (
                    _as_int(contract_id),
                    pid,
                    title,
                    terms_txt,
                    timeline_txt,
                    amount,
                    seq,
                ),
            )
            seq += 1
        except Exception:
            # Keep best-effort behavior without breaking endpoint.
            continue


def _resolve_vendor_accepted_submitted_proposal_id(
    mcur, project_id: int | None, project_name: str, vendor_id: int | None
) -> int | None:
    """Resolve latest accepted vendor_submitted_proposals.id for vendor+project."""
    if vendor_id is None:
        return None
    pid = _as_int(project_id)
    pname = (project_name or "").strip()
    try:
        if pid is not None and _main_table_exists(mcur, "vendor_bidding"):
            mcur.execute(
                """
                SELECT vsp.id
                FROM vendor_submitted_proposals vsp
                JOIN vendor_bidding vb ON vb.id = vsp.opportunity_id
                WHERE vsp.vendor_id = %s
                  AND LOWER(COALESCE(vsp.status, '')) = 'accepted'
                  AND vb.project_id = %s
                ORDER BY vsp.id DESC
                LIMIT 1
                """,
                (vendor_id, pid),
            )
            row = mcur.fetchone() or {}
            rid = _as_int(row.get("id"))
            if rid is not None:
                return rid
        if pname:
            mcur.execute(
                """
                SELECT id
                FROM vendor_submitted_proposals
                WHERE vendor_id = %s
                  AND LOWER(COALESCE(status, '')) = 'accepted'
                  AND project_name = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (vendor_id, pname),
            )
            row = mcur.fetchone() or {}
            return _as_int(row.get("id"))
    except Exception:
        return None
    return None


def _resolve_vendor_project_proposal(
    mcur, project_id: int | None, project_name: str, vendor_id: int | None = None
) -> int | None:
    """Resolve proposal_id from vendor_projects for accepted vendor flow."""
    try:
        sql = """
            SELECT proposal_id
            FROM vendor_projects
            WHERE proposal_id IS NOT NULL
              AND (
                (%s IS NOT NULL AND main_project_id = %s)
                OR (%s <> '' AND project_name = %s)
              )
        """
        params: list = [project_id, project_id, project_name, project_name]
        if vendor_id is not None:
            sql += " AND vendor_id = %s"
            params.append(vendor_id)
        sql += " ORDER BY id DESC LIMIT 1"
        mcur.execute(sql, tuple(params))
        row = mcur.fetchone() or {}
        return _as_int(row.get("proposal_id"))
    except Exception:
        return None


def _resolve_contract_proposal(
    vcur,
    client_id: int | None,
    project_name: str,
    proposal_id_hint: int | None = None,
    prefer_proposal_hint: bool = False,
):
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
    hint_pid = _as_int(proposal_id_hint)
    if prefer_proposal_hint and hint_pid is not None:
        pid = hint_pid
    elif pid is None:
        pid = hint_pid
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


def _main_table_exists(mcur, table: str) -> bool:
    try:
        mcur.execute(
            """
            SELECT 1
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s
            LIMIT 1
            """,
            (table,),
        )
        return mcur.fetchone() is not None
    except Exception:
        return False


def _ensure_invoice_tables(vcur):
    vcur.execute(
        """
        CREATE TABLE IF NOT EXISTS invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            milestone_id INT NULL,
            contract_id INT NULL,
            proposal_id INT NULL,
            side VARCHAR(20) NOT NULL DEFAULT 'client',
            invoice_number VARCHAR(100) NOT NULL UNIQUE,
            invoice_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            status VARCHAR(50) NOT NULL DEFAULT 'Shared',
            generated_by INT NULL,
            approved_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_contract_side (contract_id, side),
            KEY idx_milestone (milestone_id)
        )
        """
    )
    vcur.execute(
        """
        CREATE TABLE IF NOT EXISTS invoice_payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_id INT NOT NULL,
            payment_mode VARCHAR(50) NOT NULL,
            transaction_id VARCHAR(255) NULL,
            amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            payment_date DATE NOT NULL,
            remarks TEXT NULL,
            payment_proof VARCHAR(512) NULL,
            created_by INT NULL,
            approval_status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval',
            approved_by INT NULL,
            approved_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_invoice (invoice_id)
        )
        """
    )


def _next_invoice_number(vcur, side: str) -> str:
    prefix = "CINV" if side == "client" else "VINV"
    vcur.execute("SELECT COUNT(*) AS cnt FROM invoices WHERE side = %s", (side,))
    row = vcur.fetchone() or {}
    cnt = int(row.get("cnt") or 0)
    return f"{prefix}-{str(cnt + 1).zfill(4)}"


def _user_role_lc() -> str:
    return str(getattr(g, "user_role", "") or "").strip().lower()


def _is_vendor_user() -> bool:
    if str(getattr(g, "user_type", "")).strip().lower() == "vendor":
        return True
    return _user_role_lc().startswith("vendor")


def _is_commercial_user() -> bool:
    role = _user_role_lc()
    return role in {
        "technical director",
        "project manager",
        "admin",
        "accounts",
        "management",
    }


def _is_outsource_project_row(proj: dict | None) -> bool:
    if not proj:
        return False
    dep = str(proj.get("department") or "").strip().lower()
    return dep in {
        "outsource",
        "outsource project",
        "vendor",
        "vendor project",
        "submission deadline",
    }


def _serialize_payment_row(row: dict) -> dict:
    return {
        "id": _serialize(row.get("id")),
        "payment_mode": str(row.get("payment_mode") or ""),
        "transaction_id": str(row.get("transaction_id") or ""),
        "amount_paid": _serialize(row.get("amount_paid")),
        "payment_date": _serialize(row.get("payment_date")),
        "remarks": str(row.get("remarks") or ""),
        "payment_proof": str(row.get("payment_proof") or ""),
        "approval_status": str(row.get("approval_status") or ""),
        "created_at": _serialize(row.get("created_at")),
    }


def _build_invoice_pdf_bytes(ctx: dict) -> bytes:
    """Build invoice PDF bytes for invoice download."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    from xml.sax.saxutils import escape

    def _ascii(s):
        return ("" if s is None else str(s).strip()).encode("ascii", "ignore").decode("ascii")

    def _money(v):
        try:
            amt = float(v or 0)
        except Exception:
            amt = 0.0
        return f"Rs. {amt:,.2f}"

    def _p(text, style):
        return Paragraph(escape(_ascii(text)).replace("\n", "<br/>"), style)

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title=_ascii(ctx.get("invoice_number") or "Invoice"),
    )
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "H1", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=20, textColor=colors.HexColor("#1a1a1a")
    )
    h2 = ParagraphStyle(
        "H2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11, textColor=colors.HexColor("#333333")
    )
    body = ParagraphStyle("B", parent=styles["Normal"], fontName="Helvetica", fontSize=9.5, textColor=colors.HexColor("#333333"))

    qty = 1
    try:
        qty = int(ctx.get("qty") or 1)
    except Exception:
        qty = 1

    gst_pct = ctx.get("gst_percent")
    try:
        gst_pct = float(gst_pct if gst_pct is not None else 18)
    except Exception:
        gst_pct = 18.0

    story = [
        Paragraph(escape("SWIFTERZ"), h1),
        Spacer(1, 0.2 * cm),
        Paragraph(escape("INVOICE"), h2),
    ]
    meta = Table(
        [
            ["Invoice No:", _ascii(ctx.get("invoice_number"))],
            ["Date:", _ascii(ctx.get("date_str"))],
            ["Due Date:", _ascii(ctx.get("due_str"))],
            ["Project:", _ascii(ctx.get("project_name"))],
            ["Milestone:", _ascii(ctx.get("milestone_name"))],
        ],
        colWidths=[3.2 * cm, 12 * cm],
    )
    meta.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 9.5),
                ("FONT", (1, 0), (1, -1), "Helvetica", 9.5),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(meta)
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(escape("Bill To"), h2))
    story.append(_p(f"Client Name: {ctx.get('client_name') or '—'}", body))
    story.append(_p(f"Company Name: {ctx.get('company_name') or '—'}", body))
    story.append(_p(f"Email: {ctx.get('email') or '—'}", body))
    story.append(_p(f"Phone: {ctx.get('phone') or '—'}", body))
    story.append(_p(f"Address: {ctx.get('address') or '—'}", body))
    story.append(Spacer(1, 0.2 * cm))

    table = Table(
        [
            ["S.No", "Description", "Qty", "Unit Price", "Amount"],
            ["1", _ascii(ctx.get("line_description") or "Service"), str(qty), _money(ctx.get("unit_price")), _money(ctx.get("line_amount"))],
        ],
        colWidths=[1.1 * cm, 7.5 * cm, 1.5 * cm, 2.6 * cm, 2.6 * cm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9),
                ("FONT", (0, 1), (-1, -1), "Helvetica", 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.3 * cm))
    summary = Table(
        [
            ["Subtotal:", _money(ctx.get("subtotal"))],
            [f"Tax (GST {gst_pct:g}%):", _money(ctx.get("tax_amount"))],
            ["Total Amount:", _money(ctx.get("total_amount"))],
        ],
        colWidths=[5.5 * cm, 4.5 * cm],
        hAlign="RIGHT",
    )
    summary.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
                ("FONT", (0, -1), (-1, -1), "Helvetica-Bold", 11),
                ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ]
        )
    )
    story.append(summary)

    doc.build(story)
    return buf.getvalue()


@bp.route("", methods=["GET"])
@project_app_required
def list_swiftbim_payment_milestones():
    """
    Query params:
      project_id (required) — internal snh6 project id
      side (optional) — default `client` for phase-1 in-house display
    """
    project_id = request.args.get("project_id")
    proposal_hint_q = _as_int(request.args.get("proposal_id"))
    contract_hint_q = _as_int(request.args.get("contract_id"))
    project_name_hint_q = (request.args.get("project_name") or "").strip()
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
    if not proj and _is_vendor_user():
        try:
            mcur.execute(
                "SELECT id, client_id, project_name, department FROM projects WHERE id = %s LIMIT 1",
                (project_id,),
            )
            proj = mcur.fetchone()
        except Exception:
            proj = None
    if not proj:
        if proposal_hint_q is None and contract_hint_q is None:
            return jsonify({"success": False, "message": "Project not found"}), 404
        proj = {
            "id": _as_int(project_id),
            "client_id": None,
            "project_name": project_name_hint_q or f"Project #{project_id}",
            "department": "Submission Deadline",
        }

    proj = dict(proj) if not isinstance(proj, dict) else proj
    client_id = _as_int(proj.get("client_id"))
    project_name = (proj.get("project_name") or project_name_hint_q or "").strip()
    proposal_hint = _resolve_vendor_project_proposal(
        mcur,
        _as_int(proj.get("id")),
        project_name,
        getattr(g, "user_id", None) if _is_vendor_user() else None,
    )
    if _is_vendor_user():
        accepted_vendor_prop = _resolve_vendor_accepted_submitted_proposal_id(
            mcur,
            _as_int(proj.get("id")),
            project_name,
            _as_int(getattr(g, "user_id", None)),
        )
        if accepted_vendor_prop is not None:
            proposal_hint = accepted_vendor_prop
    if proposal_hint_q is not None:
        proposal_hint = proposal_hint_q

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
            vcur,
            client_id,
            project_name,
            proposal_id_hint=proposal_hint,
            prefer_proposal_hint=_is_vendor_user(),
        )
        if _is_vendor_user() and proposal_id is not None:
            # Vendor view must be anchored to accepted vendor proposal terms only.
            contract_id = None
        if contract_id is None and contract_hint_q is not None and not _is_vendor_user():
            contract_id = contract_hint_q
        _ensure_milestones_from_vendor_proposal_terms(
            mcur, vcur, proposal_id=proposal_id, contract_id=contract_id
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
                "title": raw.get("title") or "Milestone",
                "terms": raw.get("terms") or "",
                "timeline": raw.get("timeline") or "",
                "amount": float(raw.get("amount") or 0),
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
    proposal_hint_q = _as_int(request.args.get("proposal_id"))
    contract_hint_q = _as_int(request.args.get("contract_id"))
    project_name_hint_q = (request.args.get("project_name") or "").strip()
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
    if not proj and _is_vendor_user():
        try:
            mcur.execute(
                """
                SELECT p.id, p.client_id, p.project_name,
                       c.fullName AS client_full_name, c.email AS client_email,
                       c.phoneNumber AS client_phone, c.address AS client_address
                FROM projects p
                LEFT JOIN clientinformation c ON c.id = p.client_id
                WHERE p.id = %s
                LIMIT 1
                """,
                (project_id,),
            )
            proj = mcur.fetchone()
        except Exception:
            proj = None
    if not proj:
        if proposal_hint_q is None and contract_hint_q is None:
            return jsonify({"success": False, "message": "Project not found"}), 404
        proj = {
            "id": _as_int(project_id),
            "client_id": None,
            "project_name": project_name_hint_q or f"Project #{project_id}",
            "client_full_name": "",
            "client_email": "",
            "client_phone": "",
            "client_address": "",
        }

    proj = dict(proj) if not isinstance(proj, dict) else proj
    client_id = _as_int(proj.get("client_id"))
    project_name = (proj.get("project_name") or "").strip()
    proposal_hint = _resolve_vendor_project_proposal(
        mcur,
        _as_int(proj.get("id")),
        project_name,
        getattr(g, "user_id", None) if _is_vendor_user() else None,
    )
    if proposal_hint_q is not None:
        proposal_hint = proposal_hint_q
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
            vcur,
            client_id,
            project_name,
            proposal_id_hint=proposal_hint,
            prefer_proposal_hint=_is_vendor_user(),
        )
        if _is_vendor_user() and proposal_id is not None:
            # Vendor invoice details should resolve only through vendor proposal linkage.
            contract_id = None
        if contract_id is None and contract_hint_q is not None and not _is_vendor_user():
            contract_id = contract_hint_q
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


@bp.route("/invoices/<int:invoice_id>/pdf", methods=["GET"])
@project_app_required
def download_swiftbim_invoice_pdf(invoice_id: int):
    """Download invoice PDF for TD/Vendor invoice list and details pages."""
    result = get_swiftbim_invoice(invoice_id)
    response = result[0] if isinstance(result, tuple) else result
    status_code = result[1] if isinstance(result, tuple) and len(result) > 1 else getattr(response, "status_code", 200)
    if int(status_code) >= 400:
        return result

    data = response.get_json(silent=True) if hasattr(response, "get_json") else None
    if not isinstance(data, dict) or not data.get("success") or not isinstance(data.get("view"), dict):
        return jsonify({"success": False, "message": "Invoice data not available"}), 404

    view = data["view"]
    try:
        pdf_bytes = _build_invoice_pdf_bytes(view)
    except Exception as exc:
        current_app.logger.exception("Invoice PDF generation failed")
        return jsonify({"success": False, "message": f"PDF generation failed: {str(exc)}"}), 500

    invoice_number = str(view.get("invoice_number") or f"INV-{invoice_id}")
    safe_name = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in invoice_number)
    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{safe_name}.pdf",
    )


@bp.route("/scopes", methods=["GET"])
@project_app_required
def list_payment_scopes():
    main = get_db()
    mcur = main.cursor(dictionary=True)

    projects = []
    try:
        if _is_vendor_user():
            merged_by_id: dict[int, dict] = {}
            vendor_employee_ids = [getattr(g, "user_id", None)]
            vendor_employee_ids = [v for v in vendor_employee_ids if v is not None]

            # Mirror vendor.py list_vendor_projects behavior: all employees under same vendor company.
            if _main_table_exists(mcur, "vendor_employee") and getattr(g, "company_id", None):
                try:
                    mcur.execute(
                        "SELECT id FROM snh6_swiftproject.vendor_employee WHERE vendor_id = %s",
                        (g.company_id,),
                    )
                    ids = [_as_int(r.get("id")) for r in (mcur.fetchall() or [])]
                    ids = [i for i in ids if i is not None]
                    if ids:
                        vendor_employee_ids = ids
                except Exception:
                    pass

            if not vendor_employee_ids and getattr(g, "user_id", None) is not None:
                vendor_employee_ids = [_as_int(getattr(g, "user_id", None))]
                vendor_employee_ids = [i for i in vendor_employee_ids if i is not None]

            if _main_table_exists(mcur, "vendor_projects") and vendor_employee_ids:
                try:
                    ph = ",".join(["%s"] * len(vendor_employee_ids))
                    mcur.execute(
                        f"""
                        SELECT
                            COALESCE(p.id, vp.main_project_id) AS id,
                            COALESCE(p.project_name, vp.project_name) AS project_name,
                            COALESCE(p.department, 'Submission Deadline') AS department,
                            p.client_id,
                            vp.proposal_id AS vp_proposal_id
                        FROM snh6_swiftproject.vendor_projects vp
                        LEFT JOIN snh6_swiftproject.projects p
                            ON (
                                (vp.main_project_id IS NOT NULL AND p.id = vp.main_project_id)
                                OR (p.project_name COLLATE utf8mb4_general_ci = vp.project_name COLLATE utf8mb4_general_ci)
                            )
                        WHERE vp.vendor_id IN ({ph})
                        ORDER BY p.id DESC
                        """,
                        (*vendor_employee_ids,),
                    )
                    for row in (mcur.fetchall() or []):
                        pid = _as_int(row.get("id"))
                        if pid is not None and pid not in merged_by_id:
                            merged_by_id[pid] = dict(row)
                except Exception:
                    pass

            if (
                _main_table_exists(mcur, "vendor_submitted_proposals")
                and _main_table_exists(mcur, "vendor_bidding")
                and vendor_employee_ids
            ):
                try:
                    ph = ",".join(["%s"] * len(vendor_employee_ids))
                    mcur.execute(
                        f"""
                        SELECT
                            COALESCE(p.id, vb.project_id) AS id,
                            COALESCE(p.project_name, vb.project_name, vsp.project_name) AS project_name,
                            COALESCE(p.department, 'Submission Deadline') AS department,
                            p.client_id,
                            vsp.id AS vp_proposal_id
                        FROM vendor_submitted_proposals vsp
                        LEFT JOIN vendor_bidding vb
                            ON vb.id = vsp.opportunity_id
                        LEFT JOIN projects p
                            ON p.id = vb.project_id
                        WHERE vsp.vendor_id IN ({ph})
                          AND LOWER(COALESCE(vsp.status, '')) = 'accepted'
                        ORDER BY p.id DESC
                        """,
                        (*vendor_employee_ids,),
                    )
                    for row in (mcur.fetchall() or []):
                        pid = _as_int(row.get("id"))
                        if pid is not None and pid not in merged_by_id:
                            merged_by_id[pid] = dict(row)
                except Exception:
                    pass

            # Fallback: include projects where the current user is mapped directly.
            try:
                mcur.execute(
                    """
                    SELECT id, project_name, department, client_id
                    FROM projects
                    WHERE Company_id = %s
                      AND (
                        project_manager_id = %s OR lead_id = %s
                        OR FIND_IN_SET(%s, REPLACE(CONCAT(',', COALESCE(members,''), ','), ' ', '')) > 0
                      )
                    ORDER BY id DESC
                    """,
                    (g.company_id, g.user_id, g.user_id, g.user_id),
                )
                for row in (mcur.fetchall() or []):
                    pid = _as_int(row.get("id"))
                    if pid is not None and pid not in merged_by_id:
                        merged_by_id[pid] = dict(row)
            except Exception:
                pass

            projects = sorted(
                merged_by_id.values(),
                key=lambda r: _as_int(r.get("id")) or 0,
                reverse=True,
            )
        else:
            mcur.execute(
                """
                SELECT id, project_name, department, client_id
                FROM projects
                WHERE Company_id = %s
                ORDER BY id DESC
                """,
                (g.company_id,),
            )
            projects = [dict(r) if not isinstance(r, dict) else r for r in (mcur.fetchall() or [])]
    except Exception:
        projects = []

    out = []
    vendor_conn = _vendor_conn()
    try:
        vcur = vendor_conn.cursor(dictionary=True)
        for p in projects:
            project_id = _as_int(p.get("id"))
            if project_id is None:
                continue
            accepted_vendor_prop = (
                _resolve_vendor_accepted_submitted_proposal_id(
                    mcur,
                    project_id,
                    str(p.get("project_name") or "").strip(),
                    _as_int(getattr(g, "user_id", None)),
                )
                if _is_vendor_user()
                else None
            )
            proposal_hint = _resolve_vendor_project_proposal(
                mcur,
                project_id,
                str(p.get("project_name") or "").strip(),
                getattr(g, "user_id", None) if _is_vendor_user() else None,
            ) or accepted_vendor_prop or _as_int(p.get("vp_proposal_id"))
            if not _is_outsource_project_row(p) and _is_vendor_user() and proposal_hint is None:
                continue
            contract_id, proposal_id = _resolve_contract_proposal(
                vcur,
                _as_int(p.get("client_id")),
                str(p.get("project_name") or "").strip(),
                proposal_id_hint=proposal_hint,
                prefer_proposal_hint=_is_vendor_user(),
            )
            out.append(
                {
                    "project_id": project_id,
                    "project_name": str(p.get("project_name") or f"Project #{project_id}"),
                    "department": p.get("department"),
                    "contract_id": contract_id,
                    "proposal_id": proposal_id,
                    "is_outsource": _is_outsource_project_row(p),
                }
            )
    except Exception:
        out = []
    finally:
        try:
            vendor_conn.close()
        except Exception:
            pass

    return jsonify(out)


@bp.route("/invoices", methods=["GET"])
@project_app_required
def list_project_invoices():
    project_id = request.args.get("project_id")
    proposal_hint_q = _as_int(request.args.get("proposal_id"))
    contract_hint_q = _as_int(request.args.get("contract_id"))
    project_name_hint_q = (request.args.get("project_name") or "").strip()
    if not project_id:
        return jsonify({"success": False, "message": "project_id required"}), 400

    side = (request.args.get("side") or "").strip().lower()
    if side not in ("client", "vendor", ""):
        side = ""

    main = get_db()
    mcur = main.cursor()
    mcur.execute(
        "SELECT id, client_id, project_name, department FROM projects WHERE id = %s AND Company_id = %s LIMIT 1",
        (project_id, g.company_id),
    )
    proj = mcur.fetchone()
    if not proj and _is_vendor_user():
        try:
            mcur.execute(
                "SELECT id, client_id, project_name, department FROM projects WHERE id = %s LIMIT 1",
                (project_id,),
            )
            proj = mcur.fetchone()
        except Exception:
            proj = None
    if not proj:
        if proposal_hint_q is None and contract_hint_q is None:
            return jsonify({"success": False, "message": "Project not found"}), 404
        proj = {
            "id": _as_int(project_id),
            "client_id": None,
            "project_name": project_name_hint_q or f"Project #{project_id}",
            "department": "Submission Deadline",
        }
    proj = dict(proj) if not isinstance(proj, dict) else proj

    vendor_conn = _vendor_conn()
    try:
        vcur = vendor_conn.cursor(dictionary=True)
        _ensure_invoice_tables(vcur)
        proposal_hint = _resolve_vendor_project_proposal(
            mcur,
            _as_int(proj.get("id")),
            str(proj.get("project_name") or "").strip(),
            getattr(g, "user_id", None) if _is_vendor_user() else None,
        )
        if _is_vendor_user():
            accepted_vendor_prop = _resolve_vendor_accepted_submitted_proposal_id(
                mcur,
                _as_int(proj.get("id")),
                str(proj.get("project_name") or "").strip(),
                _as_int(getattr(g, "user_id", None)),
            )
            if accepted_vendor_prop is not None:
                proposal_hint = accepted_vendor_prop
        if proposal_hint_q is not None:
            proposal_hint = proposal_hint_q
        contract_id, proposal_id = _resolve_contract_proposal(
            vcur,
            _as_int(proj.get("client_id")),
            str(proj.get("project_name") or "").strip(),
            proposal_id_hint=proposal_hint,
            prefer_proposal_hint=_is_vendor_user(),
        )
        if _is_vendor_user() and proposal_id is not None:
            # Vendor invoice list should not include milestones from other contract links.
            contract_id = None
        if contract_id is None and contract_hint_q is not None and not _is_vendor_user():
            contract_id = contract_hint_q
        if contract_id is None and proposal_id is None:
            return jsonify([])

        where = []
        params: list = []
        if side:
            where.append("inv.side = %s")
            params.append(side)
        if contract_id is not None:
            where.append("inv.contract_id = %s")
            params.append(contract_id)
        elif proposal_id is not None:
            where.append("inv.proposal_id = %s")
            params.append(proposal_id)
        where_sql = " AND ".join(where) if where else "1=1"

        vcur.execute(
            f"""
            SELECT inv.id, inv.milestone_id, inv.contract_id, inv.proposal_id, inv.side,
                   inv.invoice_number, inv.invoice_total, inv.status, inv.generated_by, inv.approved_by, inv.created_at
            FROM invoices inv
            WHERE {where_sql}
            ORDER BY inv.id DESC
            """,
            tuple(params),
        )
        invoices = []
        for inv in vcur.fetchall() or []:
            vcur.execute(
                """
                SELECT id, payment_mode, transaction_id, amount_paid, payment_date, remarks,
                       payment_proof, approval_status, created_at
                FROM invoice_payments
                WHERE invoice_id = %s
                ORDER BY id DESC
                """,
                (inv.get("id"),),
            )
            pays = [_serialize_payment_row(r) for r in (vcur.fetchall() or [])]
            item = {
                "id": inv.get("id"),
                "milestone_id": inv.get("milestone_id"),
                "contract_id": inv.get("contract_id"),
                "proposal_id": inv.get("proposal_id"),
                "side": inv.get("side"),
                "invoice_number": inv.get("invoice_number"),
                "invoice_total": _serialize(inv.get("invoice_total")),
                "status": inv.get("status"),
                "created_at": _serialize(inv.get("created_at")),
                "payments": pays,
                "latest_payment": pays[0] if pays else None,
            }
            invoices.append(item)
        return jsonify(invoices)
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500
    finally:
        try:
            vendor_conn.close()
        except Exception:
            pass


@bp.route("/invoices", methods=["POST"])
@project_app_required
def create_project_invoice():
    data = request.get_json(silent=True) or {}
    milestone_id = _as_int(data.get("milestone_id"))
    side = str(data.get("side") or "client").strip().lower()
    if side not in ("client", "vendor"):
        return jsonify({"error": "Invalid side"}), 400

    if side == "client" and not _is_commercial_user():
        return jsonify({"error": "Only commercial team can generate client invoices"}), 403
    if side == "vendor" and not (_is_vendor_user() or _is_commercial_user()):
        return jsonify({"error": "Only vendor/commercial users can generate vendor invoices"}), 403

    vendor_conn = _vendor_conn()
    try:
        vcur = vendor_conn.cursor(dictionary=True)
        _ensure_invoice_tables(vcur)
        invoice_number = _next_invoice_number(vcur, side)
        invoice_total = float(data.get("invoice_total") or 0)

        vcur.execute(
            """
            SELECT id, contract_id, proposal_id, side, amount
            FROM payment_milestones
            WHERE id = %s
            LIMIT 1
            """,
            (milestone_id,),
        )
        ms = vcur.fetchone() or {}
        if not ms:
            return jsonify({"error": "Milestone not found"}), 404
        if str(ms.get("side") or "").strip().lower() != side:
            return jsonify({"error": "Milestone side does not match invoice side"}), 400

        vcur.execute(
            "SELECT id, invoice_number FROM invoices WHERE milestone_id = %s LIMIT 1",
            (milestone_id,),
        )
        existing = vcur.fetchone()
        if existing:
            return (
                jsonify(
                    {
                        "error": "An invoice already exists for this milestone",
                        "invoice_id": existing.get("id"),
                        "invoice_number": existing.get("invoice_number"),
                    }
                ),
                409,
            )

        if invoice_total <= 0:
            invoice_total = float(ms.get("amount") or 0)

        vcur.execute(
            """
            INSERT INTO invoices
                (milestone_id, contract_id, proposal_id, side, invoice_number, invoice_total, status, generated_by)
            VALUES (%s,%s,%s,%s,%s,%s,'Shared',%s)
            """,
            (
                milestone_id,
                ms.get("contract_id"),
                ms.get("proposal_id"),
                side,
                invoice_number,
                invoice_total,
                g.user_id,
            ),
        )
        invoice_id = vcur.lastrowid
        return jsonify({"id": invoice_id, "invoice_number": invoice_number}), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        try:
            vendor_conn.close()
        except Exception:
            pass


@bp.route("/invoices/<int:invoice_id>/pay", methods=["POST"])
@project_app_required
def pay_project_invoice(invoice_id: int):
    payment_mode = str(request.form.get("payment_mode") or "").strip()
    transaction_id = str(request.form.get("transaction_id") or "").strip()
    payment_date = request.form.get("payment_date")
    remarks = request.form.get("remarks")
    payment_proof = request.form.get("payment_proof")

    if not payment_mode:
        return jsonify({"error": "payment_mode is required"}), 400
    is_cash = payment_mode.lower() == "cash"
    if not is_cash and not transaction_id:
        return jsonify({"error": "transaction_id is required for non-cash modes"}), 400
    if not payment_date:
        return jsonify({"error": "payment_date is required"}), 400
    if not is_cash and not payment_proof:
        return jsonify({"error": "payment_proof is required for non-cash modes"}), 400

    vendor_conn = _vendor_conn()
    try:
        vcur = vendor_conn.cursor(dictionary=True)
        _ensure_invoice_tables(vcur)
        vcur.execute(
            "SELECT id, side, invoice_total FROM invoices WHERE id = %s LIMIT 1",
            (invoice_id,),
        )
        inv = vcur.fetchone()
        if not inv:
            return jsonify({"error": "Invoice not found"}), 404

        if str(inv.get("side") or "").lower() == "vendor":
            if not _is_commercial_user():
                return jsonify({"error": "Only commercial team can submit vendor payment"}), 403
        elif not _is_vendor_user():
            return jsonify({"error": "Only vendor can submit this payment"}), 403

        vcur.execute(
            "SELECT COUNT(*) AS c FROM invoice_payments WHERE invoice_id = %s",
            (invoice_id,),
        )
        c = int((vcur.fetchone() or {}).get("c") or 0)
        if c > 0:
            return jsonify({"error": "A payment has already been submitted for this invoice"}), 409

        vcur.execute(
            """
            INSERT INTO invoice_payments
                (invoice_id, payment_mode, transaction_id, amount_paid, payment_date, remarks, payment_proof, created_by, approval_status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'Pending Approval')
            """,
            (
                invoice_id,
                payment_mode,
                transaction_id if transaction_id else None,
                float(inv.get("invoice_total") or 0),
                payment_date,
                remarks,
                payment_proof if payment_proof else None,
                g.user_id,
            ),
        )
        vcur.execute(
            "UPDATE invoices SET status = 'Pending Approval' WHERE id = %s",
            (invoice_id,),
        )
        return jsonify({"status": "success"}), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        try:
            vendor_conn.close()
        except Exception:
            pass


@bp.route("/invoices/<int:invoice_id>/approve-payment", methods=["POST"])
@project_app_required
def approve_project_invoice_payment(invoice_id: int):
    vendor_conn = _vendor_conn()
    try:
        vcur = vendor_conn.cursor(dictionary=True)
        _ensure_invoice_tables(vcur)
        vcur.execute(
            "SELECT id, side FROM invoices WHERE id = %s LIMIT 1",
            (invoice_id,),
        )
        inv = vcur.fetchone() or {}
        if not inv:
            return jsonify({"error": "Invoice not found"}), 404

        inv_side = str(inv.get("side") or "").strip().lower()
        if inv_side == "vendor":
            if not _is_vendor_user():
                return jsonify({"error": "Only vendor can approve vendor payments"}), 403
        elif inv_side == "client":
            if not _is_commercial_user():
                return jsonify({"error": "Only commercial team can approve client payments"}), 403
        else:
            return jsonify({"error": "Invalid invoice side"}), 400

        vcur.execute(
            """
            SELECT id, payment_mode, payment_proof
            FROM invoice_payments
            WHERE invoice_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (invoice_id,),
        )
        pay = vcur.fetchone()
        if not pay:
            return jsonify({"error": "No payment found"}), 404
        if str(pay.get("payment_mode") or "").strip().lower() == "cash" and not str(pay.get("payment_proof") or "").strip():
            return jsonify({"error": "Cash payment requires bill/receipt attachment before approval"}), 400

        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        vcur.execute(
            """
            UPDATE invoice_payments
            SET approval_status = 'Approved', approved_by = %s, approved_at = %s
            WHERE id = %s
            """,
            (g.user_id, now, pay.get("id")),
        )
        vcur.execute(
            "UPDATE invoices SET status = 'Paid', approved_by = %s WHERE id = %s",
            (g.user_id, invoice_id),
        )
        return jsonify({"status": "approved"})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        try:
            vendor_conn.close()
        except Exception:
            pass
