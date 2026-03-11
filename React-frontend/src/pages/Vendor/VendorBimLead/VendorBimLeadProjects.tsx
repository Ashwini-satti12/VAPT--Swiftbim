import { useEffect, useState } from "react";
import api from "../../../lib/api";
import { VscEye } from "react-icons/vsc";
import { BiEdit } from "react-icons/bi";
import { RiDeleteBin5Fill } from "react-icons/ri";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import { FaCircleDollarToSlot } from "react-icons/fa6";
import { FiUploadCloud, FiPaperclip } from "react-icons/fi";

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
    deliverables?: string;
    budget_ceiling?: string;
    bidding_end_date?: string;
    proposal_id?: number;
    opportunity_id?: number;
}

interface Employee {
    id: number;
    full_name?: string;
    user_role?: string;
    profile_picture?: string;
    email?: string;
}

export default function VendorBimLeadProjects() {
    const [list, setList] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenuProjectId, setOpenMenuProjectId] = useState<number | null>(null);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [clientsList, setClientsList] = useState<Array<{ id: number; fullName?: string; full_name?: string }>>([]);

    const [showProjectView, setShowProjectView] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [taskStats] = useState({ todo: 0, inProgress: 0, paused: 0, completed: 0 });

    const [createName, setCreateName] = useState("");
    const [createBudget, setCreateBudget] = useState("");
    const [createModuleName, setCreateModuleName] = useState("");
    const [createFile, setCreateFile] = useState<File | null>(null);
    const [createClientName, setCreateClientName] = useState("");
    const [createProjectManager, setCreateProjectManager] = useState("");
    const [createStartDate, setCreateStartDate] = useState("");
    const [createEndDate, setCreateEndDate] = useState("");
    const [createTotalHours, setCreateTotalHours] = useState("");
    const [createPerDay, setCreatePerDay] = useState("");
    const [createBIMLead, setCreateBIMLead] = useState("");
    const [createBIMCoOrdinator, setCreateBIMCoOrdinator] = useState("");
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
    const [createResources, setCreateResources] = useState("");
    const [createRequiredResources, setCreateRequiredResources] = useState("");
    const [createPriority, setCreatePriority] = useState("");
    const [createLocation, setCreateLocation] = useState("");
    const [createDescription, setCreateDescription] = useState("");
    const [createDeliverables, setCreateDeliverables] = useState("");

    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editDropdownOpen, setEditDropdownOpen] = useState<string | null>(null);

    const [projectManagers, setProjectManagers] = useState<Employee[]>([]);
    const [bimLeads, setBimLeads] = useState<Employee[]>([]);
    const [bimCoordinators, setBimCoordinators] = useState<Employee[]>([]);

    const [showMilestones, setShowMilestones] = useState(false);
    const [milestonesProject, setMilestonesProject] = useState<Project | null>(null);

    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    const fetchProjects = () => {
        api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects")
            .then(({ data }) => setList(data.projects ?? []))
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchProjects();
        api.get<{ employees?: Employee[] }>("/api/employees")
            .then(({ data }) => {
                const emps = data.employees ?? [];
                setAllEmployees(emps);
                setProjectManagers(emps.filter(e => e.user_role === "Project Manager"));
                setBimLeads(emps.filter(e => e.user_role === 'BIM Lead'));
                setBimCoordinators(emps.filter(e => e.user_role === 'BIM Coordinator'));
            })
            .catch(() => {
                setAllEmployees([]);
                setProjectManagers([]);
                setBimLeads([]);
                setBimCoordinators([]);
            });

        // Fetch clients
        api.get<{ clients?: any[] }>("/api/clients")
            .then(({ data }) => setClientsList(data.clients ?? []))
            .catch(() => setClientsList([]));
    }, []);

    const nameToId = (name: string, list: Employee[]) => {
        const found = list.find(e => e.full_name === name);
        return found ? String(found.id) : "";
    };

    const idToName = (id: string | number | undefined, list: Employee[]) => {
        if (!id) return "";
        const found = list.find(e => e.id === Number(id));
        return found?.full_name || "";
    };
    const getClientNameById = (id: string | number | undefined): string => {
        if (!id) return "";
        const found = clientsList.find(c => String(c.id) === String(id));
        return (found?.fullName || found?.full_name || "") as string;
    };

    const getClientIdByName = (name: string): number | "" => {
        if (!name) return "";
        const found = clientsList.find(c => (c.fullName || c.full_name) === name);
        return found ? found.id : "";
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setCreateSubmitting(true);
        api.post("/api/vendors/vendor-projects", {
            project_name: createName,
            budget: createBudget,
            modules: createModuleName,
            client_id: getClientIdByName(createClientName),
            project_manager_id: nameToId(createProjectManager, projectManagers),
            start_date: createStartDate,
            due_date: createEndDate,
            totalhours: createTotalHours,
            perday: createPerDay,
            lead_id: nameToId(createBIMLead, bimLeads),
            bim_coordinator_id: nameToId(createBIMCoOrdinator, bimCoordinators),
            members: selectedMemberIds.join(","),
            no_resource: createResources,
            no_resources_required: createRequiredResources,
            priority: createPriority,
            location: createLocation,
            description: createDescription,
            deliverables: createDeliverables,
        })
            .then(({ data }) => {
                if (data.success) {
                    setShowCreateModal(false);
                    setCreateName(""); setCreateBudget(""); setCreateModuleName(""); setCreateClientName("");
                    setCreateProjectManager(""); setCreateStartDate(""); setCreateEndDate(""); setCreateTotalHours("");
                    setCreatePerDay(""); setCreateBIMLead(""); setCreateBIMCoOrdinator(""); setSelectedMemberIds([]);
                    setCreateResources(""); setCreateRequiredResources(""); setCreatePriority(""); setCreateLocation("");
                    setCreateDescription(""); setCreateDeliverables(""); setCreateFile(null);
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
        setCreateName(p.project_name || "");
        setCreateBudget(p.budget || "");
        setCreateModuleName(p.modules || "");
        setCreateClientName(
            getClientNameById(p.client_id) || (p.client_id ? String(p.client_id) : "")
        );
        setCreateProjectManager(idToName(p.project_manager_id, allEmployees));
        setCreateStartDate(p.start_date ? p.start_date.split("T")[0] : "");
        setCreateEndDate(p.due_date ? p.due_date.split("T")[0] : "");
        setCreateTotalHours(p.totalhours || "");
        setCreatePerDay(p.perday || "");
        setCreateBIMLead(idToName(p.lead_id, allEmployees));
        setCreateBIMCoOrdinator(idToName(p.bim_coordinator_id, allEmployees));
        setSelectedMemberIds(p.members ? p.members.split(",").filter(Boolean).map(Number) : []);
        setCreateResources(p.no_resource || "");
        setCreateRequiredResources(p.no_resources_required || "");
        setCreatePriority(p.priority || "Medium");
        setCreateLocation(p.location || "");
        setCreateDescription(p.description || "");
        setCreateDeliverables(p.deliverables || "");
        setShowEditModal(true);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId) return;
        setEditSubmitting(true);
        api.patch(`/api/vendors/vendor-projects/${editId}`, {
            project_name: createName,
            budget: createBudget,
            modules: createModuleName,
            client_id: getClientIdByName(createClientName),
            project_manager_id: nameToId(createProjectManager, projectManagers),
            start_date: createStartDate,
            due_date: createEndDate,
            totalhours: createTotalHours,
            perday: createPerDay,
            lead_id: nameToId(createBIMLead, bimLeads),
            bim_coordinator_id: nameToId(createBIMCoOrdinator, bimCoordinators),
            members: selectedMemberIds.join(","),
            no_resource: createResources,
            no_resources_required: createRequiredResources,
            priority: createPriority,
            location: createLocation,
            description: createDescription,
            deliverables: createDeliverables,
        })
            .then(({ data }) => {
                if (data.success) {
                    setShowEditModal(false);
                    // Reset fields
                    setCreateName(""); setCreateBudget(""); setCreateModuleName(""); setCreateClientName("");
                    setCreateProjectManager(""); setCreateStartDate(""); setCreateEndDate("");
                    setCreateTotalHours(""); setCreatePerDay(""); setCreateBIMLead("");
                    setCreateBIMCoOrdinator(""); setSelectedMemberIds([]); setCreateResources("");
                    setCreateRequiredResources(""); setCreatePriority(""); setCreateLocation("");
                    setCreateDescription(""); setCreateDeliverables(""); setCreateFile(null);

                    setSuccessMsg("Project updated!");
                    setTimeout(() => setSuccessMsg(null), 3000);
                    fetchProjects();
                }
            })
            .catch(() => { })
            .finally(() => setEditSubmitting(false));
    };

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

    const getEmployeeName = (id: any) => allEmployees.find(e => e.id === Number(id))?.full_name || "";
    const formatDate = (d: any) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—";

    const toggleMember = (id: number) => {
        setSelectedMemberIds(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const renderMemberSelector = () => (
        <div className="space-y-2">
            <label className="block text-[15px] font-bold text-[#353535]">Team Members</label>
            <div className="relative">
                <div onClick={() => setEditDropdownOpen(prev => prev === 'members' ? null : 'members')}
                    className="w-full px-4 py-3 bg-[#F2F2F2] rounded-lg cursor-pointer flex flex-wrap gap-2 items-center min-h-[50px] hover:bg-[#EAEAEA] transition-colors">
                    {selectedMemberIds.length === 0 ? (
                        <span className="text-gray-400 font-medium">Select members</span>
                    ) : (
                        selectedMemberIds.map(id => (
                            <div key={id} className="bg-white px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm border border-[#E2E8F0]">
                                <span className="text-[13px] font-bold text-[#1E293B]">{getEmployeeName(id)}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleMember(id); }} className="text-gray-400 hover:text-[#DD4342] transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
                {editDropdownOpen === 'members' && (
                    <div className="absolute z-[200] left-0 right-0 mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-2">
                        {allEmployees.map(emp => (
                            <div key={emp.id} onClick={() => toggleMember(emp.id)}
                                className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC] rounded-lg cursor-pointer transition-colors group">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedMemberIds.includes(emp.id) ? 'bg-[#DD4342] border-[#DD4342]' : 'border-[#CBD5E1] group-hover:border-[#DD4342]'}`}>
                                    {selectedMemberIds.includes(emp.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-[#1E293B]">{emp.full_name}</p>
                                    <p className="text-xs text-[#94A3B8] font-medium">{emp.user_role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderFormFields = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Project Name</label>
                <input type="text" value={createName} onChange={e => setCreateName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/20 text-[#1E293B] font-medium transition-all" placeholder="Enter Project Name" />
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Budget</label>
                <div className="relative">
                    <input type="text" readOnly className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl font-medium text-gray-500 cursor-not-allowed transition-all"
                        placeholder="Auto-fetched from contract" value={createBudget} />
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Client Name</label>
                <input type="text" value={createClientName} onChange={e => setCreateClientName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/20 text-[#1E293B] font-medium transition-all" placeholder="Enter Client Name" />
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Project Manager</label>
                <div className="relative">
                    <div onClick={() => setEditDropdownOpen(prev => prev === 'pm' ? null : 'pm')}
                        className="w-full px-5 py-3.5 bg-[#F2F2F2] rounded-xl cursor-pointer flex justify-between items-center text-[#1E293B] font-medium hover:bg-[#EAEAEA] transition-colors">
                        <span className={createProjectManager ? "text-[#1E293B]" : "text-gray-400"}>{createProjectManager || "Select Manager"}</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${editDropdownOpen === 'pm' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    {editDropdownOpen === 'pm' && (
                        <div className="absolute z-[200] left-0 right-0 mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {projectManagers.map((m, i) => (
                                <div key={i} onClick={() => { setCreateProjectManager(m.full_name || ""); setEditDropdownOpen(null); }}
                                    className="px-4 py-3 hover:bg-[#F8FAFC] cursor-pointer text-sm font-bold text-[#334155] rounded-lg transition-colors hover:text-[#DD4342]">{m.full_name}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Project Start Date</label>
                <input type="date" value={createStartDate} onChange={e => setCreateStartDate(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/20 text-[#1E293B] font-medium transition-all" />
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Project End Date</label>
                <input type="date" value={createEndDate} onChange={e => setCreateEndDate(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/20 text-[#1E293B] font-medium transition-all" />
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Total Hours</label>
                <input type="text" value={createTotalHours} onChange={e => setCreateTotalHours(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/20 text-[#1E293B] font-medium transition-all" placeholder="0" />
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Per Day Hours</label>
                <input type="text" value={createPerDay} onChange={e => setCreatePerDay(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/20 text-[#1E293B] font-medium transition-all" placeholder="0" />
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">BIM Lead</label>
                <div className="relative">
                    <div onClick={() => setEditDropdownOpen(prev => prev === 'lead' ? null : 'lead')}
                        className="w-full px-5 py-3.5 bg-[#F2F2F2] rounded-xl cursor-pointer flex justify-between items-center text-[#1E293B] font-medium hover:bg-[#EAEAEA] transition-colors">
                        <span className={createBIMLead ? "text-[#1E293B]" : "text-gray-400"}>{createBIMLead || "Select BIM Lead"}</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${editDropdownOpen === 'lead' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    {editDropdownOpen === 'lead' && (
                        <div className="absolute z-[200] left-0 right-0 mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {bimLeads.map((m, i) => (
                                <div key={i} onClick={() => { setCreateBIMLead(m.full_name || ""); setEditDropdownOpen(null); }}
                                    className="px-4 py-3 hover:bg-[#F8FAFC] cursor-pointer text-sm font-bold text-[#334155] rounded-lg transition-colors hover:text-[#DD4342]">{m.full_name}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">BIM Coordinator</label>
                <div className="relative">
                    <div onClick={() => setEditDropdownOpen(prev => prev === 'coord' ? null : 'coord')}
                        className="w-full px-5 py-3.5 bg-[#F2F2F2] rounded-xl cursor-pointer flex justify-between items-center text-[#1E293B] font-medium hover:bg-[#EAEAEA] transition-colors">
                        <span className={createBIMCoOrdinator ? "text-[#1E293B]" : "text-gray-400"}>{createBIMCoOrdinator || "Select Coordinator"}</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${editDropdownOpen === 'coord' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    {editDropdownOpen === 'coord' && (
                        <div className="absolute z-[200] left-0 right-0 mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {bimCoordinators.map((m, i) => (
                                <div key={i} onClick={() => { setCreateBIMCoOrdinator(m.full_name || ""); setEditDropdownOpen(null); }}
                                    className="px-4 py-3 hover:bg-[#F8FAFC] cursor-pointer text-sm font-bold text-[#334155] rounded-lg transition-colors hover:text-[#DD4342]">{m.full_name}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Resources</label>
                <input type="text" value={createResources} onChange={e => setCreateResources(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/20 text-[#1E293B] font-medium transition-all" placeholder="0" />
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Required Resources</label>
                <input type="text" value={createRequiredResources} onChange={e => setCreateRequiredResources(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/20 text-[#1E293B] font-medium transition-all" placeholder="0" />
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Priority</label>
                <div className="relative">
                    <div onClick={() => setEditDropdownOpen(prev => prev === 'priority' ? null : 'priority')}
                        className="w-full px-5 py-3.5 bg-[#F2F2F2] rounded-xl cursor-pointer flex justify-between items-center text-[#1E293B] font-medium hover:bg-[#EAEAEA] transition-colors">
                        <span className={createPriority ? "text-[#1E293B]" : "text-gray-400"}>{createPriority || "Select Priority"}</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${editDropdownOpen === 'priority' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    {editDropdownOpen === 'priority' && (
                        <div className="absolute z-[200] left-0 right-0 mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {["Low", "Medium", "High", "Urgent"].map((opt, i) => (
                                <div key={i} onClick={() => { setCreatePriority(opt); setEditDropdownOpen(null); }}
                                    className="px-4 py-3 hover:bg-[#F8FAFC] cursor-pointer text-sm font-bold text-[#334155] rounded-lg transition-colors hover:text-[#DD4342]">{opt}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Location</label>
                <input type="text" value={createLocation} onChange={e => setCreateLocation(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/20 text-[#1E293B] font-medium transition-all" placeholder="Enter Location" />
            </div>

            <div className="md:col-span-2">
                {renderMemberSelector()}
            </div>

            <div className="md:col-span-2 space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Project Description</label>
                <textarea value={createDescription} onChange={e => setCreateDescription(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/20 text-[#1E293B] font-medium transition-all resize-none h-32" placeholder="Tell us about the project..." />
            </div>


            <div className="md:col-span-2 space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Attach File</label>
                <div className="relative group">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
                    />
                    {!createFile ? (
                        <label
                            htmlFor="file-upload"
                            className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-[#F8FAFC] border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-[#DD4342]/40 group"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FiUploadCloud className="w-8 h-8 mb-3 text-slate-400 group-hover:text-[#DD4342] transition-colors" />
                                <p className="mb-1 text-sm text-slate-500 group-hover:text-slate-600">
                                    <span className="font-bold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-slate-400">PDF, DOCX, ZIP or Images (Max 10MB)</p>
                            </div>
                        </label>
                    ) : (
                        <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#DD4342]/20 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <FiPaperclip className="w-5 h-5 text-[#DD4342]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-[#1E293B] truncate max-w-[200px] md:max-w-md">
                                        {createFile.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {(createFile.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateFile(null)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Remove file"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
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
        <div className="bg-white min-h-screen font-gantari">
            <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
                {successMsg && (
                    <div className="fixed top-5 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl bg-[#1A8A47] text-white font-gantari text-sm font-medium animate-in slide-in-from-right duration-300">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Project View (In-Page) */}
                {showEditModal ? (
                    <div className="flex flex-col h-full bg-white">
                        <div className="flex items-center gap-4 md:gap-6 px-6 py-6 md:px-10 md:py-8 border-b border-slate-50">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditDropdownOpen(null);
                                    // Reset all form fields
                                    setCreateName(""); setCreateBudget(""); setCreateModuleName(""); setCreateClientName("");
                                    setCreateProjectManager(""); setCreateStartDate(""); setCreateEndDate("");
                                    setCreateTotalHours(""); setCreatePerDay(""); setCreateBIMLead("");
                                    setCreateBIMCoOrdinator(""); setCreateResources(""); setCreateRequiredResources("");
                                    setCreatePriority(""); setCreateLocation(""); setCreateDescription("");
                                    setCreateDeliverables(""); setSelectedMemberIds([]); setCreateFile(null);
                                }}
                                className="p-3 rounded-xl bg-[#F2F2F2] text-[#000000] hover:bg-gray-200 transition-colors"
                                title="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <div className="min-w-0">
                                <h3 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#1A1A1A] truncate">
                                    Edit Project Details
                                </h3>
                                <p className="text-[14px] font-Gantari font-semibold text-[#999999]">Update your project information</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-6 md:pt-8 custom-scrollbar">
                            <form onSubmit={handleEdit} className="max-w-4xl mx-auto space-y-10">
                                {renderFormFields()}
                                <div className="flex justify-center gap-6 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setEditDropdownOpen(null);
                                        }}
                                        className="px-12 py-3.5 rounded-xl bg-[#F1F1F1] text-[#666666] font-bold text-[16px] transition-all hover:bg-gray-200"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editSubmitting}
                                        className="px-12 py-3.5 rounded-xl bg-[#DD4342] text-white font-bold text-[16px] transition-all hover:opacity-90 shadow-lg shadow-red-100 disabled:opacity-50"
                                    >
                                        {editSubmitting ? "Updating..." : "Update Project"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : showProjectView && selectedProject ? (
                    <div className="flex flex-col h-full bg-white">
                        <div className="flex items-center gap-4 md:gap-6 px-6 py-6 md:px-10 md:py-8 border-b border-slate-50">
                            <button type="button" onClick={() => setShowProjectView(false)}
                                className="p-3 rounded-xl bg-[#F2F2F2] text-[#000000] transition-colors hover:bg-[#EAEAEA]">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <div className="min-w-0">
                                <h3 className="text-[20px] md:text-[24px] font-semibold text-[#1A1A1A] truncate">
                                    {selectedProject.project_name ?? "Untitled Project"}
                                </h3>
                                <p className="text-[14px] font-semibold text-[#999999]">Overall Progress Tracker</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-6 md:pt-8 custom-scrollbar space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-8">
                                {[
                                    { label: "To Do Tasks", value: taskStats.todo },
                                    { label: "In Progress", value: taskStats.inProgress },
                                    { label: "Paused", value: taskStats.paused },
                                    { label: "Completed", value: taskStats.completed },
                                ].map((stat, i) => (
                                    <div key={i} className="text-left bg-[#F4F5F7] p-6 rounded-[1rem] shadow-sm flex flex-col h-[100px] md:h-[140px] hover:bg-[#DD4342] transition-all group">
                                        <p className="text-[#353535] group-hover:text-white text-[18px] md:text-[20px] font-semibold">{stat.label}</p>
                                        <p className="text-[#353535] group-hover:text-white text-[28px] md:text-[36px] font-bold leading-none mt-auto self-center">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="border border-slate-200 rounded-[10px] p-6 md:p-8">
                                <h4 className="text-[18px] md:text-[22px] font-bold text-[#000000] mb-4">Project Details</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Priority</span><span className="text-[#1A1A1A] font-bold">{selectedProject.priority || "—"}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Budget</span><span className="text-[#1A1A1A] font-bold">{selectedProject.budget || "—"}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Start Date</span><span className="text-[#1A1A1A] font-bold">{formatDate(selectedProject.start_date)}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Due Date</span><span className="text-[#1A1A1A] font-bold">{formatDate(selectedProject.due_date)}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Location</span><span className="text-[#1A1A1A] font-bold">{selectedProject.location || "—"}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Total Hours</span><span className="text-[#1A1A1A] font-bold">{selectedProject.totalhours || "—"}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Per Day</span><span className="text-[#1A1A1A] font-bold">{selectedProject.perday || "—"}</span></div>
                                    <div><span className="text-[#999999] block text-xs font-semibold mb-1">Deliverables</span><span className="text-[#1A1A1A] font-bold">{selectedProject.deliverables || "—"}</span></div>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-[10px] p-6 md:p-8">
                                <h4 className="text-[18px] md:text-[22px] font-bold text-[#000000]">Project Description</h4>
                                <p className="text-[16px] font-medium text-[#666666] mt-4 leading-relaxed">
                                    {selectedProject.description ?? "No description available"}
                                </p>
                            </div>

                            <div className="border border-slate-200 rounded-[10px] p-6 md:p-8">
                                <h4 className="text-[18px] md:text-[22px] font-bold text-[#000000] mb-6">Team Overview</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {(selectedProject.members || "").split(",").filter(Boolean).map(id => {
                                        const emp = allEmployees.find(e => e.id === Number(id));
                                        return emp ? (
                                            <div key={id} className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                                    {(emp.full_name || "?")[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#1E293B]">{emp.full_name}</p>
                                                    <p className="text-xs text-[#999]">{emp.user_role || "Member"}</p>
                                                </div>
                                            </div>
                                        ) : null;
                                    })}
                                    {!(selectedProject.members || "").split(",").filter(Boolean).length && (
                                        <p className="col-span-full text-[#999] text-sm">No team members assigned</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : showMilestones && milestonesProject ? (
                    <div className="flex flex-col h-full bg-white">
                        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50">
                            <div className="flex items-center gap-6">
                                <button type="button" onClick={() => setShowMilestones(false)} className="p-3.5 rounded-xl bg-[#F8F9FA] hover:bg-gray-100 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <div>
                                    <h3 className="text-[26px] font-bold">Payment Milestones</h3>
                                    <p className="text-[16px] font-bold text-[#999999]">{milestonesProject.project_name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50/30">
                            <h4 className="text-[22px] font-bold text-[#353535] mb-2">No Payment Milestones Found</h4>
                            <p className="text-[15px] font-bold text-[#999999] mb-10">Add your first payment to get started with payment tracking</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 px-4">
                            <h2 className="text-[24px] font-semibold text-[#000000]">Projects</h2>
                            <button onClick={() => { setShowCreateModal(true); setSelectedMemberIds([]); }}
                                className="flex items-center justify-center gap-2 bg-[#DD4342] text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm text-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                Create Project
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pt-4 pb-10 px-4 space-y-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {list.length === 0 ? (
                                    <div className="col-span-full bg-[#F8FAFC] rounded-2xl border-2 border-dashed border-slate-200 p-20 text-center">
                                        <p className="text-slate-500 font-medium mb-4">No projects found. Create your first project to get started.</p>
                                        <button onClick={() => setShowCreateModal(true)} className="text-[#DD4342] font-bold hover:underline">New Project</button>
                                    </div>
                                ) : (
                                    list.map(p => {
                                        const progress = Math.round(Number(p.progress) || 0);
                                        const memberIds = p.members ? p.members.split(",").filter(Boolean).map(Number) : [];
                                        const rad = 28;
                                        const circ = 2 * Math.PI * rad;
                                        return (
                                            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group">
                                                <div>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <h3 className="text-[20px] font-semibold text-[#353535] leading-tight flex-1 pr-2">{p.project_name ?? "Untitled"}</h3>
                                                        <div className="relative">
                                                            <button type="button" onClick={() => setOpenMenuProjectId(prev => prev === p.id ? null : p.id)} className="p-1 rounded-full hover:bg-slate-50 transition-colors">
                                                                <img src={Dot} alt="" className="w-6 h-6" />
                                                            </button>
                                                            {openMenuProjectId === p.id && (
                                                                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200 origin-top-right">
                                                                    <button onClick={() => { setOpenMenuProjectId(null); setSelectedProject(p); setShowProjectView(true); }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-[#6B6B6B] hover:text-[#DD4342] font-semibold text-sm transition-colors"><VscEye /> View Details</button>
                                                                    <button onClick={() => { setOpenMenuProjectId(null); openEdit(p); }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-[#6B6B6B] hover:text-[#DD4342] font-semibold text-sm transition-colors"><BiEdit /> Edit</button>
                                                                    <button onClick={() => { setOpenMenuProjectId(null); setMilestonesProject(p); setShowMilestones(true); }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-[#6B6B6B] hover:text-[#DD4342] font-semibold text-sm transition-colors"><FaCircleDollarToSlot /> Milestones</button>
                                                                    <button onClick={() => { setOpenMenuProjectId(null); setDeleteId(p.id); }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-[#6B6B6B] hover:text-red-500 font-semibold text-sm transition-colors"><RiDeleteBin5Fill /> Delete</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6 mt-4 mb-8">
                                                        <div className="relative flex items-center justify-center w-20 h-20">
                                                            <svg className="w-full h-full transform -rotate-90">
                                                                <circle cx="40" cy="40" r={rad} stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                                                                <circle cx="40" cy="40" r={rad} stroke="#0a9344" strokeWidth="6" fill="transparent"
                                                                    strokeDasharray={circ} strokeDashoffset={circ - (progress / 100) * circ} strokeLinecap="round" className="transition-all duration-1000" />
                                                            </svg>
                                                            <span className="absolute font-bold text-sm">{progress}%</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between mb-2">
                                                                <span className="text-[13px] font-bold text-[#8B8B8B]">Progress</span>
                                                                <span className="text-[13px] font-bold text-[#353535]">{progress}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
                                                                <div className="h-full bg-[#0a9344] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="border-t border-slate-50 pt-5 mt-auto flex items-center justify-between">
                                                    <div className="flex -space-x-3">
                                                        {memberIds.slice(0, 3).map(id => (
                                                            <div key={id} className="w-9 h-9 rounded-full border-2 border-white bg-[#DD4342] text-white flex items-center justify-center text-[11px] font-bold shadow-sm" title={getEmployeeName(id)}>
                                                                {(getEmployeeName(id) || "?")[0]}
                                                            </div>
                                                        ))}
                                                        {memberIds.length > 3 && (
                                                            <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                                                                +{memberIds.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {p.priority && (
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.priority === "High" || p.priority === "Urgent" ? "bg-red-50 text-red-600 border border-red-100" : p.priority === "Medium" ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-green-50 text-green-600 border border-green-100"}`}>
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
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="relative flex items-center justify-center px-10 py-8 border-b border-slate-50">
                            <button type="button" onClick={() => setShowCreateModal(false)}
                                className="absolute left-10 p-3 rounded-xl bg-[#F2F2F2] text-gray-800 hover:bg-gray-200 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <h3 className="text-2xl font-bold text-[#1A1A1A]">Add New Project</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
                            <form onSubmit={handleCreate} className="space-y-10">
                                {renderFormFields()}
                                <div className="flex justify-center gap-6 pt-6 pb-4">
                                    <button type="button" onClick={() => setShowCreateModal(false)}
                                        className="px-12 py-4 rounded-xl bg-[#F1F1F1] text-[#666666] font-bold hover:bg-gray-200 transition-colors">Discard</button>
                                    <button type="submit" disabled={createSubmitting}
                                        className="px-12 py-4 rounded-xl bg-[#DD4342] text-white font-bold hover:opacity-90 shadow-lg shadow-red-100 transition-all disabled:opacity-50">
                                        {createSubmitting ? "Creating..." : "Submit"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}


            {/* Delete Modal */}
            {deleteId !== null && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                            <RiDeleteBin5Fill size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-[#1E293B] mb-2 font-gantari">Delete Project</h3>
                        <p className="text-slate-500 mb-8 font-gantari">Are you sure you want to delete this project? This action cannot be undone.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-[#F2F2F2] font-bold text-slate-600 transition-colors hover:bg-slate-200">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold transition-all hover:bg-red-600 shadow-lg shadow-red-100">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
