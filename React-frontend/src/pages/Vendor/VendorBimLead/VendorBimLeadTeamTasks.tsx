import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../lib/api";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaEllipsisV } from "react-icons/fa";
import { VscEye } from "react-icons/vsc";
import { BiEdit } from "react-icons/bi";
import { RiDeleteBin5Fill } from "react-icons/ri";

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
    const navigate = useNavigate();

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
            api.get<{ tasks?: Task[] }>("/api/vendors/vendor-team-tasks"),
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
        api.post("/api/vendors/vendor-team-tasks", createForm)
            .then(() => {
                setShowCreateModal(false);
                setCreateForm({ task_name: "", description: "", status: "To Do", priority: "Medium", due_date: "", project_id: "", assigned_to: "", team_id: "" });
                fetchData();
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
                fetchData();
            });
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

    const outlineEmployeeFilters = ["All Employees", ...new Set(tasks.map(t => t.assigned_to_name).filter(Boolean))];
    const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("All Employees");

    const filteredTasks = tasks.filter(t => {
        const matchesStatus = activeTab === "All" || t.status === activeTab;
        const matchesEmployee = selectedEmployeeFilter === "All Employees" || t.assigned_to_name === selectedEmployeeFilter;
        const matchesProject = !projectFilter || t.project_name === projectFilter;
        return matchesStatus && matchesEmployee && matchesProject;
    });

    const statusOptions = ["To Do", "In Progress", "Review", "Completed", "Paused"];
    const priorityColors: Record<string, string> = {
        High: "text-red-600 bg-red-50 border-red-100",
        Medium: "text-orange-600 bg-orange-50 border-orange-100",
        Low: "text-green-600 bg-green-50 border-green-100",
        Urgent: "text-purple-600 bg-purple-50 border-purple-100",
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    return (
        <div className="bg-white min-h-full font-gantari p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#1A1A1A]">Team Tasks</h2>
                    <p className="text-sm text-gray-500">Overview of all tasks assigned to your teams</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedEmployeeFilter} onChange={e => setSelectedEmployeeFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm outline-none hover:border-gray-300">
                        {outlineEmployeeFilters.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <button onClick={() => setShowCreateModal(true)}
                        className="flex items-center justify-center gap-2 bg-[#DD4342] text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm text-sm">
                        <FaPlus className="text-xs" />
                        Assign Task
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 overflow-x-auto custom-scrollbar whitespace-nowrap">
                {["All", ...statusOptions].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${activeTab === tab ? "border-[#DD4342] text-[#DD4342]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                        {tab}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTasks.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-500 font-medium">No team tasks found for the current filters.</p>
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <div key={task.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#DD4342] bg-red-50 px-2.5 py-1 rounded-md mb-2 inline-block">
                                        {task.team_name || "General Team"}
                                    </span>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">{task.project_name || "Internal"}</p>
                                </div>
                                <div className="relative">
                                    <button onClick={() => setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                                        <FaEllipsisV />
                                    </button>
                                    {openMenuTaskId === task.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200 origin-top-right">
                                            <button onClick={() => { navigate(`/tasks/${task.id}`); setOpenMenuTaskId(null); }}
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-gray-600 hover:text-[#DD4342] font-semibold text-sm transition-colors"><VscEye /> View Details</button>
                                            <button onClick={() => setOpenMenuTaskId(null)}
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-gray-600 hover:text-[#DD4342] font-semibold text-sm transition-colors"><BiEdit /> Edit</button>
                                            <button onClick={() => { handleDelete(task.id); setOpenMenuTaskId(null); }}
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-gray-600 hover:text-red-500 font-semibold text-sm transition-colors"><RiDeleteBin5Fill /> Delete</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 group-hover:text-[#DD4342] transition-colors">{task.task_name}</h3>

                            <div className="flex items-center gap-3 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div className="w-8 h-8 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0">
                                    {(task.assigned_to_name || "?")[0]}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Assigned To</p>
                                    <p className="text-sm font-bold text-[#1A1A1A] truncate">{task.assigned_to_name || "Unassigned"}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${priorityColors[task.priority] || "text-gray-600 bg-gray-50 border-gray-100"}`}>
                                        {task.priority || "Medium"}
                                    </div>
                                    {task.due_date && (
                                        <span className="text-xs font-semibold text-gray-400">{new Date(task.due_date).toLocaleDateString()}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                        className="text-[11px] font-bold bg-[#F2F2F2] border-none rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-gray-200 transition-colors">
                                        {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Task Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-[550px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[22px] font-bold text-[#1E293B]">Assign Team Task</h3>
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
                                        <label className="text-[14px] font-bold text-[#475569] block">Team/Department</label>
                                        <select value={createForm.team_id} onChange={e => setCreateForm({ ...createForm, team_id: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium appearance-none">
                                            <option value="">Select Team</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-bold text-[#475569] block">Assign To</label>
                                        <select value={createForm.assigned_to} onChange={e => setCreateForm({ ...createForm, assigned_to: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium appearance-none">
                                            <option value="">Select Employee</option>
                                            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                        </select>
                                    </div>
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
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[14px] font-bold text-[#475569] block">Due Date</label>
                                    <input type="date" value={createForm.due_date} onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium" />
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
