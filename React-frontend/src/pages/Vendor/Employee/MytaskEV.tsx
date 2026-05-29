import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import toast from "react-hot-toast";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";
import Group1 from "../../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../../assets/ProjectManager/MyTask/arrow.svg";
import { useAuth } from "../../../contexts/AuthContext";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import { FiX } from "react-icons/fi";
import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";
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
                o === first && (first === "Select Employee" || first === "Select Project");
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
    progress?: number | string;
    reviewer_progress?: string | number;
    module?: string;
    modules_name?: string;
    type?: string;
    start_time?: string;
    due_time?: string;
    end_time?: string;
    assign_to?: string;
    description?: string;
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
    const { user } = useAuth();
    const uploaderId = (task as any).uploaderid ?? (task as any).vendor_id;
    const isOwner = String(uploaderId) === String(user?.id);
    const isAssignee = String(task.assigned_to) === String(user?.id);
    const isSelf = isOwner && isAssignee;

    // Real data from task
    const realStatus = normalizeStatus(task.status, task.Approval);
    const realProgress = task.progress;

    // isUnderReview for TAG display
    const isUnderReview =
        !isSelf &&
        (Number(realProgress) === 95 || (task as any).reviewer_progress === "50") &&
        task.Approval?.toLowerCase() !== "approved";

    // Progress to display on this specific card in this specific column
    const progress = (status === "todo" && (Number(realProgress) === 95) && isOwner)
        ? 0
        : (status === "in_progress" && (task as any).reviewer_progress === "50" && isOwner)
            ? 50
            : isUnderReview
                ? 95
                : status === "todo"
                    ? (task.progress && !isNaN(Number(task.progress)) ? Number(task.progress) : 0)
                    : status === "in_progress"
                        ? (task.progress && !isNaN(Number(task.progress)) ? Number(task.progress) : 50)
                        : 100;
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

    const assigneeInitials = (task.assigned_full_name || "U")
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    const uploaderInitials = (task.uploader_full_name || "S")
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div
            draggable={!isCompleted}
            onDragStart={handleDragStart}
            className={`rounded-md border border-slate-200 bg-white p-4 shadow-sm relative transition-all hover:shadow-md font-Gantari ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        >
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex-1 min-w-0 pr-6">
                    <h4 className="text-[20px] font-semibold text-[#353535] truncate leading-tight">
                        {task.task_name || "Task Name"}
                    </h4>
                </div>
                <div className="absolute top-4 right-4" ref={menuRef}>
                    <button
                        type="button"
                        draggable={false}
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((prev) => !prev);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="rounded cursor-pointer leading-none transition-colors"
                        aria-label="More options"
                        aria-expanded={menuOpen}
                    >
                        <img src={Dot} alt="Dot" className="w-4 h-4 object-contain" />
                    </button>
                    {menuOpen && (
                        <div
                            className="absolute top-full right-0 mt-2 z-50 min-w-[170px] bg-white/40 backdrop-blur-xl rounded-[15px] border border-[#59595980] shadow-2xl py-2.5 animate-in fade-in zoom-in duration-200 origin-top-right"
                            role="menu"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                onMouseDown={(e) => e.stopPropagation()}
                                className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                onClick={() => {
                                    setMenuOpen(false);
                                    onViewTask?.(task);
                                }}
                            >
                                <img
                                    src={viewIcon}
                                    alt="view"
                                    className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                />
                                <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                                    View
                                </span>
                            </button>
                            {!isCompleted && (
                                <>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onEditTask?.(task);
                                        }}
                                    >
                                        <img
                                            src={editIcon}
                                            alt="edit"
                                            className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                        />
                                        <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                                            Edit
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onDeleteTask?.(task);
                                        }}
                                    >
                                        <img
                                            src={deleteIcon}
                                            alt="delete"
                                            className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                        />
                                        <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                                            Delete
                                        </span>
                                    </button>
                                </>
                            )}
                            {isUnderReview && String((task as any).uploaderid ?? (task as any).vendor_id) === String(user?.id) && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer border-0 bg-transparent shadow-none"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        (window as any).handleApproveTask?.(task);
                                    }}
                                >
                                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-green-600">
                                        Approve
                                    </span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-[#000000] mb-0.5">Start Date</span>
                    <span className="text-[14px] font-medium text-[#8B8B8B]">
                        {(task.start_date || task.Actual_start_time)
                            ? `${new Date(task.start_date || task.Actual_start_time!).getDate().toString().padStart(2, "0")}-${(new Date(task.start_date || task.Actual_start_time!).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.start_date || task.Actual_start_time!).getFullYear()}`
                            : "—"}
                    </span>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[14px] font-medium text-[#000000] mb-0.5">End Date</span>
                    <span className="text-[14px] font-medium text-[#8B8B8B]">
                        {task.due_date
                            ? `${new Date(task.due_date).getDate().toString().padStart(2, "0")}-${(new Date(task.due_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.due_date).getFullYear()}`
                            : "—"}
                    </span>
                </div>
            </div>
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-[#8B8B8B]">Progress</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#8B8B8B]">
                        {progress}%
                    </span>
                    {isUnderReview && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">
                            Under Review
                        </span>
                    )}
                </div>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-4">
                <div
                    className="h-full rounded-full bg-[#8B8B8B] transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            <div className="flex items-center justify-between gap-2 mt-auto">
                <div className="flex items-center gap-1">
                    <div className="flex -space-x-1.5">
                        <div
                            className="w-7 h-7 rounded-full bg-slate-300 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden shadow-sm"
                            title={`Assigned to: ${task.assigned_full_name || "Unassigned"}`}
                        >
                            {task.assigned_profile_picture ? (
                                <img
                                    src={getGlobalProfileUrl(task.assigned_to, task.assigned_profile_picture, "vendor")}
                                    alt="Assignee"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = getProfileUrl(task.assigned_profile_picture);
                                        target.onerror = () => {
                                            target.style.display = "none";
                                            const parent = target.parentElement;
                                            if (parent) {
                                                const span = document.createElement("span");
                                                span.className = "text-[10px] font-semibold text-slate-700";
                                                span.innerText = assigneeInitials;
                                                parent.appendChild(span);
                                            }
                                        };
                                    }}
                                />
                            ) : (
                                <span>{assigneeInitials}</span>
                            )}
                        </div>

                        <div
                            className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden shadow-sm"
                            title={`Assigned by: ${task.uploader_full_name || "System"}`}
                        >
                            {task.uploader_profile_picture ? (
                                <img
                                    src={getGlobalProfileUrl(task.uploaderid, task.uploader_profile_picture, "vendor")}
                                    alt="Uploader"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = getProfileUrl(task.uploader_profile_picture);
                                        target.onerror = () => {
                                            target.style.display = "none";
                                            const parent = target.parentElement;
                                            if (parent) {
                                                const span = document.createElement("span");
                                                span.className = "text-[10px] font-semibold text-slate-700";
                                                span.innerText = uploaderInitials;
                                                parent.appendChild(span);
                                            }
                                        };
                                    }}
                                />
                            ) : (
                                <span>{uploaderInitials}</span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    draggable={false}
                    onClick={() => onViewTask?.(task)}
                    className="group inline-flex items-center text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] gap-2 cursor-pointer transition-colors"
                >
                    Details
                    <img
                        src={Arrow}
                        alt="Arrow"
                        className="w-2.5 h-2.5 transition-all duration-200 group-hover:brightness-0 group-hover:invert-[20%]"
                    />
                </button>
            </div>
        </div>
    );
}

const SHOW_OPTIONS = ["Show Entries", "1-50", "50-100", "101-150", "151-200", "201-250", "251-300", "All"];
const PERIOD_OPTIONS = [
    "Period",
    "This Week",
    "This Month",
    "This Quarter",
    // "Custom",
];

export default function MytaskEV() {
    const { user } = useAuth();
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
    const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

    const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [selectedShow, setSelectedShow] = useState<string | null>("Show Entries");
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

    const searchQueryParam = searchParams.get('q')?.toLowerCase() || "";

    const allTasks = list.filter((t) => t && t.id != null).filter((t) => {
        // Trust the backend filtering
        if (searchQueryParam) {
            const matchesSearch =
                (t.task_name || "").toLowerCase().includes(searchQueryParam) ||
                (t.project_name || "").toLowerCase().includes(searchQueryParam) ||
                (t.status || "").toLowerCase().includes(searchQueryParam);
            if (!matchesSearch) return false;
        }

        // Employee filter
        if (selectedEmployee && !["Select Employee", "Show All", "Employee"].includes(selectedEmployee)) {
            if (t.assigned_full_name !== selectedEmployee) return false;
        }
        // Project filter
        if (selectedProject && !["Select Project", "Show All", "Projects"].includes(selectedProject)) {
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

    const handleApproveTask = (task: Task) => {
        api.patch(`/api/vendors/vendor-tasks/${task.id}/status`, { status: "Approved" })
            .then(() => {
                toast.success("Task Approved");
                setList(prev => prev.map(t => t.id === task.id ? { ...t, Approval: "Approved", progress: 100 } : t));
            })
            .catch(() => toast.error("Failed to approve task"));
    };
    (window as any).handleApproveTask = handleApproveTask;

    const [statusOverrides, setStatusOverrides] = useState<Record<number, string>>({});

    const getEffectiveStatus = (t: Task): "todo" | "in_progress" | "completed" => {
        const status = normalizeStatus(statusOverrides[t.id] ?? t.status, t.Approval);
        const progress = t.progress;

        const uploaderId = (t as any).uploaderid ?? (t as any).vendor_id;
        const isOwner = String(uploaderId) === String(user?.id);
        const userName = (user?.full_name || user?.name || "").trim().toLowerCase();
        const taskAssigneeName = (t.assigned_full_name || t.assign_to || "").trim().toLowerCase();
        const isAssignedToMe = String(t.assigned_to) === String(user?.id) || (userName && taskAssigneeName === userName);
        const isAssignedToOthers = t.assigned_to != null && !isAssignedToMe;

        const isUnderReviewForMe = isOwner && isAssignedToOthers && (Number(progress) === 95) && normalizeStatus(t.status) === "completed";
        const isCorrectionForMe = isOwner && isAssignedToOthers && (t as any).reviewer_progress === "50";

        if (!isTeam) {
            if (isCorrectionForMe) {
                return "in_progress";
            }
            if (isUnderReviewForMe) {
                return "todo";
            }
        }

        return status;
    };

    const statusMap: Record<"todo" | "in_progress" | "completed", string> = {
        todo: "Todo",
        in_progress: "InProgress",
        completed: "Completed",
    };

    const handleMoveTask = (taskId: number, newStatus: "todo" | "in_progress" | "completed") => {
        const task = list.find((t) => t.id === taskId);
        if (!task) return;

        const current = getEffectiveStatus(task);
        const isReviewer = String(task.uploaderid ?? (task as any).vendor_id) === String(user?.id) && String(task.assigned_to) !== String(user?.id);

        if (current === "todo" && newStatus === "completed" && !isReviewer) {
            toast.error("Move the task to In Progress before marking it completed.");
            return;
        }
        if (current === "completed" && newStatus !== "completed") {
            toast.error("Completed tasks cannot be moved.");
            return;
        }

        const label = newStatus === "todo" ? "Todo" : newStatus === "in_progress" ? "In Progress" : "Completed";
        setStatusOverrides((prev) => ({ ...prev, [taskId]: label }));

        const statusMapApi = {
            todo: "Todo",
            in_progress: "InProgress",
            completed: "Completed",
        };

        const updateTaskState = (t: Task): Task => {
            if (t.id !== taskId) return t;
            const uploaderId = (t as any).uploaderid ?? (t as any).vendor_id;
            const isOwner = String(uploaderId) === String(user?.id);
            const isAssignee = String(t.assigned_to) === String(user?.id);
            const isReviewer = isOwner && !isAssignee;

            const normalizedLabel = newStatus.toLowerCase().replace(/\s+/g, "_");

            if (isReviewer) {
                if (normalizedLabel === "completed") {
                    return { ...t, status: "Completed", Approval: "Approved", progress: 100, reviewer_progress: "100" };
                }
                if (normalizedLabel === "in_progress") {
                    return { ...t, status: "InProgress", reviewer_progress: "50", progress: 95 };
                }
            }

            const isSelf = isOwner && isAssignee;

            return {
                ...t,
                status: statusMapApi[newStatus] || label,
                progress: newStatus === "completed" ? (isSelf ? 100 : 95) : newStatus === "in_progress" ? 50 : 0,
                Approval: (newStatus === "completed" && isSelf) ? "Approved" : t.Approval,
            };
        };

        setList((prev) => prev.map(updateTaskState));

        const endpoint = `/api/vendors/vendor-tasks/${taskId}/status`;
        const projectId = (task as any)?.projectid ?? (task as any)?.project_id;

        api.patch(endpoint, {
            status: newStatus.replace("_", ""),
            projectId,
        })
            .then(() => {
                toast.success("Updated successfully");
            })
            .catch((err) => {
                console.error("Failed to update task status:", err);
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
        const params: Record<string, string> = {};
        if (statusFilter) params.status = statusFilter;
        if (isTeam) {
            params.condition = "1";
            params.employeeid = "all";
        }

        Promise.all([
            api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params }),
            api.get<{ success?: boolean; resources?: Employee[] }>(
                "/api/vendors/vendor-resource-profiles",
            ),
            api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
        ])
            .then(([tasksRes, resourcesRes, projRes]) => {
                setList(tasksRes.data.tasks ?? []);
                setEmployees(resourcesRes.data.resources ?? []);
                setProjects(projRes.data.projects ?? []);
            })
            .catch(() => {
                setList([]);
            })
            .finally(() => setLoading(false));
    }, [isTeam, statusFilter]);

    // Data maps for dropdowns
    const getEmployeeOptions = () => {
        const rawEmployees = Array.isArray(employees) ? employees : [];
        if (!selectedProject || selectedProject === "Select Project" || selectedProject === "Show All") {
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
        "Select Project",
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
        completed: allTasks.filter(
            (t) => getEffectiveStatus(t) === "completed",
        ),
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
            <div className="bg-white flex-shrink-0 pt-0 sm:pt-0 sm:mt-2">
                {/* Row 1: Title and Add Task button for mobile only (hidden on lg) */}
                <div className="flex flex-row items-center justify-between w-full mb-4 lg:hidden">
                    <h2 className="text-[20px] sm:text-[24px] font-semibold text-slate-800 font-Gantari">
                        {isTeam ? "Team Task" : "My Task"}
                    </h2>
                    <button
                        type="button"
                        onClick={openAddTask}
                        className="sm:hidden inline-flex items-center justify-center gap-2 rounded-md bg-[#DD4342] px-2 py-1.5 text-[14px] font-medium text-[#F2F2F2] shadow-sm cursor-pointer whitespace-nowrap active:scale-[0.98] transition-all border-0"
                    >
                        Add Task
                    </button>
                </div>

                {/* Row 2: Title (LG only) + Filters + Desktop Add Task button */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                    <h2 className="hidden lg:block text-[24px] font-semibold text-slate-800 font-Gantari">
                        {isTeam ? "Team Task" : "My Task"}
                    </h2>
                    <div
                        ref={dropdownsContainerRef}
                        className="grid grid-cols-2 lg:flex lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto font-Gantari"
                    >
                        <div className="w-full lg:w-auto">
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
                        </div>
                        <div className="w-full lg:w-auto">
                            <TaskDropdown
                                label="Select Project"
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
                        </div>
                        <div className="w-full lg:w-auto">
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
                            />
                        </div>
                        <div className="w-full lg:w-auto">
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
                        </div>
                        <button
                            type="button"
                            onClick={openAddTask}
                            className="hidden sm:inline-flex items-center justify-center gap-2 rounded-md bg-[#DD4342] px-4 py-2 text-[14px] font-semibold text-white shadow-sm cursor-pointer whitespace-nowrap active:scale-[0.98] transition-all border-0 font-Gantari h-[38px]"
                        >
                            Add Task
                        </button>
                    </div>
                </div>
            </div>

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

            {/* Task cards under each status - drag and drop columns */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#979797] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#7F7F7F] [scrollbar-width:thin] [scrollbar-color:#979797_transparent] [&::-webkit-scrollbar-button]:block [&::-webkit-scrollbar-button]:h-2 [&::-webkit-scrollbar-button:vertical:decrement]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 2L1 8h8z\' fill=\'%23979797\'/></svg>')] [&::-webkit-scrollbar-button:vertical:increment]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 8L1 2h8z\' fill=\'%23979797\'/></svg>')] pr-1 -mr-1">
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
                                        Close
                                    </span>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-[24px] font-Gantari font-semibold text-[#000000] text-center mb-6 mt-6">
                            Delete Task
                        </h3>
                        <p className="text-[16px] font-Gantari font-medium text-[#353535] mb-10 text-center max-w-[80%]">
                            Are you sure, you want to Delete this?
                        </p>

                        <div className="flex items-center gap-6 mb-8">
                            <button
                                type="button"
                                onClick={() => setDeleteTaskId(null)}
                                className="w-full sm:w-auto px-10 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-Gantari font-semibold text-[14px] cursor-pointer"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteTask}
                                className="w-full sm:w-auto px-10 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-Gantari font-semibold text-[14px] cursor-pointer"
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
