import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import Group1 from "../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../assets/ProjectManager/MyTask/Group3.svg";
import AddBtn from "../../assets/TechnicalDirector/add btn.svg";
import { AttachmentPreviewModal } from "../../components/AttachmentPreviewModal";
import { 
    TaskDropdown, 
    TaskCard, 
    type Task,
    type Employee,
    type Project
} from "./MytaskBC";

type DropdownId = "employee" | "projects" | "show" | "period" | null;

const getEffectiveStatus = (task: Task): "todo" | "in_progress" | "completed" => {
    // In TD design, it's simplified to 3 columns
    if (!task.status) return "todo";
    const lower = task.status.toLowerCase().replace(/\s+/g, "_");
    if (lower.includes("progress") || lower === "in_progress") return "in_progress";
    if (lower.includes("complete") || lower === "done" || task.Approval === "Approved") return "completed";
    return "todo";
};

const SHOW_OPTIONS = ["Show", "1-10", "1-50", "1-100", "All"];
const PERIOD_OPTIONS = [
    "Period",
    "Show All",
    "This Week",
    "This Month",
    "This Quarter"
];

export default function TeamtaskBC() {
    const [searchParams] = useSearchParams();
    const { pathname } = useLocation();
    const statusFilter = searchParams.get("status") || searchParams.get("taskstatus");
    
    const STORAGE_KEY = "bc_teamTask_localTasks";
    const DELETED_IDS_KEY = "bc_teamTask_deletedIds";

    const loadDeletedIds = (): number[] => {
        try {
            const raw = localStorage.getItem(DELETED_IDS_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(Number).filter((n) => !Number.isNaN(n)) : [];
        } catch { return []; }
    };

    const loadLocalTasks = (): Task[] => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as Task[];
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    };

    const [list, setList] = useState<Task[]>([]);
    const [localTasks, setLocalTasks] = useState<Task[]>(loadLocalTasks);
    const [deletedIds, setDeletedIds] = useState<number[]>(loadDeletedIds);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(
    searchParams.get("project") || null
  );

  useEffect(() => {
    const proj = searchParams.get("project");
    if (proj) setSelectedProject(proj);
  }, [searchParams]);
    const [selectedShow, setSelectedShow] = useState<string | null>("Show");
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
    const [attachmentPreviewFile, setAttachmentPreviewFile] = useState<File | null>(null);
    
    const navigate = useNavigate();

    const employeeOptions = useMemo(() => {
        const raw = Array.isArray(employees) ? employees : [];
        const baseOptions = ["Select Employee", "Show All"];
        
        if (!selectedProject || selectedProject === "Select Projects" || selectedProject === "Show All") {
            return [...baseOptions, ...raw.map((e) => e.full_name)];
        }
        
        const proj = projects.find((p) => p.project_name === selectedProject);
        if (!proj) {
            return [...baseOptions, ...raw.map((e) => e.full_name)];
        }
        
        const memberTokens = (proj.members || "").split(",").map(s => s.trim()).filter(Boolean);
        const filtered = raw.filter(emp => {
            const name = (emp.full_name || "").trim();
            const idStr = String(emp.id);
            return memberTokens.some(t => t === idStr || t.toLowerCase() === name.toLowerCase());
        });
        
        return [...baseOptions, ...filtered.map(e => e.full_name)];
    }, [employees, projects, selectedProject]);
    const projectOptions = ["Select Projects", ...projects.map(p => p.project_name)];

    const handleMoveTask = (
        taskId: number,
        newStatus: "todo" | "in_progress" | "completed"
    ) => {
        const label = newStatus === "todo" ? "To Do" : newStatus === "in_progress" ? "In Progress" : "Completed";
        api.patch(`/api/tasks/${taskId}`, { status: label }).then(() => {
            // Update both local and API list if present
            setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: label } : t));
            setList(prev => prev.map(t => t.id === taskId ? { ...t, status: label } : t));
        });
    };

    const openEditTask = (task: Task) => {
        navigate("/bc/teamtasks/add", { state: { task, from: "teamtasks" } });
    };

    const openDeleteTask = (task: Task) => {
        setDeleteTaskId(task.id);
    };

    const openViewTask = (task: Task) => {
        navigate("/bc/mytasks/view", { state: { task } });
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
        api.get<{ employees: Employee[] }>("/api/employees").then(res => setEmployees(res.data.employees || []));
        api.get<{ projects: Project[] }>("/api/projects").then(res => setProjects(res.data.projects || []));
    }, []);

    useEffect(() => {
        const params: Record<string, string> = { condition: "1", employeeid: "all" };
        if (statusFilter) params.status = statusFilter;
        api
            .get<{ tasks?: Task[] }>("/api/tasks", { params })
            .then(({ data }) => setList(data.tasks ?? []))
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    }, [statusFilter]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localTasks));
        localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deletedIds));
    }, [localTasks, deletedIds]);

    const confirmDeleteTask = async () => {
        if (deleteTaskId === null) return;
        try {
            await api.delete(`/api/tasks/${deleteTaskId}`);
            setList((prev) => prev.filter((t) => t.id !== deleteTaskId));
            setLocalTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
            setDeletedIds((prev) => [...prev, deleteTaskId]);
            setDeleteTaskId(null);
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    const merged = [
        ...localTasks,
        ...list.filter((t) => !localTasks.some((l) => l.id === t.id)),
    ];
    
    const allTasks = merged.filter((t) => {
        if (deletedIds.includes(t.id)) return false;
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

    const tasksByStatus = {
        todo: allTasks.filter((t) => getEffectiveStatus(t) === "todo"),
        in_progress: allTasks.filter((t) => getEffectiveStatus(t) === "in_progress"),
        completed: allTasks.filter((t) => getEffectiveStatus(t) === "completed"),
    };

    let limitStart = 0;
    let limitEnd = 50;
    if (selectedShow === "All") {
        limitStart = 0;
        limitEnd = Infinity;
    } else if (selectedShow && selectedShow !== "Show") {
        const parts = selectedShow.split('-');
        if (parts.length === 2) {
            limitStart = parseInt(parts[0], 10) - 1;
            limitEnd = parseInt(parts[1], 10);
        } else {
             limitEnd = parseInt(selectedShow, 10) || 50;
        }
    }

    const displayedTasksByStatus = {
        todo: tasksByStatus.todo.slice(limitStart, limitEnd),
        in_progress: tasksByStatus.in_progress.slice(limitStart, limitEnd),
        completed: tasksByStatus.completed.slice(limitStart, limitEnd),
    };

    const counts = {
        todo: tasksByStatus.todo.length,
        in_progress: tasksByStatus.in_progress.length,
        completed: tasksByStatus.completed.length,
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
            <div className="bg-white pb-3 flex-shrink-0">
                {/* Top row: title + dropdowns + Add task */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <h2 className="text-[24px] font-semibold text-slate-800 font-Gantari">
                        Team Task
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
                            onToggle={() => setOpenDropdown((d) => (d === "employee" ? null : "employee"))}
                            onClose={() => setOpenDropdown(null)}
                            triggerRef={employeeTriggerRef}
                            dropdownRef={employeeMenuRef}
                            searchable
                            searchPlaceholder="Search employee..."
                            maxVisibleItems={4}
                        />
                        <TaskDropdown
                            label="Select Projects"
                            options={projectOptions}
                            selected={selectedProject}
                            onSelect={setSelectedProject}
                            isOpen={openDropdown === "projects"}
                            onToggle={() => setOpenDropdown((d) => (d === "projects" ? null : "projects"))}
                            onClose={() => setOpenDropdown(null)}
                            triggerRef={projectsTriggerRef}
                            dropdownRef={projectsMenuRef}
                            searchable
                            searchPlaceholder="Search project..."
                            maxVisibleItems={4}
                        />
                        <TaskDropdown
                            label="Show"
                            options={SHOW_OPTIONS}
                            selected={selectedShow}
                            onSelect={setSelectedShow}
                            isOpen={openDropdown === "show"}
                            onToggle={() => setOpenDropdown((d) => (d === "show" ? null : "show"))}
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
                            onToggle={() => setOpenDropdown((d) => (d === "period" ? null : "period"))}
                            onClose={() => setOpenDropdown(null)}
                            triggerRef={periodTriggerRef}
                            dropdownRef={periodMenuRef}
                            narrow
                            maxVisibleItems={4}
                        />
                        <button
                            type="button"
                            onClick={() => navigate("/bc/teamtasks/add", { state: { from: "teamtasks" } })}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer"
                        >
                            <img src={AddBtn} alt="Add" className="h-5 w-5" />
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
                        to={statusFilter === "in_progress" ? pathname : `${pathname}?status=in_progress`}
                        className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
                    >
                        <span className="text-xl font-bold text-[#0D1829]">In Progress</span>
                        <span className="text-xl font-bold text-[#0D1829]">({counts.in_progress})</span>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                            <img src={Group2} alt="Group2" className="w-8 h-8" />
                        </div>
                    </Link>

                    <Link
                        to={statusFilter === "completed" ? pathname : `${pathname}?status=completed`}
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

            {/* Task columns scrollable area */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
                    <div
                        className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
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
                        className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
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
                        className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
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
                                className="p-1 rounded-sm text-black hover:bg-[#E0E0E0] bg-[#F0F0F0] transition-colors cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <h3 className="flex-1 text-center text-lg font-semibold text-[#353535]">Delete Task</h3>
                            <div className="w-9" />
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-black text-center">Are you sure, you want to Delete this Task?</p>
                        </div>
                        <div className="flex justify-center gap-3 px-6 py-4 bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setDeleteTaskId(null)}
                                className="rounded-md bg-[#F0F0F0] px-5 py-2 text-sm font-medium text-black hover:bg-[#E0E0E0] cursor-pointer"
                            >Discard</button>
                            <button
                                type="button"
                                onClick={confirmDeleteTask}
                                className="rounded-lg bg-[#FFD9D9] px-5 py-2 text-sm font-medium text-[#E00100] hover:bg-[#FFB3B3] cursor-pointer"
                            >Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <AttachmentPreviewModal
                file={attachmentPreviewFile}
                onClose={() => setAttachmentPreviewFile(null)}
            />
        </div>
    );
}
