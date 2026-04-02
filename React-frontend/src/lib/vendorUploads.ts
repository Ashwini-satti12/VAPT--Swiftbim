import api from "./api";

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
