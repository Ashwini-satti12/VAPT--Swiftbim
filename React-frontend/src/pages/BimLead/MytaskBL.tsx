import { useEffect, useState, useRef, useMemo } from "react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
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
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";
import { useAuth } from "../../contexts/AuthContext";

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || "";
const getProfileUrl = (path: string | undefined): string => {
  if (!path || path.trim() === "") return "";
  if (path.startsWith("http")) return path;
  const normalizedPath = path
    .replace(/\\/g, "/")
    .trim()
    .replace(/^\d+\s+/, "")
    .replace(/^\/+/, "");
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

type DropdownId = "employee" | "projects" | "show" | "period" | null;

export interface Employee {
  id: number;
  full_name: string;
  profile_picture?: string;
  active?: string | null;
}

interface Project {
  id: number;
  project_name: string;
  modules?: string;
  tasks?: string;
  members?: string;
  members_names?: string[];
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  uploader_name?: string | null;
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
        className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-3 py-2 text-[14px] font-semibold font-Gantari cursor-pointer w-full transition-colors ${narrow ? (label === "Period" ? "lg:min-w-[100px]" : "lg:min-w-[150px]") : "lg:min-w-[160px]"}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span
          className={`truncate font-Gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#8B8B8B]"}`}
        >
          {selected && selected !== label ? (
            <>
              <span className="text-[14px]">Show:</span>{" "}
              <span className="font-semibold">{selected}</span>
            </>
          ) : (
            label
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
          className={`absolute top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg w-full ${narrow ? "sm:right-0 sm:min-w-[110px]" : "sm:left-0 sm:min-w-[160px]"}`}
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
  assigned_profile_picture?: string;
  uploader_profile_picture?: string;
  Approval?: string;
  created_at?: string;
  Actual_start_time?: string;
  projectid?: number;
  source?: "In House" | "Outsource";
}

function normalizeStatus(
  s: string | undefined,
  approval?: string,
): "todo" | "in_progress" | "completed" {
  if (approval?.toLowerCase() === "approved") return "completed";
  if (approval?.toLowerCase() === "rejected") return "todo";
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
  onViewTask,
  onEditTask,
  onDeleteTask,
  onApproveTask,
}: {
  task: Task;
  status: "todo" | "in_progress" | "completed";
  onViewTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onApproveTask?: (task: Task) => void;
}) {
  const { user } = useAuth();
  const isDelegated =
    task.uploaderid != null &&
    task.assigned_to != null &&
    String(task.uploaderid) !== String(task.assigned_to);
  const isReviewTask = isDelegated;
  // Show (Under Review) for completed delegated tasks not yet approved
  const isUnderReview = isReviewTask && status === "completed" && task.Approval?.toLowerCase() !== "approved";
  // Show (Reviewed) for ALL statuses of delegated tasks that are approved
  const isReviewed = isReviewTask && task.Approval?.toLowerCase() === "approved";
  const progress =
    status === "todo"
      ? 0
      : status === "in_progress"
        ? 50
        : isReviewed
          ? 100
          : isUnderReview
            ? 95
            : typeof task.progress === "number"
              ? task.progress
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
      className={`mt-2 rounded-lg border border-[#AEACAC52] bg-white p-3 shadow-sm relative mx-auto w-full max-w-full lg:max-w-none ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h4 className="flex-1 min-w-0 font-medium text-[#353535] text-[20px] truncate">
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
            <img src={Dot} alt="Dot" className="w-4 h-4 object-contain" />
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
              {!isCompleted && (
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
                      className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                    />
                    <span className="text-[16px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342]">
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
                      className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                    />
                    <span className="text-[16px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                      Delete
                    </span>
                  </button>
                </>
              )}
              {isUnderReview && String(task.uploaderid) === String(user?.id) && (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
                  onClick={() => {
                    setMenuOpen(false);
                    onApproveTask?.(task);
                  }}
                >
                  <div className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-green-600">
                    Approve
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex flex-col ">
          <span className="text-[14px] font-medium text-[#000000]">
            Start Date
          </span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {task.start_date || task.Actual_start_time
              ? `${new Date(task.start_date || task.Actual_start_time!).getDate().toString().padStart(2, "0")}-${(new Date(task.start_date || task.Actual_start_time!).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.start_date || task.Actual_start_time!).getFullYear()}`
              : "—"}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[14px] font-medium text-[#000000]">
            End Date
          </span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {task.due_date
              ? `${new Date(task.due_date).getDate().toString().padStart(2, "0")}-${(new Date(task.due_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.due_date).getFullYear()}`
              : ""}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1 text-[12px] text-[#8B8B8B]">
        <span>Progress</span>
        <span className="font-medium">
          {isReviewTask && !isReviewed
            ? `${progress}% (Under Review)`
            : isReviewed
              ? `100% (Reviewed)`
              : isUnderReview
                ? `95% (Under Review)`
                : `${progress}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-[#8B8B8B] transition-all duration-300"
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

const SHOW_OPTIONS = [
  "Show Entries",
  "1-50",
  "51-100",
  "101-150",
  "151-200",
  "201-250",
  "251-300",
  "All",
];
const PERIOD_OPTIONS = [
  "Period",
  "This Week",
  "This Month",
  "This Quarter",
  "Custom",
];

export default function MytaskBL() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  // This route is only `/bl/mytasks` — never use team (condition=1) API here; that mode
  // excludes tasks assigned to the current user and would empty the assignee's My Task list.
  const isTeam = false;
  const statusFilter =
    searchParams.get("status") || searchParams.get("taskstatus");
  const { user } = useAuth();
  const [list, setList] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const STORAGE_KEY = "bl_myTask_localTasks";
  const [localTasks, setLocalTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localTasks));
    } catch {
      // ignore
    }
  }, [localTasks]);

  const getEmployeeOptions = () => {
    if (
      !selectedProject ||
      selectedProject === "Select Projects" ||
      selectedProject === "Show All"
    ) {
      return [
        "Select Employee",
        ...employees
          .filter(isEmployeeActiveForProjectAssignment)
          .map((e) => e.full_name),
      ];
    }
    const proj = projects.find((p) => p.project_name === selectedProject);
    if (!proj) {
      return [
        "Select Employee",
        ...employees
          .filter(isEmployeeActiveForProjectAssignment)
          .map((e) => e.full_name),
      ];
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

    const validEmployees = employees.filter(
      (e) =>
        e.full_name &&
        (involvedNames.has(e.full_name) || e.id === user?.id) &&
        isEmployeeActiveForProjectAssignment(e),
    );

    return [
      "Select Employee",
      ...validEmployees
        .filter(isEmployeeActiveForProjectAssignment)
        .map((e) => e.full_name),
    ];
  };

  const employeeOptions = getEmployeeOptions();
  const projectOptions = [
    "Select Projects",
    ...projects.filter((p) => p.source !== "Outsource").map((p) => p.project_name),
  ];

  const statusToLabel = (
    s: "todo" | "in_progress" | "completed" | "approved" | "rejected",
  ): string => {
    if (s === "todo") return "To Do";
    if (s === "in_progress") return "In Progress";
    if (s === "completed") return "Completed";
    if (s === "approved") return "Approved";
    return "Rejected";
  };

  const handleMoveTask = (
    taskId: number,
    newStatus: "todo" | "in_progress" | "completed" | "approved" | "rejected",
  ) => {
    const task = list.find((t) => t.id === taskId);
    if (task) {
      const current = normalizeStatus(task.status, task.Approval);
      if (current === "todo" && newStatus === "completed") {
        toast.error(
          "Move the task to In Progress before marking it completed.",
        );
        return;
      }
      if (current === "completed" && newStatus !== "completed") {
        toast.error("Completed tasks cannot be moved.");
        return;
      }
    }

    const label = statusToLabel(newStatus);

    const projectId =
      task?.projectid ||
      projects.find((p) => p.project_name === task?.project_name)?.id;

    const newApproval =
      newStatus === "completed" && task && String(task.uploaderid) === String(user?.id)
        ? "Approved"
        : task?.Approval;

    // Visual update immediately in both list and localTasks
    setList((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: label, Approval: newApproval ?? t.Approval }
          : t,
      ),
    );
    // Also update localTasks so localStorage-cached tasks reflect the new status
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: label, Approval: newApproval ?? t.Approval }
          : t,
      ),
    );

    const isOutsource = task?.source === "Outsource";
    const endpoint = isOutsource
      ? `/api/vendors/vendor-tasks/${taskId}/status`
      : `/api/tasks/${taskId}/status`;

    // Correct backend status format
    const backendStatus =
      newStatus === "completed"
        ? "Completed"
        : newStatus === "todo"
          ? "Todo"
          : "InProgress";

    api
      .patch(endpoint, { status: backendStatus, projectId })
      .catch((err) => {
        console.error("Failed to update task status:", err);
      });
  };

  const handleApproveTask = (task: Task) => {
    const isOutsource = task.source === "Outsource";
    const endpoint = isOutsource
      ? `/api/vendors/vendor-tasks/${task.id}/status`
      : `/api/tasks/${task.id}/status`;

    api.patch(endpoint, { status: "Approved" })
      .then(() => {
        toast.success("Task Approved");
        setList(prev => prev.map(t => t.id === task.id ? { ...t, Approval: "Approved", progress: 100 } : t));
      })
      .catch(() => toast.error("Failed to approve task"));
  };

  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const navigate = useNavigate();

  const openEditTask = (task: Task) => {
    navigate("/bl/mytasks/add", { state: { task } });
  };

  const openDeleteTask = (task: Task) => {
    setDeleteTask(task);
  };

  const openViewTask = (task: Task) => {
    const sourceQuery = task.source === "Outsource" ? "?source=Outsource" : "";
    navigate(`/bl/mytasks/view/${task.id}${sourceQuery}`, { state: { task, from: "mytasks" } });
  };

  const confirmDeleteTask = () => {
    if (deleteTask !== null) {
      const isOutsource = deleteTask.source === "Outsource";
      const endpoint = isOutsource
        ? `/api/vendors/vendor-tasks/${deleteTask.id}`
        : `/api/tasks/${deleteTask.id}`;

      api
        .delete(endpoint)
        .then(() => {
          setList((prev) => prev.filter((t) => t.id !== deleteTask.id));
          toast.success("Task deleted successfully");
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
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (isTeam) {
      params.condition = "1";
      params.employeeid = "all";
    }

    const taskParams: Record<string, string> = { ...params };
    let cancelled = false;

    (async () => {
      const t1: Task[] = [];
      const t2: Task[] = [];
      try {
        const tasksRes = await api.get<{ tasks?: Task[] }>("/api/tasks", {
          params: taskParams,
        });
        if (!cancelled) {
          t1.push(
            ...(tasksRes.data.tasks ?? []).map((t) => ({
              ...t,
              source: "In House" as const,
            })),
          );
        }
      } catch (err) {
        console.error("In-house tasks fetch failed:", err);
        if (!cancelled) {
          toast.error(
            (err as any)?.response?.data?.message ||
            "Could not load in-house tasks.",
            { id: "bl-mytasks-inhouse" },
          );
        }
      }
      try {
        const vTasksRes = await api.get<{ tasks?: Task[] }>(
          "/api/vendors/vendor-tasks",
          { params: taskParams },
        );
        if (!cancelled) {
          t2.push(
            ...(vTasksRes.data.tasks ?? []).map((t) => ({
              ...t,
              source: "Outsource" as const,
            })),
          );
        }
      } catch (err) {
        console.error("Outsource tasks fetch failed:", err);
        if (!cancelled) {
          toast.error(
            (err as any)?.response?.data?.message ||
            "Could not load outsource tasks.",
            { id: "bl-mytasks-outsource" },
          );
        }
      }

      try {
        const [empRes, projRes, vProjRes] = await Promise.all([
          api.get<{ employees?: Employee[] }>("/api/employees"),
          api.get<{ projects?: Project[] }>("/api/projects"),
          api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
        ]);
        if (!cancelled) {
          setEmployees(
            (empRes.data.employees ?? []).filter(
              isEmployeeActiveForProjectAssignment,
            ),
          );
          const p1 = (projRes.data.projects ?? []).map((p) => ({
            ...p,
            source: "In House",
          }));
          const p2 = (vProjRes.data.projects ?? []).map((p) => ({
            ...p,
            source: "Outsource",
          }));
          setProjects([...p1, ...p2] as Project[]);
        }
      } catch (err) {
        console.error("Employees/projects fetch failed:", err);
        if (!cancelled) {
          toast.error("Could not load employees or projects.", {
            id: "bl-mytasks-meta",
          });
        }
      }

      if (!cancelled) {
        const combined = [...t1, ...t2] as Task[];
        combined.sort((a, b) => {
          const dateA = new Date(a.created_at || a.start_date || 0).getTime();
          const dateB = new Date(b.created_at || b.start_date || 0).getTime();
          if (dateB !== dateA) return dateB - dateA;
          return (b.id || 0) - (a.id || 0);
        });
        setList(combined);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isTeam, statusFilter]);

  const filteredTasks = useMemo(() => {
    const q = searchParams.get("q")?.toLowerCase() || "";
    return list.filter((t) => {
      // Employee filter
      if (
        selectedEmployee &&
        !["Select Employee", "Show All", "Employee"].includes(selectedEmployee)
      ) {
        if (
          (t.assigned_full_name || "").toLowerCase() !==
          selectedEmployee.toLowerCase()
        )
          return false;
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

      // Search filter
      if (q) {
        const matches = [
          t.task_name,
          t.project_name,
          t.module,
          t.type,
          t.description,
          t.assigned_full_name,
          t.uploader_full_name,
          t.status,
        ].some((f) => (f || "").toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [list, searchParams, selectedEmployee, selectedProject, selectedPeriod]);

  const safeLocal = Array.isArray(localTasks) ? localTasks : [];
  const safeList = Array.isArray(filteredTasks) ? filteredTasks : [];

  const allTasks = [
    ...safeLocal,
    ...safeList.filter((t) => t && !safeLocal.some((l) => l && l.id === t.id)),
  ];

  const counts = {
    todo: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "todo",
    ).length,
    in_progress: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "in_progress",
    ).length,
    completed: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "completed",
    ).length,
  };
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

  const showLimit = useMemo(() => {
    if (
      !selectedShow ||
      selectedShow === "Show Entries" ||
      selectedShow === "All"
    ) {
      return Number.POSITIVE_INFINITY;
    }
    if (selectedShow.includes("-")) {
      const [, end] = selectedShow.split("-").map(Number);
      return end || Number.POSITIVE_INFINITY;
    }
    return Number(selectedShow) || Number.POSITIVE_INFINITY;
  }, [selectedShow]);

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
    <div className="h-full flex flex-col overflow-hidden bg-white pt-2">
      {/* Header Section (Title & Filters) - Stays fixed due to flex-col */}
      <div className="bg-white px-5 py-2 shrink-0 z-10">
        <div className="max-w-full mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Row 1: Title and Mobile/Tablet Add Task Button */}
          <div className="flex items-center justify-between gap-4 w-full lg:w-auto">
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#000000] font-Gantari whitespace-nowrap">
              {isTeam ? "Team Task" : "My Task"}
            </h1>
            <button
              type="button"
              onClick={() => navigate("/bl/mytasks/add")}
              className="lg:hidden inline-flex items-center justify-center gap-2 rounded-md bg-[#DD4342] h-[36px] min-h-[36px] px-3 sm:px-4 text-[14px] font-medium text-[#F2F2F2] cursor-pointer"
            >
              <img src={AddBtn} alt="Add" className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline whitespace-nowrap">
                Add Task
              </span>
              <span className="sm:hidden whitespace-nowrap">Add</span>
            </button>
          </div>

          {/* Row 2: Dropdown Filters & Desktop Add Task Button */}
          <div
            ref={dropdownsContainerRef}
            className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-start lg:justify-end gap-2 w-full lg:w-auto"
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
              onClick={() => navigate("/bl/mytasks/add")}
              className="hidden lg:inline-flex ml-2 items-center justify-center gap-2 rounded-md bg-[#DD4342] h-[36px] min-h-[36px] px-4 text-[14px] font-medium text-[#F2F2F2] cursor-pointer"
            >
              <img src={AddBtn} alt="Add" className="h-5 w-5" />
              <span className="whitespace-nowrap">Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#FFFFFF]">
        <div className="max-w-full mx-auto space-y-0">
          {/* Status Summary Cards - Now scrollable to save space on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 py-2">
            <Link
              to={
                statusFilter === "todo" ? pathname : `${pathname}?status=todo`
              }
              className={`flex p-3 sm:p-4 gap-2 sm:gap-4 rounded-xl border shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}
            >
              <span className="text-[16px] sm:text-[20px] font-bold text-[#0D1829]">
                To Do
              </span>
              <span className="text-[16px] sm:text-[20px] font-bold text-[#0D1829]">
                ({counts.todo})
              </span>
              <div className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 flex items-center justify-center">
                <img
                  src={Group1}
                  alt="Group1"
                  className="w-6 h-6 sm:w-8 sm:h-8"
                />
              </div>
            </Link>
            <Link
              to={
                statusFilter === "in_progress"
                  ? pathname
                  : `${pathname}?status=in_progress`
              }
              className={`flex p-3 sm:p-4 gap-2 sm:gap-4 rounded-xl border shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
            >
              <span className="text-[16px] sm:text-[20px] font-bold text-[#0D1829]">
                In Progress
              </span>
              <span className="text-[16px] sm:text-[20px] font-bold text-[#0D1829]">
                ({counts.in_progress})
              </span>
              <div className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 flex items-center justify-center">
                <img
                  src={Group2}
                  alt="Group2"
                  className="w-6 h-6 sm:w-8 sm:h-8"
                />
              </div>
            </Link>
            <Link
              to={
                statusFilter === "completed"
                  ? pathname
                  : `${pathname}?status=completed`
              }
              className={`flex p-3 sm:p-4 gap-2 sm:gap-4 rounded-xl border shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}
            >
              <span className="text-[16px] sm:text-[20px] font-bold text-[#0D1829]">
                Completed
              </span>
              <span className="text-[16px] sm:text-[20px] font-bold text-[#0D1829]">
                ({counts.completed})
              </span>
              <div className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 flex items-center justify-center">
                <img
                  src={Group3}
                  alt="Group3"
                  className="w-6 h-6 sm:w-8 sm:h-8"
                />
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 py-2">
            <div
              className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors"
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
                  status={normalizeStatus(task.status, task.Approval)}
                  onViewTask={openViewTask}
                  onEditTask={openEditTask}
                  onDeleteTask={openDeleteTask}
                  onApproveTask={handleApproveTask}
                />
              ))}
            </div>
            <div
              className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = Number(e.dataTransfer.getData("taskId"));
                if (!Number.isNaN(taskId))
                  handleMoveTask(taskId, "in_progress");
              }}
            >
              {displayedTasksByStatus.in_progress.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  status={normalizeStatus(task.status, task.Approval)}
                  onViewTask={openViewTask}
                  onEditTask={openEditTask}
                  onDeleteTask={openDeleteTask}
                  onApproveTask={handleApproveTask}
                />
              ))}
            </div>
            <div
              className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors"
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
                  status={normalizeStatus(task.status, task.Approval)}
                  onViewTask={openViewTask}
                  onEditTask={openEditTask}
                  onDeleteTask={openDeleteTask}
                  onApproveTask={handleApproveTask}
                />
              ))}
            </div>
          </div>

          {/* Delete Task confirmation modal */}
          {deleteTask !== null && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-[14px]">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden translate-z-0">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="relative group ">
                    <button
                      type="button"
                      onClick={() => setDeleteTask(null)}
                      className="p-2 rounded-md text-black bg-[#F2F2F2] transition-colors cursor-pointer"
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
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[200] flex flex-col items-center">
                      <div className="w-2.5 h-2.5 bg-white border-t border-l border-[#C1C1C1] rotate-45 relative z-20 mb-[-5.5px]"></div>

                      <div className="bg-white border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10">
                        <span className="font-gantari text-[14px] font-semibold text-[#353535] whitespace-nowrap">
                          Close
                        </span>
                      </div>
                    </div>
                  </div>
                  <h3 className="flex-1 text-center text-[20px] font-medium text-[#353535]">
                    Delete Task
                  </h3>
                  <div className="w-9" />
                </div>
                <div className="px-6 py-5">
                  <p className="text-black text-center font-Gantari">
                    Are you sure, you want to Delete this Task?
                  </p>
                </div>
                <div className="flex justify-center gap-3 px-6 py-4 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setDeleteTask(null)}
                    className="rounded-md bg-[#F0F0F0] px-5 py-2 text-[16px] font-medium text-[#353535] cursor-pointer font-Gantari"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteTask}
                    className="rounded-md bg-[#FFD9D9] px-5 py-2 text-[16px] font-medium text-[#E00100] cursor-pointer font-Gantari"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
