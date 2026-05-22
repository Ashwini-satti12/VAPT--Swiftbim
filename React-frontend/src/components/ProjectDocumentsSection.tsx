import viewIcon from "../assets/ProjectManager/project/viewIcon.svg";
import downloadIcon from "../assets/TechnicalDirector/download icon.svg";
import {
  getProjectApiBase,
  getProjectDocumentItems,
  resolveProjectDocumentHref,
  type ProjectWithDocuments,
} from "../utils/projectDetails";

type Props = {
  project: ProjectWithDocuments | null | undefined;
  apiBaseUrl?: string;
  projectSource?: string | null;
  emptyLabel?: string;
};

/** Project document list (view) — same resolution as TD / PM / BL / BC panels. */
export default function ProjectDocumentsSection({
  project,
  apiBaseUrl,
  projectSource,
  emptyLabel = "No Document Available",
}: Props) {
  const base = getProjectApiBase(apiBaseUrl);
  const source = projectSource ?? project?.source ?? "Outsource";
  const docs = getProjectDocumentItems(project);

  if (docs.length === 0) {
    return (
      <span className="text-[14px] font-medium text-[#616161]">{emptyLabel}</span>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {docs.map((doc, idx) => {
        const url = resolveProjectDocumentHref(doc.fileUrl, base, source);
        const label = doc.originalFilename || "Document";
        return (
          <div
            key={`${doc.fileUrl}-${idx}`}
            className="flex items-center gap-3 w-full md:max-w-md"
          >
            <span
              className="text-[16px] font-medium text-[#616161] line-clamp-1 flex-1 font-gantari"
              title={label}
            >
              {label}
            </span>
            <div className="flex gap-2.5 shrink-0">
              {url ? (
                <>
                  <div className="relative group/tooltip inline-flex shrink-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded transition-colors"
                    >
                      <img src={viewIcon} alt="View" className="w-4 h-4" />
                    </a>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                      <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-4 py-0.5">
                        <span className="font-gantari text-[14px] font-semibold text-[#353535] whitespace-nowrap">
                          View
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative group/tooltip inline-flex shrink-0">
                    <a
                      href={url}
                      download
                      className="p-1 hover:bg-white rounded transition-colors"
                    >
                      <img src={downloadIcon} alt="Download" className="w-4 h-4" />
                    </a>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                      <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-4 py-0.5">
                        <span className="font-gantari text-[14px] font-semibold text-[#353535] whitespace-nowrap">
                          Download
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
