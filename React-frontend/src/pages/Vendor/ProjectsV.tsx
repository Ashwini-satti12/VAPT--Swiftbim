import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import { VscEye } from "react-icons/vsc";
import { BiEdit } from "react-icons/bi";
import { RiDeleteBin5Fill } from "react-icons/ri";
import Dot from "../../assets/ProjectManager/MyTask/Dot.svg";
import { FaCircleDollarToSlot } from "react-icons/fa6";

interface Project {
    id: number;
    project_name?: string;
    progress?: string;
    total_tasks?: number;
    completed_tasks?: number;
    budget?: string;
    modules?: string;
    client_id?: string;
    project_manager_id?: string;
    start_date?: string;
    due_date?: string;
    totalhours?: string;
    perday?: string;
    department?: string;
    lead_id?: string;
    bim_coordinator_id?: string;
    members?: string;
    no_resource?: string;
    no_resources_required?: string;
    priority?: string;
    location?: string;
    description?: string;
    budget_ceiling?: string;
    bidding_end_date?: string;
    project_manager_name?: string;
    bim_lead_name?: string;
    bim_coordinator_name?: string;
}

interface Milestone {
    id: number;
    milestone_name: string;
    milestone_amount: number;
    due_date: string;
    status: string;
    notes?: string;
}

interface Employee {
    id: number;
    full_name?: string;
    user_role?: string;
    profile_picture?: string;
    email?: string;
}

export default function ProjectsV() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [list, setList] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [showMilestones, setShowMilestones] = useState(false);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [showProjectView, setShowProjectView] = useState(!!searchParams.get("projectId"));
    const [selectedProjectForView, setSelectedProjectForView] =
        useState<Project | null>(null);

    // Add Milestone Modal State
    const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
    const [milestoneName, setMilestoneName] = useState("");
    const [milestoneAmount, setMilestoneAmount] = useState("");
    const [milestoneDueDate, setMilestoneDueDate] = useState("");
    const [milestoneNotes, setMilestoneNotes] = useState("");
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [milestonesLoading, setMilestonesLoading] = useState(false);

    // Edit Project
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedProjectForEdit, setSelectedProjectForEdit] =
        useState<Project | null>(null);
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);
    const [openMenuProjectId, setOpenMenuProjectId] = useState<number | null>(
        null,
    );
    const [editDropdownOpen, setEditDropdownOpen] = useState<
        'source' | 'pm' | 'bimLead' | 'bimCoord' | null
    >(null);

    // Employee data for dropdowns
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projectManagers, setProjectManagers] = useState<Employee[]>([]);
    const [bimLeads, setBimLeads] = useState<Employee[]>([]);
    const [bimCoordinators, setBimCoordinators] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    // Member selection for create/edit
    const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

    // All members modal state
    const [showAllMembersModal, setShowAllMembersModal] = useState(false);
    const [allMembersList, setAllMembersList] = useState<Employee[]>([]);

    // Milestone summaries
    const [taskStats, setTaskStats] = useState({
        todo: 0,
        inProgress: 0,
        paused: 0,
        completed: 0,
    });
    const [towerData, setTowerData] = useState<Array<{
        id: number;
        name: string;
        progress: number;
        completedTasks: number;
        totalTasks: number;
        status: 'Approved' | 'Pending' | 'Review';
    }>>([]);
    const [loadingTaskStats, setLoadingTaskStats] = useState(false);

    const panelType = user?.panel_type ?? 3;
    const isManagement = panelType === 1;
    const isTechnicalDirector = user?.user_role === "Technical Director";
    const title = isManagement ? "Projects" : "Projects Involved";

    const mapApiProjectToProject = (r: Record<string, any>): Project => {
        const num = (v: any) => (v != null ? Number(v) : undefined);
        const str = (v: any) => (v != null ? String(v) : undefined);
        const d = (v: any) => (v != null && typeof v === "string" ? v : undefined);

        return {
            id: num(r.id) ?? 0,
            project_name: str(r.project_name),
            progress: num(r.progress) ?? 0,
            total_tasks: num(r.total_tasks),
            completed_tasks: num(r.completed_tasks),
            budget: str(r.budget),
            module_name: str(r.modules),
            client_name: r.client_name || str(r.client_id),
            project_manager: str(r.project_manager_id),
            start_date: d(r.start_date),
            end_date: d(r.due_date),
            total_hours: str(r.totalhours),
            per_day: str(r.perday),
            department: str(r.department),
            budget_ceiling: str(r.budget_ceiling),
            bidding_end_date: str(r.bidding_end_date),
            bim_lead: str(r.lead_id),
            bim_co_ordinator: str(r.bim_coordinator_id),
            member: str(r.members),
            priority: str(r.priority),
            location: str(r.location),
            description: str(r.description),
            required_resources: str(r.required_resources),
            project_manager_name: str(r.project_manager_name),
            bim_lead_name: str(r.bim_lead_name),
            bim_coordinator_name: str(r.bim_coordinator_name)
        };
    };

    const fetchMilestones = (projectId: number) => {
        setMilestonesLoading(true);
        api.get<{ milestones: Milestone[] }>(`/api/milestones?project_id=${projectId}`)
            .then(({ data }) => setMilestones(data.milestones || []))
            .catch(() => setMilestones([]))
            .finally(() => setMilestonesLoading(false));
    };

    useEffect(() => {
        if (showMilestones && currentProject?.id) {
            fetchMilestones(currentProject.id);
        }
    }, [showMilestones, currentProject?.id]);

    useEffect(() => {
        fetchProjects();
        api.get<{ employees?: Employee[] }>("/api/employees")
            .then(({ data }) => setAllEmployees(data.employees ?? []))
            .catch(() => setAllEmployees([]));
    }, []);

    const getEmployeeName = (id: string | number | undefined): string => {
        if (!id) return "";
        const emp = allEmployees.find(e => e.id === Number(id));
        return emp?.full_name || "";
    };

    const formatDate = (d: string | undefined) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setCreateSubmitting(true);
        api.post("/api/vendors/vendor-projects", {
            ...createForm,
            members: selectedMemberIds.join(","),
        })
            .then(({ data }) => {
                if (data.success) {
                    setShowCreateModal(false);
                    setCreateForm({ project_name: "", description: "", budget: "", priority: "Medium", start_date: "", due_date: "", location: "", modules: "", totalhours: "", perday: "", members: "" });
                    setSelectedMemberIds([]);
                    setSuccessMsg("Project created!");
                    setTimeout(() => setSuccessMsg(null), 3000);
                    fetchProjects();
                }
            })
            .catch(() => { })
            .finally(() => setCreateSubmitting(false));
    };

    const openEdit = (p: Project) => {
        setEditId(p.id);
        setEditForm({
            project_name: p.project_name || "",
            description: p.description || "",
            budget: p.budget || "",
            priority: p.priority || "Medium",
            start_date: p.start_date ? p.start_date.split("T")[0] : "",
            due_date: p.due_date || "",
            location: p.location || "",
            modules: p.modules || "",
            totalhours: p.totalhours || "",
            perday: p.perday || "",
            members: p.members || "",
        });
        setSelectedMemberIds(p.members ? p.members.split(",").filter(Boolean).map(Number) : []);
        setShowEditModal(true);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId) return;
        setEditSubmitting(true);
        api.patch(`/api/vendors/vendor-projects/${editId}`, {
            ...editForm,
            members: selectedMemberIds.join(","),
        })
            .then(({ data }) => {
                if (data.success) {
                    setShowEditModal(false);
                    setSuccessMsg("Project updated!");
                    setTimeout(() => setSuccessMsg(null), 3000);
                    fetchProjects();
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    // Deep-link support: keep project view on refresh using ?projectId=
    useEffect(() => {
        const pid = searchParams.get("projectId");
        if (!pid) {
            if (showProjectView || selectedProjectForView) {
                setShowProjectView(false);
                setSelectedProjectForView(null);
            }
            return;
        }

        const id = Number(pid);
        if (!Number.isFinite(id) || id <= 0) return;

        if (showProjectView && selectedProjectForView?.id === id) {
            return;
        }

        const existingProject = list.find(p => p.id === id);
        if (existingProject) {
            setSelectedProjectForView(existingProject);
            setShowProjectView(true);
        } else if (!showProjectView) {
            setShowProjectView(true);
        }

        api
            .get<Record<string, unknown>>(`/api/projects/${id}`)
            .then(({ data }) => setSelectedProjectForView(mapApiProjectToProject(data)))
            .catch(() => {
                if (!existingProject) {
                    setSearchParams({}, { replace: true });
                    setShowProjectView(false);
                }
            });
    }, [searchParams, list, setSearchParams]);

    // Fetch employees at mount so project view can resolve members
    useEffect(() => {
        api
            .get<{ employees?: Employee[] }>("/api/employees")
            .then(({ data }) => setAllEmployees(data.employees ?? []))
            .catch(() => setAllEmployees([]));
    }, []);

    const handleDelete = () => {
        if (!deleteId) return;
        api.delete(`/api/vendors/vendor-projects/${deleteId}`)
            .then(() => {
                setList(prev => prev.filter(p => p.id !== deleteId));
                setDeleteId(null);
                setSuccessMsg("Project deleted!");
                setTimeout(() => setSuccessMsg(null), 3000);
            });
    };

    const toggleMember = (id: number) => {
        setSelectedMemberIds(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    // Member selection dropdown used in both Create + Edit
    const renderMemberSelector = () => (
        <div className="space-y-2 relative">
            <label className="text-[14px] font-bold text-[#475569] block">Team Members</label>
            <div onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                className="w-full px-4 py-3 bg-[#F2F2F2] rounded-lg min-h-[48px] cursor-pointer flex flex-wrap gap-2 items-center">
                {selectedMemberIds.length === 0 ? (
                    <span className="text-gray-400 font-medium">Select members</span>
                ) : (
                    selectedMemberIds.map(id => (
                        <span key={id} className="bg-white px-2.5 py-1 rounded-md text-[13px] font-bold text-[#1E293B] shadow-sm flex items-center gap-1.5 border border-[#E2E8F0]">
                            {getEmployeeName(id)}
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleMember(id); }} className="hover:text-red-500">×</button>
                        </span>
                    ))
                )}
            </div>
            {memberDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-[#E2E8F0] p-3 z-50 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {allEmployees.map(emp => (
                        <div key={emp.id} onClick={() => toggleMember(emp.id)}
                            className="flex items-center gap-3 p-2.5 hover:bg-[#F8FAFC] rounded-lg cursor-pointer transition-colors">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedMemberIds.includes(emp.id) ? 'bg-[#DD4342] border-[#DD4342]' : 'border-[#CBD5E1]'}`}>
                                {selectedMemberIds.includes(emp.id) && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                            <span className="text-[15px] font-medium text-[#334155]">{emp.full_name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // Render form fields for Create/Edit
    const renderFormFields = (form: typeof createForm, setForm: (f: typeof createForm) => void) => (
        <div className="space-y-5">
            <div className="space-y-2">
                <label className="text-[14px] font-bold text-[#475569] block">Project Name *</label>
                <input type="text" value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} required
                    className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg focus:ring-1 focus:ring-[#DD4342] text-[#1E293B] font-medium" placeholder="Enter project name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[14px] font-bold text-[#475569] block">Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium" />
                </div>
                <div className="space-y-2">
                    <label className="text-[14px] font-bold text-[#475569] block">Due Date</label>
                    <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[14px] font-bold text-[#475569] block">Budget</label>
                    <input type="text" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium" placeholder="e.g. 50000" />
                </div>
                <div className="space-y-2">
                    <label className="text-[14px] font-bold text-[#475569] block">Priority</label>
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium appearance-none">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[14px] font-bold text-[#475569] block">Location</label>
                <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium" placeholder="Project location" />
            </div>
            <div className="space-y-2">
                <label className="text-[14px] font-bold text-[#475569] block">Modules (comma-separated)</label>
                <input type="text" value={form.modules} onChange={e => setForm({ ...form, modules: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium" placeholder="e.g. m1, m2, m3" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[14px] font-bold text-[#475569] block">Total Hours</label>
                    <input type="text" value={form.totalhours} onChange={e => setForm({ ...form, totalhours: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium" placeholder="Total project hours" />
                </div>
                <div className="space-y-2">
                    <label className="text-[14px] font-bold text-[#475569] block">Per Day</label>
                    <input type="text" value={form.perday} onChange={e => setForm({ ...form, perday: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium" placeholder="Hours per day" />
                </div>
            </div>
            {renderMemberSelector()}
            <div className="space-y-2">
                <label className="text-[14px] font-bold text-[#475569] block">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                    className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg text-[#1E293B] font-medium resize-none" placeholder="Project description" />
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
                {/* Toast */}
                {successMsg && (
                    <div className="fixed top-5 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl bg-[#1A8A47] text-white font-gantari text-sm font-medium min-w-[280px]">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Project View */}
                {showProjectView && selectedProject ? (
                    <div className="flex flex-col h-full bg-white">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 px-6 py-6 md:px-10 md:py-8 border-b border-slate-50">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowProjectView(false);
                                    setSearchParams({}, { replace: true });
                                }}
                                className="p-3.5 rounded-xl bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                                title="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <div className="min-w-0">
                                <h3 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#1A1A1A] truncate">
                                    {selectedProject.project_name ?? "Untitled Project"}
                                </h3>
                                <p className="text-[14px] font-Gantari font-semibold text-[#999999]">Overall Progress Tracker</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-6 md:pt-8 custom-scrollbar space-y-8">
                            {/* Task Status Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-8">
                                {[
                                    { label: "To Do Tasks", value: taskStats.todo },
                                    { label: "In Progress", value: taskStats.inProgress },
                                    { label: "Paused", value: taskStats.paused },
                                    { label: "Completed", value: taskStats.completed },
                                ].map((stat, i) => (
                                    <div key={i} className="text-left bg-[#F4F5F7] p-6 rounded-[1rem] md:rounded-[1.25rem] shadow-sm flex flex-col h-[100px] md:h-[140px] hover:bg-[#DD4342] transition-colors group">
                                        <p className="text-[#353535] group-hover:text-white text-[18px] md:text-[20px] font-Gantari font-semibold">{stat.label}</p>
                                        <p className="text-[#353535] group-hover:text-white text-[28px] md:text-[36px] font-Gantari font-bold leading-none mt-auto self-center">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Project Details */}
                            <div className="border border-slate-200 rounded-[10px] p-6 md:p-8">
                                <h4 className="text-[18px] md:text-[22px] font-Gantari font-bold text-[#000000] mb-4">Project Details</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm font-gantari">
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Priority</span><span className="text-[#1A1A1A] font-bold">{selectedProject.priority || "—"}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Budget</span><span className="text-[#1A1A1A] font-bold">{selectedProject.budget || "—"}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Start Date</span><span className="text-[#1A1A1A] font-bold">{formatDate(selectedProject.start_date)}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Due Date</span><span className="text-[#1A1A1A] font-bold">{formatDate(selectedProject.due_date)}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Location</span><span className="text-[#1A1A1A] font-bold">{selectedProject.location || "—"}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Total Hours</span><span className="text-[#1A1A1A] font-bold">{selectedProject.totalhours || "—"}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Per Day</span><span className="text-[#1A1A1A] font-bold">{selectedProject.perday || "—"}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Modules</span><span className="text-[#1A1A1A] font-bold">{selectedProject.modules || "—"}</span></div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="border border-slate-200 rounded-[10px] p-6 md:p-8">
                                <h4 className="text-[18px] md:text-[22px] font-Gantari font-bold text-[#000000]">Project Description</h4>
                                <p className="text-[16px] font-Gantari font-medium text-[#666666] mt-4 leading-relaxed">
                                    {selectedProject.description ?? "No description available"}
                                </p>
                            </div>

                            {/* Team Members */}
                            <div className="border border-slate-200 rounded-[10px] p-6 md:p-8">
                                <h4 className="text-[18px] md:text-[22px] font-Gantari font-bold text-[#000000] mb-6">Team Overview</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {(selectedProject.members || "").split(",").filter(Boolean).map(id => {
                                        const emp = allEmployees.find(e => e.id === Number(id));
                                        return emp ? (
                                            <div key={id} className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-sm font-bold">
                                                    {(emp.full_name || "?")[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#1E293B]">{emp.full_name}</p>
                                                    <p className="text-xs text-[#999]">{emp.user_role || "Member"}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full text-center py-8 text-gray-500">No tower/module data available</div>
                                )}
                            </div>

                            {/* Project Details Section */}
                            <div className="border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10">
                                <h4 className="text-[18px] md:text-[22px] font-Gantari font-bold text-[#1A1A1A] mb-8">Project Details</h4>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 md:gap-y-6 lg:gap-x-20">
                                    <div className="space-y-4 md:space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">Client Name</span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">{selectedProjectForView.client_name || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">Project Manager</span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">{selectedProjectForView.project_manager_name || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">BIM Lead</span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">{selectedProjectForView.bim_lead_name || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">BIM Co-ordinator</span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">{selectedProjectForView.bim_coordinator_name || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">Actual Start Date</span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                                                {selectedProjectForView.start_date ? new Date(selectedProjectForView.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-4 md:space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">Location</span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">{selectedProjectForView.location || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">Actual End Date</span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                                                {selectedProjectForView.end_date ? new Date(selectedProjectForView.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">Hours/Day</span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">{selectedProjectForView.per_day ? `${selectedProjectForView.per_day}hrs` : 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">Total Resources Required</span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">{selectedProjectForView.resources || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">Required Resources</span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">{selectedProjectForView.required_resources || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-10 md:mt-12 flex flex-col sm:flex-row sm:items-center">
                                    <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A] mb-2 sm:mb-0">Project Document</span>
                                    <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                    <div className="flex items-center gap-3">
                                        <a href="#" className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#1D7AFC] hover:underline truncate max-w-[150px] md:max-w-none">Document.pdf</a>
                                        <button className="p-2 rounded-lg bg-[#E2EEFF] text-[#1D7AFC] hover:bg-[#D5E6FF] transition-colors shrink-0">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : showMilestones && milestonesProject ? (
                    /* Milestones View */
                    <div className="flex flex-col h-full bg-white">
                        {/* Milestones Header */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-6 md:px-10 py-6 md:py-8 border-b border-slate-50">
                            <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setShowMilestones(false)}
                                    className="p-3 md:p-3.5 rounded-xl bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <div className="min-w-0">
                                    <h3 className="text-[20px] md:text-[26px] font-Gantari font-bold text-[#1A1A1A] truncate">Payment Milestones</h3>
                                    <p className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#999999] mt-0.5 truncate">
                                        {currentProject.project_name}
                                    </p>
                                </div>
                            </div>
                            {(isManagement || isTechnicalDirector) && (
                                <button
                                    onClick={() => setShowAddMilestoneModal(true)}
                                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#DD4342] text-white font-Gantari font-bold text-[15px] md:text-[16px] shadow-sm hover:bg-[#c93a39] transition-colors"
                                    title="Add Milestone"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Milestone
                                </button>
                            )}
                        </div>

                        {/* Milestones Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col px-6 md:px-10 pb-10 custom-scrollbar">
                            {/* Summary Cards */}
                            {(() => {
                                const totalAmount = milestones.reduce((sum, m) => sum + Number(m.milestone_amount || 0), 0);
                                const paidAmount = milestones.filter(m => (m.status || '').toLowerCase() === 'paid').reduce((sum, m) => sum + Number(m.milestone_amount || 0), 0);
                                const pendingAmount = totalAmount - paidAmount;
                                const progressPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 mt-6">
                                        <div className="bg-[#DD4342] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[120px] md:min-h-[150px]">
                                            <p className="text-white text-[14px] md:text-[16px] font-Gantari font-bold opacity-90">Total Amount</p>
                                            <p className="text-white text-[28px] md:text-[32px] font-Gantari font-bold">{totalAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[120px] md:min-h-[150px]">
                                            <p className="text-[#333333] text-[14px] md:text-[16px] font-Gantari font-bold">Paid Amount</p>
                                            <p className="text-[#333333] text-[28px] md:text-[32px] font-Gantari font-bold">{paidAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[120px] md:min-h-[150px]">
                                            <p className="text-[#333333] text-[14px] md:text-[16px] font-Gantari font-bold">Pending Amount</p>
                                            <p className="text-[#333333] text-[28px] md:text-[32px] font-Gantari font-bold">{pendingAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[120px] md:min-h-[150px]">
                                            <p className="text-[#333333] text-[14px] md:text-[16px] font-Gantari font-bold">Progress</p>
                                            <p className="text-[#333333] text-[28px] md:text-[32px] font-Gantari font-bold">{progressPercent}%</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {milestonesLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DD4342]"></div>
                                </div>
                            ) : milestones.length === 0 ? (
                                <div className="flex-1 border-2 border-slate-100 border-dashed rounded-[1.5rem] md:rounded-[2.5rem] bg-white px-6 md:px-24 py-12 md:py-0 flex flex-col items-center justify-center text-center">
                                    <h4 className="text-[18px] md:text-[22px] font-Gantari font-bold text-[#353535] mb-2">No Payment Milestones Found</h4>
                                    <p className="text-[14px] md:text-[15px] font-Gantari font-bold text-[#999999] mb-8 md:mb-10 max-w-sm">
                                        Add your First Payment to get started with payment tracking
                                    </p>
                                    {(isManagement || isTechnicalDirector) && (
                                        <button
                                            onClick={() => setShowAddMilestoneModal(true)}
                                            className="flex items-center gap-2 px-8 md:px-10 py-3.5 md:py-4 rounded-xl bg-[#DD4342] text-white font-Gantari font-bold text-[16px] md:text-[18px] shadow-lg shadow-red-500/10 hover:bg-[#c93a39] transition-colors"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add Milestone
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {milestones.map((m) => (
                                        <div key={m.id} className="bg-white border border-slate-100 rounded-[1.25rem] p-6 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-[18px] font-Gantari font-bold text-[#1A1A1A] mb-1 truncate">{m.milestone_name}</h5>
                                                <div className="flex items-center gap-6 text-[14px] font-Gantari text-[#999999]">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span>Due: {m.due_date ? new Date(m.due_date).toLocaleDateString('en-GB') : '-'}</span>
                                                    </div>
                                                    {m.notes && (
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                            </svg>
                                                            <span className="truncate max-w-xs">{m.notes}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">${Number(m.milestone_amount).toLocaleString()}</p>
                                                    <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-bold font-Gantari ${m.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {m.status}
                                                    </span>
                                                </div>
                                                {(isManagement || isTechnicalDirector) && (
                                                    <div className="flex items-center gap-2">
                                                        {m.status !== 'Paid' && (
                                                            <button
                                                                onClick={() => {
                                                                    api.post(`/api/milestones/${m.id}/mark-paid`)
                                                                        .then(() => currentProject?.id && fetchMilestones(currentProject.id))
                                                                        .catch(() => { });
                                                                }}
                                                                className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                                title="Mark as Paid"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm('Are you sure you want to delete this milestone?')) {
                                                                    api.delete(`/api/milestones/${m.id}`)
                                                                        .then(() => currentProject?.id && fetchMilestones(currentProject.id))
                                                                        .catch(() => { });
                                                                }
                                                            }}
                                                            className="p-2 rounded-lg bg-red-50 text-[#DD4342] hover:bg-red-100 transition-colors"
                                                            title="Delete Milestone"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Project List */
                    <>
                        <div className="flex items-center justify-between pb-6">
                            <h2 className="text-[24px] font-semibold text-[#000000]">Projects</h2>
                            <button onClick={() => { setShowCreateModal(true); setSelectedMemberIds([]); }}
                                className="flex items-center gap-2 bg-[#DD4342] text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm text-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                Create Project
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pt-4 pb-4 px-4 space-y-8 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {list.length === 0 ? (
                                    <div className="col-span-full bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                                        No projects found. Create your first project or accept a proposal.
                                    </div>
                                ) : (
                                    list.map(p => {
                                        const progress = Math.round(Number(p.progress) || 0);
                                        const memberIds = p.members ? p.members.split(",").filter(Boolean).map(Number) : [];
                                        const rad = 28;
                                        const circ = 2 * Math.PI * rad;
                                        return (
                                            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <h3 className="text-[20px] font-semibold text-[#353535] leading-tight">{p.project_name ?? "Untitled"}</h3>
                                                        <div className="relative">
                                                            <button type="button" onClick={() => setOpenMenuProjectId(prev => prev === p.id ? null : p.id)} className="rounded-full">
                                                                <img src={Dot} alt="" className="w-6 h-6" />
                                                            </button>
                                                            <div className={`absolute -right-40 w-50 bg-white/20 backdrop-blur rounded-[15px] border border-[#59595980] z-20 transition-all ${openMenuProjectId === p.id ? "opacity-100 visible" : "opacity-0 invisible"}`}>
                                                                <button onClick={() => { setOpenMenuProjectId(null); setSearchParams({ projectId: String(p.id) }); }} className="w-full flex items-center gap-4 px-6 py-2.5 hover:text-[#DD4342] font-semibold text-[#6B6B6B] text-sm"><VscEye /> View</button>
                                                                {(isTechnicalDirector || isManagement) && (
                                                                    <button onClick={() => { setOpenMenuProjectId(null); setCurrentProject(p); setShowMilestones(true); }} className="w-full flex items-center gap-4 px-6 py-2.5 hover:text-[#DD4342] font-semibold text-[#6B6B6B] text-sm"><FaCircleDollarToSlot /> Milestones</button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6 mt-4 mb-8">
                                                        <div className="relative flex items-center justify-center w-20 h-20">
                                                            <svg className="w-full h-full transform -rotate-90">
                                                                <circle cx="40" cy="40" r={rad} stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                                                                <circle cx="40" cy="40" r={rad} stroke="#0a9344" strokeWidth="6" fill="transparent"
                                                                    strokeDasharray={circ} strokeDashoffset={circ - (progress / 100) * circ} strokeLinecap="round" />
                                                            </svg>
                                                            <span className="absolute font-bold">{progress}%</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between mb-2">
                                                                <span className="text-[15px] font-bold text-[#8B8B8B]">Progress</span>
                                                                <span className="text-[15px] font-bold">{progress}%</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-[#F1F4F9] rounded-full overflow-hidden">
                                                                <div className="h-full bg-[#0a9344]" style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="border-t border-[#F1F1F1] pt-5 mt-auto flex items-center justify-between">
                                                    <div className="flex -space-x-4">
                                                        {memberIds.slice(0, 3).map(id => (
                                                            <div key={id} className="w-10 h-10 rounded-full border-2 border-white bg-[#DD4342] text-white flex items-center justify-center text-sm font-bold">
                                                                {(getEmployeeName(id) || "?")[0]}
                                                            </div>
                                                        ))}
                                                        {memberIds.length > 3 && (
                                                            <div className="w-10 h-10 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
                                                                +{memberIds.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {p.priority && (
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.priority === "High" || p.priority === "Urgent" ? "bg-[#FFF1F2] text-[#BE123C]" : p.priority === "Medium" ? "bg-[#FFF8E7] text-[#92400E]" : "bg-[#E6F4EA] text-[#1E7E34]"}`}>
                                                            {p.priority}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-[600px] shadow-2xl overflow-hidden">
                        <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[22px] font-bold text-[#1E293B] font-sora">New Project</h3>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-[#F1F5F9] rounded-lg bg-[#F2F2F2]">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreate}>
                                {renderFormFields(createForm, setCreateForm)}
                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-3 bg-[#F2F2F2] text-[#475569] rounded-lg font-bold hover:bg-[#E2E8F0] transition-colors">Cancel</button>
                                    <button type="submit" disabled={createSubmitting}
                                        className="flex-1 px-4 py-3 bg-[#DD4342] text-white rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                                        {createSubmitting ? "Creating..." : "Create Project"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-[600px] shadow-2xl overflow-hidden">
                        <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[22px] font-bold text-[#1E293B] font-sora">Edit Project</h3>
                                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-[#F1F5F9] rounded-lg bg-[#F2F2F2]">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleEdit}>
                                {renderFormFields(editForm, setEditForm as any)}
                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setShowEditModal(false)}
                                        className="flex-1 px-4 py-3 bg-[#F2F2F2] text-[#475569] rounded-lg font-bold hover:bg-[#E2E8F0] transition-colors">Cancel</button>
                                    <button type="submit" disabled={editSubmitting}
                                        className="flex-1 px-4 py-3 bg-[#DD4342] text-white rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                                        {editSubmitting ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/20">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
                        <h3 className="text-xl font-bold mb-4">Delete Project</h3>
                        <p className="text-gray-600 mb-8">Are you sure you want to delete this project? This action cannot be undone.</p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setDeleteId(null)} className="px-6 py-2 rounded-xl bg-gray-100 font-bold">Cancel</button>
                            <button onClick={handleDelete} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {showAddMilestoneModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full flex flex-col p-10">
                        {/* Modal Header */}
                        <div className="relative flex items-center justify-center mb-6 md:mb-10">
                            <button
                                type="button"
                                onClick={() => setShowAddMilestoneModal(false)}
                                className="absolute left-0 p-2.5 md:p-3 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                                title="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <h3 className="text-[20px] md:text-[24px] font-Gantari font-bold text-[#1A1A1A] text-center px-12">Add Payment Milestone</h3>
                        </div>

                        {/* Modal Body */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!currentProject?.id) return;
                                api.post('/api/milestones', {
                                    project_id: currentProject.id,
                                    milestone_name: milestoneName.trim(),
                                    milestone_amount: milestoneAmount,
                                    due_date: milestoneDueDate,
                                    notes: milestoneNotes.trim(),
                                    action: "add"
                                })
                                    .then(() => {
                                        setShowAddMilestoneModal(false);
                                        setMilestoneName('');
                                        setMilestoneAmount('');
                                        setMilestoneDueDate('');
                                        setMilestoneNotes('');
                                        fetchMilestones(currentProject.id);
                                    })
                                    .catch(() => { });
                            }}
                            className="space-y-5 md:space-y-6 px-1"
                        >
                            {/* Milestone Name */}
                            <div className="space-y-2">
                                <label className="block text-[14px] md:text-[15px] font-Gantari font-bold text-[#353535]">Milestone Name*</label>
                                <input
                                    type="text"
                                    value={milestoneName}
                                    onChange={(e) => setMilestoneName(e.target.value)}
                                    className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                                    placeholder="Enter Milestone Name"
                                    required
                                />
                            </div>

                            {/* Amount */}
                            <div className="space-y-2">
                                <label className="block text-[14px] md:text-[15px] font-Gantari font-bold text-[#353535]">Amount ($)*</label>
                                <input
                                    type="number" step="0.01"
                                    value={milestoneAmount}
                                    onChange={(e) => setMilestoneAmount(e.target.value)}
                                    className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                                    placeholder="Enter Amount"
                                    required
                                />
                                <div className="flex flex-col sm:flex-row justify-between gap-1 text-[12px] md:text-[13px] font-Gantari font-bold text-[#999999]">
                                    <span>Project Budget: {currentProject?.budget}$</span>
                                </div>
                            </div>

                            {/* Due Date */}
                            <div className="space-y-2">
                                <label className="block text-[14px] md:text-[15px] font-Gantari font-bold text-[#353535]">Due Date*</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={milestoneDueDate}
                                        onChange={(e) => setMilestoneDueDate(e.target.value)}
                                        className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="block text-[14px] md:text-[15px] font-Gantari font-bold text-[#353535]">Notes (Optional)</label>
                                <textarea
                                    value={milestoneNotes}
                                    onChange={(e) => setMilestoneNotes(e.target.value)}
                                    className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400 resize-none min-h-[100px]"
                                    placeholder="Add any additional notes here..."
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full py-4 md:py-4.5 rounded-[5px] bg-[#DD4342] text-white font-Gantari font-bold text-[16px] md:text-[18px] shadow-lg shadow-red-500/10 hover:bg-[#c93a39] transition-all transform hover:-translate-y-0.5 mt-4"
                            >
                                Add Milestone
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}