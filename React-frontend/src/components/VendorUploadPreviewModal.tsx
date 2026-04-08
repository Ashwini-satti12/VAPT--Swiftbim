import {
  sanitizeVendorVendorsFilename,
  vendorVendorsFileUrl,
} from "../lib/vendorUploads";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const PDF_EXT = /\.pdf$/i;

export function VendorUploadPreviewModal({
  fileName,
  onClose,
}: {
  fileName: string;
  onClose: () => void;
}) {
  const safeName = sanitizeVendorVendorsFilename(fileName);
  const url = safeName ? vendorVendorsFileUrl(safeName) : "";
  const isImage = safeName ? IMAGE_EXT.test(safeName) : false;
  const isPdf = safeName ? PDF_EXT.test(safeName) : false;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-[90vw] w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-[#F8F8F8]">
          <span className="text-sm font-medium text-[#353535] truncate max-w-[70vw]" title={safeName ?? fileName}>
            {safeName ?? fileName}
          </span>
          <div className="group relative">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 cursor-pointer hover:bg-slate-100 border-0 shadow-none"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-sm px-4 py-0.5 relative z-10">
                <span className="font-gantari text-[12px] font-semibold text-[#353535] whitespace-nowrap">Close</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center min-h-[240px] bg-[#FAFAFA]">
          {!safeName || !url ? (
            <p className="text-sm text-[#6B7280]">Invalid file name.</p>
          ) : isImage ? (
            <img
              src={url}
              alt={safeName}
              className="max-w-full max-h-[75vh] object-contain rounded"
            />
          ) : isPdf ? (
            <iframe title={safeName} src={url} className="w-full min-h-[75vh] rounded border border-slate-200 bg-white" />
          ) : (
            <div className="flex flex-col items-center gap-4 text-center text-[#353535]">
              <p className="text-sm">No inline preview for this file type.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline"
              >
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
