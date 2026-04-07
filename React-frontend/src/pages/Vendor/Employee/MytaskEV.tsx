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
import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";

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
): "todo" | "in_progress" | "completed" {
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
    const progress =
        typeof task.progress === "number"
            ? task.progress
            : status === "todo"
                ? 0
                : status === "in_progress"
                    ? 50
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
            className={`rounded-md border border-slate-200 bg-white p-2.5 shadow-sm relative ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-semibold text-[#353535] text-[20px] truncate">
                    {task.task_name || "Task Name"}
                </h4>
                <div className="relative" ref={menuRef}>
                    <button
                        type="button"
                        draggable={false}
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((prev) => !prev);
                        }}
                        className="p-0.5 rounded cursor-pointer"
                        aria-label="More options"
                        aria-expanded={menuOpen}
                    >
                        <img src={Dot} alt="Dot" className="w-5 h-5 text-slate-600" />
                    </button>
                    {menuOpen && (
                        <div
                            className={`absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-white/20 backdrop-blur-md rounded-md border border-[#59595980] shadow-xl transition-all duration-200 ease-out origin-top-right
                                ${menuOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
                            role="menu"
                        >
                            <button
                                type="button"
                                role="menuitem"
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
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex flex-col ">
                    <span className="text-[14px] font-medium text-[#000000]">Start Date</span>
                    <span className="text-[14px] font-medium text-[#8B8B8B]">
                        {(task.start_date || task.Actual_start_time)
                            ? `${new Date(task.start_date || task.Actual_start_time!).getDate().toString().padStart(2, "0")}-${(new Date(task.start_date || task.Actual_start_time!).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.start_date || task.Actual_start_time!).getFullYear()}`
                            : "—"}
                </span>
            </div>

                <div className="flex flex-col items-end gap-1">
                    <span className="text-[14px] font-medium text-[#000000]">End Date</span>
                    <span className="text-[14px] font-medium text-[#8B8B8B]">
                        {task.due_date
                            ? `${new Date(task.due_date).getDate().toString().padStart(2, "0")}-${(new Date(task.due_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.due_date).getFullYear()}`
                            : ""}
                    </span>
                </div>
            </div>
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-[#8B8B8B]">Progress</span>
                <span className="text-xs font-medium text-[#8B8B8B]">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-4">
                <div
                    className="h-full rounded-full bg-[#8B8B8B]"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                    <div className="flex -space-x-2">
                        <div
                            className="w-7 h-7 rounded-full bg-slate-300 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                            title={`Assigned to: ${task.assigned_full_name || "Unassigned"}`}
                        >
                            {task.assigned_profile_picture ? (
                                <img
                                    src={getGlobalProfileUrl(task.assigned_to, task.assigned_profile_picture)}
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
                            className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                            title={`Assigned by: ${task.uploader_full_name || "System"}`}
                        >
                            {task.uploader_profile_picture ? (
                                <img
                                    src={getGlobalProfileUrl(task.uploaderid, task.uploader_profile_picture)}
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
                    className="group inline-flex items-center text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] gap-2 cursor-pointer"
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

const SHOW_OPTIONS = ["Show Entries", "1-50", "50-100", "101-150", "151-200","201-250","251-300","All"];
const PERIOD_OPTIONS = [
    "Period",
    "This Week",
    "This Month",
    "This Quarter",
    // "Custom",
];

export default function MytaskEV() {
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
        normalizeStatus(t.status);

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
        navigate(`/ve/mytasks/edit/${task.id}${listQueryString}`, {
            state: { task },
        });
    };

    const openDeleteTask = (task: Task) => {
        setDeleteTaskId(task.id);
    };

    const openViewTask = (task: Task) => {
        navigate(`/ve/mytasks/view/${task.id}${listQueryString}`, {
            state: { task },
        });
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
            api.get<{ tasks?: Task[] }>("/api/tasks", { params }),
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

    return (
        <div className="h-full min-h-0 flex flex-col overflow-hidden">
            {/* Top row: title + dropdowns + Add task */}
            <div className="bg-white pb-3 flex-shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                <h2 className="text-[24px] font-semibold text-slate-800 font-Gantari">
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
                        onClick={() =>
                            navigate(`/ve/mytasks/add${listQueryString}`)
                        }
                        className="inline-flex items-center gap-2 rounded-md bg-[#DD4342] px-4 py-2 text-[14px] font-medium text-[#F2F2F2] shadow-sm cursor-pointer"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <Link
                    to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
                    className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}
                >
                    <span className="text-xl font-bold text-[#0D1829]">To Do</span>
                    <span className="text-xl font-bold text-[#0D1829]">({counts.todo})</span>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                        <img src={Group1} alt="Group1" className="w-8 h-8" />
                    </div>
                </Link>

                <Link
                    to={
                        statusFilter === "in_progress"
                            ? pathname
                            : `${pathname}?status=in_progress`
                    }
                    className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
                >
                    <span className="text-xl font-bold text-[#0D1829]">In Progress</span>
                    <span className="text-xl font-bold text-[#0D1829]">({counts.in_progress})</span>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                        <img src={Group2} alt="Group2" className="w-8 h-8" />
                    </div>
                </Link>

                <Link
                    to={
                        statusFilter === "completed"
                            ? pathname
                            : `${pathname}?status=completed`
                    }
                    className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}
                >
                    <span className="text-xl font-bold text-[#0D1829]">Completed</span>
                    <span className="text-xl font-bold text-[#0D1829]">({counts.completed})</span>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                        <img src={Group3} alt="Group3" className="w-8 h-8" />
                    </div>
                </Link>
            </div>
            </div>

            {/* Task cards under each status - drag and drop columns */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pb-4">
                <div
                    className="space-y-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1"
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
                    className="space-y-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1"
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
                    className="space-y-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setDeleteTaskId(null)}
                                className="p-2 rounded-md text-black bg-[#F2F2F2] transition-colors"
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
                            <h3 className="flex-1 text-center text-[20px] font-medium text-[#353535]">
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
                                className="rounded-md bg-[#F2F2F2] px-5 py-2 text-[14px] font-medium text-[#353535] "
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteTask}
                                className="rounded-md bg-[#FFD9D9] px-5 py-2 text-[14px] font-medium text-[#E00100]"
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
