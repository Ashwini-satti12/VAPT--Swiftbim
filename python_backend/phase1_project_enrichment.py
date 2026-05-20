"""
Phase-1 (new_swiftbim) enrichment for PM projects: location, documents, dates.
"""
from __future__ import annotations

import json
import os
import re


def _as_int_id(val):
    if val is None:
        return None
    try:
        s = str(val).strip()
        if not s or not s.isdigit():
            return None
        return int(s)
    except Exception:
        return None


def _is_blank_location_part(value) -> bool:
    if value is None:
        return True
    s = str(value).strip().lower()
    return s in {"", "none", "null", "undefined", "n/a", "na", "empty", "-"}


def _normalize_pm_gate_key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).strip()


def _project_name_gate_candidates(project_name: str) -> list[str]:
    s = (project_name or "").strip()
    out: list[str] = []
    if s:
        out.append(_normalize_pm_gate_key(s))
        if "-" in s:
            parts = s.split("-", 1)
            if parts[0].strip():
                out.append(_normalize_pm_gate_key(parts[0]))
            if len(parts) > 1 and parts[1].strip():
                out.append(_normalize_pm_gate_key(parts[1]))
    return list(dict.fromkeys([x for x in out if x]))


def _first_nonempty(row: dict, keys: list[str]) -> str:
    for k in keys:
        if k in row and row.get(k) not in (None, "", "NULL"):
            v = row.get(k)
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                return str(int(v) if v == int(v) else v)
            return str(v).strip()
    return ""


def format_enquiry_location(enq_row: dict | None) -> str:
    if not enq_row:
        return ""
    parts = []
    for k in ("address", "city", "state", "country"):
        v = enq_row.get(k)
        if not _is_blank_location_part(v):
            parts.append(str(v).strip())
    if parts:
        return ", ".join(parts)
    pl = enq_row.get("project_location")
    if not _is_blank_location_part(pl):
        return str(pl).strip()
    return ""


def _absolute_attachment_path(url: str) -> str:
    from upload_resolver import normalize_upload_relative_path

    u = str(url or "").strip()
    if not u:
        return ""
    if u.startswith("http://") or u.startswith("https://"):
        return u
    if u.startswith("/static/uploads/") or u.startswith("/uploads/"):
        return u
    if u.startswith("static/uploads/") or u.startswith("uploads/"):
        return "/" + u.lstrip("/")
    rel = normalize_upload_relative_path(u)
    if rel:
        return f"/static/uploads/{rel}"
    return f"/static/uploads/{u.lstrip('/')}"


def _display_filename_from_path(path: str, fallback: str | None = None) -> str:
    base = os.path.basename(str(path or "").strip())
    if fallback and str(fallback).strip():
        fb = str(fallback).strip()
        if fb.lower() not in {"pm.png", "pm.jpg", "pm.jpeg"}:
            return fb
    m = re.match(r"^enquiry_\d+_[0-9a-f]{8,}_(.+)$", base, re.I)
    if m:
        return m.group(1) or base
    if re.match(r"^[0-9a-f]{16,}_", base, re.I) and "_" in base:
        return base.split("_", 1)[1] or base
    return base or "Document"


def _normalize_enquiry_attachments(raw_value):
    normalized = []
    seen = set()

    def _add(url, name=None, uploaded_at=""):
        full = _absolute_attachment_path(url)
        if not full:
            return
        key = full.lower()
        if key in seen:
            return
        seen.add(key)
        normalized.append(
            {
                "fileUrl": full,
                "originalFilename": _display_filename_from_path(
                    full, str(name) if name else None
                ),
                "uploadedAt": str(uploaded_at or ""),
            }
        )

    def _walk(value, depth=0):
        if depth > 8 or value is None:
            return
        if isinstance(value, list):
            for item in value:
                _walk(item, depth + 1)
            return
        if isinstance(value, dict):
            url = value.get("fileUrl") or value.get("url")
            if url is not None:
                url_text = str(url).strip()
                if url_text.startswith("{") or url_text.startswith("["):
                    try:
                        _walk(json.loads(url_text), depth + 1)
                    except Exception:
                        pass
                _add(
                    url_text,
                    value.get("originalFilename") or value.get("name"),
                    value.get("uploadedAt") or "",
                )
                return
            for v in value.values():
                _walk(v, depth + 1)
            return
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return
            if text.startswith("{") or text.startswith("["):
                try:
                    _walk(json.loads(text), depth + 1)
                    return
                except Exception:
                    pass
            _add(text, os.path.basename(text), "")

    _walk(raw_value, 0)
    return normalized


def _fetch_enquiry_attachment_items(vendor_cur, enquiry_id: int) -> list[dict]:
    if not enquiry_id:
        return []
    try:
        vendor_cur.execute("SHOW COLUMNS FROM bim_enquiry LIKE 'attachments'")
        has_attachments = bool(vendor_cur.fetchone())
        cols = "attachments, upload_file" if has_attachments else "upload_file"
        vendor_cur.execute(
            f"SELECT {cols} FROM bim_enquiry WHERE id = %s LIMIT 1",
            (enquiry_id,),
        )
        row = vendor_cur.fetchone() or {}
    except Exception:
        return []

    items: list[dict] = []
    seen = set()

    def _add_item(entry: dict):
        url = entry.get("fileUrl") or ""
        key = url.lower()
        if key and key not in seen:
            seen.add(key)
            items.append(entry)

    if row.get("upload_file") and str(row.get("upload_file")).strip():
        raw_upload = str(row["upload_file"]).strip()
        u = _absolute_attachment_path(raw_upload)
        if not u.startswith("http") and enquiry_id:
            from upload_resolver import find_upload_file
            from flask import current_app

            try:
                cfg = current_app.config
                found = find_upload_file(cfg, raw_upload, ["", "enquiries"])
                if found:
                    _dir, fname = found
                    if "enquiries" in _dir.replace("\\", "/"):
                        u = f"/static/uploads/enquiries/{fname}"
                    else:
                        u = f"/static/uploads/{fname}"
            except Exception:
                pass
        _add_item(
            {
                "id": len(items) + 1,
                "fileUrl": u,
                "originalFilename": _display_filename_from_path(raw_upload),
                "uploadedAt": "",
                "source": "client",
                "removable": False,
            }
        )

    if has_attachments:
        for entry in _normalize_enquiry_attachments(row.get("attachments")):
            entry["id"] = len(items) + 1
            entry["source"] = "client"
            entry["removable"] = False
            _add_item(entry)

    return items


def _fetch_contract_chain_by_project_name(vendor_cur, client_id: int, project_name: str):
    candidates = sorted(_project_name_gate_candidates(project_name), key=len, reverse=True)
    base_sql = """
        SELECT c.*, p.id AS prop_table_id, p.service_id, p.commercial_offer, p.selected_currency,
               b.*
        FROM contracts c
        LEFT JOIN proposals p ON c.proposal_id = p.id
        LEFT JOIN bim_enquiry b ON p.service_id = b.id
        WHERE c.client_id = %s
          AND LOWER(IFNULL(TRIM(c.status), '')) IN (
              'signed', 'verified', 'awaiting signed', 'approved'
          )
    """
    for key in candidates:
        if len(key) < 2:
            continue
        vendor_cur.execute(
            base_sql
            + """
              AND LENGTH(TRIM(IFNULL(b.project_type_sector,''))) > 0
              AND LOWER(TRIM(b.project_type_sector)) = %s
            ORDER BY c.id DESC
            LIMIT 1
            """,
            (client_id, key),
        )
        row = vendor_cur.fetchone()
        if row:
            return row

    pm_key = _normalize_pm_gate_key(project_name)
    if len(pm_key) >= 4:
        vendor_cur.execute(
            base_sql
            + """
              AND LENGTH(TRIM(IFNULL(b.project_type_sector,''))) >= 4
              AND %s LIKE CONCAT('%%', LOWER(TRIM(b.project_type_sector)), '%%')
            ORDER BY LENGTH(TRIM(b.project_type_sector)) DESC, c.id DESC
            LIMIT 1
            """,
            (client_id, pm_key),
        )
        row = vendor_cur.fetchone()
        if row:
            return row

    return None


def fetch_phase1_chain(vendor_cur, project: dict) -> tuple[dict, dict, dict]:
    enq: dict = {}
    prop: dict = {}
    con: dict = {}
    client_id = _as_int_id(project.get("client_id"))
    project_name = (project.get("project_name") or "").strip()

    if client_id is not None and project_name:
        matched = _fetch_contract_chain_by_project_name(vendor_cur, client_id, project_name)
        if matched:
            con = {k: v for k, v in matched.items() if not str(k).startswith("prop_")}
            sid = _as_int_id(matched.get("service_id"))
            if sid:
                vendor_cur.execute("SELECT * FROM bim_enquiry WHERE id = %s LIMIT 1", (sid,))
                enq = vendor_cur.fetchone() or {}
            pid = _as_int_id(matched.get("proposal_id") or matched.get("prop_table_id"))
            if pid:
                vendor_cur.execute("SELECT * FROM proposals WHERE id = %s LIMIT 1", (pid,))
                prop = vendor_cur.fetchone() or {}

    if client_id is not None and not enq:
        try:
            vendor_cur.execute(
                "SELECT * FROM contracts WHERE client_id = %s ORDER BY id DESC LIMIT 1",
                (client_id,),
            )
            con = vendor_cur.fetchone() or con
            pid = _as_int_id(con.get("proposal_id")) if con else None
            if pid:
                vendor_cur.execute("SELECT * FROM proposals WHERE id = %s LIMIT 1", (pid,))
                prop = vendor_cur.fetchone() or prop
        except Exception:
            pass

    if not prop and client_id is not None:
        try:
            vendor_cur.execute("SELECT email FROM users WHERE id = %s LIMIT 1", (client_id,))
            u = vendor_cur.fetchone() or {}
            email = (u.get("email") or "").strip()
            if email:
                vendor_cur.execute(
                    "SELECT * FROM proposals WHERE email_address = %s ORDER BY id DESC LIMIT 1",
                    (email,),
                )
                prop = vendor_cur.fetchone() or prop
                vendor_cur.execute(
                    "SELECT * FROM bim_enquiry WHERE email_address = %s ORDER BY id DESC LIMIT 1",
                    (email,),
                )
                enq_by_email = vendor_cur.fetchone() or {}
                if enq_by_email and not enq:
                    enq = enq_by_email
        except Exception:
            pass

    sid = _as_int_id(prop.get("service_id")) if prop else None
    if sid and not enq:
        try:
            vendor_cur.execute("SELECT * FROM bim_enquiry WHERE id = %s LIMIT 1", (sid,))
            enq = vendor_cur.fetchone() or {}
        except Exception:
            pass

    if not enq and client_id is not None:
        try:
            vendor_cur.execute(
                "SELECT enquiry_service_id FROM users WHERE id = %s LIMIT 1",
                (client_id,),
            )
            urow = vendor_cur.fetchone() or {}
            digits = re.sub(r"\D", "", str(urow.get("enquiry_service_id") or ""))
            if digits:
                vendor_cur.execute(
                    "SELECT * FROM bim_enquiry WHERE id = %s LIMIT 1",
                    (int(digits),),
                )
                enq = vendor_cur.fetchone() or {}
        except Exception:
            pass

    return enq, prop, con


def _is_pm_document_stub(path: str) -> bool:
    """Skip generic placeholder filenames (PM.png) when real enquiry uploads exist."""
    base = os.path.basename(str(path or "").strip())
    if not base:
        return True
    lower = base.lower()
    if re.match(r"^[0-9a-f]{16,}_", lower):
        return False
    if "/static/uploads/" in str(path) and "_" in base:
        return False
    if lower in {
        "pm.png",
        "pm.jpeg",
        "pm.jpg",
        "document.pdf",
        "document.png",
        "document.jpeg",
    }:
        return True
    return False


def _pm_document_item(path: str, next_id: int) -> dict:
    ref = str(path or "").strip()
    if not ref:
        return {}
    if ref.startswith("http://") or ref.startswith("https://"):
        url = ref
    elif ref.startswith("/"):
        url = ref
    elif ref.startswith("static/") or ref.startswith("uploads/"):
        url = "/" + ref.lstrip("/")
        if url.startswith("/uploads/"):
            url = "/static/uploads/" + url[len("/uploads/") :]
    else:
        url = f"/static/uploads/{ref.lstrip('/')}"
    base = os.path.basename(ref)
    name = base
    if re.match(r"^[0-9a-f]{16,}_", base, re.I):
        name = base.split("_", 1)[1] or base
    return {
        "id": next_id,
        "fileUrl": url,
        "originalFilename": name,
        "uploadedAt": "",
    }


def merge_project_documents(project: dict, enq_row: dict, vendor_cur) -> None:
    """Merge PM project files + bim_enquiry uploads into attachments (phase-1 parity)."""
    pm_raw = str(project.get("document_attachment") or "").strip()
    pm_paths = [p.strip() for p in pm_raw.split(",") if p.strip()]

    enquiry_id = _as_int_id(enq_row.get("id")) if enq_row else None
    enquiry_items = _fetch_enquiry_attachment_items(vendor_cur, enquiry_id) if enquiry_id else []

    items: list[dict] = []
    seen: set[str] = set()

    def _add_item(entry: dict):
        url = str(entry.get("fileUrl") or "").strip()
        if not url:
            return
        key = url.lower()
        if key in seen:
            return
        seen.add(key)
        entry = dict(entry)
        entry["id"] = len(items) + 1
        items.append(entry)

    has_enquiry_files = len(enquiry_items) > 0
    for entry in enquiry_items:
        tagged = dict(entry)
        tagged["source"] = "client"
        tagged["removable"] = False
        _add_item(tagged)

    team_urls: list[str] = []
    for pth in pm_paths:
        if has_enquiry_files and _is_pm_document_stub(pth):
            continue
        item = _pm_document_item(pth, len(items) + 1)
        if item:
            item["source"] = "team"
            item["removable"] = True
            team_urls.append(str(item.get("fileUrl") or ""))
            _add_item(item)

    project["attachments"] = items
    # document_attachment column stores in-house uploads only (not client enquiry files)
    if team_urls:
        project["document_attachment"] = ",".join(u for u in team_urls if u)
    elif pm_raw:
        project["document_attachment"] = pm_raw


def enrich_project_from_phase1(
    project: dict,
    vendor_cur,
    *,
    proposal_res_cols: list[str] | None = None,
    start_cols: list[str] | None = None,
    duration_cols: list[str] | None = None,
    parse_iso_date=None,
    add_months=None,
    duration_to_months=None,
) -> None:
    if proposal_res_cols is None:
        proposal_res_cols = ["resources"]
    if start_cols is None:
        start_cols = ["projectstart_date", "project_start_date", "start_date", "startDate"]
    if duration_cols is None:
        duration_cols = [
            "completion_timeline",
            "project_completion_time",
            "completion_time",
            "project_duration",
            "duration",
        ]

    enq_row, prop_row, _con_row = fetch_phase1_chain(vendor_cur, project)

    prop_resources = _first_nonempty(prop_row, [c for c in proposal_res_cols if c in prop_row])
    if prop_resources and not project.get("resources") and not project.get("no_resource"):
        project["resources"] = prop_resources
        project["required_resources"] = prop_resources

    combined_loc = format_enquiry_location(enq_row)
    pm_loc = str(project.get("location") or "").strip()
    if combined_loc:
        project["location"] = combined_loc
    elif _is_blank_location_part(pm_loc):
        project["location"] = ""

    merge_project_documents(project, enq_row, vendor_cur)

    if not parse_iso_date or not add_months or not duration_to_months:
        return

    start_dt = parse_iso_date(project.get("start_date") or project.get("startDate"))
    if not start_dt:
        start_dt = (
            parse_iso_date(_first_nonempty(enq_row, ["projectstart_date"]))
            or parse_iso_date(_first_nonempty(enq_row, [c for c in start_cols if c in enq_row]))
            or parse_iso_date(_first_nonempty(prop_row, [c for c in start_cols if c in prop_row]))
        )
        if start_dt and not project.get("start_date"):
            project["start_date"] = start_dt.isoformat()

    end_dt = parse_iso_date(project.get("end_date"))
    if not end_dt:
        end_dt = parse_iso_date(project.get("due_date"))
    duration_text = (
        _first_nonempty(enq_row, [c for c in duration_cols if c in enq_row])
        or _first_nonempty(prop_row, [c for c in duration_cols if c in prop_row])
        or str(project.get("due_date") or "").strip()
    )
    months = duration_to_months(duration_text)
    if months is not None and start_dt and not end_dt:
        computed = add_months(start_dt, months)
        project["end_date"] = computed.isoformat()
        if not parse_iso_date(project.get("due_date")):
            project["due_date"] = computed.isoformat()
