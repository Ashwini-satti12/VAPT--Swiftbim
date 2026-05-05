import { useEffect, useState, useRef, useMemo } from "react";
import api from "../../../lib/api";
import { toast } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { FiX } from "react-icons/fi";
import { useAuth } from "../../../contexts/AuthContext";

function formatDateDDMMYYYY(d?: string): string {
  if (!d) return "—";
  const s = String(d).trim();
  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, mo, day] = s.slice(0, 10).split("-").map(Number);
    date = new Date(y, mo - 1, day);
  } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(s)) {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) date = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    else date = new Date(s);
  } else {
    date = new Date(s);
  }
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

interface Task {
  id: number;
  task_name: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  project_id?: number;
  project_name?: string;
  assigned_to?: number;
  uploaderid?: number;
  assigned_to_name?: string;
  assign_to?: string;
  category?: string;
  assigned_profile_picture?: string;
  uploader_full_name?: string;
  is_assigned_to_me?: boolean;
  is_owned_by_me?: boolean;
  assigned_full_name?: string;
  start_date?: string;
  start_time?: string;
  end_time?: string;
  assigned_by_name?: string;
  Approval?: string;
}

interface Project {
  id: number;
  project_name: string;
  members?: string;
}

interface Employee {
  id: number;
  full_name: string;
  active?: string;
}

export default function VendorBimLeadTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState("Show Entries");
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);

  const showDropdownRef = useRef<HTMLDivElement>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const fetchTasks = () => {
    api
      .get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks")
      .then(({ data }) => {
        const raw = data.tasks ?? [];
        const mapped = raw.map((t) => ({
          ...t,
          assigned_to_name: t.assigned_to_name ?? t.assigned_full_name,
          assigned_by_name: (t as any).assigned_by_name ?? "-",
          priority: (t as any).priority ?? (t as any).category ?? t.priority,
          uploader_full_name: (t as any).uploader_full_name || (t as any).uploader_name || "-",
        }));
        setTasks(mapped);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
    api
      .get<{ projects?: Project[] }>("/api/vendors/vendor-projects")
      .then(({ data }) => setProjects(data.projects ?? []));
    api
      .get<{ success?: boolean; resources?: Employee[] }>(
        "/api/vendors/vendor-resource-profiles",
      )
      .then(({ data }) => setEmployees(data.resources ?? []));

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        showDropdownRef.current &&
        !showDropdownRef.current.contains(target)
      ) {
        setShowDropdownOpen(false);
      }
      if (cardMenuRef.current && !cardMenuRef.current.contains(target)) {
        setOpenMenuTaskId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);





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

  const handleViewAction = (task: Task) => {
    setOpenMenuTaskId(null);
    navigate(`/vendor-bim-lead/tasks/view/${task.id}`, { state: { task } });
  };

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

  const handleMoveTask = (
    taskId: number,
    newBucket: "todo" | "in_progress" | "completed",
  ) => {
    const taskRow = tasks.find((t) => t.id === taskId);
    if (!taskRow) return;

    const current = getEffectiveStatus(taskRow);
    if (current === newBucket) return;

    if (current === "todo" && newBucket === "completed") {
      toast.error("Move task to In Progress before completing.");
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
        fetchTasks();
      });
  };

  const getEffectiveStatus = (t: Task): "todo" | "in_progress" | "completed" => {
    const status = normalizeStatus(t.status, t.Approval);
    const progress = (t as any).progress;
    const uploaderId = (t as any).uploaderid ?? (t as any).vendor_id;
    const isOwner = String(uploaderId) === String(user?.id);
    const userName = (user?.full_name || user?.name || "").trim().toLowerCase();
    const taskAssigneeName = (t.assigned_full_name || t.assign_to || "").trim().toLowerCase();
    const isAssignedToMe = String(t.assigned_to) === String(user?.id) || (userName && taskAssigneeName === userName);
    const isAssignedToOthers = t.assigned_to != null && !isAssignedToMe;

    if ((isOwner && isAssignedToOthers && (progress === 95 || progress === "95") && status === "completed") || (t as any).review_required === true) {
      return "todo";
    }
    return status;
  };

  const handleApproveTask = (task: Task) => {
    api.patch(`/api/vendors/vendor-tasks/${task.id}/status`, { status: "Approved" })
      .then(() => {
        toast.success("Task Approved");
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, Approval: "Approved", progress: 100 } : t));
      })
      .catch(() => toast.error("Failed to approve task"));
  };
  (window as any).handleApproveTask = handleApproveTask;



  const myFilteredTasks = tasks.filter((t) => {
    if (searchQuery) {
      if (!(
        (t.task_name || "").toLowerCase().includes(searchQuery) ||
        (t.project_name || "").toLowerCase().includes(searchQuery) ||
        (t.assigned_to_name || "").toLowerCase().includes(searchQuery) ||
        (t.category || "").toLowerCase().includes(searchQuery) ||
        (t.status || "").toLowerCase().includes(searchQuery)
      )) {
        return false;
      }
    }
    const isAssignedToMe = Boolean(t.is_assigned_to_me);
    const isOwner = Boolean(t.is_owned_by_me);
    const isUnderReview = (t as any).review_required === true || ((t as any).progress === 95 && (t.status === "Completed" || t.status === "completed"));

    if (isAssignedToMe) return true;
    if (isOwner && isUnderReview && t.assigned_to != null) return true;
    return false;
  });

  const tasksByStatus = {
    todo: myFilteredTasks.filter((t) => getEffectiveStatus(t) === "todo"),
    in_progress: myFilteredTasks.filter((t) => getEffectiveStatus(t) === "in_progress"),
    completed: myFilteredTasks.filter((t) => getEffectiveStatus(t) === "completed"),
  };
  const showLimit =
    selectedShow === "All" || selectedShow === "Show Entries"
      ? Number.POSITIVE_INFINITY
      : Math.max(1, Number(selectedShow) || 10);
  const displayedTasksByStatus = {
    todo: tasksByStatus.todo.slice(0, showLimit),
    in_progress: tasksByStatus.in_progress.slice(0, showLimit),
    completed: tasksByStatus.completed.slice(0, showLimit),
  };
  const counts = {
    todo: tasksByStatus.todo.length,
    in_progress: tasksByStatus.in_progress.length,
    completed: tasksByStatus.completed.length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
      </div>
    );
  }

  // ─── TASK LIST PAGE ───────────────────────────────────────────────────────────
  return (
    <div className="bg-white h-full min-h-0 flex flex-col font-gantari">
      <div className="flex-shrink-0 px-4 md:px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-[20px] md:text-[24px] font-semibold text-slate-800">
            Tasks
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative" ref={showDropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdownOpen(!showDropdownOpen)}
                className="flex items-center gap-4 rounded-md bg-[#E8E8E8] px-4 py-2 text-sm text-[#353535] cursor-pointer min-w-[100px] justify-between"
              >
                <span>{selectedShow}</span>
                <img
                  src={ArrowDown}
                  alt="arrow"
                  className={`h-2.5 w-2.5 transition-transform ${showDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {showDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {SHOW_OPTIONS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        setSelectedShow(o);
                        setShowDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#F2F2F2] cursor-pointer ${selectedShow === o ? "bg-[#F2F2F2] text-[#353535] font-bold" : "text-[#353535]"}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                navigate("/vendor-bim-lead/tasks/add", { state: { from: "tasks" } });
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer"
            >
              <img src={AddBtn} alt="Add" className="h-5 w-5" />
              Create Task
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 pt-2">
          <div className="flex items-center p-4 gap-3 md:gap-4 rounded-xl border py-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative bg-white border-slate-200 cursor-pointer">
            <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829]">
              To Do
            </span>
            <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829]">
              ({counts.todo})
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group1} alt="Group1" className="w-6 h-6 md:w-8 md:h-8" />
            </div>
          </div>
          <div className="flex items-center p-4 gap-3 md:gap-4 rounded-xl border py-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative bg-white border-slate-200 cursor-pointer">
            <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829]">
              In Progress
            </span>
            <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829]">
              ({counts.in_progress})
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group2} alt="Group2" className="w-6 h-6 md:w-8 md:h-8" />
            </div>
          </div>
          <div className="flex items-center p-4 gap-3 md:gap-4 rounded-xl border py-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative bg-white border-slate-200 cursor-pointer">
            <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829]">
              Completed
            </span>
            <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829]">
              ({counts.completed})
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group3} alt="Group3" className="w-6 h-6 md:w-8 md:h-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 md:px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {(["todo", "in_progress", "completed"] as const).map((bucket) => (
            <div
              key={bucket}
              className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent p-1 transition-colors"
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
              {displayedTasksByStatus[bucket].map((task) => {
                const progressValue =
                  bucket === "todo"
                    ? 0
                    : bucket === "in_progress"
                      ? 50
                      : task.assigned_to != null &&
                        ((task as any).uploaderid != null || (task as any).vendor_id != null) &&
                        String(task.assigned_to) !== String((task as any).uploaderid ?? (task as any).vendor_id)
                        ? task.Approval?.toLowerCase() === "approved"
                          ? 100
                          : 95
                        : 100;

                const isReviewState =
                  (bucket === "completed" ||
                    (task as any).review_required ||
                    Number((task as any).progress) === 95) &&
                  task.assigned_to != null &&
                  ((task as any).uploaderid != null || (task as any).vendor_id != null) &&
                  String(task.assigned_to) !== String((task as any).uploaderid ?? (task as any).vendor_id) &&
                  task.Approval?.toLowerCase() !== "approved";

                const isCompletedCol =
                  getEffectiveStatus(task) === "completed";
                return (
                  <div
                    key={task.id}
                    draggable={!isCompletedCol}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", String(task.id));
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData(
                        "text/plain",
                        task.task_name || "Task",
                      );
                    }}
                    className={`mt-2 rounded-lg border border-[#AEACAC52] bg-white p-3 shadow-sm relative mx-auto w-full max-w-full lg:max-w-none ${isCompletedCol ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <h4 className="font-medium text-[#353535] text-[20px] truncate leading-tight">
                        {task.task_name || "Task Name"}
                      </h4>
                      <div
                        className="relative"
                        ref={openMenuTaskId === task.id ? cardMenuRef : null}
                      >
                        <button
                          type="button"
                          draggable={false}
                          onClick={() =>
                            setOpenMenuTaskId(
                              openMenuTaskId === task.id ? null : task.id,
                            )
                          }
                          className="p-0.5 rounded cursor-pointer"
                        >
                          <img
                            src={Dot}
                            alt="Dot"
                            className="w-4 h-4 text-slate-600"
                          />
                        </button>
                        {openMenuTaskId === task.id && (
                          <div className="absolute top-full mt-1 right-0 z-50 min-w-[160px] bg-white/20 backdrop-blur-md rounded-xl border border-[#59595980] shadow-xl transition-all duration-200 ease-out font-Gantari">
                            <button
                              type="button"
                              draggable={false}
                              onClick={() => handleViewAction(task)}
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
                            {!isCompletedCol && (
                              <>
                                <button
                                  type="button"
                                  draggable={false}
                                  onClick={() => {
                                    setOpenMenuTaskId(null);
                                    navigate("/vendor-bim-lead/tasks/edit", {
                                      state: { task, from: "tasks" },
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
                                  onClick={() => {
                                    setOpenMenuTaskId(null);
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
                              </>
                            )}
                            {isReviewState && String((task as any).uploaderid ?? (task as any).vendor_id) === String(user?.id) && (
                              <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer border-0 bg-transparent shadow-none"
                                onClick={() => {
                                  setOpenMenuTaskId(null);
                                  (window as any).handleApproveTask?.(task);
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
                      <div className="flex flex-col">
                        <span className="text-[14px] font-medium text-[#000000]">Start Date</span>
                        <span className="text-[14px] font-medium text-[#8B8B8B]">
                          {(task as any).start_date
                            ? formatDateDDMMYYYY((task as any).start_date)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[14px] font-medium text-[#000000]">End Date</span>
                        <span className="text-[14px] font-medium text-[#8B8B8B]">
                          {task.due_date ? formatDateDDMMYYYY(task.due_date) : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[12px] text-[#8B8B8B]">Progress</span>
                      <span className="text-[12px] text-[#8B8B8B]">
                        {isReviewState ? "95% (Under Review)" : `${progressValue}%`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-4">
                      <div
                        className="h-full rounded-full bg-[#8B8B8B]"
                        style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <div className="flex -space-x-2">
                          {task.assigned_to_name && (
                            <div
                              className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                              title={`Assigned To: ${task.assigned_to_name}`}
                            >
                              <span>
                                {task.assigned_to_name
                                  .split(" ")
                                  .filter(Boolean)
                                  .map((p: string) => p[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        draggable={false}
                        onClick={() => handleViewAction(task)}
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
              })}
              {displayedTasksByStatus[bucket].length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No tasks
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete Task Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setTaskToDelete(null);
              }}
              className="absolute left-4 top-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
              title="Close"
            >
              <FiX className="h-5 w-5 text-black" />
            </button>
            <h3 className="text-[18px] font-Gantari font-semibold text-[#020202] mt-[12px] mb-3">
              Delete Task
            </h3>
            <p className="text-[14px] font-Gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center">
              Are you sure, you want to Delete this?
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto mb-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setTaskToDelete(null);
                }}
                className="w-full sm:w-auto px-5 md:px-5 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-Gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="w-full sm:w-auto px-5 md:px-5 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-Gantari font-semibold text-[14px] transition-all cursor-pointer"
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
