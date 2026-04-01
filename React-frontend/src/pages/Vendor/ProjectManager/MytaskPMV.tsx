import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import toast from "react-hot-toast";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import Group1 from "../../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../../assets/ProjectManager/MyTask/arrow.svg";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
// import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";

type DropdownId = "employee" | "projects" | "show" | "period" | null;
export type FormDropdownId =
  | "project"
  | "module"
  | "type"
  | "assignTo"
  | "type_start_time"
  | "type_end_time"
  | null;

interface Employee {
  id: number;
  full_name: string;
  active?: string;
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

const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || "";
};

const getProfileUrl = (path: string | undefined): string => {
    if (!path || path.trim() === "") return "";
    if (path.startsWith("http")) return path;

    let normalizedPath = path.replace(/\\/g, "/").trim();
    normalizedPath = normalizedPath.replace(/^\d+\s+/, "");
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


export interface Task {
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
  type?: string;
  start_time?: string;
  due_time?: string;
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
  Actual_start_time?: string;
  /** Comma-separated filenames under `uploads/task/` */
  outputfilepath?: string;
}

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

export interface FormDropdownProps {
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

export function FormDropdown({
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
        className="flex w-full items-center justify-between rounded-sm bg-[#E8E8E8] px-3 py-2 text-left text-sm cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className={value ? "text-[#353535]" : "text-[#616161]"}>
          {displayLabel}
        </span>
        <img
          src={ArrowDown}
          alt="arrow"
          className={`ml-2 h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute top-full left-0 z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar font-Gantari">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                onClick={() => {
                  onChange(opt.value);
                  onClose();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-[#616161] hover:text-[#353535] hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg cursor-pointer"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export interface TaskDropdownProps {
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

export function TaskDropdown({
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
  maxVisibleItems = 4,
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

  const listMaxHeight = `${maxVisibleItems * 40}px`;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-sm cursor-pointer ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span
          className={`truncate font-Gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#616161]"}`}
        >
          {label.toLowerCase() === "show" && selected && selected !== label ? (
            <>
              <span className="text-sm text-[#353535]">Show:</span>{" "}
              <span>{selected}</span>
            </>
          ) : (
            (selected ?? label)
          )}
        </span>
        <img
          src={ArrowDown}
          alt="arrow"
          className={`ml-2 w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className={`absolute top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg ${narrow ? "right-0 min-w-[110px]" : "left-0 min-w-[160px]"}`}
        >
          {searchable && (
            <div className="sticky top-0 border-b border-slate-200 bg-white p-2 rounded-t-lg font-Gantari">
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
            className="overflow-y-auto py-1 custom-scrollbar font-Gantari"
            style={{ maxHeight: listMaxHeight }}
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
                className={`block w-full px-4 py-2 text-left text-sm font-Gantari transition-colors cursor-pointer ${selected === opt ? "bg-gray-100 text-[#353535]" : "text-[#616161] hover:text-[#353535] hover:bg-gray-200"}`}
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
  const progress =
    normalizeStatus(task.status) === "todo"
      ? 0
      : normalizeStatus(task.status) === "in_progress"
        ? 50
        : 100;

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
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm relative font-gantari ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-[#353535] text-[20px] truncate leading-tight font-Gantari">
          {task.task_name || "Task Name"}
        </h4>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="p-1 px-2 rounded cursor-pointer leading-none hover:bg-gray-100 transition-colors"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <img src={Dot} alt="Dot" className="w-5 h-5 object-contain" />
          </button>
          {menuOpen && (
            <div
              className={`absolute top-full mt-1 right-0 z-50 min-w-[170px] bg-white/40 backdrop-blur-xl rounded-[15px] border border-[#59595980] shadow-2xl py-2.5 transition-all duration-200 ease-out font-Gantari origin-top-right ${menuOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer text-[#353535] hover:bg-white/40"
                onClick={() => {
                  setMenuOpen(false);
                  onViewTask?.(task);
                }}
              >
                <img
                  src={viewIcon}
                  alt="view"
                  className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                />
                <span className="text-[15px] font-medium group-hover:text-[#DD4342]">
                  View
                </span>
              </button>
              {!isCompleted && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer text-[#353535] hover:bg-white/40"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditTask?.(task);
                    }}
                  >
                    <img
                      src={editIcon}
                      alt="edit"
                      className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                    />
                    <span className="text-[15px] font-medium group-hover:text-[#DD4342]">
                      Edit
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer text-[#353535] hover:bg-white/40"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteTask?.(task);
                    }}
                  >
                    <img
                      src={deleteIcon}
                      alt="delete"
                      className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                    />
                    <span className="text-[15px] font-medium group-hover:text-[#DD4342]">
                      Delete
                    </span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 mb-2 font-Gantari">
        <div className="flex flex-col">
            <span className="text-[14px] font-medium text-[#000000]">Start Date</span>
            <span className="text-[14px] font-medium text-[#8B8B8B]">
            {task.start_date || task.Actual_start_time
                ? `${new Date(task.start_date || task.Actual_start_time!).getDate().toString().padStart(2, "0")}-${(new Date(task.start_date || task.Actual_start_time!).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.start_date || task.Actual_start_time!).getFullYear()}`
                : "—"}
            </span>
        </div>

        <div className="flex flex-col items-end">
            <span className="text-[14px] font-medium text-[#000000]">End Date</span>
            <span className="text-[14px] font-medium text-[#8B8B8B]">
            {task.due_date
                ? `${new Date(task.due_date).getDate().toString().padStart(2, "0")}-${(new Date(task.due_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.due_date).getFullYear()}`
                : "—"}
            </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs text-[#8B8B8B] font-Gantari">Progress</span>
        <span className="text-xs font-medium text-[#8B8B8B] font-Gantari">{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-[#8B8B8B]"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {/* Assigned To avatar */}
            {task.assigned_full_name &&
              (() => {
                const src =
                  task.assigned_to != null && task.assigned_profile_picture
                    ? getGlobalProfileUrl(
                      task.assigned_to,
                      task.assigned_profile_picture,
                    )
                    : task.assigned_profile_picture
                      ? getProfileUrl(task.assigned_profile_picture)
                      : "";
                const initials = task.assigned_full_name
                  .split(" ")
                  .filter(Boolean)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    className="w-7 h-7 rounded-full bg-slate-300 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                    title={`Assigned To: ${task.assigned_full_name}`}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={task.assigned_full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                );
              })()}
            {/* Assigned By avatar */}
            {task.uploader_full_name &&
              (() => {
                const src =
                  task.uploaderid != null && task.uploader_profile_picture
                    ? getGlobalProfileUrl(
                      task.uploaderid,
                      task.uploader_profile_picture,
                    )
                    : task.uploader_profile_picture
                      ? getProfileUrl(task.uploader_profile_picture)
                      : "";
                const initials = task.uploader_full_name
                  .split(" ")
                  .filter(Boolean)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                    title={`Assigned By: ${task.uploader_full_name}`}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={task.uploader_full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                );
              })()}
          </div>
        </div>
        <button
          type="button"
          draggable={false}
          onClick={() => onViewTask?.(task)}
          className="group inline-flex items-center text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] gap-2 transition-colors cursor-pointer font-Gantari"
        >
          Details
          <img
            src={Arrow}
            alt="Arrow"
            className="w-2.5 h-2.5 transition-all duration-200 group-hover:brightness-0 group-hover:invert-[20%]"
          />
        </button>
      </div>
    </div>
  );
}


const SHOW_OPTIONS = ["Show", "1-50", "51-100", "101-150", "151-200", "201-250", "251-300", "301-350", "351-400", "401-450", "All"];
const PERIOD_OPTIONS = [
    "Period",
    "This Week",
    "This Month",
    "This Quarter",
    // "Custom",
];

export default function MytaskPMV() {
    const [searchParams] = useSearchParams();
    const { pathname } = useLocation();
    const isTeam =
        searchParams.get("condition") === "1" ||
        pathname.endsWith("/team") ||
        pathname.includes("/teamtask");
    const statusFilter =
        searchParams.get("status") || searchParams.get("taskstatus");
    const [list, setList] = useState<Task[]>([]);
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

    const allTasks = list.filter((t) => t && t.id != null).filter((t) => {
        // Employee filter
        if (selectedEmployee && !["Select Employee", "Show All", "Employee"].includes(selectedEmployee)) {
            if (t.assigned_full_name !== selectedEmployee) return false;
        }
        // Project filter
        if (selectedProject && !["Select Projects", "Show All", "Projects"].includes(selectedProject)) {
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
        normalizeStatus(t.status);

    const statusMap: Record<"todo" | "in_progress" | "completed", string> = {
        todo: "Todo",
        in_progress: "InProgress",
        completed: "Completed",
    };

    const handleMoveTask = (
        taskId: number,
        newStatus: "todo" | "in_progress" | "completed"
    ) => {
        setList((prev) =>
            prev.map((t) => (t && t.id === taskId ? { ...t, status: statusMap[newStatus] } : t))
        );

        api.patch(`/api/vendors/vendor-tasks/${taskId}/status`, {
            status: statusMap[newStatus],
        }).catch((err) => {
            console.error("Failed to update status:", err);
            toast.error("Failed to update status");
        });
    };

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
        const raw = (task.outputfilepath || "").toString();
        const existingNames = raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        setExistingAttachmentNames(existingNames);
        setAttachmentFiles([]);
        setEditingTaskId(task.id);
        setAddTaskModalOpen(true);
    };

    const openDeleteTask = (task: Task) => {
        setDeleteTaskId(task.id);
    };

    const openViewTask = (task: Task) => {
        navigate(`/v/mytasks/view/${task.id}`, { state: { task } });
    };

    const confirmDeleteTask = () => {
        if (deleteTaskId === null) return;
        api.delete(`/api/vendors/vendor-tasks/${deleteTaskId}`)
            .then(() => {
                setList((prev) => prev.filter((t) => t.id !== deleteTaskId));
                toast.success("Task deleted");
            })
            .catch(() => {
                toast.error("Failed to delete task");
            })
            .finally(() => {
                setDeleteTaskId(null);
            });
    };

    const resetTaskFormAndClose = () => {
        setAddTaskModalOpen(false);
        setEditingTaskId(null);
        setExistingAttachmentNames([]);
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
    const [existingAttachmentNames, setExistingAttachmentNames] = useState<string[]>([]);
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
        const params: Record<string, string> = {};
        if (statusFilter) params.status = statusFilter;
        if (isTeam) {
            params.condition = "1";
        }

        Promise.all([
            api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", {
                params,
            }),
            // Use vendor resources (new_swiftbim.vendor_resource_profiles)
            // instead of global employees for the dropdowns.
            api.get<{ success?: boolean; resources?: Employee[] }>(
                "/api/vendors/vendor-resource-profiles",
            ),
            // For Vendor PM, use vendor projects list (vendor_projects table)
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

    const employeeOptions = useMemo(() => {
        const rawEmployees = Array.isArray(employees) ? employees : [];
        const baseOptions = ["Select Employee", "Show All"];
        
        if (!selectedProject || selectedProject === "Select Projects" || selectedProject === "Show All") {
            return [...baseOptions, ...rawEmployees.map((e) => e?.full_name).filter(Boolean)];
        }
        
        const proj = (Array.isArray(projects) ? projects : []).find((p) => p?.project_name === selectedProject);
        if (!proj) {
            return [...baseOptions, ...rawEmployees.map((e) => e?.full_name).filter(Boolean)];
        }
        
        const memberTokens = (proj.members || "").split(",").map(s => s.trim()).filter(Boolean);
        const filtered = rawEmployees.filter(emp => {
            const name = (emp.full_name || "").trim();
            const idStr = String(emp.id);
            return memberTokens.some(t => t === idStr || t.toLowerCase() === name.toLowerCase());
        });
        
        return [...baseOptions, ...filtered.map(e => e.full_name)];
    }, [employees, projects, selectedProject]);

    const projectOptions = [
        "Select Projects",
        ...(Array.isArray(projects) ? projects : [])
            .map((p) => p?.project_name)
            .filter(Boolean),
    ];

    // Module options depend on the selected project: use its comma-separated modules list
    const selectedProjectMeta = Array.isArray(projects)
        ? projects.find((p) => p?.project_name === addTaskForm.projectName)
        : undefined;
    const dynamicModuleOptions =
        (selectedProjectMeta?.modules || "")
            .split(",")
            .map((m: string) => m.trim())
            .filter((m: string) => m.length > 0);

    const employeesForAssignDropdown = useMemo(() => {
        const all = Array.isArray(employees) ? employees : [];
        const meta = projects.find((p: Project) => p?.project_name === addTaskForm.projectName);
        const raw = (meta?.members || "").trim();
        if (!raw) return all;
        const tokens = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (tokens.length === 0) return all;
        return all.filter((emp: Employee) => {
            const name = (emp.full_name || "").trim();
            const idStr = String(emp.id);
            return tokens.some((t: string) => {
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

    const listReloadParams = useMemo(() => {
        const p: Record<string, string> = {};
        if (statusFilter) p.status = statusFilter;
        if (isTeam) p.condition = "1";
        return p;
    }, [statusFilter, isTeam]);

    const counts = {
        todo: allTasks.filter((t: Task) => getEffectiveStatus(t) === "todo").length,
        in_progress: allTasks.filter(
            (t: Task) => getEffectiveStatus(t) === "in_progress",
        ).length,
        completed: allTasks.filter((t: Task) => getEffectiveStatus(t) === "completed")
            .length,
    };
    const tasksByStatus = {
        todo: allTasks.filter((t: Task) => getEffectiveStatus(t) === "todo"),
        in_progress: allTasks.filter(
            (t: Task) => getEffectiveStatus(t) === "in_progress",
        ),
        completed: allTasks.filter(
            (t: Task) => getEffectiveStatus(t) === "completed",
        ),
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 flex flex-col overflow-hidden bg-white font-gantari">
            <div className="bg-white pb-3 flex-shrink-0 px-6 pt-6">
            {/* Top row: title + dropdowns + Add task */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                <h2 className="text-[24px] font-semibold text-slate-800">
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
                            setOpenDropdown((d: DropdownId) => (d === "employee" ? null : "employee"))
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
                            setOpenDropdown((d: DropdownId) => (d === "projects" ? null : "projects"))
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
                            setOpenDropdown((d: DropdownId) => (d === "show" ? null : "show"))
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
                            setOpenDropdown((d: DropdownId) => (d === "period" ? null : "period"))
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
                            setAddTaskModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer"
                    >
                        <img src={AddBtn} alt="Add" className="h-5 w-5" />
                        Add task
                    </button>
                </div>
            </div>

            {/* Status summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                <Link
                    to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
                    className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative transition-all bg-white border-slate-200"
                >
                    <span className="text-xl font-bold text-[#0D1829]">To Do</span>
                    <span className="text-xl font-bold text-[#0D1829]">
                        ({counts.todo})
                    </span>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                        <img src={Group1} alt="Group1" className="w-8 h-8" />
                    </div>
                </Link>

                <Link
                    to={
                        statusFilter === "in_progress"
                            ? pathname
                            : `${pathname}?status=in_progress`
                    }
                    className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative transition-all bg-white border-slate-200"
                >
                    <span className="text-xl font-bold text-[#0D1829]">
                        In Progress
                    </span>
                    <span className="text-xl font-bold text-[#0D1829]">
                        ({counts.in_progress})
                    </span>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                        <img src={Group2} alt="Group2" className="w-8 h-8" />
                    </div>
                </Link>

                <Link
                    to={
                        statusFilter === "completed"
                            ? pathname
                            : `${pathname}?status=completed`
                    }
                    className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative transition-all bg-white border-slate-200"
                >
                    <span className="text-xl font-bold text-[#0D1829]">Completed</span>
                    <span className="text-xl font-bold text-[#0D1829]">
                        ({counts.completed})
                    </span>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                        <img src={Group3} alt="Group3" className="w-8 h-8" />
                    </div>
                </Link>
            </div>
            </div>

            {/* Task cards under each status - drag and drop columns */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
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
                                    projects.find(
                                        (p) => p.project_name === addTaskForm.projectName,
                                    )?.id ?? null;
                                const assigneeId = employees.find(
                                    (emp) => emp.full_name === addTaskForm.assignTo,
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

                                const handleFiles = (taskId: number | string) => {
                                    if (attachmentFiles.length > 0) {
                                        const formData = new FormData();
                                        attachmentFiles.forEach((f) =>
                                            formData.append("image", f),
                                        );
                                        api.post(
                                            `/api/vendors/vendor-tasks/${taskId}/output-files`,
                                            formData,
                                            {
                                            headers: {
                                                "Content-Type": "multipart/form-data",
                                            },
                                            },
                                        );
                                    }
                                };

                                if (isEditing && existing) {
                                    api
                                        .patch(`/api/vendors/vendor-tasks/${existing.id}`, {
                                            project_id:
                                                projectId ??
                                                addTaskForm.projectName,
                                            task_name: addTaskForm.taskName,
                                            assigned_to: assignedToVal,
                                            due_date:
                                                addTaskForm.actualEndDate ||
                                                undefined,
                                            category: addTaskForm.type,
                                            description: addTaskForm.description,
                                            checklist: addTaskForm.checklist,
                                            modules: addTaskForm.module,
                                            start_date:
                                                addTaskForm.actualStartDate ||
                                                undefined,
                                            start_time:
                                                addTaskForm.startTime || undefined,
                                            end_time: addTaskForm.dueTime || undefined,
                                        })
                                        .then(() => {
                                            handleFiles(existing.id);
                                            api
                                                .get<{ tasks?: Task[] }>(
                                                    "/api/vendors/vendor-tasks",
                                                    { params: listReloadParams },
                                                )
                                                .then((res) =>
                                                    setList(res.data.tasks ?? []),
                                                );
                                        });
                                } else {
                                    api.post("/api/vendors/vendor-tasks", payload).then((res) => {
                                        if (res.data.success && res.data.task_id) {
                                            handleFiles(res.data.task_id);
                                            api
                                                .get<{ tasks?: Task[] }>(
                                                    "/api/vendors/vendor-tasks",
                                                    { params: listReloadParams },
                                                )
                                                .then((r) =>
                                                    setList(r.data.tasks ?? []),
                                                );
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
                                            ...projects.map((p: Project) => ({ value: p.project_name, label: p.project_name }))
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
                                            ...dynamicModuleOptions.map((m: string) => ({
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
                                            <button
                                                type="button"
                                                className="rounded-l-none rounded-r-sm bg-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50"
                                            >
                                                Tasklist
                                            </button>
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
                                            min={
                                                addTaskForm.actualStartDate || todayInputDate
                                            }
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
                                                ...employeesForAssignDropdown
                                                    .filter((e) => (e.full_name || "").trim() !== "")
                                                    .map((e: Employee) => ({
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
                                                        : existingAttachmentNames.length > 0
                                                            ? `${existingAttachmentNames.length} existing file(s)`
                                                            : ""
                                                }
                                                placeholder="Upload Files"
                                                className="flex-1 rounded-l-sm rounded-r-none bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827] placeholder:text-[#8B8B8B] focus:outline-none truncate"
                                                title={
                                                    attachmentFiles.length > 0
                                                        ? attachmentFiles.map((f) => f.name).join(", ")
                                                        : existingAttachmentNames.length > 0
                                                            ? existingAttachmentNames.join(", ")
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
                                    {existingAttachmentNames.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {existingAttachmentNames.map((filename, index) => (
                                                <li
                                                    key={`${filename}-${index}`}
                                                    className="flex items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827]"
                                                >
                                                    <span
                                                        className="truncate min-w-0"
                                                        title={filename}
                                                    >
                                                        {filename}
                                                    </span>
                                                    <span className="text-[11px] text-[#8B8B8B]">
                                                        existing
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {attachmentFiles.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {attachmentFiles.map((file: File, index: number) => (
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
