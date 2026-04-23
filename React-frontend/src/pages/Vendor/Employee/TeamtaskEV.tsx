import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import toast from "react-hot-toast";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";
import Group1 from "../../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../../assets/ProjectManager/MyTask/arrow.svg";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";
import { FiX } from "react-icons/fi";
import AddEditTaskEV from "./AddEditTaskEV";
import MyTaskViewEV from "./MyTaskViewEV";

type DropdownId = "employee" | "projects" | "show" | "period" | null;

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
    /** Comma-separated resource ids or names involved in this project */
    members?: string;
    members_names?: string[];
    project_manager_name?: string | null;
    lead_name?: string | null;
    bim_coordinator_name?: string | null;
    uploader_name?: string | null;
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
                if (isPlaceholderOption(opt)) return false; // hide placeholder when searching
                const name = String(opt ?? "").trim().toLowerCase();
                return name.includes(q);
            });
        })()
        : options;
    const listMaxHeight = `${maxVisibleItems * 40}px`;

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-[14px] cursor-pointer ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={label}
            >
                <span
                    className={`truncate font-gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#8B8B8B]"}`}
                >
                    {label.toLowerCase() === "show" && selected && selected !== label ? (
                        <>
                            <span className="text-[14px] text-[#353535]">Show:</span>{" "}
                            <span>{selected}</span>
                        </>
                    ) : (
                        (selected ?? label)
                    )}
                </span>
                <img
                    src={ArrowDown}
                    alt="arrow"
                    className={`ml-2 w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>
            {isOpen && (
                <div
                    ref={dropdownRef}
                    role="listbox"
                    className={`absolute top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg ${narrow ? "right-0 min-w-[110px]" : "left-0 w-full min-w-[160px]"}`}
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
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-[14px] text-slate-800 placeholder-slate-400"
                                aria-label={searchPlaceholder}
                            />
                        </div>
                    )}
                    <div
                        className="overflow-y-auto py-1 custom-scrollbar"
                        style={{ maxHeight: listMaxHeight }}
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
                                className={`block w-full px-4 py-2 text-left text-[14px] font-gantari transition-colors cursor-pointer ${selected === opt ? "bg-[#F2F2F2] text-[#353535]" : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"}`}
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
    modules_name?: string;
    type?: string;
    start_time?: string;
    due_time?: string;
    end_time?: string;
    assign_to?: string;
    description?: string;
    checklist?: string;
    assigned_full_name?: string;
    uploader_full_name?: string;
    created_at?: string;
    Approval?: string;
    Actual_start_time?: string;
    assigned_to?: number;
    uploaderid?: number;
    vendor_id?: number;
    assigned_profile_picture?: string;
    uploader_profile_picture?: string;
}

type StatusKey = "todo" | "in_progress" | "completed";

const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || "";
};

const getProfileUrl = (path: string | undefined): string => {
    if (!path || path.trim() === "") return "";
    if (path.startsWith("http")) return path;

    let normalizedPath = path.replace(/\\/g, "/").trim();
    normalizedPath = normalizedPath.replace(/^\d+\s+/, "");
    normalizedPath = normalizedPath.replace(/^\/+/, "");

    const apiBaseUrl = getApiBaseUrl();
    let urlPath = "";

    if (normalizedPath.startsWith("employee/")) {
        const parts = normalizedPath.split("/");
        const encodedParts = parts.map((part, index) =>
            index === 0 ? part : encodeURIComponent(part),
        );
        urlPath = `/uploads/${encodedParts.join("/")}`;
    } else if (normalizedPath.startsWith("profiles/")) {
        const filename = normalizedPath.replace("profiles/", "");
        urlPath = `/uploads/employee/${encodeURIComponent(filename)}`;
    } else if (!normalizedPath.includes("/")) {
        urlPath = `/uploads/employee/${encodeURIComponent(normalizedPath)}`;
    } else {
        const parts = normalizedPath.split("/");
        const encodedParts = parts.map((part, index) =>
            index === 0 ? part : encodeURIComponent(part),
        );
        urlPath = `/uploads/${encodedParts.join("/")}`;
    }

    return `${apiBaseUrl}${urlPath}`;
};

function toApiTaskStatusParam(
    statusFilter: string | null | undefined,
): string | undefined {
    if (!statusFilter) return undefined;
    const s = statusFilter.toLowerCase().trim();
    if (s === "in_progress" || s === "inprogress") return "InProgress";
    if (s === "completed" || s === "complete" || s === "done") return "Completed";
    if (s === "todo" || s === "to_do" || s === "to-do") return "Todo";
    return statusFilter;
}

function normalizeStatus(
    s: string | undefined,
    approval?: string,
): "todo" | "in_progress" | "completed" {
    if (approval?.toLowerCase() === "approved" || approval?.toLowerCase() === "rejected")
        return "completed";
    if (!s) return "todo";
    const lower = s.toLowerCase().replace(/\s+/g, "_");
    if (lower.includes("progress") || lower === "in_progress")
        return "in_progress";
    if (lower.includes("complete") || lower === "done") return "completed";
    return "todo";
}

/** When /api/tasks rows omit project_name, resolve from vendor projects by project id. */
function enrichTasksWithProjectNames(tasks: Task[], projectList: Project[]): Task[] {
    if (!Array.isArray(tasks) || tasks.length === 0) return tasks;
    if (!Array.isArray(projectList) || projectList.length === 0) return tasks;
    return tasks.map((t) => {
        const row = t as Task & { projectName?: string };
        const fromApi =
            (t.project_name && String(t.project_name).trim()) ||
            (row.projectName && String(row.projectName).trim());
        if (fromApi) return { ...t, project_name: fromApi };
        const pid = t.projectid ?? t.project_id;
        if (pid == null) return t;
        const idNum = Number(pid);
        if (Number.isNaN(idNum)) return t;
        const proj = projectList.find((p) => p.id === idNum);
        if (!proj?.project_name) return t;
        return { ...t, project_name: proj.project_name };
    });
}

function TaskCard({
    task,
    status,
    onViewTask,
    onEditTask,
    onDeleteTask,
    isTeam = false
}: {
    task: Task;
    status: StatusKey;
    onViewTask?: (task: Task) => void;
    onEditTask?: (task: Task) => void;
    onDeleteTask?: (task: Task) => void;
    isTeam?: boolean;
}) {
    const progress =
        status === "completed" &&
            task.assigned_to != null &&
            task.uploaderid != null &&
            String(task.assigned_to) !== String(task.uploaderid)
            ? task.Approval?.toLowerCase() === "approved"
              ? 100
              : 95
            : status === "todo"
                ? 0
                : status === "in_progress"
                    ? 50
                    : typeof task.progress === "number"
                        ? task.progress
                        : 100;
    const isCompletedCol = status === "completed";
    const isUnderReview =
        status === "completed" &&
        task.assigned_to != null &&
        task.uploaderid != null &&
        String(task.assigned_to) !== String(task.uploaderid);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showMenu]);

    const formatDate = (d: any) => {
        if (!d) return "—";
        const s = String(d).trim();
        let date: Date;
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
            const [y, mo, day] = s.slice(0, 10).split("-").map(Number);
            date = new Date(y, mo - 1, day);
        } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(s)) {
            const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (m) date = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
            else date = new Date(s);
        } else {
            date = new Date(s);
        }
        if (Number.isNaN(date.getTime())) return "—";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <div
            draggable={!isCompletedCol}
            onDragStart={(e) => {
                e.dataTransfer.setData("taskId", String(task.id));
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", task.task_name || "Task");
            }}
            className={`flex flex-col bg-white rounded-xl border border-[#AEACAC52] p-4 shadow-sm hover:shadow-md transition-all duration-200 relative group font-Gantari w-full mb-4 ${isCompletedCol ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        >
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0 pr-6">
                    <h4 className="text-[20px] font-semibold text-[#353535] truncate leading-tight" title={task.task_name}>
                        {task.task_name || "Task Name"}
                    </h4>
                    {task.project_name && (
                        <p className="text-[13px] font-medium text-[#8B8B8B] truncate mt-0.5" title={task.project_name}>
                            {task.project_name}
                        </p>
                    )}
                </div>
                <div className="absolute top-4 right-4" ref={menuRef}>
                    <button
                        type="button"
                        draggable={false}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="p-1 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        <img src={Dot} alt="dot" className="w-4 h-4 object-contain" />
                    </button>

                    {showMenu && (
                        <div className="absolute top-full right-0 mt-2 z-50 min-w-[170px] bg-white/40 backdrop-blur-xl rounded-[15px] border border-[#59595980] shadow-2xl py-2.5 animate-in fade-in zoom-in duration-200 origin-top-right">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMenu(false);
                                    onViewTask?.(task);
                                }}
                                className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group/item cursor-pointer"
                            >
                                <img
                                    src={viewIcon}
                                    alt="view"
                                    className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                />
                                <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover/item:text-[#DD4342]">
                                    View
                                </span>
                            </button>
                            {!isCompletedCol && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowMenu(false);
                                            onEditTask?.(task);
                                        }}
                                        className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group/item cursor-pointer"
                                    >
                                        <img
                                            src={editIcon}
                                            alt="edit"
                                            className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                        />
                                        <span className="text-[14px] font-medium text-[#616161] group-hover/item:text-[#DD4342]">
                                            Edit
                                        </span>
                                    </button>
                                    {isTeam && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowMenu(false);
                                                onDeleteTask?.(task);
                                            }}
                                            className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group/item cursor-pointer"
                                        >
                                            <img
                                                src={deleteIcon}
                                                alt="delete"
                                                className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                            />
                                            <span className="text-[14px] font-medium text-[#616161] group-hover/item:text-[#DD4342]">
                                                Delete
                                            </span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-[#000000] mb-0.5">Start Date</span>
                    <span className="text-[14px] font-medium text-[#8B8B8B] font-Gantari">
                        {formatDate(task.start_date || (task as any).Actual_start_time)}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[14px] font-medium text-[#000000] mb-0.5">End Date</span>
                    <span className="text-[14px] font-medium text-[#8B8B8B] font-Gantari">
                        {formatDate(task.due_date)}
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-[#8B8B8B]">Progress</span>
                <span className="text-xs font-medium text-[#8B8B8B]">
                    {isUnderReview ? "95% (Under Review)" : `${progress}%`}
                </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#EAEAEA] overflow-hidden mb-5">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: progress === 100 ? "#22C55E" : "#8B8B8B"
                    }}
                />
            </div>

            <div className="flex items-center justify-between gap-2 mt-auto">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex -space-x-2">
                        {(() => {
                            const url = getGlobalProfileUrl(task.assigned_to, task.assigned_profile_picture, "vendor");
                            return (
                                <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-100 flex-shrink-0">
                                    <img
                                        src={url}
                                        alt="assignee"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assigned_full_name || "U")}&background=random`;
                                        }}
                                    />
                                </div>
                            );
                        })()}
                    </div>
                    <span className="text-sm font-medium text-[#353535] truncate" title={task.assigned_full_name}>
                        {task.assigned_full_name || "Unassigned"}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F2F3F4] rounded-full shrink-0">
                    <span className="text-[12px] font-medium text-[#616161] truncate max-w-[80px]">
                        {task.category || task.category_name || "General"}
                    </span>
                </div>
            </div>
        </div>
    );
}

const SHOW_OPTIONS = ["Show Entries", "1-50", "50-100", "101-150", "151-200","201-250","251-300","All"];
const PERIOD_OPTIONS = [
    "Period",
    "This Week",
    "This Month",
    "This Quarter",
    // "Custom",
];

export default function TeamtaskEV() {
    const [searchParams] = useSearchParams();
    const { pathname } = useLocation();
    const isTeam =
        searchParams.get("condition") === "1" ||
        pathname.endsWith("/team") ||
        pathname.includes("/teamtask");
    const statusFilter =
        searchParams.get("status") || searchParams.get("taskstatus");
    const [list, setList] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    const [currentPage, setCurrentPage] = useState<"list" | "add" | "edit" | "view">("list");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [selectedShow, setSelectedShow] = useState<string | null>("Show Entries");
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

    const allTasks = list.filter((t) => t && t.id != null).filter((t) => {
        // Employee filter
        if (selectedEmployee && !["Select Employee", "Show All", "Employee"].includes(selectedEmployee)) {
            if (t.assigned_full_name !== selectedEmployee) return false;
        }
        // Project filter
        if (selectedProject && !["Select Projects", "Show All", "Projects"].includes(selectedProject)) {
            if (t.project_name !== selectedProject) return false;
        }
        // Period filter 
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
        normalizeStatus(t.status, t.Approval);

    const statusMap: Record<"todo" | "in_progress" | "completed", string> = {
        todo: "Todo",
        in_progress: "InProgress",
        completed: "Completed",
    };

    const handleMoveTask = (
        taskId: number,
        newStatus: "todo" | "in_progress" | "completed"
    ) => {
        const taskRow = list.find((t) => t && t.id === taskId);
        if (taskRow) {
            const current = getEffectiveStatus(taskRow);
            if (current === "todo" && newStatus === "completed") {
                toast.error("Move the task to In Progress before marking it completed.");
                return;
            }
            if (current === "completed" && newStatus !== "completed") {
                toast.error("Completed tasks cannot be moved.");
                return;
            }
        }

        setList((prev) =>
            prev.map((t) => (t && t.id === taskId ? { ...t, status: statusMap[newStatus] } : t))
        );

        api.patch(`/api/vendors/vendor-tasks/${taskId}/status`, {
            status: statusMap[newStatus],
        }).catch((err) => {
            console.error("Failed to update status:", err);
            toast.error("Failed to update status");
        });
    };

    const navigate = useNavigate();
    const listQueryString = useMemo(() => {
        const s = searchParams.toString();
        return s ? `?${s}` : "";
    }, [searchParams]);

    const openEditTask = (task: Task) => {
        setSelectedTask(task);
        setCurrentPage("edit");
    };

    const openDeleteTask = (task: Task) => {
        setDeleteTaskId(task.id);
    };

    const openViewTask = (task: Task) => {
        setSelectedTask(task);
        setCurrentPage("view");
    };

    const openAddTask = () => {
        setSelectedTask(null);
        setCurrentPage("add");
    };

    const confirmDeleteTask = () => {
        if (deleteTaskId === null) return;
        api.delete(`/api/vendors/vendor-tasks/${deleteTaskId}`)
            .then(() => {
                setList((prev) => prev.filter((t) => t.id !== deleteTaskId));
                toast.success("Task deleted");
            })
            .catch(() => {
                toast.error("Failed to delete task");
            })
            .finally(() => {
                setDeleteTaskId(null);
            });
    };

    const dropdownsContainerRef = useRef<HTMLDivElement>(null);
    const employeeTriggerRef = useRef<HTMLButtonElement>(null);
    const employeeMenuRef = useRef<HTMLDivElement>(null);
    const projectsTriggerRef = useRef<HTMLButtonElement>(null);
    const projectsMenuRef = useRef<HTMLDivElement>(null);
    const showTriggerRef = useRef<HTMLButtonElement>(null);
    const showMenuRef = useRef<HTMLDivElement>(null);
    const periodTriggerRef = useRef<HTMLButtonElement>(null);
    const periodMenuRef = useRef<HTMLDivElement>(null);

    // No extra mapping needed here: we trust backend's assigned_full_name

    useEffect(() => {
        if (openDropdown === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            const el = dropdownsContainerRef.current;
            if (el && !el.contains(e.target as Node)) setOpenDropdown(null);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openDropdown]);

    useEffect(() => {
        // IMPORTANT:
        // - Involvement detection must NOT be status-filtered, otherwise clicking KPI links
        //   like ?status=in_progress can hide tasks by emptying involvedProjectIds.
        // - Only the team-board list fetch should apply the status filter.
        const myScopeParams: Record<string, string> = {};

        const allParams: Record<string, string> = {};
        const apiStatus = toApiTaskStatusParam(statusFilter);
        if (apiStatus) allParams.status = apiStatus;
        if (isTeam) {
            allParams.condition = "1";
            allParams.employeeid = "all";
        }

        // Vendor employee team board uses vendor_task (same as TeamtaskV). /api/tasks omits
        // outsource-linked projects, so tasks added from /ve/teamtasks/add would not appear.
        Promise.all([
            // My-scope tasks (created/assigned/involved) → used to determine involved projects
            api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params: myScopeParams }),
            // Full task list (team board) → later scoped to involved projects only
            api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params: allParams }),
            api.get<{ success?: boolean; resources?: Employee[] }>(
                "/api/vendors/vendor-resource-profiles",
            ),
            api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
        ])
            .then(([myTasksRes, allTasksRes, resourcesRes, projRes]) => {
                const projectRows = projRes.data.projects ?? [];
                const myTasks = myTasksRes.data.tasks ?? [];
                const allTasks = allTasksRes.data.tasks ?? [];

                const involvedProjectIds = new Set<number>(
                    myTasks
                        .map((t) => Number(t.project_id ?? t.projectid))
                        .filter((id) => !Number.isNaN(id) && id > 0),
                );

                const scopedTasks =
                    involvedProjectIds.size > 0
                        ? allTasks.filter((t) => {
                            const pid = Number(t.project_id ?? t.projectid);
                            return !Number.isNaN(pid) && involvedProjectIds.has(pid);
                        })
                        : myTasks;

                const scopedProjects =
                    involvedProjectIds.size > 0
                        ? projectRows.filter((p) => involvedProjectIds.has(Number(p.id)))
                        : [];

                setList(enrichTasksWithProjectNames(scopedTasks, projectRows));
                setEmployees(resourcesRes.data.resources ?? []);
                setProjects(scopedProjects);
            })
            .catch(() => {
                setList([]);
            })
            .finally(() => setLoading(false));
    }, [isTeam, statusFilter]);

    // Data maps for dropdowns
    const getEmployeeOptions = () => {
        const rawEmployees = Array.isArray(employees) ? employees : [];
        if (!selectedProject || selectedProject === "Select Projects" || selectedProject === "Show All") {
            return ["Select Employee", ...rawEmployees.map((e) => e?.full_name || e?.name).filter(Boolean) as string[]];
        }
        const proj = (Array.isArray(projects) ? projects : []).find((p) => p?.project_name === selectedProject);
        if (!proj) {
            return ["Select Employee", ...rawEmployees.map((e) => e?.full_name || e?.name).filter(Boolean) as string[]];
        }
        const involvedNames = new Set<string>();
        if (proj.project_manager_name) involvedNames.add(proj.project_manager_name);
        if (proj.lead_name) involvedNames.add(proj.lead_name);
        if (proj.bim_coordinator_name) involvedNames.add(proj.bim_coordinator_name);
        if (proj.uploader_name) involvedNames.add(proj.uploader_name);
        if (Array.isArray(proj.members_names)) {
            proj.members_names.forEach((name: string) => {
                if (name) involvedNames.add(name);
            });
        }

        const validEmployees = rawEmployees.filter((e) => (e?.full_name || e?.name) && involvedNames.has((e?.full_name || e?.name) as string));

        return ["Select Employee", ...validEmployees.filter(isEmployeeActiveForProjectAssignment).map((e) => e?.full_name || e?.name).filter(Boolean) as string[]];
    };

    const employeeOptions = getEmployeeOptions();

    const projectOptions = [
        "Select Projects",
        ...(Array.isArray(projects) ? projects : [])
            .map((p) => p?.project_name)
            .filter(Boolean),
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
        completed: allTasks.filter((t) => getEffectiveStatus(t) === "completed"),
    };
    const showLimit =
        selectedShow === "All" || !selectedShow
            ? Number.POSITIVE_INFINITY
            : Math.max(1, Number(selectedShow) || 10);
    const displayedTasksByStatus = {
        todo: tasksByStatus.todo.slice(0, showLimit),
        in_progress: tasksByStatus.in_progress.slice(0, showLimit),
        completed: tasksByStatus.completed.slice(0, showLimit),
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    if (currentPage === "add" || currentPage === "edit") {
        return (
            <AddEditTaskEV
                taskId={selectedTask?.id}
                onBack={() => setCurrentPage("list")}
            />
        );
    }

    if (currentPage === "view") {
        return (
            <MyTaskViewEV
                taskId={selectedTask?.id}
                onBack={() => setCurrentPage("list")}
            />
        );
    }

    return (
        <div className="h-full min-h-0 flex flex-col overflow-hidden px-5 font-Gantari">
            {/* Top row: title + dropdowns + Add task */}
            <div className="bg-white px-0 md:px-1 py-4 flex-shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-[20px] md:text-[24px] font-semibold text-slate-800 font-Gantari">
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
                        searchable
                        searchPlaceholder="Search employee..."
                        maxVisibleItems={5}
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
                        searchable
                        searchPlaceholder="Search project..."
                        maxVisibleItems={5}
                    />
                    <TaskDropdown
                        label="Show Entries"
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
                        maxVisibleItems={4}
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
                        maxVisibleItems={4}
                    />
                        <button
                            type="button"
                            onClick={openAddTask}
                            className="inline-flex items-center gap-2 rounded-md bg-[#DD4342] border border-[#DD4342] px-4 py-2 text-sm font-semibold text-white cursor-pointer font-Gantari"
                        >
                            <img
                                src={AddBtn}
                                alt="Add"
                                className="h-5 w-5"
                            />
                            Create Task
                        </button>
                </div>
            </div>

            {/* Status summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 pt-2">
                <Link
                    to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
                    className={`flex items-center p-4 gap-3 md:gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative cursor-pointer ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}
                >
                    <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829] font-Gantari">
                        To Do
                    </span>
                    <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829] font-Gantari">
                        ({counts.todo})
                    </span>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                        <img src={Group1} alt="Group1" className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                </Link>
                <Link
                    to={statusFilter === "in_progress" ? pathname : `${pathname}?status=in_progress`}
                    className={`flex items-center p-4 gap-3 md:gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative cursor-pointer ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
                >
                    <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829] font-Gantari">
                        Inprogress
                    </span>
                    <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829] font-Gantari">
                        ({counts.in_progress})
                    </span>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                        <img src={Group2} alt="Group2" className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                </Link>
                <Link
                    to={statusFilter === "completed" ? pathname : `${pathname}?status=completed`}
                    className={`flex items-center p-4 gap-3 md:gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative cursor-pointer ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}
                >
                    <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829] font-Gantari">
                        Completed
                    </span>
                    <span className="text-[16px] md:text-[20px] font-bold text-[#0D1829] font-Gantari">
                        ({counts.completed})
                    </span>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                        <img src={Group3} alt="Group3" className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                </Link>
            </div>
            </div>

            {/* Task cards under each status - drag and drop columns */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-10 mt-2">
                <div
                    className="space-y-4 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors"
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
                    {displayedTasksByStatus.todo.map((task) => (
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
                    className="space-y-4 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors"
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
                    {displayedTasksByStatus.in_progress.map((task) => (
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
                <div
                    className="space-y-4 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const taskId = Number(e.dataTransfer.getData("taskId"));
                        if (!Number.isNaN(taskId)) handleMoveTask(taskId, "completed");
                    }}
                >
                    {displayedTasksByStatus.completed.map((task) => (
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
            </div>

            {/* Delete Task confirmation modal */}
            {deleteTaskId !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center animate-in zoom-in-95 duration-200">
                        {/* Close Icon in Top Left with Tooltip */}
                        <div className="absolute left-4 top-4 group z-50">
                            <button
                                type="button"
                                onClick={() => setDeleteTaskId(null)}
                                className="p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                            >
                                <FiX className="h-5 w-5 text-black" />
                            </button>
                            {/* Premium Tooltip */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-2 py-0.5 relative z-10">
                                    <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                        Go Back
                                    </span>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-[24px] font-Gantari font-semibold text-[#000000] mt-8 mb-2 text-center">
                            Delete Task
                        </h3>
                        <p className="text-[16px] font-Gantari font-medium text-[#353535] mb-10 text-center max-w-[80%]">
                            Are you sure, you want to Delete this?
                        </p>

                        <div className="flex items-center gap-6 mb-8">
                            <button
                                type="button"
                                onClick={() => setDeleteTaskId(null)}
                                className="px-10 py-2.5 rounded-[10px] bg-[#E8E8E8] text-[#353535] font-Gantari font-semibold text-[16px] transition-all cursor-pointer border-0"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteTask}
                                className="px-10 py-2.5 rounded-[10px] bg-[#FFD9D9] text-[#E00100] font-Gantari font-semibold text-[16px] transition-all cursor-pointer border-0"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
