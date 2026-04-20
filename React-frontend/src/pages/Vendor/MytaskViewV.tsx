import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../lib/api";
import {
  resolveVendorTaskAssigneeName,
  type Employee as VendorRosterEmployee,
} from "./MytaskV";
import Upload from "../../assets/ProjectManager/MyTask/Upload.svg";
import ImageIcon from "../../assets/ProjectManager/MyTask/image.svg";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import downloadIcon from "../../assets/TechnicalDirector/download icon.svg";


interface Task {
  id: number;
  task_name?: string;
  status?: string;
  due_date?: string;
  project_name?: string;
  projectid?: number;
  project_id?: number;
  start_date?: string;
  progress?: number;
  module?: string;
  modules?: string;
  modules_name?: string;
  category?: string;
  type?: string;
  start_time?: string;
  due_time?: string;
  end_time?: string;
  assign_to?: string;
  assigned_to?: number;
  uploaderid?: number;
  description?: string;
  checklist?: string;
  assigned_full_name?: string;
  uploader_full_name?: string;
  Approval?: string;
  /** Comma-separated filenames under uploads/task/ */
  outputfilepath?: string;
}

interface Employee {
  id: number;
  full_name?: string;
}

function formatDateDDMMYYYY(d?: string): string {
  if (!d) return "—";
  const s = String(d).trim();
  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, mo, day] = s.slice(0, 10).split("-").map(Number);
    date = new Date(y, mo - 1, day);
  } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(s)) {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) date = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    else date = new Date(s);
  } else {
    date = new Date(s);
  }
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeDisplay(t?: string): string {
  if (!t) return "—";
  const s = String(t).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return s;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function getApiBase(): string {
  return (import.meta.env.VITE_API_URL || "http://localhost:5000/").replace(
    /\/$/,
    "",
  );
}

function taskOutputFileUrl(storedName: string): string {
  const name = storedName.trim();
  if (!name) return "";
  if (name.startsWith("http")) return name;
  return `${getApiBase()}/uploads/task/${encodeURIComponent(name)}`;
}

function isImageFile(nameOrType?: string): boolean {
  const v = String(nameOrType || "").toLowerCase();
  return (
    v.startsWith("image/") ||
    v.endsWith(".png") ||
    v.endsWith(".jpg") ||
    v.endsWith(".jpeg") ||
    v.endsWith(".gif") ||
    v.endsWith(".webp") ||
    v.endsWith(".bmp") ||
    v.endsWith(".svg")
  );
}

function normalizeStatus(s: string | undefined, approval?: string): StatusKey {
  if (approval?.toLowerCase() === "approved") return "approved";
  if (approval?.toLowerCase() === "rejected") return "rejected";
  if (!s) return "todo";
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  if (lower.includes("progress") || lower === "in_progress")
    return "in_progress";
  if (lower.includes("complete") || lower === "done") return "completed";
  return "todo";
}

type StatusKey = "todo" | "in_progress" | "completed" | "approved" | "rejected";

const STATUS_STYLE: Record<
  StatusKey,
  { label: string; dot: string; bg: string }
> = {
  todo: {
    label: "To Do",
    dot: "bg-orange-500",
    bg: "bg-orange-100 text-orange-800 rounded-full",
  },
  in_progress: {
    label: "Inprogress",
    dot: "bg-sky-500",
    bg: "bg-sky-100 text-sky-800",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    bg: "bg-emerald-100 text-emerald-800",
  },
  approved: {
    label: "Approved",
    dot: "bg-emerald-500",
    bg: "bg-emerald-100 text-emerald-800 rounded-full",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-red-500",
    bg: "bg-red-100 text-red-800 rounded-full",
  },
};

const STATUS_OPTIONS: {
  value: "todo" | "in_progress" | "completed";
  label: string;
}[] = [
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "Inprogress" },
    { value: "completed", label: "Completed" },
  ];

function shouldHideInProgressInDropdown(status: StatusKey): boolean {
  return status === "approved" || status === "rejected";
}

function isStatusOptionDisabled(
  current: StatusKey,
  option: "todo" | "in_progress" | "completed",
): boolean {
  if (current === "todo" && option === "completed") return true;
  if (
    (current === "completed" || current === "approved") &&
    (option === "todo" || option === "in_progress")
  )
    return true;
  return false;
}

export default function MytaskViewV() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = location.state as { task?: Task; from?: string } | null;
  const initialTask = state?.task;
  const fromTeamTask = state?.from === "teamtask";
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | undefined>(initialTask);

  const [statusDisplay, setStatusDisplay] = useState<StatusKey>(() =>
    initialTask
      ? normalizeStatus(initialTask.status, initialTask.Approval)
      : "todo",
  );
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vendorResourceProfiles, setVendorResourceProfiles] = useState<
    Employee[]
  >([]);

  const submittedOutputFiles = useMemo(() => {
    return (task?.outputfilepath || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [task?.outputfilepath]);

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
    setSelectedImagePreview(
      isImageFile(file.type) ? URL.createObjectURL(file) : null,
    );
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedImage(file);
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
      setSelectedImagePreview(
        isImageFile(file.type) ? URL.createObjectURL(file) : null,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStatusUpdate = async (
    newStatus: "todo" | "in_progress" | "completed",
  ) => {
    if (!task || updatingStatus) return;
    if (isStatusOptionDisabled(statusDisplay, newStatus)) return;
    setUpdatingStatus(true);
    const backendStatus =
      newStatus === "completed"
        ? "Completed"
        : newStatus === "todo"
          ? "Todo"
          : "InProgress";
    const isAssignedBySomeoneElse =
      task.assigned_to != null &&
      task.uploaderid != null &&
      String(task.assigned_to) !== String(task.uploaderid);
    const nextProgress =
      newStatus === "completed"
        ? isAssignedBySomeoneElse
          ? 95
          : 100
        : newStatus === "in_progress"
          ? 50
          : 0;

    try {
      await api.patch(`/api/vendors/vendor-tasks/${task.id}/status`, {
        status: backendStatus,
      });
      setStatusDisplay(newStatus);
      setTask((prev) =>
        prev ? { ...prev, status: backendStatus, progress: nextProgress } : prev,
      );
      toast.success(
        newStatus === "completed"
          ? "Task marked as completed"
          : newStatus === "todo"
            ? "Task marked as to do"
            : "Task marked as in progress",
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
      setStatusDropdownOpen(false);
    }
  };

  useEffect(() => {
    api
      .get<{ success: boolean; resources?: Employee[] }>(
        "/api/vendors/vendor-resource-profiles",
      )
      .then(({ data }) => {
        setVendorResourceProfiles(data.resources ?? []);
      })
      .catch(() => {
        setVendorResourceProfiles([]);
      });
  }, []);

  const refreshTaskFromApi = (taskId?: number) => {
    const tid = taskId || task?.id || Number(id);
    if (!tid) return;

    if (fromTeamTask) {
      api
        .get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", {
          params: { condition: "1" },
        })
        .then((res) => {
          const found = (res.data.tasks ?? []).find((t) => t.id === tid);
          if (found) setTask(found);
        })
        .catch(() => { });
    } else {
      api
        .get<Task>(`/api/vendors/vendor-tasks/${tid}`)
        .then((res) => {
          setTask(res.data);
        })
        .catch((err) => {
          console.error("Error fetching task:", err);
          toast.error("Failed to load task details");
        });
    }
  };

  const handleImageSubmit = async () => {
    if (!task || !selectedImage || submittingWork) return;
    setSubmittingWork(true);
    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("image[]", selectedImage);

    try {
      await api.post(
        `/api/vendors/vendor-tasks/${task.id}/output-files`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      toast.success("Work submitted successfully");
      setSelectedImage(null);
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
      setSelectedImagePreview(null);
      refreshTaskFromApi();
    } catch (error: any) {
      const backendMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to submit work";
      console.error("Error submitting work:", error?.response?.data || error);
      toast.error(String(backendMsg));
    } finally {
      setSubmittingWork(false);
    }
  };

  useEffect(() => {
    return () => {
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
    };
  }, [selectedImagePreview]);

  useEffect(() => {
    if (!task) return;
    const next = normalizeStatus(task.status, task.Approval);
    setStatusDisplay(next);
  }, [task]);

  useEffect(() => {
    if (initialTask) {
      refreshTaskFromApi(initialTask.id);
    } else if (id) {
      refreshTaskFromApi(Number(id));
    }
  }, [id, initialTask?.id]);

  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusDropdownOpen]);

  if (!task) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d3399]" />
        <p className="text-slate-600 font-medium">Loading task details...</p>
      </div>
    );
  }

  const isUnderReview =
    statusDisplay === "completed" &&
    task.assigned_to != null &&
    task.uploaderid != null &&
    String(task.assigned_to) !== String(task.uploaderid);
  const style = {
    ...STATUS_STYLE[statusDisplay],
    label: isUnderReview ? "Under Review" : STATUS_STYLE[statusDisplay].label,
  };
  const taskRecord = task as unknown as Record<string, unknown>;
  const moduleNameDisplay = (() => {
    const candidates = [
      task.modules_name,
      task.modules,
      task.module,
      taskRecord.modules_name,
      taskRecord.modules,
      taskRecord.module,
    ];
    for (const c of candidates) {
      const s = String(c ?? "").trim();
      if (s) return s;
    }
    return "—";
  })();

  const resolveAssignedName = (): string => {
    if (!task) return "—";
    const roster = vendorResourceProfiles as VendorRosterEmployee[];
    const name = resolveVendorTaskAssigneeName(task, roster);
    return name.trim() !== "" ? name : "—";
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar px-5 py-2">
      <div className="flex items-center justify-between py-4">
        <div className="group relative">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-[5px] bg-[#F2F2F2] text-[#1A1A1A] transition-all cursor-pointer border-0 shadow-none group"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">Go Back</span>
              </div>
            </div>
          </button>
        </div>
        <h1 className="flex-1 text-center text-2xl font-semibold text-black">
          {task.project_name || task.task_name || "Task Name"}
        </h1>
        <div className="w-9" />
      </div>

      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-md text-black">Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`}
              />
              {style.label}
            </span>
          </div>
          <div className="relative" ref={statusDropdownRef}>
            <button
              type="button"
              disabled={updatingStatus}
              onClick={() => setStatusDropdownOpen((prev) => !prev)}
              className="rounded bg-[#E8E8E8] px-3 py-2 text-xs text-black flex items-center gap-1 disabled:opacity-50"
              aria-expanded={statusDropdownOpen}
              aria-haspopup="listbox"
            >
              {updatingStatus ? "Updating..." : "Select Status"}
              <FiChevronDown className="w-4 h-4" />
            </button>
            {statusDropdownOpen && !updatingStatus && (
              <div
                className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md bg-white py-1 border border-slate-200"
                role="listbox"
              >
                {STATUS_OPTIONS.filter(
                  (opt) =>
                    !(
                      shouldHideInProgressInDropdown(statusDisplay) &&
                      opt.value === "in_progress"
                    ),
                ).map((opt) => {
                  const disabled = isStatusOptionDisabled(
                    statusDisplay,
                    opt.value,
                  );
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-disabled={disabled}
                      disabled={disabled}
                      aria-selected={statusDisplay === opt.value}
                      onClick={() => handleStatusUpdate(opt.value)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${disabled
                          ? "text-slate-300 cursor-not-allowed opacity-60"
                          : "hover:bg-[#F2F2F2]"
                        } ${statusDisplay === opt.value && !disabled
                          ? "bg-[#F2F2F2] font-medium"
                          : ""
                        }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_STYLE[opt.value].dot}`}
                      />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
            <div className="flex gap-2">
              <span className="text-[#020202] shrink-0 w-28">Project Name</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.project_name || "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] shrink-0 w-28">Module Name</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {moduleNameDisplay}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] shrink-0 w-28">Category</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.category || task.type || "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] shrink-0 w-28">Assigned By</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.uploader_full_name ?? "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] shrink-0 w-28">Assigned To</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">{resolveAssignedName()}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] shrink-0 w-28">
                Start Date
              </span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.start_date ? formatDateDDMMYYYY(task.start_date) : "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] shrink-0 w-28">Start Time</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {formatTimeDisplay(task.start_time)}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] shrink-0 w-28">End Date</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.due_date ? formatDateDDMMYYYY(task.due_date) : "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] shrink-0 w-28">End Time</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {formatTimeDisplay(task.due_time ?? task.end_time)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <span className="text-[#020202] shrink-0 w-28 ">Attachments</span>
                <span className="text-[#020202] shrink-0">:</span>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  {submittedOutputFiles.length > 0 ? (
                    submittedOutputFiles.map((f, idx) => {
                      const url = taskOutputFileUrl(f);
                      const base = f.split("/").pop() || f;
                      const underscoreIdx = base.indexOf("_");
                      const displayName = underscoreIdx > 8 ? base.slice(underscoreIdx + 1) : base;
                      
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-[14px] font-medium text-[#616161] truncate font-Gantari">
                            {displayName}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="relative group/tooltip inline-flex shrink-0">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-slate-100 rounded transition-colors"
                              >
                                <img src={viewIcon} alt="View" className="w-4 h-4" />
                              </a>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-3 py-0.5 relative z-10">
                                  <span className="font-Gantari text-[12px] font-semibold text-[#353535] text-center block whitespace-nowrap">View</span>
                                </div>
                                <div className="w-2 h-2 bg-[#FFFFFF] border-r border-b border-[#C1C1C1] rotate-45 relative z-20 -mt-[4.5px]"></div>
                              </div>
                            </div>
                            
                            <div className="relative group/tooltip inline-flex shrink-0">
                              <a
                                href={url}
                                download
                                className="p-1 hover:bg-slate-100 rounded transition-colors"
                              >
                                <img src={downloadIcon} alt="Download" className="w-4 h-4" />
                              </a>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-3 py-0.5 relative z-10">
                                  <span className="font-Gantari text-[12px] font-semibold text-[#353535] text-center block whitespace-nowrap">Download</span>
                                </div>
                                <div className="w-2 h-2 bg-[#FFFFFF] border-r border-b border-[#C1C1C1] rotate-45 relative z-20 -mt-[4.5px]"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[#616161]">No Attachment Available</span>
                  )}
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* Task Description & Checklist */}
        <div className="mt-8 space-y-6 mb-10">
          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm flex flex-col min-h-[150px]">
            <h4 className="text-[#353535] text-[18px] font-semibold mb-3 font-Gantari">
              Task Description
            </h4>
            <div className="flex-1 rounded-lg bg-[#F2F3F4] px-4 py-3 text-sm text-slate-800 font-Gantari min-h-[80px]">
              {task.description &&
                task.description
                  .replace(/<[^>]*>?/gm, "")
                  .replace(/&nbsp;/g, "")
                  .trim().length > 0 ? (
                <div
                  className="prose prose-sm max-w-none prose-p:my-0"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm flex flex-col min-h-[150px]">
            <h4 className="text-[#353535] text-[18px] font-semibold mb-3 font-Gantari">
              Checklist / Reference
            </h4>
            <div className="flex-1 rounded-lg bg-[#F2F3F4] px-4 py-3 text-sm text-slate-800 font-Gantari min-h-[80px]">
              {task.checklist &&
                task.checklist
                  .replace(/<[^>]*>?/gm, "")
                  .replace(/&nbsp;/g, "")
                  .trim().length > 0 ? (
                <div
                  className="prose prose-sm max-w-none prose-p:my-0"
                  dangerouslySetInnerHTML={{ __html: task.checklist }}
                />
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
