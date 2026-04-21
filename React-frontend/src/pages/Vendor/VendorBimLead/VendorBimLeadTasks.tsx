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
import backIcon from "../../../assets/TechnicalDirector/back icon.svg";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";
import { FiX } from "react-icons/fi";

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
  category?: string;
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

const emptyTaskForm = {
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
};

export default function VendorBimLeadTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState("Show Entries");
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);

  // Page navigation: list | add | edit
  const [currentPage, setCurrentPage] = useState<"list" | "add" | "edit">("list");

  const [createForm, setCreateForm] = useState({ ...emptyTaskForm });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [openFormDropdown, setOpenFormDropdown] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const navigate = useNavigate();

  const [editForm, setEditForm] = useState({ ...emptyTaskForm });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editAttachmentFiles, setEditAttachmentFiles] = useState<File[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const showDropdownRef = useRef<HTMLDivElement>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const moduleDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const assignDropdownRef = useRef<HTMLDivElement>(null);

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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close form dropdowns on outside click
  useEffect(() => {
    if (!openFormDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const refs = [
        projectDropdownRef,
        moduleDropdownRef,
        typeDropdownRef,
        assignDropdownRef,
      ];
      const inside = refs.some(
        (r) => r.current && r.current.contains(e.target as Node),
      );
      if (!inside) setOpenFormDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openFormDropdown]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    const form = createForm;
    const payload = {
      task_name: form.task_name,
      description: form.description,
      status: form.status === "To Do" ? "Todo" : form.status,
      category: form.priority || "Medium",
      due_date: form.actual_end_date || undefined,
      start_date: form.actual_start_date || undefined,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
      project_id: form.project_id ? Number(form.project_id) : undefined,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
      modules: form.category || undefined,
      checklist: form.checklist || undefined,
    };

    api
      .post("/api/vendors/vendor-tasks", payload)
      .then((res) => {
        if (!res.data?.success) {
          toast.error(
            (res.data as { message?: string })?.message ||
              "Failed to create task",
          );
          return;
        }
        const taskId = res.data?.task_id ?? res.data?.id;
        toast.success("Task created successfully");
        setCurrentPage("list");
        setAttachmentFiles([]);
        setCreateForm({ ...emptyTaskForm });
        if (taskId && attachmentFiles.length > 0) {
          const formData = new FormData();
          attachmentFiles.forEach((f) => {
            formData.append("image", f);
            formData.append("image[]", f);
          });
          api
            .post(
              `/api/vendors/vendor-tasks/${taskId}/output-files`,
              formData,
              { headers: { "Content-Type": "multipart/form-data" } },
            )
            .catch(() => toast.error("Failed to upload attachments"));
        }
        fetchTasks();
      })
      .catch(() => {
        toast.error("Failed to create task");
      })
      .finally(() => setCreateSubmitting(false));
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
          editAttachmentFiles.forEach((f) => {
            formData.append("image", f);
            formData.append("image[]", f);
          });
          api
            .post(
              `/api/vendors/vendor-tasks/${selectedTask.id}/output-files`,
              formData,
              { headers: { "Content-Type": "multipart/form-data" } },
            )
            .catch((err) => console.error("Attachment upload failed", err));
        }
        setCurrentPage("list");
        toast.success("Task updated successfully");
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
  ): "todo" | "in_progress" | "completed" => {
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
        fetchTasks();
      });
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

  // ─── ADD / EDIT FORM PAGE ────────────────────────────────────────────────────
  if (currentPage === "add" || currentPage === "edit") {
    const isEdit = currentPage === "edit";
    const form = isEdit ? editForm : createForm;
    const setForm = isEdit
      ? (vals: typeof editForm) => setEditForm(vals)
      : (vals: typeof createForm) => setCreateForm(vals);
    const attachments = isEdit ? editAttachmentFiles : attachmentFiles;
    const deleteAtt = isEdit ? deleteEditAttachment : deleteAttachment;

    return (
      <div className="flex-1 min-h-0 px-5 py-4 bg-white overflow-y-auto custom-scrollbar">
        <div className="max-w-[1174px] mx-auto flex flex-col">
          {/* Header with back button + tooltip */}
          <div className="flex items-center justify-between mb-8 sm:mb-10 relative flex-shrink-0">
            <div className="group relative inline-flex shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage("list");
                  setOpenFormDropdown(null);
                }}
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
              {isEdit ? "Edit Task" : "Add New Task"}
            </h3>
            <div className="w-10" />
          </div>

          {/* Form */}
          <form
            onSubmit={isEdit ? handleUpdate : handleCreate}
            className="space-y-6 max-w-4xl mx-auto w-full pb-10"
          >
            {/* Project Name */}
            <div>
              <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                Project Name <span className="text-[#DD4342]">*</span>
              </label>
              <div className="relative" ref={projectDropdownRef}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenFormDropdown(
                      openFormDropdown === "project" ? null : "project",
                    )
                  }
                  className="w-full px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] flex items-center justify-between outline-none cursor-pointer min-h-[42px] border border-transparent focus:border-[#AEACAC52] transition-colors"
                >
                  <span
                    className={
                      form.project_id ? "text-[#353535]" : "text-[#8B8B8B]"
                    }
                  >
                    {projects.find((p) => p.id.toString() === form.project_id)
                      ?.project_name || "Select Project name"}
                  </span>
                  <img
                    src={ArrowDown}
                    alt="arrow"
                    className={`h-3 w-3 transition-transform ${openFormDropdown === "project" ? "rotate-180" : ""}`}
                  />
                </button>
                {openFormDropdown === "project" && (
                  <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-[#E0E0E0] rounded-md py-1 max-h-48 overflow-y-auto custom-scrollbar shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ ...form, project_id: "" });
                        setOpenFormDropdown(null);
                      }}
                      className="block w-full text-left px-4 py-2 text-[14px] font-Gantari text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] cursor-pointer"
                    >
                      Select Project name
                    </button>
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, project_id: p.id.toString() });
                          setOpenFormDropdown(null);
                        }}
                        className="block w-full text-left px-4 py-2 text-[14px] font-Gantari text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] cursor-pointer"
                      >
                        {p.project_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Module + Task Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Select Module <span className="text-[#DD4342]">*</span>
                </label>
                <div className="relative" ref={moduleDropdownRef}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFormDropdown(
                        openFormDropdown === "module" ? null : "module",
                      )
                    }
                    className="w-full px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] flex items-center justify-between outline-none cursor-pointer min-h-[42px] border border-transparent focus:border-[#AEACAC52] transition-colors"
                  >
                    <span
                      className={
                        form.category ? "text-[#353535]" : "text-[#8B8B8B]"
                      }
                    >
                      {form.category || "Select Module"}
                    </span>
                    <img
                      src={ArrowDown}
                      alt="arrow"
                      className={`h-3 w-3 transition-transform ${openFormDropdown === "module" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFormDropdown === "module" && (
                    <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-[#E0E0E0] rounded-md py-1 max-h-48 overflow-y-auto custom-scrollbar shadow-lg">
                      {["Module 1", "Module 2"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, category: m });
                            setOpenFormDropdown(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-[14px] font-Gantari text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] cursor-pointer"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Task Name <span className="text-[#DD4342]">*</span>
                </label>
                <div className="relative flex min-h-[42px] items-stretch overflow-hidden rounded-[5px] border border-transparent bg-[#F2F3F4] transition-colors focus-within:border-[#AEACAC52]">
                  <input
                    type="text"
                    value={form.task_name}
                    onChange={(e) =>
                      setForm({ ...form, task_name: e.target.value })
                    }
                    placeholder="Enter Task / Select Task"
                    className="min-w-0 flex-1 border-0 bg-transparent px-4 py-2 text-[14px] font-Gantari text-[#353535] outline-none placeholder:font-normal placeholder:text-[14px] placeholder-[#8B8B8B]"
                    required
                  />
                  {/* <button
                    type="button"
                    className="inline-flex h-full min-h-[40px] w-auto shrink-0 items-center justify-between gap-2 border-0 border-l border-[#E0E0E0] bg-[#E2E2E2] px-4 py-2 text-[14px] font-Gantari text-[#8B8B8B] cursor-pointer"
                  >
                    Tasklist
                  </button> */}
                </div>
              </div>
            </div>

            {/* Type + Start Date + End Date */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6">
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Type <span className="text-[#DD4342]">*</span>
                </label>
                <div className="relative" ref={typeDropdownRef}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFormDropdown(
                        openFormDropdown === "type" ? null : "type",
                      )
                    }
                    className="w-full px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] flex items-center justify-between outline-none cursor-pointer min-h-[42px] border border-transparent focus:border-[#AEACAC52] transition-colors"
                  >
                    <span
                      className={
                        form.priority ? "text-[#353535]" : "text-[#8B8B8B]"
                      }
                    >
                      {form.priority
                        ? form.priority.charAt(0).toUpperCase() +
                          form.priority.slice(1)
                        : "Select Type"}
                    </span>
                    <img
                      src={ArrowDown}
                      alt="arrow"
                      className={`h-3 w-3 transition-transform ${openFormDropdown === "type" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFormDropdown === "type" && (
                    <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-[#E0E0E0] rounded-md py-1 max-h-48 overflow-y-auto custom-scrollbar shadow-lg">
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
                            setForm({ ...form, priority: t.value });
                            setOpenFormDropdown(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-[14px] font-Gantari text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] cursor-pointer"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Start Date <span className="text-[#DD4342]">*</span>
                </label>
                <input
                  type="date"
                  value={form.actual_start_date}
                  onChange={(e) =>
                    setForm({ ...form, actual_start_date: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#F2F3F4] text-[#353535] rounded-[5px] text-[14px] focus:outline-none min-h-[42px] border border-transparent focus:border-[#AEACAC52] transition-colors font-Gantari"
                />
              </div>

              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  End Date <span className="text-[#DD4342]">*</span>
                </label>
                <input
                  type="date"
                  value={form.actual_end_date}
                  onChange={(e) =>
                    setForm({ ...form, actual_end_date: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#F2F3F4] text-[#353535] rounded-[5px] text-[14px] focus:outline-none min-h-[42px] border border-transparent focus:border-[#AEACAC52] transition-colors font-Gantari"
                />
              </div>
            </div> */}

            {/* Start Time + End Time + Assign To */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6">
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Select Start Time <span className="text-[#DD4342]">*</span>
                </label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) =>
                    setForm({ ...form, start_time: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#F2F3F4] text-[#353535] rounded-[5px] text-[14px] focus:outline-none min-h-[42px] border border-transparent focus:border-[#AEACAC52] transition-colors font-Gantari"
                />
              </div>

              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Select End Time <span className="text-[#DD4342]">*</span>
                </label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) =>
                    setForm({ ...form, end_time: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#F2F3F4] text-[#353535] rounded-[5px] text-[14px] focus:outline-none min-h-[42px] border border-transparent focus:border-[#AEACAC52] transition-colors font-Gantari"
                />
              </div>

              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Assign To <span className="text-[#DD4342]">*</span>
                </label>
                <div className="relative" ref={assignDropdownRef}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFormDropdown(
                        openFormDropdown === "assignTo" ? null : "assignTo",
                      )
                    }
                    className="w-full px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] flex items-center justify-between outline-none cursor-pointer min-h-[42px] border border-transparent focus:border-[#AEACAC52] transition-colors"
                  >
                    <span
                      className={
                        form.assigned_to ? "text-[#353535]" : "text-[#8B8B8B]"
                      }
                    >
                      {employees.find(
                        (emp) => emp.id.toString() === form.assigned_to,
                      )?.full_name || "Select Assign To"}
                    </span>
                    <img
                      src={ArrowDown}
                      alt="arrow"
                      className={`h-3 w-3 transition-transform ${openFormDropdown === "assignTo" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFormDropdown === "assignTo" && (
                    <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-[#E0E0E0] rounded-md py-1 max-h-48 overflow-y-auto custom-scrollbar shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, assigned_to: "" });
                          setOpenFormDropdown(null);
                        }}
                        className="block w-full text-left px-4 py-2 text-[14px] font-Gantari text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] cursor-pointer"
                      >
                        Select Assign To
                      </button>
                      {employees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setForm({
                              ...form,
                              assigned_to: emp.id.toString(),
                            });
                            setOpenFormDropdown(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-[14px] font-Gantari text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] cursor-pointer"
                        >
                          {emp.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                Description <span className="text-[#DD4342]">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
                placeholder="Enter Description..."
                className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder:font-normal placeholder:text-[14px] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
              />
            </div>

            {/* Checklist */}
            <div>
              <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                Checklist
              </label>
              <input
                type="text"
                value={form.checklist}
                onChange={(e) =>
                  setForm({ ...form, checklist: e.target.value })
                }
                placeholder="Enter Reference Link"
                className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder:font-normal placeholder:text-[14px] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] min-h-[42px]"
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                Attach File
              </label>
              <input
                ref={isEdit ? editFileInputRef : fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={
                  isEdit ? handleEditAttachmentChange : handleAttachmentChange
                }
                id="vbl-task-attachments"
              />
              <div className="flex items-center bg-[#F2F3F4] rounded-[5px] overflow-hidden min-h-[42px]">
                <div className="flex-1 px-4 text-[14px] text-[#979797] truncate min-w-0 py-2 font-Gantari">
                  {attachments.length > 0
                    ? `${attachments.length} file(s) attached`
                    : "Choose file"}
                </div>
                <label
                  htmlFor="vbl-task-attachments"
                  className="bg-[#E2E2E2] px-6 py-2 text-[14px] font-Gantari font-medium text-[#8B8B8B] cursor-pointer flex items-center justify-center border-l border-gray-300 whitespace-nowrap"
                >
                  Browse Files
                </label>
              </div>
              {attachments.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {attachments.map((file, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#101827]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-slate-500">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span
                            className="truncate block font-medium text-[#353535]"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                          <span className="text-xs text-[#8B8B8B]">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          title="View"
                        >
                          <img
                            src={viewIcon}
                            alt="view"
                            className="w-5 h-5 [filter:invert(32%)_sepia(98%)_saturate(3204%)_hue-rotate(338deg)_brightness(94%)_contrast(96%)]"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAtt(idx)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          title="Delete"
                        >
                          <img
                            src={deleteIcon}
                            alt="delete"
                            className="w-5 h-5"
                          />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <button
                type="button"
                onClick={() => setCurrentPage("list")}
                className="w-full sm:w-auto px-5 md:px-5 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-Gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isEdit ? editSubmitting : createSubmitting}
                className="w-full sm:w-auto px-5 md:px-5 py-2 rounded-md bg-[#DBE9FE] text-[#101827] font-Gantari font-semibold text-[14px] transition-all cursor-pointer disabled:opacity-50"
              >
                {isEdit
                  ? editSubmitting
                    ? "Updating..."
                    : "Submit"
                  : createSubmitting
                    ? "Submitting..."
                    : "Submit"}
              </button>
            </div>
          </form>
        </div>
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
                setCreateForm({ ...emptyTaskForm });
                setAttachmentFiles([]);
                setCurrentPage("add");
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
                const progress =
                  normalizeStatus(task.status) === "todo"
                    ? 0
                    : normalizeStatus(task.status) === "in_progress"
                      ? 50
                      : task.assigned_to != null &&
                          task.uploaderid != null &&
                          String(task.assigned_to) !== String(task.uploaderid)
                        ? task.Approval?.toLowerCase() === "approved"
                          ? 100
                          : 95
                        : 100;
                const isUnderReview =
                  normalizeStatus(task.status) === "completed" &&
                  task.assigned_to != null &&
                  task.uploaderid != null &&
                  String(task.assigned_to) !== String(task.uploaderid);
                const isCompletedCol =
                  normalizeStatus(task.status) === "completed";
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
                                      project_id:
                                        task.project_id?.toString() || "",
                                      assigned_to:
                                        task.assigned_to?.toString() || "",
                                      category: task.category || "",
                                      actual_start_date:
                                        (task as any).start_date || "",
                                      actual_end_date: task.due_date || "",
                                      checklist:
                                        (task as any).checklist || "",
                                      start_time:
                                        (task as any).start_time || "",
                                      end_time: (task as any).end_time || "",
                                    });
                                    setEditAttachmentFiles([]);
                                    setOpenMenuTaskId(null);
                                    setCurrentPage("edit");
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
