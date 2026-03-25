import { useEffect, useState, useRef, useMemo } from "react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { VscEye } from "react-icons/vsc";
import { HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
import Group1 from "../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../assets/ProjectManager/MyTask/arrow.svg";
import Dot from "../../assets/ProjectManager/MyTask/Dot.svg";

// Get API base URL for image URLs (so uploaded profile pictures load correctly)
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || "";
};

type DropdownId = "employee" | "projects" | "show" | "period" | null;
type FormDropdownId = "project" | "module" | "type" | "assignTo" | null;

interface Employee {
  id: number;
  full_name: string;
}

interface Project {
  id: number;
  project_name: string;
  modules?: string;
  /** Comma-separated resource ids or names involved in this project */
  members?: string;
  members_names?: string[];
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  uploader_name?: string | null;
}

interface FormDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

function FormDropdown({
  label,
  options,
  value,
  onChange,
  isOpen,
  onToggle,
  onClose,
  triggerRef,
  dropdownRef,
}: FormDropdownProps) {
  const displayLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : label;
  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex w-full items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-left text-sm text-black"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className={value ? "text-black" : "text-[#8B8B8B]"}>
          {displayLabel}
        </span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute top-full left-0 z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              onClick={() => {
                onChange(opt.value);
                onClose();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskDropdownProps {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  narrow?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  maxVisibleItems?: number;
}

function TaskDropdown({
  label,
  options,
  selected,
  onSelect,
  isOpen,
  onToggle,
  onClose,
  triggerRef,
  dropdownRef,
  narrow = false,
  searchable = false,
  searchPlaceholder = "Search...",
  maxVisibleItems = 5,
}: TaskDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const q = (searchQuery || "").trim().toLowerCase();
  const filteredOptions = searchable
    ? (() => {
      if (!q) return options;
      const first = options[0];
      const isPlaceholderOption = (o: string) =>
        o === first &&
        (first === "Select Employee" || first === "Select Projects");
      return options.filter((opt) => {
        if (isPlaceholderOption(opt)) return false; // hide placeholder when searching
        const name = String(opt ?? "")
          .trim()
          .toLowerCase();
        return name.includes(q);
      });
    })()
    : options;
  const listMaxHeight = searchable ? `${maxVisibleItems * 40}px` : undefined;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`inline-flex items-center justify-between rounded-lg bg-[#E8E8E8] px-4 py-3 text-sm text-black shadow-sm ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className="truncate">{selected ?? label}</span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className={`absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg ${narrow ? "min-w-[110px]" : "min-w-[160px]"}`}
        >
          {searchable && (
            <div className="sticky top-0 border-b border-slate-200 bg-white p-2 rounded-t-lg">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400"
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          <div
            className="overflow-y-auto py-1"
            style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
          >
            {filteredOptions.map((opt, idx) => (
              <button
                key={`${opt}-${idx}`}
                type="button"
                role="option"
                onClick={() => {
                  if (searchable) setSearchQuery("");
                  onSelect(opt);
                  onClose();
                }}
                className={`block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 last:rounded-b-lg ${!searchable ? "first:rounded-t-lg" : ""}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Task {
  id: number;
  task_name?: string;
  projectid?: number;
  project_id?: number;
  status?: string;
  due_date?: string;
  project_name?: string;
  start_date?: string;
  progress?: number;
  module?: string;
  modules_name?: string;
  category?: string;
  type?: string;
  start_time?: string;
  due_time?: string;
  end_time?: string;
  assign_to?: string;
  description?: string;
  checklist?: string;
  assigned_full_name?: string;
  uploader_full_name?: string;
  assigned_to?: number;
  uploaderid?: number;
  assigned_profile_picture?: string;
  uploader_profile_picture?: string;
  created_at?: string;
  Approval?: string;
}

// Build the correct URL for a stored profile picture
const getProfileUrl = (path: string | undefined): string => {
  if (!path || path.trim() === "") return "";
  if (path.startsWith("http")) return path;

  // Normalize path separators
  let normalizedPath = path.replace(/\\/g, "/").trim();

  // Remove leading numbers and spaces (e.g., "1 WhatsApp..." or "0 anu.jpg")
  normalizedPath = normalizedPath.replace(/^\d+\s+/, "");

  // Remove leading slashes if any
  normalizedPath = normalizedPath.replace(/^\/+/, "");

  const apiBaseUrl = getApiBaseUrl();
  let urlPath = "";

  if (normalizedPath.startsWith("employee/")) {
    const parts = normalizedPath.split("/");
    const encodedParts = parts.map((part, index) =>
      index === 0 ? part : encodeURIComponent(part),
    );
    urlPath = `/uploads/${encodedParts.join("/")}`;
  } else if (normalizedPath.startsWith("profiles/")) {
    const filename = normalizedPath.replace("profiles/", "");
    urlPath = `/uploads/employee/${encodeURIComponent(filename)}`;
  } else if (!normalizedPath.includes("/")) {
    urlPath = `/uploads/employee/${encodeURIComponent(normalizedPath)}`;
  } else {
    const parts = normalizedPath.split("/");
    const encodedParts = parts.map((part, index) =>
      index === 0 ? part : encodeURIComponent(part),
    );
    urlPath = `/uploads/${encodedParts.join("/")}`;
  }

  return `${apiBaseUrl}${urlPath}`;
};

/** Normalize various date strings to yyyy-mm-dd for <input type="date" />. */
function toInputDate(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  return "";
}

function getTodayInputDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** When start/end are the same calendar day, end clock time must not be before start. */
function isEndTimeBeforeStartOnSameDay(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
): boolean {
  if (!startTime || !endTime) return false;
  if (startDate && endDate && startDate !== endDate) return false;
  return endTime < startTime;
}

/** Map task (local or API shape) to form values so every detail shows in edit. */
function taskToFormValues(task: Task | Record<string, unknown>): {
  projectName: string;
  module: string;
  taskName: string;
  type: string;
  actualStartDate: string;
  actualEndDate: string;
  startTime: string;
  dueTime: string;
  assignTo: string;
  description: string;
  checklist: string;
} {
  const t = task as Record<string, unknown>;
  const str = (v: unknown) => (v != null ? String(v) : "");
  const timeOnly = (v: unknown) => {
    if (v == null) return "";
    const s = str(v);
    const match = s.match(/(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, "0")}:${match[2]}` : s.slice(0, 5);
  };
  return {
    projectName: str(t.project_name ?? t.projectName ?? ""),
    module: str(t.module ?? t.modules_name ?? t.modules ?? ""),
    taskName: str(t.task_name ?? t.taskName ?? ""),
    type: str(t.type ?? t.category ?? ""),
    actualStartDate: toInputDate(
      t.start_date ?? t.startDate ?? t.Actual_start_time ?? "",
    ),
    actualEndDate: toInputDate(t.due_date ?? t.dueDate ?? ""),
    startTime: timeOnly(
      t.start_time ?? t.startTime ?? t.Actual_start_time ?? "",
    ),
    dueTime: timeOnly(t.due_time ?? t.dueTime ?? t.end_time ?? ""),
    assignTo: str(
      t.assign_to ?? t.assignTo ?? t.assigned_to ?? t.assigned_full_name ?? "",
    ),
    description: str(t.description ?? ""),
    checklist: str(t.checklist ?? ""),
  };
}

/** Resolve assignee display name for the add/edit form from a task row. */
function buildFormFromTask(task: Task, employeeList: Employee[]) {
  const base = taskToFormValues(task);
  let assignTo = base.assignTo;

  if (task.assigned_full_name && task.assigned_full_name.trim() !== "") {
    assignTo = task.assigned_full_name;
  } else {
    const rawId =
      (task.assign_to as string | undefined) ??
      (task.assigned_to as number | undefined) ??
      base.assignTo;
    const idNum = typeof rawId === "number" ? rawId : Number(rawId || NaN);
    if (!Number.isNaN(idNum) && employeeList.length > 0) {
      const emp = employeeList.find((e) => e.id === idNum);
      if (emp?.full_name) assignTo = emp.full_name;
    }
  }

  return { ...base, assignTo };
}

function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return "—";
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const fmtShort = (s: string) => {
    const d = new Date(s);
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };
  const fmtFull = (s: string) => {
    const d = new Date(s);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  if (start && end) return `${fmtShort(start)} - ${fmtFull(end)}`;
  if (start) return fmtFull(start);
  return end ? fmtFull(end) : "—";
}

function normalizeStatus(
  s: string | undefined,
): "todo" | "in_progress" | "completed" {
  if (!s) return "todo";
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  if (lower.includes("progress") || lower === "in_progress")
    return "in_progress";
  if (lower.includes("complete") || lower === "done") return "completed";
  return "todo";
}

const STATUS_STYLE: Record<
  "todo" | "in_progress" | "completed",
  { label: string; dot: string; bg: string }
> = {
  todo: {
    label: "To Do",
    dot: "bg-orange-500",
    bg: "bg-orange-100 text-orange-800 rounded-full",
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-sky-500",
    bg: "bg-sky-100 text-sky-800",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    bg: "bg-emerald-100 text-emerald-800",
  },
};

function TaskCard({
  task,
  status,
  onViewTask,
  onEditTask,
  onDeleteTask,
}: {
  task: Task;
  status: "todo" | "in_progress" | "completed";
  onViewTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}) {
  const style = STATUS_STYLE[status];
  // Progress bar based on task.progress from API if available
  const progress =
    task.progress !== undefined
      ? task.progress
      : status === "todo"
        ? 0
        : status === "in_progress"
          ? 50
          : 100;
  const dateRange = formatDateRange(task.start_date, task.due_date);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleDragStart = (e: React.DragEvent) => {
    if (status === "completed") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("taskId", String(task.id));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.task_name || "Task");
  };

  const isCompleted = status === "completed";

  return (
    <div
      draggable={!isCompleted}
      onDragStart={handleDragStart}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm relative ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${style.bg}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
          {style.label}
        </span>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="p-0.5 rounded hover:bg-slate-100"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <img src={Dot} alt="Dot" className="w-4 h-4 text-slate-600" />
          </button>
          {menuOpen && (
            <div
              className={`absolute top-full mt-1 z-50 min-w-[120px] rounded-2xl bg-white/30 backdrop-blur-md py-1 px-3 shadow-lg border border-[#59595980] transform-gpu transition-all duration-200 ease-out ${isCompleted ? "right-full mr-1 origin-top-right" : "left-full ml-1 origin-top-left"}
                 ${menuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#DD4342] transition-colors group text-left"
                onClick={() => {
                  setMenuOpen(false);
                  onViewTask?.(task);
                }}
              >
                <VscEye className="w-4 h-4 shrink-0 text-slate-600 group-hover:text-red-600 transition-colors" />
                <span>View</span>
              </button>
              {!isCompleted && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#DD4342] transition-colors text-left"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditTask?.(task);
                    }}
                  >
                    <HiOutlinePencil className="w-4 h-4 shrink-0" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#DD4342] transition-colors text-left"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteTask?.(task);
                    }}
                  >
                    <HiOutlineTrash className="w-4 h-4 shrink-0" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <h4 className="font-semibold text-slate-900 text-sm mb-1">
        {task.task_name || "Task Name"}
      </h4>
      <p className="text-xs text-slate-500 mb-2">{dateRange}</p>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-slate-600">Progress</span>
        <span className="text-xs font-medium text-slate-700">{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-slate-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {/* Assigned To avatar */}
            <div
              className="w-7 h-7 rounded-full border-2 border-white bg-[#F0F0F0] flex items-center justify-center overflow-hidden shrink-0"
              title={`Assigned to: ${task.assigned_full_name || "Unassigned"}`}
            >
              {task.assigned_profile_picture ? (
                <img
                  src={getGlobalProfileUrl(task.assigned_to, task.assigned_profile_picture)}
                  alt="Assignee"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getProfileUrl(task.assigned_profile_picture);
                    target.onerror = () => {
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        const span = document.createElement("span");
                        span.className = "text-[10px] font-bold text-[#DD4342]";
                        span.innerText = (task.assigned_full_name || "U").charAt(0).toUpperCase();
                        parent.appendChild(span);
                      }
                    };
                  }}
                />
              ) : (
                <span className="text-[10px] font-bold text-[#DD4342]">
                  {(task.assigned_full_name || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Uploader avatar */}
            <div
              className="w-7 h-7 rounded-full border-2 border-white bg-[#F0F0F0] flex items-center justify-center overflow-hidden shrink-0"
              title={`Assigned by: ${task.uploader_full_name || "System"}`}
            >
              {task.uploader_profile_picture ? (
                <img
                  src={getGlobalProfileUrl(task.uploaderid, task.uploader_profile_picture)}
                  alt="Uploader"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getProfileUrl(task.uploader_profile_picture);
                    target.onerror = () => {
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        const span = document.createElement("span");
                        span.className = "text-[10px] font-bold text-[#DD4342]";
                        span.innerText = (task.uploader_full_name || "S").charAt(0).toUpperCase();
                        parent.appendChild(span);
                      }
                    };
                  }}
                />
              ) : (
                <span className="text-[10px] font-bold text-[#DD4342]">
                  {(task.uploader_full_name || "S").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          to={`/tasks/${task.id}`}
          draggable={false}
          className="inline-flex items-center text-xs font-medium text-slate-700 hover:text-slate-900 gap-2"
        >
          Details
          <img src={Arrow} alt="Arrow" className="w-2 h-2" />
        </Link>
      </div>
    </div>
  );
}

const SHOW_OPTIONS = ["Show", "10", "50", "100", "All"];
const PERIOD_OPTIONS = [
  "Period",
  "This Week",
  "This Month",
  "This Quarter",
  // "Custom",
];

export default function MytaskV() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const isTeam =
    searchParams.get("condition") === "1" || pathname.endsWith("/team");
  const statusFilter =
    searchParams.get("status") || searchParams.get("taskstatus");
  const STORAGE_KEY = "v_myTask_localTasks";
  const DELETED_IDS_KEY = "v_myTask_deletedIds";
  const STATUS_OVERRIDES_KEY = "v_myTask_statusOverrides";
  const loadDeletedIds = (): number[] => {
    try {
      const raw = localStorage.getItem(DELETED_IDS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map(Number).filter((n) => !Number.isNaN(n))
        : [];
    } catch {
      return [];
    }
  };
  const loadStatusOverrides = (): Record<number, string> => {
    try {
      const raw = localStorage.getItem(STATUS_OVERRIDES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const out: Record<number, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          const id = Number(k);
          if (!Number.isNaN(id) && typeof v === "string") out[id] = v;
        }
        return out;
      }
      return {};
    } catch {
      return {};
    }
  };
  const [list, setList] = useState<Task[]>([]);
  const [localTasks, setLocalTasks] = useState<Task[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Task[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [deletedIds, setDeletedIds] = useState<number[]>(loadDeletedIds);
  const [statusOverrides, setStatusOverrides] =
    useState<Record<number, string>>(loadStatusOverrides);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string | null>("Show");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [tasklistOpen, setTasklistOpen] = useState(false);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loadingRecentTasks, setLoadingRecentTasks] = useState(false);
  const tasklistRef = useRef<HTMLDivElement>(null);

  const safeLocal = Array.isArray(localTasks) ? localTasks.filter(Boolean) : [];
  const safeList = Array.isArray(list) ? list.filter(Boolean) : [];
  const merged = [
    ...safeLocal,
    ...safeList.filter((t) => t && !safeLocal.some((l) => l && l.id === t.id)),
  ];

  const allTasksBase = merged.filter(
    (t) => t && t.id != null && !deletedIds.includes(t.id),
  );
  const allTasks = allTasksBase.filter((t) => {
    // Employee filter
    if (
      selectedEmployee &&
      !["Select Employee", "Show All", "Employee"].includes(selectedEmployee)
    ) {
      if (t.assigned_full_name !== selectedEmployee) return false;
    }
    // Project filter
    if (
      selectedProject &&
      !["Select Projects", "Show All", "Projects"].includes(selectedProject)
    ) {
      if (t.project_name !== selectedProject) return false;
    }
    // Period filter
    if (selectedPeriod && !["Period", "Show All"].includes(selectedPeriod)) {
      const taskDate = new Date(t.created_at || t.start_date || "");
      const now = new Date();
      if (selectedPeriod === "This Week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (taskDate < weekAgo) return false;
      } else if (selectedPeriod === "This Month") {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        if (taskDate < monthAgo) return false;
      } else if (selectedPeriod === "This Quarter") {
        const quarterAgo = new Date();
        quarterAgo.setMonth(now.getMonth() - 3);
        if (taskDate < quarterAgo) return false;
      }
    }
    return true;
  });

  const getEffectiveStatus = (t: Task): "todo" | "in_progress" | "completed" =>
    normalizeStatus(statusOverrides[t.id] ?? t.status);

  const statusToLabel = (s: "todo" | "in_progress" | "completed"): string => {
    return s === "todo"
      ? "To Do"
      : s === "in_progress"
        ? "In Progress"
        : "Completed";
  };

  const handleMoveTask = (
    taskId: number,
    newStatus: "todo" | "in_progress" | "completed",
  ) => {
    const label = statusToLabel(newStatus);
    setStatusOverrides((prev) => ({ ...prev, [taskId]: label }));

    const statusMap = {
      todo: "Todo",
      in_progress: "InProgress",
      completed: "Completed",
    };

    setList((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: statusMap[newStatus] } : t,
      ),
    );
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: label } : t)),
    );

    api
      .patch(`/api/vendors/vendor-tasks/${taskId}/status`, {
        status: statusMap[newStatus],
      })
      .catch(() => { });
  };

  useEffect(() => {
    try {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deletedIds));
    } catch {
      // ignore
    }
  }, [deletedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STATUS_OVERRIDES_KEY,
        JSON.stringify(statusOverrides),
      );
    } catch {
      // ignore
    }
  }, [statusOverrides]);

  const navigate = useNavigate();
  const [addTaskForm, setAddTaskForm] = useState({
    projectName: "",
    module: "",
    taskName: "",
    type: "",
    actualStartDate: "",
    actualEndDate: "",
    startTime: "",
    dueTime: "",
    assignTo: "",
    description: "",
    checklist: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEditTask = (task: Task) => {
    setAddTaskForm(buildFormFromTask(task, employees));
    setAttachmentFiles([]);
    setEditingTaskId(task.id);
    setAddTaskModalOpen(true);
  };

  const openDeleteTask = (task: Task) => {
    setDeleteTaskId(task.id);
  };

  const openViewTask = (task: Task) => {
    navigate("/v/mytasks/view", { state: { task } });
  };

  const confirmDeleteTask = () => {
    if (deleteTaskId === null) return;

    api
      .delete(`/api/vendors/vendor-tasks/${deleteTaskId}`)
      .then(() => {
        setList((prev) => prev.filter((t) => t.id !== deleteTaskId));
        setLocalTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
        setDeletedIds((prev) => [...prev, deleteTaskId]);
        setDeleteTaskId(null);
      })
      .catch(() => {
        // handle error implicitly
        setDeleteTaskId(null);
      });
  };

  const resetTaskFormAndClose = () => {
    setAddTaskModalOpen(false);
    setEditingTaskId(null);
    setAttachmentFiles([]);
    setAddTaskForm({
      projectName: "",
      module: "",
      taskName: "",
      type: "",
      actualStartDate: "",
      actualEndDate: "",
      startTime: "",
      dueTime: "",
      assignTo: "",
      description: "",
      checklist: "",
    });
  };
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [openFormDropdown, setOpenFormDropdown] =
    useState<FormDropdownId>(null);
  const formProjectTriggerRef = useRef<HTMLButtonElement>(null);
  const formProjectMenuRef = useRef<HTMLDivElement>(null);
  const formModuleTriggerRef = useRef<HTMLButtonElement>(null);
  const formModuleMenuRef = useRef<HTMLDivElement>(null);
  const formTypeTriggerRef = useRef<HTMLButtonElement>(null);
  const formTypeMenuRef = useRef<HTMLDivElement>(null);
  const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
  const formAssignMenuRef = useRef<HTMLDivElement>(null);

  const dropdownsContainerRef = useRef<HTMLDivElement>(null);
  const employeeTriggerRef = useRef<HTMLButtonElement>(null);
  const employeeMenuRef = useRef<HTMLDivElement>(null);
  const projectsTriggerRef = useRef<HTMLButtonElement>(null);
  const projectsMenuRef = useRef<HTMLDivElement>(null);
  const showTriggerRef = useRef<HTMLButtonElement>(null);
  const showMenuRef = useRef<HTMLDivElement>(null);
  const periodTriggerRef = useRef<HTMLButtonElement>(null);
  const periodMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openDropdown === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = dropdownsContainerRef.current;
      if (el && !el.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdown]);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = input.files;
    if (!files?.length) return;
    const newFiles = Array.from(files);
    setAttachmentFiles((prev) => {
      const merged = [...prev];
      for (const f of newFiles) {
        const dup = merged.some((x) => x.name === f.name && x.size === f.size);
        if (!dup) merged.push(f);
      }
      return merged;
    });
    input.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (openFormDropdown === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const refs: React.RefObject<HTMLElement | null>[] =
        openFormDropdown === "project"
          ? [formProjectTriggerRef, formProjectMenuRef]
          : openFormDropdown === "module"
            ? [formModuleTriggerRef, formModuleMenuRef]
            : openFormDropdown === "type"
              ? [formTypeTriggerRef, formTypeMenuRef]
              : [formAssignTriggerRef, formAssignMenuRef];
      const inside = refs.some((r) => r.current && r.current.contains(target));
      if (!inside) setOpenFormDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openFormDropdown]);

  useEffect(() => {
    if (!tasklistOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tasklistRef.current &&
        !tasklistRef.current.contains(e.target as Node)
      ) {
        setTasklistOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tasklistOpen]);

  const fetchRecentTasks = () => {
    if (tasklistOpen) {
      setTasklistOpen(false);
      return;
    }
    setLoadingRecentTasks(true);
    api
      .get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks")
      .then((res) => {
        const tasks = res.data.tasks ?? [];
        // Get the most recent tasks (already sorted by created_at DESC from API)
        setRecentTasks(tasks.slice(0, 10));
        setTasklistOpen(true);
      })
      .catch(() => {
        setRecentTasks([]);
      })
      .finally(() => {
        setLoadingRecentTasks(false);
      });
  };

  const selectTaskFromList = (task: Task) => {
    setAddTaskForm(buildFormFromTask(task, employees));
    setTasklistOpen(false);
  };

  useEffect(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (isTeam) {
      params.condition = "1";
      params.employeeid = "all";
    }

    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params }),
      api.get<{ success?: boolean; resources?: Employee[] }>(
        "/api/vendors/vendor-resource-profiles",
      ),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
    ])
      .then(([tasksRes, resourcesRes, projRes]) => {
        setList(tasksRes.data.tasks ?? []);
        setEmployees(resourcesRes.data.resources ?? []);
        setProjects(projRes.data.projects ?? []);
      })
      .catch(() => {
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [isTeam, statusFilter]);

  // Data maps for dropdowns
  const getEmployeeOptions = () => {
    const rawEmployees = Array.isArray(employees) ? employees : [];
    if (!selectedProject || selectedProject === "Select Projects" || selectedProject === "Show All") {
      return ["Select Employee", ...rawEmployees.map((e) => e?.full_name).filter(Boolean)];
    }
    const proj = (Array.isArray(projects) ? projects : []).find((p) => p?.project_name === selectedProject);
    if (!proj) {
      return ["Select Employee", ...rawEmployees.map((e) => e?.full_name).filter(Boolean)];
    }
    const involvedNames = new Set<string>();
    if (proj.project_manager_name) involvedNames.add(proj.project_manager_name);
    if (proj.lead_name) involvedNames.add(proj.lead_name);
    if (proj.bim_coordinator_name) involvedNames.add(proj.bim_coordinator_name);
    if (proj.uploader_name) involvedNames.add(proj.uploader_name);
    if (Array.isArray(proj.members_names)) {
      proj.members_names.forEach((name: string) => {
        if (name) involvedNames.add(name);
      });
    }

    const validEmployees = rawEmployees.filter((e) => e?.full_name && involvedNames.has(e.full_name));

    return ["Select Employee", ...validEmployees.map((e) => e?.full_name).filter(Boolean)];
  };

  const employeeOptions = getEmployeeOptions();

  const projectOptions = [
    "Select Projects",
    ...(Array.isArray(projects) ? projects : [])
      .map((p) => p?.project_name)
      .filter(Boolean),
  ];

  // Module options depend on selected project: use its comma-separated modules list
  const selectedProjectMeta = Array.isArray(projects)
    ? projects.find((p) => p?.project_name === addTaskForm.projectName)
    : undefined;
  const dynamicModuleOptions = (selectedProjectMeta?.modules || "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);

  /** Assign To: only vendor resources listed on the selected project (members field). */
  const employeesForAssignDropdown = useMemo(() => {
    const all = Array.isArray(employees) ? employees : [];
    const meta = projects.find((p) => p?.project_name === addTaskForm.projectName);
    const raw = (meta?.members || "").trim();
    if (!raw) return all;
    const tokens = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (tokens.length === 0) return all;
    return all.filter((emp) => {
      const name = (emp.full_name || "").trim();
      const idStr = String(emp.id);
      return tokens.some((t) => {
        const tl = t.toLowerCase();
        return t === idStr || tl === name.toLowerCase() || name === t;
      });
    });
  }, [employees, projects, addTaskForm.projectName]);

  const todayInputDate = getTodayInputDate();
  const sameCalendarDay =
    Boolean(addTaskForm.actualStartDate) &&
    Boolean(addTaskForm.actualEndDate) &&
    addTaskForm.actualStartDate === addTaskForm.actualEndDate;

  const counts = {
    todo: allTasks.filter((t) => getEffectiveStatus(t) === "todo").length,
    in_progress: allTasks.filter((t) => getEffectiveStatus(t) === "in_progress")
      .length,
    completed: allTasks.filter((t) => getEffectiveStatus(t) === "completed")
      .length,
  };
  const tasksByStatus = {
    todo: allTasks.filter((t) => getEffectiveStatus(t) === "todo"),
    in_progress: allTasks.filter(
      (t) => getEffectiveStatus(t) === "in_progress",
    ),
    completed: allTasks.filter((t) => getEffectiveStatus(t) === "completed"),
  };
  const showLimit =
    selectedShow === "All" || !selectedShow
      ? Number.POSITIVE_INFINITY
      : Math.max(1, Number(selectedShow) || 10);
  const displayedTasksByStatus = {
    todo: tasksByStatus.todo.slice(0, showLimit),
    in_progress: tasksByStatus.in_progress.slice(0, showLimit),
    completed: tasksByStatus.completed.slice(0, showLimit),
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-auto min-h-screen">
      {/* Top row: title + dropdowns + Add task */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          {isTeam ? "Team Task" : "My Task"}
        </h2>
        <div
          ref={dropdownsContainerRef}
          className="flex flex-wrap items-center gap-2 w-fit"
        >
          <TaskDropdown
            label="Select Employee"
            options={employeeOptions}
            selected={selectedEmployee}
            onSelect={setSelectedEmployee}
            isOpen={openDropdown === "employee"}
            onToggle={() =>
              setOpenDropdown((d) => (d === "employee" ? null : "employee"))
            }
            onClose={() => setOpenDropdown(null)}
            triggerRef={employeeTriggerRef}
            dropdownRef={employeeMenuRef}
            searchable
            searchPlaceholder="Search employee..."
            maxVisibleItems={5}
          />
          <TaskDropdown
            label="Select Projects"
            options={projectOptions}
            selected={selectedProject}
            onSelect={setSelectedProject}
            isOpen={openDropdown === "projects"}
            onToggle={() =>
              setOpenDropdown((d) => (d === "projects" ? null : "projects"))
            }
            onClose={() => setOpenDropdown(null)}
            triggerRef={projectsTriggerRef}
            dropdownRef={projectsMenuRef}
            searchable
            searchPlaceholder="Search project..."
            maxVisibleItems={5}
          />
          <TaskDropdown
            label="Show"
            options={SHOW_OPTIONS}
            selected={selectedShow}
            onSelect={setSelectedShow}
            isOpen={openDropdown === "show"}
            onToggle={() =>
              setOpenDropdown((d) => (d === "show" ? null : "show"))
            }
            onClose={() => setOpenDropdown(null)}
            triggerRef={showTriggerRef}
            dropdownRef={showMenuRef}
            narrow
          />
          <TaskDropdown
            label="Period"
            options={PERIOD_OPTIONS}
            selected={selectedPeriod}
            onSelect={setSelectedPeriod}
            isOpen={openDropdown === "period"}
            onToggle={() =>
              setOpenDropdown((d) => (d === "period" ? null : "period"))
            }
            onClose={() => setOpenDropdown(null)}
            triggerRef={periodTriggerRef}
            dropdownRef={periodMenuRef}
            narrow
          />
          <button
            type="button"
            onClick={() => {
              setEditingTaskId(null);
              setAddTaskForm({
                projectName: "",
                module: "",
                taskName: "",
                type: "",
                actualStartDate: "",
                actualEndDate: "",
                startTime: "",
                dueTime: "",
                assignTo: "",
                description: "",
                checklist: "",
              });
              setAddTaskModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-3 text-sm font-medium text-white shadow-sm"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add task
          </button>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow relative"
        >
          <div className="absolute top-4 right-4 flex items-center justify-center">
            <img src={Group1} alt="Group1" className="w-12 h-12 mt-1" />
          </div>
          <p className="text-sm font-medium text-slate-500">To Do Task</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {counts.todo} Tasks
          </p>
        </Link>

        <Link
          to={
            statusFilter === "in_progress"
              ? pathname
              : `${pathname}?status=in_progress`
          }
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow relative"
        >
          <div className="absolute top-4 right-4 flex items-center justify-center">
            <img src={Group2} alt="Group2" className="w-12 h-12 mt-1" />
          </div>
          <p className="text-sm font-medium text-slate-500">In Progress Task</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {counts.in_progress} Tasks
          </p>
        </Link>

        <Link
          to={
            statusFilter === "completed"
              ? pathname
              : `${pathname}?status=completed`
          }
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow relative"
        >
          <div className="absolute top-4 right-4 flex items-center justify-center">
            <img src={Group3} alt="Group3" className="w-12 h-12 mt-1" />
          </div>
          <p className="text-sm font-medium text-slate-500">Completed Task</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {counts.completed} Tasks
          </p>
        </Link>
      </div>

      {/* Task cards under each status - drag and drop columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const taskId = Number(e.dataTransfer.getData("taskId"));
            if (!Number.isNaN(taskId)) handleMoveTask(taskId, "todo");
          }}
        >
          {displayedTasksByStatus.todo.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              status="todo"
              onViewTask={openViewTask}
              onEditTask={openEditTask}
              onDeleteTask={openDeleteTask}
            />
          ))}
        </div>
        <div
          className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const taskId = Number(e.dataTransfer.getData("taskId"));
            if (!Number.isNaN(taskId)) handleMoveTask(taskId, "in_progress");
          }}
        >
          {displayedTasksByStatus.in_progress.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              status="in_progress"
              onViewTask={openViewTask}
              onEditTask={openEditTask}
              onDeleteTask={openDeleteTask}
            />
          ))}
        </div>
        <div
          className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const taskId = Number(e.dataTransfer.getData("taskId"));
            if (!Number.isNaN(taskId)) handleMoveTask(taskId, "completed");
          }}
        >
          {displayedTasksByStatus.completed.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              status="completed"
              onViewTask={openViewTask}
              onEditTask={openEditTask}
              onDeleteTask={openDeleteTask}
            />
          ))}
        </div>
      </div>

      {/* Delete Task confirmation modal */}
      {deleteTaskId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteTaskId(null)}
                className="p-1 rounded-sm text-black hover:bg-[#E0E0E0] bg-[#F0F0F0] transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="flex-1 text-center text-lg font-semibold text-[#353535]">
                Delete Task
              </h3>
              <div className="w-9" />
            </div>
            <div className="px-6 py-5">
              <p className="text-black text-center">
                Are you sure, you want to Delete this Task?
              </p>
            </div>
            <div className="flex justify-center gap-3 px-6 py-4 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setDeleteTaskId(null)}
                className="rounded-md bg-[#F0F0F0] px-5 py-2 text-sm font-medium text-black hover:bg-[#E0E0E0]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                className="rounded-lg bg-[#FFD9D9] px-5 py-2 text-sm font-medium text-[#E00100] hover:bg-[#FFB3B3]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Task modal */}
      {addTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#FFFFFF] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <button
                type="button"
                onClick={resetTaskFormAndClose}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-black">
                {editingTaskId !== null ? "Edit Task" : "Add New Task"}
              </h3>
              <div className="w-9" />
            </div>
            <form
              className="flex-1 overflow-y-auto p-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  addTaskForm.actualStartDate &&
                  addTaskForm.actualStartDate < todayInputDate
                ) {
                  toast.error("Start date cannot be before today.");
                  return;
                }
                if (
                  addTaskForm.actualEndDate &&
                  addTaskForm.actualEndDate < todayInputDate
                ) {
                  toast.error("End date cannot be before today.");
                  return;
                }
                if (
                  isEndTimeBeforeStartOnSameDay(
                    addTaskForm.actualStartDate,
                    addTaskForm.actualEndDate,
                    addTaskForm.startTime,
                    addTaskForm.dueTime,
                  )
                ) {
                  toast.error(
                    "End time must be the same as or after start time when both dates are the same.",
                  );
                  return;
                }
                const isEditing = editingTaskId !== null;
                const existing = isEditing
                  ? list.find((t) => t.id === editingTaskId)
                  : null;

                const projectId =
                  projects.find((p) => p.project_name === addTaskForm.projectName)
                    ?.id ?? null;
                const assigneeId = employees.find(
                  (e) => e.full_name === addTaskForm.assignTo,
                )?.id;
                const assignedToVal =
                  assigneeId != null && !Number.isNaN(Number(assigneeId))
                    ? assigneeId
                    : addTaskForm.assignTo;

                const payload = {
                  projectid: projectId ?? addTaskForm.projectName,
                  taskName: addTaskForm.taskName,
                  category: addTaskForm.type,
                  startdate: addTaskForm.actualStartDate,
                  dueDate: addTaskForm.actualEndDate,
                  startTime: addTaskForm.startTime,
                  dueTime: addTaskForm.dueTime,
                  assignedTo: assignedToVal,
                  description: addTaskForm.description,
                  checklist: addTaskForm.checklist,
                  modules: addTaskForm.module,
                };

                if (isEditing && existing) {
                  api
                    .patch(`/api/vendors/vendor-tasks/${existing.id}`, {
                      task_name: addTaskForm.taskName,
                      project_id: projectId,
                      due_date: addTaskForm.actualEndDate || undefined,
                      start_date: addTaskForm.actualStartDate || undefined,
                      start_time: addTaskForm.startTime || undefined,
                      end_time: addTaskForm.dueTime || undefined,
                      category: addTaskForm.type,
                      modules: addTaskForm.module,
                      assigned_to: assignedToVal,
                      description: addTaskForm.description,
                      checklist: addTaskForm.checklist,
                    })
                    .then(() => {
                      api
                        .get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks")
                        .then((res) => setList(res.data.tasks ?? []));
                    });
                } else {
                  api.post("/api/vendors/vendor-tasks", payload).then((res) => {
                    if (res.data.success && res.data.task_id) {
                      api
                        .get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks")
                        .then((r) => setList(r.data.tasks ?? []));
                    }
                  });
                }
                resetTaskFormAndClose();
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-black mb-1">
                    Project Name
                  </label>
                  <FormDropdown
                    label="Select Project name"
                    options={[
                      { value: "", label: "Select Project name" },
                      ...projects.map((p) => ({
                        value: p.project_name,
                        label: p.project_name,
                      })),
                    ]}
                    value={addTaskForm.projectName}
                    onChange={(v) =>
                      setAddTaskForm((f) => ({
                        ...f,
                        projectName: v,
                        module: "",
                        assignTo: "",
                      }))
                    }
                    isOpen={openFormDropdown === "project"}
                    onToggle={() =>
                      setOpenFormDropdown((d) =>
                        d === "project" ? null : "project",
                      )
                    }
                    onClose={() => setOpenFormDropdown(null)}
                    triggerRef={formProjectTriggerRef}
                    dropdownRef={formProjectMenuRef}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Select Module
                  </label>
                  <FormDropdown
                    label="Select Module"
                    options={[
                      { value: "", label: "Select Module" },
                      ...dynamicModuleOptions.map((m) => ({
                        value: m,
                        label: m,
                      })),
                    ]}
                    value={addTaskForm.module}
                    onChange={(v) =>
                      setAddTaskForm((f) => ({ ...f, module: v }))
                    }
                    isOpen={openFormDropdown === "module"}
                    onToggle={() =>
                      setOpenFormDropdown((d) =>
                        d === "module" ? null : "module",
                      )
                    }
                    onClose={() => setOpenFormDropdown(null)}
                    triggerRef={formModuleTriggerRef}
                    dropdownRef={formModuleMenuRef}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Task Name
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={addTaskForm.taskName}
                      onChange={(e) =>
                        setAddTaskForm((f) => ({
                          ...f,
                          taskName: e.target.value,
                        }))
                      }
                      placeholder="Enter Task / Select Task"
                      className={`flex-1 bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none ${editingTaskId !== null ? "rounded-sm" : "rounded-l-sm"
                        }`}
                    />
                    {editingTaskId === null && (
                      <div className="relative" ref={tasklistRef}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchRecentTasks();
                          }}
                          className="rounded-l-none rounded-r-sm bg-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50"
                        >
                          {loadingRecentTasks ? "Loading..." : "Tasklist"}
                        </button>
                        {tasklistOpen && (
                          <div className="absolute top-full right-0 mt-1 z-50 w-80 rounded-lg border border-slate-200 bg-white shadow-lg max-h-96 overflow-y-auto">
                            <div className="p-2 border-b border-slate-200 sticky top-0 bg-white">
                              <h4 className="text-sm font-semibold text-slate-800 px-2 py-1">
                                Recent Tasks
                              </h4>
                            </div>
                            <div className="py-1">
                              {recentTasks.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                  No recent tasks found
                                </div>
                              ) : (
                                recentTasks.map((task) => (
                                  <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => selectTaskFromList(task)}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 transition-colors"
                                  >
                                    <div className="font-medium truncate">
                                      {task.task_name || "Untitled Task"}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Type
                    </label>
                    <FormDropdown
                      label="Select Type"
                      options={[
                        { value: "", label: "Select Type" },
                        { value: "task", label: "Task" },
                        { value: "bug", label: "Bug" },
                        { value: "feature", label: "Feature" },
                      ]}
                      value={addTaskForm.type}
                      onChange={(v) =>
                        setAddTaskForm((f) => ({ ...f, type: v }))
                      }
                      isOpen={openFormDropdown === "type"}
                      onToggle={() =>
                        setOpenFormDropdown((d) =>
                          d === "type" ? null : "type",
                        )
                      }
                      onClose={() => setOpenFormDropdown(null)}
                      triggerRef={formTypeTriggerRef}
                      dropdownRef={formTypeMenuRef}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Actual Start Date
                    </label>
                    <input
                      type="date"
                      min={todayInputDate}
                      value={addTaskForm.actualStartDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAddTaskForm((f) => {
                          const next = { ...f, actualStartDate: v };
                          if (
                            f.actualEndDate &&
                            v &&
                            f.actualEndDate < v
                          ) {
                            next.actualEndDate = v;
                          }
                          return next;
                        });
                      }}
                      placeholder="dd/mm/yyyy"
                      className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Actual End Date
                    </label>
                    <input
                      type="date"
                      min={addTaskForm.actualStartDate || todayInputDate}
                      value={addTaskForm.actualEndDate}
                      onChange={(e) =>
                        setAddTaskForm((f) => ({
                          ...f,
                          actualEndDate: e.target.value,
                        }))
                      }
                      placeholder="dd/mm/yyyy"
                      className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Select Start Time
                    </label>
                    <input
                      type="time"
                      value={addTaskForm.startTime}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAddTaskForm((f) => {
                          const next = { ...f, startTime: v };
                          const same =
                            f.actualStartDate &&
                            f.actualEndDate &&
                            f.actualStartDate === f.actualEndDate;
                          if (same && f.dueTime && v && f.dueTime < v) {
                            next.dueTime = v;
                          }
                          return next;
                        });
                      }}
                      placeholder="hh:mm"
                      className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Select End Time
                    </label>
                    <input
                      type="time"
                      min={
                        sameCalendarDay && addTaskForm.startTime
                          ? addTaskForm.startTime
                          : undefined
                      }
                      value={addTaskForm.dueTime}
                      onChange={(e) =>
                        setAddTaskForm((f) => ({
                          ...f,
                          dueTime: e.target.value,
                        }))
                      }
                      placeholder="hh:mm"
                      className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Assign To
                    </label>
                    <FormDropdown
                      label="Select Assign To"
                      options={[
                        { value: "", label: "Select Assign To" },
                        ...employeesForAssignDropdown.map((e) => ({
                          value: e.full_name,
                          label: e.full_name,
                        })),
                      ]}
                      value={addTaskForm.assignTo}
                      onChange={(v) =>
                        setAddTaskForm((f) => ({ ...f, assignTo: v }))
                      }
                      isOpen={openFormDropdown === "assignTo"}
                      onToggle={() =>
                        setOpenFormDropdown((d) =>
                          d === "assignTo" ? null : "assignTo",
                        )
                      }
                      onClose={() => setOpenFormDropdown(null)}
                      triggerRef={formAssignTriggerRef}
                      dropdownRef={formAssignMenuRef}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-black mb-1">
                    Description
                  </label>
                  <textarea
                    value={addTaskForm.description}
                    onChange={(e) =>
                      setAddTaskForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter Description..."
                    rows={3}
                    className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-black mb-1">
                    Checklist
                  </label>
                  <input
                    type="text"
                    value={addTaskForm.checklist}
                    onChange={(e) =>
                      setAddTaskForm((f) => ({
                        ...f,
                        checklist: e.target.value,
                      }))
                    }
                    placeholder="Enter Reference Link"
                    className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-black mb-1">
                    Attachments
                  </label>
                  <input
                    ref={fileInputRef}
                    id="add-task-file-input"
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleAttachmentChange}
                    accept="*/*"
                  />
                  <div className="flex flex-wrap gap-2">
                    <div className="flex flex-1 min-w-0">
                      <input
                        type="text"
                        readOnly
                        value={
                          attachmentFiles.length > 0
                            ? `${attachmentFiles.length} file(s) selected`
                            : ""
                        }
                        placeholder="Upload Files"
                        className="flex-1 rounded-l-sm rounded-r-none bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827] placeholder:text-[#8B8B8B] focus:outline-none truncate"
                        title={
                          attachmentFiles.length > 0
                            ? attachmentFiles.map((f) => f.name).join(", ")
                            : undefined
                        }
                      />
                      <label
                        htmlFor="add-task-file-input"
                        className="rounded-r-sm rounded-l-none bg-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50 cursor-pointer inline-flex items-center"
                      >
                        Browse File
                      </label>
                    </div>
                  </div>
                  {attachmentFiles.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {attachmentFiles.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827]"
                        >
                          <span className="truncate min-w-0" title={file.name}>
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="ml-2 shrink-0 p-0.5 rounded text-black hover:bg-slate-200 hover:text-slate-700"
                            aria-label={`Remove ${file.name}`}
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
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-6 pt-4 ">
                <button
                  type="button"
                  onClick={resetTaskFormAndClose}
                  className="rounded-lg bg-[#F2F2F2] px-5 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#DBE9FE] px-5 py-2 text-sm font-medium text-[#101827] hover:bg-[#D5E6FF]"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
