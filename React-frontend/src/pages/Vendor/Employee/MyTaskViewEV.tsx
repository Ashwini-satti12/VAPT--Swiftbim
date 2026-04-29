import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api, { appApiBase } from "../../../lib/api";
import Upload from "../../../assets/ProjectManager/MyTask/Upload.svg";
import ImageIcon from "../../../assets/ProjectManager/MyTask/image.svg";
import backIcon from "../../../assets/TechnicalDirector/back icon.svg";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import downloadIcon from "../../../assets/TechnicalDirector/download icon.svg";

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
  return appApiBase.replace(/\/$/, "");
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

/** Backend status strings used by MytaskEV board + vendor-tasks PATCH */
function statusKeyToBackend(s: StatusKey): string {
  if (s === "completed") return "Completed";
  if (s === "in_progress") return "InProgress";
  return "Todo";
}

export default function MyTaskViewEV({
  taskId: propTaskId,
  onBack: propOnBack,
}: {
  taskId?: number;
  onBack?: () => void;
}) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { task?: Task } | null;
  const initialTask = state?.task;

  const [task, setTask] = useState<Task | undefined>(initialTask);
  const [loading, setLoading] = useState(
    () => !initialTask && (Boolean(id) || Boolean(propTaskId)),
  );

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
      .get(`/api/vendors/vendor-tasks/${taskId}`)
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
      .get(`/api/vendors/vendor-tasks/${tid}`)
      .then((res) => {
        const parsed = parseTaskPayload(res.data);
        if (parsed) setTask(parsed);
      })
      .catch(() => {
        toast.error("Failed to load task");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propTaskId, id, initialTask?.id]);

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
      task.projectid ?? task.project_id ?? tr.projectid ?? tr.project_id;
    const n = typeof pid === "number" ? pid : Number(pid);
    if (Number.isNaN(n) || vendorProjects.length === 0) return "";
    const byMain = vendorProjects.find(
      (p) => p.main_project_id != null && Number(p.main_project_id) === n,
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
          ← Back to Tasks
        </button>
      </div>
    );
  }

  const isUnderReview =
    statusDisplay === "completed" &&
    task.assigned_to != null &&
    String(task.assigned_to) !== String((task as any).uploaderid ?? (task as any).vendor_id) &&
    task.Approval?.toLowerCase() !== "approved";

  const progress = isUnderReview
    ? 95
    : statusDisplay === "approved"
      ? 100
      : statusDisplay === "completed"
        ? 100
        : statusDisplay === "in_progress"
          ? 50
          : 0;

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
    <div className="flex-1 flex flex-col min-h-0 bg-white font-Gantari">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2 mb-4 shrink-0">
        <div className="group relative inline-flex shrink-0">
          <button
            type="button"
            onClick={goBackToList}
            className="p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
            <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
            <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-2 py-0.5 relative z-10">
              <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                Go Back
              </span>
            </div>
          </div>
        </div>
        <h1 className="flex-1 text-center text-[24px] font-semibold text-black">
          {task.task_name || "Task Name"}
        </h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-md text-black font-Gantari">Status:</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium font-Gantari ${style.bg}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`}
                />
                {isUnderReview ? "Reviewed" : style.label}
              </span>
            </div>

            {!shouldHideInProgressInDropdown(statusDisplay) && (
              <div className="relative" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  disabled={updatingStatus}
                  className="flex items-center justify-between gap-2 rounded-[5px] bg-[#F2F2F2] px-4 py-2 text-[14px] text-slate-700 min-w-[140px] hover:bg-[#E5E5E5] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="font-Gantari text-[#8B8B8B]">Select Status</span>
                  <FiChevronDown
                    className={`transition-transform text-[#8B8B8B] duration-200 ${statusDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-[140px] rounded-[5px] border border-slate-200 bg-white py-1 shadow-lg">
                    {STATUS_OPTIONS.map((opt) => {
                      const disabled = isStatusOptionDisabled(statusDisplay, opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleStatusUpdate(opt.value)}
                          disabled={disabled}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-[14px] font-Gantari transition-colors ${
                            disabled
                              ? "cursor-not-allowed opacity-50 text-[#8B8B8B]"
                              : "hover:bg-[#F2F2F2] cursor-pointer text-[#8B8B8B]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              opt.value === "todo"
                                ? "bg-[#F35C08]"
                                : opt.value === "in_progress"
                                  ? "bg-[#09B8FF]"
                                  : "bg-[#03D955]"
                            }`}
                          />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full border border-slate-200 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-[14px]">
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Task Name
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161] break-words">
                  {task.task_name || "—"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Project Name
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161] break-words">
                  {resolvedProjectName || "—"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Select Module
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161]">
                  {displayModule()}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Assigned By
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161]">
                  {task.uploader_full_name ?? "—"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Assigned To
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161]">
                  {resolveAssignedName()}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Actual Start Date
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161] font-gantari">
                  {displayStartDate()}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Start Time
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161] font-gantari">
                  {displayStartTime()}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Actual End Date
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161] font-gantari">
                  {task.due_date ? formatDateDDMMYYYY(task.due_date) : "—"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  End Time
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161] font-gantari">
                  {displayEndTime()}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Progress
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161] flex items-center gap-2">
                  {progress}%
                  {isUnderReview && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">
                      Under Review
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Attachments
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  {submittedOutputFiles.length > 0 ? (
                    submittedOutputFiles.map((f, idx) => {
                      const url = taskOutputFileUrl(f);
                      const base = f.split("/").pop() || f;
                      const underscoreIdx = base.indexOf("_");
                      const displayName =
                        underscoreIdx > 8 ? base.slice(underscoreIdx + 1) : base;

                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-[14px] font-medium text-[#616161] truncate font-Gantari">
                            {displayName}
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-slate-100 rounded transition-colors"
                            >
                              <img src={viewIcon} alt="View" className="w-4 h-4" />
                            </a>
                            <a
                              href={url}
                              download
                              className="p-1 hover:bg-slate-100 rounded transition-colors"
                            >
                              <img
                                src={downloadIcon}
                                alt="Download"
                                className="w-4 h-4"
                              />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[#616161]">-NIL-</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
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
        </div>
      </div>
    </div>
  );
}
