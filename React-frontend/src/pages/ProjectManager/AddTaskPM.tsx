import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../lib/api";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import closeButtonIcon from "../../assets/ProductNavbarIcons/close button.svg";
import { TimePickerWheel } from "../../components/TimePickerWheel";
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";
import {
  FormDropdown,
  TaskDropdown,
  formatFileSize,
  formatTimeForDisplay,
} from "../TechnicalDirector/MytaskTD";

/** Opens a local `File` in a new browser tab (e.g. PDF viewer). */
function openAttachmentInNewTab(file: File) {
  const url = URL.createObjectURL(file);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
}

type FormDropdownId =
  | "project"
  | "module"
  | "type"
  | "assignTo"
  | "type_start_time"
  | "type_end_time"
  | null;

type PendingAttachmentDelete = { type: "local"; index: number };

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
  created_at?: string;
  perferstart_time?: string;
  perferend_time?: string;
}

interface Employee {
  id: number;
  full_name: string;
  active?: string;
}

interface Project {
  id: number;
  project_name: string;
  tasks?: string;
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
  const dateOnly = (v: unknown) => {
    if (v == null) return "";
    const s = str(v);
    if (s.length >= 10) return s.slice(0, 10);
    return s;
  };
  const timeOnly = (v: unknown) => {
    if (v == null) return "";
    const s = str(v);
    const match = s.match(/(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, "0")}:${match[2]}` : s.slice(0, 5);
  };
  return {
    projectName: str(t.project_name ?? t.projectName ?? ""),
    module: str(t.module ?? t.modules_name ?? ""),
    taskName: str(t.task_name ?? t.taskName ?? ""),
    type: str(t.type ?? t.category ?? ""),
    actualStartDate: dateOnly(
      t.start_date ?? t.startDate ?? t.Actual_start_time ?? "",
    ),
    actualEndDate: dateOnly(t.due_date ?? t.dueDate ?? ""),
    startTime: timeOnly(
      t.perferstart_time ?? t.start_time ?? t.startTime ?? t.Actual_start_time ?? "",
    ),
    dueTime: timeOnly(t.perferend_time ?? t.due_time ?? t.dueTime ?? t.end_time ?? ""),
    assignTo: str(t.assigned_full_name ?? t.assign_to ?? t.assignTo ?? t.assigned_to ?? ""),
    description: str(t.description ?? ""),
    checklist: str(t.checklist ?? ""),
  };
}

const initialForm = {
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
};

export default function AddTaskPM() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingTask = location.state?.task as Task | undefined;
  const editingTaskId = editingTask?.id ?? null;

  const [addError, setAddError] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [addTaskForm, setAddTaskForm] = useState(initialForm);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [openFormDropdown, setOpenFormDropdown] =
    useState<FormDropdownId>(null);
  const [tasklistOpen, setTasklistOpen] = useState(false);
  const [pendingAttachmentDelete, setPendingAttachmentDelete] =
    useState<PendingAttachmentDelete | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formProjectTriggerRef = useRef<HTMLElement | null>(null);
  const formProjectMenuRef = useRef<HTMLDivElement>(null);
  const formModuleTriggerRef = useRef<HTMLElement | null>(null);
  const formModuleMenuRef = useRef<HTMLDivElement>(null);
  const formTypeTriggerRef = useRef<HTMLElement | null>(null);
  const formTypeMenuRef = useRef<HTMLDivElement>(null);
  const formAssignTriggerRef = useRef<HTMLElement | null>(null);
  const formAssignMenuRef = useRef<HTMLDivElement>(null);
  const tasklistTriggerRef = useRef<HTMLButtonElement>(null);
  const tasklistMenuRef = useRef<HTMLDivElement>(null);
  const formStartTimeTriggerRef = useRef<HTMLButtonElement>(null);
  const formStartTimeMenuRef = useRef<HTMLDivElement>(null);
  const formEndTimeTriggerRef = useRef<HTMLButtonElement>(null);
  const formEndTimeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ employees?: Employee[] }>("/api/employees"),
      api.get<{ projects?: Project[] }>("/api/projects"),
    ]).then(([empRes, projRes]) => {
      setEmployees((empRes.data.employees ?? []).filter(isEmployeeActiveForProjectAssignment));
      setProjects(projRes.data.projects ?? []);
    });
  }, []);

  useEffect(() => {
    if (editingTask) {
      setAddTaskForm(taskToFormValues(editingTask));
    }
  }, [editingTask]);

  useEffect(() => {
    if (addTaskForm.projectName) {
      const selectedProj = projects.find(
        (p) => p.project_name === addTaskForm.projectName,
      );
      if (!selectedProj) {
        setModules([]);
        return;
      }
      api
        .post<{ success: boolean; modules: { label: string }[] }>(
          "/api/projects/filters/modules",
          {
            projectId: selectedProj.id,
          },
        )
        .then((res) => {
          const list = Array.isArray(res.data.modules) ? res.data.modules : [];
          setModules(
            list
              .map((m: { label?: string }) => m?.label)
              .filter((x): x is string => Boolean(x)),
          );
        })
        .catch(() => setModules([]));
    } else setModules([]);
  }, [addTaskForm.projectName, projects]);

  useEffect(() => {
    if (openFormDropdown === null && !tasklistOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const refs: React.RefObject<HTMLElement | null>[] = tasklistOpen
        ? [tasklistTriggerRef, tasklistMenuRef]
        : openFormDropdown === "project"
          ? [formProjectTriggerRef, formProjectMenuRef]
          : openFormDropdown === "module"
            ? [formModuleTriggerRef, formModuleMenuRef]
            : openFormDropdown === "type"
              ? [formTypeTriggerRef, formTypeMenuRef]
              : openFormDropdown === "type_start_time"
                ? [formStartTimeTriggerRef, formStartTimeMenuRef]
                : openFormDropdown === "type_end_time"
                  ? [formEndTimeTriggerRef, formEndTimeMenuRef]
                  : [formAssignTriggerRef, formAssignMenuRef];
      const inside = refs.some((r) => r.current && r.current.contains(target));
      if (!inside) {
        setOpenFormDropdown(null);
        setTasklistOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openFormDropdown, tasklistOpen]);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = input.files;
    if (!files?.length) return;
    setAttachmentFiles((prev) => [...prev, ...Array.from(files)]);
    requestAnimationFrame(() => {
      input.value = "";
    });
  };

  const openFilePicker = () => {
    requestAnimationFrame(() => {
      fileInputRef.current?.click();
    });
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmRemoveAttachment = () => {
    if (!pendingAttachmentDelete) return;
    removeAttachment(pendingAttachmentDelete.index);
    setPendingAttachmentDelete(null);
  };

  const pendingDeleteFileName =
    pendingAttachmentDelete != null
      ? (attachmentFiles[pendingAttachmentDelete.index]?.name ?? "")
      : "";

  const tasklistOptions = useMemo(() => {
    const taskListStr = projects.find(
      (p) => p.project_name === addTaskForm.projectName,
    )?.tasks;
    const options = taskListStr
      ? taskListStr
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    return ["Select Task", ...options];
  }, [projects, addTaskForm.projectName]);

  const totalAttachmentCount = attachmentFiles.length;

  const goBack = () => navigate("/tasks");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    const requiredFields: (keyof typeof addTaskForm)[] = [
      "projectName",
      "module",
      "taskName",
      "type",
      "actualStartDate",
      "actualEndDate",
      "startTime",
      "dueTime",
      "assignTo",
      "description",
    ];

    for (const field of requiredFields) {
      if (!addTaskForm[field]) {
        setAddError("Please fill in all required fields marked with *.");
        return;
      }
    }

    const today = new Date().toISOString().split("T")[0];
    if (addTaskForm.actualStartDate < today && !editingTaskId) {
      setAddError("Actual Start Date cannot be in the past.");
      setAddSubmitting(false);
      return;
    }
    if (addTaskForm.actualEndDate < addTaskForm.actualStartDate) {
      setAddError("Actual End Date cannot be before Actual Start Date.");
      setAddSubmitting(false);
      return;
    }

    setAddSubmitting(true);
    try {
      const isEditing = editingTaskId !== null;
      const payload = {
        project_id: projects.find(
          (p) => p.project_name === addTaskForm.projectName,
        )?.id,
        project_name: addTaskForm.projectName,
        modules_name: addTaskForm.module,
        module: addTaskForm.module,
        task_name: addTaskForm.taskName,
        taskName: addTaskForm.taskName,
        type: addTaskForm.type,
        category: addTaskForm.type,
        start_date: addTaskForm.actualStartDate,
        startdate: addTaskForm.actualStartDate,
        due_date: addTaskForm.actualEndDate,
        dueDate: addTaskForm.actualEndDate,
        perferstart_time: addTaskForm.startTime,
        perferend_time: addTaskForm.dueTime,
        assigned_to: employees.find((e) => e.full_name === addTaskForm.assignTo)
          ?.id,
        assign_to: addTaskForm.assignTo,
        description: addTaskForm.description,
        checklist: addTaskForm.checklist,
        status: isEditing ? editingTask?.status : "To Do",
        progress: isEditing ? editingTask?.progress : 0,
      };

      let taskId = editingTaskId;
      if (isEditing) {
        await api.patch(`/api/tasks/${editingTaskId}`, payload);
      } else {
        const res = await api.post<{ task_id: number }>("/api/tasks", payload);
        taskId = res.data.task_id;
      }

      if (taskId && attachmentFiles.length > 0) {
        const formData = new FormData();
        attachmentFiles.forEach((file) => formData.append("image", file));
        await api.post(`/api/tasks/${taskId}/output-files`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      navigate("/tasks");
    } catch (err) {
      setAddError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to save task.",
      );
    } finally {
      setAddSubmitting(false);
    }
  };

  const getAssignToOptions = () => {
    if (!addTaskForm.projectName) {
      return [
        { value: "", label: "Select Assign To" },
        ...employees.filter(isEmployeeActiveForProjectAssignment).map((e) => ({ value: e.full_name, label: e.full_name })),
      ];
    }
    const proj = projects.find((p) => p.project_name === addTaskForm.projectName);
    if (!proj) {
      return [
        { value: "", label: "Select Assign To" },
        ...employees.filter(isEmployeeActiveForProjectAssignment).map((e) => ({ value: e.full_name, label: e.full_name })),
      ];
    }
    const involvedNames = new Set<string>();
    // @ts-ignore - these fields might be added dynamically from backend
    if (proj.project_manager_name) involvedNames.add(proj.project_manager_name);
    // @ts-ignore
    if (proj.lead_name) involvedNames.add(proj.lead_name);
    // @ts-ignore
    if (proj.bim_coordinator_name) involvedNames.add(proj.bim_coordinator_name);
    // @ts-ignore
    if (proj.uploader_name) involvedNames.add(proj.uploader_name);
    // @ts-ignore
    if (Array.isArray(proj.members_names)) {
      // @ts-ignore
      proj.members_names.forEach((name: string) => {
        if (name) involvedNames.add(name);
      });
    }

    const validEmployees = employees.filter(e => e.full_name && involvedNames.has(e.full_name) && isEmployeeActiveForProjectAssignment(e));

    return [
      { value: "", label: "Select Assign To" },
      ...validEmployees.filter(isEmployeeActiveForProjectAssignment).map((e) => ({ value: e.full_name, label: e.full_name })),
    ];
  };

  return (
    <div className="h-full flex-1 min-h-0 p-2 bg-white overflow-hidden overflow-y-hidden">
      <div className="max-w-[1174px] mx-auto h-full min-h-0 flex flex-col overflow-hidden overflow-y-hidden">
        <div className="flex items-center justify-between mb-8 sm:mb-10 relative flex-shrink-0">
            <button
              type="button"
              onClick={goBack}
              className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
              title="Back"
            >
              <img src={backIcon} alt="Back" className="w-5 h-5" />
            </button>
            <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
              {editingTaskId !== null ? "Edit Task" : "Add New Task"}
            </h3>
            <div className="w-10" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            tabIndex={-1}
            className="fixed left-[-9999px] top-0 h-px w-px opacity-0"
            onChange={handleAttachmentChange}
            accept="*/*"
          />
          <form onSubmit={handleSubmit} className="space-y-6">
            {addError && (
              <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">
                  !
                </div>
                <div className="flex-1">
                  <p className="text-[13px] leading-snug">{addError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <div className="md:col-span-2">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Project Name <span className="text-[#DD4342]">*</span>
                </label>
                <FormDropdown
                  label="Select Project"
                  options={[
                    { value: "", label: "Select Project" },
                    ...projects.map((p) => ({
                      value: p.project_name,
                      label: p.project_name,
                    })),
                  ]}
                  value={addTaskForm.projectName}
                  onChange={(v) =>
                    setAddTaskForm((f) => ({ ...f, projectName: v }))
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
                  searchable
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Select Module <span className="text-[#DD4342]">*</span>
                </label>
                <FormDropdown
                  label="Select Module"
                  options={[
                    { value: "", label: "Select Module" },
                    ...modules.map((m) => ({ value: m, label: m })),
                  ]}
                  value={addTaskForm.module}
                  onChange={(v) => setAddTaskForm((f) => ({ ...f, module: v }))}
                  isOpen={openFormDropdown === "module"}
                  onToggle={() =>
                    setOpenFormDropdown((d) =>
                      d === "module" ? null : "module",
                    )
                  }
                  onClose={() => setOpenFormDropdown(null)}
                  triggerRef={formModuleTriggerRef}
                  dropdownRef={formModuleMenuRef}
                  searchable
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Task Name <span className="text-[#DD4342]">*</span>
                </label>
                <div className="relative flex min-h-[42px] items-stretch overflow-hidden rounded-[5px] border border-transparent bg-[#F2F3F4] transition-colors focus-within:border-[#AEACAC52]">
                  <input
                    type="text"
                    value={addTaskForm.taskName}
                    onChange={(e) =>
                      setAddTaskForm((f) => ({ ...f, taskName: e.target.value }))
                    }
                    placeholder="Enter Task / Select Task"
                    className="min-w-0 flex-1 border-0 bg-transparent px-4 py-2 text-[14px] font-Gantari text-[#353535] outline-none placeholder-[#8B8B8B]"
                  />
                  <TaskDropdown
                    label="Tasklist"
                    options={tasklistOptions}
                    selected={null}
                    onSelect={(val) => {
                      if (!val || val === "Select Task") return;
                      setAddTaskForm((f) => ({ ...f, taskName: val }));
                    }}
                    isOpen={tasklistOpen}
                    onToggle={() => setTasklistOpen((d) => !d)}
                    onClose={() => setTasklistOpen(false)}
                    triggerRef={tasklistTriggerRef}
                    dropdownRef={tasklistMenuRef}
                    menuAlign="right"
                    menuUseFixedLayer
                    triggerVariant="compositeEnd"
                    searchable
                    searchPlaceholder="Search task..."
                    maxVisibleItems={6}
                  />
                </div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6">
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Type <span className="text-[#DD4342]">*</span>
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
                    onChange={(v) => setAddTaskForm((f) => ({ ...f, type: v }))}
                    isOpen={openFormDropdown === "type"}
                    onToggle={() =>
                      setOpenFormDropdown((d) => (d === "type" ? null : "type"))
                    }
                    onClose={() => setOpenFormDropdown(null)}
                    triggerRef={formTypeTriggerRef}
                    dropdownRef={formTypeMenuRef}
                    searchable
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Actual Start Date <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="date"
                    value={addTaskForm.actualStartDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setAddTaskForm((f) => ({
                        ...f,
                        actualStartDate: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Actual End Date <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="date"
                    value={addTaskForm.actualEndDate}
                    min={addTaskForm.actualStartDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setAddTaskForm((f) => ({
                        ...f,
                        actualEndDate: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6">
                <div className="relative">
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Select Start Time <span className="text-[#DD4342]">*</span>
                  </label>
                  <button
                    ref={formStartTimeTriggerRef}
                    type="button"
                    onClick={() =>
                      setOpenFormDropdown((d) =>
                        d === "type_start_time" ? null : "type_start_time",
                      )
                    }
                    className="flex w-full items-center justify-between rounded-[5px] bg-[#F2F3F4] border border-transparent px-4 py-2 text-left text-[14px] font-Gantari focus:border-[#AEACAC52] outline-none shadow-none transition-all cursor-pointer"
                  >
                    <span
                      className={
                        addTaskForm.startTime
                          ? "text-[#353535]"
                          : "text-[#8B8B8B]"
                      }
                    >
                      {addTaskForm.startTime
                        ? formatTimeForDisplay(addTaskForm.startTime)
                        : "__:__"}
                    </span>
                    <img
                      src={ArrowDown}
                      alt=""
                      className={`ml-2 h-3 w-3 shrink-0 transition-transform ${openFormDropdown === "type_start_time" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFormDropdown === "type_start_time" && (
                    <div
                      ref={formStartTimeMenuRef}
                      className="absolute top-full left-0 z-20 mt-2 w-full min-w-[200px] rounded-lg border border-[#AEACAC52] bg-white overflow-hidden shadow-none"
                    >
                      <TimePickerWheel
                        value={addTaskForm.startTime}
                        onChange={(v) =>
                          setAddTaskForm((f) => ({ ...f, startTime: v }))
                        }
                        onClose={() => setOpenFormDropdown(null)}
                      />
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Select End Time <span className="text-[#DD4342]">*</span>
                  </label>
                  <button
                    ref={formEndTimeTriggerRef}
                    type="button"
                    onClick={() =>
                      setOpenFormDropdown((d) =>
                        d === "type_end_time" ? null : "type_end_time",
                      )
                    }
                    className="flex w-full items-center justify-between rounded-[5px] bg-[#F2F3F4] border border-transparent px-4 py-2 text-left text-[14px] font-Gantari focus:border-[#AEACAC52] outline-none shadow-none transition-all cursor-pointer"
                  >
                    <span
                      className={
                        addTaskForm.dueTime
                          ? "text-[#353535]"
                          : "text-[#8B8B8B]"
                      }
                    >
                      {addTaskForm.dueTime
                        ? formatTimeForDisplay(addTaskForm.dueTime)
                        : "__:__"}
                    </span>
                    <img
                      src={ArrowDown}
                      alt=""
                      className={`ml-2 h-3 w-3 shrink-0 transition-transform ${openFormDropdown === "type_end_time" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFormDropdown === "type_end_time" && (
                    <div
                      ref={formEndTimeMenuRef}
                      className="absolute top-full left-0 z-20 mt-2 w-full min-w-[200px] rounded-lg border border-[#AEACAC52] bg-white overflow-hidden shadow-none"
                    >
                      <TimePickerWheel
                        value={addTaskForm.dueTime}
                        onChange={(v) =>
                          setAddTaskForm((f) => ({ ...f, dueTime: v }))
                        }
                        onClose={() => setOpenFormDropdown(null)}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Assign To <span className="text-[#DD4342]">*</span>
                  </label>
                  <FormDropdown
                    label="Select Assign To"
                    options={getAssignToOptions()}
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
                    searchable
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Description <span className="text-[#DD4342]">*</span>
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
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Checklist
                </label>
                <input
                  type="text"
                  value={addTaskForm.checklist}
                  onChange={(e) =>
                    setAddTaskForm((f) => ({ ...f, checklist: e.target.value }))
                  }
                  placeholder="Enter Reference Link"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <span className="block text-[16px] font-semibold text-[#000000] font-Gantari">
                  Attachments
                </span>
                <div className="flex items-center bg-[#F2F3F4] rounded-[5px] overflow-hidden">
                  <div className="flex-1 px-4 text-[14px] text-[#979797] truncate min-w-0 py-2">
                    {totalAttachmentCount > 0
                      ? `${totalAttachmentCount} file(s) attached`
                      : "Choose file"}
                  </div>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openFilePicker();
                    }}
                    className="px-5 py-2 bg-[#E2E2E2] text-[#8B8B8B] text-[14px] cursor-pointer transition-colors shrink-0 font-Gantari border-0"
                  >
                    Browse File
                  </button>
                </div>
                {totalAttachmentCount > 0 && (
                  <div className="flex flex-col gap-2">
                    {attachmentFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}-${file.size}`}
                        className="flex items-center gap-2 rounded-[5px] bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#101827]"
                      >
                        <div className="min-w-0 flex-1">
                          <span
                            className="block truncate font-Gantari"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                          <span className="text-xs text-[#8B8B8B]">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openAttachmentInNewTab(file)}
                            className="p-1.5 rounded hover:bg-[#E2E2E2] cursor-pointer"
                            title="View in new tab"
                            aria-label={`View ${file.name} in new tab`}
                          >
                            <img src={viewIcon} alt="" className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAttachmentDelete({ type: "local", index })
                            }
                            className="p-1.5 rounded hover:bg-[#E2E2E2] cursor-pointer"
                            title="Remove"
                            aria-label={`Remove ${file.name}`}
                          >
                            <img src={deleteIcon} alt="" className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8">
              <button
                type="button"
                onClick={goBack}
                className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all font-Gantari min-w-[160px] cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={addSubmitting}
                className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] transition-all font-Gantari min-w-[160px] cursor-pointer disabled:opacity-50"
              >
                {addSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
        {pendingAttachmentDelete !== null && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setPendingAttachmentDelete(null)}
            role="presentation"
          >
            <div
              className="w-full max-w-[520px] rounded-md bg-white p-8 shadow-xl font-Gantari"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="attachment-delete-title-pm"
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPendingAttachmentDelete(null)}
                  className="absolute left-0 top-0 shrink-0 rounded-md p-1 bg-[#E8E8E8] cursor-pointer border-0 bg-transparent"
                  aria-label="Close"
                >
                  <img
                    src={closeButtonIcon}
                    alt=""
                    className="h-5 w-5"
                    aria-hidden
                  />
                </button>
                <p
                  id="attachment-delete-title-pm"
                  className="mx-auto max-w-full px-10 text-center text-[16px] leading-relaxed text-[#353535] font-Gantari"
                >
                  Are you sure you want to delete{" "}
                  <strong className="font-semibold text-[#353535]">
                    {pendingDeleteFileName}
                  </strong>
                  ?
                </p>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPendingAttachmentDelete(null)}
                  className="min-w-[140px] rounded-md bg-[#F2F2F2] px-8 py-2 text-[14px] font-semibold text-[#353535] cursor-pointer transition-opacity hover:opacity-90 border-0"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveAttachment}
                  className="min-w-[140px] rounded-md bg-[#FED9D9] px-8 py-2 text-[14px] font-semibold text-[#E00100] cursor-pointer transition-opacity hover:opacity-90 border-0"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
