import { useEffect, useState, useRef } from "react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { VscEye } from "react-icons/vsc";
import { HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import api from "../../lib/api";
import Group1 from "../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../assets/ProjectManager/MyTask/arrow.svg";
import Dot from "../../assets/ProjectManager/MyTask/Dot.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import AddBtn from "../../assets/TechnicalDirector/add btn.svg";
type DropdownId = "employee" | "projects" | "show" | "period" | null;

interface Employee {
  id: number;
  full_name: string;
}

interface Project {
  id: number;
  project_name: string;
  tasks?: string;
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
        className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-sm ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className={`truncate font-gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#616161]"}`}>
          {label.toLowerCase() === "show" && selected && selected !== label ? (
            <>
              <span className="text-sm text-[#353535]">Show:</span>{" "}
              <span>{selected}</span>
            </>
          ) : (
            selected ?? label
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
                className={`block w-full px-4 py-2 text-left text-sm font-gantari transition-colors ${selected === opt ? "bg-gray-100 text-[#353535]" : "text-[#616161] hover:text-[#353535] hover:bg-gray-200"}`}
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
  Approval?: string;
  created_at?: string;
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
  onViewTask,
  onEditTask,
  onDeleteTask,
}: {
  task: Task;
  status: "todo" | "in_progress" | "completed" | "approved" | "rejected";
  onViewTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}) {
  const progress = task.progress ?? 0;
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

  const startStr = task.start_date
    ? `${new Date(task.start_date).getDate().toString().padStart(2, "0")}-${(new Date(task.start_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.start_date).getFullYear()}`
    : "—";
  const endStr = task.due_date
    ? `${new Date(task.due_date).getDate().toString().padStart(2, "0")}-${(new Date(task.due_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.due_date).getFullYear()}`
    : "";

  return (
    <div
      draggable={!isCompleted}
      onDragStart={handleDragStart}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm relative ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="font-semibold text-slate-900 text-xl truncate">
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
            className="p-0.5 rounded hover:bg-slate-100"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <img src={Dot} alt="Dot" className="w-4 h-4 text-slate-600" />
          </button>
          {menuOpen && (
            <div
              className={`absolute top-full mt-1 z-50 min-w-[120px] rounded-2xl bg-transparent backdrop-blur-sm py-1 px-3 shadow-lg border border-[#59595980] transform-gpu transition-all duration-200 ease-out ${isCompleted ? "right-full mr-1 origin-top-right" : "left-full ml-1 origin-top-left"} ${menuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
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
      <div className="flex items-center justify-between gap-2 mb-3 text-[13px] font-medium text-[#0A2E65]">
        <span>{startStr}</span>
        <span>{endStr}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-slate-600">Progress</span>
        <span className="text-xs font-medium text-slate-700">
          {progress}%
        </span>
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
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white shrink-0"
                title="Assignee"
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">+4</span>
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

const SHOW_OPTIONS = ["Show", "1-50", "51-100", "101-150", "151-200", "201-250", "251-300", "All"];
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
      await api.patch(`/api/tasks/${taskId}/status`, { status: statusMap[newStatus] });
      setList(prev => prev.map(t => t.id === taskId ? { ...t, status: statusMap[newStatus] } : t));
    } catch (error) {
      console.error("Error moving task:", error);
    }
  };


  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string | null>("Show");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const navigate = useNavigate();

  const openEditTask = (task: Task) => {
    navigate("/tasks/add", { state: { task } });
  };

  const openDeleteTask = (task: Task) => {
    setDeleteTaskId(task.id);
  };

  const openViewTask = (task: Task) => {
    navigate("/tasks/taskview", { state: { task } });
  };

  const confirmDeleteTask = async () => {
    if (deleteTaskId === null) return;
    try {
      await api.delete(`/api/tasks/${deleteTaskId}`);
      setList((prev) => prev.filter((t) => t.id !== deleteTaskId));
      setDeleteTaskId(null);
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
    api.get<{ employees: Employee[] }>("/api/employees").then(res => setEmployees(res.data.employees || []));
    api.get<{ projects: Project[] }>("/api/projects").then(res => setProjects(res.data.projects || []));
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (isTeam) params.condition = "1";
    api
      .get<{ tasks?: Task[] }>("/api/tasks", { params })
      .then(({ data }) => setList(data.tasks ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [isTeam, statusFilter]);

  const employeeOptions = ["Select Employee", ...employees.map(e => e.full_name)];
  const projectOptions = ["Select Projects", ...projects.map(p => p.project_name)];

  const allTasks = list.filter((t) => {
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
  if (selectedShow === "All" || !selectedShow || selectedShow === "Show") {
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
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="bg-white pb-3 flex-shrink-0">
        {/* Top row: title + dropdowns + Add task - match MytaskTD */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <h2 className="text-[24px] font-semibold text-slate-800 font-Gantari">
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
              className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm"
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
            className="flex p-4 gap-4 rounded-xl border border-slate-200 bg-white py-4 shadow-sm hover:shadow-md transition-shadow relative"
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
            className="flex p-4 gap-4 rounded-xl border border-slate-200 bg-white py-4 shadow-sm hover:shadow-md transition-shadow relative"
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
            className="flex p-4 gap-4 rounded-xl border border-slate-200 bg-white py-4 shadow-sm hover:shadow-md transition-shadow relative"
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
    </div>
  );
}
