import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
//import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import Group1 from "../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../assets/ProjectManager/MyTask/arrow.svg";
import Dot from "../../assets/ProjectManager/MyTask/Dot.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import AddBtn from "../../assets/TechnicalDirector/add btn.svg";
import closeBtnIcon from "../../assets/ProductNavbarIcons/close button.svg";

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || "";
const getProfileUrl = (path: string | undefined): string => {
  if (!path || path.trim() === "") return "";
  if (path.startsWith("http")) return path;
  const normalizedPath = path.replace(/\\/g, "/").trim().replace(/^\d+\s+/, "").replace(/^\/+/, "");
  const apiBaseUrl = getApiBaseUrl();
  let urlPath = "";
  if (normalizedPath.startsWith("employee/")) {
    const parts = normalizedPath.split("/");
    const encodedParts = parts.map((part, index) => index === 0 ? part : encodeURIComponent(part));
    urlPath = `/uploads/${encodedParts.join("/")}`;
  } else if (normalizedPath.startsWith("profiles/")) {
    const filename = normalizedPath.replace("profiles/", "");
    urlPath = `/uploads/employee/${encodeURIComponent(filename)}`;
  } else if (!normalizedPath.includes("/")) {
    urlPath = `/uploads/employee/${encodeURIComponent(normalizedPath)}`;
  } else {
    const parts = normalizedPath.split("/");
    const encodedParts = parts.map((part, index) => index === 0 ? part : encodeURIComponent(part));
    urlPath = `/uploads/${encodedParts.join("/")}`;
  }
  return `${apiBaseUrl}${urlPath}`;
};

type DropdownId = "employee" | "projects" | "period" | null;

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
  maxVisibleItems = 4,
}: TaskDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const q = (searchQuery || "").trim().toLowerCase();
  const filteredOptions = searchable
    ? (() => {
      if (!q) return options;
      const first = options[0];
      const isPlaceholderOption = (o: string) =>
        o === first && (first === "Select Employee" || first === "Select Projects");
      return options.filter((opt) => {
        if (isPlaceholderOption(opt)) return false; // hide placeholder when searching
        const name = String(opt ?? "").trim().toLowerCase();
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
        className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-1.5 sm:py-2 text-[14px] font-semibold font-Gantari cursor-pointer ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span
          className={`truncate font-Gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#8B8B8B]"}`}
        >
          {label.toLowerCase() === 'show' && selected && selected !== label ? (
            <>
              <span className="text-[14px]">{label}:</span>{" "}
              <span className="font-semibold">{selected}</span>
            </>
          ) : (
            selected || label
          )}
        </span>
        <img
          src={ArrowDown}
          alt="arrow"
          className={`ml-2 w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className={`absolute top-full z-[100] mt-1 rounded-lg border border-gray-200 bg-white shadow-lg ${narrow ? "right-0 min-w-[110px]" : "left-0 min-w-[160px]"}`}
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
            className="overflow-y-auto py-1 custom-scrollbar"
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
                className={`block w-full px-4 py-2 text-left text-[14px] font-Gantari font-normal transition-colors cursor-pointer ${selected === opt ? "bg-[#F2F2F2] text-[#353535]" : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"}`}
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
  Approval?: string;
  projectid?: number;
  created_at?: string;
  Actual_start_time?: string;
  source?: "In House" | "Outsource";
}

interface Employee {
  id: number;
  full_name: string;
  active?: string | null;
}

interface Project {
  id: number;
  project_name: string;
  tasks?: string;
  members?: string;
  members_names?: string[];
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  uploader_name?: string | null;
  source?: "In House" | "Outsource";
}

/** Map task (local or API shape) to form values so every detail shows in edit. */
//function taskToFormValues(task: Task | Record<string, unknown>): {
//  projectName: string;
//  module: string;
//  taskName: string;
//  type: string;
//  actualStartDate: string;
//  actualEndDate: string;
//  startTime: string;
//  dueTime: string;
//  assignTo: string;
//  description: string;
//  checklist: string;
//} {
//  const t = task as Record<string, unknown>;
//  const str = (v: unknown) => (v != null ? String(v) : "");
//  const dateOnly = (v: unknown) => {
//    if (v == null) return "";
//    const s = str(v);
//    if (s.length >= 10) return s.slice(0, 10);
//    return s;
//  };
//   const timeOnly = (v: unknown) => {
//     if (v == null) return "";
//     const s = str(v);
//     const match = s.match(/(\d{1,2}):(\d{2})/);
//     return match ? `${match[1].padStart(2, "0")}:${match[2]}` : s.slice(0, 5);
//   };
//   return {
//     projectName: str(t.project_name ?? t.projectName ?? ""),
//     module: str(t.module ?? t.modules_name ?? ""),
//     taskName: str(t.task_name ?? t.taskName ?? ""),
//     type: str(t.type ?? t.category ?? ""),
//     actualStartDate: dateOnly(
//       t.start_date ?? t.startDate ?? t.Actual_start_time ?? "",
//     ),
//     actualEndDate: dateOnly(t.due_date ?? t.dueDate ?? ""),
//     startTime: timeOnly(
//       t.perferstart_time ?? t.start_time ?? t.startTime ?? t.Actual_start_time ?? "",
//     ),
//     dueTime: timeOnly(t.perferend_time ?? t.due_time ?? t.dueTime ?? t.end_time ?? ""),
//     assignTo: str(t.assign_to ?? t.assignTo ?? t.assigned_to ?? ""),
//     description: str(t.description ?? ""),
//     checklist: str(t.checklist ?? ""),
//   };
// }


function normalizeStatus(
  s: string | undefined,
  approval?: string,
): "todo" | "in_progress" | "completed" {
  if (approval?.toLowerCase() === "approved") return "completed";
  if (approval?.toLowerCase() === "rejected") return "completed";
  if (!s) return "todo";
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  // Align with /api/tasks + /api/dashboard/td-stats in-progress rules
  if (
    lower === "started" ||
    lower.includes("progress") ||
    lower === "in_progress"
  )
    return "in_progress";
  if (lower.includes("complete") || lower === "done") return "completed";
  return "todo";
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
  const progress = typeof task.progress === "number" ? task.progress : (status === "todo" ? 0 : status === "in_progress" ? 50 : 100);
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

  const isCompleted = status === "completed";
  const isOutsource = (task as any).source === "Outsource";

  const handleDragStart = (e: React.DragEvent) => {
    if (isCompleted || isOutsource) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("taskId", String(task.id));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.task_name || "Task");
  };

  return (
    <div
      draggable={!isCompleted && !isOutsource}
      onDragStart={handleDragStart}
      className={`rounded-md border border-slate-200 bg-white p-2.5 shadow-sm relative mx-auto w-full max-w-full lg:max-w-none ${isCompleted || isOutsource ? "cursor-default opacity-90" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="flex-1 min-w-0 font-semibold text-[#353535] text-[18px] truncate leading-tight">
          {task.task_name || "Task Name"}
        </h4>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="p-1 rounded cursor-pointer leading-none"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <img src={Dot} alt="Dot" className="w-5 h-5 object-contain" />
          </button>
          {menuOpen && (
            <div
              className={`absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-white/20 backdrop-blur-md rounded-md border border-[#59595980] shadow-xl transition-all duration-200 ease-out origin-top-right
                                ${menuOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
                <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                  View
                </span>
              </button>
              {!isCompleted && !isOutsource && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
                    className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-col ">
          <span className="text-[14px] font-medium text-[#000000]">Start Date</span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {(task.start_date || task.Actual_start_time)
              ? `${new Date(task.start_date || task.Actual_start_time!).getDate().toString().padStart(2, "0")}-${(new Date(task.start_date || task.Actual_start_time!).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.start_date || task.Actual_start_time!).getFullYear()}`
              : "—"}
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-[14px] font-medium text-[#000000]">End Date</span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {task.due_date
              ? `${new Date(task.due_date).getDate().toString().padStart(2, "0")}-${(new Date(task.due_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.due_date).getFullYear()}`
              : "—"}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs text-[#8B8B8B]">Progress</span>
        <span className="text-xs font-medium text-[#8B8B8B]">
          {progress}%
        </span>
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
                    ? getGlobalProfileUrl(task.assigned_to, task.assigned_profile_picture)
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
                      <img src={src} alt={task.assigned_full_name} className="w-full h-full object-cover" />
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
                    ? getGlobalProfileUrl(task.uploaderid, task.uploader_profile_picture)
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
                      <img src={src} alt={task.uploader_full_name} className="w-full h-full object-cover" />
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
          className="group inline-flex items-center text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] gap-2 cursor-pointer"
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

const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";
const SHOW_ENTRIES_SELECTED_PREFIX = "Show:";
const showEntriesOptions: {
  value: string;
  label: string;
  start: number;
  end: number | null;
}[] = [
    { value: "1-50", label: "1-50", start: 0, end: 50 },
    { value: "51-100", label: "51-100", start: 50, end: 100 },
    { value: "101-150", label: "101-150", start: 100, end: 150 },
    { value: "151-200", label: "151-200", start: 150, end: 200 },
    { value: "201-250", label: "201-250", start: 200, end: 250 },
    { value: "251-300", label: "251-300", start: 250, end: 300 },
    { value: "all", label: "All", start: 0, end: null },
  ];
const PERIOD_OPTIONS = [
  "Period",
  "This Week",
  "This Month",
  "This Quarter",
  "Custom",
];

export default function TeamtaskTD() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const isTeam =
    searchParams.get("condition") === "1" ||
    pathname.includes("teamtask") ||
    pathname.endsWith("/team");
  const statusFilter =
    searchParams.get("status") || searchParams.get("taskstatus");
  const STORAGE_KEY = "pm_teamTask_localTasks";
  const DELETED_IDS_KEY = "pm_teamTask_deletedIds";
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

  const loadDeletedIds = (): number[] => {
    try {
      const raw = localStorage.getItem(DELETED_IDS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as number[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const [deletedIds, setDeletedIds] = useState<number[]>(loadDeletedIds);
  const [loading, setLoading] = useState(true);

  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(
    searchParams.get("project") || null
  );

  useEffect(() => {
    const proj = searchParams.get("project");
    if (proj) setSelectedProject(proj);
  }, [searchParams]);
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const buildStatusLink = (nextStatus: string) => {
    const params = new URLSearchParams(searchParams as any);
    params.set("status", nextStatus);
    return `${pathname}?${params.toString()}`;
  };

  // IMPORTANT:
  // `localTasks` is persisted in localStorage to support optimistic UI updates after moving/editing.
  // When user switches the URL status filter, server-side truth for statuses changes (Todo/InProgress/Completed).
  // If we keep `localTasks`, it can incorrectly override server statuses and show Todo tasks under InProgress column.
  useEffect(() => {
    setLocalTasks([]);
  }, [statusFilter]);

  const employeeOptions = useMemo(() => {
    const raw = Array.isArray(employees) ? employees : [];
    if (!selectedProject || selectedProject === "Select Projects" || selectedProject === "Show All" || selectedProject === "Projects") {
      return ["Select Employee", "Show All", ...raw.map((e) => e.full_name).filter(Boolean)];
    }
    const proj = projects.find((p) => p.project_name === selectedProject);
    if (!proj) {
      return ["Select Employee", "Show All", ...raw.map((e) => e.full_name).filter(Boolean)];
    }

    const memberTokens = (proj.members || "").split(",").map(s => s.trim()).filter(Boolean);
    const filtered = raw.filter(emp => {
      const name = (emp.full_name || "").trim();
      const idStr = String(emp.id);
      return memberTokens.some(t => t === idStr || t.toLowerCase() === name.toLowerCase());
    });

    return ["Select Employee", "Show All", ...filtered.map(e => e.full_name)];
  }, [employees, projects, selectedProject]);

  const projectOptions = [
    "Select Projects",
    ...projects.map((p) => p.project_name),
  ];


  const merged = [
    ...localTasks,
    ...list.filter((t) => !localTasks.some((l) => l.id === t.id)),
  ];
  const allTasksBase = merged.filter((t) => !deletedIds.includes(t.id));
  const allTasks = allTasksBase.filter((t: any) => {
    // Search Filter
    const searchQuery = searchParams.get('q')?.toLowerCase() || "";
    if (searchQuery) {
      const matchesSearch = (t.task_name || "").toLowerCase().includes(searchQuery) ||
        (t.project_name || "").toLowerCase().includes(searchQuery) ||
        (t.assigned_full_name || t.assign_to || "").toLowerCase().includes(searchQuery) ||
        (t.module || "").toLowerCase().includes(searchQuery) ||
        (t.type || "").toLowerCase().includes(searchQuery);
      if (!matchesSearch) return false;
    }

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
    const taskObj = merged.find(t => t.id === taskId);
    if (!taskObj) return;

    if (taskObj.source === "Outsource") {
      console.warn("Outsource tasks cannot be moved by TD/PM/MB.");
      return;
    }

    const current = normalizeStatus(taskObj.status, taskObj.Approval);
    if (current === "todo" && newStatus === "completed") {
      toast.error("Move the task to In Progress before marking it completed.");
      return;
    }
    if (current === "completed" && newStatus !== "completed") {
      toast.error("Completed tasks cannot be moved.");
      return;
    }

    const label = statusToLabel(newStatus);
    const projectId = taskObj.projectid || projects.find(p => p.project_name === taskObj.project_name)?.id;

    // Visual update immediately
    setList((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: label } : t)));
    setLocalTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === taskId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], status: label };
        return next;
      }
      const fromList = list.find((t) => t.id === taskId);
      if (fromList) return [{ ...fromList, status: label }, ...prev];
      return prev;
    });

    // Backend update (vendor / outsource tasks return early above)
    api.patch(`/api/tasks/${taskId}/status`, {
      status: newStatus.replace("_", ""), // maps "in_progress" to "inprogress", "todo" to "todo"
      projectId
    })
      .then(() => {
        setSuccessMsg("Updated successfully");
        setTimeout(() => setSuccessMsg(""), 3000);
      })
      .catch((err) => {
        console.error("Failed to update task status:", err);
      });
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localTasks));
    } catch {
      // ignore quota or parse errors
    }
  }, [localTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deletedIds));
    } catch {
      // ignore
    }
  }, [deletedIds]);

  const navigate = useNavigate();

  const openEditTask = (task: Task) => {
    navigate("/td/teamtasks/add", { state: { task, from: "teamtasks" } });
  };

  const openDeleteTask = (task: Task) => {
    setDeleteTask(task);
  };

  const openViewTask = (task: Task) => {
    navigate("/tasks/taskview", { state: { task, from: "teamtask" } });
  };

  const confirmDeleteTask = () => {
    if (deleteTask !== null) {
      const isOutsource = deleteTask.source === "Outsource";
      const endpoint = isOutsource
        ? `/api/vendors/vendor-tasks/${deleteTask.id}`
        : `/api/tasks/${deleteTask.id}`;

      api.delete(endpoint)
        .then(() => {
          const params: Record<string, string> = {
            condition: isTeam ? "1" : "0"
          };
          if (isTeam) params.employeeid = "all";

          Promise.all([
            api.get<{ tasks?: Task[] }>("/api/tasks", { params }),
            api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params })
          ]).then(([res1, res2]) => {
            const internal = (res1.data.tasks ?? []).map(t => ({ ...t, source: "In House" }));
            const vendor = (res2.data.tasks ?? []).map(t => ({ ...t, source: "Outsource" }));
            setList([...internal, ...vendor] as Task[]);
          });

          setLocalTasks((prev) => prev.filter((t) => t.id !== deleteTask.id));
          setDeletedIds((prev) =>
            prev.includes(deleteTask.id) ? prev : [...prev, deleteTask.id],
          );
          toast.success("Task Deleted Successfully");
        })
        .finally(() => {
          setDeleteTask(null);
        });
    }
  };



  const dropdownsContainerRef = useRef<HTMLDivElement>(null);
  const employeeTriggerRef = useRef<HTMLButtonElement>(null);
  const employeeMenuRef = useRef<HTMLDivElement>(null);
  const projectsTriggerRef = useRef<HTMLButtonElement>(null);
  const projectsMenuRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (openDropdown !== null) setShowEntriesOpen(false);
  }, [openDropdown]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        showEntriesOpen &&
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(t)
      ) {
        setShowEntriesOpen(false);
      }
    };
    if (showEntriesOpen) {
      document.addEventListener("mousedown", handleMouseDown);
      return () => document.removeEventListener("mousedown", handleMouseDown);
    }
  }, [showEntriesOpen]);

  useEffect(() => {
    if (showEntriesOpen && showEntriesDropdownContentRef.current) {
      showEntriesDropdownContentRef.current.scrollTop = 0;
    }
  }, [showEntriesOpen]);





  // Always load full task lists from `tasks` + `vendor_task` (no `status` query param).
  // URL `status` only drives summary-card highlight; filtering the API made To Do / Completed
  // counts show as 0 and disagreed with the TD dashboard KPIs.
  useEffect(() => {
    const params: Record<string, string> = {};
    if (isTeam) {
      params.condition = "1";
      params.employeeid = "all";
    }
    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/tasks", { params }),
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params }),
      api.get<{ employees?: Employee[] }>("/api/employees"),
      api.get<{ projects?: Project[] }>("/api/projects"),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
    ])
      .then(([resTasks, resVendorTasks, resEmployees, resProjects, resVendorProjects]) => {
        const internalTasks = (resTasks.data.tasks ?? []).map((t) => ({
          ...t,
          source: "In House" as const,
        }));
        const vendorTasks = (resVendorTasks.data.tasks ?? []).map((t) => ({
          ...t,
          source: "Outsource" as const,
        }));
        setList([...internalTasks, ...vendorTasks] as Task[]);

        setEmployees(resEmployees.data.employees ?? []);

        const internalProjs = (resProjects.data.projects ?? []).map((p) => ({
          ...p,
          source: "In House" as const,
        }));
        const vendorProjs = (resVendorProjects.data.projects ?? []).map((p) => ({
          ...p,
          source: "Outsource" as const,
        }));
        setProjects([...internalProjs, ...vendorProjs] as Project[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isTeam]);




  const tasksByStatus = {
    todo: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "todo",
    ),
    in_progress: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "in_progress",
    ),
    completed: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "completed",
    ),
  };

  const effectiveShowEntryValue =
    selectedShowEntries || showEntriesOptions[0].value;
  const selectedShowRange =
    showEntriesOptions.find((opt) => opt.value === effectiveShowEntryValue) ??
    showEntriesOptions[0];
  const sliceForShowEntries = <T,>(arr: T[]): T[] => {
    const rangeEnd =
      selectedShowRange.end === null
        ? arr.length
        : Math.min(selectedShowRange.end, arr.length);
    return arr.slice(selectedShowRange.start, rangeEnd);
  };

  const displayedTasksByStatus = {
    todo: sliceForShowEntries(tasksByStatus.todo),
    in_progress: sliceForShowEntries(tasksByStatus.in_progress),
    completed: sliceForShowEntries(tasksByStatus.completed),
  };

  const counts = {
    todo: tasksByStatus.todo.length,
    in_progress: tasksByStatus.in_progress.length,
    completed: tasksByStatus.completed.length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden bg-white custom-scrollbar relative">
      <div className="bg-white flex-shrink-0 px-1 sm:px-0 pt-0 sm:pt-0 sm:mt-2">
        {/* Row 1: Title and Add Task button for mobile only */}
        <div className="flex flex-row items-center justify-between w-full mb-4 lg:hidden">
          <h2 className="text-[20px] sm:text-[24px] font-semibold text-slate-800 font-Gantari">
            Team Task
          </h2>
          {(() => {
            const isProjOutsource = projects.find(p => p.project_name === selectedProject)?.source === "Outsource";
            return (
              <button
                type="button"
                disabled={isProjOutsource}
                onClick={() => navigate("/td/teamtasks/add", { state: { from: "teamtasks" } })}
                className={`sm:hidden inline-flex items-center justify-center gap-2 rounded-md px-4 py-1.5 text-[13px] font-medium text-[#F2F2F2] shadow-sm cursor-pointer whitespace-nowrap active:scale-[0.98] transition-all ${isProjOutsource ? "bg-gray-400 cursor-not-allowed" : "bg-[#DD4342]"}`}
              >
                <img src={AddBtn} alt="Add" className="h-4 w-4" />
                Add task
              </button>
            );
          })()}
        </div>

        {/* Row 2: Title (LG only) + Filters + Desktop Add Task button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <h2 className="hidden lg:block text-[24px] font-semibold text-slate-800 font-Gantari">
            Team Task
          </h2>
          <div
            ref={dropdownsContainerRef}
            className="grid grid-cols-2 lg:flex lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto"
          >
            <div className="w-full lg:w-auto">
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
                maxVisibleItems={4}
              />
            </div>
            <div className="w-full lg:w-auto">
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
                maxVisibleItems={4}
              />
            </div>
            <div
              className="relative w-full lg:w-[150px]"
              ref={showEntriesDropdownRef}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(null);
                  setShowEntriesOpen((o) => !o);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 sm:py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
              >
                <span
                  className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedShowEntries === ""
                    ? "text-[#8B8B8B]"
                    : "text-[#353535]"
                    }`}
                >
                  {selectedShowEntries === "" ? (
                    SHOW_ENTRIES_PLACEHOLDER
                  ) : (
                    <>
                      <span className="text-[14px]">
                        {SHOW_ENTRIES_SELECTED_PREFIX}
                      </span>{" "}
                      <span className="font-semibold">
                        {selectedShowRange.label}
                      </span>
                    </>
                  )}
                </span>
                <img
                  src={ArrowDown}
                  alt=""
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""
                    } ${selectedShowEntries === ""
                      ? "opacity-60 grayscale"
                      : "opacity-90"
                    }`}
                  aria-hidden
                />
              </button>
              {showEntriesOpen && (
                <div className="absolute top-full right-0 left-auto mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                  <div
                    ref={showEntriesDropdownContentRef}
                    className="max-h-[168px] overflow-y-auto custom-scrollbar"
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedShowEntries("");
                        setShowEntriesOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
                    >
                      {SHOW_ENTRIES_PLACEHOLDER}
                    </button>
                    {showEntriesOptions.map((opt) => {
                      const isChosen = selectedShowEntries === opt.value;
                      return (
                        <button
                          key={`${opt.value}-${opt.start}-${String(opt.end)}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedShowEntries(opt.value);
                            setShowEntriesOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen
                            ? "text-[#353535] bg-[#F2F2F2]"
                            : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"
                            }`}
                        >
                          <span className="truncate min-w-0">{opt.label}</span>
                          {isChosen && (
                            <svg
                              className="w-4 h-4 shrink-0 text-[#353535]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="w-full lg:w-auto">
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
                maxVisibleItems={4}
              />
            </div>
            {(() => {
              const isProjOutsource = projects.find(p => p.project_name === selectedProject)?.source === "Outsource";
              return (
                <button
                  type="button"
                  disabled={isProjOutsource}
                  onClick={() =>
                    navigate("/td/teamtasks/add", { state: { from: "teamtasks" } })
                  }
                  className={`hidden sm:inline-flex items-center justify-center gap-2 rounded-md px-6 py-1.5 lg:py-2 text-white rounded-md font-Gantari font-semibold transition-all shadow-sm cursor-pointer ${isProjOutsource ? "bg-gray-400 cursor-not-allowed" : "bg-[#DD4342]"}`}
                >
                  <img src={AddBtn} alt="Add" className="h-5 w-5" />
                  Add task
                </button>
              );
            })()}
          </div>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 pt-4">
          <Link
            to={statusFilter === "todo" ? pathname : buildStatusLink("todo")}
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}
          >
            <span className="text-[18px] sm:text-[16px] font-bold text-[#0D1829]">To Do</span>

            <span className="text-[18px] sm:text-[16px] font-bold text-[#0D1829]">({counts.todo})</span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group1} alt="Group1" className="w-8 h-8" />
            </div>
          </Link>

          <Link
            to={
              statusFilter === "in_progress"
                ? pathname
                : buildStatusLink("in_progress")
            }
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
          >
            <span className="text-[18px] sm:text-[16px] font-bold text-[#0D1829]">In Progress</span>

            <span className="text-[18px] sm:text-[16px] font-bold text-[#0D1829]">
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
                : buildStatusLink("completed")
            }
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}
          >
            <span className="text-[18px] sm:text-[16px] font-bold text-[#0D1829]">Completed</span>

            <span className="text-[18px] sm:text-[16px] font-bold text-[#0D1829]">({counts.completed})</span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group3} alt="Group3" className="w-8 h-8" />
            </div>
          </Link>
        </div>
      </div>

      {/* Task columns area */}
      <div className="flex-1 min-h-0 lg:overflow-y-auto lg:custom-scrollbar px-2 sm:px-0 pr-1 sm:pr-0 sm:mr-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 justify-items-center">
          <div
            className="flex flex-col items-center gap-3 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1 w-full max-w-md mx-auto"
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
                key={`${task.source ?? "in"}-${task.id}`}
                task={task}
                status="todo"
                onViewTask={openViewTask}
                onEditTask={openEditTask}
                onDeleteTask={openDeleteTask}
              />
            ))}
          </div>
          <div
            className="flex flex-col items-center gap-3 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1 w-full max-w-md mx-auto"
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
                key={`${task.source ?? "in"}-${task.id}`}
                task={task}
                status="in_progress"
                onViewTask={openViewTask}
                onEditTask={openEditTask}
                onDeleteTask={openDeleteTask}
              />
            ))}
          </div>
          <div
            className="flex flex-col items-center gap-3 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1 w-full max-w-md mx-auto"
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
                key={`${task.source ?? "in"}-${task.id}`}
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
      {deleteTask !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            {/* Close */}
            <button
              type="button"
              onClick={() => setDeleteTask(null)}
              className="absolute left-4 top-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
              title="Close"
            >
              <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
            </button>
            <h3 className="text-[18px] font-gantari font-semibold text-[#020202] mt-[12px] mb-3">
              Delete Task
            </h3>
            <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center">
              Are you sure, you want to Delete this?
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto mb-6">
              <button
                type="button"
                onClick={() => setDeleteTask(null)}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
