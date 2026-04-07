import { useEffect, useState, useRef, useMemo } from "react";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import {
  useSearchParams,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import api from "../../../lib/api";
import toast from "react-hot-toast";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import backIcon from "../../../assets/TechnicalDirector/back icon.svg";
import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";
import { EyeIcon } from "@heroicons/react/24/outline";

type FormDropdownId = "project" | "module" | "type" | "assignTo" | null;

interface Employee {
  id: number;
  full_name?: string;
  name?: string;
  active?: string | null;
}

interface Project {
  id: number;
  project_name: string;
  modules?: string;
  members?: string;
  members_names?: string[];
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  uploader_name?: string | null;
}

interface Task {
  id: number;
  task_name?: string;
  projectid?: number;
  project_id?: number;
  status?: string;
  due_date?: string;
  project_name?: string;
  start_date?: string;
  module?: string;
  modules?: string;
  modules_name?: string;
  category?: string;
  type?: string;
  start_time?: string;
  startTime?: string;
  due_time?: string;
  dueTime?: string;
  end_time?: string;
  assign_to?: string;
  description?: string;
  checklist?: string;
  assigned_full_name?: string;
  uploader_full_name?: string;
  assigned_to?: number;
  Actual_start_time?: string;
  actual_start_time?: string;
  perferstart_time?: string;
  perfer_start_time?: string;
  perferend_time?: string;
  perfer_end_time?: string;
}

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
        className="flex w-full items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-left text-[14px] cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className={value ? "text-[#353535]" : "text-[#8B8B8B]"}>
          {displayLabel}
        </span>
        <img
          src={ArrowDown}
          alt="arrow"
          className={`ml-2 w-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute top-full left-0 z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                onClick={() => {
                  onChange(opt.value);
                  onClose();
                }}
                className="block w-full px-3 py-2 text-left text-[14px] text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2] first:rounded-t-lg last:rounded-b-lg cursor-pointer"
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

function toInputDate(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  return "";
}

function taskToFormValues(task: Task | Record<string, unknown>): {
  projectName: string;
  module: string;
  taskName: string;
  type: string;
  actualStartDate: string;
  actualEndDate: string;
  startTime: string;
  dueTime: string;
  assignTo: string;
  description: string;
  checklist: string;
} {
  const t = task as Record<string, unknown>;
  const str = (v: unknown) => (v != null ? String(v) : "");
  const timeOnly = (v: unknown) => {
    if (v == null) return "";
    const s = str(v);
    const match = s.match(/(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, "0")}:${match[2]}` : s.slice(0, 5);
  };
  return {
    projectName: str(t.project_name ?? t.projectName ?? ""),
    module: str(
      t.module ?? t.modules_name ?? t.modules ?? t.modulesName ?? "",
    ),
    taskName: str(t.task_name ?? t.taskName ?? ""),
    type: str(t.type ?? t.category ?? ""),
    // Backend `tasks` table: Actual_start_time = start date; perfer* = scheduled times
    actualStartDate: toInputDate(
      t.start_date ??
        t.startDate ??
        t.Actual_start_time ??
        t.actual_start_time ??
        "",
    ),
    actualEndDate: toInputDate(t.due_date ?? t.dueDate ?? ""),
    startTime: timeOnly(
      t.perferstart_time ??
        t.perfer_start_time ??
        t.start_time ??
        t.startTime ??
        "",
    ),
    dueTime: timeOnly(
      t.perferend_time ??
        t.perfer_end_time ??
        t.due_time ??
        t.dueTime ??
        t.end_time ??
        "",
    ),
    assignTo: str(
      t.assign_to ??
        t.assignTo ??
        t.assigned_to ??
        t.assigned_full_name ??
        "",
    ),
    description: str(t.description ?? ""),
    checklist: str(t.checklist ?? ""),
  };
}

function buildFormFromTask(task: Task, employeeList: Employee[]) {
  const base = taskToFormValues(task);
  let assignTo = base.assignTo;

  if (task.assigned_full_name && task.assigned_full_name.trim() !== "") {
    assignTo = task.assigned_full_name;
  } else {
    const rawId =
      (task.assign_to as string | undefined) ??
      (task.assigned_to as number | undefined) ??
      base.assignTo;
    const idNum = typeof rawId === "number" ? rawId : Number(rawId || NaN);
    if (!Number.isNaN(idNum) && employeeList.length > 0) {
      const emp = employeeList.find((e) => e.id === idNum);
      const n = emp?.full_name || emp?.name;
      if (n) assignTo = n;
    }
  }

  return { ...base, assignTo };
}

function getTodayInputDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isEndTimeBeforeStartOnSameDay(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
): boolean {
  if (!startTime || !endTime) return false;
  if (startDate && endDate && startDate !== endDate) return false;
  return endTime < startTime;
}

export default function AddEditTaskEV() {
  const { id: idParam } = useParams();
  const [searchParams] = useSearchParams();
  const { pathname, state: locationState } = useLocation();
  const navigate = useNavigate();

  const editingTaskId =
    idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;
  const isEdit = editingTaskId != null;

  const listQs = useMemo(() => {
    const s = searchParams.toString();
    return s ? `?${s}` : "";
  }, [searchParams]);

  const listBasePath = pathname.includes("/ve/teamtasks")
    ? "/ve/teamtasks"
    : "/ve/mytasks";
  const isTeamTasksRoute = listBasePath === "/ve/teamtasks";

  const goBackToList = () => {
    navigate(`${listBasePath}${listQs}`);
  };

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [formReady, setFormReady] = useState(!isEdit);

  const [addTaskForm, setAddTaskForm] = useState({
    projectName: "",
    module: "",
    taskName: "",
    type: "",
    actualStartDate: "",
    actualEndDate: "",
    startTime: "",
    dueTime: "",
    assignTo: "",
    description: "",
    checklist: "",
  });
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [openFormDropdown, setOpenFormDropdown] = useState<FormDropdownId>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formProjectTriggerRef = useRef<HTMLButtonElement>(null);
  const formProjectMenuRef = useRef<HTMLDivElement>(null);
  const formModuleTriggerRef = useRef<HTMLButtonElement>(null);
  const formModuleMenuRef = useRef<HTMLDivElement>(null);
  const formTypeTriggerRef = useRef<HTMLButtonElement>(null);
  const formTypeMenuRef = useRef<HTMLDivElement>(null);
  const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
  const formAssignMenuRef = useRef<HTMLDivElement>(null);
  const initialTaskFromNav = useRef<Task | undefined>(
    (locationState as { task?: Task } | null)?.task,
  );
  const fetchedTaskForEditRef = useRef<Task | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ success?: boolean; resources?: Employee[] }>(
        "/api/vendors/vendor-resource-profiles",
      ),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
    ])
      .then(([resourcesRes, projRes]) => {
        setEmployees(resourcesRes.data.resources ?? []);
        setProjects(projRes.data.projects ?? []);
      })
      .catch(() => {
        setEmployees([]);
        setProjects([]);
      })
      .finally(() => setLoadingMeta(false));
  }, []);

  useEffect(() => {
    if (!isEdit || editingTaskId == null || loadingMeta) return;

    if (
      fetchedTaskForEditRef.current &&
      fetchedTaskForEditRef.current.id !== editingTaskId
    ) {
      fetchedTaskForEditRef.current = null;
    }

    const fromNav = initialTaskFromNav.current;
    if (fromNav && fromNav.id === editingTaskId) {
      setAddTaskForm(buildFormFromTask(fromNav, employees));
      setFormReady(true);
      return;
    }

    if (!fetchedTaskForEditRef.current) {
      setFormReady(false);
      const detailUrl = isTeamTasksRoute
        ? `/api/vendors/vendor-tasks/${editingTaskId}`
        : `/api/tasks/${editingTaskId}`;
      api
        .get(detailUrl)
        .then((res) => {
          const raw = isTeamTasksRoute
            ? (res.data as Task)
            : ((res.data as { task?: Task })?.task ?? (res.data as Task));
          if (raw && typeof (raw as Task).id === "number") {
            fetchedTaskForEditRef.current = raw as Task;
            setAddTaskForm(
              buildFormFromTask(fetchedTaskForEditRef.current, employees),
            );
          }
        })
        .catch(() => {
          toast.error("Failed to load task");
        })
        .finally(() => setFormReady(true));
      return;
    }

    setAddTaskForm(
      buildFormFromTask(fetchedTaskForEditRef.current, employees),
    );
    setFormReady(true);
  }, [isEdit, editingTaskId, loadingMeta, employees, isTeamTasksRoute]);

  useEffect(() => {
    if (openFormDropdown === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const refs: React.RefObject<HTMLElement | null>[] =
        openFormDropdown === "project"
          ? [formProjectTriggerRef, formProjectMenuRef]
          : openFormDropdown === "module"
            ? [formModuleTriggerRef, formModuleMenuRef]
            : openFormDropdown === "type"
              ? [formTypeTriggerRef, formTypeMenuRef]
              : [formAssignTriggerRef, formAssignMenuRef];
      const inside = refs.some((r) => r.current && r.current.contains(target));
      if (!inside) setOpenFormDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openFormDropdown]);

  const selectedProjectMeta = Array.isArray(projects)
    ? projects.find((p) => p?.project_name === addTaskForm.projectName)
    : undefined;
  const dynamicModuleOptions = (selectedProjectMeta?.modules || "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);

  const employeesForAssignDropdown = useMemo(() => {
    const all = Array.isArray(employees) ? employees : [];
    const meta = projects.find((p) => p?.project_name === addTaskForm.projectName);
    const raw = (meta?.members || "").trim();
    if (!raw) return all;
    const tokens = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (tokens.length === 0) return all;
    return all.filter(isEmployeeActiveForProjectAssignment).filter((emp) => {
      const name = ((emp.full_name || emp.name) || "").trim();
      const idStr = String(emp.id);
      return tokens.some((t) => {
        const tl = t.toLowerCase();
        return t === idStr || tl === name.toLowerCase() || name === t;
      });
    });
  }, [employees, projects, addTaskForm.projectName]);

  const todayInputDate = getTodayInputDate();
  const sameCalendarDay =
    Boolean(addTaskForm.actualStartDate) &&
    Boolean(addTaskForm.actualEndDate) &&
    addTaskForm.actualStartDate === addTaskForm.actualEndDate;

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = input.files;
    if (!files?.length) return;
    const newFiles = Array.from(files);
    setAttachmentFiles((prev) => {
      const merged = [...prev];
      for (const f of newFiles) {
        const dup = merged.some((x) => x.name === f.name && x.size === f.size);
        if (!dup) merged.push(f);
      }
      return merged;
    });
    input.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const viewAttachment = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      addTaskForm.actualStartDate &&
      addTaskForm.actualStartDate < todayInputDate
    ) {
      toast.error("Start date cannot be before today.");
      return;
    }
    if (
      addTaskForm.actualEndDate &&
      addTaskForm.actualEndDate < todayInputDate
    ) {
      toast.error("End date cannot be before today.");
      return;
    }
    if (
      isEndTimeBeforeStartOnSameDay(
        addTaskForm.actualStartDate,
        addTaskForm.actualEndDate,
        addTaskForm.startTime,
        addTaskForm.dueTime,
      )
    ) {
      toast.error(
        "End time must be the same as or after start time when both dates are the same.",
      );
      return;
    }

    const projectId =
      projects.find((p) => p.project_name === addTaskForm.projectName)?.id ??
      null;
    const assigneeId = employees.find(
      (emp) => (emp.full_name || emp.name) === addTaskForm.assignTo,
    )?.id;
    const assignedToVal =
      assigneeId != null && !Number.isNaN(Number(assigneeId))
        ? assigneeId
        : addTaskForm.assignTo;

    const payload = {
      projectid: projectId ?? addTaskForm.projectName,
      taskName: addTaskForm.taskName,
      category: addTaskForm.type,
      startdate: addTaskForm.actualStartDate,
      dueDate: addTaskForm.actualEndDate,
      startTime: addTaskForm.startTime,
      dueTime: addTaskForm.dueTime,
      assignedTo: assignedToVal,
      description: addTaskForm.description,
      checklist: addTaskForm.checklist,
      modules: addTaskForm.module,
    };

    const handleFiles = (taskId: number | string) => {
      if (attachmentFiles.length > 0) {
        const formData = new FormData();
        attachmentFiles.forEach((f) => formData.append("image", f));
        const base = isTeamTasksRoute
          ? `/api/vendors/vendor-tasks/${taskId}/output-files`
          : `/api/tasks/${taskId}/output-files`;
        api.post(base, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    };

    if (isEdit && editingTaskId != null) {
      if (isTeamTasksRoute) {
        api
          .patch(`/api/vendors/vendor-tasks/${editingTaskId}`, {
            task_name: addTaskForm.taskName,
            assigned_to: assignedToVal,
            project_id: projectId ?? undefined,
            due_date: addTaskForm.actualEndDate || undefined,
            start_date: addTaskForm.actualStartDate || undefined,
            start_time: addTaskForm.startTime || undefined,
            end_time: addTaskForm.dueTime || undefined,
            category: addTaskForm.type,
            modules: addTaskForm.module,
            description: addTaskForm.description,
            checklist: addTaskForm.checklist,
          })
          .then(() => {
            handleFiles(editingTaskId);
            goBackToList();
          })
          .catch(() => {
            toast.error("Failed to update task");
          });
      } else {
        api
          .patch(`/api/tasks/${editingTaskId}`, {
            task_name: addTaskForm.taskName,
            assigned_to: assignedToVal,
            due_date: addTaskForm.actualEndDate || undefined,
            category: addTaskForm.type,
            description: addTaskForm.description,
            checklist: addTaskForm.checklist,
            modules_name: addTaskForm.module,
            Actual_start_time: addTaskForm.actualStartDate || undefined,
            perferstart_time: addTaskForm.startTime || undefined,
            perferend_time: addTaskForm.dueTime || undefined,
          })
          .then(() => {
            handleFiles(editingTaskId);
            goBackToList();
          })
          .catch(() => {
            toast.error("Failed to update task");
          });
      }
    } else if (isTeamTasksRoute) {
      api
        .post("/api/vendors/vendor-tasks", payload)
        .then((res) => {
          const taskId = res.data?.task_id ?? res.data?.id;
          if (res.data?.success && taskId != null) {
            handleFiles(taskId);
            goBackToList();
          } else {
            toast.error("Could not create task");
          }
        })
        .catch(() => {
          toast.error("Failed to create task");
        });
    } else {
      api
        .post("/api/tasks", payload)
        .then((res) => {
          if (res.data.success && res.data.task_id) {
            handleFiles(res.data.task_id);
            goBackToList();
          } else {
            toast.error("Could not create task");
          }
        })
        .catch(() => {
          toast.error("Failed to create task");
        });
    }
  };

  if (loadingMeta || (isEdit && !formReady)) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4  shrink-0">
        <button
          type="button"
          onClick={goBackToList}
          className="p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
          aria-label="Back"
        >
          <img src={backIcon} alt="Back" className="w-5 h-5" />
        </button>
        <h1 className="text-[24px] font-medium text-[#353535]">
          {isEdit ? "Edit Task Details" : "Add Task Details"}
        </h1>
        <div className="w-9" />
      </div>

      <form
        className="flex-1 overflow-y-auto p-6 custom-scrollbar"
        onSubmit={handleSubmit}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[16px] font-medium text-[#353535] mb-1">
              Project Name
            </label>
            <FormDropdown
              label="Select Project name"
              options={[
                { value: "", label: "Select Project name" },
                ...projects.map((p) => ({
                  value: p.project_name,
                  label: p.project_name,
                })),
              ]}
              value={addTaskForm.projectName}
              onChange={(v) =>
                setAddTaskForm((f) => ({
                  ...f,
                  projectName: v,
                  module: "",
                  assignTo: "",
                }))
              }
              isOpen={openFormDropdown === "project"}
              onToggle={() =>
                setOpenFormDropdown((d) => (d === "project" ? null : "project"))
              }
              onClose={() => setOpenFormDropdown(null)}
              triggerRef={formProjectTriggerRef}
              dropdownRef={formProjectMenuRef}
            />
          </div>
          <div>
            <label className="block text-[16px] font-medium text-[#353535] mb-1">
              Select Module
            </label>
            <FormDropdown
              label="Select Module"
              options={[
                { value: "", label: "Select Module" },
                ...dynamicModuleOptions.map((m) => ({
                  value: m,
                  label: m,
                })),
              ]}
              value={addTaskForm.module}
              onChange={(v) =>
                setAddTaskForm((f) => ({ ...f, module: v }))
              }
              isOpen={openFormDropdown === "module"}
              onToggle={() =>
                setOpenFormDropdown((d) => (d === "module" ? null : "module"))
              }
              onClose={() => setOpenFormDropdown(null)}
              triggerRef={formModuleTriggerRef}
              dropdownRef={formModuleMenuRef}
            />
          </div>

          <div>
            <label className="block text-[16px] font-medium text-[#353535] mb-1">
              Task Name
            </label>
            <div className="flex">
              <input
                type="text"
                value={addTaskForm.taskName}
                onChange={(e) =>
                  setAddTaskForm((f) => ({
                    ...f,
                    taskName: e.target.value,
                  }))
                }
                placeholder="Enter Task / Select Task"
                className={`flex-1 bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none ${isEdit ? "rounded-sm" : "rounded-l-sm"}`}
              />
              {!isEdit && (
                <button
                  type="button"
                  className="rounded-l-none rounded-r-sm bg-[#E2E2E2] px-4 py-2 text-[14px] font-medium text-[#8B8B8B]"
                >
                  Tasklist
                </button>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[16px] font-medium text-[#353535] mb-1">
                Type
              </label>
              <FormDropdown
                label="Select Type"
                options={[
                  { value: "", label: "Select Type" },
                  { value: "task", label: "Task" },
                  { value: "bug", label: "Bug" },
                  { value: "feature", label: "Feature" },
                ]}
                value={addTaskForm.type}
                onChange={(v) =>
                  setAddTaskForm((f) => ({ ...f, type: v }))
                }
                isOpen={openFormDropdown === "type"}
                onToggle={() =>
                  setOpenFormDropdown((d) => (d === "type" ? null : "type"))
                }
                onClose={() => setOpenFormDropdown(null)}
                triggerRef={formTypeTriggerRef}
                dropdownRef={formTypeMenuRef}
              />
            </div>
            <div>
              <label className="block text-[16px] font-medium text-[#353535] mb-1">
                Actual Start Date
              </label>
              <input
                type="date"
                min={todayInputDate}
                value={addTaskForm.actualStartDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setAddTaskForm((f) => {
                    const next = { ...f, actualStartDate: v };
                    if (f.actualEndDate && v && f.actualEndDate < v) {
                      next.actualEndDate = v;
                    }
                    return next;
                  });
                }}
                className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[16px] font-medium text-[#353535] mb-1">
                Actual End Date
              </label>
              <input
                type="date"
                min={addTaskForm.actualStartDate || todayInputDate}
                value={addTaskForm.actualEndDate}
                onChange={(e) =>
                  setAddTaskForm((f) => ({
                    ...f,
                    actualEndDate: e.target.value,
                  }))
                }
                className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none"
              />
            </div>
          </div>
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[16px] font-medium text-[#353535] mb-1">
                Select Start Time
              </label>
              <input
                type="time"
                value={addTaskForm.startTime}
                onChange={(e) => {
                  const v = e.target.value;
                  setAddTaskForm((f) => {
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
                className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[16px] font-medium text-[#353535] mb-1">
                Select End Time
              </label>
              <input
                type="time"
                min={
                  sameCalendarDay && addTaskForm.startTime
                    ? addTaskForm.startTime
                    : undefined
                }
                value={addTaskForm.dueTime}
                onChange={(e) =>
                  setAddTaskForm((f) => ({
                    ...f,
                    dueTime: e.target.value,
                  }))
                }
                className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[16px] font-medium text-[#353535] mb-1">
                Assign To
              </label>
              <FormDropdown
                label="Select Assign To"
                options={[
                  { value: "", label: "Select Assign To" },
                  ...employeesForAssignDropdown
                    .filter(
                      (emp) =>
                        (emp.full_name || emp.name || "").trim() !== "",
                    )
                    .map((emp) => {
                      const label = emp.full_name || emp.name || "";
                      return { value: label, label };
                    }),
                ]}
                value={addTaskForm.assignTo}
                onChange={(v) =>
                  setAddTaskForm((f) => ({ ...f, assignTo: v }))
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
          <div className="sm:col-span-2">
            <label className="block text-[16px] font-medium text-[#353535] mb-1">
              Description
            </label>
            <textarea
              value={addTaskForm.description}
              onChange={(e) =>
                setAddTaskForm((f) => ({
                  ...f,
                  description: e.target.value,
                }))
              }
              placeholder="Enter Description..."
              rows={3}
              className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[16px] font-medium text-[#353535] mb-1">
              Checklist
            </label>
            <input
              type="text"
              value={addTaskForm.checklist}
              onChange={(e) =>
                setAddTaskForm((f) => ({
                  ...f,
                  checklist: e.target.value,
                }))
              }
              placeholder="Enter Reference Link"
              className="w-full rounded-md bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[16px] font-medium text-[#353535] mb-1">
              Attachments
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleAttachmentChange}
              accept="*/*"
            />
            <div className="flex flex-col gap-4">
              <div className="w-full">
                <div className="flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={
                      attachmentFiles.length > 0
                        ? `${attachmentFiles.length} file(s) selected`
                        : ""
                    }
                    placeholder="Upload Files"
                    className="flex-1 rounded-l-sm rounded-r-none bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] placeholder:text-[#8B8B8B] focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }}
                    className="rounded-r-sm rounded-l-none bg-[#E2E2E2] px-4 py-2 text-[14px] font-medium text-[#8B8B8B] cursor-pointer inline-flex items-center whitespace-nowrap"
                  >
                    Browse File
                  </button>
                </div>
              </div>

              {attachmentFiles.length > 0 && (
                <div className="w-full">
                  <ul className="space-y-2">
                    {attachmentFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] group"
                      >
                        <span className="truncate min-w-0 font-medium" title={file.name}>
                          {file.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => viewAttachment(file)}
                            className="shrink-0 p-1 rounded-full hover:bg-slate-100 text-[#353535] transition-colors"
                            aria-label={`View ${file.name}`}
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="shrink-0 p-1 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors text-[#353535]"
                            aria-label={`Remove ${file.name}`}
                          >
                            <svg
                              className="w-4 h-4"
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
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto flex justify-center gap-3 mt-8 pt-4">
          <button
            type="button"
            onClick={goBackToList}
            className="rounded-md bg-[#F2F2F2] px-5 py-2 text-[14px] font-medium text-[#353535] font-gantari"
          >
            Discard
          </button>
          <button
            type="submit"
            className="rounded-md bg-[#DBE9FE] px-5 py-2 text-[14px] font-medium text-[#353535] font-gantari"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
