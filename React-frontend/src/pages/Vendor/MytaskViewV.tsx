import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../lib/api";
import { resolveVendorTaskAssigneeName, type Employee as VendorRosterEmployee } from "./MytaskV";
import Upload from "../../assets/ProjectManager/MyTask/Upload.svg";
import ImageIcon from "../../assets/ProjectManager/MyTask/image.svg";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";


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

const STATUS_OPTIONS: { value: "todo" | "in_progress" | "completed"; label: string }[] = [
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
    initialTask ? normalizeStatus(initialTask.status, initialTask.Approval) : "todo",
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
    setSelectedImagePreview(isImageFile(file.type) ? URL.createObjectURL(file) : null);
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
      setSelectedImagePreview(isImageFile(file.type) ? URL.createObjectURL(file) : null);
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

    try {
      await api.patch(`/api/vendors/vendor-tasks/${task.id}/status`, {
        status: backendStatus,
      });
      setStatusDisplay(newStatus);
      setTask((prev) =>
        prev ? { ...prev, status: backendStatus } : prev,
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
        .get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params: { condition: "1" } })
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

  const style = STATUS_STYLE[statusDisplay];
  const taskRecord = task as unknown as Record<string, unknown>;

  const resolveAssignedName = (): string => {
    if (!task) return "—";
    const roster = vendorResourceProfiles as VendorRosterEmployee[];
    const name = resolveVendorTaskAssigneeName(task, roster);
    return name.trim() !== "" ? name : "—";
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar pb-10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="group relative">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer border-0 shadow-none"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
            <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
            <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
              <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">Go Back</span>
            </div>
          </div>
        </div>
        <h1 className="flex-1 text-center text-2xl font-semibold text-black">
          {task.project_name || task.task_name || "Task Name"}
        </h1>
        <div className="w-9" />
      </div>

      <div className="max-w-7xl mx-auto p-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">Project Name</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">{task.project_name || "—"}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 lg:whitespace-nowrap w-28">
                Module Name
              </span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">
                {String(
                  taskRecord.modules_name ??
                  task.module ??
                  task.modules ??
                  taskRecord.modules ??
                  "—",
                )}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-black shrink-0 w-28">Category</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">
                {String(
                  task.type ??
                  task.category ??
                  taskRecord.category ??
                  taskRecord.type ??
                  "—",
                )}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">Assigned By</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">
                {task.uploader_full_name ?? "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">Assigned To</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">{resolveAssignedName()}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">
                Actual Start Date
              </span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">
                {task.start_date
                  ? formatDateDDMMYYYY(task.start_date)
                  : "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">Start Time</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">
                {formatTimeDisplay(task.start_time)}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">Actual End Date</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">
                {task.due_date
                  ? formatDateDDMMYYYY(task.due_date)
                  : "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">End Time</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">
                {formatTimeDisplay(task.due_time ?? task.end_time)}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">Attachments</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161] break-all">
                {submittedOutputFiles.length > 0
                  ? submittedOutputFiles
                      .map((f) => {
                        const base = f.split("/").pop() || f;
                        const idx = base.indexOf("_");
                        return idx > 8 ? base.slice(idx + 1) : base;
                      })
                      .join(", ")
                  : "—"}
              </span>
            </div>
          </div>

          <div className="rounded-sm bg-[#F2F7FF] p-4 h-fit">
            <h4 className="text-black text-md mb-1">Submit Work</h4>
            <p className="text-xs text-[#8B8B8B] mb-4">
              Choose your finished work or error screenshots to update the team
              on your progress.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              className="sr-only"
              aria-label="Select file"
              onChange={handleSelectImage}
            />
            <div
              className={`rounded-sm flex flex-col items-center justify-center py-8 px-4 text-slate-500 min-h-[120px] relative transition-all duration-200 border-2 border-dashed ${isDragging ? "bg-sky-50 border-sky-400" : "bg-[#FFFFFF] border-slate-200"
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedImage && selectedImagePreview ? (
                <>
                  <div className="group absolute top-2 right-2 z-10">
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setSelectedImagePreview(null);
                      }}
                      className="p-1 bg-white/80 rounded-full shadow-sm hover:bg-white transition-colors cursor-pointer border-0 shadow-none"
                    >
                      <FiX className="w-4 h-4 text-slate-600" />
                    </button>
                    <div className="absolute top-full right-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                      <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px] ml-auto mr-1.5"></div>
                      <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-sm px-4 py-0.5 relative z-10">
                        <span className="font-gantari text-[12px] font-semibold text-[#353535] whitespace-nowrap">Remove</span>
                      </div>
                    </div>
                  </div>
                  <img
                    src={selectedImagePreview}
                    alt="Selected"
                    className="max-h-48 max-w-full object-contain rounded"
                  />
                </>
              ) : selectedImage ? (
                <>
                  <img src={ImageIcon} alt="File" className="w-7 h-7" />
                  <span className="text-xs mt-2 text-[#353535] break-all text-center">{selectedImage.name}</span>
                </>
              ) : (
                <>
                  <img src={ImageIcon} alt="Image" className="w-7 h-7" />
                  <span className="text-xs mt-2 text-[#616161]">No File Selected</span>
                  <span className="text-[10px] mt-1 text-[#8B8B8B]">Drag and drop file here</span>
                </>
              )}
            </div>
            <div className="flex gap-4 mt-6 justify-center">
              <button
                type="button"
                disabled={submittingWork}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-sm bg-[#DBE9FE] px-4 py-3 text-xs text-black hover:bg-[#D5E6FF] whitespace-nowrap disabled:opacity-50"
              >
                <img src={Upload} alt="Upload" className="w-3 h-3 mr-1" />
                <span className="mr-2">Select File</span>
              </button>
              <button
                type="button"
                disabled={!selectedImage || submittingWork}
                onClick={handleImageSubmit}
                className="inline-flex items-center gap-1 rounded-sm bg-[#E1F6EB] px-4 py-3 text-xs text-[#008F22] hover:bg-[#D6F5E8] whitespace-nowrap disabled:opacity-50"
              >
                <FiCheck className="w-4 h-4 text-[#008F22]" />
                {submittingWork ? "Submitting..." : "Submit File"}
              </button>
            </div>
            {submittedOutputFiles.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="text-xs font-semibold text-black mb-2">
                  Submitted files (saved)
                </p>
                <div className="flex flex-wrap gap-3">
                  {submittedOutputFiles.map((fname) => {
                    const src = taskOutputFileUrl(fname);
                    return (
                      <a
                        key={fname}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded border border-slate-200 overflow-hidden bg-white max-w-[140px]"
                      >
                        {isImageFile(fname) ? (
                          <img
                            src={src}
                            alt={fname}
                            className="max-h-28 w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="px-3 py-3 text-xs text-[#353535] break-all">
                            {fname}
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Task Description & Checklist */}
        <div className="mt-8 space-y-6 mb-10">
          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm flex flex-col min-h-[150px]">
            <h4 className="text-[#353535] text-[18px] font-semibold mb-3 font-Gantari">Task Description</h4>
            <div className="flex-1 rounded-lg bg-[#F2F3F4] px-4 py-3 text-sm text-slate-800 font-Gantari min-h-[80px]">
              {task.description && task.description.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim().length > 0 ? (
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
            <h4 className="text-[#353535] text-[18px] font-semibold mb-3 font-Gantari">Checklist / Reference</h4>
            <div className="flex-1 rounded-lg bg-[#F2F3F4] px-4 py-3 text-sm text-slate-800 font-Gantari min-h-[80px]">
              {task.checklist && task.checklist.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim().length > 0 ? (
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
