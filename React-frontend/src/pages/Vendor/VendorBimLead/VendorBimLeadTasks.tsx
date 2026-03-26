import { useEffect, useState } from "react";
import api from "../../../lib/api";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import Group1 from "../../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../../assets/ProjectManager/MyTask/Group3.svg";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";

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
}

export default function VendorBimLeadTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShow, setSelectedShow] = useState("Show");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        task_name: "", description: "", status: "To Do", priority: "Medium",
        due_date: "", project_id: "", assigned_to: "", category: "General"
    });
    const [createSubmitting, setCreateSubmitting] = useState(false);

    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);

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
                setCreateForm({ task_name: "", description: "", status: "To Do", priority: "Medium", due_date: "", project_id: "", assigned_to: "", category: "General" });
                fetchTasks();
            })
            .finally(() => setCreateSubmitting(false));
    };

    const handleStatusChange = (taskId: number, newStatus: string) => {
        api.patch(`/api/vendors/vendor-tasks/${taskId}`, { status: newStatus })
            .then(() => fetchTasks());
    };

    const statusOptions = ["To Do", "In Progress", "Review", "Completed", "Paused"];
    const SHOW_OPTIONS = ["Show", "10", "50", "100", "All"];
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
                            <select
                                value={selectedShow}
                                onChange={(e) => setSelectedShow(e.target.value)}
                                className="appearance-none rounded-md bg-[#E8E8E8] px-4 py-2 pr-8 text-sm text-[#353535] cursor-pointer"
                            >
                                {SHOW_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                        {o}
                                    </option>
                                ))}
                            </select>
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2"
                            />
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
                    <div className="bg-white rounded-2xl w-full max-w-[550px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[22px] font-bold text-[#1E293B]">New Task</h3>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors bg-[#F2F2F2]">
                                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[14px] font-bold text-[#475569] block">Task Name *</label>
                                    <input type="text" value={createForm.task_name} onChange={e => setCreateForm({ ...createForm, task_name: e.target.value })} required
                                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg focus:ring-1 focus:ring-[#DD4342] text-[#1E293B] font-medium" placeholder="Enter task name" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-bold text-[#475569] block">Project</label>
                                        <select value={createForm.project_id} onChange={e => setCreateForm({ ...createForm, project_id: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium appearance-none">
                                            <option value="">Select Project</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-bold text-[#475569] block">Assign To</label>
                                        <select value={createForm.assigned_to} onChange={e => setCreateForm({ ...createForm, assigned_to: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium appearance-none">
                                            <option value="">Select Employee</option>
                                            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-bold text-[#475569] block">Priority</label>
                                        <select value={createForm.priority} onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium appearance-none">
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Urgent">Urgent</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-bold text-[#475569] block">Due Date</label>
                                        <input type="date" value={createForm.due_date} onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[14px] font-bold text-[#475569] block">Description</label>
                                    <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} rows={3}
                                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium resize-none" placeholder="Task description..." />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-3 bg-[#F2F2F2] text-[#475569] rounded-lg font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                                    <button type="submit" disabled={createSubmitting}
                                        className="flex-1 px-4 py-3 bg-[#DD4342] text-white rounded-lg font-bold hover:bg-[#DD4342]/90 shadow-lg shadow-red-100 transition-all disabled:opacity-50">
                                        Create Task
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
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">{selectedTask.project_name || "General"}</span>
                                    <h3 className="text-2xl font-bold text-[#1A1A1A]">{selectedTask.task_name}</h3>
                                </div>
                                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors bg-[#F2F2F2]">
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
                                <div className="bg-[#F8FAFC] rounded-xl p-4">
                                    <span className="text-xs font-bold text-gray-400 block mb-1 uppercase">Assigned To</span>
                                    <span className="font-bold text-[#1A1A1A]">{selectedTask.assigned_to_name || "Unassigned"}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-400 block mb-2 uppercase">Description</span>
                                    <p className="text-[#6B7280] leading-relaxed bg-gray-50 p-4 rounded-xl text-sm italic">
                                        {selectedTask.description || "No description available."}
                                    </p>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button onClick={() => setShowViewModal(false)} className="px-8 py-2.5 bg-[#DD4342] text-white rounded-xl font-bold hover:bg-[#DD4342]/90 shadow-lg shadow-red-100 transition-all font-gantari">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
