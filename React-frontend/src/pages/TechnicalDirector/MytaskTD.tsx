import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { VscEye } from "react-icons/vsc";
import { HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import api from "../../lib/api";
import Group1 from "../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../assets/ProjectManager/MyTask/arrow.svg";
import Dot from "../../assets/ProjectManager/MyTask/Dot.svg";

type DropdownId = "employee" | "projects" | "show" | "period" | null;
type FormDropdownId = "project" | "module" | "type" | "assignTo" | null;

interface Employee {
    id: number;
    full_name: string;
}

interface Project {
    id: number;
    project_name: string;
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
                className="flex w-full items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-left text-sm text-black"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={label}
            >
                <span className={value ? "text-black" : "text-[#8B8B8B]"}>
                    {displayLabel}
                </span>
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
                    className="absolute top-full left-0 z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                >
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            role="option"
                            onClick={() => {
                                onChange(opt.value);
                                onClose();
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

interface TaskDropdownProps {
    label: string;
    options: string[];
    selected: string | null;
    onSelect: (value: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    dropdownRef: React.RefObject<HTMLDivElement | null>;
    narrow?: boolean;
}

function TaskDropdown({
    label,
    options,
    selected,
    onSelect,
    isOpen,
    onToggle,
    onClose,
    triggerRef,
    dropdownRef,
    narrow = false,
}: TaskDropdownProps) {
    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={`inline-flex items-center justify-between rounded-lg bg-[#E8E8E8] px-4 py-3 text-sm text-black shadow-sm hover:bg-[#DDD] ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={label}
            >
                <span className="truncate">{selected ?? label}</span>
                <svg
                    className={`ml-2 h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
                    className={`absolute top-full left-0 z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${narrow ? "min-w-[110px]" : "min-w-[160px]"}`}
                >
                    {options.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            role="option"
                            onClick={() => {
                                onSelect(opt);
                                onClose();
                            }}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
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
    progress?: number;
    module?: string;
    type?: string;
    start_time?: string;
    due_time?: string;
    assign_to?: string;
    description?: string;
    checklist?: string;
    assigned_full_name?: string;
    uploader_full_name?: string;
}

/** Map task (local or API shape) to form values so every detail shows in edit. */
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
        actualStartDate: dateOnly(t.start_date ?? t.startDate ?? t.Actual_start_time ?? ""),
        actualEndDate: dateOnly(t.due_date ?? t.dueDate ?? ""),
        startTime: timeOnly(t.start_time ?? t.startTime ?? t.Actual_start_time ?? ""),
        dueTime: timeOnly(t.due_time ?? t.dueTime ?? t.end_time ?? ""),
        assignTo: str(t.assign_to ?? t.assignTo ?? t.assigned_to ?? ""),
        description: str(t.description ?? ""),
        checklist: str(t.checklist ?? ""),
    };
}

function formatDateRange(start?: string, end?: string): string {
    if (!start && !end) return "—";
    const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
    const fmtShort = (s: string) => {
        const d = new Date(s);
        return `${d.getDate()} ${months[d.getMonth()]}`;
    };
    const fmtFull = (s: string) => {
        const d = new Date(s);
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };
    if (start && end) return `${fmtShort(start)} - ${fmtFull(end)}`;
    if (start) return fmtFull(start);
    return end ? fmtFull(end) : "—";
}

function normalizeStatus(
    s: string | undefined,
): "todo" | "in_progress" | "completed" {
    if (!s) return "todo";
    const lower = s.toLowerCase().replace(/\s+/g, "_");
    if (lower.includes("progress") || lower === "in_progress")
        return "in_progress";
    if (lower.includes("complete") || lower === "done") return "completed";
    return "todo";
}

const STATUS_STYLE: Record<
    "todo" | "in_progress" | "completed",
    { label: string; dot: string; bg: string }
> = {
    todo: {
        label: "To Do",
        dot: "bg-orange-500",
        bg: "bg-orange-100 text-orange-800 rounded-full",
    },
    in_progress: {
        label: "In Progress",
        dot: "bg-sky-500",
        bg: "bg-sky-100 text-sky-800",
    },
    completed: {
        label: "Completed",
        dot: "bg-emerald-500",
        bg: "bg-emerald-100 text-emerald-800",
    },
};

function TaskCard({
    task,
    status,
    onViewTask,
    onEditTask,
    onDeleteTask,
}: {
    task: Task;
    status: "todo" | "in_progress" | "completed";
    onViewTask?: (task: Task) => void;
    onEditTask?: (task: Task) => void;
    onDeleteTask?: (task: Task) => void;
}) {
    const style = STATUS_STYLE[status];
    const progress = task.progress ?? 0;
    const dateRange = formatDateRange(task.start_date, task.due_date);
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
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    const handleDragStart = (e: React.DragEvent) => {
        if (status === "completed") {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData("taskId", String(task.id));
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.task_name || "Task");
    };

    const isCompleted = status === "completed";

    return (
        <div
            draggable={!isCompleted}
            onDragStart={handleDragStart}
            className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm relative ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <span
                    className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${style.bg}`}
                >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
                    {style.label}
                </span>
                <div className="relative" ref={menuRef}>
                    <button
                        type="button"
                        draggable={false}
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((prev) => !prev);
                        }}
                        className="p-0.5 rounded hover:bg-slate-100"
                        aria-label="More options"
                        aria-expanded={menuOpen}
                    >
                        <img src={Dot} alt="Dot" className="w-4 h-4 text-slate-600" />
                    </button>
                    {menuOpen && (
                        <div
                            className="absolute right-[-10] top-full mt-1 z-50 min-w-[120px] rounded-2xl bg-[#FFFFFF]/20 backdrop-blur-2xl opacity-70 py-1 px-3 shadow-lg border border-[#59595980]"
                            role="menu"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#DD4342] hover:bg-red-50/50 transition-colors group text-left"
                                onClick={() => {
                                    setMenuOpen(false);
                                    onViewTask?.(task);
                                }}
                            >
                                <VscEye className="w-4 h-4 shrink-0 text-slate-600 group-hover:text-red-600 transition-colors" />
                                <span>View</span>
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#DD4342] hover:bg-slate-50 transition-colors text-left"
                                onClick={() => {
                                    setMenuOpen(false);
                                    onEditTask?.(task);
                                }}
                            >
                                <HiOutlinePencil className="w-4 h-4 shrink-0" />
                                <span>Edit</span>
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#DD4342] hover:bg-slate-50 transition-colors text-left"
                                onClick={() => {
                                    setMenuOpen(false);
                                    onDeleteTask?.(task);
                                }}
                            >
                                <HiOutlineTrash className="w-4 h-4 shrink-0" />
                                <span>Delete</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <h4 className="font-semibold text-slate-900 text-sm mb-1">
                {task.task_name || "Task Name"}
            </h4>
            <p className="text-xs text-slate-500 mb-2">{dateRange}</p>
            <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-slate-600">Progress</span>
                <span className="text-xs font-medium text-slate-700">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
                <div
                    className="h-full rounded-full bg-slate-500"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white shrink-0"
                                title="Assignee"
                            />
                        ))}
                    </div>
                    <span className="text-xs text-slate-500">+4</span>
                </div>
                <Link
                    to={`/tasks/${task.id}`}
                    draggable={false}
                    className="inline-flex items-center text-xs font-medium text-slate-700 hover:text-slate-900 gap-2"
                >
                    Details
                    <img src={Arrow} alt="Arrow" className="w-2 h-2" />
                </Link>
            </div>
        </div>
    );
}

const SHOW_OPTIONS = ["Show", "All", "To Do", "In Progress", "Completed"];
const PERIOD_OPTIONS = [
    "Period",
    "This Week",
    "This Month",
    "This Quarter",
    "Custom",
];

export default function MytaskTD() {
    const [searchParams] = useSearchParams();
    const { pathname } = useLocation();
    const isTeam =
        searchParams.get("condition") === "1" || pathname.endsWith("/team");
    const statusFilter =
        searchParams.get("status") || searchParams.get("taskstatus");
    const STORAGE_KEY = "td_myTask_localTasks";
    const DELETED_IDS_KEY = "td_myTask_deletedIds";
    const STATUS_OVERRIDES_KEY = "td_myTask_statusOverrides";
    const loadDeletedIds = (): number[] => {
        try {
            const raw = localStorage.getItem(DELETED_IDS_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(Number).filter((n) => !Number.isNaN(n)) : [];
        } catch {
            return [];
        }
    };
    const loadStatusOverrides = (): Record<number, string> => {
        try {
            const raw = localStorage.getItem(STATUS_OVERRIDES_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const out: Record<number, string> = {};
                for (const [k, v] of Object.entries(parsed)) {
                    const id = Number(k);
                    if (!Number.isNaN(id) && typeof v === "string") out[id] = v;
                }
                return out;
            }
            return {};
        } catch {
            return {};
        }
    };
    const [list, setList] = useState<Task[]>([]);
    const [localTasks, setLocalTasks] = useState<Task[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as Task[];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [deletedIds, setDeletedIds] = useState<number[]>(loadDeletedIds);
    const [statusOverrides, setStatusOverrides] = useState<Record<number, string>>(loadStatusOverrides);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    const safeLocal = Array.isArray(localTasks) ? localTasks.filter(Boolean) : [];
    const safeList = Array.isArray(list) ? list.filter(Boolean) : [];
    const merged = [
        ...safeLocal,
        ...safeList.filter((t) => t && !safeLocal.some((l) => l && l.id === t.id)),
    ];
    const allTasks = merged.filter((t) => t && t.id != null && !deletedIds.includes(t.id));

    const getEffectiveStatus = (t: Task): "todo" | "in_progress" | "completed" =>
        normalizeStatus(statusOverrides[t.id] ?? t.status);

    const statusToLabel = (
        s: "todo" | "in_progress" | "completed"
    ): string => {
        return s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : "Completed";
    };

    const handleMoveTask = (
        taskId: number,
        newStatus: "todo" | "in_progress" | "completed"
    ) => {
        const label = statusToLabel(newStatus);
        setStatusOverrides((prev) => ({ ...prev, [taskId]: label }));

        const statusMap = {
            todo: "Todo",
            in_progress: "InProgress",
            completed: "Completed"
        };
        const task = list.find((t) => t.id === taskId) ?? safeLocal.find((t) => t.id === taskId);

        setList((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: statusMap[newStatus] } : t))
        );
        setLocalTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: label } : t))
        );

        api.patch(`/api/tasks/${taskId}/status`, { status: statusMap[newStatus], projectId: (task as Task & { projectid?: number; project_id?: number })?.projectid ?? (task as Task & { projectid?: number; project_id?: number })?.project_id })
            .catch(() => {});
    };

    useEffect(() => {
        try {
            localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deletedIds));
        } catch {
            // ignore
        }
    }, [deletedIds]);

    useEffect(() => {
        try {
            localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(statusOverrides));
        } catch {
            // ignore
        }
    }, [statusOverrides]);

    const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [selectedShow, setSelectedShow] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
    const navigate = useNavigate();
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const openEditTask = (task: Task) => {
        setAddTaskForm(taskToFormValues(task));
        setEditingTaskId(task.id);
        setAddTaskModalOpen(true);
    };

    const openDeleteTask = (task: Task) => {
        setDeleteTaskId(task.id);
    };

    const openViewTask = (task: Task) => {
        navigate("/td/mytasks/view", { state: { task } });
    };

    const confirmDeleteTask = () => {
        if (deleteTaskId === null) return;

        api.delete(`/api/tasks/${deleteTaskId}`)
            .then(() => {
                setList((prev) => prev.filter((t) => t.id !== deleteTaskId));
                setLocalTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
                setDeletedIds((prev) => [...prev, deleteTaskId]);
                setDeleteTaskId(null);
            })
            .catch(() => {
                // handle error implicitly
                setDeleteTaskId(null);
            });
    };

    const resetTaskFormAndClose = () => {
        setAddTaskModalOpen(false);
        setEditingTaskId(null);
        setAttachmentFiles([]);
        setAddTaskForm({
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
    };
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [openFormDropdown, setOpenFormDropdown] =
        useState<FormDropdownId>(null);
    const formProjectTriggerRef = useRef<HTMLButtonElement>(null);
    const formProjectMenuRef = useRef<HTMLDivElement>(null);
    const formModuleTriggerRef = useRef<HTMLButtonElement>(null);
    const formModuleMenuRef = useRef<HTMLDivElement>(null);
    const formTypeTriggerRef = useRef<HTMLButtonElement>(null);
    const formTypeMenuRef = useRef<HTMLDivElement>(null);
    const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
    const formAssignMenuRef = useRef<HTMLDivElement>(null);

    const dropdownsContainerRef = useRef<HTMLDivElement>(null);
    const employeeTriggerRef = useRef<HTMLButtonElement>(null);
    const employeeMenuRef = useRef<HTMLDivElement>(null);
    const projectsTriggerRef = useRef<HTMLButtonElement>(null);
    const projectsMenuRef = useRef<HTMLDivElement>(null);
    const showTriggerRef = useRef<HTMLButtonElement>(null);
    const showMenuRef = useRef<HTMLDivElement>(null);
    const periodTriggerRef = useRef<HTMLButtonElement>(null);
    const periodMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (openDropdown === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            const el = dropdownsContainerRef.current;
            if (el && !el.contains(e.target as Node)) setOpenDropdown(null);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openDropdown]);

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const files = input.files;
        if (!files?.length) return;
        const newFiles = Array.from(files);
        setAttachmentFiles((prev) => [...prev, ...newFiles]);
        input.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    };

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
        const params: Record<string, string> = {};
        if (statusFilter) params.status = statusFilter;
        if (isTeam) params.condition = "1";

        Promise.all([
            api.get<{ tasks?: Task[] }>("/api/tasks", { params }),
            api.get<{ employees?: Employee[] }>("/api/employees"),
            api.get<{ projects?: Project[] }>("/api/projects")
        ])
            .then(([tasksRes, empRes, projRes]) => {
                setList(tasksRes.data.tasks ?? []);
                setEmployees(empRes.data.employees ?? []);
                setProjects(projRes.data.projects ?? []);
            })
            .catch(() => {
                setList([]);
            })
            .finally(() => setLoading(false));
    }, [isTeam, statusFilter]);

    // Data maps for dropdowns
    const employeeOptions = [
        "Select Employee",
        ...(Array.isArray(employees) ? employees : []).map(e => e?.full_name).filter(Boolean)
    ];

    const projectOptions = [
        "Select Projects",
        ...(Array.isArray(projects) ? projects : []).map(p => p?.project_name).filter(Boolean)
    ];

    const counts = {
        todo: allTasks.filter((t) => getEffectiveStatus(t) === "todo").length,
        in_progress: allTasks.filter(
            (t) => getEffectiveStatus(t) === "in_progress",
        ).length,
        completed: allTasks.filter((t) => getEffectiveStatus(t) === "completed")
            .length,
    };
    const tasksByStatus = {
        todo: allTasks.filter((t) => getEffectiveStatus(t) === "todo"),
        in_progress: allTasks.filter(
            (t) => getEffectiveStatus(t) === "in_progress",
        ),
        completed: allTasks.filter(
            (t) => getEffectiveStatus(t) === "completed",
        ),
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 overflow-auto min-h-screen">
            {/* Top row: title + dropdowns + Add task */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800">
                    {isTeam ? "Team Task" : "My Task"}
                </h2>
                <div
                    ref={dropdownsContainerRef}
                    className="flex flex-wrap items-center gap-2 w-fit"
                >
                    <TaskDropdown
                        label="Select Employee"
                        options={employeeOptions}
                        selected={selectedEmployee}
                        onSelect={setSelectedEmployee}
                        isOpen={openDropdown === "employee"}
                        onToggle={() =>
                            setOpenDropdown((d) => (d === "employee" ? null : "employee"))
                        }
                        onClose={() => setOpenDropdown(null)}
                        triggerRef={employeeTriggerRef}
                        dropdownRef={employeeMenuRef}
                    />
                    <TaskDropdown
                        label="Select Projects"
                        options={projectOptions}
                        selected={selectedProject}
                        onSelect={setSelectedProject}
                        isOpen={openDropdown === "projects"}
                        onToggle={() =>
                            setOpenDropdown((d) => (d === "projects" ? null : "projects"))
                        }
                        onClose={() => setOpenDropdown(null)}
                        triggerRef={projectsTriggerRef}
                        dropdownRef={projectsMenuRef}
                    />
                    <TaskDropdown
                        label="Show"
                        options={SHOW_OPTIONS}
                        selected={selectedShow}
                        onSelect={setSelectedShow}
                        isOpen={openDropdown === "show"}
                        onToggle={() =>
                            setOpenDropdown((d) => (d === "show" ? null : "show"))
                        }
                        onClose={() => setOpenDropdown(null)}
                        triggerRef={showTriggerRef}
                        dropdownRef={showMenuRef}
                        narrow
                    />
                    <TaskDropdown
                        label="Period"
                        options={PERIOD_OPTIONS}
                        selected={selectedPeriod}
                        onSelect={setSelectedPeriod}
                        isOpen={openDropdown === "period"}
                        onToggle={() =>
                            setOpenDropdown((d) => (d === "period" ? null : "period"))
                        }
                        onClose={() => setOpenDropdown(null)}
                        triggerRef={periodTriggerRef}
                        dropdownRef={periodMenuRef}
                        narrow
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setEditingTaskId(null);
                            setAddTaskForm({
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
                            setAddTaskModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
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
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Add task
                    </button>
                </div>
            </div>

            {/* Status summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                    to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow relative"
                >
                    <div className="absolute top-4 right-4 flex items-center justify-center">
                        <img src={Group1} alt="Group1" className="w-12 h-12 mt-1" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">To Do Task</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                        {counts.todo} Tasks
                    </p>
                </Link>

                <Link
                    to={
                        statusFilter === "in_progress"
                            ? pathname
                            : `${pathname}?status=in_progress`
                    }
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow relative"
                >
                    <div className="absolute top-4 right-4 flex items-center justify-center">
                        <img src={Group2} alt="Group2" className="w-12 h-12 mt-1" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">In Progress Task</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                        {counts.in_progress} Tasks
                    </p>
                </Link>

                <Link
                    to={
                        statusFilter === "completed"
                            ? pathname
                            : `${pathname}?status=completed`
                    }
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow relative"
                >
                    <div className="absolute top-4 right-4 flex items-center justify-center">
                        <img src={Group3} alt="Group3" className="w-12 h-12 mt-1" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Completed Task</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                        {counts.completed} Tasks
                    </p>
                </Link>
            </div>

            {/* Task cards under each status - drag and drop columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                    className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const taskId = Number(e.dataTransfer.getData("taskId"));
                        if (!Number.isNaN(taskId)) handleMoveTask(taskId, "todo");
                    }}
                >
                    {tasksByStatus.todo.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            status="todo"
                            onViewTask={openViewTask}
                            onEditTask={openEditTask}
                            onDeleteTask={openDeleteTask}
                        />
                    ))}
                </div>
                <div
                    className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const taskId = Number(e.dataTransfer.getData("taskId"));
                        if (!Number.isNaN(taskId)) handleMoveTask(taskId, "in_progress");
                    }}
                >
                    {tasksByStatus.in_progress.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            status="in_progress"
                            onViewTask={openViewTask}
                            onEditTask={openEditTask}
                            onDeleteTask={openDeleteTask}
                        />
                    ))}
                </div>
                <div className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1">
                    {tasksByStatus.completed.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            status="completed"
                            onViewTask={openViewTask}
                            onEditTask={openEditTask}
                            onDeleteTask={openDeleteTask}
                        />
                    ))}
                </div>
            </div>

            {/* Delete Task confirmation modal */}
            {deleteTaskId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setDeleteTaskId(null)}
                                className="p-1 rounded-sm text-black hover:bg-[#E0E0E0] bg-[#F0F0F0] transition-colors"
                                aria-label="Close"
                            >
                                <svg
                                    className="w-5 h-5"
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
                            <h3 className="flex-1 text-center text-lg font-semibold text-[#353535]">
                                Delete Task
                            </h3>
                            <div className="w-9" />
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-black text-center">
                                Are you sure, you want to Delete this Task?
                            </p>
                        </div>
                        <div className="flex justify-center gap-3 px-6 py-4 bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setDeleteTaskId(null)}
                                className="rounded-md bg-[#F0F0F0] px-5 py-2 text-sm font-medium text-black hover:bg-[#E0E0E0]"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteTask}
                                className="rounded-lg bg-[#FFD9D9] px-5 py-2 text-sm font-medium text-[#E00100] hover:bg-[#FFB3B3]"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New Task modal */}
            {addTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-[#FFFFFF] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <button
                                type="button"
                                onClick={resetTaskFormAndClose}
                                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close"
                            >
                                <svg
                                    className="w-5 h-5"
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
                            <h3 className="text-lg font-semibold text-black">
                                {editingTaskId !== null ? "Edit Task" : "Add New Task"}
                            </h3>
                            <div className="w-9" />
                        </div>
                        <form
                            className="flex-1 overflow-y-auto p-6"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const isEditing = editingTaskId !== null;
                                const existing = isEditing
                                    ? list.find((t) => t.id === editingTaskId)
                                    : null;

                                const payload = {
                                    projectid: projects.find(p => p.project_name === addTaskForm.projectName)?.id || addTaskForm.projectName,
                                    taskName: addTaskForm.taskName,
                                    category: addTaskForm.type,
                                    startdate: addTaskForm.actualStartDate,
                                    dueDate: addTaskForm.actualEndDate,
                                    startTime: addTaskForm.startTime,
                                    dueTime: addTaskForm.dueTime,
                                    assignedTo: employees.find(e => e.full_name === addTaskForm.assignTo)?.id || addTaskForm.assignTo,
                                    description: addTaskForm.description,
                                    checklist: addTaskForm.checklist,
                                    modules: addTaskForm.module
                                };

                                const handleFiles = (taskId: number | string) => {
                                    if (attachmentFiles.length > 0) {
                                        const formData = new FormData();
                                        attachmentFiles.forEach(f => formData.append("image", f));
                                        api.post(`/api/tasks/${taskId}/output-files`, formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                    }
                                };

                                if (isEditing && existing) {
                                    api.patch(`/api/tasks/${existing.id}`, {
                                        task_name: payload.taskName,
                                        assigned_to: payload.assignedTo,
                                        due_date: payload.dueDate,
                                        category: payload.category,
                                        description: payload.description,
                                        checklist: payload.checklist,
                                        modules_name: payload.modules,
                                        Actual_start_time: payload.startdate,
                                        start_time: payload.startTime,
                                        due_time: payload.dueTime
                                    }).then(() => {
                                        handleFiles(existing.id);
                                        api.get<{ tasks?: Task[] }>("/api/tasks").then(res => setList(res.data.tasks ?? []));
                                    });
                                } else {
                                    api.post('/api/tasks', payload).then(res => {
                                        if (res.data.success && res.data.task_id) {
                                            handleFiles(res.data.task_id);
                                            api.get<{ tasks?: Task[] }>("/api/tasks").then(r => setList(r.data.tasks ?? []));
                                        }
                                    });
                                }
                                resetTaskFormAndClose();
                            }}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Project Name
                                    </label>
                                    <FormDropdown
                                        label="Select Project name"
                                        options={[
                                            { value: "", label: "Select Project name" },
                                            ...projects.map(p => ({ value: p.project_name, label: p.project_name }))
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
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Select Module
                                    </label>
                                    <FormDropdown
                                        label="Select Module"
                                        options={[
                                            { value: "", label: "Select Module" },
                                            { value: "module-1", label: "Module 1" },
                                            { value: "module-2", label: "Module 2" },
                                        ]}
                                        value={addTaskForm.module}
                                        onChange={(v) =>
                                            setAddTaskForm((f) => ({ ...f, module: v }))
                                        }
                                        isOpen={openFormDropdown === "module"}
                                        onToggle={() =>
                                            setOpenFormDropdown((d) =>
                                                d === "module" ? null : "module",
                                            )
                                        }
                                        onClose={() => setOpenFormDropdown(null)}
                                        triggerRef={formModuleTriggerRef}
                                        dropdownRef={formModuleMenuRef}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-black mb-1">
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
                                            className={`flex-1 bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none ${editingTaskId !== null ? "rounded-sm" : "rounded-l-sm"
                                                }`}
                                        />
                                        {editingTaskId === null && (
                                            <button
                                                type="button"
                                                className="rounded-l-none rounded-r-sm bg-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50"
                                            >
                                                Tasklist
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
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
                                                setOpenFormDropdown((d) =>
                                                    d === "type" ? null : "type",
                                                )
                                            }
                                            onClose={() => setOpenFormDropdown(null)}
                                            triggerRef={formTypeTriggerRef}
                                            dropdownRef={formTypeMenuRef}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
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
                                            placeholder="dd/mm/yyyy"
                                            className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
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
                                            placeholder="dd/mm/yyyy"
                                            className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Select Start Time
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
                                            placeholder="hh:mm"
                                            className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Select Due Time
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
                                            placeholder="hh:mm"
                                            className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Assign To
                                        </label>
                                        <FormDropdown
                                            label="Select Assign To"
                                            options={[
                                                { value: "", label: "Select Assign To" },
                                                ...employees.map(e => ({ value: e.full_name, label: e.full_name }))
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
                                    <label className="block text-sm font-medium text-black mb-1">
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
                                        className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
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
                                        className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
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
                                    <div className="flex flex-wrap gap-2">
                                        <div className="flex flex-1 min-w-0">
                                            <input
                                                type="text"
                                                readOnly
                                                value={
                                                    attachmentFiles.length > 0
                                                        ? attachmentFiles.map((f) => f.name).join(", ")
                                                        : ""
                                                }
                                                placeholder="Upload Files"
                                                className="flex-1 rounded-l-sm rounded-r-none bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827] placeholder:text-[#8B8B8B] focus:outline-none truncate"
                                                title={
                                                    attachmentFiles.length > 0
                                                        ? attachmentFiles.map((f) => f.name).join(", ")
                                                        : undefined
                                                }
                                            />
                                            <label
                                                htmlFor="add-task-file-input"
                                                className="rounded-r-sm rounded-l-none bg-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50 cursor-pointer inline-flex items-center"
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
                                                    className="flex items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827]"
                                                >
                                                    <span className="truncate min-w-0" title={file.name}>
                                                        {file.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachment(index)}
                                                        className="ml-2 shrink-0 p-0.5 rounded text-black hover:bg-slate-200 hover:text-slate-700"
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
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-center gap-3 mt-6 pt-4 ">
                                <button
                                    type="button"
                                    onClick={resetTaskFormAndClose}
                                    className="rounded-lg bg-[#F2F2F2] px-5 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#DBE9FE] px-5 py-2 text-sm font-medium text-[#101827] hover:bg-[#D5E6FF]"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
