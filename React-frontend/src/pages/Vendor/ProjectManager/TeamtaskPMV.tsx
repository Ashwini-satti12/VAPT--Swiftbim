import { useEffect, useState, useRef, useMemo } from "react";
import {
    Link,
    useSearchParams,
    useLocation,
    useNavigate,
} from "react-router-dom";
import api from "../../../lib/api";
import toast from "react-hot-toast";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import Group1 from "../../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../../assets/ProjectManager/MyTask/arrow.svg";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";

type DropdownId = "employee" | "projects" | "show" | "period" | null;


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
    type?: string;
    start_time?: string;
    due_time?: string;
    end_time?: string;
    assign_to?: string;
    description?: string;
    checklist?: string;
    assigned_full_name?: string;
    uploader_full_name?: string;
    Approval?: string;
    projectid?: number;
    created_at?: string;
    assigned_to?: number;
    uploaderid?: number;
    vendor_id?: number;
    assigned_profile_picture?: string;
    uploader_profile_picture?: string;
    Actual_start_time?: string;
}

interface Employee {
    id: number;
    full_name: string;
    active?: string;
}

interface Project {
    id: number;
    project_name: string;
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
}: TaskDropdownProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const q = (searchQuery || "").trim().toLowerCase();
    const filteredOptions = searchable
        ? options.filter(opt => {
            if (opt === options[0] && (opt === "Select Employee" || opt === "Select Projects")) return false;
            return String(opt ?? "").toLowerCase().includes(q);
        })
        : options;

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-[14px] cursor-pointer outline-none border-0 ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`}
            >
                <span className={`truncate font-Gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#616161]"}`}>
                    {label === "Show Entries" && selected && selected !== label ? (
                        <><span className="text-[#353535]">Show:</span> {selected}</>
                    ) : (selected ?? label)}
                </span>
                <svg className={`ml-2 w-3 h-3 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div ref={dropdownRef} className={`absolute top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg ${narrow ? "right-0 min-w-[110px]" : "left-0 min-w-[160px]"}`}>
                    {searchable && (
                        <div className="sticky top-0 border-b border-slate-200 bg-white p-2 rounded-t-lg">
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none"
                            />
                        </div>
                    )}
                    <div className="overflow-y-auto py-1 custom-scrollbar max-h-60">
                        {filteredOptions.map((opt, idx) => (
                            <button
                                key={`${opt}-${idx}`}
                                type="button"
                                onClick={() => { onSelect(opt); onClose(); setSearchQuery(""); }}
                                className={`block w-full px-4 py-2 text-left text-[14px] font-Gantari transition-colors cursor-pointer border-0 bg-transparent ${selected === opt ? "bg-gray-100 text-[#353535]" : "text-[#616161] hover:text-[#353535] hover:bg-gray-200"}`}
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
        e.dataTransfer.setData("taskId", String(task.id));
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.task_name || "Task");
    };
    const isCompleted = status === "completed";
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className={`rounded-md border border-slate-200 bg-white p-2.5 shadow-sm relative ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"} mb-3 last:mb-0`}
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-semibold text-[#353535] text-[20px] truncate font-Gantari">
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
                        className="p-0.5 rounded cursor-pointer border-0 bg-transparent shadow-none outline-none"
                        aria-label="More options"
                        aria-expanded={menuOpen}
                    >
                        <img src={Dot} alt="Dot" className="w-4 h-4 text-slate-600" />
                    </button>
                    {menuOpen && (
                        <div
                            className={`absolute top-full mt-1 z-50 min-w-[170px] bg-white rounded-lg border border-[#AEACAC52] shadow-xl transition-all duration-200 ease-out font-Gantari ${isCompleted ? "right-full mr-1 origin-top-right" : "left-full ml-1 origin-top-left"}`}
                            role="menu"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer border-0 bg-transparent shadow-none"
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
                                <span className="text-[16px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                                    View
                                </span>
                            </button>
                            {!isCompleted && (
                                <>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer border-0 bg-transparent shadow-none"
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
                                        className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer border-0 bg-transparent shadow-none"
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
            <div className="flex items-center justify-between gap-2 mb-3 font-Gantari">
                <div className="flex flex-col text-left">
                    <span className="text-[14px] font-medium text-[#000000]">Start Date</span>
                    <span className="text-[14px] font-medium text-[#8B8B8B]">
                        {task.start_date || (task as any).Actual_start_time
                            ? `${new Date(task.start_date || (task as any).Actual_start_time!).getDate().toString().padStart(2, "0")}-${(new Date(task.start_date || (task as any).Actual_start_time!).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.start_date || (task as any).Actual_start_time!).getFullYear()}`
                            : "—"}
                    </span>
                </div>

                <div className="flex flex-col items-end text-right">
                    <span className="text-[14px] font-medium text-[#000000]">End Date</span>
                    <span className="text-[14px] font-medium text-[#8B8B8B]">
                        {task.due_date
                            ? `${new Date(task.due_date).getDate().toString().padStart(2, "0")}-${(new Date(task.due_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.due_date).getFullYear()}`
                            : "—"}
                    </span>
                </div>
            </div>
            <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-[#8B8B8B] font-Gantari">Progress</span>
                <span className="text-xs font-medium text-[#8B8B8B] font-Gantari">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                <div
                    className="h-full bg-slate-400 transition-all rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                    <div className="flex -space-x-2">
                        {task.assigned_full_name && (
                            <div className="w-7 h-7 rounded-full border border-white bg-slate-200 flex items-center justify-center overflow-hidden" title={`Assigned: ${task.assigned_full_name}`}>
                                {task.assigned_to && task.assigned_profile_picture ? (
                                    <img src={getGlobalProfileUrl(task.assigned_to, task.assigned_profile_picture)} className="w-full h-full object-cover" alt="" />
                                ) : <span className="text-[10px] font-bold">{(task.assigned_full_name || "U")[0]}</span>}
                            </div>
                        )}
                        {task.uploader_full_name && (
                            <div className="w-7 h-7 rounded-full border border-white bg-slate-100 flex items-center justify-center overflow-hidden" title={`Uploader: ${task.uploader_full_name}`}>
                                {task.uploaderid && task.uploader_profile_picture ? (
                                    <img src={getGlobalProfileUrl(task.uploaderid, task.uploader_profile_picture)} className="w-full h-full object-cover" alt="" />
                                ) : <span className="text-[10px] font-bold">{(task.uploader_full_name || "S")[0]}</span>}
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={() => onViewTask?.(task)} className="text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] inline-flex items-center gap-1 border-0 bg-transparent cursor-pointer group font-Gantari shadow-none outline-none">
                    Details
                    <img src={Arrow} alt="" className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        </div>
    );
}

const SHOW_OPTIONS = ["Show Entries", "1-50", "51-100", "All"];
const PERIOD_OPTIONS = ["Period", "This Week", "This Month", "This Quarter"];

export default function TeamtaskPMV() {
    const [searchParams] = useSearchParams();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const statusFilter = searchParams.get("status") || searchParams.get("taskstatus");

    const [list, setList] = useState<Task[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<string | null>(searchParams.get("project") || null);
    const [selectedShow, setSelectedShow] = useState<string | null>("Show Entries");
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>("Period");
    const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
    const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

    const empTriggerRef = useRef<HTMLButtonElement>(null);
    const empMenuRef = useRef<HTMLDivElement>(null);
    const projTriggerRef = useRef<HTMLButtonElement>(null);
    const projMenuRef = useRef<HTMLDivElement>(null);
    const showTriggerRef = useRef<HTMLButtonElement>(null);
    const showMenuRef = useRef<HTMLDivElement>(null);
    const periodTriggerRef = useRef<HTMLButtonElement>(null);
    const periodMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        api.get("/api/vendors/vendor-tasks").then(res => setList(res.data.tasks ?? []));
        api.get("/api/vendors/vendor-resource-profiles").then(res => setEmployees(res.data.data ?? []));
        api.get("/api/vendors/vendor-projects").then(res => setProjects(res.data.data ?? []));

        const handleClick = (e: MouseEvent) => {
            if (openDropdown === "employee" && !empTriggerRef.current?.contains(e.target as Node) && !empMenuRef.current?.contains(e.target as Node)) setOpenDropdown(null);
            if (openDropdown === "projects" && !projTriggerRef.current?.contains(e.target as Node) && !projMenuRef.current?.contains(e.target as Node)) setOpenDropdown(null);
            if (openDropdown === "show" && !showTriggerRef.current?.contains(e.target as Node) && !showMenuRef.current?.contains(e.target as Node)) setOpenDropdown(null);
            if (openDropdown === "period" && !periodTriggerRef.current?.contains(e.target as Node) && !periodMenuRef.current?.contains(e.target as Node)) setOpenDropdown(null);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [openDropdown]);

    const filteredTasks = useMemo(() => {
        return list.filter(t => {
            if (selectedEmployee && !["Select Employee", "Employee"].includes(selectedEmployee) && t.assigned_full_name !== selectedEmployee) return false;
            if (selectedProject && !["Select Projects", "Projects"].includes(selectedProject) && t.project_name !== selectedProject) return false;

            if (selectedPeriod && selectedPeriod !== "Period") {
                const date = new Date(t.created_at || t.start_date || "");
                const now = new Date();
                if (selectedPeriod === "This Week") {
                    const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
                    if (date < weekAgo) return false;
                } else if (selectedPeriod === "This Month") {
                    const monthAgo = new Date(); monthAgo.setMonth(now.getMonth() - 1);
                    if (date < monthAgo) return false;
                }
            }
            return true;
        });
    }, [list, selectedEmployee, selectedProject, selectedPeriod]);

    const tasksByStatus = {
        todo: filteredTasks.filter(t => normalizeStatus(t.status) === "todo"),
        in_progress: filteredTasks.filter(t => normalizeStatus(t.status) === "in_progress"),
        completed: filteredTasks.filter(t => normalizeStatus(t.status) === "completed"),
    };

    const displayTasks = {
        todo: !statusFilter || statusFilter === "todo" ? tasksByStatus.todo : [],
        in_progress: !statusFilter || statusFilter === "in_progress" ? tasksByStatus.in_progress : [],
        completed: !statusFilter || statusFilter === "completed" ? tasksByStatus.completed : [],
    };

    const handleMoveTask = (id: number, status: string) => {
        const sMap = { todo: "Todo", in_progress: "InProgress", completed: "Completed" };
        api.patch(`/api/vendors/vendor-tasks/${id}/status`, { status: (sMap as any)[status] })
            .then(() => api.get("/api/vendors/vendor-tasks").then(res => setList(res.data.tasks ?? [])))
            .catch(() => toast.error("Failed to update status"));
    };

    const confirmDelete = () => {
        if (!deleteTaskId) return;
        api.delete(`/api/vendors/vendor-tasks/${deleteTaskId}`).then(() => {
            toast.success("Task deleted");
            setList(prev => prev.filter(t => t.id !== deleteTaskId));
            setDeleteTaskId(null);
        }).catch(() => toast.error("Failed to delete task"));
    };

    function normalizeStatus(s?: string) {
        const l = (s || "").toLowerCase();
        if (l.includes("progress")) return "in_progress";
        if (l.includes("complete") || l === "done") return "completed";
        return "todo";
    }

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-Gantari">
            <div className="pb-3 flex-shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3 pt-4">
                    <h2 className="text-[24px] font-semibold text-slate-800">Team Tasks</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <TaskDropdown label="Employee" options={["Employee", ...employees.map(e => e.full_name)]} selected={selectedEmployee} onSelect={setSelectedEmployee} isOpen={openDropdown === "employee"} onToggle={() => setOpenDropdown(d => d === "employee" ? null : "employee")} onClose={() => setOpenDropdown(null)} triggerRef={empTriggerRef} dropdownRef={empMenuRef} searchable />
                        <TaskDropdown label="Projects" options={["Projects", ...projects.map(p => p.project_name)]} selected={selectedProject} onSelect={setSelectedProject} isOpen={openDropdown === "projects"} onToggle={() => setOpenDropdown(d => d === "projects" ? null : "projects")} onClose={() => setOpenDropdown(null)} triggerRef={projTriggerRef} dropdownRef={projMenuRef} searchable />
                        <TaskDropdown label="Show Entries" options={SHOW_OPTIONS} selected={selectedShow} onSelect={setSelectedShow} isOpen={openDropdown === "show"} onToggle={() => setOpenDropdown(d => d === "show" ? null : "show")} onClose={() => setOpenDropdown(null)} triggerRef={showTriggerRef} dropdownRef={showMenuRef} narrow />
                        <TaskDropdown label="Period" options={PERIOD_OPTIONS} selected={selectedPeriod} onSelect={setSelectedPeriod} isOpen={openDropdown === "period"} onToggle={() => setOpenDropdown(d => d === "period" ? null : "period")} onClose={() => setOpenDropdown(null)} triggerRef={periodTriggerRef} dropdownRef={periodMenuRef} narrow />
                        <button onClick={() => navigate("/vpm/teamtasks/add", { state: { from: "teamtasks" } })} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#c93a39] transition-colors border-0">
                            <img src={AddBtn} className="w-5 h-5" alt="" /> Add task
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    <Link to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`} className={`p-4 rounded-xl border flex items-center justify-between relative transition-all ${statusFilter === "todo" ? "bg-orange-50 border-orange-200 ring-1 ring-orange-200" : "bg-white border-slate-200 shadow-sm"}`}>
                        <div className="flex items-center gap-3"><span className="text-xl font-bold">To Do</span><span className="text-xl font-bold">({tasksByStatus.todo.length})</span></div>
                        <img src={Group1} className="w-8 h-8" alt="" />
                    </Link>
                    <Link to={statusFilter === "in_progress" ? pathname : `${pathname}?status=in_progress`} className={`p-4 rounded-xl border flex items-center justify-between relative transition-all ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-200 ring-1 ring-sky-200" : "bg-white border-slate-200 shadow-sm"}`}>
                        <div className="flex items-center gap-3"><span className="text-xl font-bold">In Progress</span><span className="text-xl font-bold">({tasksByStatus.in_progress.length})</span></div>
                        <img src={Group2} className="w-8 h-8" alt="" />
                    </Link>
                    <Link to={statusFilter === "completed" ? pathname : `${pathname}?status=completed`} className={`flex p-4 gap-4 rounded-xl border py-4 transition-all relative ${statusFilter === "completed" ? "bg-green-50 border-green-300 ring-1 ring-green-300" : "bg-white border-slate-200 shadow-sm"}`}>
                        <div className="flex items-center gap-3"><span className="text-xl font-bold text-[#0D1829]">Completed</span><span className="text-xl font-bold text-[#0D1829]">({tasksByStatus.completed.length})</span></div>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                            <img src={Group3} className="w-8 h-8" alt="" />
                        </div>
                    </Link>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
                    {["todo", "in_progress", "completed"].map((stat) => (
                        <div key={stat} className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1" onDragOver={e => e.preventDefault()} onDrop={e => { const id = Number(e.dataTransfer.getData("taskId")); if (id) handleMoveTask(id, stat); }}>
                            {(displayTasks as any)[stat].map((task: Task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    status={stat as any}
                                    onViewTask={t => navigate(`/vpm/teamtasks/view/${t.id}`, { state: { task: t } })}
                                    onEditTask={t => navigate("/vpm/teamtasks/edit", { state: { task: t, from: "teamtasks" } })}
                                    onDeleteTask={t => setDeleteTaskId(t.id)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {deleteTaskId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden font-Gantari">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                            <span className="w-9" />
                            <h3 className="text-lg font-semibold text-[#353535]">Delete Task</h3>
                            <button onClick={() => setDeleteTaskId(null)} className="p-1 rounded bg-gray-100 hover:bg-gray-200 border-0 cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-10 text-center text-lg text-[#353535]">Are you sure you want to delete this task?</div>
                        <div className="flex justify-center gap-4 p-6 bg-slate-50/50">
                            <button onClick={() => setDeleteTaskId(null)} className="px-6 py-2 rounded-lg bg-white border border-slate-200 text-[#8B8B8B] font-medium hover:bg-slate-50 cursor-pointer">Discard</button>
                            <button onClick={confirmDelete} className="px-6 py-2 rounded-lg bg-[#FFD9D9] border-0 text-[#E00100] font-medium hover:bg-[#ffc2c2] cursor-pointer">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
