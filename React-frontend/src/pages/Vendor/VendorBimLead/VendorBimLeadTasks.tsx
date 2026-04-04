import { useEffect, useState, useRef } from "react";
import api from "../../../lib/api";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
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
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import Upload from "../../../assets/ProjectManager/MyTask/Upload.svg";
import ImageIcon from "../../../assets/ProjectManager/MyTask/image.svg";

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

function formatTimeDisplay(t?: string): string {
  if (!t) return "—";
  const s = String(t).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return s;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
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
  /** Resolved assignee name; derived from backend's assigned_full_name for vendor_task */
  assigned_to_name?: string;
  category?: string;
  /** For compatibility with /api/vendors/vendor-tasks */
  assigned_full_name?: string;
  start_date?: string;
  start_time?: string;
  end_time?: string;
  checklist?: string;
  assigned_by_name?: string;
}

interface Project {
  id: number;
  project_name: string;
}

interface Employee {
  id: number;
  full_name: string;
  active?: string;
}

export default function VendorBimLeadTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState("Show Entries");
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    task_name: "",
    description: "",
    status: "Todo",
    priority: "",
    due_date: "",
    project_id: "",
    assigned_to: "",
    category: "",
    actual_start_date: "",
    actual_end_date: "",
    checklist: "",
    start_time: "",
    end_time: "",
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [openFormDropdown, setOpenFormDropdown] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const navigate = useNavigate();
  const [editForm, setEditForm] = useState({
    task_name: "",
    description: "",
    status: "",
    priority: "",
    due_date: "",
    project_id: "",
    assigned_to: "",
    category: "",
    actual_start_date: "",
    actual_end_date: "",
    checklist: "",
    start_time: "",
    end_time: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editAttachmentFiles, setEditAttachmentFiles] = useState<File[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const showDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const moduleDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const assignDropdownRef = useRef<HTMLDivElement>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  const fetchTasks = () => {
    api
      .get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks")
      .then(({ data }) => {
        const raw = data.tasks ?? [];
        const mapped = raw.map((t) => ({
          ...t,
          assigned_to_name: t.assigned_to_name ?? t.assigned_full_name,
          assigned_by_name: (t as any).assigned_by_name ?? "-",
          // Backend stores this in vendor_task.category
          priority: (t as any).priority ?? (t as any).category ?? t.priority,
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
      .get<{ employees?: Employee[] }>("/api/employees")
      .then(({ data }) => setEmployees(data.employees ?? []));

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
      if (openFormDropdown) {
        if (
          openFormDropdown === "project" &&
          projectDropdownRef.current &&
          !projectDropdownRef.current.contains(target)
        ) {
          setOpenFormDropdown(null);
        }
        if (
          openFormDropdown === "module" &&
          moduleDropdownRef.current &&
          !moduleDropdownRef.current.contains(target)
        ) {
          setOpenFormDropdown(null);
        }
        if (
          openFormDropdown === "type" &&
          typeDropdownRef.current &&
          !typeDropdownRef.current.contains(target)
        ) {
          setOpenFormDropdown(null);
        }
        if (
          openFormDropdown === "assignTo" &&
          assignDropdownRef.current &&
          !assignDropdownRef.current.contains(target)
        ) {
          setOpenFormDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openFormDropdown]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    // Transform UI form keys to backend vendor_task keys
    const payload = {
      task_name: createForm.task_name,
      description: createForm.description,
      status: createForm.status === "To Do" ? "Todo" : createForm.status,
      category: createForm.priority || "Medium",
      due_date: createForm.actual_end_date || undefined,
      start_date: createForm.actual_start_date || undefined,
      start_time: createForm.start_time || undefined,
      end_time: createForm.end_time || undefined,
      project_id: createForm.project_id
        ? Number(createForm.project_id)
        : undefined,
      assigned_to: createForm.assigned_to
        ? Number(createForm.assigned_to)
        : undefined,
      // Use "category" selection for type, and "modules"/category selection for module
      modules: createForm.category || undefined,
      checklist: createForm.checklist || undefined,
    };

    api
      .post("/api/vendors/vendor-tasks", payload)
      .then((res) => {
        const taskId = res.data?.task_id ?? res.data?.id;
        setShowCreateModal(false);
        setAttachmentFiles([]);
        setCreateForm({
          task_name: "",
          description: "",
          status: "Todo",
          priority: "Medium",
          due_date: "",
          project_id: "",
          assigned_to: "",
          category: "",
          actual_start_date: "",
          actual_end_date: "",
          checklist: "",
          start_time: "",
          end_time: "",
        });
        if (taskId && attachmentFiles.length > 0) {
          const formData = new FormData();
          attachmentFiles.forEach((f) => formData.append("image", f));
          api
            .post(
              `/api/vendors/vendor-tasks/${taskId}/output-files`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            )
            .catch(() => toast.error("Failed to upload attachments"));
        }
        fetchTasks();
      })
      .finally(() => setCreateSubmitting(false));
  };

  const handleStatusChange = (taskId: number, newStatus: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
    api
      .patch(`/api/vendors/vendor-tasks/${taskId}/status`, {
        status: newStatus,
      })
      .then(() => toast.success("Status updated"))
      .catch(() => {
        toast.error("Failed to update status");
        fetchTasks();
      });
  };

  const deleteAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditAttachmentChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files) {
      setEditAttachmentFiles((prev) => [
        ...prev,
        ...Array.from(e.target.files!),
      ]);
    }
  };

  const deleteEditAttachment = (index: number) => {
    setEditAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachmentFiles((prev) => [...prev, ...files]);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setEditSubmitting(true);
    const payload = {
      task_name: editForm.task_name,
      description: editForm.description,
      status: editForm.status,
      category: editForm.priority || "Medium",
      due_date: editForm.actual_end_date || undefined,
      start_date: editForm.actual_start_date || undefined,
      start_time: editForm.start_time || undefined,
      end_time: editForm.end_time || undefined,
      project_id: editForm.project_id ? Number(editForm.project_id) : undefined,
      assigned_to: editForm.assigned_to
        ? Number(editForm.assigned_to)
        : undefined,
      modules: editForm.category || undefined,
      checklist: editForm.checklist || undefined,
    };

    api
      .patch(`/api/vendors/vendor-tasks/${selectedTask.id}`, payload)
      .then(() => {
        if (editAttachmentFiles.length > 0) {
          const formData = new FormData();
          editAttachmentFiles.forEach((f) => formData.append("image", f));
          api
            .post(
              `/api/vendors/vendor-tasks/${selectedTask.id}/output-files`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            )
            .catch((err) => console.error("Attachment upload failed", err));
        }
        setShowEditModal(false);
        toast.success("Task updated");
        fetchTasks();
        setEditAttachmentFiles([]);
      })
      .catch(() => toast.error("Failed to update task"))
      .finally(() => setEditSubmitting(false));
  };

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

  // View task interaction functions
  const handleViewAction = (task: Task) => {
    setOpenMenuTaskId(null);
    navigate(`/vendor-bim-lead/tasks/view/${task.id}`, { state: { task } });
  };

  const statusOptions = ["Todo", "InProgress", "Completed"];
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
  const priorityColors: Record<string, string> = {
    High: "text-red-600 bg-red-50 border-red-100",
    Medium: "text-orange-600 bg-orange-50 border-orange-100",
    Low: "text-green-600 bg-green-50 border-green-100",
    Urgent: "text-purple-600 bg-purple-50 border-purple-100",
  };
  const normalizeStatus = (
    s: string | undefined,
  ): "todo" | "in_progress" | "completed" => {
    if (!s) return "todo";
    const lower = s.toLowerCase().replace(/\s+/g, "_");
    if (lower.includes("progress") || lower === "in_progress")
      return "in_progress";
    if (lower.includes("complete") || lower === "done") return "completed";
    return "todo";
  };

  const tasksByStatus = {
    todo: tasks.filter((t) => normalizeStatus(t.status) === "todo"),
    in_progress: tasks.filter(
      (t) => normalizeStatus(t.status) === "in_progress",
    ),
    completed: tasks.filter((t) => normalizeStatus(t.status) === "completed"),
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

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-white font-gantari">
      <div className="bg-white pb-3 flex-shrink-0 px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <h2 className="text-[24px] font-semibold text-slate-800">Tasks</h2>
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
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#F2F2F2] ${selectedShow === o ? "bg-[#F2F2F2] text-[#353535] font-bold" : "text-[#353535]"}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer"
            >
              <img src={AddBtn} alt="Add" className="h-5 w-5" />
              Create Task
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
            <span className="text-xl font-bold text-[#0D1829]">To Do</span>
            <span className="text-xl font-bold text-[#0D1829]">
              ({counts.todo})
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group1} alt="Group1" className="w-8 h-8" />
            </div>
          </div>
          <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
            <span className="text-xl font-bold text-[#0D1829]">
              In Progress
            </span>
            <span className="text-xl font-bold text-[#0D1829]">
              ({counts.in_progress})
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group2} alt="Group2" className="w-8 h-8" />
            </div>
          </div>
          <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
            <span className="text-xl font-bold text-[#0D1829]">Completed</span>
            <span className="text-xl font-bold text-[#0D1829]">
              ({counts.completed})
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group3} alt="Group3" className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["todo", "in_progress", "completed"] as const).map((bucket) => (
            <div
              key={bucket}
              className="space-y-3 min-h-[120px] rounded-lg p-1"
            >
              {displayedTasksByStatus[bucket].map((task) => {
                const progress =
                  normalizeStatus(task.status) === "todo"
                    ? 0
                    : normalizeStatus(task.status) === "in_progress"
                      ? 50
                      : 100;
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm relative font-gantari"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-900 text-xl truncate font-Gantari">
                        {task.task_name || "Task Name"}
                      </h4>
                      <div
                        className="relative"
                        ref={openMenuTaskId === task.id ? cardMenuRef : null}
                      >
                        <button
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
                              onClick={() => handleViewAction(task)}
                              className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setEditForm({
                                  task_name: task.task_name,
                                  description: task.description || "",
                                  status: task.status,
                                  priority:
                                    (task as any).priority ||
                                    task.priority ||
                                    "",
                                  due_date: task.due_date || "",
                                  project_id: task.project_id?.toString() || "",
                                  assigned_to:
                                    task.assigned_to?.toString() || "",
                                  category: task.category || "",
                                  actual_start_date:
                                    (task as any).start_date || "",
                                  actual_end_date: task.due_date || "",
                                  checklist: (task as any).checklist || "",
                                  start_time: (task as any).start_time || "",
                                  end_time: (task as any).end_time || "",
                                });
                                setEditAttachmentFiles([]);
                                setShowEditModal(true);
                                setOpenMenuTaskId(null);
                              }}
                              className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
                              onClick={() => {
                                setOpenMenuTaskId(null);
                                handleDelete(task.id);
                              }}
                              className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-3 text-[13px] font-medium text-[#0A2E65] font-Gantari">
                      <span>
                        {(task as any).start_date
                          ? formatDateDDMMYYYY((task as any).start_date)
                          : "—"}
                      </span>
                      <span>
                        {task.due_date ? formatDateDDMMYYYY(task.due_date) : ""}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-slate-600 font-Gantari">
                        Progress
                      </span>
                      <span className="text-xs font-medium text-slate-700 font-Gantari">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-slate-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <div className="flex -space-x-2">
                          {task.assigned_to_name && (
                            <div
                              className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                              title={`Assigned To: ${task.assigned_to_name}`}
                            >
                              <span>
                                {task.assigned_to_name
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewAction(task)}
                        className="inline-flex items-center text-xs font-medium text-slate-700 hover:text-slate-900 gap-2 font-Gantari cursor-pointer"
                      >
                        Details
                        <img src={Arrow} alt="Arrow" className="w-2 h-2" />
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

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-8 relative border-b border-gray-100 pb-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 bg-[#F2F2F2] rounded-md text-gray-500 transition-colors cursor-pointer"
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
                <h3 className="absolute left-1/2 -translate-x-1/2 text-[24px] font-medium text-black">
                  Add New Task
                </h3>
                <div className="w-9" />
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="relative" ref={projectDropdownRef}>
                  <label className="block text-[16px] font-medium text-[#353535] mb-1">
                    Project Name
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFormDropdown(
                        openFormDropdown === "project" ? null : "project",
                      )
                    }
                    className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] flex items-center justify-between outline-none cursor-pointer"
                  >
                    <span
                      className={
                        createForm.project_id
                          ? "text-[#353535]"
                          : "text-[#8B8B8B]"
                      }
                    >
                      {projects.find(
                        (p) => p.id.toString() === createForm.project_id,
                      )?.project_name || "Select Project name"}
                    </span>
                    <img
                      src={ArrowDown}
                      alt="arrow"
                      className={`h-4 w-4 transition-transform ${openFormDropdown === "project" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFormDropdown === "project" && (
                    <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-md py-2 max-h-48 overflow-y-auto custom-scrollbar">
                      <button
                        type="button"
                        onClick={() => {
                          setCreateForm({ ...createForm, project_id: "" });
                          setOpenFormDropdown(null);
                        }}
                        className="block w-full text-left px-4 py-2 text-[14px] text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                      >
                        Select Project name
                      </button>
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setCreateForm({
                              ...createForm,
                              project_id: p.id.toString(),
                            });
                            setOpenFormDropdown(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-[14px] text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                        >
                          {p.project_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative" ref={moduleDropdownRef}>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Select Module
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFormDropdown(
                          openFormDropdown === "module" ? null : "module",
                        )
                      }
                      className="w-full px-3 py-2 bg-[#F2F3F4] rounded-md text-[14px] flex items-center justify-between outline-none cursor-pointer"
                    >
                      <span
                        className={
                          createForm.category
                            ? "text-[#353535]"
                            : "text-[#8B8B8B]"
                        }
                      >
                        {createForm.category || "Select Module"}
                      </span>
                      <img
                        src={ArrowDown}
                        alt="arrow"
                        className={`h-4 w-4 transition-transform ${openFormDropdown === "module" ? "rotate-180" : ""}`}
                      />
                    </button>
                    {openFormDropdown === "module" && (
                      <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-md py-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {["Select Module", "Module 1", "Module 2"].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setCreateForm({
                                ...createForm,
                                category: m === "Select Module" ? "" : m,
                              });
                              setOpenFormDropdown(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-[14px] text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Task Name
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={createForm.task_name}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            task_name: e.target.value,
                          })
                        }
                        placeholder="Enter Task / Select Task"
                        className="flex-1 px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-md text-[14px] focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        className="bg-[#E2E2E2] px-4 py-2 text-[14px] font-medium text-[#8B8B8B] rounded-r-md cursor-pointer"
                      >
                        Tasklist
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative" ref={typeDropdownRef}>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Type
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFormDropdown(
                          openFormDropdown === "type" ? null : "type",
                        )
                      }
                      className="w-full px-3 py-2 bg-[#F2F3F4] rounded-md text-[14px] flex items-center justify-between outline-none cursor-pointer"
                    >
                      <span
                        className={
                          createForm.priority
                            ? "text-[#353535]"
                            : "text-[#8B8B8B]"
                        }
                      >
                        {createForm.priority
                          ? createForm.priority.charAt(0).toUpperCase() +
                            createForm.priority.slice(1)
                          : "Select Type"}
                      </span>
                      <img
                        src={ArrowDown}
                        alt="arrow"
                        className={`h-4 w-4 transition-transform ${openFormDropdown === "type" ? "rotate-180" : ""}`}
                      />
                    </button>
                    {openFormDropdown === "type" && (
                      <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-md py-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {[
                          { value: "", label: "Select Type" },
                          { value: "task", label: "Task" },
                          { value: "bug", label: "Bug" },
                          { value: "feature", label: "Feature" },
                        ].map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => {
                              setCreateForm({
                                ...createForm,
                                priority: t.value,
                              });
                              setOpenFormDropdown(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-[14px] text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Actual Start Date
                    </label>
                    <input
                      type="date"
                      value={createForm.actual_start_date}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          actual_start_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-md text-[14px] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Actual End Date
                    </label>
                    <input
                      type="date"
                      value={createForm.actual_end_date}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          actual_end_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-md text-[14px] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Select Start Time
                    </label>
                    <input
                      type="time"
                      value={createForm.start_time}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          start_time: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-md text-[14px] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Select End Time
                    </label>
                    <input
                      type="time"
                      value={createForm.end_time}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          end_time: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-md text-[14px] focus:outline-none"
                    />
                  </div>
                  <div className="relative" ref={assignDropdownRef}>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Assign To
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFormDropdown(
                          openFormDropdown === "assignTo" ? null : "assignTo",
                        )
                      }
                      className="w-full px-3 py-2 bg-[#F2F3F4] rounded-md text-[14px] flex items-center justify-between outline-none cursor-pointer"
                    >
                      <span
                        className={
                          createForm.assigned_to
                            ? "text-[#353535]"
                            : "text-[#8B8B8B]"
                        }
                      >
                        {employees.find(
                          (emp) => emp.id.toString() === createForm.assigned_to,
                        )?.full_name || "Select Assign To"}
                      </span>
                      <img
                        src={ArrowDown}
                        alt="arrow"
                        className={`h-4 w-4 transition-transform ${openFormDropdown === "assignTo" ? "rotate-180" : ""}`}
                      />
                    </button>
                    {openFormDropdown === "assignTo" && (
                      <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-md py-2 max-h-48 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            setCreateForm({ ...createForm, assigned_to: "" });
                            setOpenFormDropdown(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-[14px] text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                        >
                          Select Assign To
                        </button>
                        {employees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setCreateForm({
                                ...createForm,
                                assigned_to: emp.id.toString(),
                              });
                              setOpenFormDropdown(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-[14px] text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                          >
                            {emp.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-[#353535] mb-1">
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Enter Description..."
                    className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-md text-[14px] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-[#353535] mb-1">
                    Checklist
                  </label>
                  <input
                    type="text"
                    value={createForm.checklist}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        checklist: e.target.value,
                      })
                    }
                    placeholder="Enter Reference Link"
                    className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-md text-[14px] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-[#353535] mb-1">
                    Attach File <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAttachmentChange}
                    id="task-attachments"
                  />
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value={
                        attachmentFiles.length > 0
                          ? `${attachmentFiles.length} file(s) total`
                          : ""
                      }
                      placeholder="Upload Files"
                      className="flex-1 px-3 py-2 bg-[#F2F3F4] text-[#101827] rounded-l-md text-[14px] focus:outline-none placeholder:text-[#8B8B8B]"
                    />
                    <label
                      htmlFor="task-attachments"
                      className="bg-[#E2E2E2] px-6 py-2 rounded-r-md text-[14px] font-medium text-[#8B8B8B] cursor-pointer "
                    >
                      Browse Files
                    </label>
                  </div>
                  {attachmentFiles.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {attachmentFiles.map((file, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between bg-[#F2F3F4] px-4 py-3 rounded-md text-[14px]"
                        >
                          <div className="flex flex-col overflow-hidden mr-4">
                            <span className="font-semibold text-[#353535] truncate">{file.name}</span>
                            <span className="text-xs text-[#8B8B8B] mt-0.5">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              type="button"
                              className="text-[#DD4342] hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center"
                              title="View"
                            >
                              <img src={viewIcon} alt="view" className="w-5 h-5 [filter:invert(32%)_sepia(98%)_saturate(3204%)_hue-rotate(338deg)_brightness(94%)_contrast(96%)]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAttachment(idx)}
                              className="text-[#353535] hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center"
                              title="Delete"
                            >
                              <img src={deleteIcon} alt="delete" className="w-5 h-5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex justify-center gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-md bg-[#F2F2F2] px-5 py-2 text-[14px] font-medium text-[#353535] cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="rounded-md bg-[#DBE9FE] px-5 py-2 text-[14px] font-medium text-[#101827] cursor-pointer"
                  >
                    {createSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-8 relative border-b border-gray-100 pb-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 bg-[#F2F2F2] rounded-md text-[#353535]cursor-pointer"
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
                <h3 className="absolute left-1/2 -translate-x-1/2 text-[24px] font-medium text-black">
                  Edit Task
                </h3>
                <div className="w-9" />
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="relative" ref={projectDropdownRef}>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    Project Name
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFormDropdown(
                        openFormDropdown === "editProject"
                          ? null
                          : "editProject",
                      )
                    }
                    className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] flex items-center justify-between outline-none cursor-pointer"
                  >
                    <span
                      className={
                        editForm.project_id
                          ? "text-[#353535]"
                          : "text-[#8B8B8B]"
                      }
                    >
                      {projects.find(
                        (p) => p.id.toString() === editForm.project_id,
                      )?.project_name || "Select Project name"}
                    </span>
                    <img
                      src={ArrowDown}
                      alt="arrow"
                      className={`h-4 w-4 transition-transform ${openFormDropdown === "editProject" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFormDropdown === "editProject" && (
                    <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded shadow-lg py-1 max-h-48 overflow-y-auto custom-scrollbar">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setEditForm({
                              ...editForm,
                              project_id: p.id.toString(),
                            });
                            setOpenFormDropdown(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-[14px] text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                        >
                          {p.project_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative" ref={moduleDropdownRef}>
                    <label className="block text-[16px] font-medium text-black mb-1">
                      Select Module
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFormDropdown(
                          openFormDropdown === "editModule"
                            ? null
                            : "editModule",
                        )
                      }
                      className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] flex items-center justify-between cursor-pointer"
                    >
                      <span
                        className={
                          editForm.category
                            ? "text-[#353535]"
                            : "text-[#8B8B8B]"
                        }
                      >
                        {editForm.category || "Select Module"}
                      </span>
                      <img
                        src={ArrowDown}
                        alt="arrow"
                        className={`h-4 w-4 transition-transform ${openFormDropdown === "editModule" ? "rotate-180" : ""}`}
                      />
                    </button>
                    {openFormDropdown === "editModule" && (
                      <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-md py-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {["Module 1", "Module 2"].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setEditForm({ ...editForm, category: m });
                              setOpenFormDropdown(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-[14px] text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-black mb-1">
                      Task Name
                    </label>
                    <input
                      type="text"
                      value={editForm.task_name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, task_name: e.target.value })
                      }
                      placeholder="Enter Task Name"
                      className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] text-[#353535] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative" ref={typeDropdownRef}>
                    <label className="block text-[16px] font-medium text-black mb-1">
                      Type
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFormDropdown(
                          openFormDropdown === "editType" ? null : "editType",
                        )
                      }
                      className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] flex items-center justify-between cursor-pointer"
                    >
                      <span
                        className={
                          editForm.priority
                            ? "text-[#353535]"
                            : "text-[#8B8B8B]"
                        }
                      >
                        {editForm.priority
                          ? editForm.priority.charAt(0).toUpperCase() +
                            editForm.priority.slice(1)
                          : "Select Type"}
                      </span>
                      <img
                        src={ArrowDown}
                        alt="arrow"
                        className={`h-4 w-4 transition-transform ${openFormDropdown === "editType" ? "rotate-180" : ""}`}
                      />
                    </button>
                    {openFormDropdown === "editType" && (
                      <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-md py-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {[
                          { value: "task", label: "Task" },
                          { value: "bug", label: "Bug" },
                          { value: "feature", label: "Feature" },
                        ].map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => {
                              setEditForm({ ...editForm, priority: t.value });
                              setOpenFormDropdown(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-[14px] text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-black mb-1">
                      Actual Start Date
                    </label>
                    <input
                      type="date"
                      value={editForm.actual_start_date}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          actual_start_date: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] text-[#353535] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-black mb-1">
                      Actual End Date
                    </label>
                    <input
                      type="date"
                      value={editForm.actual_end_date}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          actual_end_date: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] text-[#353535] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[16px] font-medium text-black mb-1">
                      Select Start Time
                    </label>
                    <input
                      type="time"
                      value={editForm.start_time}
                      onChange={(e) =>
                        setEditForm({ ...editForm, start_time: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] text-[#353535] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-black mb-1">
                      Select End Time
                    </label>
                    <input
                      type="time"
                      value={editForm.end_time}
                      onChange={(e) =>
                        setEditForm({ ...editForm, end_time: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] text-[#353535] focus:outline-none"
                    />
                  </div>
                  <div className="relative" ref={assignDropdownRef}>
                    <label className="block text-[16px] font-medium text-black mb-1">
                      Assign To
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFormDropdown(
                          openFormDropdown === "editAssignTo"
                            ? null
                            : "editAssignTo",
                        )
                      }
                      className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] flex items-center justify-between cursor-pointer"
                    >
                      <span
                        className={
                          editForm.assigned_to
                            ? "text-[#353535]"
                            : "text-[#8B8B8B]"
                        }
                      >
                        {employees.find(
                          (emp) => emp.id.toString() === editForm.assigned_to,
                        )?.full_name || "Select Assign To"}
                      </span>
                      <img
                        src={ArrowDown}
                        alt="arrow"
                        className={`h-4 w-4 transition-transform ${openFormDropdown === "editAssignTo" ? "rotate-180" : ""}`}
                      />
                    </button>
                    {openFormDropdown === "editAssignTo" && (
                      <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-md py-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {employees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setEditForm({
                                ...editForm,
                                assigned_to: emp.id.toString(),
                              });
                              setOpenFormDropdown(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-[14px] text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                          >
                            {emp.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={3}
                    placeholder="Enter Description..."
                    className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] text-[#353535] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    Checklist
                  </label>
                  <input
                    type="text"
                    value={editForm.checklist}
                    onChange={(e) =>
                      setEditForm({ ...editForm, checklist: e.target.value })
                    }
                    placeholder="Enter Reference Link"
                    className="w-full px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] text-[#353535] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    Attach File <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleEditAttachmentChange}
                    id="edit-task-attachments"
                  />
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value={
                        editAttachmentFiles.length > 0
                          ? `${editAttachmentFiles.length} file(s) total`
                          : ""
                      }
                      placeholder="Upload Files"
                      className="flex-1 px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] text-[#353535] focus:outline-none placeholder:text-[#8B8B8B]"
                    />
                    <label
                      htmlFor="edit-task-attachments"
                      className="bg-[#E2E2E2] px-6 py-2 rounded-r-md text-[14px] font-medium text-[#8B8B8B] cursor-pointer flex items-center justify-center"
                    >
                      Browse Files
                    </label>
                  </div>
                  {editAttachmentFiles.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {editAttachmentFiles.map((file, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between bg-[#F2F3F4] px-4 py-2 rounded-md text-[14px]"
                        >
                          <div className="flex flex-col overflow-hidden mr-4">
                            <span className="font-semibold text-[#353535] truncate">{file.name}</span>
                            <span className="text-xs text-[#8B8B8B] mt-0.5">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              type="button"
                              className="text-[#DD4342] hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center"
                              title="View"
                            >
                              <img src={viewIcon} alt="view" className="w-5 h-5 [filter:invert(32%)_sepia(98%)_saturate(3204%)_hue-rotate(338deg)_brightness(94%)_contrast(96%)]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteEditAttachment(idx)}
                              className="text-[#353535] hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center"
                              title="Delete"
                            >
                              <img src={deleteIcon} alt="delete" className="w-5 h-5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex justify-center gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="rounded-md bg-[#F2F2F2] px-5 py-2 text-[14px] font-medium text-[#353535] cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="rounded-md bg-[#DBE9FE] px-5 py-2 text-[14px] font-medium text-[#353535] cursor-pointer disabled:opacity-50"
                  >
                    {editSubmitting ? "Updating..." : "submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal logic continues here... */}

      {/* Delete Task Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mb-2 flex w-full">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTaskToDelete(null);
                }}
                className="flex items-center justify-center rounded-md bg-[#F2F2F2] p-2 text-black transition cursor-pointer"
              >
                <FiX className="h-5 w-5 text-black" />
              </button>
            </div>
            <div className="flex flex-col items-center">
              <h3 className="-mt-8 mb-6 text-[24px] font-medium text-black">
                Delete Task
              </h3>
              <p className="mb-8 text-center text-[#353535] text-[16px]">
                Are you sure, you want to Delete this?
              </p>
              <div className="flex w-full justify-center gap-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTaskToDelete(null);
                  }}
                  className="rounded-md bg-[#F2F2F2] px-5 py-2 text-[14px] font-medium text-[#353535] cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="rounded-md bg-[#FFECEC] px-5 py-2 text-[14px] font-semibold text-[#FF4A4A] cursor-pointer"
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
