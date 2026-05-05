import { FiX } from "react-icons/fi";
import backIcon from "../../../assets/TechnicalDirector/back icon.svg";
import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import Group1 from "../../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../../assets/ProjectManager/MyTask/Group3.svg";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import Arrow from "../../../assets/ProjectManager/MyTask/arrow.svg";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";

const getProfileUrl = (path: string | undefined): string => {
  if (!path || path.trim() === "") return "";
  if (path.startsWith("http")) return path;
  const apiBaseUrl = import.meta.env.VITE_API_URL || "";
  return `${apiBaseUrl}/uploads/employee/${encodeURIComponent(path.replace(/\\/g, "/").replace(/^\/+/, ""))}`;
};
interface Task {
  id: number;
  task_name: string;
  description?: string;
  status: string;
  /** UI label for vendor_task.category */
  priority: string;
  category?: string;
  due_date?: string;
  project_id?: number;
  project_name?: string;
  assigned_to?: number;
  /** Resolved assignee name from vendor_task; derived from assigned_full_name */
  assigned_to_name?: string;
  assigned_full_name?: string;
  /** Use vendor_task.modules to store selected Team/Department */
  modules?: string;
  assigned_profile_picture?: string;
  uploader_full_name?: string;
  is_assigned_to_me?: boolean;
  is_owned_by_me?: boolean;
}

interface Project {
  id: number;
  project_name: string;
  modules?: string;
  members?: string;
}

interface Employee {
  id: number;
  full_name: string;
  active?: string;
}

interface Team {
  id?: number;
  team_id?: number;
  team_name: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function VendorBimLeadTeamTasks() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || "";
  const navigate = useNavigate();
  const projectFilter = searchParams.get("project");
  const statusFilter =
    searchParams.get("status") || searchParams.get("taskstatus");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const normalizeStatus = (
    s: string | undefined,
    approval?: string,
  ): "todo" | "in_progress" | "completed" => {
    if (approval?.toLowerCase() === "approved" || approval?.toLowerCase() === "rejected")
      return "completed";
    if (!s) return "todo";
    const lower = s.toLowerCase().replace(/\s+/g, "_");
    if (lower.includes("progress") || lower === "in_progress")
      return "in_progress";
    if (lower.includes("complete") || lower === "done") return "completed";
    return "todo";
  };

  const getEffectiveStatus = (t: Task): "todo" | "in_progress" | "completed" => {
    const status = normalizeStatus(t.status, (t as any).Approval);
    const progress = (t as any).progress;
    const uploaderId = (t as any).uploaderid ?? (t as any).vendor_id;
    const isOwner = String(uploaderId) === String(user?.id);

    const userName = (user?.full_name || user?.name || "").trim().toLowerCase();
    const taskAssigneeName = ((t as any).assigned_full_name || (t as any).assigned_to_name || (t as any).assign_to || "").trim().toLowerCase();
    const isAssignedToMe = String(t.assigned_to) === String(user?.id) || (userName && taskAssigneeName === userName);
    const isAssignedToOthers = t.assigned_to != null && !isAssignedToMe;

    if (isOwner && isAssignedToOthers && (progress === 95 || progress === "95") && status === "completed") {
      return "todo";
    }
    return status;
  };

  const fetchData = () => {
    setLoading(true);
    const taskParams: Record<string, string> = { condition: "1" };
    if (statusFilter) taskParams.status = statusFilter;
    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", {
        params: taskParams,
      }),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
      api.get<{ success?: boolean; resources?: Employee[] }>("/api/vendors/vendor-resource-profiles"),
      api.get<{ teams?: Team[] }>("/api/vendors/vendor-teams"),
    ])
      .then(([tasksRes, projectsRes, empRes, teamsRes]) => {
        const raw = tasksRes.data.tasks ?? [];
        const mapped = raw.map((t) => ({
          ...t,
          assigned_to_name: t.assigned_to_name ?? t.assigned_full_name,
          // Backend stores priority in `category`
          priority: (t as any).priority ?? (t as any).category ?? t.priority,
          uploader_full_name: (t as any).uploader_full_name || (t as any).uploader_name || "-",
        }));
        setTasks(mapped);
        setProjects(projectsRes.data.projects ?? []);
        setEmployees(empRes.data.resources ?? []);
        const normalizedTeams = (teamsRes.data.teams ?? []).map((t: Team) => ({
          ...t,
          id: (t as any).id ?? (t as any).team_id,
          team_id: (t as any).team_id ?? (t as any).id,
        }));
        setTeams(normalizedTeams);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);







  const handleDelete = (taskId: number) => {
    setTaskToDelete(taskId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!taskToDelete) return;
    api
      .delete(`/api/vendors/vendor-tasks/${taskToDelete}`)
      .then(() => {
        setTasks((prev) => prev.filter((t) => t.id !== taskToDelete));
        toast.success("Task deleted");
        setShowDeleteModal(false);
        setTaskToDelete(null);
      })
      .catch(() => toast.error("Failed to delete task"));
  };

  const outlineEmployeeFilters = [
    "All Employees",
    ...new Set(tasks.map((t) => t.assigned_to_name).filter(Boolean)),
  ];
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] =
    useState("All Employees");

  const baseTeamFilteredTasks = tasks.filter((t) => {
    if (searchQuery) {
      if (!(
        (t.task_name || "").toLowerCase().includes(searchQuery) ||
        (t.project_name || "").toLowerCase().includes(searchQuery) ||
        (t.assigned_to_name || "").toLowerCase().includes(searchQuery) ||
        (t.priority || "").toLowerCase().includes(searchQuery) ||
        (t.status || "").toLowerCase().includes(searchQuery)
      )) {
        return false;
      }
    }
    const isAssignedToMe = Boolean(t.is_assigned_to_me);
    const isOwner = Boolean(t.is_owned_by_me);
    const isUnderReview = (t as any).review_required === true || ((t as any).progress === 95 && (t.status === "Completed" || t.status === "completed"));

    // Team Tasks: Tasks I assigned to others that are NOT currently under review (pending my approval)
    return isOwner && !isAssignedToMe && !isUnderReview;
  });

  const filteredTasks = baseTeamFilteredTasks.filter((t) => {
    const matchesStatus =
      !statusFilter ||
      getEffectiveStatus(t) === normalizeStatus(statusFilter);
    const matchesEmployee =
      selectedEmployeeFilter === "All Employees" ||
      t.assigned_to_name === selectedEmployeeFilter;
    const matchesProject = !projectFilter || t.project_name === projectFilter;
    return matchesStatus && matchesEmployee && matchesProject;
  });

  const baseFilteredTasks = baseTeamFilteredTasks.filter((t) => {
    const matchesEmployee =
      selectedEmployeeFilter === "All Employees" ||
      t.assigned_to_name === selectedEmployeeFilter;
    const matchesProject = !projectFilter || t.project_name === projectFilter;
    return matchesEmployee && matchesProject;
  });

  const counts = {
    todo: baseFilteredTasks.filter((t) => getEffectiveStatus(t) === "todo")
      .length,
    in_progress: baseFilteredTasks.filter(
      (t) => getEffectiveStatus(t) === "in_progress",
    ).length,
    completed: baseFilteredTasks.filter(
      (t) => getEffectiveStatus(t) === "completed",
    ).length,
  };

  const displayedTasksByStatus = {
    todo: filteredTasks.filter((t) => getEffectiveStatus(t) === "todo"),
    in_progress: filteredTasks.filter(
      (t) => getEffectiveStatus(t) === "in_progress",
    ),
    completed: filteredTasks.filter(
      (t) => getEffectiveStatus(t) === "completed",
    ),
  };

  const handleMoveTask = (
    taskId: number,
    newBucket: "todo" | "in_progress" | "completed",
  ) => {
    const taskRow = tasks.find((t) => t.id === taskId);
    if (!taskRow) return;

    const current = getEffectiveStatus(taskRow);
    if (current === newBucket) return;

    if (current === "todo" && newBucket === "completed") {
      toast.error("Move the task to In Progress before marking it completed.");
      return;
    }
    if (current === "completed" && newBucket !== "completed") {
      toast.error("Completed tasks cannot be moved.");
      return;
    }

    const uploaderId = (taskRow as any).uploaderid ?? (taskRow as any).vendor_id;
    const isOwner = String(uploaderId) === String(user?.id);
    const statusMap = {
      todo: "Todo",
      in_progress: "InProgress",
      completed: "Completed",
    } as const;
    const apiStatus = statusMap[newBucket];
    const nextProgress = newBucket === "completed" ? (isOwner ? 100 : 95) : newBucket === "in_progress" ? 50 : 0;

    api
      .patch(`/api/vendors/vendor-tasks/${taskId}/status`, {
        status: apiStatus,
        progress: nextProgress,
      })
      .then(() => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, status: apiStatus, progress: nextProgress }
              : t,
          ),
        );
        toast.success(`Task moved to ${newBucket}`);
      })
      .catch(() => {
        toast.error("Failed to update status");
        fetchData();
      });
  };

  /** Inner TaskCard component matching TD design */
  const TaskCard = ({
    task,
    status,
  }: {
    task: Task;
    status: "todo" | "in_progress" | "completed";
  }) => {
    const isUnderReview =
      status === "completed" &&
      task.assigned_to != null &&
      ((task as any).uploaderid != null || (task as any).vendor_id != null) &&
      String(task.assigned_to) !== String((task as any).uploaderid ?? (task as any).vendor_id) &&
      (task as any).Approval?.toLowerCase() !== "approved";

    const progress = isUnderReview
      ? 95
      : status === "todo"
        ? 0
        : status === "in_progress"
          ? 50
          : (task as any).Approval?.toLowerCase() === "approved"
            ? 100
            : 100;
    const isCompleted = normalizeStatus(task.status) === "completed";
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
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    return (
      <div
        draggable={!isCompleted}
        onDragStart={(e) => {
          e.dataTransfer.setData("taskId", String(task.id));
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", task.task_name || "Task");
        }}
        className={`rounded-md border border-slate-200 bg-white p-4 shadow-sm relative transition-all hover:shadow-md font-Gantari ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex-1 min-w-0 pr-6">
            <h4 className="text-[20px] font-semibold text-[#353535] truncate leading-tight">
              {task.task_name}
            </h4>
          </div>
          <div className="absolute top-4 right-4" ref={menuRef}>
            <button
              type="button"
              draggable={false}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="rounded cursor-pointer leading-none  transition-colors"
            >
              <img src={Dot} alt="Dot" className="w-4 h-4 object-contain" />
            </button>
            {menuOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 min-w-[170px] bg-white/40 backdrop-blur-xl rounded-[15px] border border-[#59595980] shadow-2xl py-2.5 animate-in fade-in zoom-in duration-200 origin-top-right">
                <button
                  type="button"
                  draggable={false}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/vendor-bim-lead/tasks/view/${task.id}`, {
                      state: { task, from: "teamtask" },
                    });
                  }}
                  className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
                <button
                  type="button"
                  draggable={false}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/vendor-bim-lead/teamtasks/edit", {
                      state: { task, from: "teamtasks" },
                    });
                  }}
                  className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
                  draggable={false}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setMenuOpen(false);
                    handleDelete(task.id);
                  }}
                  className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-col">
            <span className="text-[14px] font-medium text-[#000000] mb-0.5">
              Start Date
            </span>
            <span className="text-[14px] font-medium text-[#8B8B8B]">
              {(task as any).start_date
                ? new Date((task as any).start_date)
                  .toLocaleDateString("en-GB")
                  .replace(/\//g, "-")
                : "—"}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[14px] font-medium text-[#000000] mb-0.5">
              End Date
            </span>
            <span className="text-[14px] font-medium text-[#8B8B8B]">
              {task.due_date
                ? new Date(task.due_date)
                  .toLocaleDateString("en-GB")
                  .replace(/\//g, "-")
                : "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-[#8B8B8B]">Progress</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#8B8B8B]">
              {progress}%
            </span>
            {isUnderReview && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">
                Reviewed
              </span>
            )}
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-[#8B8B8B] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="flex items-center gap-2">
            {(() => {
              const src =
                task.assigned_to != null &&
                  (task as any).assigned_profile_picture
                  ? getGlobalProfileUrl(
                    task.assigned_to,
                    (task as any).assigned_profile_picture,
                    "vendor"
                  )
                  : (task as any).assigned_profile_picture
                    ? getProfileUrl((task as any).assigned_profile_picture)
                    : "";
              const initials = (task.assigned_to_name || "U")[0].toUpperCase();
              return (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[12px] font-bold text-slate-700 shadow-sm overflow-hidden"
                    title={task.assigned_to_name}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={task.assigned_to_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          <button
            type="button"
            draggable={false}
            onClick={() => {
              navigate(`/vendor-bim-lead/tasks/view/${task.id}`, {
                state: { task, from: "teamtask" },
              });
            }}
            className="group inline-flex items-center text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] gap-2 transition-colors cursor-pointer"
          >
            Details
            <img
              src={Arrow}
              alt="Arrow"
              className="w-2.5 h.2.5 transition-all duration-200 group-hover:brightness-0"
            />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col font-gantari">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-4 md:px-5 py-2">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-[20px] md:text-[24px] font-semibold text-slate-800">
                Team Tasks
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedEmployeeFilter}
                    onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                    className="appearance-none rounded-md bg-[#F2F2F2]  focus:border-[#AEAEAE] min-w-[140px] px-4 py-2 pr-8 text-[14px] text-[#353535] cursor-pointer"
                  >
                    {outlineEmployeeFilters.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                  <img
                    src={ArrowDown}
                    alt="arrow"
                    className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2"
                  />
                </div>
                <button
                  onClick={() => navigate("/vendor-bim-lead/teamtasks/add")}
                  className="inline-flex items-center gap-2 rounded-md bg-[#DD4342] px-4 py-2 text-[14px] font-medium text-white cursor-pointer"
                >
                  <img src={AddBtn} alt="Add" className="h-5 w-5" />
                  Add Task
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 pt-2">
              <div className="flex px-4 py-3 md:py-4 gap-3 md:gap-4 rounded-xl border shadow-sm relative bg-white border-slate-200">
                <span className="text-[16px] md:text-[18px] font-bold text-[#0D1829]">
                  To Do
                </span>
                <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829]">
                  ({counts.todo})
                </span>
                <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                  <img
                    src={Group1}
                    alt="Group1"
                    className="w-6 h-6 md:w-8 md:h-8"
                  />
                </div>
              </div>
              <div className="flex px-4 py-3 md:py-4 gap-3 md:gap-4 rounded-xl border shadow-sm relative bg-white border-slate-200">
                <span className="text-[16px] md:text-[18px] font-bold text-[#0D1829]">
                  In Progress
                </span>
                <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829]">
                  ({counts.in_progress})
                </span>
                <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                  <img
                    src={Group2}
                    alt="Group2"
                    className="w-6 h-6 md:w-8 md:h-8"
                  />
                </div>
              </div>
              <div className="flex px-4 py-3 md:py-4 gap-3 md:gap-4 rounded-xl border shadow-sm relative bg-white border-slate-200">
                <span className="text-[16px] md:text-[18px] font-bold text-[#0D1829]">
                  Completed
                </span>
                <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829]">
                  ({counts.completed})
                </span>
                <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                  <img
                    src={Group3}
                    alt="Group3"
                    className="w-6 h-6 md:w-8 md:h-8"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pl-4 md:pr-2 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-3">
              {(["todo", "in_progress", "completed"] as const).map((bucket) => (
                <div
                  key={bucket}
                  className="flex flex-col gap-4 min-h-[120px] rounded-lg border-2 border-dashed border-transparent p-1 transition-colors"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = Number(e.dataTransfer.getData("taskId"));
                    if (!Number.isNaN(taskId)) handleMoveTask(taskId, bucket);
                  }}
                >
                  {displayedTasksByStatus[bucket].map((task) => (
                    <TaskCard key={task.id} task={task} status={bucket} />
                  ))}
                  {displayedTasksByStatus[bucket].length === 0 && (
                    <div className="rounded-[15px] border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-[14px] text-slate-400 font-medium font-Gantari">
                      No tasks in this stage
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>


      {/* Delete Task Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-Gantari">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mb-2 flex w-full">
              <div className="group relative inline-flex">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTaskToDelete(null);
                  }}
                  className="flex items-center justify-center rounded-md bg-[#F2F2F2] p-2 text-black transition cursor-pointer"
                >
                  <FiX className="h-5 w-5 text-black" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-2 py-0.5 relative z-10">
                    <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <h3 className="-mt-8 mb-6 text-[24px] font-medium text-black">
                Delete Task
              </h3>
              <p className="mb-8 text-center text-[#353535] text-[16px]">
                Are you sure, you want to Delete this?
              </p>
              <div className="flex w-full gap-3 justify-center items-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTaskToDelete(null);
                  }}
                  className="rounded-md bg-[#F2F2F2] px-5 py-2 text-[16px] font-medium text-[#353535] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="rounded-md bg-[#DD3246] px-4 py-2 text-[16px] font-medium text-white cursor-pointer"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

