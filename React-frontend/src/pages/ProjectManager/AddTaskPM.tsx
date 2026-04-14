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
import { TimePickerWheel } from "../../components/TimePickerWheel";
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";
import {
  FormDropdown,
  TaskDropdown,
  formatFileSize,
  formatTimeForDisplay,
  formatDateForDisplay,
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

type PendingAttachmentDelete =
  | { type: "local"; index: number }
  | { type: "server"; stored: string };

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
  const m = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_(.+)$/i.exec(
    stored,
  );
  return m ? m[1] : stored;
}

function openServerOutputInNewTab(storedFilename: string) {
  const url = getTaskOutputFileUrl(storedFilename);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
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
  modules_name?: string;
  modules?: string;
  type?: string;
  category?: string;
  start_time?: string;
  due_time?: string;
  end_time?: string;
  assign_to?: string;
  assigned_to?: number;
  description?: string;
  checklist?: string;
  assigned_full_name?: string;
  created_at?: string;
  perferstart_time?: string;
  perferend_time?: string;
  Actual_start_time?: string;
  /** Matches merged list rows from MyTasksPM */
  source?: "In House" | "Outsource";
  /** Comma-separated stored filenames under /uploads/task/ */
  outputfilepath?: string;
}

interface Employee {
  id: number;
  full_name: string;
  active?: string;
  user_role?: string;
}

interface Project {
  id: number;
  project_name: string;
  tasks?: string;
  /** Comma/semicolon-separated from API when present */
  modules?: string;
  source?: string;
  project_manager_name?: string;
  lead_name?: string;
  bim_coordinator_name?: string;
  uploader_name?: string;
  members_names?: string[];
  members?: string;
}

/** DB/API sometimes stores modules as JSON: `["Mod A"]` — match dropdown options. */
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
    let s = str(v).trim();
    if (!s) return "";
    s = s.replace(/\.\d{3,9}(?:Z)?$/i, "");
    const isoOrSpace = s.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (isoOrSpace) {
      return `${isoOrSpace[1].padStart(2, "0")}:${isoOrSpace[2]}`;
    }
    const allClock = s.match(/\d{1,2}:\d{2}(?::\d{2})?/g);
    if (allClock?.length) {
      const last = allClock[allClock.length - 1]!;
      const hm = last.match(/^(\d{1,2}):(\d{2})/);
      if (hm) return `${hm[1].padStart(2, "0")}:${hm[2]}`;
    }
    const match = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match) {
      return `${match[1].padStart(2, "0")}:${match[2]}`;
    }
    const loose = s.match(/(\d{1,2}):(\d{2})/);
    return loose ? `${loose[1].padStart(2, "0")}:${loose[2]}` : "";
  };
  const firstNonEmpty = (...vals: unknown[]) => {
    for (const v of vals) {
      if (v == null) continue;
      const x = str(v).trim();
      if (x) return v;
    }
    return "";
  };
  return {
    projectName: str(t.project_name ?? t.projectName ?? ""),
    module: normalizeModuleDisplay(t.module ?? t.modules_name ?? t.modules ?? ""),
    taskName: str(t.task_name ?? t.taskName ?? ""),
    type: str(t.type ?? t.category ?? ""),
    actualStartDate: dateOnly(
      t.start_date ?? t.startDate ?? t.Actual_start_time ?? "",
    ),
    actualEndDate: dateOnly(t.due_date ?? t.dueDate ?? ""),
    startTime: timeOnly(
      firstNonEmpty(
        t.perferstart_time,
        (t as { Perferstart_time?: unknown }).Perferstart_time,
        t.start_time,
        t.startTime,
        t.Actual_start_time,
      ),
    ),
    dueTime: timeOnly(
      firstNonEmpty(
        t.perferend_time,
        (t as { Perferend_time?: unknown }).Perferend_time,
        t.due_time,
        t.dueTime,
        t.end_time,
        t.endTime,
      ),
    ),
    assignTo: (() => {
      const fromName = str(
        t.assigned_full_name ?? t.assign_to ?? t.assignTo ?? "",
      ).trim();
      if (fromName) return fromName;
      const idStr = str(t.assigned_to ?? "").trim();
      if (idStr && !/^\d+$/.test(idStr)) return idStr;
      return "";
    })(),
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

function isTechnicalDirectorRole(role: string | undefined): boolean {
  return String(role || "").trim() === "Technical Director";
}

export default function AddTaskPM() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const editingTask = location.state?.task as Task | undefined;
  const editingTaskId = editingTask?.id ?? null;

  const [addError, setAddError] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [addTaskForm, setAddTaskForm] = useState(initialForm);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingOutputFilenames, setExistingOutputFilenames] = useState<
    string[]
  >([]);
  const [serverAttachmentDeleting, setServerAttachmentDeleting] =
    useState(false);
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
      api.get<{ projects?: Record<string, unknown>[] }>("/api/projects"),
      api.get<{ projects?: Record<string, unknown>[] }>("/api/vendors/vendor-projects"),
    ]).then(([empRes, projRes1, projRes2]) => {
      setEmployees((empRes.data.employees ?? []).filter(isEmployeeActiveForProjectAssignment));

      const mapProj = (r: Record<string, any>, defaultSource: string) => ({
        id: Number(r.id),
        project_name: String(r.project_name || ""),
        tasks: String(r.tasks || ""),
        modules: String(r.modules ?? ""),
        source: String(r.source || defaultSource),
        project_manager_name: String(r.project_manager_name || ""),
        lead_name: String(r.lead_name || ""),
        bim_coordinator_name: String(r.bim_coordinator_name || ""),
        uploader_name: String(r.uploader_name || ""),
        members_names: Array.isArray(r.members_names) ? r.members_names.map(String) : [],
        members: String(r.members || "")
      });
      const p1 = (projRes1.data.projects ?? []).map(r => mapProj(r, "In House"));
      const p2 = (projRes2.data.projects ?? []).map(r => mapProj(r, "Outsource"));

      setProjects([...p1, ...p2]);
    });
  }, []);

  useEffect(() => {
    if (!editingTask) {
      setExistingOutputFilenames([]);
      setAttachmentFiles([]);
      return;
    }

    setAddTaskForm(taskToFormValues(editingTask));
    setAttachmentFiles([]);
    setExistingOutputFilenames(parseOutputFilepaths(editingTask.outputfilepath));

    let cancelled = false;
    const isOutsource = editingTask.source === "Outsource";
    const url = isOutsource
      ? `/api/vendors/vendor-tasks/${editingTask.id}`
      : `/api/tasks/${editingTask.id}`;

    const applyRow = (row: Record<string, unknown>, forceOutsource: boolean) => {
      const merged: Task = {
        ...editingTask,
        ...row,
        id: editingTask.id,
        source: forceOutsource ? "Outsource" : editingTask.source,
      };
      setAddTaskForm(taskToFormValues(merged));
      const out = row.outputfilepath;
      setExistingOutputFilenames(
        parseOutputFilepaths(
          typeof out === "string" ? out : editingTask.outputfilepath,
        ),
      );
    };

    api
      .get<Record<string, unknown>>(url)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        if (!data || typeof data !== "object") return;
        if ("success" in data && (data as { success?: boolean }).success === false) {
          return;
        }
        applyRow(data as Record<string, unknown>, isOutsource);
      })
      .catch(() => {
        if (cancelled || isOutsource) return;
        api
          .get<Record<string, unknown>>(
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
          .catch(() => { });
      });

    return () => {
      cancelled = true;
    };
  }, [editingTask]);

  // Map numeric assignee id to full_name after employees load (vendor / partial rows).
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
    if (addTaskForm.projectName) {
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

      const isOutsource = selectedProj.source === "Outsource";
      const endpoint = isOutsource
        ? "/api/vendors/vendor-projects/filters/modules"
        : "/api/projects/filters/modules";

      api
        .post<{
          success?: boolean;
          modules: { label?: string; value?: string }[];
        }>(endpoint, { projectId: selectedProj.id })
        .then((res) => {
          const list = Array.isArray(res.data.modules) ? res.data.modules : [];
          let names = list
            .map((m) => m?.label ?? m?.value)
            .filter((x): x is string => Boolean(x));
          if (names.length === 0 && selectedProj.modules) {
            names = parseModulesFromProjectString(selectedProj.modules);
          }
          setModules(names);
        })
        .catch(() => {
          const fallback = selectedProj.modules
            ? parseModulesFromProjectString(selectedProj.modules)
            : [];
          setModules(fallback);
        });
    } else setModules([]);
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
    const patchUrl = isOutsourceTask
      ? `/api/vendors/vendor-tasks/${taskId}`
      : `/api/tasks/${taskId}`;
    api
      .patch(patchUrl, { outputfilepath: newPath })
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

  const totalAttachmentCount =
    existingOutputFilenames.length + attachmentFiles.length;

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
        status: isEditing ? editingTask?.status : "Todo",
        progress: isEditing ? editingTask?.status === "Completed" ? 100 : editingTask?.progress : 0,
      };

      let taskId = editingTaskId;
      const isOutsource = selectedProj?.source === "Outsource";
      const baseEndpoint = isOutsource ? "/api/vendors/vendor-tasks" : "/api/tasks";

      if (isEditing) {
        if (isOutsource) {
          await api.patch(`${baseEndpoint}/${editingTaskId}`, {
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
          await api.patch(`${baseEndpoint}/${editingTaskId}`, payload);
        }
        toast.success("Updated successfully");
      } else {
        const res = await api.post<{ task_id: number }>(baseEndpoint, payload);
        taskId = res.data.task_id;
        toast.success("Task added successfully");
      }

      if (taskId && attachmentFiles.length > 0) {
        const formData = new FormData();
        attachmentFiles.forEach((file) => formData.append("image", file));
        const outputUrl = isOutsource
          ? `/api/vendors/vendor-tasks/${taskId}/output-files`
          : `/api/tasks/${taskId}/output-files`;
        await api.post(outputUrl, formData, {
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
        ...employees.map((e) => ({ value: e.full_name, label: e.full_name })),
      ];
    }
    const proj = projects.find((p) => p.project_name === addTaskForm.projectName);
    if (!proj) {
      return [
        { value: "", label: "Select Assign To" },
        ...employees.map((e) => ({ value: e.full_name, label: e.full_name })),
      ];
    }

    // Vendor projects often have no members_* on the row; in-house filtering yields an empty list.
    if (proj.source === "Outsource") {
      const byId = new Map<number, Employee>();
      employees
        .filter((e) => isTechnicalDirectorRole(e.user_role))
        .forEach((e) => byId.set(e.id, e));
      if (user?.id != null) {
        const self = employees.find((e) => e.id === user.id);
        if (self) byId.set(self.id, self);
      }
      if (user?.full_name?.trim()) {
        const selfByName = employees.find(
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
    }

    const involvedNames = new Set<string>();

    const addNames = (val: string | undefined | null) => {
      if (!val) return;
      val.split(",").forEach(n => {
        const trimmed = n.trim();
        if (trimmed) involvedNames.add(trimmed);
      });
    };

    addNames(proj.project_manager_name);
    addNames(proj.lead_name);
    addNames(proj.bim_coordinator_name);
    addNames(proj.uploader_name);

    if (Array.isArray(proj.members_names)) {
      proj.members_names.forEach((name) => {
        if (name) involvedNames.add(name.trim());
      });
    }

    const filteredEmployees = employees.filter(e => involvedNames.has(e.full_name));

    return [
      { value: "", label: "Select Assign To" },
      ...filteredEmployees.map((e) => ({ value: e.full_name, label: e.full_name })),
    ];
  };

  return (
    <div className="h-full flex-1 min-h-0 px-5 py-2 bg-white overflow-hidden overflow-y-hidden">
      <div className="max-w-[1174px] mx-auto h-full min-h-0 flex flex-col overflow-hidden overflow-y-hidden">
        <div className="flex items-center justify-between mb-8 sm:mb-10 relative flex-shrink-0">
          <div className="group relative inline-flex shrink-0">
            <button
              type="button"
              onClick={goBack}
              className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
            >
              <img src={backIcon} alt="Back" className="w-5 h-5" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                  Go Back
                </span>
              </div>
            </div>
          </div>
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
                  bgClass="bg-[#F2F3F4]"
                  fontClass="font-normal"
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
                  bgClass="bg-[#F2F3F4]"
                  fontClass="font-normal"
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
                    bgClass="bg-[#F2F3F4]"
                    fontClass="font-normal"
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
                    bgClass="bg-[#F2F3F4]"
                    fontClass="font-normal"
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Actual Start Date <span className="text-[#DD4342]">*</span>
                  </label>
                  <div className="relative">
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
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus-within:border-[#AEACAC52] flex items-center min-h-[42px]">
                      <span className={addTaskForm.actualStartDate ? "text-[#353535]" : "text-[#8B8B8B]"}>
                        {addTaskForm.actualStartDate ? formatDateForDisplay(addTaskForm.actualStartDate) : "DD/MM/YYYY"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                    Actual End Date <span className="text-[#DD4342]">*</span>
                  </label>
                  <div className="relative">
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
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus-within:border-[#AEACAC52] flex items-center min-h-[42px]">
                      <span className={addTaskForm.actualEndDate ? "text-[#353535]" : "text-[#8B8B8B]"}>
                        {addTaskForm.actualEndDate ? formatDateForDisplay(addTaskForm.actualEndDate) : "DD/MM/YYYY"}
                      </span>
                    </div>
                  </div>
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
                    bgClass="bg-[#F2F3F4]"
                    fontClass="font-normal"
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
                                stored,
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
                className="w-full sm:w-auto px-6 py-2 rounded-md bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all font-Gantari cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={addSubmitting}
                className="w-full sm:w-auto px-6 py-2 rounded-md bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] transition-all font-Gantari cursor-pointer disabled:opacity-50"
              >
                {addSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
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
              aria-labelledby="attachment-delete-title-pm"
            >
              <div className="relative">
                <button
                  type="button"
                  disabled={serverAttachmentDeleting}
                  onClick={() => setPendingAttachmentDelete(null)}
                  className="absolute left-0 top-0 shrink-0 rounded-md p-1 bg-[#E8E8E8] cursor-pointer border-0 bg-transparent disabled:opacity-50"
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
                  disabled={serverAttachmentDeleting}
                  onClick={() => setPendingAttachmentDelete(null)}
                  className="min-w-[140px] rounded-md bg-[#F2F2F2] px-6 py-2 text-[14px] font-semibold text-[#353535] cursor-pointer transition-opacity hover:opacity-90 border-0 disabled:opacity-50"
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
    </div>
  );
}
