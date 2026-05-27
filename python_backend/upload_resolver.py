"""
Resolve uploaded files across phase-2 (PM) and phase-1 (client portal) upload roots.
Includes secure upload validation and malware scanning for VAPT.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from urllib.parse import unquote

from werkzeug.utils import secure_filename

# ---------------------------------------------------------------------------
# Secure upload — file type validation + malware scanning (VAPT)
# ---------------------------------------------------------------------------

DANGEROUS_EXTENSIONS = frozenset({
    ".exe", ".dll", ".bat", ".cmd", ".com", ".msi", ".scr", ".ps1", ".vbs",
    ".js", ".mjs", ".jsp", ".jspx", ".php", ".phtml", ".asp", ".aspx", ".cer",
    ".html", ".htm", ".xhtml", ".svg", ".xml", ".xsl", ".sh", ".bash", ".zsh",
    ".py", ".pyc", ".pyw", ".rb", ".pl", ".jar", ".war", ".class",
    ".sql", ".sqlite", ".db", ".mdb", ".reg", ".inf", ".hta", ".lnk",
    ".iso", ".img", ".dmg", ".deb", ".rpm", ".apk",
})

ALLOWED_BY_CATEGORY: dict[str, frozenset[str]] = {
    "image": frozenset({".jpg", ".jpeg", ".png", ".gif", ".webp"}),
    "document": frozenset({
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".csv", ".txt", ".rtf",
    }),
    "task_output": frozenset({
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".csv", ".txt", ".rtf",
        ".jpg", ".jpeg", ".png", ".gif", ".webp",
        ".zip", ".rar", ".7z",
        ".dwg", ".dxf", ".rvt", ".ifc", ".nwd", ".nwc",
    }),
    "chat": frozenset({
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".csv", ".txt",
        ".jpg", ".jpeg", ".png", ".gif", ".webp",
    }),
}

_MAGIC_CHECKS: list[tuple[bytes, int, str]] = [
    (b"\xff\xd8\xff", 0, "jpeg"),
    (b"\x89PNG\r\n\x1a\n", 0, "png"),
    (b"GIF87a", 0, "gif"),
    (b"GIF89a", 0, "gif"),
    (b"%PDF", 0, "pdf"),
    (b"PK\x03\x04", 0, "zip"),
    (b"PK\x05\x06", 0, "zip"),
    (b"\xd0\xcf\x11\xe0", 0, "ole"),
    (b"Rar!\x1a\x07", 0, "rar"),
    (b"7z\xbc\xaf\x27\x1c", 0, "7z"),
]

_EXECUTABLE_SIGNATURES: list[tuple[bytes, int]] = [
    (b"MZ", 0),
    (b"\x7fELF", 0),
    (b"#!/", 0),
    (b"<?php", 0),
    (b"<?=", 0),
    (b"<script", 0),
    (b"\x4d\x5a", 0),
]

_EICAR = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"


def _normalized_ext(filename: str) -> str:
    name = (filename or "").strip().lower()
    if not name or name in (".", ".."):
        return ""
    parts = name.rsplit(".", 1)
    if len(parts) < 2:
        return ""
    ext = "." + parts[1]
    if ext in DANGEROUS_EXTENSIONS:
        return ext
    base = parts[0]
    if "." in base:
        inner = "." + base.rsplit(".", 1)[1]
        if inner in DANGEROUS_EXTENSIONS:
            return inner
    return ext


def _extension_allowed(ext: str, category: str) -> bool:
    allowed = ALLOWED_BY_CATEGORY.get(category) or ALLOWED_BY_CATEGORY["document"]
    return ext in allowed


def _detect_magic_label(header: bytes, ext: str) -> str | None:
    if not header:
        return None
    if ext in (".jpg", ".jpeg") and header.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if ext == ".png" and header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if ext == ".gif" and (header.startswith(b"GIF87a") or header.startswith(b"GIF89a")):
        return "gif"
    if ext == ".webp" and len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "webp"
    if ext == ".pdf" and header.startswith(b"%PDF"):
        return "pdf"
    if ext in (".docx", ".xlsx", ".pptx", ".zip") and header.startswith(b"PK"):
        return "zip"
    if ext in (".doc", ".xls", ".ppt") and header.startswith(b"\xd0\xcf\x11\xe0"):
        return "ole"
    if ext in (".rar",) and header.startswith(b"Rar!\x1a\x07"):
        return "rar"
    if ext in (".7z",) and header.startswith(b"7z\xbc\xaf\x27\x1c"):
        return "7z"
    if ext in (".txt", ".csv", ".rtf"):
        return "text"
    for sig, _off, label in _MAGIC_CHECKS:
        if header.startswith(sig):
            return label
    return None


def _magic_matches_extension(header: bytes, ext: str) -> bool:
    if ext in (".txt", ".csv"):
        if _contains_blocked_content(header):
            return False
        return True
    if ext == ".rtf" and header.startswith(b"{\\rtf"):
        return True
    label = _detect_magic_label(header, ext)
    if not label:
        return False
    if ext in (".jpg", ".jpeg") and label == "jpeg":
        return True
    if ext == ".png" and label == "png":
        return True
    if ext == ".gif" and label == "gif":
        return True
    if ext == ".webp" and label == "webp":
        return True
    if ext == ".pdf" and label == "pdf":
        return True
    if ext in (".docx", ".xlsx", ".pptx", ".zip") and label == "zip":
        return True
    if ext in (".doc", ".xls", ".ppt") and label == "ole":
        return True
    if ext in (".rar",) and label == "rar":
        return True
    if ext in (".7z",) and label == "7z":
        return True
    if ext in (".dwg", ".dxf", ".rvt", ".ifc", ".nwd", ".nwc"):
        return not _contains_blocked_content(header)
    return False


def _contains_blocked_content(data: bytes) -> bool:
    if not data:
        return False
    lower = data[:65536].lower()
    if _EICAR in data:
        return True
    for sig, _ in _EXECUTABLE_SIGNATURES:
        if sig.lower() in lower or sig in data[:512]:
            return True
    return False


def validate_upload_file(
    file_storage,
    *,
    category: str = "document",
    max_bytes: int | None = None,
    app_config: dict | None = None,
) -> tuple[bool, str]:
    """Validate filename, extension whitelist, size, and content signature."""
    if not file_storage or not getattr(file_storage, "filename", None):
        return False, "No file provided"

    raw_name = str(file_storage.filename or "").strip()
    if not raw_name or raw_name in (".", ".."):
        return False, "Invalid filename"

    if ".." in raw_name.replace("\\", "/") or "/" in raw_name or "\\" in raw_name:
        return False, "Invalid filename path"

    ext = _normalized_ext(raw_name)
    if not ext:
        return False, "File type not allowed"
    if ext in DANGEROUS_EXTENSIONS:
        return False, "File type not allowed"
    if not _extension_allowed(ext, category):
        return False, "File type not allowed for this upload"

    cfg = app_config or {}
    limit = max_bytes if max_bytes is not None else int(cfg.get("UPLOAD_MAX_BYTES") or 25 * 1024 * 1024)
    stream = file_storage.stream
    try:
        pos = stream.tell()
    except Exception:
        pos = 0
    try:
        stream.seek(0, os.SEEK_END)
        size = stream.tell()
        stream.seek(0)
    except Exception:
        size = request_content_length(file_storage)
    if size is None:
        size = 0
    if size > limit:
        return False, f"File exceeds maximum size ({limit // (1024 * 1024)} MB)"

    header = stream.read(8192)
    try:
        stream.seek(pos)
    except Exception:
        pass

    if _contains_blocked_content(header):
        return False, "File rejected by security scan"

    if category == "image" and not _magic_matches_extension(header, ext):
        return False, "File content does not match declared image type"

    if category in ("document", "chat", "task_output") and ext not in (".txt", ".csv"):
        if not _magic_matches_extension(header, ext):
            return False, "File content does not match declared file type"

    return True, ""


def request_content_length(file_storage) -> int | None:
    try:
        return int(file_storage.content_length) if file_storage.content_length else None
    except (TypeError, ValueError):
        return None


def scan_file_for_malware(filepath: str, app_config: dict | None = None) -> tuple[bool, str]:
    """ClamAV scan when configured; always applies signature heuristics."""
    cfg = app_config or {}
    if not cfg.get("UPLOAD_MALWARE_SCAN", True):
        return True, ""

    try:
        with open(filepath, "rb") as fh:
            sample = fh.read(65536)
    except OSError as e:
        return False, f"Unable to read uploaded file: {e}"

    if _contains_blocked_content(sample):
        return False, "Malware or dangerous content detected"

    clam = (cfg.get("CLAMSCAN_PATH") or "").strip() or shutil.which("clamscan")
    if not clam:
        return True, ""

    try:
        proc = subprocess.run(
            [clam, "--no-summary", filepath],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False, "Malware scan failed"

    if proc.returncode == 1:
        return False, "Malware detected by antivirus scan"
    if proc.returncode not in (0, 1):
        return False, "Malware scan failed"
    return True, ""


def secure_save_upload(
    file_storage,
    directory: str,
    *,
    category: str = "document",
    filename: str | None = None,
    max_bytes: int | None = None,
    app_config: dict | None = None,
) -> tuple[str | None, str | None]:
    """
    Validate, scan, and save an upload.
    Returns (absolute_saved_path, error_message).
    """
    cfg = app_config or {}
    ok, err = validate_upload_file(
        file_storage,
        category=category,
        max_bytes=max_bytes,
        app_config=cfg,
    )
    if not ok:
        return None, err

    os.makedirs(directory, exist_ok=True)
    if filename:
        safe_name = secure_filename(filename)
        if not safe_name:
            return None, "Invalid filename"
    else:
        safe_name = secure_filename(file_storage.filename)
        if not safe_name:
            return None, "Invalid filename"

    ext = _normalized_ext(safe_name)
    if not ext or not _extension_allowed(ext, category):
        return None, "File type not allowed"

    dest = os.path.join(directory, safe_name)
    dest_dir = os.path.abspath(directory)
    dest_abs = os.path.abspath(dest)
    if not dest_abs.startswith(dest_dir + os.sep) and dest_abs != dest_dir:
        return None, "Invalid upload path"

    fd, tmp_path = tempfile.mkstemp(prefix="sb_upload_", dir=directory)
    os.close(fd)
    try:
        file_storage.save(tmp_path)
        clean, scan_err = scan_file_for_malware(tmp_path, cfg)
        if not clean:
            return None, scan_err or "File rejected by security scan"
        if os.path.exists(dest):
            os.remove(dest)
        os.replace(tmp_path, dest)
        return dest, None
    except Exception:
        return None, "Failed to save upload"
    finally:
        if os.path.isfile(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


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
