/** Shared helpers for project detail panels (location, documents, dates). */

export type ProjectDocumentItem = {
  id?: number | null;
  fileUrl: string;
  originalFilename?: string;
  uploadedAt?: string;
  source?: "client" | "team";
  removable?: boolean;
};

export type ProjectWithDocuments = {
  document_attachment?: string | null;
  attachments?: ProjectDocumentItem[] | null;
  source?: string | null;
};

export function isOutsourceProject(source?: string | null): boolean {
  return String(source || "").trim().toLowerCase() === "outsource";
}

/** Normalize stored path (fix legacy double prefixes). */
export function normalizeDocumentRef(fileRef: string): string {
  let ref = String(fileRef || "").trim();
  if (!ref) return "";
  ref = ref.replace(/^\/uploads\/static\/uploads\//i, "/static/uploads/");
  ref = ref.replace(/^uploads\/static\/uploads\//i, "/static/uploads/");
  if (ref.startsWith("/uploads/") && !ref.startsWith("/uploads/static")) {
    ref = `/static/uploads/${ref.slice("/uploads/".length)}`;
  }
  if (ref.startsWith("static/uploads/")) {
    ref = `/${ref}`;
  }
  if (ref.startsWith("uploads/") && !ref.startsWith("uploads/static")) {
    ref = `/static/uploads/${ref.slice("uploads/".length)}`;
  }
  return ref;
}

export function isClientUploadedDocument(
  fileUrl: string,
  item?: Pick<ProjectDocumentItem, "source"> | null,
): boolean {
  if (item?.source === "client") return true;
  if (item?.source === "team") return false;
  const u = normalizeDocumentRef(fileUrl).toLowerCase();
  const base = u.split("/").pop() || u;
  return u.includes("/enquiries/") || /^enquiry_\d+_/.test(base);
}

export function resolveProjectDocumentHref(
  fileRef: string,
  apiBaseUrl: string,
  source?: string | null,
): string {
  const ref = normalizeDocumentRef(fileRef);
  if (!ref) return "";
  if (/^https?:\/\//i.test(ref)) return ref;

  const base = String(apiBaseUrl || "")
    .replace(/\/+$/, "")
    .replace(/\/api\/?$/i, "");

  if (ref.startsWith("/static/") || ref.startsWith("/uploads/")) {
    return `${base}${ref.startsWith("/uploads/") ? normalizeDocumentRef(ref) : ref}`;
  }
  if (ref.startsWith("static/") || ref.startsWith("uploads/")) {
    return `${base}/${normalizeDocumentRef(ref).replace(/^\//, "")}`;
  }

  if (ref.includes("vendor_docs/")) {
    const tail = ref.replace(/^.*vendor_docs\/?/i, "");
    return `${base}/static/uploads/vendor_docs/${encodeURIComponent(tail)}`;
  }

  if (isOutsourceProject(source)) {
    // PM/TD uploads: /static/uploads/<uuid>_file.png — served from upload root (not vendor_docs only).
    if (ref.startsWith("/static/uploads/") || ref.startsWith("static/uploads/")) {
      return `${base}${normalizeDocumentRef(ref)}`;
    }
    if (/^[0-9a-f]{16,}_/i.test(ref) || ref.includes("/")) {
      return `${base}/static/uploads/${encodeURIComponent(ref.replace(/^\/+/, ""))}`;
    }
    return `${base}/static/uploads/vendor_docs/${encodeURIComponent(ref)}`;
  }
  if (ref.includes("/")) {
    return `${base}/${ref.replace(/^\/+/, "")}`;
  }
  return `${base}/static/uploads/${encodeURIComponent(ref)}`;
}

/** API origin for project file links (no /api suffix). */
export function getProjectApiBase(apiBaseUrl?: string): string {
  const raw = apiBaseUrl ?? "";
  return String(raw)
    .replace(/\/+$/, "")
    .replace(/\/api\/?$/i, "");
}

export function parseAttachmentsField(
  raw: unknown,
): ProjectDocumentItem[] | undefined {
  if (Array.isArray(raw)) {
    return raw.filter(
      (a) => a && typeof a === "object" && (a as ProjectDocumentItem).fileUrl,
    ) as ProjectDocumentItem[];
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
  const enquiry = /^enquiry_\d+_[0-9a-f]{8,}_(.+)$/i.exec(base);
  if (enquiry?.[1]) return enquiry[1];
  const hashPrefix = /^[0-9a-f]{16,}_(.+)$/i.exec(base);
  if (hashPrefix?.[1]) {
    return hashPrefix[1];
  }
  return base || "Document";
}

function expandCommaSeparatedAttachments(
  items: ProjectDocumentItem[],
): ProjectDocumentItem[] {
  const out: ProjectDocumentItem[] = [];
  const seen = new Set<string>();
  for (const a of items) {
    const url = String(a.fileUrl || "").trim();
    if (!url) continue;
    const refs =
      url.includes(",") && !/^https?:\/\//i.test(url)
        ? url.split(",").map((s) => s.trim()).filter(Boolean)
        : [url];
    for (const fileUrl of refs) {
      const norm = normalizeDocumentRef(fileUrl);
      const key = norm.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const isClient = isClientUploadedDocument(norm, a);
      out.push({
        ...a,
        fileUrl: norm,
        originalFilename: displayAttachmentFilename(
          norm,
          a.originalFilename,
        ),
        source: a.source ?? (isClient ? "client" : "team"),
        removable:
          a.removable ?? (a.source === "client" ? false : !isClient),
      });
    }
  }
  return out;
}

export type ProjectEditDocumentsSplit = {
  clientViewOnly: ProjectDocumentItem[];
  teamEditable: ProjectDocumentItem[];
  all: ProjectDocumentItem[];
};

export function splitProjectEditDocuments(
  project: ProjectWithDocuments | null | undefined,
): ProjectEditDocumentsSplit {
  const all = getProjectDocumentItems(project);
  const clientViewOnly: ProjectDocumentItem[] = [];
  const teamEditable: ProjectDocumentItem[] = [];
  for (const doc of all) {
    const isClient =
      doc.removable === false ||
      doc.source === "client" ||
      isClientUploadedDocument(doc.fileUrl, doc);
    if (isClient) {
      clientViewOnly.push({ ...doc, source: "client", removable: false });
    } else {
      teamEditable.push({ ...doc, source: "team", removable: true });
    }
  }
  return { clientViewOnly, teamEditable, all };
}

/** Team file refs for document_attachment save (in-house uploads only). */
export function getProjectTeamFileRefs(
  project: ProjectWithDocuments | null | undefined,
): string[] {
  return splitProjectEditDocuments(project).teamEditable.map((d) => d.fileUrl);
}

/** @deprecated Use splitProjectEditDocuments().teamEditable fileUrls */
export function getProjectDocumentFileRefs(
  project: ProjectWithDocuments | null | undefined,
): string[] {
  return getProjectTeamFileRefs(project);
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
    return expandCommaSeparatedAttachments(
      fromAttachments.map((a, idx) => ({
        ...a,
        id: a.id ?? idx,
        originalFilename: displayAttachmentFilename(
          a.fileUrl,
          a.originalFilename,
        ),
      })),
    ).map((a, idx) => ({ ...a, id: idx }));
  }

  const raw = String(project.document_attachment || "").trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((fileUrl, idx) => {
      const norm = normalizeDocumentRef(fileUrl);
      const isClient = isClientUploadedDocument(norm);
      return {
        id: idx,
        fileUrl: norm,
        originalFilename: displayAttachmentFilename(norm),
        source: isClient ? ("client" as const) : ("team" as const),
        removable: !isClient,
      };
    });
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
