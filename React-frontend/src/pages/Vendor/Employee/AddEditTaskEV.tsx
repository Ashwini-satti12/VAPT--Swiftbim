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

/** Backend sometimes stores modules as a JSON array string, e.g. `["Module A"]`. */
function normalizeModuleString(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  try {
    const parsed = JSON.parse(s) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return String(parsed[0]).trim();
    }
  } catch {
    /* not JSON */
  }
  return s;
}

function normalizeCategoryForApi(category: string): string {
  return category.trim().toLowerCase();
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
    module: normalizeModuleString(
      str(t.module ?? t.modules_name ?? t.modules ?? t.modulesName ?? ""),
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
      t.assign_to ?? t.assignTo ?? t.assigned_to ?? t.assigned_full_name ?? "",
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

function resolveFormProjectName(
  task: Task,
  baseForm: ReturnType<typeof buildFormFromTask>,
  projectList: Project[],
) {
  if (baseForm.projectName?.trim()) return baseForm;
  const rawProjectId = task.project_id ?? task.projectid;
  const projectId = Number(rawProjectId);
  if (Number.isNaN(projectId)) return baseForm;
  const matched = projectList.find((p) => Number(p.id) === projectId);
  if (!matched?.project_name) return baseForm;
  return { ...baseForm, projectName: matched.project_name };
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

export default function AddEditTaskEV({
  taskId: propTaskId,
  onBack: propOnBack,
  onSuccess: propOnSuccess,
}: {
  taskId?: number;
  onBack?: () => void;
  onSuccess?: () => void;
}) {
  const { id: idParam } = useParams();
  const [searchParams] = useSearchParams();
  const { pathname, state: locationState } = useLocation();
  const navigate = useNavigate();

  const editingTaskId =
    propTaskId ?? (idParam && /^\d+$/.test(idParam) ? Number(idParam) : null);
  const isEdit = editingTaskId != null;

  const listQs = useMemo(() => {
    const s = searchParams.toString();
    return s ? `?${s}` : "";
  }, [searchParams]);

  const listBasePath = pathname.includes("/ve/teamtasks")
    ? "/ve/teamtasks"
    : "/ve/mytasks";
  const isTeamTasksRoute = listBasePath === "/ve/teamtasks";
  // VE add/edit should always use vendor task APIs to keep assignee/project mapping consistent.
  const useVendorTaskApi = true;

  const goBackToList = () => {
    if (propOnBack) {
      propOnBack();
      return;
    }
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
  const [openFormDropdown, setOpenFormDropdown] =
    useState<FormDropdownId>(null);
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
      const seeded = buildFormFromTask(fromNav, employees);
      setAddTaskForm(resolveFormProjectName(fromNav, seeded, projects));
      setFormReady(true);
      return;
    }

    if (!fetchedTaskForEditRef.current) {
      setFormReady(false);
      const detailUrl = useVendorTaskApi
        ? `/api/vendors/vendor-tasks/${editingTaskId}`
        : `/api/tasks/${editingTaskId}`;
      api
        .get(detailUrl)
        .then((res) => {
          const raw = useVendorTaskApi
            ? (res.data as Task)
            : ((res.data as { task?: Task })?.task ?? (res.data as Task));
          if (raw && typeof (raw as Task).id === "number") {
            fetchedTaskForEditRef.current = raw as Task;
            const seeded = buildFormFromTask(
              fetchedTaskForEditRef.current,
              employees,
            );
            setAddTaskForm(
              resolveFormProjectName(
                fetchedTaskForEditRef.current,
                seeded,
                projects,
              ),
            );
          }
        })
        .catch(() => {
          toast.error("Failed to load task");
        })
        .finally(() => setFormReady(true));
      return;
    }

    const seeded = buildFormFromTask(fetchedTaskForEditRef.current, employees);
    setAddTaskForm(
      resolveFormProjectName(fetchedTaskForEditRef.current, seeded, projects),
    );
    setFormReady(true);
  }, [
    isEdit,
    editingTaskId,
    loadingMeta,
    employees,
    projects,
    useVendorTaskApi,
  ]);

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
    const meta = projects.find(
      (p) => p?.project_name === addTaskForm.projectName,
    );
    const raw = (meta?.members || "").trim();
    if (!raw) return all;
    const tokens = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length === 0) return all;
    return all.filter(isEmployeeActiveForProjectAssignment).filter((emp) => {
      const name = (emp.full_name || emp.name || "").trim();
      const idStr = String(emp.id);
      return tokens.some((t) => {
        const tl = t.toLowerCase();
        return t === idStr || tl === name.toLowerCase() || name === t;
      });
    });
  }, [employees, projects, addTaskForm.projectName]);

  const todayInputDate = getTodayInputDate();

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

  const executeTaskSave = () => {
    const moduleValue = normalizeModuleString(addTaskForm.module);
    const categoryValue = normalizeCategoryForApi(addTaskForm.type);

    // Required field validation
    if (!addTaskForm.projectName.trim()) {
      toast.error("Please fill in the Project Name.");
      return;
    }
    if (!moduleValue) {
      toast.error("Please fill in the Module.");
      return;
    }
    if (!addTaskForm.taskName.trim()) {
      toast.error("Please fill in the Task Name.");
      return;
    }
    if (!categoryValue) {
      toast.error("Please select the Type.");
      return;
    }
    if (!addTaskForm.actualStartDate.trim()) {
      toast.error("Please fill in the Start Date.");
      return;
    }
    if (!addTaskForm.actualEndDate.trim()) {
      toast.error("Please fill in the End Date.");
      return;
    }
    if (!addTaskForm.startTime.trim()) {
      toast.error("Please fill in the Start Time.");
      return;
    }
    if (!addTaskForm.dueTime.trim()) {
      toast.error("Please fill in the End Time.");
      return;
    }
    if (!addTaskForm.assignTo.trim()) {
      toast.error("Please fill in the Assign To field.");
      return;
    }
    if (!addTaskForm.description.trim()) {
      toast.error("Please fill in the Description.");
      return;
    }

    if (
      !isEdit &&
      addTaskForm.actualStartDate &&
      addTaskForm.actualStartDate < todayInputDate
    ) {
      toast.error("Start date cannot be before today.");
      return;
    }
    if (
      !isEdit &&
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
    const assignTrim = addTaskForm.assignTo.trim();
    const assigneeId = employees.find((emp) => {
      const n = (emp.full_name || emp.name || "").trim();
      return n === assignTrim || n.toLowerCase() === assignTrim.toLowerCase();
    })?.id;
    let assignedToVal: number | string =
      assigneeId != null && !Number.isNaN(Number(assigneeId))
        ? assigneeId
        : addTaskForm.assignTo;

    if (isTeamTasksRoute) {
      if (assigneeId == null || Number.isNaN(Number(assigneeId))) {
        toast.error("Please select Assign To from the list.");
        return;
      }
      assignedToVal = assigneeId;
    }

    const payload = {
      projectid: projectId ?? addTaskForm.projectName,
      taskName: addTaskForm.taskName,
      category: categoryValue,
      startdate: addTaskForm.actualStartDate,
      dueDate: addTaskForm.actualEndDate,
      startTime: addTaskForm.startTime,
      dueTime: addTaskForm.dueTime,
      assignedTo: assignedToVal,
      description: addTaskForm.description,
      checklist: addTaskForm.checklist,
      modules: moduleValue,
    };

    const handleFiles = (taskId: number | string) => {
      if (attachmentFiles.length > 0) {
        const formData = new FormData();
        attachmentFiles.forEach((f) => formData.append("image", f));
        const base = useVendorTaskApi
          ? `/api/vendors/vendor-tasks/${taskId}/output-files`
          : `/api/tasks/${taskId}/output-files`;
        api.post(base, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    };

    if (isEdit && editingTaskId != null) {
      if (useVendorTaskApi) {
        api
          .patch(`/api/vendors/vendor-tasks/${editingTaskId}`, {
            task_name: addTaskForm.taskName,
            assigned_to: assignedToVal,
            project_id: projectId ?? undefined,
            due_date: addTaskForm.actualEndDate || undefined,
            start_date: addTaskForm.actualStartDate || undefined,
            start_time: addTaskForm.startTime || undefined,
            end_time: addTaskForm.dueTime || undefined,
            category: categoryValue,
            modules: moduleValue,
            description: addTaskForm.description,
            checklist: addTaskForm.checklist,
          })
          .then(() => {
            handleFiles(editingTaskId);
            toast.success("Task updated successfully");
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
            category: categoryValue,
            description: addTaskForm.description,
            checklist: addTaskForm.checklist,
            modules_name: moduleValue,
            Actual_start_time: addTaskForm.actualStartDate || undefined,
            perferstart_time: addTaskForm.startTime || undefined,
            perferend_time: addTaskForm.dueTime || undefined,
          })
          .then(() => {
            handleFiles(editingTaskId);
            toast.success("Task updated successfully");
            goBackToList();
          })
          .catch(() => {
            toast.error("Failed to update task");
          });
      }
    } else if (useVendorTaskApi) {
      api
        .post("/api/vendors/vendor-tasks", payload)
        .then((res) => {
          const taskId = res.data?.task_id ?? res.data?.id;
          if (res.data?.success && taskId != null) {
            handleFiles(taskId);
            toast.success("Task created successfully");
            propOnSuccess?.();
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
            toast.success("Task created successfully");
            propOnSuccess?.();
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeTaskSave();
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
      <div className="flex items-center justify-between px-5 py-2 mb-4 shrink-0">
        <div className="group relative inline-flex shrink-0">
          <button
            type="button"
            onClick={goBackToList}
              className="p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
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
        <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
          {isEdit ? "Edit Task Details" : "Add New Task"}
        </h1>
        <div className="w-9" />
      </div>

      <form
        className="flex-1 overflow-y-auto px-4 md:px-8 pb-24 custom-scrollbar"
        noValidate
        onSubmit={handleFormSubmit}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
          <div className="sm:col-span-2">
            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
              Project Name
              <span className="text-[#DD4342]">*</span>
            </label>
            <FormDropdown
              label="Select Project name"
              options={[
                { value: "", label: "Select Project name" },
                ...projects.map((p) => ({
                  value: p.project_name,
                  label: p.project_name,
                  required: true,
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
            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
              Select Module
              <span className="text-[#DD4342]">*</span>
            </label>
            <FormDropdown
              label="Select Module"
              options={[
                { value: "", label: "Select Module" },
                ...dynamicModuleOptions.map((m) => ({
                  value: m,
                  label: m,
                  required: true,
                })),
              ]}
              value={addTaskForm.module}
              onChange={(v) => setAddTaskForm((f) => ({ ...f, module: v }))}
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
            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
              Task Name
              <span className="text-[#DD4342]">*</span>
            </label>
            <div className="relative flex min-h-[42px] items-stretch overflow-hidden rounded-[5px] border border-transparent bg-[#F2F3F4] transition-colors focus-within:border-[#AEACAC52]">
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
                className="min-w-0 flex-1 border-0 bg-transparent px-4 py-2 text-[14px] font-Gantari text-[#353535] outline-none placeholder:font-normal placeholder:text-[14px] placeholder-[#8B8B8B]"
              />
              {/* {!isEdit && (
                <button
                  type="button"
                  className="rounded-l-none rounded-r-sm bg-[#E2E2E2] px-4 py-2 text-[14px] font-medium text-[#8B8B8B]"
                >
                  Tasklist
                </button>
              )} */}
            </div>
          </div>

          {/* <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[16px] font-medium text-[#353535] mb-1">
                Type
                <span className="text-red-500">*</span>
              </label>
              <FormDropdown
                label="Select Type"
                options={[
                  { value: "", label: "Select Type" },
                  { value: "task", label: "Task" },
                  { value: "bug", label: "Bug" },
                  { value: "feature", label: "Feature" },
                  { value: "other", label: "Other" },
                ]}
                value={addTaskForm.type}
                onChange={(v) => setAddTaskForm((f) => ({ ...f, type: v }))}
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
                Start Date
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={isEdit ? undefined : todayInputDate}
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
                className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none required"
              />
            </div>
            <div>
              <label className="block text-[16px] font-medium text-[#353535] mb-1">
                End Date
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={
                  isEdit
                    ? addTaskForm.actualStartDate || undefined
                    : addTaskForm.actualStartDate || todayInputDate
                }
                value={addTaskForm.actualEndDate}
                onChange={(e) =>
                  setAddTaskForm((f) => ({
                    ...f,
                    actualEndDate: e.target.value,
                  }))
                }
                className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] focus:outline-none required"
              />
            </div>
          </div> */}
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6">
            <div>
              <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                Select Start Time
                <span className="text-[#DD4342]">*</span>
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
                className="w-full rounded-[5px] bg-[#F2F3F4] border border-transparent px-4 py-2 text-[14px] font-Gantari text-[#353535] focus:outline-none focus:border-[#AEACAC52]"
              />
            </div>
            <div>
              <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                Select End Time
                <span className="text-[#DD4342]">*</span>
              </label>
              <input
                type="time"
                value={addTaskForm.dueTime}
                onChange={(e) =>
                  setAddTaskForm((f) => ({
                    ...f,
                    dueTime: e.target.value,
                  }))
                }
                className="w-full rounded-[5px] bg-[#F2F3F4] border border-transparent px-4 py-2 text-[14px] font-Gantari text-[#353535] focus:outline-none focus:border-[#AEACAC52]"
              />
            </div>
            <div>
              <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                Assign To
                <span className="text-[#DD4342]">*</span>
              </label>
              <FormDropdown
                label="Select Assign To"
                options={[
                  { value: "", label: "Select Assign To" },
                  ...employeesForAssignDropdown
                    .filter(
                      (emp) => (emp.full_name || emp.name || "").trim() !== "",
                    )
                    .map((emp) => {
                      const label = emp.full_name || emp.name || "";
                      return { value: label, label };
                    }),
                ]}
                value={addTaskForm.assignTo}
                onChange={(v) => setAddTaskForm((f) => ({ ...f, assignTo: v }))}
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
            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
              Description
              <span className="text-[#DD4342]">*</span>
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
              rows={4}
              className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder:font-normal placeholder:text-[14px] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
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
              className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder:font-normal placeholder:text-[14px] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
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
                        <span
                          className="truncate min-w-0 font-medium"
                          title={file.name}
                        >
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
        <div className="max-w-4xl mx-auto flex justify-center gap-4 mt-8 pt-4">
          <button
            type="button"
            onClick={goBackToList}
            className="rounded-[5px] bg-[#F4F4F4] px-6 py-2 text-[14px] font-semibold text-[#353535] font-Gantari cursor-pointer"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={executeTaskSave}
            className="rounded-[5px] bg-[#DBE9FE] px-6 py-2 text-[14px] font-semibold text-[#353535] font-Gantari cursor-pointer"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
