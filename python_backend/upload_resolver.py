"""
Resolve uploaded files across phase-2 (PM) and phase-1 (client portal) upload roots.
"""
from __future__ import annotations

import os
import re
from urllib.parse import unquote

from werkzeug.utils import secure_filename


def normalize_upload_relative_path(url_or_path: str) -> str:
    """Strip URL/static prefix; return path relative to uploads root (may include subdirs)."""
    u = unquote(str(url_or_path or "").strip())
    if not u:
        return ""
    if u.startswith("http://") or u.startswith("https://"):
        for marker in ("/static/uploads/", "/uploads/"):
            idx = u.find(marker)
            if idx >= 0:
                u = u[idx + len(marker) :]
                break
        else:
            return os.path.basename(u)
    for prefix in (
        "/static/uploads/",
        "static/uploads/",
        "/uploads/",
        "uploads/",
    ):
        if u.startswith(prefix):
            u = u[len(prefix) :]
            break
    return u.lstrip("/")


def phase1_upload_folder_default() -> str:
    env = (os.getenv("PHASE1_UPLOAD_FOLDER") or os.getenv("SWIFTBIM_PHASE1_UPLOAD_FOLDER") or "").strip()
    if env:
        return os.path.abspath(env)
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(os.path.expanduser("~"), "Downloads/Swifterz_landingpage/backend/uploads"),
        os.path.normpath(os.path.join(here, "../../../Swifterz_landingpage/backend/uploads")),
        os.path.normpath(os.path.join(here, "../../Swifterz_landingpage/backend/uploads")),
    ]
    for path in candidates:
        if path and os.path.isdir(path):
            return os.path.abspath(path)
    return ""


def iter_upload_roots(app_config: dict) -> list[str]:
    roots: list[str] = []
    primary = (app_config.get("UPLOAD_FOLDER") or "").strip()
    if primary:
        roots.append(os.path.abspath(primary))
    phase1 = (app_config.get("PHASE1_UPLOAD_FOLDER") or "").strip()
    if phase1:
        p1 = os.path.abspath(phase1)
        if p1 not in roots and os.path.isdir(p1):
            roots.append(p1)
    return roots


def _basename_candidates(basename: str) -> list[str]:
    candidates: list[str] = []
    for name in (basename, unquote(basename)):
        if not name:
            continue
        candidates.append(name)
        sf = secure_filename(name)
        if sf and sf not in candidates:
            candidates.append(sf)
        if name.startswith(("TL_", "GST_")):
            no_prefix = name.split("_", 1)[1] if "_" in name else name
            if no_prefix and no_prefix not in candidates:
                candidates.append(no_prefix)
            sf_no_prefix = secure_filename(no_prefix)
            if sf_no_prefix and sf_no_prefix not in candidates:
                candidates.append(sf_no_prefix)
    seen: set[str] = set()
    out: list[str] = []
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out


def _safe_join(root: str, *parts: str) -> str | None:
    root_abs = os.path.abspath(root)
    full = os.path.abspath(os.path.join(root_abs, *parts))
    if full == root_abs or full.startswith(root_abs + os.sep):
        return full
    return None


def find_upload_file(
    app_config: dict,
    requested: str,
    preferred_subdirs: list[str] | None = None,
) -> tuple[str, str] | None:
    """
    Locate a file under any configured upload root.
    Returns (directory, filename) for Flask send_from_directory.
    """
    rel = normalize_upload_relative_path(requested)
    if not rel:
        return None

    subdirs = preferred_subdirs if preferred_subdirs is not None else ["", "enquiries"]
    basename = os.path.basename(rel)
    name_candidates = _basename_candidates(basename)

    for root in iter_upload_roots(app_config):
        # Full relative path (e.g. enquiries/enquiry_39_abc.png)
        if "/" in rel or "\\" in rel:
            rel_parts = rel.replace("\\", "/").split("/")
            full = _safe_join(root, *rel_parts)
            if full and os.path.isfile(full):
                return os.path.dirname(full), os.path.basename(full)

        for sub_dir in subdirs:
            target_dir = os.path.join(root, sub_dir) if sub_dir else root
            if not os.path.isdir(target_dir):
                continue
            for c in name_candidates:
                full = os.path.join(target_dir, c)
                if os.path.isfile(full):
                    return target_dir, c

        # enquiry_<id>_<hash>_<name> may live only under enquiries/
        m = re.match(r"^enquiry_(\d+)_([0-9a-f]+)_(.+)$", basename, re.I)
        if m:
            enq_name = f"enquiry_{m.group(1)}_{m.group(2)}_{m.group(3)}"
            enq_dir = os.path.join(root, "enquiries")
            if os.path.isfile(os.path.join(enq_dir, enq_name)):
                return enq_dir, enq_name

    return None
