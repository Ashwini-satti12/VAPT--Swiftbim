import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import closeButtonIcon from "../../assets/ProductNavbarIcons/close button.svg";
import { FiX } from "react-icons/fi";
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
} from "../TechnicalDirector/MytaskTD";

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
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function getTaskOutputFileUrl(storedFilename: string): string {
    if (!storedFilename) return "";
    const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    return `${base}/uploads/task/${encodeURIComponent(storedFilename)}`;
}

function displayNameFromStoredFilename(stored: string): string {
    const m = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_(.+)$/i.exec(stored);
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

type EmployeeRow = Employee & { user_role?: string };

function normalizeModuleDisplay(raw: unknown): string {
    const s = raw != null ? String(raw).trim() : "";
    if (!s) return "";
    if (s.startsWith("[") && s.endsWith("]")) {
        try {
            const parsed = JSON.parse(s) as unknown;
            if (Array.isArray(parsed) && parsed.length > 0) {
                return String(parsed[0]).trim();
            }
        } catch {
            const inner = s.slice(1, -1).trim().replace(/^["']|["']$/g, "");
            if (inner) return inner;
        }
    }
    return s;
}

function applyTaskToForm(task: Task | Record<string, unknown>) {
    const base = taskToFormValues(task);
    const t = task as Record<string, unknown>;
    return {
        ...base,
        module: normalizeModuleDisplay(
            t.module ?? t.modules_name ?? t.modules ?? base.module,
        ),
    };
}

function isTechnicalDirectorRole(role: string | undefined): boolean {
    return String(role || "").trim() === "Technical Director";
}

function isProjectManagerRole(role: string | undefined): boolean {
    return String(role || "").trim() === "Project Manager";
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

export default function AddTaskBL() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const editingTask = location.state?.task as Task | undefined;
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [addError, setAddError] = useState("");
    const [addSubmitting, setAddSubmitting] = useState(false);

    const [list, setList] = useState<Task[]>([]);
    const [employees, setEmployees] = useState<EmployeeRow[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [modules, setModules] = useState<string[]>([]);
    const [addTaskForm, setAddTaskForm] = useState(initialForm);
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [existingOutputFilenames, setExistingOutputFilenames] = useState<string[]>([]);
    const [openFormDropdown, setOpenFormDropdown] = useState<FormDropdownId>(null);
    const [tasklistOpen, setTasklistOpen] = useState(false);
    const [pendingAttachmentDelete, setPendingAttachmentDelete] = useState<PendingAttachmentDelete | null>(null);
    const [serverAttachmentDeleting, setServerAttachmentDeleting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const formProjectTriggerRef = useRef<HTMLElement | null>(null);
    const formProjectMenuRef = useRef<HTMLDivElement>(null);
    const formModuleTriggerRef = useRef<HTMLElement | null>(null);
    const formModuleMenuRef = useRef<HTMLDivElement>(null);
    const formTypeTriggerRef = useRef<HTMLElement | null>(null);
    const formTypeMenuRef = useRef<HTMLDivElement>(null);
    const formAssignTriggerRef = useRef<HTMLElement | null>(null);
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
            api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks"),
            api.get<{ employees?: Employee[] }>("/api/employees"),
            api.get<{ projects?: Project[] }>("/api/projects"),
            api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
        ]).then(([tasksRes, vTasksRes, empRes, projRes, vProjRes]) => {
            const internalTasks = (tasksRes.data.tasks ?? []).map((t) => ({ ...t, source: "In House" as const }));
            const vendorTasks = (vTasksRes.data.tasks ?? []).map((t) => ({ ...t, source: "Outsource" as const }));
            setList([...internalTasks, ...vendorTasks]);

            setEmployees(
                (empRes.data.employees ?? []).filter(
                    isEmployeeActiveForProjectAssignment,
                ) as EmployeeRow[],
            );

            const internalProjs = (projRes.data.projects ?? []).map((p) => ({ ...p, source: "In House" as const }));
            const vendorProjs = (vProjRes.data.projects ?? []).map((p) => ({ ...p, source: "Outsource" as const }));
            setProjects([...internalProjs, ...vendorProjs]);
        });
    }, []);

    useEffect(() => {
        if (!editingTask) {
            setEditingTaskId(null);
            setExistingOutputFilenames([]);
            return;
        }
        setEditingTaskId(editingTask.id);
        setAddTaskForm(applyTaskToForm(editingTask));
        setAttachmentFiles([]);
        setExistingOutputFilenames(parseOutputFilepaths(editingTask.outputfilepath));

        let cancelled = false;
        const isVo = editingTask.source === "Outsource";

        const applyRow = (row: Record<string, unknown>, forceOutsource: boolean) => {
            const merged: Task = {
                ...editingTask,
                ...row,
                id: editingTask.id,
                source: forceOutsource ? "Outsource" : editingTask.source,
            };
            setAddTaskForm(applyTaskToForm(merged));
            const out = row.outputfilepath;
            setExistingOutputFilenames(
                parseOutputFilepaths(
                    typeof out === "string" ? out : editingTask.outputfilepath,
                ),
            );
        };

        const url = isVo
            ? `/api/vendors/vendor-tasks/${editingTask.id}`
            : `/api/tasks/${editingTask.id}`;

        api.get<Record<string, unknown>>(url)
            .then((res) => {
                if (cancelled) return;
                const data = res.data;
                if (!data || typeof data !== "object") return;
                if (
                    "success" in data &&
                    (data as { success?: boolean }).success === false
                ) {
                    return;
                }
                applyRow(data as Record<string, unknown>, isVo);
            })
            .catch(() => {
                if (cancelled || isVo) return;
                api.get<Record<string, unknown>>(
                    `/api/vendors/vendor-tasks/${editingTask.id}`,
                )
                    .then((res) => {
                        if (cancelled) return;
                        const data = res.data;
                        if (!data || typeof data !== "object") return;
                        if (
                            "success" in data &&
                            (data as { success?: boolean }).success === false
                        ) {
                            return;
                        }
                        applyRow(data as Record<string, unknown>, true);
                    })
                    .catch(() => {});
            });

        return () => {
            cancelled = true;
        };
    }, [editingTask]);

    useEffect(() => {
        if (editingTaskId == null || employees.length === 0) return;
        setAddTaskForm((prev) => {
            const v = (prev.assignTo || "").trim();
            if (!/^\d+$/.test(v)) return prev;
            const emp = employees.find((e) => String(e.id) === v);
            if (!emp?.full_name) return prev;
            return { ...prev, assignTo: emp.full_name };
        });
    }, [editingTaskId, employees, addTaskForm.assignTo]);

    useEffect(() => {
        if (!addTaskForm.projectName) {
            setModules([]);
            return;
        }
        const name = addTaskForm.projectName;
        const sourceHint =
            editingTaskId != null &&
            editingTask &&
            String(editingTask.project_name || "") === name
                ? editingTask.source
                : undefined;
        const selectedProj =
            (sourceHint
                ? projects.find(
                      (p) => p.project_name === name && p.source === sourceHint,
                  )
                : undefined) ?? projects.find((p) => p.project_name === name);
        if (!selectedProj) {
            setModules([]);
            return;
        }

        const parseModulesFromProjectString = (raw: string): string[] => {
            const s = (raw || "").trim();
            if (!s) return [];
            if (s.startsWith("[")) {
                try {
                    const parsed = JSON.parse(s) as unknown;
                    if (Array.isArray(parsed)) {
                        return parsed.map((x) => String(x).trim()).filter(Boolean);
                    }
                } catch {
                    /* fall through */
                }
            }
            const sep = s.includes(";") ? ";" : ",";
            return s.split(sep).map((p) => p.trim()).filter(Boolean);
        };

        const endpoint =
            selectedProj.source === "Outsource"
                ? "/api/vendors/vendor-projects/filters/modules"
                : "/api/projects/filters/modules";

        api.post<{
            success?: boolean;
            modules: { label?: string; value?: string }[];
        }>(endpoint, { projectId: selectedProj.id })
            .then((res) => {
                const list = Array.isArray(res.data.modules) ? res.data.modules : [];
                let names = list
                    .map((m) => m?.label ?? m?.value)
                    .filter((x): x is string => Boolean(x));
                if (names.length === 0 && selectedProj.modules) {
                    names = parseModulesFromProjectString(String(selectedProj.modules));
                }
                setModules(names);
            })
            .catch(() => {
                const fallback = selectedProj.modules
                    ? parseModulesFromProjectString(String(selectedProj.modules))
                    : [];
                setModules(fallback);
            });
    }, [
        addTaskForm.projectName,
        projects,
        editingTaskId,
        editingTask?.project_name,
        editingTask?.source,
    ]);

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
        if (pendingAttachmentDelete.type === "local") {
            removeAttachment(pendingAttachmentDelete.index);
            setPendingAttachmentDelete(null);
            toast.success("Deleted successfully");
            return;
        }
        const stored = pendingAttachmentDelete.stored;
        const taskId = editingTaskId;
        if (taskId == null) {
            setPendingAttachmentDelete(null);
            return;
        }
        const name = addTaskForm.projectName;
        const sourceHint =
            editingTaskId != null &&
            editingTask &&
            String(editingTask.project_name || "") === name
                ? editingTask.source
                : undefined;
        const selectedProj =
            (sourceHint
                ? projects.find(
                      (p) => p.project_name === name && p.source === sourceHint,
                  )
                : undefined) ?? projects.find((p) => p.project_name === name);
        const isOutsourceTask =
            editingTask?.source === "Outsource" ||
            selectedProj?.source === "Outsource";
        setServerAttachmentDeleting(true);
        const next = existingOutputFilenames.filter((f) => f !== stored);
        const newPath = next.length > 0 ? next.join(",") : "";
        const patchUrl = isOutsourceTask
            ? `/api/vendors/vendor-tasks/${taskId}`
            : `/api/tasks/${taskId}`;
        api.patch(patchUrl, { outputfilepath: newPath })
            .then(() => {
                setExistingOutputFilenames(next);
                setPendingAttachmentDelete(null);
                toast.success("Deleted successfully");
            })
            .catch((err) => {
                const msg = err.response?.data?.message || "Failed to remove attachment.";
                setAddError(msg);
                toast.error(msg);
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
    const totalAttachmentCount = existingOutputFilenames.length + attachmentFiles.length;

    /** Assign To: Technical Directors, Project Managers, and the logged-in user only. */
    const assignToOptions = useMemo(() => {
        const all = employees.filter(isEmployeeActiveForProjectAssignment);
        const byId = new Map<number, EmployeeRow>();
        all
            .filter(
                (e) =>
                    isTechnicalDirectorRole(e.user_role) ||
                    isProjectManagerRole(e.user_role),
            )
            .forEach((e) => byId.set(e.id, e));
        if (user?.id != null) {
            const self = all.find((e) => e.id === user.id);
            if (self) byId.set(self.id, self);
        }
        if (user?.full_name?.trim()) {
            const selfByName = all.find(
                (e) =>
                    (e.full_name || "").trim().toLowerCase() ===
                    user.full_name.trim().toLowerCase(),
            );
            if (selfByName) byId.set(selfByName.id, selfByName);
        }
        const merged = Array.from(byId.values()).sort((a, b) =>
            (a.full_name || "").localeCompare(b.full_name || "", undefined, {
                sensitivity: "base",
            }),
        );
        if (merged.length === 0 && user?.full_name?.trim()) {
            return [
                { value: "", label: "Select Assign To" },
                {
                    value: user.full_name.trim(),
                    label: user.full_name.trim(),
                },
            ];
        }
        return [
            { value: "", label: "Select Assign To" },
            ...merged.map((e) => ({ value: e.full_name, label: e.full_name })),
        ];
    }, [employees, user?.id, user?.full_name]);

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
        if (addTaskForm.actualStartDate < today && editingTaskId === null) {
            setAddError("Actual Start Date cannot be in the past.");
            return;
        }
        if (addTaskForm.actualEndDate < addTaskForm.actualStartDate) {
            setAddError("Actual End Date cannot be before Actual Start Date.");
            return;
        }

        setAddSubmitting(true);
        try {
            const isEditing = editingTaskId !== null;
            const name = addTaskForm.projectName;
            const sourceHint =
                isEditing &&
                editingTask &&
                String(editingTask.project_name || "") === name
                    ? editingTask.source
                    : undefined;
            const selectedProj =
                (sourceHint
                    ? projects.find(
                          (p) => p.project_name === name && p.source === sourceHint,
                      )
                    : undefined) ?? projects.find((p) => p.project_name === name);
            const isOutsource = selectedProj?.source === "Outsource";

            const assignedId = employees.find(
                (e) => e.full_name === addTaskForm.assignTo,
            )?.id;

            const payload = {
                project_id: selectedProj?.id,
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
                start_time: addTaskForm.startTime,
                end_time: addTaskForm.dueTime,
                assigned_to: assignedId,
                assign_to: addTaskForm.assignTo,
                description: addTaskForm.description,
                checklist: addTaskForm.checklist,
                status: isEditing
                    ? list.find((t) => t.id === editingTaskId)?.status
                    : "To Do",
                progress: isEditing
                    ? list.find((t) => t.id === editingTaskId)?.progress
                    : 0,
            };

            let taskId = editingTaskId;
            if (isEditing) {
                const url = isOutsource
                    ? `/api/vendors/vendor-tasks/${editingTaskId}`
                    : `/api/tasks/${editingTaskId}`;
                if (isOutsource) {
                    await api.patch(url, {
                        task_name: addTaskForm.taskName,
                        assigned_to: assignedId,
                        due_date: addTaskForm.actualEndDate,
                        category: addTaskForm.type,
                        description: addTaskForm.description,
                        checklist: addTaskForm.checklist,
                        modules: addTaskForm.module,
                        start_date: addTaskForm.actualStartDate,
                        start_time: addTaskForm.startTime,
                        end_time: addTaskForm.dueTime,
                        project_id: selectedProj?.id,
                    });
                } else {
                    await api.patch(url, payload);
                }
                toast.success("Updated successfully");
            } else {
                const url = isOutsource ? "/api/vendors/vendor-tasks" : "/api/tasks";
                const res = await api.post<{ task_id?: number; id?: number }>(
                    url,
                    payload,
                );
                taskId = res.data.task_id ?? res.data.id ?? null;
                toast.success("Task added successfully");
            }

            if (taskId != null && attachmentFiles.length > 0) {
                const formData = new FormData();
                attachmentFiles.forEach((file) => formData.append("image", file));
                const url = isOutsource ? `/api/vendors/vendor-tasks/${taskId}/output-files` : `/api/tasks/${taskId}/output-files`;
                await api.post(url, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }

            if (!isEditing && taskId == null) {
                setAddError("Failed to create task.");
                return;
            }

            navigate(location.state?.from === "teamtasks" ? "/bl/teamtasks" : "/bl/mytasks");
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string } } };
            const msg = ax.response?.data?.message || "Failed to save task.";
            setAddError(msg);
            toast.error(msg);
        } finally {
            setAddSubmitting(false);
        }
    };

    const fromTeamTasks = location.state?.from === "teamtasks";
    const goBack = () => navigate(fromTeamTasks ? "/bl/teamtasks" : "/bl/mytasks");

    return (
        <div className="flex-1 min-h-0 p-2 bg-white overflow-hidden">
            <div className="max-w-[1174px] mx-auto h-full min-h-0 flex flex-col">
                <div className="relative flex items-center justify-center py-4 md:py-8 border-b border-slate-50 mb-8 sm:mb-10 flex-shrink-0">
                    <div className="relative group absolute left-0">
                        <button
                            type="button"
                            onClick={goBack}
                            className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
                        >
                            <img src={backIcon} alt="Back" className="w-5 h-5" />
                        </button>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                            <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                            <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10">
                                <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                    Go back
                                </span>
                            </div>
                        </div>
                    </div>
                    <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center px-12 md:px-16">
                        {editingTaskId !== null ? "Edit Task Details" : "Add New Task"}
                    </h3>
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
                                        ...projects.map((p) => ({ value: p.project_name, label: p.project_name })),
                                    ]}
                                    value={addTaskForm.projectName}
                                    onChange={(v) => setAddTaskForm((f) => ({ ...f, projectName: v }))}
                                    isOpen={openFormDropdown === "project"}
                                    onToggle={() =>
                                        setOpenFormDropdown((d) => (d === "project" ? null : "project"))
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
                                        setOpenFormDropdown((d) => (d === "module" ? null : "module"))
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
                                        options={[
                                            "Select Task",
                                            ...(Array.from(
                                                new Set(merged.map((t) => t.task_name).filter(Boolean)),
                                            ) as string[]),
                                        ]}
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
                                        min={
                                            editingTaskId !== null
                                                ? undefined
                                                : new Date().toISOString().split("T")[0]
                                        }
                                        onChange={(e) =>
                                            setAddTaskForm((f) => ({ ...f, actualStartDate: e.target.value }))
                                        }
                                        placeholder="dd/mm/yyyy"
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
                                        min={
                                            addTaskForm.actualStartDate ||
                                            (editingTaskId !== null
                                                ? undefined
                                                : new Date().toISOString().split("T")[0])
                                        }
                                        onChange={(e) =>
                                            setAddTaskForm((f) => ({ ...f, actualEndDate: e.target.value }))
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
                                        aria-expanded={openFormDropdown === "type_start_time"}
                                        aria-haspopup="listbox"
                                        aria-label="Select Start Time"
                                    >
                                        <span
                                            className={
                                                addTaskForm.startTime ? "text-[#353535]" : "text-[#8B8B8B]"
                                            }
                                        >
                                            {addTaskForm.startTime
                                                ? formatTimeForDisplay(addTaskForm.startTime)
                                                : "__:__"}
                                        </span>
                                        <img
                                            src={ArrowDown}
                                            alt=""
                                            className={`ml-2 h-4 w-4 shrink-0 transition-transform ${openFormDropdown === "type_start_time" ? "rotate-180" : ""}`}
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
                                        aria-expanded={openFormDropdown === "type_end_time"}
                                        aria-haspopup="listbox"
                                        aria-label="Select End Time"
                                    >
                                        <span
                                            className={
                                                addTaskForm.dueTime ? "text-[#353535]" : "text-[#8B8B8B]"
                                            }
                                        >
                                            {addTaskForm.dueTime
                                                ? formatTimeForDisplay(addTaskForm.dueTime)
                                                : "__:__"}
                                        </span>
                                        <img
                                            src={ArrowDown}
                                            alt=""
                                            className={`ml-2 h-4 w-4 shrink-0 transition-transform ${openFormDropdown === "type_end_time" ? "rotate-180" : ""}`}
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
                                        options={assignToOptions}
                                        value={addTaskForm.assignTo}
                                        onChange={(v) => setAddTaskForm((f) => ({ ...f, assignTo: v }))}
                                        isOpen={openFormDropdown === "assignTo"}
                                        onToggle={() =>
                                            setOpenFormDropdown((d) => (d === "assignTo" ? null : "assignTo"))
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
                                        setAddTaskForm((f) => ({ ...f, description: e.target.value }))
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
                                                    <span className="text-xs text-[#8B8B8B]">Saved on task</span>
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
                                                            setPendingAttachmentDelete({ type: "server", stored })
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
                                                    <span className="block truncate font-Gantari" title={file.name}>
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
            </div>
            {pendingAttachmentDelete !== null && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
                    onClick={() => !serverAttachmentDeleting && setPendingAttachmentDelete(null)}
                    role="presentation"
                >
                    <div
                        className="w-full max-w-[520px] rounded-md bg-white p-8 shadow-xl font-Gantari"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="attachment-delete-title-bl"
                    >
                        <div className="relative">
                            <button
                                type="button"
                                disabled={serverAttachmentDeleting}
                                onClick={() => setPendingAttachmentDelete(null)}
                                className="absolute left-0 top-0 shrink-0 rounded-lg p-1 bg-[#F2F2F2] cursor-pointer border-0 bg-transparent disabled:opacity-50"
                                aria-label="Close"
                            >
                                <img src={closeButtonIcon} alt="" className="h-5 w-5" aria-hidden />
                            </button>
                            <p
                                id="attachment-delete-title-bl"
                                className="mx-auto max-w-full px-10 text-center text-[16px] leading-relaxed text-[#353535]"
                            >
                                Are you sure you want to delete{" "}
                                <strong className="font-semibold text-[#353535]">{pendingDeleteFileName}</strong>?
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
