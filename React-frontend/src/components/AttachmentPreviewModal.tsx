import { useState, useEffect } from "react";

const TEXT_MAX_BYTES = 2 * 1024 * 1024;

function previewKind(file: File): "image" | "pdf" | "video" | "audio" | "text" | "unsupported" {
  const t = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("text/")) return "text";
  if (/\.(txt|csv|json|xml|md|log|tsv|yaml|yml|htm|html)$/i.test(file.name)) return "text";
  if (!t || t === "application/octet-stream") {
    const ext = name.split(".").pop() ?? "";
    if (ext === "pdf") return "pdf";
    if (["txt", "csv", "json", "md", "log", "xml", "yaml", "yml", "htm", "html"].includes(ext)) return "text";
  }
  return "unsupported";
}

export function AttachmentPreviewModal({
  file,
  onClose,
}: {
  file: File | null;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState(false);
  const [textLoading, setTextLoading] = useState(false);

  const kind = file ? previewKind(file) : "unsupported";

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setTextContent(null);
      setTextError(false);
      setTextLoading(false);
      return;
    }

    const k = previewKind(file);

    if (k === "text") {
      setPreviewUrl(null);
      if (file.size > TEXT_MAX_BYTES) {
        setTextContent(null);
        setTextError(true);
        setTextLoading(false);
        return;
      }
      setTextError(false);
      setTextContent(null);
      setTextLoading(true);
      const reader = new FileReader();
      reader.onload = () => {
        setTextLoading(false);
        setTextContent(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => {
        setTextLoading(false);
        setTextContent(null);
        setTextError(true);
      };
      reader.readAsText(file);
      return () => {
        reader.abort();
      };
    }

    setTextContent(null);
    setTextError(false);
    setTextLoading(false);

    if (k === "unsupported") {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file) return null;

  const needsBlobPreview =
    kind === "image" || kind === "pdf" || kind === "video" || kind === "audio";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Attachment preview"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-[#F8F8F8]">
          <span className="text-sm font-medium text-[#353535] truncate max-w-[70vw]" title={file.name}>
            {file.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center min-h-[200px] bg-[#FAFAFA]">
          {kind === "image" && previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-full max-h-[75vh] object-contain rounded"
            />
          ) : kind === "pdf" && previewUrl ? (
            <iframe
              title={file.name}
              src={previewUrl}
              className="w-full min-h-[75vh] rounded border border-slate-200 bg-white"
            />
          ) : kind === "video" && previewUrl ? (
            <video src={previewUrl} controls className="max-w-full max-h-[75vh] rounded" playsInline />
          ) : kind === "audio" && previewUrl ? (
            <audio src={previewUrl} controls className="w-full max-w-md" />
          ) : kind === "text" && textLoading ? (
            <p className="text-sm text-[#6B7280]">Loading preview…</p>
          ) : kind === "text" && textContent !== null && !textError ? (
            <pre className="w-full max-h-[75vh] overflow-auto text-left text-sm text-[#353535] whitespace-pre-wrap break-words font-mono bg-white border border-slate-200 rounded p-4">
              {textContent}
            </pre>
          ) : kind === "text" && (textError || file.size > TEXT_MAX_BYTES) ? (
            <div className="flex flex-col items-center justify-center gap-4 text-[#6B7280]">
              <p className="text-sm text-center text-[#353535] max-w-md">
                {file.size > TEXT_MAX_BYTES
                  ? "This file is too large to preview here."
                  : "Could not read this file as text."}
              </p>
              <OpenBlobButton file={file} label="Open in new tab" />
            </div>
          ) : kind === "unsupported" ? (
            <div className="flex flex-col items-center justify-center gap-4 text-[#6B7280]">
              <p className="text-sm text-center text-[#353535] max-w-md">
                Preview isn’t available in the browser for this file type.
              </p>
              <OpenBlobButton file={file} label="Open in new tab" />
            </div>
          ) : needsBlobPreview && !previewUrl ? (
            <p className="text-sm text-[#6B7280]">Loading preview…</p>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-[#6B7280]">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#353535]">{file.name}</p>
              <p className="text-xs text-[#8B8B8B]">
                {file.size < 1024
                  ? `${file.size} B`
                  : file.size < 1024 * 1024
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
              </p>
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] text-sm font-medium hover:opacity-90"
                >
                  Open in new tab
                </a>
              ) : (
                <OpenBlobButton file={file} label="Open in new tab" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OpenBlobButton({ file, label }: { file: File; label: string }) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setHref(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] text-sm font-medium hover:opacity-90"
    >
      {label}
    </a>
  );
}
