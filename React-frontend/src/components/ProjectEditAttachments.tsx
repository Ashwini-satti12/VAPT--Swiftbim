import { FiPaperclip } from "react-icons/fi";
import viewIcon from "../assets/ProjectManager/project/viewIcon.svg";
import {
  displayAttachmentFilename,
  resolveProjectDocumentHref,
  type ProjectDocumentItem,
} from "../utils/projectDetails";

type Props = {
  clientViewOnly: ProjectDocumentItem[];
  teamFileRefs: string[];
  newFiles: File[];
  apiBaseUrl: string;
  projectSource?: string | null;
  onRemoveTeamFile: (fileRef: string) => void;
  onRemoveNewFile: (index: number) => void;
};

export default function ProjectEditAttachments({
  clientViewOnly,
  teamFileRefs,
  newFiles,
  apiBaseUrl,
  projectSource,
  onRemoveTeamFile,
  onRemoveNewFile,
}: Props) {
  const total = clientViewOnly.length + teamFileRefs.length + newFiles.length;
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {clientViewOnly.map((doc, idx) => {
        const href = resolveProjectDocumentHref(
          doc.fileUrl,
          apiBaseUrl,
          projectSource,
        );
        return (
          <div
            key={`client-${doc.fileUrl}-${idx}`}
            className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-sm min-w-[200px] max-w-full"
          >
            <FiPaperclip className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#353535] truncate">
                {displayAttachmentFilename(doc.fileUrl, doc.originalFilename)}
              </p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                Client upload · view only
              </p>
            </div>
            <button
              type="button"
              onClick={() => href && window.open(href, "_blank")}
              className="p-1 hover:bg-white rounded transition-colors shrink-0"
              title="View"
            >
              <img src={viewIcon} alt="View" className="w-4 h-4 opacity-60" />
            </button>
          </div>
        );
      })}

      {teamFileRefs.map((fileRef, idx) => {
        const href = resolveProjectDocumentHref(
          fileRef,
          apiBaseUrl,
          projectSource,
        );
        return (
          <div
            key={`team-${fileRef}-${idx}`}
            className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-sm min-w-[200px] max-w-full"
          >
            <FiPaperclip className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#353535] truncate">
                {displayAttachmentFilename(fileRef)}
              </p>
              <p className="text-[11px] text-blue-600 font-medium tracking-wide uppercase">
                Team upload
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => href && window.open(href, "_blank")}
                className="p-1 hover:bg-white rounded transition-colors"
                title="View"
              >
                <img src={viewIcon} alt="View" className="w-4 h-4 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => onRemoveTeamFile(fileRef)}
                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                title="Remove"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}

      {newFiles.map((file, idx) => (
        <div
          key={`new-${file.name}-${idx}`}
          className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm min-w-[200px]"
        >
          <FiPaperclip className="w-4 h-4 text-[#DD4342]" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#353535] truncate">{file.name}</p>
            <p className="text-[11px] text-slate-500">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => window.open(URL.createObjectURL(file), "_blank")}
              className="p-1 hover:bg-slate-50 rounded transition-colors"
            >
              <img src={viewIcon} alt="View" className="w-4 h-4 opacity-60" />
            </button>
            <button
              type="button"
              onClick={() => onRemoveNewFile(idx)}
              className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
