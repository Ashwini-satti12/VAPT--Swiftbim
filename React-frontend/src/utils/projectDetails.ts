/** Shared helpers for project detail panels (location, documents, dates). */

export type ProjectDocumentItem = {
  id?: number | null;
  fileUrl: string;
  originalFilename?: string;
  uploadedAt?: string;
};

export type ProjectWithDocuments = {
  document_attachment?: string | null;
  attachments?: ProjectDocumentItem[] | null;
  source?: string | null;
};

export function isOutsourceProject(source?: string | null): boolean {
  return String(source || "").trim().toLowerCase() === "outsource";
}

export function resolveProjectDocumentHref(
  fileRef: string,
  apiBaseUrl: string,
  source?: string | null,
): string {
  const ref = String(fileRef || "").trim();
  if (!ref) return "";
  if (/^https?:\/\//i.test(ref)) return ref;

  const base = String(apiBaseUrl || "")
    .replace(/\/+$/, "")
    .replace(/\/api\/?$/i, "");

  if (ref.startsWith("/static/") || ref.startsWith("/uploads/")) {
    return `${base}${ref}`;
  }
  if (ref.startsWith("static/") || ref.startsWith("uploads/")) {
    return `${base}/${ref}`;
  }

  if (isOutsourceProject(source)) {
    return `${base}/static/uploads/vendor_docs/${encodeURIComponent(ref)}`;
  }
  if (ref.includes("/")) {
    return `${base}/${ref.replace(/^\/+/, "")}`;
  }
  return `${base}/uploads/${encodeURIComponent(ref)}`;
}

export function parseAttachmentsField(
  raw: unknown,
): ProjectDocumentItem[] | undefined {
  if (Array.isArray(raw)) {
    return raw.filter((a) => a && typeof a === "object" && (a as ProjectDocumentItem).fileUrl) as ProjectDocumentItem[];
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a) => a?.fileUrl) as ProjectDocumentItem[];
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

/** Human-readable label — never use split('_').pop() (that turns hash_Screenshot_..._PM.png into PM.png). */
export function displayAttachmentFilename(
  fileUrl: string,
  originalFilename?: string | null,
): string {
  if (originalFilename && String(originalFilename).trim()) {
    return String(originalFilename).trim();
  }
  const base = fileUrl.split("/").pop() || fileUrl;
  const hashPrefix = /^[0-9a-f]{16,}_(.+)$/i.exec(base);
  if (hashPrefix?.[1]) {
    return hashPrefix[1];
  }
  return base || "Document";
}

export function getProjectDocumentItems(
  project: ProjectWithDocuments | null | undefined,
): ProjectDocumentItem[] {
  if (!project) return [];

  const fromAttachments =
    parseAttachmentsField(project.attachments) ??
    (Array.isArray(project.attachments)
      ? project.attachments.filter((a) => a?.fileUrl)
      : []);

  if (fromAttachments.length > 0) {
    return fromAttachments.map((a, idx) => ({
      ...a,
      id: a.id ?? idx,
      originalFilename: displayAttachmentFilename(
        a.fileUrl,
        a.originalFilename,
      ),
    }));
  }

  const raw = String(project.document_attachment || "").trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((fileUrl, idx) => ({
      id: idx,
      fileUrl,
      originalFilename: displayAttachmentFilename(fileUrl),
    }));
}

export function formatProjectEndDate(
  endDate?: string | null,
  locale = "en-GB",
): string {
  const raw = String(endDate || "").trim();
  if (!raw) return "N/A";

  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return "N/A";

  return new Date(parsed).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatProjectLocationDisplay(
  location?: string | null,
): string {
  const s = String(location || "").trim();
  if (!s) return "N/A";
  const lower = s.toLowerCase();
  if (lower in { empty: 1, none: 1, null: 1, "n/a": 1, na: 1 }) return "N/A";
  return s;
}
