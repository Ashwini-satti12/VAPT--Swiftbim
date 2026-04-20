import { FiX } from "react-icons/fi";
import backIcon from "../../../assets/TechnicalDirector/back icon.svg";
import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../../lib/api";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import Group1 from "../../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../../assets/ProjectManager/MyTask/Group3.svg";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";
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

function getTodayInputDate(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isEndTimeBeforeStartOnSameDay(
  startDate: string,
  endDate: string,
  startTime: string,
  dueTime: string,
): boolean {
  if (!startDate || !endDate || !startTime || !dueTime) return false;
  if (startDate !== endDate) return false;
  return dueTime < startTime;
}

// ─── FormDropdown (same as TeamtaskPMV) ─────────────────────────────────────

type FormDropdownId = "project" | "team" | "priority" | "assignTo" | null;

interface FormDropdownProps {
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

function FormDropdown({
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
        className="flex w-full items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-left text-sm text-black cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className={value ? "text-black" : "text-[#8B8B8B]"}>
          {displayLabel}
        </span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
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
                className="block w-full px-3 py-2 text-left text-sm text-[#8B8B8B] hover:text-[#353535] hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg cursor-pointer"
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function VendorBimLeadTeamTasks() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectFilter = searchParams.get("project");
  const statusFilter =
    searchParams.get("status") || searchParams.get("taskstatus");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Full-featured form (matching TeamtaskPMV)
  const emptyForm = {
    projectName: "",
    teamId: "",
    taskName: "",
    priority: "",
    actualStartDate: "",
    actualEndDate: "",
    startTime: "",
    dueTime: "",
    assignTo: "",
    description: "",
    checklist: "",
  };
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState(emptyForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editAttachmentFiles, setEditAttachmentFiles] = useState<File[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // FormDropdown state
  const [openFormDropdown, setOpenFormDropdown] =
    useState<FormDropdownId>(null);
  const formProjectTriggerRef = useRef<HTMLButtonElement>(null);
  const formProjectMenuRef = useRef<HTMLDivElement>(null);
  const formTeamTriggerRef = useRef<HTMLButtonElement>(null);
  const formTeamMenuRef = useRef<HTMLDivElement>(null);
  const formPriorityTriggerRef = useRef<HTMLButtonElement>(null);
  const formPriorityMenuRef = useRef<HTMLDivElement>(null);
  const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
  const formAssignMenuRef = useRef<HTMLDivElement>(null);

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

  const fetchData = () => {
    setLoading(true);
    const taskParams: Record<string, string> = { condition: "1" };
    if (statusFilter) taskParams.status = statusFilter;
    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", {
        params: taskParams,
      }),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
      api.get<{ employees?: Employee[] }>("/api/employees"),
      api.get<{ teams?: Team[] }>("/api/vendors/vendor-teams"),
    ])
      .then(([tasksRes, projectsRes, empRes, teamsRes]) => {
        const raw = tasksRes.data.tasks ?? [];
        const mapped = raw.map((t) => ({
          ...t,
          assigned_to_name: t.assigned_to_name ?? t.assigned_full_name,
          // Backend stores priority in `category`
          priority: (t as any).priority ?? (t as any).category ?? t.priority,
        }));
        setTasks(mapped);
        setProjects(projectsRes.data.projects ?? []);
        setEmployees(empRes.data.employees ?? []);
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

  // Click-outside for form dropdowns
  useEffect(() => {
    if (openFormDropdown === null) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      const refs: React.RefObject<HTMLElement | null>[] =
        openFormDropdown === "project"
          ? [formProjectTriggerRef, formProjectMenuRef]
          : openFormDropdown === "team"
            ? [formTeamTriggerRef, formTeamMenuRef]
            : openFormDropdown === "priority"
              ? [formPriorityTriggerRef, formPriorityMenuRef]
              : [formAssignTriggerRef, formAssignMenuRef];
      if (!refs.some((r) => r.current?.contains(target))) {
        setOpenFormDropdown(null);
      }
    };
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [openFormDropdown]);

  // Employees filtered by selected project members
  const employeesForAssignDropdown = useMemo(() => {
    const all = Array.isArray(employees) ? employees : [];
    const meta = projects.find(
      (p) => p.project_name === createForm.projectName,
    );
    const raw = (meta?.members || "").trim();
    if (!raw) return all;
    const tokens = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length === 0) return all;
    return all.filter((emp) => {
      const name = (emp.full_name || "").trim();
      const idStr = String(emp.id);
      return tokens.some((t) => {
        const tl = t.toLowerCase();
        return t === idStr || tl === name.toLowerCase() || name === t;
      });
    });
  }, [employees, projects, createForm.projectName]);

  const modalAssignOptions = employeesForAssignDropdown
    .filter(isEmployeeActiveForProjectAssignment)
    .filter((e) => (e.full_name || "").trim() !== "")
    .map((e) => ({ value: e.full_name, label: e.full_name }));

  const modalProjectOptions = projects.map((p) => ({
    value: p.project_name,
    label: p.project_name,
  }));

  const modalTeamOptions = teams.map((t) => ({
    value: String((t as any).team_id ?? t.id),
    label: t.team_name,
  }));

  const todayInputDate = getTodayInputDate();
  const sameCalendarDay =
    Boolean(createForm.actualStartDate) &&
    Boolean(createForm.actualEndDate) &&
    createForm.actualStartDate === createForm.actualEndDate;

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = input.files;
    if (!files?.length) return;
    const newFiles = Array.from(files);
    setAttachmentFiles((prev) => {
      const merged = [...prev];
      for (const f of newFiles) {
        if (!merged.some((x) => x.name === f.name && x.size === f.size))
          merged.push(f);
      }
      return merged;
    });
    input.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetAndClose = () => {
    setShowCreateModal(false);
    setCreateForm(emptyForm);
    setAttachmentFiles([]);
    setOpenFormDropdown(null);
  };

  const handleEditAttachmentChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    setEditAttachmentFiles((prev) => [...prev, ...files]);
  };

  const deleteEditAttachment = (index: number) => {
    setEditAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setEditSubmitting(true);

    const projectId = projects.find(
      (p) => p.project_name === editForm.projectName,
    )?.id;
    const assigneeId = employees.find(
      (emp) => emp.full_name === editForm.assignTo,
    )?.id;

    const payload = {
      task_name: editForm.taskName,
      description: editForm.description,
      status: selectedTask.status,
      category: editForm.priority || "Medium",
      due_date: editForm.actualEndDate || undefined,
      start_date: editForm.actualStartDate || undefined,
      start_time: editForm.startTime || undefined,
      end_time: editForm.dueTime || undefined,
      project_id: projectId || undefined,
      assigned_to: assigneeId || undefined,
      modules: editForm.teamId || undefined,
      checklist: editForm.checklist || undefined,
    };

    api
      .patch(`/api/vendors/vendor-tasks/${selectedTask.id}`, payload)
      .then(async () => {
        if (editAttachmentFiles.length > 0) {
          const formData = new FormData();
          editAttachmentFiles.forEach((f) => formData.append("image", f));
          await api
            .post(
              `/api/vendors/vendor-tasks/${selectedTask.id}/output-files`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            )
            .catch(() => toast.error("Failed to upload some attachments"));
        }
        setShowEditModal(false);
        toast.success("Task updated successfully");
        fetchData();
      })
      .catch(() => toast.error("Failed to update task"))
      .finally(() => setEditSubmitting(false));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      createForm.actualStartDate &&
      createForm.actualStartDate < todayInputDate
    ) {
      toast.error("Start date cannot be before today.");
      return;
    }
    if (createForm.actualEndDate && createForm.actualEndDate < todayInputDate) {
      toast.error("End date cannot be before today.");
      return;
    }
    if (
      isEndTimeBeforeStartOnSameDay(
        createForm.actualStartDate,
        createForm.actualEndDate,
        createForm.startTime,
        createForm.dueTime,
      )
    ) {
      toast.error(
        "End time must be the same as or after start time when both dates are the same.",
      );
      return;
    }

    setCreateSubmitting(true);

    const projectId =
      projects.find((p) => p.project_name === createForm.projectName)?.id ??
      null;
    const assigneeId = employees.find(
      (emp) => emp.full_name === createForm.assignTo,
    )?.id;
    const assignedToVal =
      assigneeId != null && !Number.isNaN(Number(assigneeId))
        ? assigneeId
        : createForm.assignTo;

    const payload = {
      task_name: createForm.taskName,
      description: createForm.description,
      status: "Todo",
      // Backend stores this in vendor_task.category
      category: createForm.priority || "Medium",
      due_date: createForm.actualEndDate,
      project_id: projectId ?? createForm.projectName,
      assigned_to: assignedToVal,
      // Store selected Team/Department in modules column
      modules: createForm.teamId || undefined,
      checklist: createForm.checklist,
      start_date: createForm.actualStartDate,
      start_time: createForm.startTime,
      due_time: createForm.dueTime,
    };

    api
      .post("/api/vendors/vendor-tasks", payload)
      .then((res) => {
        if (attachmentFiles.length > 0) {
          const taskId = res.data?.task_id ?? res.data?.id;
          if (taskId) {
            const formData = new FormData();
            attachmentFiles.forEach((f) => formData.append("image", f));
            api.post(
              `/api/vendors/vendor-tasks/${taskId}/output-files`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            );
          }
        }
        resetAndClose();
        fetchData();
        toast.success("Task created successfully.");
      })
      .catch(() => toast.error("Failed to create task."))
      .finally(() => setCreateSubmitting(false));
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

  const outlineEmployeeFilters = [
    "All Employees",
    ...new Set(tasks.map((t) => t.assigned_to_name).filter(Boolean)),
  ];
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] =
    useState("All Employees");

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus =
      !statusFilter ||
      normalizeStatus(t.status) === normalizeStatus(statusFilter);
    const matchesEmployee =
      selectedEmployeeFilter === "All Employees" ||
      t.assigned_to_name === selectedEmployeeFilter;
    const matchesProject = !projectFilter || t.project_name === projectFilter;
    return matchesStatus && matchesEmployee && matchesProject;
  });

  const baseFilteredTasks = tasks.filter((t) => {
    const matchesEmployee =
      selectedEmployeeFilter === "All Employees" ||
      t.assigned_to_name === selectedEmployeeFilter;
    const matchesProject = !projectFilter || t.project_name === projectFilter;
    return matchesEmployee && matchesProject;
  });

  const counts = {
    todo: baseFilteredTasks.filter((t) => normalizeStatus(t.status) === "todo")
      .length,
    in_progress: baseFilteredTasks.filter(
      (t) => normalizeStatus(t.status) === "in_progress",
    ).length,
    completed: baseFilteredTasks.filter(
      (t) => normalizeStatus(t.status) === "completed",
    ).length,
  };

  const displayedTasksByStatus = {
    todo: filteredTasks.filter((t) => normalizeStatus(t.status) === "todo"),
    in_progress: filteredTasks.filter(
      (t) => normalizeStatus(t.status) === "in_progress",
    ),
    completed: filteredTasks.filter(
      (t) => normalizeStatus(t.status) === "completed",
    ),
  };

  const handleMoveTask = (
    taskId: number,
    newBucket: "todo" | "in_progress" | "completed",
  ) => {
    const taskRow = tasks.find((t) => t.id === taskId);
    if (taskRow) {
      const current = normalizeStatus(taskRow.status);
      if (current === "completed" && newBucket !== "completed") {
        toast.error("Completed tasks cannot be moved.");
        return;
      }
      if (current === newBucket) return;
    }
    const statusMap = {
      todo: "Todo",
      in_progress: "InProgress",
      completed: "Completed",
    } as const;
    const apiStatus = statusMap[newBucket];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: apiStatus } : t)),
    );
    api
      .patch(`/api/vendors/vendor-tasks/${taskId}/status`, {
        status: apiStatus,
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
    const progress =
      status === "completed" &&
        task.assigned_to != null &&
        task.uploaderid != null &&
        String(task.assigned_to) !== String(task.uploaderid)
        ? 95
        : (task as any).progress ??
          (status === "todo" ? 0 : status === "in_progress" ? 50 : 100);
    const isUnderReview =
      status === "completed" &&
      task.assigned_to != null &&
      task.uploaderid != null &&
      String(task.assigned_to) !== String(task.uploaderid);
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
                    setSelectedTask(task);
                    setEditForm({
                      projectName: task.project_name || "",
                      teamId: task.modules || "",
                      taskName: task.task_name,
                      priority: task.priority || "",
                      actualStartDate: (task as any).start_date || "",
                      actualEndDate: task.due_date || "",
                      startTime: (task as any).start_time || "",
                      dueTime: (task as any).end_time || "",
                      assignTo: task.assigned_to_name || "",
                      description: task.description || "",
                      checklist: (task as any).checklist || "",
                    });
                    setEditAttachmentFiles([]);
                    setShowEditModal(true);
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
          <span className="text-xs font-medium text-[#8B8B8B]">
            {isUnderReview ? "95% (Under Review)" : `${progress}%`}
          </span>
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
              className="w-2.5 h-2.5 transition-all duration-200 group-hover:brightness-0"
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
      {!showCreateModal && !showEditModal && (
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
              onClick={() => setShowCreateModal(true)}
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
      )}

      {/* ── Edit Task Page ────────────────────────────────────────── */}
      {showEditModal && (
      <div className="flex-1 min-h-0 px-5 py-2 bg-white overflow-y-auto custom-scrollbar font-Gantari">
        <div className="max-w-[1174px] mx-auto flex flex-col">
          {/* Header with back button + tooltip */}
          <div className="flex items-center justify-between mb-8 sm:mb-10 relative flex-shrink-0">
            <div className="group relative inline-flex shrink-0">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-md bg-[#F2F2F2] text-[#1A1A1A] transition-all cursor-pointer"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
              </button>
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-2 py-0.5 relative z-10">
                  <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                    Go Back
                  </span>
                </div>
              </div>
            </div>
            <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
              Edit Task
            </h3>
            <div className="w-10" />
          </div>

            {/* Form */}
            <form
              className="max-w-4xl mx-auto w-full pb-10"
              onSubmit={handleUpdate}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project */}
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                    Project
                  </label>
                  <FormDropdown
                    label="Select Project"
                    options={[
                      { value: "", label: "Select Project" },
                      ...modalProjectOptions,
                    ]}
                    value={editForm.projectName}
                    onChange={(v) =>
                      setEditForm((f) => ({
                        ...f,
                        projectName: v,
                        assignTo: "",
                      }))
                    }
                    isOpen={openFormDropdown === "project"}
                    onToggle={() =>
                      setOpenFormDropdown((d) =>
                        d === "project" ? null : "project",
                      )
                    }
                    onClose={() => setOpenFormDropdown(null)}
                    triggerRef={formProjectTriggerRef}
                    dropdownRef={formProjectMenuRef}
                  />
                </div>

                {/* Team/Department */}
                <div>
                  <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                    Team/Department
                  </label>
                  <FormDropdown
                    label="Select Team"
                    options={[
                      { value: "", label: "Select Team" },
                      ...modalTeamOptions,
                    ]}
                    value={editForm.teamId}
                    onChange={(v) => setEditForm((f) => ({ ...f, teamId: v }))}
                    isOpen={openFormDropdown === "team"}
                    onToggle={() =>
                      setOpenFormDropdown((d) => (d === "team" ? null : "team"))
                    }
                    onClose={() => setOpenFormDropdown(null)}
                    triggerRef={formTeamTriggerRef}
                    dropdownRef={formTeamMenuRef}
                  />
                </div>

                {/* Task Name */}
                <div>
                  <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                    Task Name<span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      required
                      value={editForm.taskName}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          taskName: e.target.value,
                        }))
                      }
                      placeholder="Enter task name"
                      className="flex-1 rounded-l-md rounded-r-none bg-[#F2F3F4] px-3 py-2 text-[14px] text-black focus:outline-none"
                    />
                    <button
                      type="button"
                      className="rounded-l-none rounded-r-md bg-[#E2E2E2] px-4 py-2 text-[14px] font-medium text-[#8B8B8B]cursor-pointer"
                    >
                      Tasklist
                    </button>
                  </div>
                </div>

                {/* Priority | Actual Start Date | Actual End Date */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                      Priority
                    </label>
                    <FormDropdown
                      label="Select Priority"
                      options={[
                        { value: "", label: "Priority" },
                        { value: "Low", label: "Low" },
                        { value: "Medium", label: "Medium" },
                        { value: "High", label: "High" },
                        { value: "Urgent", label: "Urgent" },
                      ]}
                      value={editForm.priority}
                      onChange={(v) =>
                        setEditForm((f) => ({
                          ...f,
                          priority: v,
                        }))
                      }
                      isOpen={openFormDropdown === "priority"}
                      onToggle={() =>
                        setOpenFormDropdown((d) =>
                          d === "priority" ? null : "priority",
                        )
                      }
                      onClose={() => setOpenFormDropdown(null)}
                      triggerRef={formPriorityTriggerRef}
                      dropdownRef={formPriorityMenuRef}
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                       Start Date
                    </label>
                    <input
                      type="date"
                      value={editForm.actualStartDate}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          actualStartDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                       End Date
                    </label>
                    <input
                      type="date"
                      value={editForm.actualEndDate}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          actualEndDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-black focus:outline-none"
                    />
                  </div>
                </div>

                {/* Select Start Time | Select Due Time | Assign To */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                      Select Start Time
                    </label>
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          startTime: e.target.value,
                        }))
                      }
                      className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                      Select Due Time
                    </label>
                    <input
                      type="time"
                      value={editForm.dueTime}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, dueTime: e.target.value }))
                      }
                      className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                      Assign To
                    </label>
                    <FormDropdown
                      label="Select Assign To"
                      options={[
                        { value: "", label: "Select Assign To" },
                        ...modalAssignOptions,
                      ]}
                      value={editForm.assignTo}
                      onChange={(v) =>
                        setEditForm((f) => ({
                          ...f,
                          assignTo: v,
                        }))
                      }
                      isOpen={openFormDropdown === "assignTo"}
                      onToggle={() =>
                        setOpenFormDropdown((d) =>
                          d === "assignTo" ? null : "assignTo",
                        )
                      }
                      onClose={() => setOpenFormDropdown(null)}
                      triggerRef={formAssignTriggerRef}
                      dropdownRef={formAssignMenuRef}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter Description..."
                    rows={3}
                    className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-black focus:outline-none"
                  />
                </div>

                {/* Checklist */}
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                    Checklist
                  </label>
                  <input
                    type="text"
                    value={editForm.checklist}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        checklist: e.target.value,
                      }))
                    }
                    placeholder="Enter Reference Link"
                    className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                  />
                </div>

                {/* Attachments */}
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-[#3535335] mb-1">
                    Attachments
                  </label>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    id="edit-task-attachments"
                    onChange={handleEditAttachmentChange}
                  />
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value={
                        editAttachmentFiles.length > 0
                          ? `${editAttachmentFiles.length} file(s) selected`
                          : ""
                      }
                      placeholder="Upload Files"
                      className="flex-1 rounded-l-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#101827] focus:outline-none placeholder:text-[#8B8B8B]"
                    />
                    <label
                      htmlFor="edit-task-attachments"
                      className="rounded-r-sm bg-[#E2E2E2] px-6 py-2 text-[14px] font-medium text-[#353535] cursor-pointer"
                    >
                      Browse File
                    </label>
                  </div>
                  {editAttachmentFiles.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {editAttachmentFiles.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center justify-between rounded-md bg-[#F2F3F4] px-5 py-2 text-[14px] text-black"
                        >
                          <span className="truncate max-w-[200px]">
                            {f.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteEditAttachment(i)}
                            className="ml-2 shrink-0 p-0.5 rounded text-black hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                            aria-label={`Remove ${f.name}`}
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-center gap-3 mt-6 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-md bg-[#F2F2F2] px-5 py-2 text-[14px] font-medium text-[#353535]  cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-md px-5 py-2 text-[14px] font-medium text-[#101827] bg-[#DBE9FE] disabled:opacity-50 cursor-pointer"
                >
                  {editSubmitting ? "Updating..." : "Update Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Task Page ─────────────────────────────── */}
      {showCreateModal && (
      <div className="flex-1 min-h-0 px-5 py-4 bg-white overflow-y-auto custom-scrollbar font-Gantari">
        <div className="max-w-[1174px] mx-auto flex flex-col">
          {/* Header with back button + tooltip */}
          <div className="flex items-center justify-between mb-8 sm:mb-10 relative flex-shrink-0">
            <div className="group relative inline-flex shrink-0">
              <button
                type="button"
                onClick={resetAndClose}
                className="p-2 rounded-md bg-[#F2F2F2] text-[#1A1A1A] transition-all cursor-pointer"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
              </button>
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-2 py-0.5 relative z-10">
                  <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                    Go Back
                  </span>
                </div>
              </div>
            </div>
            <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
              Add New Task
            </h3>
            <div className="w-10" />
          </div>

            {/* Form */}
            <form
              className="max-w-4xl mx-auto w-full pb-10"
              onSubmit={handleCreate}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project – full width */}
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-black mb-1">
                    Project
                  </label>
                  <FormDropdown
                    label="Select Project"
                    options={[
                      { value: "", label: "Select Project" },
                      ...modalProjectOptions,
                    ]}
                    value={createForm.projectName}
                    onChange={(v) =>
                      setCreateForm((f) => ({
                        ...f,
                        projectName: v,
                        assignTo: "",
                      }))
                    }
                    isOpen={openFormDropdown === "project"}
                    onToggle={() =>
                      setOpenFormDropdown((d) =>
                        d === "project" ? null : "project",
                      )
                    }
                    onClose={() => setOpenFormDropdown(null)}
                    triggerRef={formProjectTriggerRef}
                    dropdownRef={formProjectMenuRef}
                  />
                </div>

                {/* Team/Department */}
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    Team/Department
                  </label>
                  <FormDropdown
                    label="Select Team"
                    options={[
                      { value: "", label: "Select Team" },
                      ...modalTeamOptions,
                    ]}
                    value={createForm.teamId}
                    onChange={(v) =>
                      setCreateForm((f) => ({ ...f, teamId: v }))
                    }
                    isOpen={openFormDropdown === "team"}
                    onToggle={() =>
                      setOpenFormDropdown((d) => (d === "team" ? null : "team"))
                    }
                    onClose={() => setOpenFormDropdown(null)}
                    triggerRef={formTeamTriggerRef}
                    dropdownRef={formTeamMenuRef}
                  />
                </div>

                {/* Task Name */}
                <div>
                  <label className="block text-[16px] font-medium text-[#353535] mb-1">
                    Task Name
                    <span className="text-[#FF0000]">*</span>
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      required
                      value={createForm.taskName}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          taskName: e.target.value,
                        }))
                      }
                      placeholder="Enter task name"
                      className="flex-1 rounded-l-md rounded-r-none bg-[#F2F3F4] px-3 py-2 text-[14px] text-black focus:outline-none"
                    />
                    <button
                      type="button"
                      className="rounded-l-none rounded-r-md bg-[#E2E2E2] px-4 py-2 text-[14px] font-medium text-[#8B8B8B] cursor-pointer"
                    >
                      Tasklist
                    </button>
                  </div>
                </div>

                {/* Priority | Actual Start Date | Actual End Date */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Priority
                    </label>
                    <FormDropdown
                      label="Select Type"
                      options={[
                        { value: "", label: "Priority" },
                        { value: "Low", label: "Low" },
                        { value: "Medium", label: "Medium" },
                        { value: "High", label: "High" },
                        { value: "Urgent", label: "Urgent" },
                      ]}
                      value={createForm.priority}
                      onChange={(v) =>
                        setCreateForm((f) => ({
                          ...f,
                          priority: v,
                        }))
                      }
                      isOpen={openFormDropdown === "priority"}
                      onToggle={() =>
                        setOpenFormDropdown((d) =>
                          d === "priority" ? null : "priority",
                        )
                      }
                      onClose={() => setOpenFormDropdown(null)}
                      triggerRef={formPriorityTriggerRef}
                      dropdownRef={formPriorityMenuRef}
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                       Start Date
                    </label>
                    <input
                      type="date"
                      min={todayInputDate}
                      value={createForm.actualStartDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCreateForm((f) => {
                          const next = {
                            ...f,
                            actualStartDate: v,
                          };
                          if (f.actualEndDate && v && f.actualEndDate < v) {
                            next.actualEndDate = v;
                          }
                          return next;
                        });
                      }}
                      placeholder="dd/mm/yyyy"
                      className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                       End Date
                    </label>
                    <input
                      type="date"
                      min={createForm.actualStartDate || todayInputDate}
                      value={createForm.actualEndDate}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          actualEndDate: e.target.value,
                        }))
                      }
                      placeholder="dd/mm/yyyy"
                      className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-black focus:outline-none"
                    />
                  </div>
                </div>

                {/* Select Start Time | Select Due Time | Assign To */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Select Start Time
                    </label>
                    <input
                      type="time"
                      value={createForm.startTime}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCreateForm((f) => {
                          const next = { ...f, startTime: v };
                          const same =
                            f.actualStartDate &&
                            f.actualEndDate &&
                            f.actualStartDate === f.actualEndDate;
                          if (same && f.dueTime && v && f.dueTime < v) {
                            next.dueTime = v;
                          }
                          return next;
                        });
                      }}
                      placeholder="hh:mm"
                      className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Select Due Time
                    </label>
                    <input
                      type="time"
                      min={
                        sameCalendarDay && createForm.startTime
                          ? createForm.startTime
                          : undefined
                      }
                      value={createForm.dueTime}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          dueTime: e.target.value,
                        }))
                      }
                      placeholder="hh:mm"
                      className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#353535] mb-1">
                      Assign To
                    </label>
                    <FormDropdown
                      label="Select Assign To"
                      options={[
                        {
                          value: "",
                          label: "Select Assign To",
                        },
                        ...modalAssignOptions,
                      ]}
                      value={createForm.assignTo}
                      onChange={(v) =>
                        setCreateForm((f) => ({
                          ...f,
                          assignTo: v,
                        }))
                      }
                      isOpen={openFormDropdown === "assignTo"}
                      onToggle={() =>
                        setOpenFormDropdown((d) =>
                          d === "assignTo" ? null : "assignTo",
                        )
                      }
                      onClose={() => setOpenFormDropdown(null)}
                      triggerRef={formAssignTriggerRef}
                      dropdownRef={formAssignMenuRef}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-[#353535] mb-1">
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter Description..."
                    rows={3}
                    className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none"
                  />
                </div>

                {/* Checklist */}
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-[#353535] mb-1">
                    Checklist
                  </label>
                  <input
                    type="text"
                    value={createForm.checklist}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        checklist: e.target.value,
                      }))
                    }
                    placeholder="Enter Reference Link"
                    className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none"
                  />
                </div>

                {/* Attachments */}
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-[#353535] mb-1">
                    Attachments
                  </label>
                  <input
                    ref={fileInputRef}
                    id="bl-add-task-file-input"
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleAttachmentChange}
                    accept="*/*"
                  />
                  <div className="flex flex-wrap gap-2">
                    <div className="flex flex-1 min-w-0">
                      <input
                        type="text"
                        readOnly
                        value={
                          attachmentFiles.length > 0
                            ? `${attachmentFiles.length} file(s) selected`
                            : ""
                        }
                        placeholder="Upload Files"
                        className="flex-1 rounded-l-md rounded-r-none bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] placeholder:text-[#8B8B8B] focus:outline-none truncate"
                        title={
                          attachmentFiles.length > 0
                            ? attachmentFiles.map((f) => f.name).join(", ")
                            : undefined
                        }
                      />
                      <label
                        htmlFor="bl-add-task-file-input"
                        className="rounded-r-md rounded-l-none bg-[#E2E2E2] px-4 py-2 text-[14px] font-medium text-[#8B8B8B] cursor-pointer inline-flex items-center"
                      >
                        Browse File
                      </label>
                    </div>
                  </div>
                  {attachmentFiles.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {attachmentFiles.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535]"
                        >
                          <span className="truncate min-w-0" title={file.name}>
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="ml-2 shrink-0 p-0.5 rounded text-black cursor-pointer"
                            aria-label={`Remove ${file.name}`}
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-center gap-3 mt-6 pt-4">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="rounded-md bg-[#F2F2F2] px-5 py-2 text-[14px] font-medium text-[#353535] cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="rounded-md bg-[#DBE9FE] px-5 py-2 text-[14px] font-medium text-[#101827] disabled:opacity-50 cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
  
