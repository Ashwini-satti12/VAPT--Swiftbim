import { useEffect, useState, useRef } from "react";
import api from "../../../lib/api";
import { toast } from "react-hot-toast";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import Group1 from "../../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../../assets/ProjectManager/MyTask/Group3.svg";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";

interface Task {
    id: number;
    task_name: string;
    description?: string;
    status: string;
    priority: string;
    due_date?: string;
    project_id?: number;
    project_name?: string;
    assigned_to?: number;
    assigned_to_name?: string;
    category?: string;
}

interface Project {
    id: number;
    project_name: string;
}

interface Employee {
    id: number;
    full_name: string;
  active?: string;
}

export default function VendorBimLeadTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShow, setSelectedShow] = useState("Show");
    const [showDropdownOpen, setShowDropdownOpen] = useState(false);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        task_name: "", description: "", status: "To Do", priority: "Medium",
        due_date: "", project_id: "", assigned_to: "", category: "General",
        actual_start_date: "", actual_end_date: "", checklist: "",
        start_time: "", end_time: ""
    });
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [openFormDropdown, setOpenFormDropdown] = useState<string | null>(null);
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const fetchTasks = () => {
        api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks")
            .then(({ data }) => setTasks(data.tasks ?? []))
            .catch(() => setTasks([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchTasks();
        api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects")
            .then(({ data }) => setProjects(data.projects ?? []));
        api.get<{ employees?: Employee[] }>("/api/employees")
            .then(({ data }) => setEmployees(data.employees ?? []));
    }, []);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setCreateSubmitting(true);
        api.post("/api/vendors/vendor-tasks", createForm)
            .then(() => {
                setShowCreateModal(false);
                setAttachmentFiles([]);
                setCreateForm({
                    task_name: "", description: "", status: "To Do", priority: "Medium",
                    due_date: "", project_id: "", assigned_to: "", category: "General",
                    actual_start_date: "", actual_end_date: "", checklist: "",
                    start_time: "", end_time: ""
                });
                fetchTasks();
            })
            .finally(() => setCreateSubmitting(false));
    };

    const handleStatusChange = (taskId: number, newStatus: string) => {
        setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        api.patch(`/api/vendors/vendor-tasks/${taskId}/status`, { status: newStatus.replace(/\s+/g, '') })
            .then(() => toast.success("Status updated"))
            .catch(() => {
                toast.error("Failed to update status");
                fetchTasks();
            });
    };

    const deleteAttachment = (index: number) => {
        setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setAttachmentFiles((prev) => [...prev, ...files]);
    };

    const handleDelete = (taskId: number) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        api.delete(`/api/vendors/vendor-tasks/${taskId}`)
            .then(() => {
                setTasks((prev) => prev.filter((t) => t.id !== taskId));
                toast.success("Task deleted");
            })
            .catch(() => toast.error("Failed to delete task"));
    };

    const statusOptions = ["To Do", "In Progress", "Review", "Completed", "Paused"];
    const SHOW_OPTIONS = ["Show", "1-50", "51-100", "101-150","151-200","201-250","251-300", "All"];
    const priorityColors: Record<string, string> = {
        High: "text-red-600 bg-red-50 border-red-100",
        Medium: "text-orange-600 bg-orange-50 border-orange-100",
        Low: "text-green-600 bg-green-50 border-green-100",
        Urgent: "text-purple-600 bg-purple-50 border-purple-100",
    };
    const normalizeStatus = (
        s: string | undefined,
    ): "todo" | "in_progress" | "completed" => {
        if (!s) return "todo";
        const lower = s.toLowerCase().replace(/\s+/g, "_");
        if (lower.includes("progress") || lower === "in_progress") return "in_progress";
        if (lower.includes("complete") || lower === "done") return "completed";
        return "todo";
    };

    const tasksByStatus = {
        todo: tasks.filter((t) => normalizeStatus(t.status) === "todo"),
        in_progress: tasks.filter((t) => normalizeStatus(t.status) === "in_progress"),
        completed: tasks.filter((t) => normalizeStatus(t.status) === "completed"),
    };
    const showLimit =
        selectedShow === "All" || selectedShow === "Show"
            ? Number.POSITIVE_INFINITY
            : Math.max(1, Number(selectedShow) || 10);
    const displayedTasksByStatus = {
        todo: tasksByStatus.todo.slice(0, showLimit),
        in_progress: tasksByStatus.in_progress.slice(0, showLimit),
        completed: tasksByStatus.completed.slice(0, showLimit),
    };
    const counts = {
        todo: tasksByStatus.todo.length,
        in_progress: tasksByStatus.in_progress.length,
        completed: tasksByStatus.completed.length,
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 flex flex-col overflow-hidden bg-white font-gantari">
            <div className="bg-white pb-3 flex-shrink-0 px-6 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <h2 className="text-[24px] font-semibold text-slate-800">Tasks</h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowDropdownOpen(!showDropdownOpen)}
                                className="flex items-center gap-4 rounded-md bg-[#E8E8E8] px-4 py-2 text-sm text-[#353535] cursor-pointer min-w-[100px] justify-between"
                            >
                                <span>{selectedShow}</span>
                                <img
                                    src={ArrowDown}
                                    alt="arrow"
                                    className={`h-2.5 w-2.5 transition-transform ${showDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {showDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto custom-scrollbar">
                                    {SHOW_OPTIONS.map((o) => (
                                        <button
                                            key={o}
                                            type="button"
                                            onClick={() => {
                                                setSelectedShow(o);
                                                setShowDropdownOpen(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#F2F2F2] ${selectedShow === o ? "bg-[#F2F2F2] text-[#353535] font-bold" : "text-[#353535]"}`}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer"
                        >
                            <img src={AddBtn} alt="Add" className="h-5 w-5" />
                            Create Task
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
                        <span className="text-xl font-bold text-[#0D1829]">To Do</span>
                        <span className="text-xl font-bold text-[#0D1829]">({counts.todo})</span>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                            <img src={Group1} alt="Group1" className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
                        <span className="text-xl font-bold text-[#0D1829]">In Progress</span>
                        <span className="text-xl font-bold text-[#0D1829]">
                            ({counts.in_progress})
                        </span>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                            <img src={Group2} alt="Group2" className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
                        <span className="text-xl font-bold text-[#0D1829]">Completed</span>
                        <span className="text-xl font-bold text-[#0D1829]">
                            ({counts.completed})
                        </span>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                            <img src={Group3} alt="Group3" className="w-8 h-8" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(["todo", "in_progress", "completed"] as const).map((bucket) => (
                        <div key={bucket} className="space-y-3 min-h-[120px] rounded-lg p-1">
                            {displayedTasksByStatus[bucket].map((task) => (
                                <div
                                    key={task.id}
                                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                            {task.project_name || "Personal"}
                                        </span>
                                        <div className="relative">
                                            <button
                                                onClick={() =>
                                                    setOpenMenuTaskId(
                                                        openMenuTaskId === task.id ? null : task.id,
                                                    )
                                                }
                                                className="p-0.5 rounded cursor-pointer"
                                            >
                                                <img src={Dot} alt="Dot" className="w-4 h-4" />
                                            </button>
                                            {openMenuTaskId === task.id && (
                                                <div className="absolute top-full mt-1 right-0 z-50 min-w-[150px] bg-white/20 backdrop-blur-md rounded-xl border border-[#59595980] shadow-xl">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowViewModal(true);
                                                            setOpenMenuTaskId(null);
                                                        }}
                                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#616161] hover:text-[#DD4342] cursor-pointer"
                                                    >
                                                        <img src={viewIcon} alt="view" className="w-4 h-4" />
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => setOpenMenuTaskId(null)}
                                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#616161] hover:text-[#DD4342] cursor-pointer"
                                                    >
                                                        <img src={editIcon} alt="edit" className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setOpenMenuTaskId(null)}
                                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#616161] hover:text-[#DD4342] cursor-pointer"
                                                    >
                                                        <img src={deleteIcon} alt="delete" className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                        {task.task_name}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                        {task.description || "No description provided."}
                                    </p>

                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${priorityColors[task.priority] || "text-gray-600 bg-gray-50 border-gray-100"}`}
                                            >
                                                {task.priority || "Medium"}
                                            </div>
                                            {task.due_date && (
                                                <span className="text-xs font-semibold text-gray-400">
                                                    {new Date(task.due_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            value={task.status}
                                            onChange={(e) =>
                                                handleStatusChange(task.id, e.target.value)
                                            }
                                            className="text-[11px] font-bold bg-[#F2F2F2] border-none rounded-lg px-2 py-1 outline-none cursor-pointer"
                                        >
                                            {statusOptions.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                            {displayedTasksByStatus[bucket].length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                    No tasks
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Task Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-8 relative border-b border-gray-100 pb-4">
                                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors cursor-pointer">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <h3 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-black">Add New Task</h3>
                                <div className="w-9" />
                            </div>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="relative">
                                    <label className="block text-sm font-semibold text-black mb-1">Project Name</label>
                                    <button
                                        type="button"
                                        onClick={() => setOpenFormDropdown(openFormDropdown === "project" ? null : "project")}
                                        className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-sm text-sm flex items-center justify-between outline-none cursor-pointer"
                                    >
                                        <span>{projects.find(p => p.id.toString() === createForm.project_id)?.project_name || "Select Project name"}</span>
                                        <img src={ArrowDown} alt="arrow" className={`h-4 w-4 transition-transform ${openFormDropdown === "project" ? "rotate-180" : ""}`} />
                                    </button>
                                    {openFormDropdown === "project" && (
                                        <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded shadow-lg py-1 max-h-48 overflow-y-auto custom-scrollbar">
                                            {projects.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setCreateForm({ ...createForm, project_id: p.id.toString() });
                                                        setOpenFormDropdown(null);
                                                    }}
                                                    className="block w-full text-left px-4 py-2 text-sm text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                                                >
                                                    {p.project_name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-sm font-semibold text-black mb-1">Select Module</label>
                                        <button
                                            type="button"
                                            onClick={() => setOpenFormDropdown(openFormDropdown === "module" ? null : "module")}
                                            className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-sm text-sm flex items-center justify-between outline-none cursor-pointer"
                                        >
                                            <span>{createForm.category || "Select Module"}</span>
                                            <img src={ArrowDown} alt="arrow" className={`h-4 w-4 transition-transform ${openFormDropdown === "module" ? "rotate-180" : ""}`} />
                                        </button>
                                        {openFormDropdown === "module" && (
                                            <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded shadow-lg py-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                {["Module 1", "Module 2"].map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => {
                                                            setCreateForm({ ...createForm, category: m });
                                                            setOpenFormDropdown(null);
                                                        }}
                                                        className="block w-full text-left px-4 py-2 text-sm text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1">Task Name</label>
                                        <div className="flex">
                                            <input
                                                type="text"
                                                value={createForm.task_name}
                                                onChange={(e) => setCreateForm({ ...createForm, task_name: e.target.value })}
                                                placeholder="Enter Task / Select Task"
                                                className="flex-1 px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-l-sm text-sm focus:outline-none"
                                                required
                                            />
                                            <button type="button" className="bg-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#8B8B8B] rounded-r-sm hover:bg-gray-300 cursor-pointer">Tasklist</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="relative">
                                        <label className="block text-sm font-semibold text-black mb-1">Type</label>
                                        <button
                                            type="button"
                                            onClick={() => setOpenFormDropdown(openFormDropdown === "type" ? null : "type")}
                                            className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-sm text-sm flex items-center justify-between outline-none cursor-pointer"
                                        >
                                            <span>{createForm.priority ? createForm.priority.charAt(0).toUpperCase() + createForm.priority.slice(1) : "Select Type"}</span>
                                            <img src={ArrowDown} alt="arrow" className={`h-4 w-4 transition-transform ${openFormDropdown === "type" ? "rotate-180" : ""}`} />
                                        </button>
                                        {openFormDropdown === "type" && (
                                            <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded shadow-lg py-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                {[
                                                    { value: "task", label: "Task" },
                                                    { value: "bug", label: "Bug" },
                                                    { value: "feature", label: "Feature" }
                                                ].map((t) => (
                                                    <button
                                                        key={t.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setCreateForm({ ...createForm, priority: t.value });
                                                            setOpenFormDropdown(null);
                                                        }}
                                                        className="block w-full text-left px-4 py-2 text-sm text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1">Actual Start Date</label>
                                        <input
                                            type="date"
                                            value={createForm.actual_start_date}
                                            onChange={(e) => setCreateForm({ ...createForm, actual_start_date: e.target.value })}
                                            className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-sm text-sm focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1">Actual End Date</label>
                                        <input
                                            type="date"
                                            value={createForm.actual_end_date}
                                            onChange={(e) => setCreateForm({ ...createForm, actual_end_date: e.target.value })}
                                            className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-sm text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1">Select Start Time</label>
                                        <input
                                            type="time"
                                            value={createForm.start_time}
                                            onChange={(e) => setCreateForm({ ...createForm, start_time: e.target.value })}
                                            className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-sm text-sm focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-1">Select End Time</label>
                                        <input
                                            type="time"
                                            value={createForm.end_time}
                                            onChange={(e) => setCreateForm({ ...createForm, end_time: e.target.value })}
                                            className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-sm text-sm focus:outline-none"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-sm font-semibold text-black mb-1">Assign To</label>
                                        <button
                                            type="button"
                                            onClick={() => setOpenFormDropdown(openFormDropdown === "assignTo" ? null : "assignTo")}
                                            className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-sm text-sm flex items-center justify-between outline-none cursor-pointer"
                                        >
                                            <span>{employees.find(emp => emp.id.toString() === createForm.assigned_to)?.full_name || "Select Assign To"}</span>
                                            <img src={ArrowDown} alt="arrow" className={`h-4 w-4 transition-transform ${openFormDropdown === "assignTo" ? "rotate-180" : ""}`} />
                                        </button>
                                        {openFormDropdown === "assignTo" && (
                                            <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded shadow-lg py-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                {employees.map((emp) => (
                                                    <button
                                                        key={emp.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setCreateForm({ ...createForm, assigned_to: emp.id.toString() });
                                                            setOpenFormDropdown(null);
                                                        }}
                                                        className="block w-full text-left px-4 py-2 text-sm text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                                                    >
                                                        {emp.full_name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-black mb-1">Description</label>
                                    <textarea
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                        rows={3}
                                        placeholder="Enter Description..."
                                        className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-sm text-sm focus:outline-none resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-black mb-1">Checklist</label>
                                    <input
                                        type="text"
                                        value={createForm.checklist}
                                        onChange={(e) => setCreateForm({ ...createForm, checklist: e.target.value })}
                                        placeholder="Enter Reference Link"
                                        className="w-full px-3 py-2 bg-[#F2F3F4] text-[#353535] rounded-sm text-sm focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-black mb-1">Attachments</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleAttachmentChange}
                                        id="task-attachments"
                                    />
                                    <div className="flex">
                                        <input
                                            type="text"
                                            readOnly
                                            value={attachmentFiles.length > 0 ? `${attachmentFiles.length} file(s) selected` : ""}
                                            placeholder="Upload Files"
                                            className="flex-1 px-3 py-2 bg-[#F2F3F4] text-[#101827] rounded-l-sm text-sm focus:outline-none placeholder:text-[#8B8B8B]"
                                        />
                                        <label htmlFor="task-attachments" className="bg-[#E2E2E2] px-6 py-2 rounded-r-sm text-sm font-medium text-[#8B8B8B] cursor-pointer hover:bg-gray-300">
                                            Browse File
                                        </label>
                                    </div>
                                    {attachmentFiles.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {attachmentFiles.map((file, idx) => (
                                                <li key={idx} className="flex items-center justify-between bg-[#F2F3F4] px-3 py-1 rounded text-xs text-[#101827]">
                                                    <span className="truncate">{file.name}</span>
                                                    <button type="button" onClick={() => deleteAttachment(idx)} className="ml-2 text-black hover:text-red-500 font-bold cursor-pointer">×</button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="flex justify-center gap-3 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-lg bg-[#F2F2F2] px-10 py-2 text-sm font-bold text-[#8B8B8B] hover:bg-gray-200 cursor-pointer"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createSubmitting}
                                        className="rounded-lg bg-[#DBE9FE] px-10 py-2 text-sm font-bold text-[#101827] hover:bg-blue-200 cursor-pointer disabled:opacity-50"
                                    >
                                        {createSubmitting ? "Submitting..." : "Submit"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* View Task Modal */}
            {showViewModal && selectedTask && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[10px] font-bold text-[#DD4342] bg-red-50 px-2 py-1 rounded mb-2 inline-block uppercase tracking-wider">{selectedTask.category || "General"}</span>
                                    <h3 className="text-2xl font-bold text-[#1A1A1A]">{selectedTask.task_name}</h3>
                                </div>
                                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors bg-[#F2F2F2] cursor-pointer">
                                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-4">
                                    <div className="bg-[#F8FAFC] rounded-xl p-4 flex-1 min-w-[150px]">
                                        <span className="text-xs font-bold text-gray-400 block mb-1 uppercase">Status</span>
                                        <span className="font-bold text-[#1A1A1A]">{selectedTask.status}</span>
                                    </div>
                                    <div className="bg-[#F8FAFC] rounded-xl p-4 flex-1 min-w-[150px]">
                                        <span className="text-xs font-bold text-gray-400 block mb-1 uppercase">Priority</span>
                                        <span className={`font-bold ${selectedTask.priority === "High" ? "text-red-500" : "text-[#1A1A1A]"}`}>{selectedTask.priority}</span>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                        {(selectedTask.assigned_to_name || "?")[0]}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 block mb-0.5 uppercase tracking-widest">Assigned To</span>
                                        <span className="font-bold text-[#1A1A1A]">{selectedTask.assigned_to_name || "Unassigned"}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-400 block mb-2 uppercase">Description</span>
                                    <p className="text-[#6B7280] leading-relaxed bg-gray-50 p-4 rounded-xl text-sm italic">
                                        {selectedTask.description || "No description available."}
                                    </p>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button onClick={() => setShowViewModal(false)} className="px-8 py-2.5 bg-[#DD4342] text-white rounded-xl font-bold hover:bg-[#DD4342]/90 shadow-lg shadow-red-100 transition-all font-gantari cursor-pointer">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}