import { useState, useEffect } from "react";

export function AttachmentPreviewModal({
  file,
  onClose,
}: {
  file: File | null;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  if (!file) return null;

  const isImage = file.type.startsWith("image/");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Attachment preview"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col"
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
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[200px] bg-[#FAFAFA]">
          {isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-full max-h-[75vh] object-contain rounded"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-[#6B7280]">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
              <p className="text-xs text-slate-400">Preview not available for this file type</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
