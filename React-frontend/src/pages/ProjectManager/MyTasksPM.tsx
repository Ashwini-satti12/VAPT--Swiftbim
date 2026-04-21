import { useEffect, useState, useRef, useMemo } from "react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateForDisplay } from "../TechnicalDirector/MytaskTD";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg"
import editIcon from "../../assets/ProjectManager/project/editIcon.svg"
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg"
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
import ProfileIcon from "../../assets/ProductNavbarIcons/Profile.svg";
import Group1 from "../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../assets/ProjectManager/MyTask/arrow.svg";
import Dot from "../../assets/ProjectManager/MyTask/Dot.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import AddBtn from "../../assets/TechnicalDirector/add btn.svg";

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
type DropdownId = "employee" | "projects" | "show" | "period" | null;

interface Employee {
  id: number;
  full_name: string;
  employee_id?: string;
  email?: string;
  phone?: string;
  user_role?: string;
  profile_picture?: string;
  active?: string | null;
}

interface Project {
  id: number;
  project_name: string;
  tasks?: string;
  members_names?: string[];
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  uploader_name?: string | null;
  members?: string;
  source?: "In House" | "Outsource";
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
        o === first && (first === "Select Employee" || first === "Select Projects");
      return options.filter((opt) => {
        if (isPlaceholderOption(opt)) return false;
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
        className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-[14px] font-semibold font-Gantari cursor-pointer ${narrow ? (label === "Period" ? "min-w-[100px]" : "min-w-[150px]") : "min-w-[160px]"}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className={`truncate font-Gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#8B8B8B]"}`}>
          {(label.toLowerCase() === "show entries" || label.toLowerCase() === "show") && selected && selected !== label ? (
            <>
              <span className="text-[14px]">Show:</span>{" "}
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
          className={`absolute top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg ${narrow ? "right-0 min-w-[110px]" : "left-0 min-w-[160px]"}`}
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
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
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
  uploadedid?: number;
  uploader_id?: number;
  created_by?: number | string;
  assigned_profile_picture?: string;
  uploader_profile_picture?: string;
  Approval?: string;
  created_at?: string;
  projectid?: number;
  source?: "In House" | "Outsource";
  Actual_start_time?: string;
  perferstart_time?: string;
  perferend_time?: string;
  end_time?: string;
}

function normalizeStatus(
  s: string | undefined,
  approval?: string,
): "todo" | "in_progress" | "completed" | "approved" | "rejected" {
  if (approval?.toLowerCase() === "approved") return "approved";
  if (approval?.toLowerCase() === "rejected") return "rejected";
  if (!s) return "todo";
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  if (lower.includes("progress") || lower === "in_progress")
    return "in_progress";
  if (lower.includes("complete") || lower === "done") return "completed";
  return "todo";
}

function TaskCard({
  task,
  status,
  employees,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onOpenMemberProfile,
  onOpenInvolvedList,
}: {
  task: Task;
  status: "todo" | "in_progress" | "completed" | "approved" | "rejected";
  employees: Employee[];
  onViewTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onOpenMemberProfile?: (emp: Employee) => void;
  onOpenInvolvedList?: (involved: Employee[]) => void;
}) {
  const progress =
    status === "todo"
      ? 0
      : status === "in_progress"
        ? 50
        : task.assigned_to != null &&
            task.uploaderid != null &&
            String(task.assigned_to) !== String(task.uploaderid)
          ? 95
          : 100;
  const isUnderReview =
    status === "completed" &&
    task.assigned_to != null &&
    task.uploaderid != null &&
    String(task.assigned_to) !== String(task.uploaderid);
  void [employees, onOpenMemberProfile, onOpenInvolvedList];
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

  const startStr = formatDateForDisplay(task.start_date) || "—";
  const endStr = formatDateForDisplay(task.due_date) || "—";

  return (
    <div
      draggable={!isCompleted}
      onDragStart={handleDragStart}
      className={`mt-2 rounded-lg border border-[#AEACAC52] bg-white p-3 shadow-sm relative mx-auto w-full max-w-full lg:max-w-none ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h4 className="flex-1 min-w-0 font-medium text-[#353535] text-[20px] truncate leading-tight">
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
            className="p-0.5 rounded cursor-pointer"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <img src={Dot} alt="Dot" className="w-4 h-4 text-slate-600" />
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
                className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
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
              {!isCompleted && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
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
                    className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
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
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-[#000000]">Start Date</span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {formatDateForDisplay(task.start_date || task.Actual_start_time) || (task.start_date || task.Actual_start_time ? task.start_date || task.Actual_start_time : "—")}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[14px] font-medium text-[#000000]">End Date</span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {formatDateForDisplay(task.due_date || task.end_time) || (task.due_date || task.end_time ? task.due_date || task.end_time : "—")}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[12px] text-[#8B8B8B]">Progress</span>
        <span className="text-[12px] text-[#8B8B8B]">
          {isUnderReview ? "95% (Under Review)" : `${progress}%`}
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
                    className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
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
                    className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
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

const SHOW_OPTIONS = ["Show Entries", "1-50", "51-100", "101-150", "151-200", "201-250", "251-300", "All"];
const PERIOD_OPTIONS = [
  "Period",
  "This Week",
  "This Month",
  "This Quarter",
  "Custom",
];

export default function MyTasksPM() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isTeam =
    searchParams.get("condition") === "1" || pathname.endsWith("/team");
  const statusFilter =
    searchParams.get("status") || searchParams.get("taskstatus");
  const [list, setList] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const handleMoveTask = async (
    taskId: number,
    newStatus: "todo" | "in_progress" | "completed",
  ) => {
    try {
      const statusMap = {
        todo: "Todo",
        in_progress: "InProgress",
        completed: "Completed"
      };

      const task = list.find(t => t.id === taskId);
      if (task) {
        const s = normalizeStatus(task.status, task.Approval);
        if (s === "todo" && newStatus === "completed") {
          toast.error("Move the task to In Progress before marking it completed.");
          return;
        }
        if (
          (s === "completed" || s === "approved" || s === "rejected") &&
          (newStatus === "todo" || newStatus === "in_progress")
        ) {
          toast.error("Completed tasks cannot be moved.");
          return;
        }
      }
      const projectId = task?.projectid || projects.find(p => p.project_name === task?.project_name)?.id;

      const isOutsource = task?.source === "Outsource";
      const endpoint = isOutsource
        ? `/api/vendors/vendor-tasks/${taskId}/status`
        : `/api/tasks/${taskId}/status`;

      await api.patch(endpoint, {
        status: statusMap[newStatus],
        projectId
      });
      setList(prev => prev.map(t => t.id === taskId ? { ...t, status: statusMap[newStatus] } : t));
    } catch (error) {
      console.error("Error moving task:", error);
    }
  };


  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Employee | null>(null);
  const [showInvolvedModal, setShowInvolvedModal] = useState(false);
  const [involvedList, setInvolvedList] = useState<Employee[]>([]);
  const navigate = useNavigate();

  const openEditTask = (task: Task) => {
    navigate("/tasks/add", { state: { task } });
  };

  const openDeleteTask = (task: Task) => {
    setDeleteTask(task);
  };

  const openViewTask = (task: Task) => {
    navigate("/tasks/taskview", { state: { task } });
  };

  const confirmDeleteTask = async () => {
    if (deleteTask === null) return;
    try {
      const isOutsource = deleteTask.source === "Outsource";
      const endpoint = isOutsource
        ? `/api/vendors/vendor-tasks/${deleteTask.id}`
        : `/api/tasks/${deleteTask.id}`;

      await api.delete(endpoint);
      setList((prev) => prev.filter((t) => t.id !== deleteTask.id));
      setDeleteTask(null);
      toast.success("Task Deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

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

  useEffect(() => {
    api.get<{ employees: Employee[] }>("/api/employees").then(res => setEmployees((res.data.employees || []).filter(isEmployeeActiveForProjectAssignment)));
    Promise.all([
      api.get<{ projects: Project[] }>("/api/projects"),
      api.get<{ projects: Project[] }>("/api/vendors/vendor-projects")
    ]).then(([res1, res2]) => {
      const p1 = (res1.data.projects || []).map(p => ({ ...p, source: "In House" }));
      const p2 = (res2.data.projects || []).map(p => ({ ...p, source: "Outsource" }));
      setProjects([...p1, ...p2] as Project[]);
    });
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    params.employeeid = "all";
    if (isTeam) {
      params.condition = "1";
    }

    const taskParams: Record<string, string> = { ...params };

    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/tasks", { params: taskParams }),
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params: taskParams })
    ])
      .then(([res1, res2]) => {
        const t1 = (res1.data.tasks ?? []).map(t => ({ ...t, source: "In House" }));
        const t2 = (res2.data.tasks ?? []).map(t => ({ ...t, source: "Outsource" }));
        setList([...t1, ...t2] as Task[]);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [isTeam, statusFilter]);

  const employeeOptions = useMemo(() => {
    const raw = Array.isArray(employees) ? employees : [];
    const baseOptions = ["Select Employee", "Show All"];

    if (!selectedProject || selectedProject === "Select Projects" || selectedProject === "Show All") {
      return [...baseOptions, ...raw.map((e) => e.full_name)];
    }

    const proj = projects.find((p) => p.project_name === selectedProject);
    if (!proj) {
      return [...baseOptions, ...raw.map((e) => e.full_name)];
    }

    const memberTokens = (proj.members || "").split(",").map(s => s.trim()).filter(Boolean);
    const filtered = raw.filter(emp => {
      const name = (emp.full_name || "").trim();
      const idStr = String(emp.id);
      return memberTokens.some(t => t === idStr || t.toLowerCase() === name.toLowerCase());
    });

    return [...baseOptions, ...filtered.map(e => e.full_name)];
  }, [employees, projects, selectedProject]);
  const projectOptions = ["Select Projects", ...projects.map(p => p.project_name)];

  const involvedTasks = useMemo(() => {
    if (isTeam) return list;
    const uid = user?.id;
    const fullName = (user?.full_name || "").trim().toLowerCase();
    if (!uid && !fullName) return list;
    return list.filter((t) => {
      const legacy = t as unknown as Record<string, unknown>;
      const assignedIds = [
        t.assigned_to,
        legacy.assigned_to,
        legacy.assign_to,
        legacy.assignedto,
      ].filter((v) => v != null && String(v).trim() !== "");
      const uploaderIds = [
        t.uploaderid,
        t.uploadedid,
        t.uploader_id,
        t.created_by,
        legacy.uploaderid,
        legacy.uploadedid,
        legacy.uploader_id,
        legacy.uploaded_id,
        legacy.created_by,
        legacy.createdby,
      ].filter((v) => v != null && String(v).trim() !== "");

      const assignedNames = [
        t.assigned_full_name,
        t.assign_to,
        String(legacy.assigned_full_name || ""),
        String(legacy.assign_to_name || ""),
      ]
        .map((v) => String(v || "").trim().toLowerCase())
        .filter(Boolean);
      const uploaderNames = [
        t.uploader_full_name,
        String(legacy.uploader_full_name || ""),
        String(legacy.uploader_name || ""),
        String(legacy.uploaded_by_name || ""),
      ]
        .map((v) => String(v || "").trim().toLowerCase())
        .filter(Boolean);

      const assignedToMatches =
        (uid != null && assignedIds.some((v) => String(v) === String(uid))) ||
        (fullName ? assignedNames.some((v) => v === fullName) : false);
      const uploaderMatches =
        (uid != null && uploaderIds.some((v) => String(v) === String(uid))) ||
        (fullName ? uploaderNames.some((v) => v === fullName) : false);
      return assignedToMatches || uploaderMatches;
    });
  }, [isTeam, list, user?.id, user?.full_name]);

  const allTasks = involvedTasks.filter((t) => {
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

    const searchQuery = searchParams.get("q")?.toLowerCase() || "";
    if (searchQuery) {
      const matches = [
        t.task_name,
        t.project_name,
        t.assigned_full_name,
        t.module,
        t.description
      ].some(f => (f || "").toLowerCase().includes(searchQuery));
      if (!matches) return false;
    }

    return true;
  });

  const counts = {
    todo: allTasks.filter((t) => normalizeStatus(t.status, t.Approval) === "todo").length,
    in_progress: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "in_progress",
    ).length,
    completed: allTasks.filter((t) => {
      const s = normalizeStatus(t.status, t.Approval);
      return s === "completed" || s === "approved" || s === "rejected";
    }).length,
  };

  const tasksByStatus = {
    todo: allTasks.filter((t) => normalizeStatus(t.status, t.Approval) === "todo"),
    in_progress: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "in_progress",
    ),
    completed: allTasks.filter((t) => {
      const s = normalizeStatus(t.status, t.Approval);
      return s === "completed" || s === "approved" || s === "rejected";
    }),
  };

  let limitStart = 0;
  let limitEnd = 50;
  if (selectedShow === "All" || !selectedShow || selectedShow === "Show" || selectedShow === "Show Entries") {
    limitStart = 0;
    limitEnd = Infinity;
  } else if (selectedShow && selectedShow.includes("-")) {
    const parts = selectedShow.split("-");
    if (parts.length === 2) {
      limitStart = parseInt(parts[0], 10) - 1;
      limitEnd = parseInt(parts[1], 10);
    }
  }

  const displayedTasksByStatus = {
    todo: tasksByStatus.todo.slice(limitStart, limitEnd),
    in_progress: tasksByStatus.in_progress.slice(limitStart, limitEnd),
    completed: tasksByStatus.completed.slice(limitStart, limitEnd),
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden px-5 py-2">
      <div className="bg-white pb-3 flex-shrink-0">
        {/* Top row: title + dropdowns + Add task - match MytaskTD */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <h1 className="text-[24px] font-semibold text-[#000000] font-Gantari">
            {isTeam ? "Team Task" : "My Task"}
          </h1>
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
              maxVisibleItems={4}
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
              maxVisibleItems={4}
            />
            <TaskDropdown
              label="Show Entries"
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
              maxVisibleItems={4}
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
              maxVisibleItems={4}
            />
            <button
              type="button"
              onClick={() => navigate("/tasks/add")}
              className="inline-flex items-center gap-2 rounded-md bg-[#DD4342] px-4 py-2 text-[14px] font-medium text-[#F2F2F2] shadow-sm cursor-pointer"
            >
              <img src={AddBtn} alt="Add" className="h-5 w-5" />
              Add task
            </button>
          </div>
        </div>

        {/* Status summary cards - match MytaskTD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <Link
            to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}
          >
            <span className="text-xl font-bold text-[#0D1829]">To Do</span>
            <span className="text-xl font-bold text-[#0D1829]">({counts.todo})</span>
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
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
          >
            <span className="text-xl font-bold text-[#0D1829]">In Progress</span>
            <span className="text-xl font-bold text-[#0D1829]">({counts.in_progress})</span>
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
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}
          >
            <span className="text-xl font-bold text-[#0D1829]">Completed</span>
            <span className="text-xl font-bold text-[#0D1829]">({counts.completed})</span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group3} alt="Group3" className="w-8 h-8" />
            </div>
          </Link>
        </div>
      </div>

      {/* Task columns scrollable area - match MytaskTD */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
          <div
            className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const raw =
                e.dataTransfer.getData("taskId") ||
                e.dataTransfer.getData("text/plain");
              const taskId = Number(raw);
              if (!Number.isNaN(taskId)) handleMoveTask(taskId, "todo");
            }}
          >
            {displayedTasksByStatus.todo.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                status={normalizeStatus(task.status, task.Approval)}
                employees={employees}
                onViewTask={openViewTask}
                onEditTask={openEditTask}
                onDeleteTask={openDeleteTask}
                onOpenMemberProfile={(emp) => { setSelectedMember(emp); setShowMemberProfileModal(true); }}
                onOpenInvolvedList={(list) => { setInvolvedList(list); setShowInvolvedModal(true); }}
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
              e.stopPropagation();
              const raw =
                e.dataTransfer.getData("taskId") ||
                e.dataTransfer.getData("text/plain");
              const taskId = Number(raw);
              if (!Number.isNaN(taskId)) handleMoveTask(taskId, "in_progress");
            }}
          >
            {displayedTasksByStatus.in_progress.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                status={normalizeStatus(task.status, task.Approval)}
                employees={employees}
                onViewTask={openViewTask}
                onEditTask={openEditTask}
                onDeleteTask={openDeleteTask}
                onOpenMemberProfile={(emp) => { setSelectedMember(emp); setShowMemberProfileModal(true); }}
                onOpenInvolvedList={(list) => { setInvolvedList(list); setShowInvolvedModal(true); }}
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
              e.stopPropagation();
              const raw =
                e.dataTransfer.getData("taskId") ||
                e.dataTransfer.getData("text/plain");
              const taskId = Number(raw);
              if (!Number.isNaN(taskId)) handleMoveTask(taskId, "completed");
            }}
          >
            {displayedTasksByStatus.completed.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                status={normalizeStatus(task.status, task.Approval)}
                employees={employees}
                onViewTask={openViewTask}
                onEditTask={openEditTask}
                onDeleteTask={openDeleteTask}
                onOpenMemberProfile={(emp) => { setSelectedMember(emp); setShowMemberProfileModal(true); }}
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

      {/* Member Profile Modal */}
      {showMemberProfileModal && selectedMember && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen overflow-y-auto p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col my-auto shrink-0">
            <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => { setShowMemberProfileModal(false); setSelectedMember(null); }}
                className="absolute left-10 p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors cursor-pointer"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">Member Profile</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-10 py-8 custom-scrollbar">
              <div className="flex flex-col items-center">
                {selectedMember.profile_picture ? (
                  <img
                    src={getGlobalProfileUrl(selectedMember.id, selectedMember.profile_picture)}
                    alt={selectedMember.full_name || "Member"}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover mb-6"
                    onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center mb-6">
                    <span className="text-slate-600 font-bold text-3xl">{(selectedMember.full_name || `E${selectedMember.id}`).charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="w-full space-y-4">
                  <div>
                    <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Full Name</p>
                    <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">{selectedMember.full_name || "Not Available"}</p>
                  </div>
                  {selectedMember.employee_id && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Employee ID</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">{selectedMember.employee_id}</p>
                    </div>
                  )}
                  {selectedMember.email && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Email</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">{selectedMember.email}</p>
                    </div>
                  )}
                  {selectedMember.phone && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Phone Number</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">{selectedMember.phone}</p>
                    </div>
                  )}
                  {selectedMember.user_role && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Role</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">{selectedMember.user_role}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Involved Persons Modal */}
      {showInvolvedModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100">
              <button
                type="button"
                onClick={() => { setShowInvolvedModal(false); setInvolvedList([]); }}
                className="absolute left-10 p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors cursor-pointer"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">Involved Persons ({involvedList.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-6 custom-scrollbar">
              {involvedList.length > 0 ? (
                <div className="space-y-3">
                  {involvedList.map((m) => {
                    const profileUrl = m.profile_picture ? getGlobalProfileUrl(m.id, m.profile_picture) : null;
                    return (
                      <div
                        key={m.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setShowInvolvedModal(false);
                          setSelectedMember(m);
                          setShowMemberProfileModal(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setShowInvolvedModal(false);
                            setSelectedMember(m);
                            setShowMemberProfileModal(true);
                          }
                        }}
                      >
                        {profileUrl ? (
                          <img
                            src={profileUrl}
                            alt={m.full_name || "Member"}
                            className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-600 font-bold text-lg">{(m.full_name || `E${m.id}`).charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A] truncate">{m.full_name || `Employee ${m.id}`}</p>
                          {m.user_role && <p className="text-[14px] font-Gantari text-[#666666] truncate">{m.user_role}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[14px] font-Gantari text-[#666666]">No involved persons.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
