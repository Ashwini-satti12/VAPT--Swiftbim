import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../../lib/api";
import Upload from "../../../assets/ProjectManager/MyTask/Upload.svg";
import ImageIcon from "../../../assets/ProjectManager/MyTask/image.svg";
import backIcon from "../../../assets/TechnicalDirector/back icon.svg";


interface Task {
  id: number;
  task_name?: string;
  status?: string;
  due_date?: string;
  project_name?: string;
  projectid?: number;
  project_id?: number;
  start_date?: string;
  /** Main `tasks` table: start date (same as Add form “Actual Start Date”) */
  Actual_start_time?: string;
  progress?: number;
  module?: string;
  modules?: string;
  modules_name?: string;
  category?: string;
  type?: string;
  start_time?: string;
  /** Preferred start / end times from `tasks` (Add form “Select Start/End Time”) */
  perferstart_time?: string;
  perferend_time?: string;
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
  review_remark?: string;
}

interface Employee {
  id: number;
  full_name?: string;
  name?: string;
}

interface VendorProjectRow {
  id?: number;
  project_name?: string;
  main_project_id?: number | null;
}

function parseTaskPayload(data: unknown): Task | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { task?: Task } & Task;
  const raw = d.task ?? (typeof d.id === "number" ? d : null);
  return raw && typeof raw.id === "number" ? raw : null;
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

function displayStoredFileName(stored: string): string {
  const raw = String(stored || "").trim();
  if (!raw) return "";
  const base = raw.split("/").pop() || raw;
  const idx = base.indexOf("_");
  if (idx > 8) return base.slice(idx + 1); // strip UUID prefix
  return base;
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

/** Backend status strings used by MytaskEV board + vendor-tasks PATCH */
function statusKeyToBackend(s: StatusKey): string {
  if (s === "completed") return "Completed";
  if (s === "in_progress") return "InProgress";
  return "Todo";
}

export default function MyTaskViewEV({ taskId: propTaskId, onBack: propOnBack }: { taskId?: number, onBack?: () => void }) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { task?: Task } | null;
  const initialTask = state?.task;

  const [task, setTask] = useState<Task | undefined>(initialTask);
  const [loading, setLoading] = useState(() => !initialTask && (Boolean(id) || Boolean(propTaskId)));

  const [statusDisplay, setStatusDisplay] = useState<StatusKey>(() =>
    initialTask ? normalizeStatus(initialTask.status, initialTask.Approval) : "todo",
  );
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vendorResourceProfiles, setVendorResourceProfiles] = useState<
    Employee[]
  >([]);
  const [vendorProjects, setVendorProjects] = useState<VendorProjectRow[]>([]);

  const listPath = `/ve/mytasks${location.search || ""}`;

  const goBackToList = () => {
    if (propOnBack) {
      propOnBack();
      return;
    }
    navigate(listPath);
  };

  const submittedOutputFiles = useMemo(() => {
    return (task?.outputfilepath || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [task?.outputfilepath]);

  const refreshTaskFromApi = (taskId: number) => {
    api
      .get(`/api/tasks/${taskId}`)
      .then((res) => {
        const parsed = parseTaskPayload(res.data);
        if (parsed) setTask(parsed);
      })
      .catch(() => {
        toast.error("Failed to load task details");
      });
  };

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedImage(file);
    if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
    setSelectedImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleStatusUpdate = async (
    newStatus: "todo" | "in_progress" | "completed",
  ) => {
    if (!task || updatingStatus) return;
    if (isStatusOptionDisabled(statusDisplay, newStatus)) return;
    setUpdatingStatus(true);
    const backendStatus = statusKeyToBackend(newStatus);

    try {
      await api.patch(`/api/vendors/vendor-tasks/${task.id}/status`, {
        status: backendStatus,
      });
      setTask((prev) => (prev ? { ...prev, status: backendStatus } : prev));
      setStatusDisplay(newStatus);
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
      .get<{ success?: boolean; resources?: Employee[] }>(
        "/api/vendors/vendor-resource-profiles",
      )
      .then(({ data }) => {
        setVendorResourceProfiles(data.resources ?? []);
      })
      .catch(() => {
        setVendorResourceProfiles([]);
      });
  }, []);

  useEffect(() => {
    api
      .get<{ projects?: VendorProjectRow[] }>("/api/vendors/vendor-projects")
      .then(({ data }) => {
        setVendorProjects(data.projects ?? []);
      })
      .catch(() => {
        setVendorProjects([]);
      });
  }, []);

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
    const tid = propTaskId ?? initialTask?.id ?? Number(id);
    if (!tid || Number.isNaN(tid)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`/api/tasks/${tid}`)
      .then((res) => {
        const parsed = parseTaskPayload(res.data);
        if (parsed) setTask(parsed);
      })
      .catch(() => {
        toast.error("Failed to load task");
      })
      .finally(() => setLoading(false));
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

  const handleImageSubmit = async () => {
    if (!task || !selectedImage || submittingWork) return;
    setSubmittingWork(true);
    const formData = new FormData();
    formData.append("image", selectedImage);

    try {
      await api.post(`/api/tasks/${task.id}/output-files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Work submitted successfully");
      setSelectedImage(null);
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
      setSelectedImagePreview(null);
      refreshTaskFromApi(task.id);
    } catch (error) {
      console.error("Error submitting work:", error);
      toast.error("Failed to submit work");
    } finally {
      setSubmittingWork(false);
    }
  };

  const resolvedProjectName = useMemo(() => {
    if (!task) return "";
    const tr = task as unknown as Record<string, unknown>;
    const direct = String(task.project_name ?? tr.project_name ?? "").trim();
    if (direct) return direct;
    const pid =
      task.projectid ??
      task.project_id ??
      tr.projectid ??
      tr.project_id;
    const n = typeof pid === "number" ? pid : Number(pid);
    if (Number.isNaN(n) || vendorProjects.length === 0) return "";
    const byMain = vendorProjects.find(
      (p) =>
        p.main_project_id != null && Number(p.main_project_id) === n,
    );
    const nmMain = byMain?.project_name?.trim();
    if (nmMain) return nmMain;
    const byVpId = vendorProjects.find((p) => Number(p.id) === n);
    const nmVp = byVpId?.project_name?.trim();
    if (nmVp) return nmVp;
    return "";
  }, [task, vendorProjects]);

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-1 min-h-0 overflow-y-auto bg-white p-6 custom-scrollbar">
        <p className="text-slate-600 mb-4">Task not found.</p>
        <button
          type="button"
          onClick={goBackToList}
          className="text-[#3d3399] hover:underline font-medium cursor-pointer"
        >
          ← Back to My Tasks
        </button>
      </div>
    );
  }

  const style = STATUS_STYLE[statusDisplay];
  const taskRecord = task as unknown as Record<string, unknown>;

  const displayStartDate = (): string => {
    const raw =
      task.start_date ??
      task.Actual_start_time ??
      (taskRecord.Actual_start_time as string | undefined) ??
      (taskRecord.start_date as string | undefined);
    return raw ? formatDateDDMMYYYY(String(raw)) : "—";
  };

  const displayStartTime = (): string =>
    formatTimeDisplay(
      task.perferstart_time ??
        (taskRecord.perferstart_time as string | undefined) ??
        task.start_time,
    );

  const displayEndTime = (): string =>
    formatTimeDisplay(
      task.perferend_time ??
        (taskRecord.perferend_time as string | undefined) ??
        task.due_time ??
        task.end_time,
    );

  const displayType = (): string => {
    const v = String(
      task.type ??
        task.category ??
        taskRecord.category ??
        taskRecord.type ??
        "",
    ).trim();
    return v || "—";
  };

  const displayModule = (): string => {
    const raw = String(
      task.modules_name ??
        task.module ??
        task.modules ??
        taskRecord.modules_name ??
        taskRecord.modules ??
        "",
    ).trim();
    if (!raw) return "—";
    try {
      if (raw.startsWith("[") && raw.endsWith("]")) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = String(parsed[0]).trim();
          if (first) return first;
        }
      }
    } catch {
      /* ignore */
    }
    const partial = /^\["([^"]*)/.exec(raw);
    if (partial?.[1]?.trim()) return partial[1].trim();
    return raw;
  };

  const resolveAssignedName = (): string => {
    if (!task) return "—";
    if (task.assigned_full_name && task.assigned_full_name.trim() !== "") {
      return task.assigned_full_name;
    }
    const rawId =
      task.assign_to ??
      (taskRecord.assigned_to as string | number | undefined) ??
      "";
    const idNum = typeof rawId === "number" ? rawId : Number(rawId);
    if (!Number.isNaN(idNum) && vendorResourceProfiles.length > 0) {
      const emp = vendorResourceProfiles.find((e) => e.id === idNum);
      const n = emp?.full_name || emp?.name;
      if (n) return n;
    }
    return typeof rawId === "string" && rawId.trim() !== ""
      ? String(rawId)
      : "—";
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto bg-white custom-scrollbar">
      <div className="shrink-0 flex items-center justify-between px-5 py-2">
        <div className="flex items-center justify-between mb-2 relative flex-shrink-0">
            <div className="group relative inline-flex shrink-0">
          <button
            type="button"
            onClick={goBackToList}
            className="p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
           {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-2 py-0.5 relative z-10">
                  <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                    Go Back
                  </span>
                </div>
              </div>
            </div>
            </div>
        <h1 className="flex-1 text-center text-[20px] md:text-[24px] font-medium text-[#353535] font-Gantari px-2">
          {resolvedProjectName || task.task_name || "Task"}
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
              className="rounded bg-[#E8E8E8] px-3 py-2 text-xs text-black flex items-center gap-1 hover:bg-[#DDDDDD] disabled:opacity-50"
              aria-expanded={statusDropdownOpen}
              aria-haspopup="listbox"
            >
              {updatingStatus ? "Updating..." : "Select Status"}
              <FiChevronDown className="w-4 h-4" />
            </button>
            {statusDropdownOpen && !updatingStatus && (
              <div
                className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg bg-white py-1 shadow-lg border border-slate-200"
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
                      : "hover:bg-slate-50"
                      } ${statusDisplay === opt.value && !disabled
                      ? "bg-slate-50 font-medium"
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
              <span className="text-black shrink-0 w-28">Task Name</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">{task.task_name || "—"}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">Project Name</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">
                {resolvedProjectName || "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 lg:whitespace-nowrap w-28">
                Select Module
              </span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">{displayModule()}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-black shrink-0 w-28">Type</span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">{displayType()}</span>
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
              <span className="text-[#616161]">{displayStartDate()}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">
                Select Start Time
              </span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">{displayStartTime()}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">
                Actual End Date
              </span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">
                {task.due_date
                  ? formatDateDDMMYYYY(task.due_date)
                  : "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-black shrink-0 w-28">
                Select End Time
              </span>
              <span className="text-black shrink-0">:</span>
              <span className="text-[#616161]">{displayEndTime()}</span>
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
              accept="image/*"
              className="sr-only"
              aria-label="Select image"
              onChange={handleSelectImage}
            />
            <div className="rounded-sm bg-[#FFFFFF] flex flex-col items-center justify-center py-8 px-4 text-slate-500 min-h-[120px] relative transition-all duration-200">
              {selectedImagePreview ? (
                <img
                  src={selectedImagePreview}
                  alt="Selected"
                  className="max-h-48 max-w-full object-contain rounded"
                />
              ) : (
                <>
                  <img src={ImageIcon} alt="Image" className="w-7 h-7" />
                  <span className="text-xs mt-2">No Image Selected</span>
                </>
              )}
            </div>
            <div className="flex gap-4 mt-6 justify-center flex-wrap">
              <button
                type="button"
                disabled={submittingWork}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-sm bg-[#DBE9FE] px-4 py-3 text-xs text-black hover:bg-[#D5E6FF] whitespace-nowrap disabled:opacity-50"
              >
                <img src={Upload} alt="Upload" className="w-3 h-3 mr-1" />
                <span className="mr-2">Select Image</span>
              </button>
              <button
                type="button"
                disabled={!selectedImage || submittingWork}
                onClick={handleImageSubmit}
                className="inline-flex items-center gap-1 rounded-sm bg-[#E1F6EB] px-4 py-3 text-xs text-[#008F22] hover:bg-[#D6F5E8] whitespace-nowrap disabled:opacity-50"
              >
                <FiCheck className="w-4 h-4 text-[#008F22]" />
                {submittingWork ? "Submitting..." : "Submit Image"}
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
                    const label = displayStoredFileName(fname);
                    return (
                      <a
                        key={fname}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded border border-slate-200 overflow-hidden bg-white max-w-[180px]"
                        title={label}
                      >
                        {isImageFile(fname) ? (
                          <img
                            src={src}
                            alt={label}
                            className="max-h-28 w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="px-3 py-3 text-xs text-[#353535] break-all">
                            {label}
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

        <div className="mt-8 space-y-6 mb-10">
          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm flex flex-col min-h-[150px]">
            <h4 className="text-[#353535] text-[18px] font-semibold mb-3 font-Gantari">
              Task Description
            </h4>
            <div className="flex-1 rounded-lg bg-[#F2F3F4] px-4 py-3 text-sm text-slate-800 overflow-y-auto font-Gantari min-h-[80px]">
              {task.description &&
                task.description.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, "").trim()
                  .length > 0 ? (
                <div
                  className="prose prose-sm max-w-none prose-p:my-0"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>
          {task.review_remark && (
            <div className="mt-6 pt-4 border border-slate-200 rounded-xl p-6">
              <h4 className="text-black text-md mb-2">Review Remark</h4>
              <div className="rounded-lg bg-[#F2F3F4] px-3 py-2 text-sm text-slate-800 min-h-[44px]">
                {task.review_remark}
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm flex flex-col min-h-[150px]">
            <h4 className="text-[#353535] text-[18px] font-semibold mb-3 font-Gantari">
              Checklist / Reference
            </h4>
            <div className="flex-1 rounded-lg bg-[#F2F3F4] px-4 py-3 text-sm text-slate-800 overflow-y-auto font-Gantari min-h-[80px]">
              {task.checklist &&
                task.checklist.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, "").trim()
                  .length > 0 ? (
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
