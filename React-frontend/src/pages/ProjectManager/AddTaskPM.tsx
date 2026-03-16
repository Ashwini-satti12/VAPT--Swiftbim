import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../lib/api";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import { TimePickerWheel } from "../../components/TimePickerWheel";
import { AttachmentPreviewModal } from "../../components/AttachmentPreviewModal";

function formatTimeForDisplay(value: string): string {
  if (!value || !value.match(/^\d{1,2}:\d{2}$/)) return "--:--";
  const [hStr, mStr] = value.split(":");
  const h24 = parseInt(hStr, 10);
  const m = mStr || "00";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${h12}:${m} ${ampm}`;
}

type FormDropdownId =
  | "project"
  | "module"
  | "taskName"
  | "type"
  | "assignTo"
  | "type_start_time"
  | "type_end_time"
  | null;

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
  searchable?: boolean;
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
  searchable = false,
}: FormDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const displayLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : label;
  const filteredOptions = searchable
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.value === "",
      )
    : options;

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`w-full flex items-center justify-between px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] border border-transparent font-Gantari transition-all outline-none ${value ? "text-[#353535]" : "text-[#8B8B8B]"} ${isOpen ? "!border-[#AEACAC52]" : ""} focus:border-[#AEACAC52]`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span>{displayLabel}</span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
          className="absolute top-full left-0 z-20 mt-1 w-full rounded-[5px] border border-[#E0E0E0] bg-white py-1 shadow-lg"
        >
          {searchable && (
            <div className="px-2 pb-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Search..."
                className="w-full rounded border border-slate-200 px-2 py-1 text-[14px] text-[#353535] placeholder-[#8B8B8B]"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                onClick={() => {
                  onChange(opt.value);
                  setSearchQuery("");
                  onClose();
                }}
                className="block w-full px-4 py-2 text-left text-[14px] text-[#8B8B8B] font-Gantari hover:text-[#353535] hover:bg-[#F4F4F4]"
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function AttachmentPreviewItem({
  file,
  onRemove,
  onPreviewClick,
}: {
  file: File;
  onRemove: () => void;
  onPreviewClick?: (file: File) => void;
}) {
  const isImage = file.type.startsWith("image/");
  const [previewUrl] = useState<string | null>(() =>
    isImage ? URL.createObjectURL(file) : null,
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  return (
    <li className="flex items-center gap-3 rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#101827] font-Gantari">
      <button
        type="button"
        onClick={() => onPreviewClick?.(file)}
        className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-90"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded object-cover border border-slate-200 cursor-pointer"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-slate-500 cursor-pointer">
            <svg
              className="h-6 w-6"
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
        )}
        <div className="min-w-0 flex-1">
          <span className="truncate block" title={file.name}>
            {file.name}
          </span>
          <span className="text-[12px] text-[#8B8B8B]">
            {formatFileSize(file.size)}
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-0.5 rounded text-[#353535] hover:bg-slate-200"
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
    </li>
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
  created_at?: string;
}

interface Employee {
  id: number;
  full_name: string;
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
      t.start_time ?? t.startTime ?? t.Actual_start_time ?? "",
    ),
    dueTime: timeOnly(t.due_time ?? t.dueTime ?? t.end_time ?? ""),
    assignTo: str(t.assign_to ?? t.assignTo ?? t.assigned_to ?? ""),
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
  const [attachmentPreviewFile, setAttachmentPreviewFile] =
    useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formProjectTriggerRef = useRef<HTMLButtonElement>(null);
  const formProjectMenuRef = useRef<HTMLDivElement>(null);
  const formModuleTriggerRef = useRef<HTMLButtonElement>(null);
  const formModuleMenuRef = useRef<HTMLDivElement>(null);
  const formTaskNameTriggerRef = useRef<HTMLButtonElement>(null);
  const formTaskNameMenuRef = useRef<HTMLDivElement>(null);
  const formTypeTriggerRef = useRef<HTMLButtonElement>(null);
  const formTypeMenuRef = useRef<HTMLDivElement>(null);
  const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
  const formAssignMenuRef = useRef<HTMLDivElement>(null);
  const formStartTimeTriggerRef = useRef<HTMLButtonElement>(null);
  const formStartTimeMenuRef = useRef<HTMLDivElement>(null);
  const formEndTimeTriggerRef = useRef<HTMLButtonElement>(null);
  const formEndTimeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ employees?: Employee[] }>("/api/employees"),
      api.get<{ projects?: Project[] }>("/api/projects"),
    ]).then(([empRes, projRes]) => {
      setEmployees(empRes.data.employees ?? []);
      setProjects(projRes.data.projects ?? []);
    });
  }, []);

  useEffect(() => {
    if (editingTask) setAddTaskForm(taskToFormValues(editingTask));
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
    if (openFormDropdown === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const refs: React.RefObject<HTMLElement | null>[] =
        openFormDropdown === "project"
          ? [formProjectTriggerRef, formProjectMenuRef]
          : openFormDropdown === "module"
            ? [formModuleTriggerRef, formModuleMenuRef]
            : openFormDropdown === "taskName"
              ? [formTaskNameTriggerRef, formTaskNameMenuRef]
              : openFormDropdown === "type"
                ? [formTypeTriggerRef, formTypeMenuRef]
                : openFormDropdown === "type_start_time"
                  ? [formStartTimeTriggerRef, formStartTimeMenuRef]
                  : openFormDropdown === "type_end_time"
                    ? [formEndTimeTriggerRef, formEndTimeMenuRef]
                    : [formAssignTriggerRef, formAssignMenuRef];
      const inside = refs.some((r) => r.current && r.current.contains(target));
      if (!inside) setOpenFormDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openFormDropdown]);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files?.length) return;
    setAttachmentFiles((prev) => [...prev, ...Array.from(files)]);
    e.currentTarget.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const goBack = () => navigate("/tasks");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
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
        startTime: addTaskForm.startTime,
        dueTime: addTaskForm.dueTime,
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

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden p-2 bg-white">
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1174px] mx-auto">
          <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
            <button
              type="button"
              onClick={goBack}
              className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all"
              title="Back"
            >
              <img src={backIcon} alt="Back" className="w-5 h-5" />
            </button>
            <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
              {editingTaskId !== null ? "Edit Task" : "Add New Task"}
            </h3>
            <div className="w-10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {addError && (
              <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">
                  !
                </div>
                <div className="flex-1">
                  <p className="font-semibold leading-snug">Validation error</p>
                  <p className="mt-0.5 text-[13px] leading-snug">{addError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <div className="md:col-span-2">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Project Name
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
                  Select Module
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
                  Task Name
                </label>
                <FormDropdown
                  label="Select Task"
                  options={[
                    { value: "", label: "Select Task" },
                    ...(projects.find(
                      (p) => p.project_name === addTaskForm.projectName,
                    )?.tasks
                      ? projects
                          .find(
                            (p) => p.project_name === addTaskForm.projectName,
                          )!
                          .tasks!.split(",")
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((t) => ({ value: t, label: t }))
                      : []),
                  ]}
                  value={addTaskForm.taskName}
                  onChange={(v) =>
                    setAddTaskForm((f) => ({ ...f, taskName: v }))
                  }
                  isOpen={openFormDropdown === "taskName"}
                  onToggle={() =>
                    setOpenFormDropdown((d) =>
                      d === "taskName" ? null : "taskName",
                    )
                  }
                  onClose={() => setOpenFormDropdown(null)}
                  triggerRef={formTaskNameTriggerRef}
                  dropdownRef={formTaskNameMenuRef}
                  searchable
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6">
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
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
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Actual Start Date
                  </label>
                  <input
                    type="date"
                    value={addTaskForm.actualStartDate}
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
                    Actual End Date
                  </label>
                  <input
                    type="date"
                    value={addTaskForm.actualEndDate}
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
                    Select Start Time
                  </label>
                  <button
                    ref={formStartTimeTriggerRef}
                    type="button"
                    onClick={() =>
                      setOpenFormDropdown((d) =>
                        d === "type_start_time" ? null : "type_start_time",
                      )
                    }
                    className="flex w-full items-center justify-between px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] font-Gantari border border-transparent focus:border-[#AEACAC52] outline-none"
                  >
                    <span
                      className={
                        addTaskForm.startTime
                          ? "text-[#353535]"
                          : "text-[#8B8B8B]"
                      }
                    >
                      {formatTimeForDisplay(addTaskForm.startTime) || "__:__"}
                    </span>
                    <svg
                      className="ml-2 h-4 w-4 shrink-0"
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
                  {openFormDropdown === "type_start_time" && (
                    <div
                      ref={formStartTimeMenuRef}
                      className="absolute top-full left-0 z-20 mt-1"
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
                    Select End Time
                  </label>
                  <button
                    ref={formEndTimeTriggerRef}
                    type="button"
                    onClick={() =>
                      setOpenFormDropdown((d) =>
                        d === "type_end_time" ? null : "type_end_time",
                      )
                    }
                    className="flex w-full items-center justify-between px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] font-Gantari border border-transparent focus:border-[#AEACAC52] outline-none"
                  >
                    <span
                      className={
                        addTaskForm.dueTime
                          ? "text-[#353535]"
                          : "text-[#8B8B8B]"
                      }
                    >
                      {formatTimeForDisplay(addTaskForm.dueTime) || "__:__"}
                    </span>
                    <svg
                      className="ml-2 h-4 w-4 shrink-0"
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
                  {openFormDropdown === "type_end_time" && (
                    <div
                      ref={formEndTimeMenuRef}
                      className="absolute top-full left-0 z-20 mt-1"
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
                    Assign To
                  </label>
                  <FormDropdown
                    label="Select Assign To"
                    options={[
                      { value: "", label: "Select Assign To" },
                      ...employees.map((e) => ({
                        value: e.full_name,
                        label: e.full_name,
                      })),
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
                    searchable
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
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
              <div className="md:col-span-2">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Attachments
                </label>
                <input
                  ref={fileInputRef}
                  id="add-task-file-input"
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={handleAttachmentChange}
                  accept="*/*"
                />
                <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden">
                  <div className="flex-1 px-4 py-2 text-[14px] text-[#979797] font-Gantari truncate">
                    {attachmentFiles.length > 0
                      ? attachmentFiles.map((f) => f.name).join(", ")
                      : "Choose file"}
                  </div>
                  <label
                    htmlFor="add-task-file-input"
                    className="px-5 py-2 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer font-Gantari shrink-0"
                  >
                    Browse File
                  </label>
                </div>
                {attachmentFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {attachmentFiles.map((file, index) => (
                      <AttachmentPreviewItem
                        key={`${file.name}-${index}-${file.size}`}
                        file={file}
                        onRemove={() => removeAttachment(index)}
                        onPreviewClick={setAttachmentPreviewFile}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8">
              <button
                type="button"
                onClick={goBack}
                className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] font-Gantari transition-all min-w-[160px]"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={addSubmitting}
                className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] font-Gantari disabled:opacity-50 transition-all min-w-[160px]"
              >
                {addSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <AttachmentPreviewModal
        file={attachmentPreviewFile}
        onClose={() => setAttachmentPreviewFile(null)}
      />
    </div>
  );
}
