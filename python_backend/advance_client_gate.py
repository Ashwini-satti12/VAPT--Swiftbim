"""
Resolve whether internal PM work should wait on the client's advance payment
(aligned with new_swiftbim contracts, payment_milestones, invoices).

Used by snh6_swiftproject project lists so TD/PM/BL/BC/BM UIs can block View/Edit
until the client has paid and commercial has approved (invoice_payments).
"""
from __future__ import annotations


def _norm_key(value) -> str:
    return str(value or "").strip().lower()


def _project_name_gate_candidates(project_name: str) -> set[str]:
    keys: set[str] = set()
    raw = str(project_name or "").strip()
    if not raw:
        return keys
    keys.add(_norm_key(raw))
    for sep in ("-", "/", "|", "–", "—"):
        if sep in raw:
            for part in raw.split(sep):
                k = _norm_key(part)
                if k:
                    keys.add(k)
    return keys


def _contract_row_from(vcur, row):
    if isinstance(row, dict):
        return row
    return {
        "contract_row_id": row[0] if len(row) > 0 else None,
        "contract_id": row[1] if len(row) > 1 else None,
        "contract_status": row[2] if len(row) > 2 else None,
        "proposal_id": row[3] if len(row) > 3 else None,
        "total_paid_amount": row[4] if len(row) > 4 else None,
        "paid_date": row[5] if len(row) > 5 else None,
        "payment_status": row[6] if len(row) > 6 else None,
        "payment_completion_status": row[7] if len(row) > 7 else None,
        "full_contract_data": row[8] if len(row) > 8 else None,
        "project_type_sector": row[9] if len(row) > 9 else None,
        "company_name": row[10] if len(row) > 10 else None,
    }


def _is_advance_paid_contract_rec(rec: dict) -> bool:
    try:
        if rec.get("total_paid_amount") is not None and float(rec.get("total_paid_amount")) > 0:
            return True
    except Exception:
        pass
    if rec.get("paid_date"):
        return True
    payment_status = str(rec.get("payment_status") or "").strip().lower()
    if payment_status in {"paid", "partially paid", "completed"}:
        return True
    payment_completion = str(rec.get("payment_completion_status") or "").strip().lower()
    if payment_completion == "completed":
        return True
    return False


def _has_client_invoice_payment_approved(vcur, rec: dict) -> bool:
    try:
        contract_row_id = rec.get("contract_row_id")
        contract_public_id = rec.get("contract_id")
        proposal_id = rec.get("proposal_id")
        vcur.execute(
            """
            SELECT 1
            FROM invoice_payments ip
            JOIN invoices i ON i.id = ip.invoice_id
            WHERE i.side = 'client'
              AND LOWER(IFNULL(TRIM(ip.approval_status), '')) = 'approved'
              AND (
                    (i.contract_id IS NOT NULL AND i.contract_id <> '' AND (
                        i.contract_id = %s OR i.contract_id = %s
                    ))
                    OR (i.proposal_id IS NOT NULL AND i.proposal_id = %s)
                  )
            LIMIT 1
            """,
            (contract_row_id, contract_public_id, proposal_id),
        )
        return bool(vcur.fetchone())
    except Exception:
        return False


def _advance_milestone_payment_incomplete(vcur, contract_row_id, proposal_id) -> bool:
    if not contract_row_id and not proposal_id:
        return False
    try:
        inv_parts = []
        inv_params = []
        if contract_row_id:
            inv_parts.append("inv.contract_id = %s")
            inv_params.append(contract_row_id)
        if proposal_id:
            inv_parts.append("(inv.proposal_id = %s AND (inv.contract_id IS NULL OR inv.contract_id = 0))")
            inv_params.append(proposal_id)
        if inv_parts:
            w_inv = "(" + " OR ".join(inv_parts) + ")"
            vcur.execute(
                f"""
                SELECT DISTINCT inv.id
                FROM invoices inv
                INNER JOIN payment_milestones pm
                  ON pm.id = inv.milestone_id AND pm.side = 'client'
                WHERE inv.side = 'client'
                  AND {w_inv}
                  AND LOWER(IFNULL(TRIM(pm.title), '')) LIKE %s
                """,
                tuple(inv_params) + ("%advance%",),
            )
            for ir in vcur.fetchall() or []:
                inv_id = ir.get("id") if isinstance(ir, dict) else ir[0]
                vcur.execute(
                    """
                    SELECT 1 FROM invoice_payments
                    WHERE invoice_id = %s
                      AND LOWER(IFNULL(TRIM(approval_status), '')) IN ('approved', 'paid')
                    LIMIT 1
                    """,
                    (inv_id,),
                )
                if not vcur.fetchone():
                    return True

        scope_sql = []
        params = []
        if contract_row_id:
            scope_sql.append("pm.contract_id = %s")
            params.append(contract_row_id)
        if proposal_id:
            scope_sql.append("(pm.proposal_id = %s AND pm.contract_id IS NULL)")
            params.append(proposal_id)
        where_scope = "(" + " OR ".join(scope_sql) + ")"
        vcur.execute(
            f"""
            SELECT pm.id,
                   LOWER(IFNULL(TRIM(pm.status), '')) AS st
            FROM payment_milestones pm
            WHERE pm.side = 'client'
              AND LOWER(IFNULL(TRIM(pm.title), '')) LIKE %s
              AND {where_scope}
            """,
            tuple(params) + ("%advance%",),
        )
        rows = vcur.fetchall() or []
        if not rows:
            return False

        def _row_id_status(r):
            if isinstance(r, dict):
                return r.get("id"), str(r.get("st") or r.get("status") or "").strip().lower()
            return r[0], str(r[1] or "").strip().lower()

        for row in rows:
            mid, st = _row_id_status(row)
            if not mid:
                continue
            vcur.execute(
                """
                SELECT id FROM invoices
                WHERE milestone_id = %s AND side = 'client'
                ORDER BY id DESC
                LIMIT 1
                """,
                (mid,),
            )
            inv = vcur.fetchone()
            if inv:
                inv_id = inv.get("id") if isinstance(inv, dict) else inv[0]
                vcur.execute(
                    """
                    SELECT 1 FROM invoice_payments ip
                    WHERE ip.invoice_id = %s
                      AND LOWER(IFNULL(TRIM(ip.approval_status), '')) IN ('approved', 'paid')
                    LIMIT 1
                    """,
                    (inv_id,),
                )
                if vcur.fetchone():
                    continue
            if st in ("paid", "completed", "approved"):
                continue
            return True
        return False
    except Exception:
        return False


def _fetch_best_contract_row(vcur, client_id: str, project_name: str):
    base_sql = """
        SELECT
            c.id AS contract_row_id,
            c.contract_id,
            c.status AS contract_status,
            c.proposal_id,
            c.total_paid_amount,
            c.paid_date,
            c.payment_status,
            c.payment_completion_status,
            c.full_contract_data,
            b.project_type_sector,
            b.company_name
        FROM contracts c
        LEFT JOIN proposals p ON c.proposal_id = p.id
        LEFT JOIN bim_enquiry b ON p.service_id = b.id
        WHERE c.client_id = %s
          AND LOWER(IFNULL(TRIM(c.status), '')) IN ('signed', 'verified', 'awaiting signed', 'approved')
    """
    candidates = sorted(_project_name_gate_candidates(project_name), key=len, reverse=True)
    for key in candidates:
        if len(key) < 2:
            continue
        vcur.execute(
            base_sql
            + """
              AND LENGTH(TRIM(IFNULL(b.project_type_sector,''))) > 0
              AND LOWER(TRIM(b.project_type_sector)) = %s
            ORDER BY c.id DESC
            LIMIT 1
            """,
            (client_id, key),
        )
        row = vcur.fetchone()
        if row:
            return _contract_row_from(vcur, row)

    pm_key = _norm_key(project_name)
    if len(pm_key) >= 4:
        vcur.execute(
            base_sql
            + """
              AND LENGTH(TRIM(IFNULL(b.project_type_sector,''))) >= 4
              AND %s LIKE CONCAT('%%', LOWER(TRIM(b.project_type_sector)), '%%')
            ORDER BY LENGTH(TRIM(b.project_type_sector)) DESC, c.id DESC
            LIMIT 1
            """,
            (client_id, pm_key),
        )
        row = vcur.fetchone()
        if row:
            return _contract_row_from(vcur, row)

    vcur.execute(base_sql + " ORDER BY c.id DESC", (client_id,))
    all_rows = vcur.fetchall() or []
    cand = _project_name_gate_candidates(project_name)
    best_rec = None
    best_score = 0
    for row in all_rows:
        rec = _contract_row_from(vcur, row)
        sec = _norm_key(rec.get("project_type_sector") or "")
        score = 0
        if pm_key and sec:
            if pm_key == sec:
                score = 100
            elif sec in pm_key or pm_key in sec:
                score = 88
            else:
                for t in cand:
                    if len(t) < 4:
                        continue
                    if t in sec:
                        score = max(score, 78)
                if score < 78:
                    for t in cand:
                        if len(t) < 5:
                            continue
                        if t in pm_key and (t in sec or sec in pm_key):
                            score = max(score, 68)
        if score > best_score:
            best_score = score
            best_rec = rec
    if best_score >= 65 and best_rec:
        return best_rec
    return None


def compute_client_advance_gate(vcur, client_id_int: int | None, project_name: str) -> dict:
    """
    Returns:
      requires_advance_payment: bool — signed contract matched for this project/client
      advance_payment_verified: bool — internal team may proceed (advance settled)
      contract_internal_id / proposal_id: optional navigation hints
    """
    out = {
        "requires_advance_payment": False,
        "advance_payment_verified": True,
        "contract_internal_id": None,
        "proposal_id": None,
    }
    if client_id_int is None or not str(project_name or "").strip():
        return out

    client_id = str(client_id_int)
    fb = _fetch_best_contract_row(vcur, client_id, project_name)
    if not fb:
        return out

    out["requires_advance_payment"] = True
    out["contract_internal_id"] = fb.get("contract_row_id")
    out["proposal_id"] = fb.get("proposal_id")

    advance_paid = _is_advance_paid_contract_rec(fb)
    payment_approved = _has_client_invoice_payment_approved(vcur, fb)
    milestone_inc = _advance_milestone_payment_incomplete(
        vcur, fb.get("contract_row_id"), fb.get("proposal_id")
    )
    can_open = (advance_paid or payment_approved) and not milestone_inc
    out["advance_payment_verified"] = bool(can_open)
    return out


def hydrate_project_list_advance_gate(vcur, project_dicts: list[dict]) -> None:
    """Mutate each project dict with gate fields (best-effort, never raises)."""
    if not project_dicts:
        return
    try:
        for p in project_dicts:
            cid = p.get("client_id")
            try:
                cid_int = int(cid) if cid is not None and str(cid).strip().isdigit() else None
            except (TypeError, ValueError):
                cid_int = None
            pname = (p.get("project_name") or p.get("projectName") or "").strip()
            g = compute_client_advance_gate(vcur, cid_int, pname)
            p["requires_advance_payment"] = g["requires_advance_payment"]
            p["advance_payment_verified"] = g["advance_payment_verified"]
            if g.get("contract_internal_id") is not None:
                p["swiftbim_contract_internal_id"] = g["contract_internal_id"]
            if g.get("proposal_id") is not None:
                p["swiftbim_proposal_id"] = g["proposal_id"]
    except Exception:
        for p in project_dicts:
            p.setdefault("requires_advance_payment", False)
            p.setdefault("advance_payment_verified", True)
