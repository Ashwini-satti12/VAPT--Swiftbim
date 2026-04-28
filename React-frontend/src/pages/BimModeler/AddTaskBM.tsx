import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../lib/api";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import { TimePickerWheel } from "../../components/TimePickerWheel";
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";
import {
  formatTimeForDisplay,
  FormDropdown,
  TaskDropdown,
  formatFileSize,
  taskToFormValues,
  type FormDropdownId,
  type Task,
  type Employee,
  type Project,
} from "./MytaskBM";

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
  reviewRemark: "",
};

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

function parseOutputFilepaths(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getTaskOutputFileUrl(storedFilename: string): string {
  if (!storedFilename) return "";
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return `${base}/uploads/task/${encodeURIComponent(storedFilename)}`;
}

function displayNameFromStoredFilename(stored: string): string {
  const m =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_(.+)$/i.exec(
      stored,
    );
  return m ? m[1] : stored;
}

function openServerOutputInNewTab(storedFilename: string) {
  const url = getTaskOutputFileUrl(storedFilename);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

type PendingAttachmentDelete =
  | { type: "local"; index: number }
  | { type: "server"; stored: string };

export default function AddTaskBM() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingTask = location.state?.task as Task | undefined;
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [addError, setAddError] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [list, setList] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [addTaskForm, setAddTaskForm] = useState(initialForm);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingOutputFilenames, setExistingOutputFilenames] = useState<
    string[]
  >([]);
  const [openFormDropdown, setOpenFormDropdown] =
    useState<FormDropdownId>(null);
  const [tasklistOpen, setTasklistOpen] = useState(false);
  const [pendingAttachmentDelete, setPendingAttachmentDelete] =
    useState<PendingAttachmentDelete | null>(null);
  const [serverAttachmentDeleting, setServerAttachmentDeleting] =
    useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formProjectTriggerRef = useRef<any>(null);
  const formProjectMenuRef = useRef<HTMLDivElement>(null);
  const formModuleTriggerRef = useRef<any>(null);
  const formModuleMenuRef = useRef<HTMLDivElement>(null);
  const formTypeTriggerRef = useRef<any>(null);
  const formTypeMenuRef = useRef<HTMLDivElement>(null);
  const formAssignTriggerRef = useRef<any>(null);
  const formAssignMenuRef = useRef<HTMLDivElement>(null);
  const formStartTimeTriggerRef = useRef<HTMLButtonElement>(null);
  const formStartTimeMenuRef = useRef<HTMLDivElement>(null);
  const formEndTimeTriggerRef = useRef<HTMLButtonElement>(null);
  const formEndTimeMenuRef = useRef<HTMLDivElement>(null);
  const tasklistTriggerRef = useRef<HTMLButtonElement>(null);
  const tasklistMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/tasks"),
      api.get<{ employees?: Employee[] }>("/api/employees"),
      api.get<{ projects?: Record<string, unknown>[] }>("/api/projects"),
      api.get<{ projects?: Record<string, unknown>[] }>(
        "/api/vendors/vendor-projects",
      ),
    ]).then(([tasksRes, empRes, projRes1, projRes2]) => {
      setList(tasksRes.data.tasks ?? []);
      setEmployees(
        (empRes.data.employees ?? []).filter(
          isEmployeeActiveForProjectAssignment,
        ),
      );

      const mapProj = (r: Record<string, any>, defaultSource: string) => ({
        id: Number(r.id),
        project_name: String(r.project_name || ""),
        tasks: String(r.tasks || ""),
        modules: String(r.modules || ""),
        source: (r.source || defaultSource) as "Outsource" | "In House",
        project_manager_name: String(r.project_manager_name || ""),
        lead_name: String(r.lead_name || ""),
        bim_coordinator_name: String(r.bim_coordinator_name || ""),
        uploader_name: String(r.uploader_name || ""),
        members_names: Array.isArray(r.members_names)
          ? r.members_names.map(String)
          : [],
        members: String(r.members || ""),
      });
      const p1 = (projRes1.data.projects ?? []).map((r) =>
        mapProj(r, "In House"),
      );
      const p2 = (projRes2.data.projects ?? []).map((r) =>
        mapProj(r, "Outsource"),
      );

      setProjects([...p1, ...p2]);
    });
  }, []);

  useEffect(() => {
    if (!editingTask) {
      setEditingTaskId(null);
      setExistingOutputFilenames([]);
      return;
    }
    setEditingTaskId(editingTask.id);
    setAddTaskForm(taskToFormValues(editingTask));
    setAttachmentFiles([]);
    setExistingOutputFilenames(
      parseOutputFilepaths(editingTask.outputfilepath),
    );
  }, [editingTask]);

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
    const picked = Array.from(files);
    setAttachmentFiles((prev) => [...prev, ...picked]);
    requestAnimationFrame(() => {
      input.value = "";
    });
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const confirmRemoveAttachment = () => {
    if (!pendingAttachmentDelete) return;
    if (pendingAttachmentDelete.type === "local") {
      setAttachmentFiles((prev) =>
        prev.filter(
          (_, i) => i !== (pendingAttachmentDelete as { index: number }).index,
        ),
      );
      setPendingAttachmentDelete(null);
      toast.error("Deleted successfully");
      return;
    }
    const stored = pendingAttachmentDelete.stored;
    const taskId = editingTaskId;
    if (taskId == null) {
      setPendingAttachmentDelete(null);
      return;
    }
    setServerAttachmentDeleting(true);
    const next = existingOutputFilenames.filter((f) => f !== stored);
    const newPath = next.length > 0 ? next.join(",") : "";
    api
      .patch(`/api/tasks/${taskId}`, { outputfilepath: newPath })
      .then(() => {
        setExistingOutputFilenames(next);
        setPendingAttachmentDelete(null);
        toast.error("Deleted successfully");
      })
      .catch(() => {
        setAddError("Failed to remove attachment. Please try again.");
      })
      .finally(() => setServerAttachmentDeleting(false));
  };

  const pendingDeleteFileName = (() => {
    if (!pendingAttachmentDelete) return "";
    if (pendingAttachmentDelete.type === "local") {
      return attachmentFiles[pendingAttachmentDelete.index]?.name ?? "";
    }
    return displayNameFromStoredFilename(pendingAttachmentDelete.stored);
  })();

  const merged = list.filter(Boolean);
  const totalAttachmentCount =
    existingOutputFilenames.length + attachmentFiles.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    const requiredFields: (keyof typeof addTaskForm)[] = [
      "projectName",
      "module",
      "taskName",
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
      setAddError("Start Date cannot be in the past.");
      return;
    }
    if (addTaskForm.actualEndDate < addTaskForm.actualStartDate) {
      setAddError("End Date cannot be before Start Date.");
      return;
    }

    setAddSubmitting(true);
    const payload = {
      projectid:
        projects.find((p) => p.project_name === addTaskForm.projectName)?.id ||
        addTaskForm.projectName,
      taskName: addTaskForm.taskName,
      category: addTaskForm.type || "task",
      startdate: addTaskForm.actualStartDate,
      dueDate: addTaskForm.actualEndDate,
      startTime: addTaskForm.startTime,
      dueTime: addTaskForm.dueTime,
      assignedTo:
        employees.find((e) => e.full_name === addTaskForm.assignTo)?.id ||
        addTaskForm.assignTo,
      description: addTaskForm.description,
      modules: addTaskForm.module,
    };

    const handleFiles = (taskId: number | string) => {
      if (attachmentFiles.length > 0) {
        const formData = new FormData();
        attachmentFiles.forEach((f) => formData.append("image", f));
        api.post(`/api/tasks/${taskId}/output-files`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    };

    const selectedProj = projects.find(
      (p) => p.project_name === addTaskForm.projectName,
    );
    const isOutsource = selectedProj?.source === "Outsource";
    const baseEndpoint = isOutsource
      ? "/api/vendors/vendor-tasks"
      : "/api/tasks";

    if (editingTaskId != null) {
      const patchBody = isOutsource
        ? {
          task_name: payload.taskName,
          assigned_to: payload.assignedTo,
          due_date: payload.dueDate,
          category: payload.category,
          description: payload.description,
          modules: payload.modules,
          start_date: payload.startdate,
          start_time: payload.startTime,
          end_time: payload.dueTime,
          project_id: selectedProj?.id,
        }
        : {
          task_name: payload.taskName,
          assigned_to: payload.assignedTo,
          due_date: payload.dueDate,
          category: payload.category,
          description: payload.description,
          modules_name: payload.modules,
          Actual_start_time: payload.startdate,
          perferstart_time: payload.startTime,
          perferend_time: payload.dueTime,
        };
      api
        .patch(`${baseEndpoint}/${editingTaskId}`, patchBody)
        .then(() => {
          handleFiles(editingTaskId);
          toast.success("Updated successfully");
          navigate("/bm/mytasks");
        })
        .catch((err) => {
          setAddError(err.response?.data?.message || "Failed to update task.");
        })
        .finally(() => setAddSubmitting(false));
    } else {
      api
        .post(baseEndpoint, payload)
        .then((res) => {
          if (res.data.success && res.data.task_id) {
            handleFiles(res.data.task_id);
            toast.success("Task added successfully");
            navigate("/bm/mytasks");
          }
        })
        .catch((err) => {
          setAddError(err.response?.data?.message || "Failed to create task.");
        })
        .finally(() => setAddSubmitting(false));
    }
  };

  const goBack = () => navigate("/bm/mytasks");

  const getAssignToOptions = () => {
    if (!addTaskForm.projectName) {
      return [
        { value: "", label: "Select Assign To" },
        ...employees.map((e) => ({ value: e.full_name, label: e.full_name })),
      ];
    }
    const proj = projects.find(
      (p) => p.project_name === addTaskForm.projectName,
    );
    if (!proj) {
      return [
        { value: "", label: "Select Assign To" },
        ...employees.map((e) => ({ value: e.full_name, label: e.full_name })),
      ];
    }
    const involvedNames = new Set<string>();

    const addNames = (val: string | undefined | null) => {
      if (!val) return;
      val.split(",").forEach((n) => {
        const trimmed = n.trim();
        const cleaned = trimmed.replace(/\u00a0/g, " ").toLowerCase();
        if (cleaned) involvedNames.add(cleaned);
      });
    };

    addNames(proj.project_manager_name);
    addNames(proj.lead_name);
    addNames(proj.bim_coordinator_name);
    addNames(proj.uploader_name);

    if (Array.isArray(proj.members_names)) {
      proj.members_names.forEach((name) => {
        if (name) {
          const cleaned = name
            .replace(/\u00a0/g, " ")
            .trim()
            .toLowerCase();
          if (cleaned) involvedNames.add(cleaned);
        }
      });
    }

    const filteredEmployees = employees.filter((e) => {
      if (!e.full_name) return false;
      const empName = e.full_name
        .replace(/\u00a0/g, " ")
        .trim()
        .toLowerCase();
      return involvedNames.has(empName);
    });

    return [
      { value: "", label: "Select Assign To" },
      ...filteredEmployees.map((e) => ({
        value: e.full_name,
        label: e.full_name,
      })),
    ];
  };

  return (
    <div className="flex-1 min-h-0 px-5 py-2 bg-white overflow-hidden">
      <div className="max-w-[1174px] mx-auto h-full min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-4 sm:mb-6 relative flex-shrink-0">
          <div className="relative group inline-flex shrink-0">
            <button
              type="button"
              onClick={goBack}
              className="p-2 rounded-md bg-[#F2F2F2] text-[#353535] transition-all cursor-pointer"
            >
              <img src={backIcon} alt="Back" className="w-5 h-5" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-1 relative z-10">
                <span className="font-Gantari text-[12px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                  Go Back
                </span>
              </div>
            </div>
          </div>
          <h3 className="text-[20px] sm:text-[24px] font-medium text-[#000000] font-Gantari text-center flex-1">
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
                  label="Select Project name"
                  options={[
                    { value: "", label: "Select Project name" },
                    ...projects.filter((p) => p.source !== "Outsource").map((p) => ({
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
                    ...(projects.find(
                      (p) => p.project_name === addTaskForm.projectName,
                    )?.modules
                      ? (projects
                        .find(
                          (p) => p.project_name === addTaskForm.projectName,
                        )!
                        .modules!.split(",")
                        .map((m) => m.trim())
                        .filter(Boolean)
                        .map((m) => ({ value: m, label: m })) as {
                          value: string;
                          label: string;
                        }[])
                      : []),
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
                <div className="relative flex items-stretch overflow-hidden rounded-[5px] border border-transparent bg-[#F2F3F4] transition-colors focus-within:border-[#AEACAC52]">
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
                    className="min-w-0 flex-1 border-0 bg-transparent px-4 py-[7px] text-[14px] font-Gantari text-[#353535] outline-none placeholder-[#8B8B8B]"
                  />

                </div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-2 gap-x-10 gap-y-6">

                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Start Date <span className="text-[#DD4342]">*</span>
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
                    placeholder="dd/mm/yyyy"
                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    End Date <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="date"
                    value={addTaskForm.actualEndDate}
                    min={
                      addTaskForm.actualStartDate ||
                      new Date().toISOString().split("T")[0]
                    }
                    onChange={(e) =>
                      setAddTaskForm((f) => ({
                        ...f,
                        actualEndDate: e.target.value,
                      }))
                    }
                    placeholder="dd/mm/yyyy"
                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6">
                <div className="relative w-full">
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
                <div className="relative w-full">
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

              {addTaskForm.reviewRemark && (
                <div className="md:col-span-2">
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Review Remark
                  </label>
                  <textarea
                    readOnly
                    value={addTaskForm.reviewRemark}
                    placeholder="No review remark"
                    rows={4}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none"
                  />
                </div>
              )}
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
                    {existingOutputFilenames.map((stored) => (
                      <div
                        key={`server-${stored}`}
                        className="flex items-center gap-2 rounded-[5px] bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#101827]"
                      >
                        <div className="min-w-0 flex-1">
                          <span
                            className="block truncate font-Gantari"
                            title={displayNameFromStoredFilename(stored)}
                          >
                            {displayNameFromStoredFilename(stored)}
                          </span>
                          <span className="text-xs text-[#8B8B8B]">
                            Saved on task
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 pr-1">
                          <div className="relative group/tooltip inline-flex shrink-0">
                            <button
                              type="button"
                              onClick={() => openServerOutputInNewTab(stored)}
                              className="p-1.5 rounded hover:bg-[#E2E2E2] cursor-pointer transition-colors"
                            >
                              <img src={viewIcon} alt="View" className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-3 py-1 relative z-10">
                                <span className="font-Gantari text-[13px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                  View
                                </span>
                              </div>
                              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-r border-b border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                            </div>
                          </div>
                          <div className="relative group/tooltip inline-flex shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAttachmentDelete({
                                  type: "server",
                                  stored,
                                })
                              }
                              className="p-1.5 rounded hover:bg-[#E2E2E2] cursor-pointer transition-colors"
                            >
                              <img src={deleteIcon} alt="Remove" className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-3 py-1 relative z-10">
                                <span className="font-Gantari text-[13px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                  Remove
                                </span>
                              </div>
                              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-r border-b border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
                        <div className="flex shrink-0 items-center gap-2 pr-1">
                          <div className="relative group/tooltip inline-flex shrink-0">
                            <button
                              type="button"
                              onClick={() => openAttachmentInNewTab(file)}
                              className="p-1.5 rounded hover:bg-[#E2E2E2] cursor-pointer transition-colors"
                            >
                              <img src={viewIcon} alt="View" className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-3 py-1 relative z-10">
                                <span className="font-Gantari text-[13px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                  View
                                </span>
                              </div>
                              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-r border-b border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                            </div>
                          </div>
                          <div className="relative group/tooltip inline-flex shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAttachmentDelete({
                                  type: "local",
                                  index,
                                })
                              }
                              className="p-1.5 rounded hover:bg-[#E2E2E2] cursor-pointer transition-colors"
                            >
                              <img src={deleteIcon} alt="Remove" className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-3 py-1 relative z-10">
                                <span className="font-Gantari text-[13px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                  Remove
                                </span>
                              </div>
                              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-r border-b border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                            </div>
                          </div>
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
                className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all font-Gantari cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={addSubmitting}
                className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] transition-all font-Gantari cursor-pointer disabled:opacity-50"
              >
                {addSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {pendingAttachmentDelete !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() =>
            !serverAttachmentDeleting && setPendingAttachmentDelete(null)
          }
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-[#353535]">
                Remove Attachment
              </h3>
            </div>
            <div className="px-6 py-8 text-center text-[#1A1A1A]">
              <p className="mb-1">
                Are you sure you want to remove this attachment?
              </p>
              <p className="font-semibold truncate max-w-full px-4">
                {pendingDeleteFileName}
              </p>
            </div>
            <div className="flex justify-center gap-3 px-6 py-4 bg-slate-50">
              <button
                type="button"
                disabled={serverAttachmentDeleting}
                onClick={() => setPendingAttachmentDelete(null)}
                className="rounded-md bg-white border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={serverAttachmentDeleting}
                onClick={confirmRemoveAttachment}
                className="rounded-md bg-[#FFD9D9] px-5 py-2 text-sm font-medium text-[#E00100] hover:bg-red-100 cursor-pointer disabled:opacity-50"
              >
                {serverAttachmentDeleting ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
