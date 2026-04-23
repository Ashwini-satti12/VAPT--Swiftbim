import { useEffect, useState, useRef } from "react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import api from "../../lib/api";
import toast from "react-hot-toast";
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
import { resolveVendorTaskAssigneeName } from "./MytaskV";

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || "";
};

type DropdownId = "employee" | "projects" | "show" | "period" | null;

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
          className={`absolute top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg font-Gantari ${narrow ? "right-0 min-w-[110px]" : "left-0 min-w-[160px]"}`}
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

export interface Task {
  id: number;
  task_name?: string;
  status?: string;
  Approval?: string;
  due_date?: string;
  project_name?: string;
  start_date?: string;
  progress?: number;
  assigned_full_name?: string;
  uploader_full_name?: string;
  assigned_to?: number;
  uploaderid?: number;
  assigned_profile_picture?: string;
  uploader_profile_picture?: string;
  created_at?: string;
  Actual_start_time?: string;
}

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

export interface Employee {
  id: number;
  full_name: string;
  active?: string;
}

export interface Project {
  id: number;
  project_name: string;
  members_names?: string[];
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  uploader_name?: string | null;
}

function normalizeStatus(
  s: string | undefined,
  approval?: string,
): "todo" | "in_progress" | "completed" {
  if (
    approval?.toLowerCase() === "approved" ||
    approval?.toLowerCase() === "rejected"
  )
    return "completed";
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
  employees = [],
  onViewTask,
  onEditTask,
  onDeleteTask,
}: {
  task: Task;
  status: "todo" | "in_progress" | "completed";
  employees?: Employee[];
  onViewTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}) {
  const assigneeName = resolveVendorTaskAssigneeName(task, employees);
  const progress =
    status === "completed" &&
    task.assigned_to != null &&
    task.uploaderid != null &&
    String(task.assigned_to) !== String(task.uploaderid)
      ? task.Approval?.toLowerCase() === "approved"
        ? 100
        : 95
      : status === "todo"
        ? 0
        : status === "in_progress"
          ? 50
          : typeof task.progress === "number"
            ? task.progress
            : 100;
  const isUnderReview =
    status === "completed" &&
    task.assigned_to != null &&
    task.uploaderid != null &&
    String(task.assigned_to) !== String(task.uploaderid);
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
      <div className="flex items-center justify-between gap-2 mb-2 font-Gantari">
        <h4 className="font-semibold text-[#353535] text-[20px] truncate">
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
            className="p-0.5 rounded cursor-pointer"
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
                <span className="text-[16px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342]">
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
      <div className="flex items-center justify-between gap-2 mb-3 font-Gantari">
        <div className="flex flex-col">
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
      <div className="flex items-center justify-between gap-2 mb-1 font-Gantari">
        <span className="text-xs text-[#8B8B8B]">Progress</span>
        <span className="text-xs font-medium text-[#8B8B8B]">
          {isUnderReview ? "95% (Under Review)" : `${progress}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3 font-Gantari">
        <div
          className="h-full rounded-full bg-[#8B8B8B]"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 font-Gantari">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {assigneeName &&
              (() => {
                const src =
                  task.assigned_to != null && task.assigned_profile_picture
                    ? getGlobalProfileUrl(
                        task.assigned_to,
                        task.assigned_profile_picture,
                        "vendor"
                      )
                    : task.assigned_profile_picture
                      ? getProfileUrl(task.assigned_profile_picture)
                      : "";
                const initials = assigneeName
                  .split(" ")
                  .filter(Boolean)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                    title={`Assigned To: ${assigneeName}`}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={assigneeName}
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
                        "vendor"
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
                    className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
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
        <Link
          to={`/v/mytasks/view/${task.id}`}
          state={{ task, from: "teamtask" }}
          draggable={false}
          className="group inline-flex items-center text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] gap-2 font-Gantari"
        >
          Details
          <img
            src={Arrow}
            alt="Arrow"
            className="w-2.5 h-2.5 transition-all duration-200 group-hover:brightness-0 group-hover:invert-[20%]"
          />
        </Link>
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
  "301-350",
  "351-400",
  "All",
];
const PERIOD_OPTIONS = ["Period", "This Week", "This Month", "This Quarter"];

export default function TeamtaskV() {
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
  const navigate = useNavigate();

  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(
    searchParams.get("project") || null,
  );
  const [selectedShow, setSelectedShow] = useState<string | null>(
    "Show Entries",
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const dropdownsContainerRef = useRef<HTMLDivElement>(null);
  const employeeTriggerRef = useRef<HTMLButtonElement>(null);
  const employeeMenuRef = useRef<HTMLDivElement>(null);
  const projectsTriggerRef = useRef<HTMLButtonElement>(null);
  const projectsMenuRef = useRef<HTMLDivElement>(null);
  const showTriggerRef = useRef<HTMLButtonElement>(null);
  const showMenuRef = useRef<HTMLDivElement>(null);
  const periodTriggerRef = useRef<HTMLButtonElement>(null);
  const periodMenuRef = useRef<HTMLDivElement>(null);
  const allTasks = list.filter((t: any) => {
    if (
      selectedEmployee &&
      !["Select Employee", "Show All", "Employee"].includes(selectedEmployee)
    ) {
      if (resolveVendorTaskAssigneeName(t, employees) !== selectedEmployee)
        return false;
    }
    if (
      selectedProject &&
      !["Select Projects", "Show All", "Projects"].includes(selectedProject)
    ) {
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

  const handleMoveTask = (
    taskId: number,
    newStatus: "todo" | "in_progress" | "completed",
  ) => {
    const taskRow = list.find((t) => t.id === taskId);
    if (taskRow) {
      const current = normalizeStatus(taskRow.status, taskRow.Approval);
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

    const statusMap: Record<"todo" | "in_progress" | "completed", string> = {
      todo: "Todo",
      in_progress: "InProgress",
      completed: "Completed",
    };

    const isAssignedBySomeoneElse =
      taskRow?.assigned_to != null &&
      taskRow?.uploaderid != null &&
      String(taskRow.assigned_to) !== String(taskRow.uploaderid);
    const nextProgress =
      newStatus === "completed"
        ? isAssignedBySomeoneElse
          ? 95  // Under review, waiting for approval
          : 100
        : newStatus === "in_progress"
          ? 50
          : 0;

    setList((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: statusMap[newStatus], progress: nextProgress }
          : t,
      ),
    );

    api
      .patch(`/api/vendors/vendor-tasks/${taskId}/status`, {
        status: statusMap[newStatus],
      })
      .catch((err) => {
        console.error("Failed to update status:", err);
        toast.error("Failed to update status");
      });
  };

  const openEditTask = (task: Task) => {
    navigate("/v/mytasks/edit", { state: { task, from: "teamtasks" } });
  };

  const openDeleteTask = (task: Task) => {
    setDeleteTaskId(task.id);
  };

  const openViewTask = (task: Task) => {
    navigate(`/v/mytasks/view/${task.id}`, {
      state: { task, from: "teamtask" },
    });
  };

  const confirmDeleteTask = () => {
    if (deleteTaskId === null) return;
    api
      .delete(`/api/vendors/vendor-tasks/${deleteTaskId}`)
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
    const params: Record<string, string> = {
      // Team task page must load all vendor_task rows for this vendor scope.
      condition: "1",
      employeeid: "all",
    };

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
  }, [isTeam]);

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
        involvedNames.has(e.full_name) &&
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
    ...projects.map((p) => p.project_name),
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const counts = {
    todo: allTasks.filter(
      (t: Task) => normalizeStatus(t.status, t.Approval) === "todo",
    ).length,
    in_progress: allTasks.filter(
      (t: Task) => normalizeStatus(t.status, t.Approval) === "in_progress",
    ).length,
    completed: allTasks.filter(
      (t: Task) => normalizeStatus(t.status, t.Approval) === "completed",
    ).length,
  };

  const tasksByStatus = {
    todo: allTasks.filter(
      (t: Task) => normalizeStatus(t.status, t.Approval) === "todo",
    ),
    in_progress: allTasks.filter(
      (t: Task) => normalizeStatus(t.status, t.Approval) === "in_progress",
    ),
    completed: allTasks.filter(
      (t: Task) => normalizeStatus(t.status, t.Approval) === "completed",
    ),
  };

  const showLimit =
    selectedShow === "All" || !selectedShow || selectedShow === "Show Entries"
      ? Number.POSITIVE_INFINITY
      : Math.max(1, Number(selectedShow) || 10);

  const displayedTasksByStatus = {
    todo: tasksByStatus.todo.slice(0, showLimit),
    in_progress: tasksByStatus.in_progress.slice(0, showLimit),
    completed: tasksByStatus.completed.slice(0, showLimit),
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="bg-white pb-3 flex-shrink-0 font-Gantari">
        {/* Top row: title + dropdowns + Add task */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <h2 className="text-[24px] font-semibold text-slate-800">
            Team Task
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
              onClick={() =>
                navigate("/v/mytasks/add", { state: { from: "teamtasks" } })
              }
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#c43a39] transition-colors"
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
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}
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
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
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
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}
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

      {/* Task columns scrollable area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 font-Gantari">
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
            {displayedTasksByStatus.todo.map((task: Task) => (
              <TaskCard
                key={task.id}
                task={task}
                status="todo"
                employees={employees}
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
            {displayedTasksByStatus.in_progress.map((task: Task) => (
              <TaskCard
                key={task.id}
                task={task}
                status="in_progress"
                employees={employees}
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
                employees={employees}
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
            <div className="relative flex items-center justify-center px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteTaskId(null)}
                className="absolute left-6 p-2 rounded-md text-black bg-[#F2F2F2] transition-colors cursor-pointer group"
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
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                    <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </button>
              <h3 className="text-[20px] font-Gantari font-semibold text-[#020202]">
                Delete Task
              </h3>
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
                className="rounded-md bg-[#F0F0F0] px-6 py-2 text-[14px] text-[#353535] font-medium text-black "
              >
                Discard
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                className="rounded-md bg-[#FFD9D9] px-6 py-2 text-[14px] font-medium text-[#E00100] "
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
