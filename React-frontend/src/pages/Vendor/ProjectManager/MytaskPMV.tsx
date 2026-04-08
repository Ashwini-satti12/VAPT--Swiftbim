import { useEffect, useState, useRef } from "react";
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

type DropdownId = "employee" | "projects" | "show" | "period" | null;
export type FormDropdownId =
  | "project"
  | "module"
  | "type"
  | "assignTo"
  | "type_start_time"
  | "type_end_time"
  | null;

export interface Employee {
  id: number;
  full_name: string;
  active?: string;
}

export interface Project {
  id: number;
  project_name: string;
  modules?: string;
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
  outputfilepath?: string;
}

export function toInputDate(v: unknown): string {
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

export function getTodayInputDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isEndTimeBeforeStartOnSameDay(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
): boolean {
  if (!startTime || !endTime) return false;
  if (startDate && endDate && startDate !== endDate) return false;
  return endTime < startTime;
}

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

export function buildFormFromTask(task: Task, employeeList: Employee[]) {
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
  approval?: string | undefined,
): "todo" | "in_progress" | "completed" {
  if (approval?.toLowerCase() === "approved" || approval?.toLowerCase() === "rejected") {
    return "completed";
  }
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
        className="flex w-full items-center justify-between rounded-sm bg-[#E8E8E8] px-3 py-2 text-left text-sm cursor-pointer shadow-none border-0"
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
                className="block w-full px-3 py-2 text-left text-sm text-[#616161] hover:text-[#353535] hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg cursor-pointer border-0 shadow-none"
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
        if (isPlaceholderOption(opt)) return false;
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
        className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-sm cursor-pointer shadow-none border-0 ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`}
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
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none"
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
                className={`block w-full px-4 py-2 text-left text-sm font-Gantari transition-colors cursor-pointer border-0 shadow-none ${selected === opt ? "bg-gray-100 text-[#353535]" : "text-[#616161] hover:text-[#353535] hover:bg-gray-200"}`}
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
    typeof task.progress === "number"
      ? task.progress
      : status === "todo"
        ? 0
        : status === "in_progress"
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
    e.dataTransfer.setData("taskId", String(task.id));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.task_name || "Task");
  };
  const isCompleted = status === "completed";
  return (
    <div
      draggable={!isCompleted}
      onDragStart={handleDragStart}
      className={`rounded-md border border-slate-200 bg-white p-2.5 shadow-sm relative ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="font-semibold text-[#353535] text-[20px] truncate font-Gantari">
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
            className="p-0.5 rounded cursor-pointer border-0 bg-transparent shadow-none"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <img src={Dot} alt="Dot" className="w-4 h-4 text-slate-600" />
          </button>
          {menuOpen && (
            <div
              className={`absolute top-full mt-1 z-50 min-w-[170px] bg-white rounded-lg border border-[#AEACAC52] shadow-xl transition-all duration-200 ease-out font-Gantari ${isCompleted ? "right-full mr-1 origin-top-right" : "left-full ml-1 origin-top-left"}`}
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer border-0 bg-transparent shadow-none"
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
                <span className="text-[16px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                  View
                </span>
              </button>
              {!isCompleted && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer border-0 bg-transparent shadow-none"
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
                    <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                      Edit
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer border-0 bg-transparent shadow-none"
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
                    <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                      Delete
                    </span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-3 font-Gantari">
        <div className="flex flex-col text-left">
          <span className="text-[14px] font-medium text-[#000000]">Start Date</span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {task.start_date || task.Actual_start_time
              ? `${new Date(task.start_date || task.Actual_start_time!).getDate().toString().padStart(2, "0")}-${(new Date(task.start_date || task.Actual_start_time!).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.start_date || task.Actual_start_time!).getFullYear()}`
              : "—"}
          </span>
        </div>

        <div className="flex flex-col items-end text-right">
          <span className="text-[14px] font-medium text-[#000000]">End Date</span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {task.due_date
              ? `${new Date(task.due_date).getDate().toString().padStart(2, "0")}-${(new Date(task.due_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.due_date).getFullYear()}`
              : "—"}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-[#8B8B8B] font-Gantari">Progress</span>
        <span className="text-xs font-medium text-[#8B8B8B] font-Gantari">{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-[#8B8B8B]"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
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
          className="group inline-flex items-center text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] gap-2 transition-colors cursor-pointer font-Gantari border-0 shadow-none bg-transparent"
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

const SHOW_OPTIONS = ["Show Entries", "1-50", "51-100", "101-150", "151-200", "201-250", "251-300", "301-350", "351-400", "401-450", "All"];
const PERIOD_OPTIONS = [
  "Period",
  "This Week",
  "This Month",
  "This Quarter",
];

export default function MytaskPMV() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

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
  const [selectedShow, setSelectedShow] = useState<string>("Show Entries");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Period");
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

  const dropdownsContainerRef = useRef<HTMLDivElement>(null);
  const employeeTriggerRef = useRef<HTMLButtonElement>(null);
  const employeeMenuRef = useRef<HTMLDivElement>(null);
  const projectsTriggerRef = useRef<HTMLButtonElement>(null);
  const projectsMenuRef = useRef<HTMLDivElement>(null);
  const showTriggerRef = useRef<HTMLButtonElement>(null);
  const showMenuRef = useRef<HTMLDivElement>(null);
  const periodTriggerRef = useRef<HTMLButtonElement>(null);
  const periodMenuRef = useRef<HTMLDivElement>(null);

  const uniqueById = <T extends { id?: number | string }>(rows: T[]): T[] => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const row of rows) {
      const key = String(row?.id ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  };

  useEffect(() => {
    const myScopeParams: Record<string, string> = {};
    const taskParams: Record<string, string> = {};
    if (statusFilter) taskParams.status = statusFilter;
    if (isTeam) {
      taskParams.condition = "1";
      taskParams.employeeid = "all";
    }

    setLoading(true);
    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params: myScopeParams }),
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params: taskParams }),
      api.get<{ resources?: Employee[] }>("/api/vendors/vendor-resource-profiles"),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
    ]).then(([myTasksRes, allTasksRes, resourcesRes, projRes]) => {
      const myTasks = myTasksRes.data.tasks ?? [];
      const allTasks = allTasksRes.data.tasks ?? [];
      const allProjects = projRes.data.projects ?? [];

      const involvedProjectIds = new Set<number>(
        myTasks
          .map((t) => Number(t.project_id ?? t.projectid))
          .filter((id) => !Number.isNaN(id) && id > 0),
      );

      const scopedTasks =
        involvedProjectIds.size > 0
          ? allTasks.filter((t) => {
            const pid = Number(t.project_id ?? t.projectid);
            return !Number.isNaN(pid) && involvedProjectIds.has(pid);
          })
          : [];

      const scopedProjects =
        involvedProjectIds.size > 0
          ? allProjects.filter((p) => involvedProjectIds.has(Number(p.id)))
          : [];

      setList(uniqueById(scopedTasks));
      setEmployees(resourcesRes.data.resources ?? []);
      setProjects(uniqueById(scopedProjects));
    }).catch(() => {
      toast.error("Failed to load tasks");
    }).finally(() => setLoading(false));
  }, [statusFilter, isTeam]);

  useEffect(() => {
    if (openDropdown === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      let refs: React.RefObject<HTMLElement | null>[] = [];
      if (openDropdown === "employee") refs = [employeeTriggerRef, employeeMenuRef];
      else if (openDropdown === "projects") refs = [projectsTriggerRef, projectsMenuRef];
      else if (openDropdown === "show") refs = [showTriggerRef, showMenuRef];
      else if (openDropdown === "period") refs = [periodTriggerRef, periodMenuRef];

      const inside = refs.some((r) => r.current && r.current.contains(target));
      if (!inside) setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdown]);

  const allTasks = list.filter((t) => t && t.id != null).filter((t) => {
    if (selectedEmployee && !["Select Employee", "Show All", "Employee"].includes(selectedEmployee)) {
      if (t.assigned_full_name !== selectedEmployee) return false;
    }
    if (selectedProject && !["Select Projects", "Show All", "Projects"].includes(selectedProject)) {
      if (t.project_name !== selectedProject) return false;
    }
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
    normalizeStatus(t.status, t.Approval);





  const openDeleteTask = (task: Task) => setDeleteTaskId(task.id);
  const confirmDeleteTask = () => {
    if (deleteTaskId === null) return;
    api.delete(`/api/vendors/vendor-tasks/${deleteTaskId}`).then(() => {
      setList(prev => prev.filter(t => t.id !== deleteTaskId));
      toast.success("Task deleted");
    }).catch(() => toast.error("Failed to delete task")).finally(() => setDeleteTaskId(null));
  };
  const openEditTask = (task: Task) => navigate("/vpm/mytasks/edit", { state: { task } });
  const openViewTask = (task: Task) => navigate(`/vpm/mytasks/view/${task.id}`, { state: { task } });

  const employeeOptions = ["Select Employee", "Show All", ...employees.map(e => e.full_name).filter(Boolean)];
  const projectOptions = ["Select Projects", "Show All", ...projects.map(p => p.project_name).filter(Boolean)];

  const counts = {
    todo: allTasks.filter(t => getEffectiveStatus(t) === "todo").length,
    in_progress: allTasks.filter(t => getEffectiveStatus(t) === "in_progress").length,
    completed: allTasks.filter(t => getEffectiveStatus(t) === "completed").length,
  };

  const tasksByStatus = {
    todo: allTasks.filter(t => getEffectiveStatus(t) === "todo"),
    in_progress: allTasks.filter(t => getEffectiveStatus(t) === "in_progress"),
    completed: allTasks.filter(t => getEffectiveStatus(t) === "completed"),
  };

  const showLimit = selectedShow === "All" || !selectedShow || selectedShow === "Show Entries"
    ? Number.POSITIVE_INFINITY
    : (() => {
      const parts = selectedShow.split("-");
      if (parts.length === 2) return Number(parts[1]) || 50;
      return Number(selectedShow) || 50;
    })();

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
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-white font-Gantari">
      <div className="pb-3 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3 pt-4">
          <h2 className="text-2xl font-semibold text-slate-800">
            {isTeam ? "Team Task" : "My Task"}
          </h2>
          <div ref={dropdownsContainerRef} className="flex flex-wrap items-center gap-2 w-fit">
            <TaskDropdown
              label="Select Employee"
              options={employeeOptions}
              selected={selectedEmployee}
              onSelect={setSelectedEmployee}
              isOpen={openDropdown === "employee"}
              onToggle={() => setOpenDropdown(d => (d === "employee" ? null : "employee"))}
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
              onToggle={() => setOpenDropdown(d => (d === "projects" ? null : "projects"))}
              onClose={() => setOpenDropdown(null)}
              triggerRef={projectsTriggerRef}
              dropdownRef={projectsMenuRef}
              searchable
              searchPlaceholder="Search project..."
              maxVisibleItems={5}
            />
            <TaskDropdown
              label="Show Entries"
              options={SHOW_OPTIONS}
              selected={selectedShow}
              onSelect={setSelectedShow}
              isOpen={openDropdown === "show"}
              onToggle={() => setOpenDropdown(d => (d === "show" ? null : "show"))}
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
              onToggle={() => setOpenDropdown(d => (d === "period" ? null : "period"))}
              onClose={() => setOpenDropdown(null)}
              triggerRef={periodTriggerRef}
              dropdownRef={periodMenuRef}
              narrow
            />
            <button
              type="button"
              onClick={() => navigate("/vpm/mytasks/add")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer border-0"
            >
              <img src={AddBtn} alt="Add" className="h-5 w-5" />
              Add task
            </button>
          </div>
        </div>
        {/* Status summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <Link
            to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
            className={`flex p-4 gap-4 rounded-xl border py-4 transition-all relative ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200 shadow-sm"}`}
          >
            <span className="text-xl font-bold text-[#0D1829]">To Do</span>
            <span className="text-xl font-bold text-[#0D1829]">({counts.todo})</span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group1} alt="To Do" className="w-8 h-8" />
            </div>
          </Link>

          <Link
            to={statusFilter === "in_progress" ? pathname : `${pathname}?status=in_progress`}
            className={`flex p-4 gap-4 rounded-xl border py-4 transition-all relative ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200 shadow-sm"}`}
          >
            <span className="text-xl font-bold text-[#0D1829]">In Progress</span>
            <span className="text-xl font-bold text-[#0D1829]">({counts.in_progress})</span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group2} alt="In Progress" className="w-8 h-8" />
            </div>
          </Link>

          <Link
            to={statusFilter === "completed" ? pathname : `${pathname}?status=completed`}
            className={`flex p-4 gap-4 rounded-xl border py-4 transition-all relative ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200 shadow-sm"}`}
          >
            <span className="text-xl font-bold text-[#0D1829]">Completed</span>
            <span className="text-xl font-bold text-[#0D1829]">({counts.completed})</span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group3} alt="Completed" className="w-8 h-8" />
            </div>
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {["todo", "in_progress", "completed"].map((stat) => (
            <div key={stat} className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1">
               {(displayedTasksByStatus as any)[stat].map((t: Task) => (
                 <TaskCard key={t.id} task={t} status={stat as any} onEditTask={openEditTask} onDeleteTask={openDeleteTask} onViewTask={openViewTask} />
               ))}
            </div>
          ))}
        </div>
      </div>

      {deleteTaskId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-Gantari">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-visible">
            <div className="flex items-center justify-between px-6 py-4 border-0">
              <div className="w-9" />
              <h3 className="flex-1 text-center text-lg font-semibold text-[#353535]">Delete Task</h3>
              <div className="group relative">
                <button type="button" onClick={() => setDeleteTaskId(null)} className="p-1 rounded-sm text-black bg-[#F0F0F0] cursor-pointer border-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="absolute top-full right-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px] ml-auto mr-1"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">Close</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-10 text-center text-black">Are you sure, you want to Delete this Task?</div>
            <div className="flex justify-center gap-3 px-6 py-6">
              <button type="button" onClick={() => setDeleteTaskId(null)} className="rounded-md bg-[#F0F0F0] px-10 py-2 text-sm font-medium text-black cursor-pointer border-0">Discard</button>
              <button type="button" onClick={confirmDeleteTask} className="rounded-lg bg-[#FFD9D9] px-10 py-2 text-sm font-medium text-[#E00100] cursor-pointer border-0">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
