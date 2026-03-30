import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import ProfileIcon from "../../assets/ProductNavbarIcons/Profile.svg";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
import { FiUploadCloud, FiPaperclip } from "react-icons/fi";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import paymentMilestoneIcon from "../../assets/ProjectManager/project/paymentMilestone.svg";
import threedot from "../../assets/ProjectManager/project/threedot.svg";




interface Project {
    id: number;
    project_name?: string;
    progress?: string;
    total_tasks?: number;
    completed_tasks?: number;
    budget?: string;
    modules?: string;
    client_id?: string;
    client_name?: string;
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
    proposal_id?: number;
    opportunity_id?: number;
    deliverables?: string;
}

interface Employee {
    id: number;
    full_name?: string;
    user_role?: string;
    profile_picture?: string;
    email?: string;
}

export default function ProjectsV() {
    const [list, setList] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenuProjectId, setOpenMenuProjectId] = useState<number | null>(null);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [clientsList, setClientsList] = useState<Array<{ id: number; fullName?: string; full_name?: string }>>([]);

    const handleDelete = () => {
        if (deleteId === null) return;
        api.delete(`/api/vendors/vendor-projects/${deleteId}`)
            .then(({ data }) => {
                if (data.success) {
                    setDeleteId(null);
                    setSuccessMsg("Project deleted!");
                    setTimeout(() => setSuccessMsg(null), 3000);
                    fetchProjects();
                }
            })
            .catch(() => {
                setDeleteId(null);
            });
    };

    // View Project
    const [showProjectView, setShowProjectView] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [taskStats, setTaskStats] = useState({ todo: 0, inProgress: 0, paused: 0, completed: 0 });

    // Create/Edit Project Fields (Matching ProjectsTD)
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

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

    // Lists for dropdowns
    const [projectManagers, setProjectManagers] = useState<Employee[]>([]);
    const [bimLeads, setBimLeads] = useState<Employee[]>([]);
    const [bimCoordinators, setBimCoordinators] = useState<Employee[]>([]);
    const [vendorResourceProfiles, setVendorResourceProfiles] = useState<Employee[]>([]);

    // Milestones view
    const [showMilestones, setShowMilestones] = useState(false);
    const [milestonesProject, setMilestonesProject] = useState<Project | null>(null);

    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [searchParams] = useSearchParams();
    const statusFilter = searchParams.get("status");

    const fetchProjects = (status?: string | null) => {
        const params: any = {};
        if (status) params.status = status;

        api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects", { params })
            .then(({ data }) => setList(data.projects ?? []))
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchProjects(statusFilter);

        // Fetch all employees once (used for team member selection, etc.)
        api.get<{ employees?: Employee[] }>("/api/employees")
            .then(({ data }) => {
                const allEmp = data.employees ?? [];
                setAllEmployees(allEmp);

                // BIM Coordinators still come from the generic employee list
                setBimCoordinators(
                    allEmp.filter((e) =>
                        ["BIM Coordinator", "FrontEnd Developer"].includes(e.user_role || "")
                    )
                );
            })
            .catch(() => {
                setAllEmployees([]);
                setBimCoordinators([]);
            });

        // Vendor-side Project Managers (role = "Vendor PM" in vendor_employee)
        api.get<{ success: boolean; employees?: Employee[] }>("/api/vendors/vendor-by-role?role=Vendor PM")
            .then(({ data }) => {
                setProjectManagers(data.employees ?? []);
            })
            .catch(() => {
                setProjectManagers([]);
            });

        // Vendor-side BIM Leads (role = "Vendor Bim Lead" in vendor_employee)
        api.get<{ success: boolean; employees?: Employee[] }>("/api/vendors/vendor-by-role?role=Vendor Bim Lead")
            .then(({ data }) => {
                setBimLeads(data.employees ?? []);
            })
            .catch(() => {
                setBimLeads([]);
            });

        // Fetch clients
        api.get<{ clients?: any[] }>("/api/clients")
            .then(({ data }) => setClientsList(data.clients ?? []))
            .catch(() => setClientsList([]));

        // Fetch vendor resource profiles for Team Members dropdown
        api.get<{ success: boolean; resources?: Employee[] }>("/api/vendors/vendor-resource-profiles")
            .then(({ data }) => {
                setVendorResourceProfiles(data.resources ?? []);
            })
            .catch(() => {
                setVendorResourceProfiles([]);
            });

    }, []);

    // Auto-fetch client budget whenever a valid client is selected/typed
    useEffect(() => {
        if (!createClientName || clientsList.length === 0) return;
        const client = clientsList.find(
            (c) => (c.fullName || c.full_name) === createClientName
        );
        if (!client) return;

        api.get<{ client_budget: number | null }>(
            `/api/vendors/client-budget?client_id=${client.id}`
        )
            .then(({ data }) => {
                if (
                    data.client_budget !== null &&
                    data.client_budget !== undefined
                ) {
                    setCreateBudget(String(data.client_budget));
                }
            })
            .catch(() => {
                // keep previous budget on error
            });
    }, [createClientName, clientsList]);

    const getEmployeeName = (id: string | number | undefined): string => {
        if (!id) return "";
        // First check vendor resource profiles, then fall back to all employees
        const resource = vendorResourceProfiles.find(r => r.id === Number(id));
        if (resource) return resource.full_name || "";
        const emp = allEmployees.find(e => e.id === Number(id));
        return emp?.full_name || "";
    };

    const getMemberForAvatar = (id: number): Employee | undefined =>
        vendorResourceProfiles.find((r) => r.id === id) || allEmployees.find((e) => e.id === id);

    const formatDate = (d: string | undefined) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    };

    // Convert stored HTML description to plain text for editing
    const htmlToPlainText = (html: string | undefined | null): string => {
        if (!html) return "";
        if (typeof window === "undefined" || typeof document === "undefined") {
            // Fallback for non-DOM environments
            return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
        }
        const div = document.createElement("div");
        div.innerHTML = html;
        return (div.textContent || div.innerText || "").trim();
    };

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

    const [createError, setCreateError] = useState("");
    const [editError, setEditError] = useState("");

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (
            !createName.trim() ||
            !createClientName ||
            !createStartDate ||
            !createEndDate ||
            !createPerDay ||
            !createTotalHours ||
            !createPriority ||
            !createLocation
        ) {
            setCreateError("Please fill all required fields.");
            return;
        }
        setCreateError("");
        setCreateSubmitting(true);
        api.post("/api/vendors/vendor-projects", {
            project_name: createName,
            budget: createBudget,
            modules: createModuleName,
            client_id: getClientIdByName(createClientName), // send numeric client id expected by backend
            project_manager_id: nameToId(createProjectManager, projectManagers),
            lead_id: nameToId(createBIMLead, bimLeads),
            bim_coordinator_id: nameToId(createBIMCoOrdinator, bimCoordinators),
            start_date: createStartDate,
            due_date: createEndDate,
            totalhours: createTotalHours,
            perday: createPerDay,
            members: selectedMemberIds.join(","),
            // Backend column names are no_resource / no_resources_required
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
                    // Reset fields
                    setCreateName(""); setCreateBudget(""); setCreateModuleName(""); setCreateClientName("");
                    setCreateProjectManager(""); setCreateStartDate(""); setCreateEndDate("");
                    setCreateTotalHours(""); setCreatePerDay(""); setCreateBIMLead("");
                    setCreateBIMCoOrdinator(""); setSelectedMemberIds([]); setCreateResources("");
                    setCreateRequiredResources(""); setCreatePriority(""); setCreateLocation("");
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
        // Prefer budget_ceiling (final agreed budget) when editing; fall back to budget
        setCreateBudget(p.budget_ceiling || p.budget || "");
        setCreateModuleName(p.modules || "");
        // Prefer hydrated client_name from backend; otherwise resolve via id
        setCreateClientName(
            p.client_name ||
            getClientNameById(p.client_id) ||
            (p.client_id ? String(p.client_id) : "")
        );
        // Resolve Project Manager from projectManagers array (vendor PMs from vendor-by-role API)
        // Fall back to allEmployees if not found in projectManagers
        setCreateProjectManager(
            idToName(p.project_manager_id, projectManagers) ||
            idToName(p.project_manager_id, allEmployees) ||
            ""
        );
        setCreateStartDate(p.start_date ? p.start_date.split("T")[0] : "");
        setCreateEndDate(p.due_date || "");
        setCreateTotalHours(p.totalhours || "");
        setCreatePerDay(p.perday || "");
        // Resolve BIM Lead from bimLeads array (vendor BIM Leads from vendor-by-role API)
        // Fall back to allEmployees if not found in bimLeads
        setCreateBIMLead(
            idToName(p.lead_id, bimLeads) ||
            idToName(p.lead_id, allEmployees) ||
            ""
        );
        setCreateBIMCoOrdinator(idToName(p.bim_coordinator_id, allEmployees));
        setCreateResources(p.no_resource || "");
        setCreateRequiredResources(p.no_resources_required || "");
        setCreatePriority(p.priority || "");
        setCreateLocation(p.location || "");
        // Strip HTML tags / entities so the textarea shows clean text
        setCreateDescription(htmlToPlainText(p.description));
        setCreateDeliverables(p.deliverables || "");

        setSelectedMemberIds(p.members ? p.members.split(",").filter(Boolean).map(Number) : []);
        setShowEditModal(true);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId) return;
        if (
            !createName.trim() ||
            !createClientName ||
            !createStartDate ||
            !createEndDate ||
            !createPerDay ||
            !createTotalHours ||
            !createPriority ||
            !createLocation
        ) {
            setEditError("Please fill all required fields.");
            return;
        }
        setEditError("");
        setEditSubmitting(true);
        api.patch(`/api/vendors/vendor-projects/${editId}`, {
            project_name: createName,
            budget: createBudget,
            modules: createModuleName,
            client_id: getClientIdByName(createClientName),
            project_manager_id: nameToId(createProjectManager, projectManagers),
            lead_id: nameToId(createBIMLead, bimLeads),
            bim_coordinator_id: nameToId(createBIMCoOrdinator, bimCoordinators),
            start_date: createStartDate,
            due_date: createEndDate,
            totalhours: createTotalHours,
            perday: createPerDay,
            members: selectedMemberIds.join(","),
            // Backend column names are no_resource / no_resources_required
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

    // When editing, once clients list is loaded, resolve numeric client_id to human-readable name
    useEffect(() => {
        if (!showEditModal || !editId || clientsList.length === 0) return;
        // If current value still looks like an ID (e.g. "62"), replace it with the actual client name
        const trimmed = createClientName.trim();
        const looksLikeId = trimmed !== "" && /^[0-9]+$/.test(trimmed);
        if (createClientName === "" || looksLikeId) {
            const project = list.find((p) => p.id === editId);
            if (!project) return;
            const resolved =
                project.client_name ||
                getClientNameById(project.client_id ?? trimmed);
            if (resolved && resolved !== createClientName) {
                setCreateClientName(resolved);
            }
        }
    }, [showEditModal, editId, clientsList, list, createClientName]);


    const toggleMember = (id: number) => {
        setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Fetch task stats for selected project when viewing it
    useEffect(() => {
        if (!showProjectView || !selectedProject?.id) {
            setTaskStats({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
            return;
        }
        api.get<{
            success: boolean;
            status_counts?: { todo?: number; inprogress?: number; paused?: number; completed?: number };
        }>(`/api/vendors/vendor-projects/${selectedProject.id}/task-stats`)
            .then(({ data }) => {
                if (!data.success || !data.status_counts) {
                    setTaskStats({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
                    return;
                }
                setTaskStats({
                    todo: data.status_counts.todo ?? 0,
                    inProgress: data.status_counts.inprogress ?? 0,
                    paused: data.status_counts.paused ?? 0,
                    completed: data.status_counts.completed ?? 0,
                });
            })
            .catch(() => {
                setTaskStats({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
            });
    }, [showProjectView, selectedProject?.id]);

    const renderMemberSelector = () => (
        <div className="space-y-2">
            <label className="block text-[15px] font-bold text-[#353535]">Team Members</label>
            <div className="relative dropdown-container">
                <button
                    type="button"
                    onClick={() => setEditDropdownOpen(o => o === "members" ? null : "members")}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-left cursor-pointer"
                >
                    <div className="flex flex-wrap gap-2 pr-4">
                        {selectedMemberIds.length > 0 ? (
                            selectedMemberIds.map(id => {
                                const resource = vendorResourceProfiles.find(r => r.id === id);
                                return (
                                    <span key={id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#DD4342]/20 text-[#DD4342] text-xs font-bold rounded-lg shadow-sm">
                                        {resource?.full_name || `ID: ${id}`}
                                        <div onClick={(e) => { e.stopPropagation(); toggleMember(id); }} className="hover:text-red-600 cursor-pointer">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-gray-400">Select Team Members</span>
                        )}
                    </div>
                    <svg
                        className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "members" ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {editDropdownOpen === "members" && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-56 overflow-y-auto custom-scrollbar">
                        {vendorResourceProfiles.length === 0 ? (
                            <div className="px-5 py-3 text-sm text-gray-500 text-center">No team members available</div>
                        ) : (
                            <>
                                {vendorResourceProfiles.map(resource => {
                                    const isSelected = selectedMemberIds.includes(resource.id);
                                    return (
                                        <button
                                            key={resource.id}
                                            type="button"
                                            onClick={() => toggleMember(resource.id)}
                                            className={`flex items-center justify-between w-full px-5 py-2.5 text-sm hover:bg-[#F4F5F7] transition-colors ${isSelected ? "bg-[#FFF1F1] text-[#DD4342]" : "text-gray-700"}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? "bg-[#DD4342] text-white" : "bg-slate-200 text-slate-500"}`}>
                                                    {(resource.full_name || "?")[0]}
                                                </div>
                                                <span className="font-semibold">{resource.full_name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? "bg-[#DD4342] border-[#DD4342]" : "bg-white border-gray-300"}`}>
                                                    {isSelected && (
                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                                <div className="border-t border-slate-200 mt-1 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setEditDropdownOpen(null)}
                                        className="w-full px-5 py-2.5 text-sm font-semibold text-[#DD4342] hover:bg-[#FFF1F1] transition-colors"
                                    >
                                        Done ({selectedMemberIds.length} selected)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const renderFormFields = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {/* Row 1: Project name, Client name */}
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">
                        Project Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                        type="text"
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700 placeholder-gray-400"
                        placeholder="Enter Project name"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">
                        Client Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                        type="text"
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700 placeholder-gray-400"
                        placeholder="Enter Client Name"
                        value={createClientName}
                        onChange={(e) => setCreateClientName(e.target.value)}
                    />
                </div>

                {/* Row 2: Client Budget (read-only), Outsourcing Budget */}
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">
                        Budget
                    </label>
                    <input
                        type="text"
                        readOnly
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] font-medium text-gray-500 cursor-not-allowed"
                        placeholder="Auto-fetched from contract"
                        value={createBudget}
                    />
                </div>

                {/* Row 3: Bidding End Date, Project Manager */}
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">
                        Select Project Manager <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="relative dropdown-container">
                        <button
                            type="button"
                            onClick={() =>
                                setEditDropdownOpen((o) => (o === "pm" ? null : "pm"))
                            }
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-left cursor-pointer"
                        >
                            <span className={createProjectManager ? "text-gray-700" : "text-gray-400"}>
                                {createProjectManager || "Select Project Manager"}
                            </span>
                            <svg
                                className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "pm" ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {editDropdownOpen === "pm" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreateProjectManager("");
                                        setEditDropdownOpen(null);
                                    }}
                                    className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F4F5F7]"
                                >
                                    Select Project Manager
                                </button>
                                {projectManagers.map((pm) => (
                                    <button
                                        key={pm.id}
                                        type="button"
                                        onClick={() => {
                                            setCreateProjectManager(pm.full_name || "");
                                            setEditDropdownOpen(null);
                                        }}
                                        className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F4F5F7] ${createProjectManager === pm.full_name
                                            ? "bg-[#E2EEFF] text-[#1D7AFC]"
                                            : "text-gray-700"
                                            }`}
                                    >
                                        {pm.full_name || `Employee ${pm.id}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 4: BIM Lead, BIM Coordinator */}
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">
                        Select BIM Lead <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="relative dropdown-container">
                        <button
                            type="button"
                            onClick={() =>
                                setEditDropdownOpen((o) => (o === "bimLead" ? null : "bimLead"))
                            }
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-left cursor-pointer"
                        >
                            <span className={createBIMLead ? "text-gray-700" : "text-gray-400"}>
                                {createBIMLead || "Select BIM Lead"}
                            </span>
                            <svg
                                className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "bimLead" ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {editDropdownOpen === "bimLead" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreateBIMLead("");
                                        setEditDropdownOpen(null);
                                    }}
                                    className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F4F5F7]"
                                >
                                    Select BIM Lead
                                </button>
                                {bimLeads.map((lead) => (
                                    <button
                                        key={lead.id}
                                        type="button"
                                        onClick={() => {
                                            setCreateBIMLead(lead.full_name || "");
                                            setEditDropdownOpen(null);
                                        }}
                                        className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F4F5F7] ${createBIMLead === lead.full_name
                                            ? "bg-[#E2EEFF] text-[#1D7AFC]"
                                            : "text-gray-700"
                                            }`}
                                    >
                                        {lead.full_name || `Employee ${lead.id}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {/* <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">
                        Select BIM Coordinator
                    </label>
                    <div className="relative dropdown-container">
                        <button
                            type="button"
                            onClick={() =>
                                setEditDropdownOpen((o) => (o === "bimCoord" ? null : "bimCoord"))
                            }
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-left cursor-pointer"
                        >
                            <span className={createBIMCoOrdinator ? "text-gray-700" : "text-gray-400"}>
                                {createBIMCoOrdinator || "Select BIM Coordinator"}
                            </span>
                            <svg
                                className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "bimCoord" ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {editDropdownOpen === "bimCoord" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreateBIMCoOrdinator("");
                                        setEditDropdownOpen(null);
                                    }}
                                    className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F4F5F7]"
                                >
                                    Select BIM Coordinator
                                </button>
                                {bimCoordinators.map((coord) => (
                                    <button
                                        key={coord.id}
                                        type="button"
                                        onClick={() => {
                                            setCreateBIMCoOrdinator(coord.full_name || "");
                                            setEditDropdownOpen(null);
                                        }}
                                        className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F4F5F7] ${createBIMCoOrdinator === coord.full_name
                                            ? "bg-[#E2EEFF] text-[#1D7AFC]"
                                            : "text-gray-700"
                                            }`}
                                    >
                                        {coord.full_name || `Employee ${coord.id}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div> */}

                {/* Row 5: Start Date, End Date */}
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">Project Start Date <span className="text-[#DD4342]">*</span></label>
                    <input type="date" value={createStartDate} onChange={e => setCreateStartDate(e.target.value)}
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" />
                </div>
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">Project End Date <span className="text-[#DD4342]">*</span></label>
                    <input type="date" value={createEndDate} onChange={e => setCreateEndDate(e.target.value)}
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" />
                </div>

                {/* Row 6: Total Hours, Per Day */}
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">Per Day <span className="text-[#DD4342]">*</span></label>
                    <input type="text" value={createPerDay} onChange={e => setCreatePerDay(e.target.value)}
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" placeholder="Hours Per Day" />
                </div>
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">Total Hours <span className="text-[#DD4342]">*</span></label>
                    <input type="text" value={createTotalHours} onChange={e => setCreateTotalHours(e.target.value)}
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" placeholder="Total Estimated Hours" />
                </div>

                {/* Row 7: Resources, Required Resources */}
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">Resources <span className="text-[#DD4342]">*</span></label>
                    <input type="text" value={createResources} onChange={e => setCreateResources(e.target.value)}
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" placeholder="Number of Resources" />
                </div>
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">Required Resources <span className="text-[#DD4342]">*</span></label>
                    <input type="text" value={createRequiredResources} onChange={e => setCreateRequiredResources(e.target.value)}
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" placeholder="Required Resources Count" />
                </div>

                {/* Row 8: Priority, Location */}
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">Priority <span className="text-[#DD4342]">*</span></label>
                    <div className="relative dropdown-container">
                        <button
                            type="button"
                            onClick={() =>
                                setEditDropdownOpen((o) => (o === "priority" ? null : "priority"))
                            }
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-left cursor-pointer"
                        >
                            <span className={createPriority ? "text-gray-700" : "text-gray-400"}>
                                {createPriority || "Select Priority"}
                            </span>
                            <svg
                                className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "priority" ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {editDropdownOpen === "priority" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                                {["High", "Medium", "Low"].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => {
                                            setCreatePriority(p);
                                            setEditDropdownOpen(null);
                                        }}
                                        className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F4F5F7] ${createPriority === p
                                            ? "bg-[#E2EEFF] text-[#1D7AFC]"
                                            : "text-gray-700"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">Location <span className="text-[#DD4342]">*</span></label>
                    <input type="text" value={createLocation} onChange={e => setCreateLocation(e.target.value)}
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" placeholder="Project Location" />
                </div>


            </div>

            <div className="space-y-6 mt-6">
                {renderMemberSelector()}
                <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-[#353535]">Description <span className="text-[#DD4342]">*</span></label>
                    <textarea value={createDescription} onChange={e => setCreateDescription(e.target.value)} rows={4}
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700 resize-none" placeholder="Provide a detailed project description..." />
                </div>
            </div>
            <div className="md:col-span-2 space-y-2">
                <label className="block text-[15px] font-bold text-[#353535]">Attach File <span className="text-[#DD4342]">*</span></label>
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
        </>
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
                                className="p-2 rounded-[5px] bg-[#F2F2F2] text-[#000000] cursor-pointer"
                                title="Close"
                            >
                                <img src={backIcon} alt="Back" className="w-5 h-5" />
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
                                            setEditError("");
                                        }}
                                        className="px-12 py-3.5 rounded-xl bg-[#F1F1F1] text-[#666666] font-bold text-[16px] transition-all hover:bg-gray-200"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editSubmitting}
                                        className="px-12 py-4 rounded-xl bg-[#DD4342] text-white font-bold hover:opacity-90 shadow-lg shadow-red-100 transition-all disabled:opacity-50"
                                    >
                                        {editSubmitting ? "Updating..." : "Update Project"}
                                    </button>
                                </div>
                                {editError && (
                                    <p className="text-[#DD4342] text-sm font-bold text-center mt-4">
                                        {editError}
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>
                ) : showProjectView && selectedProject ? (
                    <div className="flex flex-col h-full bg-white">
                        <div className="flex items-center gap-4 md:gap-6 px-6 py-6 md:px-10 md:py-8 border-b border-slate-50">
                            <button type="button" onClick={() => setShowProjectView(false)}
                                className="p-2 rounded-[5px] bg-[#F2F2F2] text-[#000000] cursor-pointer" title="Close">
                                <img src={backIcon} alt="Back" className="w-5 h-5" />
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
                                    <div key={i} className="text-left bg-[#F2F2F2] p-6 rounded-lg flex flex-col h-[100px] md:h-[120px] cursor-pointer hover:bg-[#DD4342] transition-colors group border border-slate-200">
                                        <div className="flex items-center justify-left mb-2">
                                            <p className="text-[#353535] group-hover:text-white text-[18px] md:text-[20px] font-Gantari font-semibold">{stat.label}</p>
                                        </div>
                                        <p className="text-[#353535] group-hover:text-white text-[28px] md:text-[36px] font-Gantari font-bold leading-none mt-auto self-center">{stat.value}</p>
                                    </div>
                                ))}
                            </div>


                            {/* Project Details */}
                            <div className="rounded-lg border border-slate-200 p-6 md:p-8">
                                <h4 className="text-xl font-Gantari font-semibold text-[#1A1A1A] mb-6">
                                    Project Details
                                </h4>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 md:gap-y-6 lg:gap-x-20">
                                    <div className="space-y-4 md:space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                                                Priority
                                            </span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-md font-Gantari font-medium text-[#666666]">
                                                {selectedProject.priority || "—"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                                                Budget
                                            </span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-md font-Gantari font-medium text-[#666666]">
                                                {selectedProject.budget || "—"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                                                Actual Start Date
                                            </span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-md font-Gantari font-medium text-[#666666]">
                                                {formatDate(selectedProject.start_date)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                                                Location
                                            </span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-md font-Gantari font-medium text-[#666666]">
                                                {selectedProject.location || "—"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-4 md:space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                                                Actual End Date
                                            </span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-md font-Gantari font-medium text-[#666666]">
                                                {formatDate(selectedProject.due_date)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                                                Total Project Hours
                                            </span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-md font-Gantari font-medium text-[#666666]">
                                                {selectedProject.totalhours || "—"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                                                Hours/Day
                                            </span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-md font-Gantari font-medium text-[#666666]">
                                                {selectedProject.perday || "—"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                                                Modules
                                            </span>
                                            <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                                            <span className="text-md font-Gantari font-medium text-[#666666]">
                                                {selectedProject.modules || "—"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Description */}
                            <div className="border border-slate-200 rounded-xl md:rounded-xl p-6 md:p-8">
                                <h4 className="text-xl font-Gantari font-semibold text-[#000000]">Project Description</h4>
                                <p className="text-md font-Gantari font-medium text-[#666666] mt-4 leading-relaxed">
                                    {selectedProject.description ?? "No description available"}
                                </p>
                            </div>


                            {/* Team Overview */}
                            <div className="border border-slate-200 rounded-xl md:rounded-xl p-6 lg:p-4">
                                <h4 className="text-xl font-Gantari font-semibold text-[#000000] mb-8">
                                    Team Overview
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 md:gap-12 items-center">
                                    {/* Project Manager/Technical Lead */}
                                    <div className="min-w-0">
                                        <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">
                                            Team Members
                                        </p>
                                        <div className="flex items-center -space-x-3">
                                            {(() => {
                                                const memberIds = (selectedProject.members || "").split(",").filter(Boolean);
                                                const projectMembers = memberIds.map(id => {
                                                    return vendorResourceProfiles.find(r => r.id === Number(id)) || allEmployees.find(e => e.id === Number(id));
                                                }).filter(Boolean);

                                                const visibleMembers = projectMembers.slice(0, 3);
                                                const remainingCount = Math.max(0, projectMembers.length - 3);

                                                return (
                                                    <>
                                                        {visibleMembers.map((emp: any) => {
                                                            const profileUrl = emp.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture) : null;
                                                            return (
                                                                <div key={emp.id} className="relative group shrink-0">
                                                                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm relative z-0">
                                                                        {profileUrl ? (
                                                                            <img src={profileUrl} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                                                                {(emp.full_name || "M").charAt(0).toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                                                        {emp.full_name}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {remainingCount > 0 && (
                                                            <div className="relative group shrink-0">
                                                                <div className="relative z-10 w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm shrink-0">
                                                                    +{remainingCount}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {projectMembers.length === 0 && (
                                                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center shrink-0 shadow-sm relative z-0" title="Not assigned">
                                                                <span className="text-slate-600 text-xs font-bold">TM</span>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                ) : showMilestones && milestonesProject ? (
                    /* Milestones View */
                    <div className="flex flex-col h-full bg-white">
                        <div className="flex items-center justify-between px-10 py-8">
                            <div className="flex items-center gap-6">
                                <button type="button" onClick={() => setShowMilestones(false)}
                                    className="p-2 rounded-[5px] bg-[#F2F2F2] text-[#000000] cursor-pointer"
                                    title="Go back"
                                >
                                    <img src={backIcon} alt="Back" className="w-5 h-5" />
                                </button>
                                <div>
                                    <h3 className="text-[26px] font-bold">Payment Milestones</h3>
                                    <p className="text-[16px] font-bold text-[#999999]">{milestonesProject.project_name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                            <h4 className="text-[22px] font-bold text-[#353535] mb-2">No Payment Milestones Found</h4>
                            <p className="text-[15px] font-bold text-[#999999] mb-10">Add your first payment to get started with payment tracking</p>
                        </div>
                    </div>
                ) : (
                    /* Project List */
                    <>
                        <div className="flex items-center justify-between pb-6">
                            <h2 className="text-[24px] font-semibold text-[#000000]">Projects</h2>
                            {/* <button onClick={() => { setShowCreateModal(true); setSelectedMemberIds([]); }}
                                className="flex items-center gap-2 bg-[#DD4342] text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm text-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                Create Project
                            </button> */}
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
                                        const radius = 28;
                                        const circumference = 2 * Math.PI * radius;
                                        const strokeOffset = circumference - (progress / 100) * circumference;
                                        const isHighPri =
                                            (p.priority || "").toLowerCase() === "high" ||
                                            (p.priority || "").toLowerCase() === "urgent";
                                        return (
                                            <div
                                                key={p.id}
                                                className="bg-white rounded-2xl border border-slate-200 p-4 pt-1 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 min-h-[220px]"
                                            >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="relative flex items-center justify-center shrink-0 mt-3 ml-2">

                                                            <svg className="w-20 h-20 transform -rotate-90">
                                                                <circle cx="40" cy="40" r={radius} stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                                                                <circle
                                                                    cx="40"
                                                                    cy="40"
                                                                    r={radius}
                                                                    stroke="#0a9344"
                                                                    strokeWidth="6"
                                                                    fill="transparent"
                                                                    strokeDasharray={circumference}
                                                                    strokeDashoffset={strokeOffset}
                                                                    strokeLinecap="round"
                                                                    style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
                                                                />
                                                            </svg>
                                                            <span className="absolute text-[16px] font-Gantari font-bold text-[#353535]">
                                                                {progress}%
                                                            </span>
                                                        </div>
                                                        <div className="relative shrink-0 project-menu-container">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuProjectId((prev) => (prev === p.id ? null : p.id));
                                                                }}
                                                                className="p-2 rounded-full text-[#8B8B8B] transition-colors cursor-pointer"
                                                            >
                                                                <img
                                                                    src={threedot}
                                                                    alt="threeDots"
                                                                    className="w-5 h-5 text-[#8B8B8B]"
                                                                />
                                                            </button>
                                                            <div
                                                                className={`absolute right-0 mt-3 w-60 bg-white/20 backdrop-blur-md rounded-xl border border-[#595959]/50 shadow-xl transition-all origin-top-right z-50 ${openMenuProjectId === p.id ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
                                                            >
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenuProjectId(null);
                                                                        setSelectedProject(p);
                                                                        setShowProjectView(true);
                                                                    }}
                                                                    className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer bg-transparent border-none"
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
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenuProjectId(null);
                                                                        openEdit(p);
                                                                    }}
                                                                    className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer bg-transparent border-none"
                                                                >
                                                                    <img
                                                                        src={editIcon}
                                                                        alt="edit"
                                                                        className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                                                    />
                                                                    <span className="text-[16px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
                                                                        Edit
                                                                    </span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenuProjectId(null);
                                                                        setMilestonesProject(p);
                                                                        setShowMilestones(true);
                                                                    }}
                                                                    className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer bg-transparent border-none"
                                                                >
                                                                    <img
                                                                        src={paymentMilestoneIcon}
                                                                        alt="payment milestone"
                                                                        className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                                                    />
                                                                    <span className="text-[16px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
                                                                       Payment Milestones
                                                                    </span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenuProjectId(null);
                                                                        setDeleteId(p.id);
                                                                    }}
                                                                    className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer bg-transparent border-none"
                                                                >
                                                                    {/* <img
                                                                        src={deleteIcon}
                                                                        alt="delete"
                                                                        className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                                                    />
                                                                    <span className="text-[16px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
                                                                        Delete
                                                                    </span> */}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-4 ml-6 -mt-2">
                                                        <h3 className="text-[18px] md:text-[20px] font-Gantari font-semibold text-[#1A1A1A] leading-tight">
                                                            {p.project_name ?? "Untitled Project"}
                                                        </h3>
                                                    </div>


                                                <div className="flex items-center justify-between border-t border-[#E8E8E8] pt-4 mt-auto gap-3">
                                                    <div className="flex items-center min-w-0">
                                                        {memberIds.length === 0 ? (
                                                            <span className="text-[13px] text-sky-600/80 font-Gantari pl-1">No team members</span>
                                                        ) : memberIds.length === 1 ? (
                                                            <div className="flex items-center gap-3">
                                                                {(() => {
                                                                    const id = memberIds[0];
                                                                    const emp = getMemberForAvatar(id);
                                                                    const url = emp?.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture) : null;
                                                                    return (
                                                                        <>
                                                                            <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm shrink-0">
                                                                                {url ? (
                                                                                    <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-[10px] font-bold text-slate-600">
                                                                                        {(getEmployeeName(id) || "?")[0]?.toUpperCase()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-sm font-Gantari font-medium text-[#616161] truncate">
                                                                                {getEmployeeName(id) || "Unknown"}
                                                                            </span>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center -space-x-4">
                                                                {memberIds.slice(0, 3).map((id) => {
                                                                    const emp = getMemberForAvatar(id);
                                                                    const url = emp?.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture) : null;
                                                                    return (
                                                                        <div key={id} className="relative group shrink-0">
                                                                            <div className="relative z-0 w-9 h-9 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm shrink-0">
                                                                                {url ? (
                                                                                    <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-[10px] font-bold text-slate-600">
                                                                                        {(getEmployeeName(id) || "?")[0]?.toUpperCase()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                                                                {getEmployeeName(id) || "Unknown"}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {memberIds.length > 3 && (
                                                                    <div className="relative group shrink-0">
                                                                        <div className="relative z-10 w-9 h-9 rounded-full border-2 border-dashed border-[#1967D2] bg-white flex items-center justify-center text-[11px] font-bold text-[#1967D2] shrink-0">
                                                                            +{memberIds.length - 3}
                                                                        </div>
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                                                            {memberIds.length - 3} more
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {p.priority ? (
                                                        <div
                                                            className={`px-3.5 py-1 rounded-[8px] text-white text-[13px] font-bold font-Gantari shadow-sm shrink-0 ${isHighPri ? "bg-[#DD4342]" : "bg-[#94D6F2]"}`}
                                                        >
                                                            {p.priority}
                                                        </div>
                                                    ) : (
                                                        <div className="min-w-[2.75rem] h-9 flex items-center justify-center rounded-lg bg-sky-100 border border-sky-200/90 text-sky-700 text-lg font-bold font-Gantari shrink-0">
                                                            —
                                                        </div>
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
                                className="absolute left-10 p-2 rounded-[5px] bg-[#F2F2F2] text-[#000000] cursor-pointer"
                                title="Go back"
                            >
                                <img src={backIcon} alt="Back" className="w-5 h-5" />
                            </button>
                            <h3 className="text-2xl font-bold text-[#1A1A1A]">Add New Project</h3>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
                            <form onSubmit={handleCreate} className="space-y-10">
                                {renderFormFields()}

                                <div className="flex justify-center gap-6 pt-6 pb-4">
                                    <button type="button" onClick={() => { setShowCreateModal(false); setCreateError(""); }}
                                        className="px-12 py-4 rounded-xl bg-[#F1F1F1] text-[#666666] font-bold hover:bg-gray-200 transition-colors">Discard</button>
                                    <button type="submit" disabled={createSubmitting}
                                        className="px-12 py-4 rounded-xl bg-[#DD4342] text-white font-bold hover:opacity-90 shadow-lg shadow-red-100 transition-all disabled:opacity-50">
                                        {createSubmitting ? "Creating..." : "Submit"}
                                    </button>
                                </div>
                                {createError && (
                                    <p className="text-[#DD4342] text-sm font-bold text-center mt-4 pb-4">
                                        {createError}
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
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