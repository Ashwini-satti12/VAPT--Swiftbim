import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../lib/api";
import toast from "react-hot-toast";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import closeButtonIcon from "../../assets/ProductNavbarIcons/close button.svg";
import { useAuth } from "../../contexts/AuthContext";

import {
  FormDropdown,
  TaskDropdown,
  type FormDropdownId,
  type Task,
  type Employee,
  type Project,
  toInputDate,
  getTodayInputDate,
  isEndTimeBeforeStartOnSameDay,
  buildFormFromTask,
} from "./MytaskV";

const initialForm = {
  projectName: "",
  module: "",
  taskName: "",
  type: "task",
  actualStartDate: "",
  actualEndDate: "",
  startTime: "",
  dueTime: "",
  assignTo: "",
  description: "",
};

export default function AddTaskV() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const editingTask = location.state?.task as Task | undefined;
  const fromState = location.state?.from;
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [addError, setAddError] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [addTaskForm, setAddTaskForm] = useState(initialForm);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingAttachmentNames, setExistingAttachmentNames] = useState<
    string[]
  >([]);
  const [openFormDropdown, setOpenFormDropdown] =
    useState<FormDropdownId>(null);
  const [tasklistOpen, setTasklistOpen] = useState(false);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loadingRecentTasks, setLoadingRecentTasks] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachmentDelete, setPendingAttachmentDelete] = useState<{
    type: "local" | "server";
    index?: number;
    name?: string;
  } | null>(null);
  const [serverAttachmentDeleting, setServerAttachmentDeleting] =
    useState(false);
  const formProjectTriggerRef = useRef<HTMLButtonElement>(null);
  const formProjectMenuRef = useRef<HTMLDivElement>(null);
  const formModuleTriggerRef = useRef<HTMLButtonElement>(null);
  const formModuleMenuRef = useRef<HTMLDivElement>(null);
  const formTypeTriggerRef = useRef<HTMLButtonElement>(null);
  const formTypeMenuRef = useRef<HTMLDivElement>(null);
  const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
  const formAssignMenuRef = useRef<HTMLDivElement>(null);
  const tasklistRef = useRef<HTMLDivElement>(null);

  const todayInputDate = getTodayInputDate();

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
        toast.error("Failed to fetch initial data");
      });
  }, []);

  useEffect(() => {
    if (editingTask) {
      setEditingTaskId(editingTask.id);
      setAddTaskForm(buildFormFromTask(editingTask, employees));
      setAttachmentFiles([]);
      setExistingAttachmentNames(
        String(editingTask.outputfilepath || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
  }, [editingTask, employees]);

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

  useEffect(() => {
    if (!tasklistOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tasklistRef.current &&
        !tasklistRef.current.contains(e.target as Node)
      ) {
        setTasklistOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tasklistOpen]);

  const openFilePicker = () => {
    requestAnimationFrame(() => {
      fileInputRef.current?.click();
    });
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = input.files;
    if (!files?.length) return;
    setAttachmentFiles((prev) => [...prev, ...Array.from(files)]);
    requestAnimationFrame(() => {
      input.value = "";
    });
  };

  const confirmRemoveAttachment = async () => {
    if (!pendingAttachmentDelete) return;

    if (pendingAttachmentDelete.type === "local") {
      const idx = pendingAttachmentDelete.index!;
      setAttachmentFiles((prev) => prev.filter((_, i) => i !== idx));
      setPendingAttachmentDelete(null);
      toast.success("File removed");
    } else {
      const fileName = pendingAttachmentDelete.name!;
      if (editingTaskId == null) {
        setPendingAttachmentDelete(null);
        return;
      }
      setServerAttachmentDeleting(true);
      const next = existingAttachmentNames.filter((n) => n !== fileName);
      const newPath = next.length > 0 ? next.join(",") : "";

      try {
        await api.patch(`/api/vendors/vendor-tasks/${editingTaskId}`, {
          outputfilepath: newPath,
        });
        setExistingAttachmentNames(next);
        setPendingAttachmentDelete(null);
        toast.success("File removed successfully");
      } catch (err) {
        toast.error("Failed to remove attachment from server");
      } finally {
        setServerAttachmentDeleting(false);
      }
    }
  };

  const displayNameFromStoredFilename = (stored: string) => {
    if (!stored) return "Unknown File";
    // backend puts {uuid}_{orig} or just {orig}
    const m =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_(.+)$/i.exec(
        stored,
      );
    return m ? m[1] : stored;
  };

  const getTaskOutputFileUrl = (storedFilename: string) => {
    if (!storedFilename) return "";
    const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    return `${base}/uploads/task/${encodeURIComponent(storedFilename)}`;
  };

  const openAttachmentInNewTab = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 300_000);
  };

  const openServerOutputInNewTab = (filename: string) => {
    const url = getTaskOutputFileUrl(filename);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalAttachmentCount =
    attachmentFiles.length + existingAttachmentNames.length;
  const pendingDeleteFileName =
    pendingAttachmentDelete?.type === "local"
      ? attachmentFiles[pendingAttachmentDelete.index!]?.name
      : displayNameFromStoredFilename(pendingAttachmentDelete?.name || "");

  const fetchRecentTasks = () => {
    if (tasklistOpen) {
      setTasklistOpen(false);
      return;
    }
    setLoadingRecentTasks(true);
    api
      .get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks")
      .then((res) => {
        setRecentTasks((res.data.tasks ?? []).slice(0, 10));
        setTasklistOpen(true);
      })
      .finally(() => setLoadingRecentTasks(false));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    const requiredFields: (keyof typeof addTaskForm)[] = [
      "projectName",
      "module",
      "taskName",
      // "type",
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

    if (addTaskForm.actualStartDate < todayInputDate && !editingTaskId) {
      toast.error("Start date cannot be in the past.");
      return;
    }

    if (addTaskForm.actualEndDate < addTaskForm.actualStartDate) {
      toast.error("End date cannot be before start date.");
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
      toast.error("End time must be after start time on the same day.");
      return;
    }

    setAddSubmitting(true);
    const targetRedirect =
      fromState === "teamtasks" || fromState === "teamtask"
        ? "/v/teamtasks"
        : "/v/mytasks";
    const projectId = projects.find(
      (p) => p.project_name === addTaskForm.projectName,
    )?.id;
    const assigneeId = employeesForAssignDropdown.find(
      (e) => e.full_name === addTaskForm.assignTo,
    )?.id;
    const assignedToVal = assigneeId ?? (addTaskForm.assignTo && !isNaN(Number(addTaskForm.assignTo)) ? Number(addTaskForm.assignTo) : null);

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
      modules: addTaskForm.module,
    };

    if (editingTaskId) {
      api
        .patch(`/api/vendors/vendor-tasks/${editingTaskId}`, {
          task_name: addTaskForm.taskName,
          project_id: projectId,
          due_date: addTaskForm.actualEndDate,
          start_date: addTaskForm.actualStartDate,
          start_time: addTaskForm.startTime,
          end_time: addTaskForm.dueTime,
          category: addTaskForm.type,
          modules: addTaskForm.module,
          assigned_to: assignedToVal,
          description: addTaskForm.description,
          // Reset status to Todo if assignee changed
          ...(String(assignedToVal) !== String(editingTask?.assigned_to) && {
            status: "Todo",
            progress: 0,
            Approval: "",
            review_remark: ""
          })
        })
        .then(async () => {
          if (attachmentFiles.length > 0) {
            const formData = new FormData();
            attachmentFiles.forEach((f) => formData.append("image", f));
            await api.post(
              `/api/vendors/vendor-tasks/${editingTaskId}/output-files`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            );
          }
          toast.success("Task updated");
          navigate(targetRedirect);
        })
        .catch((err) => {
          setAddError(err.response?.data?.message || "Failed to update task");
        })
        .finally(() => setAddSubmitting(false));
    } else {
      api
        .post("/api/vendors/vendor-tasks", payload)
        .then(async (res) => {
          if (res.data.success && res.data.task_id) {
            if (attachmentFiles.length > 0) {
              const formData = new FormData();
              attachmentFiles.forEach((f) => formData.append("image", f));
              await api.post(
                `/api/vendors/vendor-tasks/${res.data.task_id}/output-files`,
                formData,
                {
                  headers: { "Content-Type": "multipart/form-data" },
                },
              );
            }
            toast.success("Task created");
            navigate(targetRedirect);
          }
        })
        .catch((err) => {
          setAddError(err.response?.data?.message || "Failed to create task");
        })
        .finally(() => setAddSubmitting(false));
    }
  };

  const dynamicModuleOptions = useMemo(() => {
    const proj = projects.find(
      (p) => p.project_name === addTaskForm.projectName,
    );
    return (proj?.modules || "")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }, [projects, addTaskForm.projectName]);

  const employeesForAssignDropdown = useMemo(() => {
    let all = Array.isArray(employees) ? [...employees] : [];
    
    // Ensure current user is in the list
    if (user) {
      const userIdStr = String(user.id);
      const alreadyInList = all.some((e) => String(e.id) === userIdStr);
      if (!alreadyInList) {
        all.push({
          id: user.id,
          full_name: user.full_name || user.name || "Me",
          active: "1",
        } as any);
      }
    }

    const meta = projects.find(
      (p) => p.project_name === addTaskForm.projectName,
    );
    const members = (meta?.members || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    
    if (members.length === 0) return all;
    
    return all.filter((e) => {
      const name = (e.full_name || "").trim();
      const idStr = String(e.id);
      const isAllowedByProject = members.some(m => m === idStr || m.toLowerCase() === name.toLowerCase() || name === m);
      const isCurrentUser = String(e.id) === String(user?.id);
      
      return isAllowedByProject || isCurrentUser;
    });
  }, [employees, projects, addTaskForm.projectName, user]);

  const sameCalendarDay =
    addTaskForm.actualStartDate === addTaskForm.actualEndDate;

  return (
    <div className="flex-1 min-h-0 bg-white overflow-hidden font-Gantari">
      <style>{`
        .hide-calendar-icon::-webkit-calendar-picker-indicator {
          display: none !important;
          -webkit-appearance: none;
        }
        .hide-calendar-icon::-webkit-datetime-edit {
          text-transform: uppercase;
        }
      `}</style>
      <div className="max-w-[1174px] mx-auto h-full min-h-0 flex flex-col pt-6 px-6">
        <div className="flex items-center justify-between mb-10 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer group relative"
            aria-label="Back"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">Go Back</span>
              </div>
            </div>
          </button>
          <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] text-center flex-1">
            {editingTaskId ? "Edit Task" : "Add New Task"}
          </h3>
          <div className="w-10" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {addError && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">
                  !
                </div>
                <div className="flex-1">
                  <p className="text-[13px]">{addError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <div className="md:col-span-2">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2">
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
                    setAddTaskForm((f) => ({
                      ...f,
                      projectName: v,
                      module: "",
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
                  searchable
                  bgClass="bg-[#F2F3F4]"
                />
              </div>

              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2">
                  Select Module <span className="text-[#DD4342]">*</span>
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
                  bgClass="bg-[#F2F3F4]"
                />
              </div>

              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2">
                  Task Name <span className="text-[#DD4342]">*</span>
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
                    className="min-w-0 flex-1 border-0 bg-transparent px-4 py-2 text-[14px] font-Gantari text-[#353535] outline-none placeholder-[#8B8B8B]"
                  />

                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-10 gap-y-6">

                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2">
                    Start Date <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="date"
                    min={todayInputDate}
                    value={addTaskForm.actualStartDate}
                    onChange={(e) =>
                      setAddTaskForm((f) => ({
                        ...f,
                        actualStartDate: e.target.value,
                      }))
                    }
                    onClick={(e) => e.currentTarget.showPicker()}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none placeholder-[#8B8B8B] focus:border-[#AEACAC52] cursor-pointer hide-calendar-icon"
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2">
                    End Date <span className="text-[#DD4342]">*</span>
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
                    onClick={(e) => e.currentTarget.showPicker()}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none placeholder-[#8B8B8B] focus:border-[#AEACAC52] cursor-pointer hide-calendar-icon"
                  />
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6">
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2">
                    Select Start Time <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="time"
                    value={addTaskForm.startTime}
                    onChange={(e) =>
                      setAddTaskForm((f) => ({
                        ...f,
                        startTime: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none placeholder-[#8B8B8B] focus:border-[#AEACAC52]"
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2">
                    Select End Time <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="time"
                    min={sameCalendarDay ? addTaskForm.startTime : undefined}
                    value={addTaskForm.dueTime}
                    onChange={(e) =>
                      setAddTaskForm((f) => ({ ...f, dueTime: e.target.value }))
                    }
                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none placeholder-[#8B8B8B] focus:border-[#AEACAC52]"
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2">
                    Assign To <span className="text-[#DD4342]">*</span>
                  </label>
                  <FormDropdown
                    label="Select Assign To"
                    options={[
                      { value: "", label: "Select Assign To" },
                      ...employeesForAssignDropdown.map((e) => ({
                        value: e.full_name,
                        label:
                          String(e.id) === String(user?.id)
                            ? `${e.full_name} (Me)`
                            : e.full_name,
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
                    bgClass="bg-[#F2F3F4]"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2">
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
                  className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none placeholder-[#8B8B8B] resize-none focus:border-[#AEACAC52]"
                />
              </div>


              <div className="md:col-span-2 space-y-2">
                <span className="block text-[16px] font-semibold text-[#000000] font-Gantari">
                  Attachments
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  tabIndex={-1}
                  className="fixed left-[-9999px] top-0 h-px w-px opacity-0"
                  onChange={handleAttachmentChange}
                  accept="*/*"
                />
                <div className="flex bg-[#F2F3F4] rounded-[5px] overflow-hidden">
                  <div className="flex-1 px-4 py-2 text-[14px] text-[#979797] truncate min-w-0">
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
                    {existingAttachmentNames.map((stored) => (
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
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openServerOutputInNewTab(stored)}
                            className="p-1.5 rounded hover:bg-[#E2E2E2] cursor-pointer"
                            title="View in new tab"
                            aria-label={`View ${displayNameFromStoredFilename(stored)} in new tab`}
                          >
                            <img src={viewIcon} alt="" className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAttachmentDelete({
                                type: "server",
                                name: stored,
                              })
                            }
                            className="p-1.5 rounded hover:bg-[#E2E2E2] cursor-pointer"
                            title="Remove"
                            aria-label={`Remove ${displayNameFromStoredFilename(stored)}`}
                          >
                            <img src={deleteIcon} alt="" className="h-5 w-5" />
                          </button>
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
                              setPendingAttachmentDelete({
                                type: "local",
                                index,
                              })
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
                onClick={() => navigate("/v/mytasks")}
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
      </div>

      {pendingAttachmentDelete !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() =>
            !serverAttachmentDeleting && setPendingAttachmentDelete(null)
          }
          role="presentation"
        >
          <div
            className="w-full max-w-[520px] rounded-md bg-white p-8 shadow-xl font-Gantari"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="relative">
              <button
                type="button"
                disabled={serverAttachmentDeleting}
                onClick={() => setPendingAttachmentDelete(null)}
                className="absolute left-0 top-0 shrink-0 rounded-lg p-1 bg-transparent cursor-pointer disabled:opacity-50 group"
                aria-label="Close"
              >
                <img
                  src={closeButtonIcon}
                  alt=""
                  className="h-5 w-5"
                  aria-hidden
                />
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                    <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">Close</span>
                  </div>
                </div>
              </button>
              <p className="mx-auto max-w-full px-10 text-center text-[16px] leading-relaxed text-[#353535]">
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
                disabled={serverAttachmentDeleting}
                onClick={() => setPendingAttachmentDelete(null)}
                className="min-w-[140px] rounded-md bg-[#F2F2F2] px-8 py-2 text-[14px] font-semibold text-[#353535] cursor-pointer transition-opacity hover:opacity-90 border-0 disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={serverAttachmentDeleting}
                onClick={confirmRemoveAttachment}
                className="min-w-[140px] rounded-md bg-[#FED9D9] px-8 py-2 text-[14px] font-semibold text-[#E00100] cursor-pointer transition-opacity hover:opacity-90 border-0 disabled:opacity-50"
              >
                {serverAttachmentDeleting ? "Removing…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
