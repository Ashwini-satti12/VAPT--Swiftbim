import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
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
    team_id?: number;
    team_name?: string;
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

interface Team {
    id: number;
    team_name: string;
}

export default function VendorBimLeadTeamTasks() {
    const [searchParams] = useSearchParams();
    const projectFilter = searchParams.get("project");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("All");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        task_name: "", description: "", status: "To Do", priority: "Medium",
        due_date: "", project_id: "", assigned_to: "", team_id: ""
    });
    const [createSubmitting, setCreateSubmitting] = useState(false);

    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks?condition=1"),
            api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
            api.get<{ employees?: Employee[] }>("/api/employees"),
            api.get<{ teams?: Team[] }>("/api/vendors/vendor-teams")
        ]).then(([tasksRes, projectsRes, empRes, teamsRes]) => {
            setTasks(tasksRes.data.tasks ?? []);
            setProjects(projectsRes.data.projects ?? []);
            setEmployees(empRes.data.employees ?? []);
            setTeams(teamsRes.data.teams ?? []);
        }).catch(() => {
            setTasks([]);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setCreateSubmitting(true);
        api.post("/api/vendors/vendor-tasks", createForm)
            .then(() => {
                setShowCreateModal(false);
                setCreateForm({ task_name: "", description: "", status: "To Do", priority: "Medium", due_date: "", project_id: "", assigned_to: "", team_id: "" });
                fetchData();
            })
            .finally(() => setCreateSubmitting(false));
    };

    const handleStatusChange = (taskId: number, newStatus: string) => {
        setTasks((prev: Task[]) =>
            prev.map((t: Task) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        api.patch(`/api/vendors/vendor-tasks/${taskId}/status`, { status: newStatus.replace(/\s+/g, '') })
            .then(() => toast.success("Status updated"))
            .catch(() => {
                toast.error("Failed to update status");
                fetchData();
            });
    };

    const handleDelete = (taskId: number) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        api.delete(`/api/vendors/vendor-tasks/${taskId}`)
            .then(() => {
                setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== taskId));
                toast.success("Task deleted");
            })
            .catch(() => toast.error("Failed to delete task"));
    };

    const outlineEmployeeFilters = ["All Employees", ...new Set(tasks.map((t: Task) => t.assigned_to_name).filter(Boolean))];
    const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("All Employees");

    const filteredTasks = tasks.filter(t => {
        const matchesStatus = activeTab === "All" || t.status === activeTab;
        const matchesEmployee = selectedEmployeeFilter === "All Employees" || t.assigned_to_name === selectedEmployeeFilter;
        const matchesProject = !projectFilter || t.project_name === projectFilter;
        return matchesStatus && matchesEmployee && matchesProject;
    });
    const baseFilteredTasks = tasks.filter((t) => {
        const matchesEmployee =
            selectedEmployeeFilter === "All Employees" ||
            t.assigned_to_name === selectedEmployeeFilter;
        const matchesProject = !projectFilter || t.project_name === projectFilter;
        return matchesEmployee && matchesProject;
    });

    const statusOptions = ["To Do", "In Progress", "Review", "Completed", "Paused"];
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
    const counts = {
        todo: baseFilteredTasks.filter((t: Task) => normalizeStatus(t.status) === "todo").length,
        in_progress: baseFilteredTasks.filter((t: Task) => normalizeStatus(t.status) === "in_progress")
            .length,
        completed: baseFilteredTasks.filter((t: Task) => normalizeStatus(t.status) === "completed")
            .length,
    };
    const displayedTasksByStatus = {
        todo: filteredTasks.filter((t: Task) => normalizeStatus(t.status) === "todo"),
        in_progress: filteredTasks.filter((t: Task) => normalizeStatus(t.status) === "in_progress"),
        completed: filteredTasks.filter((t: Task) => normalizeStatus(t.status) === "completed"),
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
                    <h2 className="text-[24px] font-semibold text-slate-800">Team Tasks</h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                value={selectedEmployeeFilter}
                                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                                className="appearance-none rounded-md bg-[#E8E8E8] px-4 py-2 pr-8 text-sm text-[#353535] cursor-pointer"
                            >
                                {outlineEmployeeFilters.map((e) => (
                                    <option key={e} value={e}>
                                        {e}
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
                            AddTask
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
                        <span className="text-xl font-bold text-[#0D1829]">To Do</span>
                        <span className="text-xl font-bold text-[#0D1829]">({counts.todo})</span>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                            <img src={Group1} alt="Group1" className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
                        <span className="text-xl font-bold text-[#0D1829]">In Progress</span>
                        <span className="text-xl font-bold text-[#0D1829]">({counts.in_progress})</span>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                            <img src={Group2} alt="Group2" className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
                        <span className="text-xl font-bold text-[#0D1829]">Completed</span>
                        <span className="text-xl font-bold text-[#0D1829]">({counts.completed})</span>
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
                            {displayedTasksByStatus[bucket].map((task: Task) => (
                                <div key={task.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#DD4342] bg-red-50 px-2.5 py-1 rounded-md mb-2 inline-block">
                                                {task.team_name || "General Team"}
                                            </span>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                                {task.project_name || "Internal"}
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <button onClick={() => setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id)} className="p-0.5 rounded cursor-pointer">
                                                <img src={Dot} alt="Dot" className="w-4 h-4" />
                                            </button>
                                            {openMenuTaskId === task.id && (
                                                <div className="absolute top-full mt-1 right-0 z-50 min-w-[150px] bg-white/20 backdrop-blur-md rounded-xl border border-[#59595980] shadow-xl">
                                                    <button onClick={() => { setSelectedTask(task); setShowViewModal(true); setOpenMenuTaskId(null); }}
                                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#616161] hover:text-[#DD4342] cursor-pointer">
                                                        <img src={viewIcon} alt="view" className="w-4 h-4" />
                                                        View
                                                    </button>
                                                    <button onClick={() => setOpenMenuTaskId(null)}
                                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#616161] hover:text-[#DD4342] cursor-pointer">
                                                        <img src={editIcon} alt="edit" className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                    <button onClick={() => setOpenMenuTaskId(null)}
                                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#616161] hover:text-[#DD4342] cursor-pointer">
                                                        <img src={deleteIcon} alt="delete" className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{task.task_name}</h3>
                                    <div className="flex items-center gap-3 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0">
                                            {(task.assigned_to_name || "?")[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Assigned To</p>
                                            <p className="text-sm font-bold text-[#1A1A1A] truncate">{task.assigned_to_name || "Unassigned"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${priorityColors[task.priority] || "text-gray-600 bg-gray-50 border-gray-100"}`}>
                                                {task.priority || "Medium"}
                                            </div>
                                            {task.due_date && (
                                                <span className="text-xs font-semibold text-gray-400">{new Date(task.due_date).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                        <select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                            className="text-[11px] font-bold bg-[#F2F2F2] border-none rounded-lg px-2 py-1 outline-none cursor-pointer">
                                            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ))}
                            {displayedTasksByStatus[bucket].length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                    No team tasks found for the current filters.
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
                            <div className="relative flex items-center justify-center mb-8">
                                <h3 className="text-[22px] font-bold text-[#1E293B]">Assign Team Task</h3>
                                <button onClick={() => setShowCreateModal(false)} className="absolute left-0 p-2 rounded-lg transition-colors bg-[#F2F2F2] cursor-pointer">
                                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[16px] font-medium text-[#000000] block">Task Name *</label>
                                    <input type="text" value={createForm.task_name} onChange={e => setCreateForm({ ...createForm, task_name: e.target.value })} required
                                        className="w-full px-4 py-3 bg-[#F2F3F4] border border-transparent rounded-lg text-[#353535] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#F2F2F2]" placeholder="Enter task name" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[16px] font-medium text-[#000000] block">Project</label>
                                        <div className="relative">
                                            <select value={createForm.project_id} onChange={e => setCreateForm({ ...createForm, project_id: e.target.value })}
                                                className="w-full px-4 py-2 pr-10 bg-[#F2F3F4] border border-transparent rounded-[5px] text-[#353535] text-[14px] focus:outline-none focus:border-[#AEACAC52] appearance-none">
                                                <option value="">Select Project</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                                            </select>
                                            <img src={ArrowDown} alt="arrow" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[16px] font-medium text-[#000000] block">Team/Department</label>
                                        <div className="relative">
                                            <select value={createForm.team_id} onChange={e => setCreateForm({ ...createForm, team_id: e.target.value })}
                                                className="w-full px-4 py-2 pr-10 bg-[#F2F3F4] border border-transparent rounded-[5px] text-[#353535] text-[14px] focus:outline-none focus:border-[#AEACAC52] appearance-none">
                                                <option value="">Select Team</option>
                                                {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                                            </select>
                                            <img src={ArrowDown} alt="arrow" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[16px] font-medium text-[#000000] block">Assign To</label>
                                        <div className="relative">
                                            <select value={createForm.assigned_to} onChange={e => setCreateForm({ ...createForm, assigned_to: e.target.value })}
                                                className="w-full px-4 py-2 pr-10 bg-[#F2F3F4] border border-transparent rounded-[5px] text-[#353535] text-[14px] focus:outline-none focus:border-[#AEACAC52] appearance-none">
                                                <option value="">Select Employee</option>
                                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                            </select>
                                            <img src={ArrowDown} alt="arrow" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[16px] font-medium text-[#000000] block">Priority</label>
                                        <div className="relative">
                                            <select value={createForm.priority} onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                                                className="w-full px-4 py-2 pr-10 bg-[#F2F3F4] border border-transparent rounded-[5px] text-[#353535] text-[14px] focus:outline-none focus:border-[#AEACAC52] appearance-none">
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                                <option value="Urgent">Urgent</option>
                                            </select>
                                            <img src={ArrowDown} alt="arrow" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[16px] font-medium text-[#000000] block">Due Date</label>
                                    <input type="date" value={createForm.due_date} onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#F2F3F4] border border-transparent rounded-lg text-[#353535] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#F2F2F2]" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[16px] font-medium text-[#000000] block">Description</label>
                                    <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} rows={3}
                                        className="w-full px-4 py-3 bg-[#F2F3F4] border border-transparent rounded-lg text-[#353535] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#F2F2F2] resize-none" placeholder="Task description..." />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-3 bg-[#F2F2F2] text-[#475569] rounded-lg font-bold hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
                                    <button type="submit" disabled={createSubmitting}
                                        className="flex-1 px-4 py-3 bg-[#DD4342] text-white rounded-lg font-bold hover:bg-[#DD4342]/90 shadow-lg shadow-red-100 transition-all disabled:opacity-50 cursor-pointer">
                                        Assign Task
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
                                    <span className="text-[10px] font-bold text-[#DD4342] bg-red-50 px-2 py-1 rounded mb-2 inline-block uppercase tracking-wider">{selectedTask.team_name || "General Team"}</span>
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