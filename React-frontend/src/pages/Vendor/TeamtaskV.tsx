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
    searchable?: boolean;
    searchPlaceholder?: string;
    maxVisibleItems?: number;
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
    searchable = false,
    searchPlaceholder = "Search...",
    maxVisibleItems = 5,
}: TaskDropdownProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const q = (searchQuery || "").trim().toLowerCase();
    const filteredOptions = searchable
        ? (() => {
            if (!q) return options;
            const first = options[0];
            const isPlaceholderOption = (o: string) =>
                o === first && (first === "Select Employee" || first === "Select Projects");
            return options.filter((opt) => {
                if (isPlaceholderOption(opt)) return false;
                const name = String(opt ?? "").trim().toLowerCase();
                return name.includes(q);
            });
        })()
        : options;
    const listMaxHeight = searchable ? `${maxVisibleItems * 40}px` : undefined;

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={`inline-flex items-center justify-between rounded-lg bg-[#E8E8E8] px-4 py-3 text-sm text-black shadow-sm ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`}
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
                    className={`absolute top-full left-0 z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg ${narrow ? "min-w-[110px]" : "min-w-[160px]"}`}
                >
                    {searchable && (
                        <div className="sticky top-0 border-b border-slate-200 bg-white p-2 rounded-t-lg">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder={searchPlaceholder}
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400"
                                aria-label={searchPlaceholder}
                            />
                        </div>
                    )}
                    <div
                        className="overflow-y-auto py-1"
                        style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
                    >
                        {filteredOptions.map((opt, idx) => (
                            <button
                                key={`${opt}-${idx}`}
                                type="button"
                                role="option"
                                onClick={() => {
                                    if (searchable) setSearchQuery("");
                                    onSelect(opt);
                                    onClose();
                                }}
                                className={`block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 last:rounded-b-lg ${!searchable ? "first:rounded-t-lg" : ""}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
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
    created_at?: string;
    Approval?: string;
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
    if (!start && !end) return "\u2014";
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
    return end ? fmtFull(end) : "\u2014";
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
                    <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`}
                    />
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
                            className={`absolute top-full mt-1 z-50 min-w-[120px] rounded-2xl bg-[#FFFFFF] py-1 px-3 shadow-lg border border-[#59595980] transform-gpu transition-all duration-200 ease-out ${isCompleted ? "right-full mr-1 origin-top-right" : "left-full ml-1 origin-top-left"}
                 ${menuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
                            role="menu"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#DD4342] transition-colors group text-left"
                                onClick={() => {
                                    setMenuOpen(false);
                                    onViewTask?.(task);
                                }}
                            >
                                <VscEye className="w-4 h-4 shrink-0 text-slate-600 group-hover:text-red-600 transition-colors" />
                                <span>View</span>
                            </button>
                            {!isCompleted && (
                                <>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#DD4342] transition-colors text-left"
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
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#DD4342] transition-colors text-left"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onDeleteTask?.(task);
                                        }}
                                    >
                                        <HiOutlineTrash className="w-4 h-4 shrink-0" />
                                        <span>Delete</span>
                                    </button>
                                </>
                            )}
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
                <span className="text-xs font-medium text-slate-700">
                    {progress}%
                </span>
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

const SHOW_OPTIONS = ["Show", "10", "50", "100", "All"];
const PERIOD_OPTIONS = [
    "Period",
    "This Week",
    "This Month",
    "This Quarter",
    "Custom",
];

export default function TeamtaskV() {
    const [searchParams] = useSearchParams();
    const { pathname } = useLocation();
    const isTeam = true; // Consistently Team Board
    const statusFilter =
        searchParams.get("status") || searchParams.get("taskstatus");
    const STORAGE_KEY = "v_teamTask_localTasks";
    const DELETED_IDS_KEY = "v_teamTask_deletedIds";
    const STATUS_OVERRIDES_KEY = "v_teamTask_statusOverrides";

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
    const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [selectedShow, setSelectedShow] = useState<string | null>("Show");
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            api.get<{ employees: Employee[] }>("/api/employees"),
            api.get<{ projects: Project[] }>("/api/projects"),
        ]).then(([empRes, projRes]) => {
            setEmployees(empRes.data.employees || []);
            setProjects(projRes.data.projects || []);
        }).catch(() => { });
    }, []);

    const employeeOptions = ["Select Employee", "Show All", ...employees.map(e => e.full_name)];
    const projectOptions = ["Select Projects", "Show All", ...projects.map(p => p.project_name)];

    const safeLocal = Array.isArray(localTasks) ? localTasks.filter(Boolean) : [];
    const safeList = Array.isArray(list) ? list.filter(Boolean) : [];
    const merged = [
        ...safeLocal,
        ...safeList.filter((t) => t && !safeLocal.some((l) => l && l.id === t.id)),
    ];

    const allTasksBase = merged.filter((t) => t && t.id != null && !deletedIds.includes(t.id));
    const allTasks = allTasksBase.filter((t) => {
        if (selectedEmployee && !["Select Employee", "Show All"].includes(selectedEmployee)) {
            if (t.assigned_full_name !== selectedEmployee) return false;
        }
        if (selectedProject && !["Select Projects", "Show All"].includes(selectedProject)) {
            if (t.project_name !== selectedProject) return false;
        }
        if (selectedPeriod && !["Period", "Show All"].includes(selectedPeriod)) {
            const taskDate = new Date(t.created_at || t.start_date || "");
            const now = new Date();
            if (selectedPeriod === "This Week") {
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                if (taskDate < weekAgo) return false;
            } else if (selectedPeriod === "This Month") {
                const monthAgo = new Date();
                monthAgo.setMonth(now.getMonth() - 1);
                if (taskDate < monthAgo) return false;
            } else if (selectedPeriod === "This Quarter") {
                const quarterAgo = new Date();
                quarterAgo.setMonth(now.getMonth() - 3);
                if (taskDate < quarterAgo) return false;
            }
        }
        return true;
    });

    const getEffectiveStatus = (t: Task): "todo" | "in_progress" | "completed" =>
        normalizeStatus(statusOverrides[t.id] ?? t.status);

    const statusToLabel = (s: "todo" | "in_progress" | "completed"): string => {
        return s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : "Completed";
    };

    const handleMoveTask = (taskId: number, newStatus: "todo" | "in_progress" | "completed") => {
        const label = statusToLabel(newStatus);
        setStatusOverrides((prev) => ({ ...prev, [taskId]: label }));
        const statusMap = { todo: "Todo", in_progress: "InProgress", completed: "Completed" };
        const task = merged.find(t => t.id === taskId);

        api.patch(`/api/tasks/${taskId}/status`, {
            status: statusMap[newStatus],
            projectId: (task as any)?.projectid ?? (task as any)?.project_id
        }).catch(() => { });
    };

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localTasks));
            localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deletedIds));
            localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(statusOverrides));
        } catch { }
    }, [localTasks, deletedIds, statusOverrides]);

    useEffect(() => {
        setLoading(true);
        const params: Record<string, string> = { condition: "1" };
        if (statusFilter) params.status = statusFilter;
        api.get<{ tasks?: Task[] }>("/api/tasks", { params })
            .then(({ data }) => setList(data.tasks ?? []))
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    }, [statusFilter]);

    const tasksByStatus = {
        todo: allTasks.filter((t) => getEffectiveStatus(t) === "todo"),
        in_progress: allTasks.filter((t) => getEffectiveStatus(t) === "in_progress"),
        completed: allTasks.filter((t) => getEffectiveStatus(t) === "completed"),
    };

    const counts = {
        todo: tasksByStatus.todo.length,
        in_progress: tasksByStatus.in_progress.length,
        completed: tasksByStatus.completed.length,
    };

    const showLimit = selectedShow === "All" || !selectedShow || selectedShow === "Show"
        ? Number.POSITIVE_INFINITY
        : Number(selectedShow) || 10;

    const displayedTasksByStatus = {
        todo: tasksByStatus.todo.slice(0, showLimit),
        in_progress: tasksByStatus.in_progress.slice(0, showLimit),
        completed: tasksByStatus.completed.slice(0, showLimit),
    };

    const [addTaskForm, setAddTaskForm] = useState({
        projectName: "", module: "", taskName: "", type: "",
        actualStartDate: "", actualEndDate: "", startTime: "",
        dueTime: "", assignTo: "", description: "", checklist: "",
    });

    const openEditTask = (task: Task) => {
        setAddTaskForm(taskToFormValues(task));
        setEditingTaskId(task.id);
        setAddTaskModalOpen(true);
    };

    const openDeleteTask = (task: Task) => setDeleteTaskId(task.id);
    const openViewTask = (task: Task) => navigate("/v/mytasks/view", { state: { task } });

    const confirmDeleteTask = () => {
        if (deleteTaskId === null) return;
        api.delete(`/api/tasks/${deleteTaskId}`)
            .then(() => {
                setDeletedIds((prev) => [...prev, deleteTaskId]);
                setDeleteTaskId(null);
            })
            .catch(() => setDeleteTaskId(null));
    };

    const resetTaskFormAndClose = () => {
        setAddTaskModalOpen(false);
        setEditingTaskId(null);
        setAddTaskForm({
            projectName: "", module: "", taskName: "", type: "",
            actualStartDate: "", actualEndDate: "", startTime: "",
            dueTime: "", assignTo: "", description: "", checklist: "",
        });
    };

    const dropdownsContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (openDropdown === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownsContainerRef.current && !dropdownsContainerRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openDropdown]);

    const formProjectTriggerRef = useRef<HTMLButtonElement>(null);
    const formProjectMenuRef = useRef<HTMLDivElement>(null);
    const formModuleTriggerRef = useRef<HTMLButtonElement>(null);
    const formModuleMenuRef = useRef<HTMLDivElement>(null);
    const formTypeTriggerRef = useRef<HTMLButtonElement>(null);
    const formTypeMenuRef = useRef<HTMLDivElement>(null);
    const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
    const formAssignMenuRef = useRef<HTMLDivElement>(null);

    const [openFormDropdown, setOpenFormDropdown] = useState<FormDropdownId>(null);
    useEffect(() => {
        if (openFormDropdown === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const refs = openFormDropdown === "project" ? [formProjectTriggerRef, formProjectMenuRef]
                : openFormDropdown === "module" ? [formModuleTriggerRef, formModuleMenuRef]
                    : openFormDropdown === "type" ? [formTypeTriggerRef, formTypeMenuRef]
                        : [formAssignTriggerRef, formAssignMenuRef];
            if (!refs.some(r => r.current && r.current.contains(target))) setOpenFormDropdown(null);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openFormDropdown]);

    if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;

    return (
        <div className="space-y-6 overflow-auto min-h-screen">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Team Task</h2>
                <div ref={dropdownsContainerRef} className="flex flex-wrap items-center gap-2">
                    <TaskDropdown label="Select Employee" options={employeeOptions} selected={selectedEmployee} onSelect={setSelectedEmployee} isOpen={openDropdown === "employee"} onToggle={() => setOpenDropdown(d => d === "employee" ? null : "employee")} onClose={() => setOpenDropdown(null)} triggerRef={useRef(null)} dropdownRef={useRef(null)} searchable searchPlaceholder="Search Employee..." />
                    <TaskDropdown label="Select Projects" options={projectOptions} selected={selectedProject} onSelect={setSelectedProject} isOpen={openDropdown === "projects"} onToggle={() => setOpenDropdown(d => d === "projects" ? null : "projects")} onClose={() => setOpenDropdown(null)} triggerRef={useRef(null)} dropdownRef={useRef(null)} searchable searchPlaceholder="Search Projects..." />
                    <TaskDropdown label="Show" options={SHOW_OPTIONS} selected={selectedShow} onSelect={setSelectedShow} isOpen={openDropdown === "show"} onToggle={() => setOpenDropdown(d => d === "show" ? null : "show")} onClose={() => setOpenDropdown(null)} triggerRef={useRef(null)} dropdownRef={useRef(null)} narrow />
                    <TaskDropdown label="Period" options={PERIOD_OPTIONS} selected={selectedPeriod} onSelect={setSelectedPeriod} isOpen={openDropdown === "period"} onToggle={() => setOpenDropdown(d => d === "period" ? null : "period")} onClose={() => setOpenDropdown(null)} triggerRef={useRef(null)} dropdownRef={useRef(null)} />
                    <button onClick={() => { resetTaskFormAndClose(); setAddTaskModalOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add task
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[{ k: "todo", l: "To Do Task", g: Group1 }, { k: "in_progress", l: "In Progress Task", g: Group2 }, { k: "completed", l: "Completed Task", g: Group3 }].map(s => (
                    <Link key={s.k} to={statusFilter === s.k ? pathname : `${pathname}?status=${s.k}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="absolute top-4 right-4"><img src={s.g} alt="" className="w-12 h-12" /></div>
                        <p className="text-sm font-medium text-slate-500">{s.l}</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">{(counts as any)[s.k]} Tasks</p>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["todo", "in_progress", "completed"] as const).map(s => (
                    <div key={s} className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1" onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={e => { e.preventDefault(); const tid = Number(e.dataTransfer.getData("taskId")); if (!isNaN(tid)) handleMoveTask(tid, s); }}>
                        {displayedTasksByStatus[s].map(t => (
                            <TaskCard key={t.id} task={t} status={s} onViewTask={openViewTask} onEditTask={openEditTask} onDeleteTask={openDeleteTask} />
                        ))}
                    </div>
                ))}
            </div>

            {deleteTaskId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <button onClick={() => setDeleteTaskId(null)} className="p-1 rounded bg-[#F0F0F0] text-black hover:bg-[#E0E0E0]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            <h3 className="text-lg font-semibold text-[#353535]">Delete Task</h3>
                            <div className="w-5" />
                        </div>
                        <div className="px-6 py-8 text-center text-black">Are you sure you want to delete this task?</div>
                        <div className="flex justify-center gap-3 px-6 py-4 bg-slate-50">
                            <button onClick={() => setDeleteTaskId(null)} className="rounded-md bg-[#F0F0F0] px-5 py-2 text-sm font-medium text-black hover:bg-[#E0E0E0]">Discard</button>
                            <button onClick={confirmDeleteTask} className="rounded-lg bg-[#FFD9D9] px-5 py-2 text-sm font-medium text-[#E00100] hover:bg-[#FFB3B3]">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {addTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <button onClick={resetTaskFormAndClose} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            <h3 className="text-lg font-semibold text-black">{editingTaskId !== null ? "Edit Task" : "Add New Task"}</h3>
                            <div className="w-9" />
                        </div>
                        <form className="flex-1 overflow-y-auto p-6 space-y-4" onSubmit={e => { e.preventDefault(); const isEditing = editingTaskId !== null; const newTask: any = { id: isEditing ? editingTaskId : Date.now(), task_name: addTaskForm.taskName || "Task Name", status: "To Do", start_date: addTaskForm.actualStartDate || undefined, due_date: addTaskForm.actualEndDate || undefined, project_name: addTaskForm.projectName || undefined, progress: 0, module: addTaskForm.module || undefined, type: addTaskForm.type || undefined, start_time: addTaskForm.startTime || undefined, due_time: addTaskForm.dueTime || undefined, assign_to: addTaskForm.assignTo || undefined, description: addTaskForm.description || undefined, checklist: addTaskForm.checklist || undefined }; if (isEditing) { setLocalTasks(prev => { const idx = prev.findIndex(t => t.id === editingTaskId); if (idx >= 0) { const next = [...prev]; next[idx] = newTask; return next; } return [...prev, newTask]; }); } else { setLocalTasks(prev => [newTask, ...prev]); } resetTaskFormAndClose(); }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Project Name</label><FormDropdown label="Select Project name" options={projects.map(p => ({ value: p.project_name, label: p.project_name }))} value={addTaskForm.projectName} onChange={v => setAddTaskForm(f => ({ ...f, projectName: v }))} isOpen={openFormDropdown === "project"} onToggle={() => setOpenFormDropdown(d => d === "project" ? null : "project")} onClose={() => setOpenFormDropdown(null)} triggerRef={formProjectTriggerRef} dropdownRef={formProjectMenuRef} /></div>
                                <div><label className="block text-sm font-medium mb-1">Module</label><FormDropdown label="Select Module" options={[]} value={addTaskForm.module} onChange={v => setAddTaskForm(f => ({ ...f, module: v }))} isOpen={openFormDropdown === "module"} onToggle={() => setOpenFormDropdown(d => d === "module" ? null : "module")} onClose={() => setOpenFormDropdown(null)} triggerRef={formModuleTriggerRef} dropdownRef={formModuleMenuRef} /></div>
                                <div><label className="block text-sm font-medium mb-1">Task Name</label><input type="text" value={addTaskForm.taskName} onChange={e => setAddTaskForm(f => ({ ...f, taskName: e.target.value }))} placeholder="Enter Task Name" className="w-full bg-[#F2F3F4] rounded px-3 py-2 text-sm focus:outline-none" /></div>
                                <div><label className="block text-sm font-medium mb-1">Type</label><FormDropdown label="Select Type" options={[{ value: "Design", label: "Design" }, { value: "Review", label: "Review" }]} value={addTaskForm.type} onChange={v => setAddTaskForm(f => ({ ...f, type: v }))} isOpen={openFormDropdown === "type"} onToggle={() => setOpenFormDropdown(d => d === "type" ? null : "type")} onClose={() => setOpenFormDropdown(null)} triggerRef={formTypeTriggerRef} dropdownRef={formTypeMenuRef} /></div>
                                <div><label className="block text-sm font-medium mb-1">Assign To</label><FormDropdown label="Select Assign To" options={employees.map(e => ({ value: e.full_name, label: e.full_name }))} value={addTaskForm.assignTo} onChange={v => setAddTaskForm(f => ({ ...f, assignTo: v }))} isOpen={openFormDropdown === "assignTo"} onToggle={() => setOpenFormDropdown(d => d === "assignTo" ? null : "assignTo")} onClose={() => setOpenFormDropdown(null)} triggerRef={formAssignTriggerRef} dropdownRef={formAssignMenuRef} /></div>
                                <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={addTaskForm.actualStartDate} onChange={e => setAddTaskForm(f => ({ ...f, actualStartDate: e.target.value }))} className="w-full bg-[#F2F3F4] rounded px-3 py-2 text-sm focus:outline-none" /></div>
                                <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={addTaskForm.actualEndDate} onChange={e => setAddTaskForm(f => ({ ...f, actualEndDate: e.target.value }))} className="w-full bg-[#F2F3F4] rounded px-3 py-2 text-sm focus:outline-none" /></div>
                                <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={addTaskForm.description} onChange={e => setAddTaskForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full bg-[#F2F3F4] rounded px-3 py-2 text-sm focus:outline-none" /></div>
                            </div>
                            <div className="flex justify-center gap-3 pt-4"><button type="button" onClick={resetTaskFormAndClose} className="rounded-lg bg-[#F2F2F2] px-5 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50">Discard</button><button type="submit" className="rounded-lg bg-[#DBE9FE] px-5 py-2 text-sm font-medium text-[#101827] hover:bg-[#D5E6FF]">Submit</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
