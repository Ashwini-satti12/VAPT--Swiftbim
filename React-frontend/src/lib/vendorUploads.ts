import api from "./api";

export type UploadCategory = "image" | "document" | "task_output" | "chat";

const DANGEROUS_EXT = new Set([
  ".exe", ".dll", ".bat", ".cmd", ".com", ".msi", ".scr", ".ps1", ".vbs",
  ".js", ".mjs", ".jsp", ".php", ".phtml", ".asp", ".aspx", ".html", ".htm",
  ".svg", ".xml", ".sh", ".py", ".jar", ".sql", ".db", ".hta", ".lnk",
]);

const ALLOWED: Record<UploadCategory, Set<string>> = {
  image: new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]),
  document: new Set([
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".txt", ".rtf",
  ]),
  task_output: new Set([
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".txt", ".rtf",
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".zip", ".rar", ".7z",
    ".dwg", ".dxf", ".rvt", ".ifc", ".nwd", ".nwc",
  ]),
  chat: new Set([
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".txt",
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ]),
};

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

function fileExtension(name: string): string {
  const base = name.trim().toLowerCase();
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i) : "";
}

/** Client-side file type validation (VAPT); server enforces the same rules. */
export function validateUploadFile(
  file: File,
  category: UploadCategory = "document",
  maxBytes: number = DEFAULT_MAX_BYTES
): { ok: true } | { ok: false; message: string } {
  if (!file || !file.name) {
    return { ok: false, message: "No file provided" };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `File exceeds maximum size (${Math.floor(maxBytes / (1024 * 1024))} MB)`,
    };
  }
  const ext = fileExtension(file.name);
  if (!ext || DANGEROUS_EXT.has(ext)) {
    return { ok: false, message: "File type not allowed" };
  }
  const allowed = ALLOWED[category] ?? ALLOWED.document;
  if (!allowed.has(ext)) {
    return { ok: false, message: "File type not allowed for this upload" };
  }
  const base = file.name.split(/[/\\]/).pop() ?? "";
  if (base.includes("..")) {
    return { ok: false, message: "Invalid filename" };
  }
  return { ok: true };
}

/** Stored value from DB is a basename under uploads/vendors (or legacy path — we only use the basename). */
export function sanitizeVendorVendorsFilename(raw: string): string | null {
  const base = raw.trim().split(/[/\\]/).pop() ?? "";
  if (!base || base.includes("..")) return null;
  return base;
}

export function vendorVendorsFileUrl(fileName: string): string {
  const root = String(api.defaults.baseURL ?? "").replace(/\/$/, "");
  return `${root}/static/uploads/vendors/${encodeURIComponent(fileName)}`;
}

export type VendorCertKind = "image" | "pdf" | "other";

export function getVendorCertKind(raw: string): VendorCertKind {
  const s = sanitizeVendorVendorsFilename(raw);
  if (!s) return "other";
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(s)) return "image";
  if (/\.pdf$/i.test(s)) return "pdf";
  return "other";
}
