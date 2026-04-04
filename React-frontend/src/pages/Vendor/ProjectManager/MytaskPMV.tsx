import { useEffect, useState, useRef, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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
import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";
import { formatTimeForDisplay } from "../../TechnicalDirector/MytaskTD";

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
  /** Comma-separated resource ids or names involved in this project */
  members?: string;
  members_names?: string[];
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  uploader_name?: string | null;
}

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
  perferstart_time?: string;
  perferend_time?: string;
  /** Comma-separated filenames under `uploads/task/` */
  outputfilepath?: string;
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

/** Normalize various date strings to yyyy-mm-dd for <input type="date" />. */
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

export function normalizeStatus(
  status: string | undefined,
): "todo" | "in_progress" | "completed" {
  if (!status) return "todo";
  const s = status.toLowerCase();
  if (s.includes("in") && s.includes("progress")) return "in_progress";
  if (s.includes("complete")) return "completed";
  return "todo";
}

/** Dropdown used for filters. */
interface FormDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  searchable?: boolean;
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
  searchable = false,
}: FormDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredOptions = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : options;

  const displayLabel =
    options.find((o) => o.value === value)?.label || label;

  const fieldShellClass =
    "flex h-[40px] w-full items-center justify-between rounded-sm bg-[#F2F3F4] px-4 py-2 transition-all duration-200 border border-transparent";

  return (
    <div className="relative w-full">
      {searchable && isOpen ? (
        <div className={`${fieldShellClass} border-[#AEACAC52]`}>
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") onClose();
            }}
            placeholder={label}
            className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[#353535] outline-none placeholder-[#8B8B8B]"
            aria-expanded={isOpen}
            aria-label={label}
            role="combobox"
            aria-autocomplete="list"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="shrink-0 cursor-pointer rounded p-0.5 outline-none"
            aria-label="Close list"
          >
            <img
              src={ArrowDown}
              alt=""
              className="h-3 w-3 rotate-180 transition-transform"
            />
          </button>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`${fieldShellClass} cursor-pointer outline-none focus-visible:border-[#AEACAC52]`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label}
        >
          <span
            className={`min-w-0 flex-1 truncate text-left ${value ? "text-[#353535]" : "text-[#8B8B8B]"}`}
          >
            {displayLabel}
          </span>
          <img
            src={ArrowDown}
            alt=""
            className={`ml-auto h-3 w-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      )}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute top-full left-0 z-50 mt-0.5 w-full overflow-hidden rounded-md border border-[#E0E0E0] bg-white shadow-lg"
        >
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {filteredOptions.length === 0 && (
              <div className="px-4 py-2 text-sm text-[#8B8B8B]">No results</div>
            )}
            {filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt.value);
                  if (searchable) setSearchQuery("");
                  onClose();
                }}
                className="block w-full px-4 py-2 text-left text-[14px] font-Gantari text-[#8B8B8B] transition-colors hover:bg-[#F2F2F2] hover:text-[#353535] cursor-pointer"
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
  menuAlign?: "left" | "right";
  menuUseFixedLayer?: boolean;
  triggerVariant?: "default" | "compositeEnd";
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
  maxVisibleItems = 5,
  menuAlign = "left",
  menuUseFixedLayer = false,
  triggerVariant = "default",
}: TaskDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fixedPlacement, setFixedPlacement] = useState<{
    top: number;
    right?: number;
    left?: number;
    maxH: number;
    maxW: number;
    minW: number;
  } | null>(null);

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
          const name = String(opt ?? "").trim().toLowerCase();
          return name.includes(q);
        });
      })()
    : options;

  useLayoutEffect(() => {
    if (!isOpen || !menuUseFixedLayer || !triggerRef.current) {
      setFixedPlacement(null);
      return;
    }
    const el = triggerRef.current;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 4;
      const minW = narrow ? 110 : 200;
      const maxW = 320;
      const searchH = searchable ? 56 : 0;
      const listCap = maxVisibleItems * 40 + 16;
      const maxH = Math.min(
        listCap + searchH,
        Math.max(120, vh - r.bottom - gap - 12),
        320,
      );
      if (narrow || menuAlign === "right") {
        setFixedPlacement({
          top: r.bottom + gap,
          right: vw - r.right,
          maxH,
          maxW,
          minW,
        });
      } else {
        setFixedPlacement({
          top: r.bottom + gap,
          left: Math.max(8, Math.min(r.left, vw - maxW - 8)),
          maxH,
          maxW,
          minW,
        });
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, menuUseFixedLayer, menuAlign, narrow, maxVisibleItems, searchable, triggerRef]);

  const triggerButtonClass =
    triggerVariant === "compositeEnd"
      ? "inline-flex h-full min-h-[40px] w-auto shrink-0 items-center justify-between gap-2 border-0 border-l border-[#E0E0E0] bg-[#E2E2E2] px-4 py-2 text-[14px] font-Gantari text-[#8B8B8B] cursor-pointer outline-none transition-colors hover:bg-[#dadada]"
      : `inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-[14px] cursor-pointer ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`;

  const menuContent = (
    <>
      {searchable && (
        <div className="shrink-0 border-b border-slate-100 bg-white p-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-transparent bg-[#F2F3F4] px-3 py-2 text-sm font-Gantari text-[#353535] outline-none transition-colors focus:border-[#AEACAC52]"
          />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto py-1 custom-scrollbar font-Gantari">
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
            className={`block w-full px-4 py-2 text-left text-[14px] font-Gantari transition-colors cursor-pointer ${selected === opt ? "bg-[#F2F2F2] text-[#353535]" : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className={triggerVariant === "compositeEnd" ? "relative flex h-full min-h-0 shrink-0 self-stretch" : "relative"}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={triggerButtonClass}
        aria-expanded={isOpen}
      >
        <span className={`truncate font-Gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#616161]"}`}>
          {label.toLowerCase() === "show" && selected && selected !== label ? (
            <>
              <span className="text-[14px] text-[#353535]">Show:</span>{" "}
              <span>{selected}</span>
            </>
          ) : (
            (selected ?? label)
          )}
        </span>
        <img
          src={ArrowDown}
          alt=""
          className={`ml-2 h-3 w-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen &&
        (menuUseFixedLayer
          ? fixedPlacement &&
            createPortal(
              <div
                ref={dropdownRef}
                role="listbox"
                className="fixed z-[9999] overflow-hidden rounded-md border border-[#E0E0E0] bg-white shadow-xl"
                style={{
                  top: fixedPlacement.top,
                  right: fixedPlacement.right,
                  left: fixedPlacement.left,
                  maxHeight: fixedPlacement.maxH,
                  width: "100%",
                  maxWidth: fixedPlacement.maxW,
                  minWidth: fixedPlacement.minW,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {menuContent}
              </div>,
              document.body,
            )
          : (
              <div
                ref={dropdownRef}
                role="listbox"
                className={`absolute top-full z-50 mt-1 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ${narrow ? "right-0 min-w-[110px]" : "left-0 min-w-[160px]"}`}
              >
                {menuContent}
              </div>
            ))}
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
          >
            <img src={Dot} alt="Dot" className="w-5 h-5 object-contain" />
          </button>
          {menuOpen && (
            <div
              className="absolute top-full mt-1 right-0 z-50 min-w-[170px] bg-white/40 backdrop-blur-xl rounded-[15px] border border-[#59595980] shadow-2xl py-2.5 transition-all duration-200 ease-out font-Gantari origin-top-right"
              role="menu"
            >
              <button
                type="button"
                className="flex w-full items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer text-[#353535] hover:bg-white/40"
                onClick={() => {
                  setMenuOpen(false);
                  onViewTask?.(task);
                }}
              >
                <img src={viewIcon} alt="view" className="w-5 h-5" />
                <span className="text-[15px] font-medium group-hover:text-[#DD4342]">View</span>
              </button>
              {!isCompleted && (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer text-[#353535] hover:bg-white/40"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditTask?.(task);
                    }}
                  >
                    <img src={editIcon} alt="edit" className="w-5 h-5" />
                    <span className="text-[15px] font-medium group-hover:text-[#DD4342]">Edit</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer text-[#353535] hover:bg-white/40"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteTask?.(task);
                    }}
                  >
                    <img src={deleteIcon} alt="delete" className="w-5 h-5" />
                    <span className="text-[15px] font-medium group-hover:text-[#DD4342]">Delete</span>
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
        <button
          type="button"
          onClick={() => onViewTask?.(task)}
          className="group inline-flex items-center text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] gap-2 transition-colors cursor-pointer font-Gantari"
        >
          Details
          <img src={Arrow} alt="Arrow" className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

const SHOW_OPTIONS = ["Show Entries", "1-50", "51-100", "101-150", "151-200", "201-250", "251-300", "301-350", "351-400", "401-450", "All"];
const PERIOD_OPTIONS = ["Period", "This Week", "This Month", "This Quarter"];

export default function MytaskPMV() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const isTeam = pathname.includes("/teamtask");
  const statusFilter = searchParams.get("status") || searchParams.get("taskstatus");
  
  const [list, setList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>("Select Employee");
  const [selectedProject, setSelectedProject] = useState<string | null>("Select Projects");
  const [selectedShow, setSelectedShow] = useState<string | null>("Show Entries");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>("Period");
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

  const navigate = useNavigate();
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
      if (dropdownsContainerRef.current && !dropdownsContainerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdown]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (isTeam) params.condition = "1";
    
    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params }),
      api.get<{ resources?: Employee[] }>("/api/vendors/vendor-resource-profiles"),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects", { params: { all: "1" } }),
    ]).then(([tasksRes, resRes, projRes]) => {
      setList(tasksRes.data.tasks ?? []);
      setEmployees(resRes.data.resources ?? []);
      setProjects(projRes.data.projects ?? []);
    }).catch(err => {
      console.error(err);
      toast.error("Failed to load data");
    }).finally(() => setLoading(false));
  }, [isTeam]);

  const employeeOptions = useMemo(() => {
    const base = ["Select Employee", "Show All"];
    return [...base, ...employees.map(e => e.full_name)];
  }, [employees]);

  const projectOptions = useMemo(() => {
    const base = ["Select Projects", "Show All"];
    return [...base, ...projects.map(p => p.project_name)];
  }, [projects]);

  const allFiltered = list.filter(t => {
    if (selectedEmployee && !["Select Employee", "Show All"].includes(selectedEmployee)) {
        if (t.assigned_full_name !== selectedEmployee) return false;
    }
    if (selectedProject && !["Select Projects", "Show All"].includes(selectedProject)) {
        if (t.project_name !== selectedProject) return false;
    }
    return true;
  });

  const counts = {
    todo: allFiltered.filter(t => normalizeStatus(t.status) === "todo").length,
    in_progress: allFiltered.filter(t => normalizeStatus(t.status) === "in_progress").length,
    completed: allFiltered.filter(t => normalizeStatus(t.status) === "completed").length,
  };

  const tasksByStatus = {
    todo: allFiltered.filter(t => normalizeStatus(t.status) === "todo"),
    in_progress: allFiltered.filter(t => normalizeStatus(t.status) === "in_progress"),
    completed: allFiltered.filter(t => normalizeStatus(t.status) === "completed"),
  };

  const showLimit = selectedShow === "All" || !selectedShow || selectedShow === "Show Entries" 
    ? 9999 
    : parseInt(selectedShow.split("-")[1] || "50");

  const displayedTasks = {
    todo: tasksByStatus.todo.slice(0, showLimit),
    in_progress: tasksByStatus.in_progress.slice(0, showLimit),
    completed: tasksByStatus.completed.slice(0, showLimit),
  };

  const handleMoveTask = (taskId: number, newStatus: "todo" | "in_progress" | "completed") => {
    const apiStatus = newStatus === "todo" ? "Todo" : newStatus === "in_progress" ? "InProgress" : "Completed";
    setList(prev => prev.map(t => t.id === taskId ? { ...t, status: apiStatus } : t));
    api.patch(`/api/vendors/vendor-tasks/${taskId}/status`, { status: apiStatus })
       .catch(() => toast.error("Failed to update status"));
  };

  const openEditTask = (task: Task) => navigate("/vpm/mytasks/add", { state: { task } });
  const openDeleteTask = (task: Task) => setDeleteTaskId(task.id);
  const openViewTask = (task: Task) => navigate(`/v/mytasks/view/${task.id}`, { state: { task } });

  const confirmDeleteTask = () => {
    if (deleteTaskId === null) return;
    api.delete(`/api/vendors/vendor-tasks/${deleteTaskId}`)
      .then(() => {
        setList(prev => prev.filter(t => t.id !== deleteTaskId));
        toast.success("Task deleted");
      })
      .finally(() => setDeleteTaskId(null));
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-white font-Gantari">
      <div className="bg-white pb-3 flex-shrink-0 px-6 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <h2 className="text-[24px] font-semibold text-slate-800">
            {isTeam ? "Team Task" : "My Task"}
          </h2>
          <div ref={dropdownsContainerRef} className="flex flex-wrap items-center gap-2 w-fit">
            <TaskDropdown
              label="Select Employee"
              options={employeeOptions}
              selected={selectedEmployee}
              onSelect={setSelectedEmployee}
              isOpen={openDropdown === "employee"}
              onToggle={() => setOpenDropdown(d => d === "employee" ? null : "employee")}
              onClose={() => setOpenDropdown(null)}
              triggerRef={employeeTriggerRef}
              dropdownRef={employeeMenuRef}
              searchable
            />
            <TaskDropdown
              label="Select Projects"
              options={projectOptions}
              selected={selectedProject}
              onSelect={setSelectedProject}
              isOpen={openDropdown === "projects"}
              onToggle={() => setOpenDropdown(d => d === "projects" ? null : "projects")}
              onClose={() => setOpenDropdown(null)}
              triggerRef={projectsTriggerRef}
              dropdownRef={projectsMenuRef}
              searchable
            />
            <TaskDropdown
              label="Show Entries"
              options={SHOW_OPTIONS}
              selected={selectedShow}
              onSelect={setSelectedShow}
              isOpen={openDropdown === "show"}
              onToggle={() => setOpenDropdown(d => d === "show" ? null : "show")}
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
              onToggle={() => setOpenDropdown(d => d === "period" ? null : "period")}
              onClose={() => setOpenDropdown(null)}
              triggerRef={periodTriggerRef}
              dropdownRef={periodMenuRef}
              narrow
            />
            <button
              onClick={() => navigate("/vpm/mytasks/add")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer"
            >
              <img src={AddBtn} alt="Add" className="h-5 w-5" />
              Add task
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          <Link to={`${pathname}?status=todo`} className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative transition-all ${normalizeStatus(statusFilter) === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}>
            <span className="text-xl font-bold text-[#0D1829]">To Do ({counts.todo})</span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4"><img src={Group1} alt="" className="w-8 h-8" /></div>
          </Link>
          <Link to={`${pathname}?status=in_progress`} className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative transition-all ${normalizeStatus(statusFilter) === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}>
            <span className="text-xl font-bold text-[#0D1829]">In Progress ({counts.in_progress})</span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4"><img src={Group2} alt="" className="w-8 h-8" /></div>
          </Link>
          <Link to={`${pathname}?status=completed`} className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative transition-all ${normalizeStatus(statusFilter) === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}>
            <span className="text-xl font-bold text-[#0D1829]">Completed ({counts.completed})</span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4"><img src={Group3} alt="" className="w-8 h-8" /></div>
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 mt-4">
          <div className="space-y-3" onDragOver={e => e.preventDefault()} onDrop={e => handleMoveTask(Number(e.dataTransfer.getData("taskId")), "todo")}>
            {displayedTasks.todo.map(t => <TaskCard key={t.id} task={t} status="todo" onViewTask={openViewTask} onEditTask={openEditTask} onDeleteTask={openDeleteTask} />)}
          </div>
          <div className="space-y-3" onDragOver={e => e.preventDefault()} onDrop={e => handleMoveTask(Number(e.dataTransfer.getData("taskId")), "in_progress")}>
            {displayedTasks.in_progress.map(t => <TaskCard key={t.id} task={t} status="in_progress" onViewTask={openViewTask} onEditTask={openEditTask} onDeleteTask={openDeleteTask} />)}
          </div>
          <div className="space-y-3" onDragOver={e => e.preventDefault()} onDrop={e => handleMoveTask(Number(e.dataTransfer.getData("taskId")), "completed")}>
            {displayedTasks.completed.map(t => <TaskCard key={t.id} task={t} status="completed" onViewTask={openViewTask} onEditTask={openEditTask} onDeleteTask={openDeleteTask} />)}
          </div>
        </div>
      </div>

      {deleteTaskId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center">
            <h3 className="text-xl font-bold mb-4">Delete Task</h3>
            <p className="mb-6">Are you sure you want to delete this task?</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setDeleteTaskId(null)} className="px-6 py-2 rounded-lg bg-slate-100 font-medium">Cancel</button>
              <button onClick={confirmDeleteTask} className="px-6 py-2 rounded-lg bg-red-100 text-red-600 font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
