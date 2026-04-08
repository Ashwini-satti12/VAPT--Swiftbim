import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../lib/api";
import { useNavigate } from "react-router-dom";
import { FiUploadCloud, FiPaperclip } from "react-icons/fi";
import { RiDeleteBin5Fill } from "react-icons/ri";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import paymentMilestoneIcon from "../../../assets/ProjectManager/project/paymentMilestone.svg";
import threedot from "../../../assets/ProjectManager/project/threedot.svg";
import ProfileIcon from "../../../assets/ProductNavbarIcons/Profile.svg";
import closeBtnIcon from "../../../assets/ProductNavbarIcons/close button.svg";
import backIcon from "../../../assets/TechnicalDirector/back icon.svg";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";


interface Project {
    id: number;
    project_name?: string;
    progress?: string;
    total_tasks?: number;
    completed_tasks?: number;
    budget?: string;
    modules?: string;
    client_name?: string;
    project_manager_id?: string;
    start_date?: string;
    due_date?: string;
    totalhours?: string;
    perday?: string;
    per_day?: string;
    department?: string;
    lead_id?: string;
    lead_name?: string;
    project_manager_name?: string;
    bim_coordinator_id?: string;
    bim_coordinator_name?: string;
    department_name?: string;
    members?: string;
    no_resource?: string;
    resources?: string;
    no_resources_required?: string;
    required_resources?: string;
    priority?: string;
    location?: string;
    description?: string;
    deliverables?: string;
    budget_ceiling?: string;
    bidding_due_date?: string;
    proposal_id?: number;
    opportunity_id?: number;
    document_attachment?: string;
}

interface Employee {
    id: number;
    full_name?: string;
    user_role?: string;
    profile_picture?: string;
    email?: string;
    employee_id?: string;
    empid?: string;
    phone?: string;
    phone_number?: string;
    role?: string;
    designation?: string;
    department?: string;
    address?: string;
}

function decodeHtmlEntities(value: string): string {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
}

function normalizeProjectDescriptionHtml(raw?: string): string {
    if (!raw) return "";
    let normalized = raw;
    for (let i = 0; i < 2; i += 1) {
        const decoded = decodeHtmlEntities(normalized);
        if (decoded === normalized) break;
        normalized = decoded;
    }
    return normalized;
}

function hasProjectDescriptionContent(raw?: string): boolean {
    const normalized = normalizeProjectDescriptionHtml(raw);
    const text = normalized.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/gi, " ").trim();
    return text.length > 0;
}

function getApiBaseUrlForStatic(): string {
    const raw = String(import.meta.env.VITE_API_URL || api.defaults.baseURL || "http://127.0.0.1:5000/api").trim();
    return raw.replace(/\/api\/?$/, "");
}

function vendorDocUrl(fileName: string): string {
    return `${getApiBaseUrlForStatic()}/static/uploads/vendor_docs/${encodeURIComponent(fileName)}`;
}

export default function ProjectsPMV() {
    const navigate = useNavigate();
    const [list, setList] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenuProjectId, setOpenMenuProjectId] = useState<number | null>(null);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [vendorResourceProfiles, setVendorResourceProfiles] = useState<Employee[]>([]);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [clientsList, setClientsList] = useState<Array<{ id: number; fullName?: string; full_name?: string }>>([]);

    // View Project
    const [showProjectView, setShowProjectView] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [taskStats, setTaskStats] = useState({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
    const [towerData, setTowerData] = useState<any[]>([]);
    const [loadingTaskStats, setLoadingTaskStats] = useState(false);

    const [createName, setCreateName] = useState("");
    const [createBudget, setCreateBudget] = useState("");
    const [createModuleName, setCreateModuleName] = useState("");
    const [moduleInput, setModuleInput] = useState("");

    // File & Document State
    const [createFile, setCreateFile] = useState<File | null>(null);
    const [currentAttachments, setCurrentAttachments] = useState<string>("");
    const [removedAttachments, setRemovedAttachments] = useState<string[]>([]);

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

    const [createError, setCreateError] = useState("");
    const [editError, setEditError] = useState("");

    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editDropdownOpen, setEditDropdownOpen] = useState<string | null>(null);

    const [projectManagers, setProjectManagers] = useState<Employee[]>([]);
    const [bimLeads, setBimLeads] = useState<Employee[]>([]);
    const [bimCoordinators, setBimCoordinators] = useState<Employee[]>([]);

    // Milestones view
    const [showMilestones, setShowMilestones] = useState(false);
    const [milestonesProject, setMilestonesProject] = useState<Project | null>(null);

    // Success message
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showAllMembersModal, setShowAllMembersModal] = useState(false);
    const [allMembersList, setAllMembersList] = useState<Employee[]>([]);
    const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Employee | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    const [searchParams] = useSearchParams();
    const statusFilter = searchParams.get("status");

    const uniqueById = <T extends { id?: number | string }>(rows: T[]): T[] => {
        const seen = new Set<string>();
        const out: T[] = [];
        for (const row of rows) {
            const key = String(row?.id ?? "");
            if (!key || seen.has(key)) continue;
            seen.add(key);
            out.push(row);
        }
        return out;
    };

    const fetchProjects = (status?: string | null) => {
        const params: any = {};
        if (status) params.status = status;

        Promise.all([
            api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects", { params }),
            api.get<{ tasks?: Array<{ projectid?: number; project_id?: number }> }>("/api/vendors/vendor-tasks"),
        ])
            .then(([projectsRes, myTasksRes]) => {
                const allProjects = projectsRes.data.projects ?? [];
                const myTasks = myTasksRes.data.tasks ?? [];
                const involvedProjectIds = new Set<number>(
                    myTasks
                        .map((t) => Number(t.projectid ?? t.project_id))
                        .filter((id) => !Number.isNaN(id) && id > 0),
                );
                const involvedProjects = involvedProjectIds.size > 0
                    ? allProjects.filter((p) => involvedProjectIds.has(Number(p.id)))
                    : [];
                setList(uniqueById(involvedProjects));
            })
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(".project-menu-container")) {
                setOpenMenuProjectId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        fetchProjects(statusFilter);
        api.get<{ employees?: Employee[] }>("/api/employees")
            .then(({ data }) => {
                const allEmp = data.employees ?? [];
                setAllEmployees(allEmp);
                setBimCoordinators(
                    allEmp.filter((e) =>
                        ["BIM Coordinator", "FrontEnd Developer"].includes(e.user_role || ""),
                    ),
                );
            })
            .catch(() => {
                setAllEmployees([]);
                setBimCoordinators([]);
            });
        api.get<{ success: boolean; employees?: Employee[] }>("/api/vendors/vendor-by-role?role=Vendor PM")
            .then(({ data }) => setProjectManagers(data.employees ?? []))
            .catch(() => setProjectManagers([]));
        api.get<{ success: boolean; employees?: Employee[] }>("/api/vendors/vendor-by-role?role=Vendor Bim Lead")
            .then(({ data }) => setBimLeads(data.employees ?? []))
            .catch(() => setBimLeads([]));
        api.get<{ resources?: Employee[] }>("/api/vendors/vendor-resource-profiles")
            .then(({ data }) => setVendorResourceProfiles(data.resources ?? []))
            .catch(() => setVendorResourceProfiles([]));

        // Fetch clients
        api.get<{ clients?: any[] }>("/api/clients")
            .then(({ data }) => setClientsList(data.clients ?? []))
            .catch(() => setClientsList([]));
    }, [statusFilter]);

    useEffect(() => {
        if (!showProjectView || !selectedProject) return;
        setLoadingTaskStats(true);
        api.get<{
            success?: boolean;
            status_counts?: {
                todo?: number;
                inprogress?: number;
                paused?: number;
                completed?: number;
            };
            completed_tasks?: number;
            modules?: Array<{
                module_name?: string;
                total_tasks?: number;
                completed_tasks?: number;
                completion_percentage?: number;
            }>;
        }>(`/api/vendors/vendor-projects/${selectedProject.id}/module-progress`)
            .then(({ data }) => {
                if (!data) return;
                const c = data.status_counts ?? {};
                setTaskStats({
                    todo: Number(c.todo ?? 0),
                    inProgress: Number(c.inprogress ?? 0),
                    paused: Number(c.paused ?? 0),
                    completed: Number(
                        c.completed ?? data.completed_tasks ?? 0,
                    ),
                });
                const mods = data.modules ?? [];
                setTowerData(
                    mods.map((m, idx) => {
                        const pct = Number(m.completion_percentage ?? 0);
                        let status: "Approved" | "Pending" | "Review";
                        if (pct >= 80) status = "Approved";
                        else if (pct >= 50) status = "Pending";
                        else status = "Review";
                        return {
                            id: idx + 1,
                            name: String(m.module_name ?? `Module ${idx + 1}`),
                            progress: Math.round(pct),
                            completedTasks: Number(m.completed_tasks ?? 0),
                            totalTasks: Number(m.total_tasks ?? 0),
                            status,
                        };
                    }),
                );
            })
            .catch(() => { })
            .finally(() => setLoadingTaskStats(false));
    }, [showProjectView, selectedProject]);

    const getEmployeeName = (id: string | number | undefined): string => {
        if (!id) return "";
        const emp =
            vendorResourceProfiles.find((e) => Number(e.id) === Number(id)) ||
            allEmployees.find(e => e.id === Number(id));
        return emp?.full_name || "";
    };
    const openMemberProfile = (member?: Employee) => {
        if (!member) return;
        setSelectedMember({
            ...member,
            employee_id: member.employee_id || member.empid,
            phone: member.phone || member.phone_number,
            user_role: member.user_role || member.role || member.designation,
        });
        setShowMemberProfileModal(true);
    };

    const formatDate = (d: string | undefined) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
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

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (
            !createName.trim() ||
            !createBudget.trim() ||
            !createModuleName.trim() ||
            !createProjectManager.trim() ||
            !createStartDate.trim() ||
            !createEndDate.trim() ||
            !createPerDay.trim() ||
            !createTotalHours.trim() ||
            !createBIMLead.trim() ||
            !createBIMCoOrdinator.trim() ||
            selectedMemberIds.length === 0 ||
            !createResources.trim() ||
            !createRequiredResources.trim() ||
            !createPriority.trim() ||
            !createLocation.trim() ||
            !createDescription.trim() ||
            !createFile
        ) {
            setCreateError("Please fill in all required fields and attach a file.");
            return;
        }
        setCreateError("");
        setCreateSubmitting(true);
        api.post("/api/vendors/vendor-projects", {
            project_name: createName,
            budget: createBudget,
            modules: createModuleName,
            client_name: getClientIdByName(createClientName),
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
            .then(async ({ data }) => {
                if (data.success) {
                    const newProjectId = data.project_id;
                    if (createFile && newProjectId) {
                        const formData = new FormData();
                        formData.append("file", createFile);
                        try {
                            await api.post(`/api/vendors/vendor-projects/${newProjectId}/upload-document`, formData, {
                                headers: { "Content-Type": "multipart/form-data" },
                            });
                        } catch (err) {
                            console.error("Failed to upload document during creation", err);
                        }
                    }

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
            getClientNameById(p.client_name) || (p.client_name ? String(p.client_name) : "")
        );
        setCreateProjectManager(
            idToName(p.project_manager_id, projectManagers) ||
            idToName(p.project_manager_id, allEmployees),
        );
        setCreateStartDate(p.start_date ? p.start_date.split("T")[0] : "");
        setCreateEndDate(p.due_date || p.due_date || "");
        setCreateTotalHours(p.totalhours || "");
        setCreatePerDay(p.per_day || p.perday || "");
        setCreateBIMLead(
            idToName(p.lead_id, bimLeads) || idToName(p.lead_id, allEmployees),
        );
        setCreateBIMCoOrdinator(
            idToName(p.bim_coordinator_id, bimCoordinators) ||
            idToName(p.bim_coordinator_id, allEmployees),
        );
        setSelectedMemberIds(p.members ? p.members.split(",").filter(Boolean).map(Number) : []);
        setCreateResources(p.resources || p.no_resource || "");
        setCreateRequiredResources(p.required_resources || p.no_resources_required || "");
        setCreatePriority(p.priority || "Medium");
        setCreateLocation(p.location || "");
        setCreateDescription(p.description || "");
        setCreateDeliverables(p.deliverables || "");
        setCurrentAttachments(p.document_attachment || "");
        setRemovedAttachments([]);
        setShowEditModal(true);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId) return;
        if (
            !createName.trim() ||
            !createModuleName.trim() ||
            !createProjectManager.trim() ||
            !createStartDate.trim() ||
            !createEndDate.trim() ||
            !createPerDay.trim() ||
            !createTotalHours.trim() ||
            !createBIMLead.trim() ||
            selectedMemberIds.length === 0 ||
            !createResources.trim() ||
            !createRequiredResources.trim() ||
            !createPriority.trim() ||
            !createLocation.trim() ||
            !createDescription.trim()
        ) {
            setEditError("Please fill in all required fields.");
            return;
        }
        setEditError("");
        setEditSubmitting(true);
        api.patch(`/api/vendors/vendor-projects/${editId}`, {
            project_name: createName,
            budget: createBudget,
            modules: createModuleName,
            client_name: getClientIdByName(createClientName),
            project_manager_id: nameToId(createProjectManager, projectManagers),
            start_date: createStartDate,
            due_date: createEndDate,
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
            removed_files: removedAttachments.join(","),
        })
            .then(async ({ data }) => {
                if (data.success) {
                    if (createFile) {
                        const formData = new FormData();
                        formData.append("file", createFile);
                        try {
                            await api.post(`/api/vendors/vendor-projects/${editId}/upload-document`, formData, {
                                headers: { "Content-Type": "multipart/form-data" },
                            });
                        } catch (err) {
                            console.error("Failed to upload document", err);
                        }
                    }

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

    const toggleMember = (id: number) => {
        setSelectedMemberIds(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const modulesList = useMemo(() => {
        if (!createModuleName) return [];
        const raw = createModuleName.trim();
        if (raw.startsWith("[") && raw.endsWith("]")) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.map((m: any) => String(m).trim()).filter(Boolean);
                }
            } catch (e) {
                // Not valid JSON or not an array, fall through
            }
        }
        return raw.split(",").map((m: string) => m.trim()).filter(Boolean);
    }, [createModuleName]);

    const addModule = (name: string) => {
        const trimmed = name.trim().replace(/,$/, "");
        if (trimmed && !modulesList.includes(trimmed)) {
            const newModules = [...modulesList, trimmed];
            setCreateModuleName(newModules.join(", "));
        }
        setModuleInput("");
    };

    const removeModule = (name: string) => {
        const newModules = modulesList.filter(m => m !== name);
        setCreateModuleName(newModules.join(", "));
    };

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
                                const emp =
                                    vendorResourceProfiles.find((e) => e.id === id) ||
                                    allEmployees.find(e => e.id === id);
                                return (
                                    <span key={id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#DD4342]/20 text-[#DD4342] text-xs font-bold rounded-lg shadow-sm">
                                        {emp?.full_name || `ID: ${id}`}
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
                        {vendorResourceProfiles.map(emp => (
                            <button
                                key={emp.id}
                                type="button"
                                onClick={() => toggleMember(emp.id)}
                                className={`flex items-center justify-between w-full px-5 py-2.5 text-sm hover:bg-[#F4F5F7] transition-colors cursor-pointer ${selectedMemberIds.includes(emp.id) ? "bg-[#FFF1F1] text-[#DD4342]" : "text-gray-700"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedMemberIds.includes(emp.id) ? "bg-[#DD4342] text-white" : "bg-slate-200 text-slate-500"}`}>
                                        {(emp.full_name || "?")[0]}
                                    </div>
                                    <span className="font-semibold">{emp.full_name}</span>
                                </div>
                                {selectedMemberIds.includes(emp.id) && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderFormFields = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-left">
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#353535]">Project Name <span className="text-[#DD4342]">*</span></label>
                    <input type="text" className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all  text-gray-700 placeholder-gray-400"
                        placeholder="Enter Project name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
                </div>
                {!showEditModal && (
                    <div className="space-y-2">
                        <label className="block text-[14px] font-medium text-[#353535]">Client Name <span className="text-[#DD4342]">*</span></label>
                        <input type="text" className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700 placeholder-gray-400"
                            placeholder="Enter Client Name" value={createClientName} onChange={(e) => setCreateClientName(e.target.value)} />
                    </div>
                )}

                <div className="md:col-span-2 space-y-3">
                    <label className="block text-[14px] font-medium text-[#020202]">
                        Modules Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="relative group">
                        <input
                            type="text"
                            className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[10px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-[#353535] placeholder-gray-400"
                            placeholder="Enter Modules Name"
                            value={moduleInput}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.endsWith(",")) {
                                    addModule(val);
                                } else {
                                    setModuleInput(val);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addModule(moduleInput);
                                }
                            }}
                        />
                    </div>
                    <p className="flex items-center gap-2 text-[#666666] text-[12px] font-medium">
                        <span className="w-4 h-4 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-[10px] font-bold">i</span>
                        Please enter names, separated by commas, and then press enter
                    </p>
                    <div className="flex flex-wrap gap-3 mt-4">
                        {modulesList.map((mod: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-[#F2F2F2] rounded-full border border-slate-100 group hover:border-[#DD4342]/20 transition-all">
                                <span className="text-[13px] font-bold text-[#353535]">{mod}</span>
                                <button
                                    type="button"
                                    onClick={() => removeModule(mod)}
                                    className="p-0.5 text-gray-400 hover:text-[#DD4342] transition-colors cursor-pointer"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Budget hidden for PM in edit mode */}
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#353535]">Select Project Manager <span className="text-[#DD4342]">*</span></label>
                    <div className={`relative dropdown-container ${editDropdownOpen === "pm" ? "z-[60]" : "z-10"}`}>
                        <button type="button" onClick={() => setEditDropdownOpen(o => o === "pm" ? null : "pm")}
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-left cursor-pointer">
                            <span className={createProjectManager ? "text-gray-700" : "text-gray-400"}>{createProjectManager || "Select Project Manager"}</span>
                            <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "pm" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {editDropdownOpen === "pm" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                                <button type="button" onClick={() => { setCreateProjectManager(""); setEditDropdownOpen(null); }} className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F4F5F7] cursor-pointer">Select Project Manager</button>
                                {projectManagers.map(pm => (
                                    <button key={pm.id} type="button" onClick={() => { setCreateProjectManager(pm.full_name || ""); setEditDropdownOpen(null); }}
                                        className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F4F5F7] cursor-pointer ${createProjectManager === pm.full_name ? "bg-[#FFF1F1] text-[#DD4342]" : "text-gray-700"}`}>{pm.full_name}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#353535]">Select BIM Lead <span className="text-[#DD4342]">*</span></label>
                    <div className={`relative dropdown-container ${editDropdownOpen === "bimLead" ? "z-[60]" : "z-10"}`}>
                        <button type="button" onClick={() => setEditDropdownOpen(o => o === "bimLead" ? null : "bimLead")}
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-left cursor-pointer">
                            <span className={createBIMLead ? "text-gray-700" : "text-gray-400"}>{createBIMLead || "Select BIM Lead"}</span>
                            <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "bimLead" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {editDropdownOpen === "bimLead" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                                <button type="button" onClick={() => { setCreateBIMLead(""); setEditDropdownOpen(null); }} className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F4F5F7] cursor-pointer">Select BIM Lead</button>
                                {bimLeads.map(lead => (
                                    <button key={lead.id} type="button" onClick={() => { setCreateBIMLead(lead.full_name || ""); setEditDropdownOpen(null); }}
                                        className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F4F5F7] cursor-pointer ${createBIMLead === lead.full_name ? "bg-[#FFF1F1] text-[#DD4342]" : "text-gray-700"}`}>{lead.full_name}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {/* <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#353535]">Select BIM Coordinator <span className="text-[#DD4342]">*</span></label>
                    <div className={`relative dropdown-container ${editDropdownOpen === "bimCoord" ? "z-[60]" : "z-10"}`}>
                        <button type="button" onClick={() => setEditDropdownOpen(o => o === "bimCoord" ? null : "bimCoord")}
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-left cursor-pointer">
                            <span className={createBIMCoOrdinator ? "text-gray-700" : "text-gray-400"}>{createBIMCoOrdinator || "Select BIM Coordinator"}</span>
                            <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "bimCoord" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {editDropdownOpen === "bimCoord" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                                <button type="button" onClick={() => { setCreateBIMCoOrdinator(""); setEditDropdownOpen(null); }} className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F4F5F7] cursor-pointer">Select BIM Coordinator</button>
                                {bimCoordinators.map(coord => (
                                    <button key={coord.id} type="button" onClick={() => { setCreateBIMCoOrdinator(coord.full_name || ""); setEditDropdownOpen(null); }}
                                        className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F4F5F7] cursor-pointer ${createBIMCoOrdinator === coord.full_name ? "bg-[#FFF1F1] text-[#DD4342]" : "text-gray-700"}`}>{coord.full_name}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div> */}
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#000000]">Project Start Date <span className="text-[#DD4342]">*</span></label>
                    <input type="date" value={createStartDate}
                        onChange={e => {
                            const val = e.target.value;
                            setCreateStartDate(val);
                            if (val && (!createEndDate || createEndDate === "")) {
                                const d = new Date(val);
                                d.setMonth(d.getMonth() + 6);
                                setCreateEndDate(d.toISOString().split('T')[0]);
                            }
                        }}
                        className="w-full px-5 py-3.5 bg-[#F2F3F4] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" />
                </div>
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#000000]">Project End Date <span className="text-[#DD4342]">*</span></label>
                    <input type="date" className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text[#8B8B8B]" value={createEndDate} onChange={e => setCreateEndDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#000000]">Per Day <span className="text-[#DD4342]">*</span></label>
                    <input type="text" className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" placeholder="Hours Per Day" value={createPerDay} onChange={e => setCreatePerDay(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#353535]">Total Hours <span className="text-[#DD4342]">*</span></label>
                    <input type="text" className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" placeholder="Total Estimated Hours" value={createTotalHours} onChange={e => setCreateTotalHours(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#353535]">Resources <span className="text-[#DD4342]">*</span></label>
                    <input type="text" className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" placeholder="Number of Resources" value={createResources} onChange={e => setCreateResources(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#353535]">Required Resources <span className="text-[#DD4342]">*</span></label>
                    <input type="text" className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" placeholder="Required Resources Count" value={createRequiredResources} onChange={e => setCreateRequiredResources(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#353535]">Priority <span className="text-[#DD4342]">*</span></label>
                    <div className={`relative dropdown-container ${editDropdownOpen === "priority" ? "z-[60]" : "z-10"}`}>
                        <button type="button" onClick={() => setEditDropdownOpen(o => o === "priority" ? null : "priority")}
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-left cursor-pointer">
                            <span className={createPriority ? "text-gray-700" : "text-gray-400"}>{createPriority || "Select Priority"}</span>
                            <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "priority" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {editDropdownOpen === "priority" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                                {["High", "Medium", "Low"].map(p => (
                                    <button key={p} type="button" onClick={() => { setCreatePriority(p); setEditDropdownOpen(null); }}
                                        className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F4F5F7] cursor-pointer ${createPriority === p ? "bg-[#FFF1F1] text-[#DD4342]" : "text-gray-700"}`}>{p}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#353535]">Location <span className="text-[#DD4342]">*</span></label>
                    <input type="text" className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700" placeholder="Project Location" value={createLocation} onChange={e => setCreateLocation(e.target.value)} />
                </div>

            </div>
            <div className="space-y-6 mt-6 text-left">
                {renderMemberSelector()}
                <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-[#353535]">Description <span className="text-[#DD4342]">*</span></label>
                    <textarea value={createDescription} onChange={e => setCreateDescription(e.target.value)} rows={4}
                        className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-medium text-gray-700 resize-none placeholder-gray-400" placeholder="Provide a detailed project description..." />
                </div>

            </div>
            <div className="md:col-span-2 space-y-4 pt-4">
                <label className="block text-[14px] font-medium text-[#353535]">Project Documents</label>

                {/* Existing Documents */}
                {currentAttachments && (
                    <div className="flex flex-wrap gap-3 mb-4">
                        {currentAttachments.split(",").map(file => file.trim()).filter(Boolean).map((fileName, idx) => {
                            const url = vendorDocUrl(fileName);
                            return (
                                <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm min-w-[200px]">
                                    <FiPaperclip className="w-4 h-4 text-[#DD4342]" />
                                    <span className="text-[13px] font-medium text-[#353535] line-clamp-1 flex-1">
                                        {fileName.split("_").pop()}
                                    </span>
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                                            className="p-1 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                                        >
                                            <img src={viewIcon} alt="View" className="w-4 h-4 opacity-60" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const remaining = currentAttachments.split(",")
                                                    .map(f => f.trim())
                                                    .filter(f => f !== fileName)
                                                    .join(",");
                                                setCurrentAttachments(remaining);
                                                setRemovedAttachments((prev) =>
                                                    prev.includes(fileName) ? prev : [...prev, fileName],
                                                );
                                            }}
                                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

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
                                    <span className="font-bold">Add new file</span> or drag and drop
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
                    <div className="fixed top-5 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl bg-[#1A8A47] text-white font-gantari text-sm font-medium min-w-[280px] animate-in slide-in-from-right duration-300">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Project View (In-Page) */}
                {showEditModal ? (
                    <div className="flex flex-col h-full bg-white">
                        <div className="relative flex items-center justify-center px-6 py-6 md:px-10 md:py-8 border-b border-slate-50">
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
                                className="absolute left-6 md:left-10 p-3 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                                title="Back"
                            >
                                <img src={backIcon} alt="Back" className="w-5 h-5" />
                            </button>
                            <div className="text-center min-w-0">
                                <h3 className="text-[20px] md:text-[24px] font-Gantari font-bold text-[#020202] truncate">
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
                                        className="px-6 py-2 rounded-md bg-[#F1F1F1] text-[#666666] font-bold text-[14px] transition-all  cursor-pointer"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editSubmitting}
                                        className="px-6 py-2 rounded-md bg-[#DD4342] text-white font-bold text-[14px] transition-all shadow-lg shadow-red-100 disabled:opacity-50 cursor-pointer"
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
                        <div className="relative flex items-center justify-center px-6 py-6 md:px-10 md:py-8 border-b border-slate-50">
                            <button type="button" onClick={() => setShowProjectView(false)}
                                className="absolute left-6 md:left-10 p-3 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                                title="Back">
                                <img src={backIcon} alt="Back" className="w-5 h-5" />
                            </button>
                            <div className="text-center min-w-0">
                                <h3 className="text-[20px] md:text-[24px] font-Gantari font-bold text-[#1A1A1A] truncate">
                                    {selectedProject.project_name ?? "Untitled Project"}
                                </h3>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#353535]"></div>
                                    <p className="text-[14px] font-Gantari font-semibold text-[#353535]">Overall Progress Tracker</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-6 md:pt-8 custom-scrollbar space-y-8">
                            {/* Task Status Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-4 px-0 pt-0">
                                {[
                                    { label: "To Do Tasks", value: taskStats.todo, status: "todo" },
                                    { label: "In Progress", value: taskStats.inProgress, status: "in_progress" },
                                    { label: "Paused", value: taskStats.paused, status: "paused" },
                                    { label: "Completed", value: taskStats.completed, status: "completed" },
                                ].map((stat, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => navigate('/vpm/teamtasks?status=' + stat.status + (selectedProject?.project_name ? `&project=${encodeURIComponent(selectedProject.project_name)}` : ''))}
                                        className="bg-[#F2F2F2] p-2 rounded-md flex flex-col h-[100px] md:h-[80px] hover:bg-[#DD4342] focus:outline-none cursor-pointer transition-colors group border border-slate-200"
                                    >
                                        <p className="text-[#353535] group-hover:text-white text-[16px] font-Gantari font-semibold leading-tight text-center w-full">{stat.label}</p>
                                        <div className="flex-1 flex items-center justify-center w-full">
                                            <p className="text-[#353535] group-hover:text-white text-[24px] font-Gantari font-bold leading-none">{stat.value}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Tower Data (Modules) Card Section */}
                            <div className="border border-slate-200 rounded-md p-6 lg:p-4">
                                <h4 className="text-[20px] font-Gantari font-semibold text-[#000000] mb-4">
                                    Modules
                                </h4>
                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 px-1">
                                        {loadingTaskStats ? (
                                            <div className="col-span-full text-center py-8 text-gray-500">
                                                Loading modules data...
                                            </div>
                                        ) : towerData.length > 0 ? (
                                            towerData.map((tower) => {
                                                const statusColor = tower.status === "Review" ? "#E00100" : tower.status === "Pending" ? "#EB7200" : "#008F22";
                                                const statusBg = tower.status === "Review" ? "bg-[#FFD9D9]" : tower.status === "Pending" ? "bg-[#FFEAD6]" : "bg-[#E0FFE8]";

                                                return (
                                                    <div
                                                        key={tower.id}
                                                        className="bg-white border border-slate-200 rounded-md p-2 flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[120px]"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="text-[18px] font-Gantari font-bold text-[#1A1A1A] truncate pr-2">
                                                                {tower.name}
                                                            </h5>
                                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md shrink-0 ${statusBg}`}>
                                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }}></span>
                                                                <span className="text-[12px] font-bold font-gantari" style={{ color: statusColor }}>
                                                                    {tower.status}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between mt-2">
                                                            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                                                                    <circle cx="32" cy="32" r="26" stroke="#F2F3F5" strokeWidth="5" fill="transparent" />
                                                                    <circle
                                                                        cx="32" cy="32" r="26"
                                                                        stroke={statusColor} strokeWidth="5" fill="transparent"
                                                                        strokeDasharray={163.36}
                                                                        strokeDashoffset={163.36 - (tower.progress / 100) * 163.36}
                                                                        strokeLinecap="round"
                                                                        style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                                                                    />
                                                                </svg>
                                                                <span className="absolute text-[13px] font-bold text-[#8B8B8B] font-Gantari">
                                                                    {tower.progress}%
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-col items-end">
                                                                <p className="text-[14px] font-medium text-[#8B8B8B] font-Gantari mb-1">
                                                                    Tasks Done
                                                                </p>
                                                                <div className="flex items-baseline border-t border-slate-100 pt-1">
                                                                    <p className="text-[18px] font-bold text-[#353535] font-Gantari">
                                                                        {tower.completedTasks}
                                                                    </p>
                                                                    <p className="text-[14px] font-bold text-[#8B8B8B] font-Gantari">
                                                                        /{tower.totalTasks}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="col-span-full text-center py-8 text-gray-500">
                                                Currently, no modules have been added.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Project Description */}
                            <div className="border border-slate-200 rounded-[10px] p-6 md:p-8 lg:p-4 overflow-hidden">
                                <h4 className="text-[20px] font-Gantari font-semibold text-[#000000]">
                                    Project Description
                                </h4>
                                {hasProjectDescriptionContent(selectedProject.description) ? (
                                    <div
                                        className="text-[14px] font-Gantari font-medium text-[#666666] mt-4 w-full min-w-0 max-w-full leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:max-w-full [&_*]:whitespace-normal [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#DD4342] [&_a]:underline"
                                        dangerouslySetInnerHTML={{ __html: normalizeProjectDescriptionHtml(selectedProject.description) }}
                                    />
                                ) : (
                                    <p className="text-[14px] font-Gantari font-medium text-[#666666] mt-4 leading-relaxed">
                                        No description available
                                    </p>
                                )}
                            </div>

                            {/* Team Roles Section - aligned with Vendor overview style */}
                            <div className="border border-slate-200 rounded-[10px] p-6 md:p-8 lg:p-4 space-y-6">
                                <h4 className="text-[20px] font-Gantari font-semibold text-[#000000] mb-8">
                                    Team Overview
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    {[
                                        { label: "Project Manager", id: selectedProject.project_manager_id },
                                        { label: "BIM Lead", id: selectedProject.lead_id },
                                    ].map((role) => (
                                        <div key={role.label} className="space-y-3">
                                            <p className="text-[16px] font-bold text-[#000000]">{role.label}</p>
                                            <div className="flex items-center gap-4">
                                                {(() => {
                                                    const emp = vendorResourceProfiles.find(e => e.id === Number(role.id)) || allEmployees.find(e => e.id === Number(role.id));
                                                    const profileUrl = emp?.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture) : null;
                                                    return (
                                                        <>
                                                            <div
                                                                role="button"
                                                                tabIndex={0}
                                                                className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                                                onClick={() => openMemberProfile(emp)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter" || e.key === " ") {
                                                                        e.preventDefault();
                                                                        openMemberProfile(emp);
                                                                    }
                                                                }}
                                                            >
                                                                {profileUrl ? (
                                                                    <img src={profileUrl} alt={role.label} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = ProfileIcon)} />
                                                                ) : (
                                                                    <img src={ProfileIcon} alt={role.label} className="w-full h-full object-cover p-1" />
                                                                )}
                                                            </div>
                                                            <p className="text-[14px] font-bold text-[#666666] uppercase truncate transition-all">
                                                                {getEmployeeName(role.id) || "Not assigned"}
                                                            </p>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="space-y-3">
                                        <p className="text-[16px] font-bold text-[#000000]">Members Involved</p>
                                        {(() => {
                                            const memberIds = (selectedProject.members || "").split(",").filter(Boolean).map((id) => Number(id));
                                            const projectMembers = memberIds
                                                .map((id) => vendorResourceProfiles.find((e) => e.id === id) || allEmployees.find((e) => e.id === id))
                                                .filter(Boolean) as Employee[];
                                            if (!projectMembers.length) {
                                                return <div className="h-10 flex items-center text-[14px] font-bold text-[#666666]">N/A</div>;
                                            }
                                            const visibleMembers = projectMembers.slice(0, 3);
                                            const remainingCount = Math.max(0, projectMembers.length - 3);
                                            return (
                                                <div className="flex items-center -space-x-3">
                                                    {visibleMembers.map((emp) => {
                                                        const profileUrl = emp.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture) : null;
                                                        return (
                                                            <div key={emp.id} className="relative group shrink-0">
                                                                <div
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center border-2 border-white overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                                                    onClick={() => openMemberProfile(emp)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            e.preventDefault();
                                                                            openMemberProfile(emp);
                                                                        }
                                                                    }}
                                                                >
                                                                    {profileUrl ? (
                                                                        <img src={profileUrl} className="w-full h-full object-cover" alt={emp.full_name || "Member"} onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                                                    ) : (
                                                                        <img src={ProfileIcon} className="w-full h-full object-cover p-1" alt={emp.full_name || "Member"} />
                                                                    )}
                                                                </div>
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                                                    {emp.full_name || "Unknown"}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {remainingCount > 0 && (
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            className="relative z-10 w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-500 shadow-sm cursor-pointer hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all select-none"
                                                            onClick={() => { setAllMembersList(projectMembers); setShowAllMembersModal(true); }}
                                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAllMembersList(projectMembers); setShowAllMembersModal(true); } }}
                                                        >
                                                            +{remainingCount}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Project Details */}
                            <div className="border border-slate-200 rounded-[10px] p-6 md:p-8">
                                <h4 className="text-[20px] font-Gantari font-semibold text-[#1A1A1A] mb-6">
                                    Project Details
                                </h4>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 md:gap-y-6 lg:gap-x-20">
                                    <div className="space-y-4 md:space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                                                Actual Start Date
                                            </span>
                                            <span className="hidden sm:inline text-[#616161] mr-4">:</span>
                                            <span className="text-[16px] font-gantari font-medium text-[#616161]">
                                                {formatDate(selectedProject.start_date)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                                                Total Project Hours
                                            </span>
                                            <span className="hidden sm:inline text-[#616161] mr-4">:</span>
                                            <span className="text-[16px] font-gantari font-medium text-[#616161]">
                                                {selectedProject.totalhours || (selectedProject as any).total_hours
                                                    ? `${selectedProject.totalhours || (selectedProject as any).total_hours}hrs`
                                                    : "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                                                Outsourcing Budget
                                            </span>
                                            <span className="hidden sm:inline text-[#616161] mr-4">:</span>
                                            <span className="text-[16px] font-gantari font-medium text-[#616161]">
                                                {selectedProject.budget_ceiling || "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                                                Total Resources Available
                                            </span>
                                            <span className="hidden sm:inline text-[#616161] mr-4">:</span>
                                            <span className="text-[16px] font-gantari font-medium text-[#616161]">
                                                {selectedProject.resources || selectedProject.no_resource || "N/A"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 md:space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                                                Location
                                            </span>
                                            <span className="hidden sm:inline text-[#616161] mr-4">:</span>
                                            <span className="text-[16px] font-gantari font-medium text-[#616161]">
                                                {selectedProject.location || "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                                                Actual End Date
                                            </span>
                                            <span className="hidden sm:inline text-[#616161] mr-4">:</span>
                                            <span className="text-[16px] font-gantari font-medium text-[#616161]">
                                                {formatDate(selectedProject.due_date || selectedProject.due_date)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                                                Hours/Day
                                            </span>
                                            <span className="hidden sm:inline text-[#616161] mr-4">:</span>
                                            <span className="text-[16px] font-gantari font-medium text-[#616161]">
                                                {selectedProject.per_day || selectedProject.perday ? `${selectedProject.per_day || selectedProject.perday}hrs` : "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                                                Required Resources
                                            </span>
                                            <span className="hidden sm:inline text-[#616161] mr-4">:</span>
                                            <span className="text-[16px] font-gantari font-medium text-[#616161]">
                                                {selectedProject.required_resources || selectedProject.no_resources_required || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Document Attachment display */}
                                <div className="mt-8 border-t border-slate-100 pt-6">
                                    <p className="text-[16px] font-bold text-[#353535] mb-4 tracking-wide uppercase">Project Document</p>
                                    {selectedProject.document_attachment ? (
                                        <div className="flex flex-wrap gap-3">
                                            {selectedProject.document_attachment
                                                .split(",")
                                                .map((file) => file.trim())
                                                .filter(Boolean)
                                                .map((fileName, idx) => {
                                                    const url = vendorDocUrl(fileName);
                                                    return (
                                                        <div key={idx} className="flex items-center gap-3 bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 md:max-w-md w-full">
                                                            <button
                                                                type="button"
                                                                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                                                                className="p-2 bg-white rounded-lg shadow-sm cursor-pointer"
                                                                title="View Document"
                                                            >
                                                                <FiPaperclip className="w-4 h-4 text-[#DD4342]" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                                                                className="text-[14px] font-bold text-[#353535] line-clamp-1 flex-1 text-left cursor-pointer"
                                                                title="View Document"
                                                            >
                                                                {fileName.split("_").pop() || "Document"}
                                                            </button>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                                                                    className="p-1.5 hover:bg-white rounded-md transition-colors border border-transparent shadow-sm hover:border-slate-200 hover:shadow cursor-pointer"
                                                                    title="View Details"
                                                                >
                                                                    <img src={viewIcon} alt="View" className="w-[18px] h-[18px] object-contain opacity-70 hover:opacity-100" />
                                                                </button>
                                                                <a
                                                                    href={url}
                                                                    download
                                                                    className="p-1.5 hover:bg-white rounded-md transition-colors border border-transparent shadow-sm hover:border-slate-200 hover:shadow"
                                                                    title="Download File"
                                                                >
                                                                    <FiUploadCloud className="w-[18px] h-[18px] rotate-180 object-contain text-slate-500 hover:text-[#DD4342]" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    ) : (
                                        <span className="text-[16px] font-medium text-[#616161]">No Document Available</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : showMilestones && milestonesProject ? (
                    /* Milestones View */
                    <div className="flex flex-col h-full bg-white">
                        <div className="relative flex items-center justify-center px-10 py-8 border-b border-slate-50">
                            <button type="button" onClick={() => setShowMilestones(false)}
                                className="absolute left-10 p-3 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                                title="Back">
                                <img src={backIcon} alt="Back" className="w-5 h-5" />
                            </button>
                            <div className="text-center">
                                <h3 className="text-[20px] md:text-[24px] font-Gantari font-bold text-[#1A1A1A]">Payment Milestones</h3>
                                <p className="text-[14px] font-Gantari font-bold text-[#999999] mt-0.5">{milestonesProject.project_name}</p>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                            <h4 className="text-[20px] font-Gantari font-bold text-[#353535] mb-2">No Payment Milestones Found</h4>
                            <p className="text-[16px] font-Gantari font-medium text-[#666666] mb-10">Add your first payment to get started with payment tracking</p>
                        </div>
                    </div>
                ) : (
                    /* Project List */
                    <>
                        {/* <div className="flex items-center justify-between pb-6">
                            <h2 className="text-[24px] font-semibold text-[#000000]">Projects</h2>
                            <button onClick={() => { setShowCreateModal(true); setSelectedMemberIds([]); }}
                                className="flex items-center gap-2 bg-[#DD4342] text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm text-sm cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                Create Project
                            </button>
                        </div> */}
                        <div className="flex-1 overflow-y-auto pt-4 pb-4 px-4 space-y-8 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {list.length === 0 ? (
                                    <div className="col-span-full bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                                        No projects found. Create your first project or accept a proposal.
                                    </div>
                                ) : (
                                    list.map(p => {
                                        const progress = Math.round(Number(p.progress) || 0);
                                        const memberIds = p.members ? p.members.split(",").filter(Boolean).map(Number) : [];
                                        const radius = 22;
                                        const circumference = 2 * Math.PI * radius;
                                        const strokeOffset = circumference - (progress / 100) * circumference;
                                        const isHighPri = (p.priority || "").toLowerCase() === "high" || (p.priority || "").toLowerCase() === "urgent";

                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    setSelectedProject(p);
                                                    // setShowProjectView(true);
                                                }}
                                                className="bg-white rounded-md border border-slate-200 p-2 pt-1 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="relative flex items-center justify-center shrink-0 mt-2 ml-2">
                                                        <svg className="w-12 h-12 md:w-16 md:h-16 transform -rotate-90">
                                                            <circle cx="50%" cy="50%" r={radius} stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
                                                            <circle
                                                                cx="50%"
                                                                cy="50%"
                                                                r={radius}
                                                                stroke="#0a9344"
                                                                strokeWidth="4"
                                                                fill="transparent"
                                                                strokeDasharray={circumference}
                                                                strokeDashoffset={strokeOffset}
                                                                strokeLinecap="round"
                                                                style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
                                                            />
                                                        </svg>
                                                        <span className="absolute text-[12px] font-Gantari font-bold text-[#353535]">
                                                            {progress}%
                                                        </span>
                                                    </div>

                                                    <div className="relative shrink-0 project-menu-container">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuProjectId(prev => prev === p.id ? null : p.id);
                                                            }}
                                                            className="p-2 rounded-full text-[#8B8B8B] transition-colors cursor-pointer"
                                                        >
                                                            <img
                                                                src={threedot}
                                                                alt="options"
                                                                className="w-5 h-5 text-[#8B8B8B]"
                                                            />
                                                        </button>

                                                        {openMenuProjectId === p.id && (
                                                            <div className="absolute right-0 mt-3 w-56 bg-white/20 backdrop-blur-md rounded-md border border-[#595959]/50 shadow-xl z-[150] transition-all animate-in fade-in zoom-in duration-200 origin-top-right">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuProjectId(null); setSelectedProject(p); setShowProjectView(true); }}
                                                                    className="w-full flex items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
                                                                >
                                                                    <img
                                                                        src={viewIcon}
                                                                        alt="view"
                                                                        className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                                                    />
                                                                    <span className="text-[14px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                                                                        View
                                                                    </span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuProjectId(null); openEdit(p); }}
                                                                    className="w-full flex items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
                                                                >
                                                                    <img
                                                                        src={editIcon}
                                                                        alt="edit"
                                                                        className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                                                    />
                                                                    <span className="text-[14px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
                                                                        Edit
                                                                    </span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuProjectId(null); setMilestonesProject(p); setShowMilestones(true); }}
                                                                    className="w-full flex items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
                                                                >
                                                                    <img
                                                                        src={paymentMilestoneIcon}
                                                                        alt="milestones"
                                                                        className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                                                    />
                                                                    <span className="text-[14px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
                                                                        Payment Milestones
                                                                    </span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuProjectId(null); setDeleteId(p.id); }}
                                                                    className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                                                >
                                                                    {/* <img
                                                                        src={deleteIcon}
                                                                        alt="delete"
                                                                        className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                                                    />
                                                                    <span className="text-[16px] font-semibold text-[#616161] group-hover:text-red-500 font-Gantari">
                                                                        Delete
                                                                    </span> */}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mb-2 ml-6 -mt-2 min-h-[45px] flex flex-col justify-center">
                                                    <h3 className="text-[18px] font-Gantari font-semibold text-[#1A1A1A] leading-tight">
                                                        {p.project_name ?? "Untitled Project"}
                                                    </h3>
                                                </div>

                                                <div className="border-t border-[#E8E8E8] pt-4 mt-auto flex items-center justify-between">
                                                    <div className="flex items-center min-w-0">
                                                        {memberIds.length === 0 ? (
                                                            <div className="flex items-center -space-x-3">
                                                                <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center shrink-0 shadow-sm relative z-0" title="Not assigned">
                                                                    <span className="text-slate-600 text-[10px] font-bold">TM</span>
                                                                </div>
                                                            </div>
                                                        ) : memberIds.length === 1 ? (
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center font-bold text-gray-500 border overflow-hidden shadow-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                                                    onClick={(e) => { e.stopPropagation(); const m = vendorResourceProfiles.find((emp) => Number(emp.id) === Number(memberIds[0])) || allEmployees.find((emp) => Number(emp.id) === Number(memberIds[0])); openMemberProfile(m); }}
                                                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); const m = vendorResourceProfiles.find((emp) => Number(emp.id) === Number(memberIds[0])) || allEmployees.find((emp) => Number(emp.id) === Number(memberIds[0])); openMemberProfile(m); } }}
                                                                >
                                                                    {(getEmployeeName(memberIds[0]) || "?")[0]}
                                                                </div>
                                                                <span className="text-[14px] font-Gantari font-medium text-[#616161] truncate">
                                                                    {getEmployeeName(memberIds[0]) || "Unknown"}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center -space-x-4 pr-2">
                                                                {memberIds.slice(0, 3).map((id, idx) => (
                                                                    <div
                                                                        key={id}
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center shadow-sm shrink-0 font-bold text-gray-500 overflow-hidden relative border cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                                                        style={{ zIndex: 10 - idx }}
                                                                        onClick={(e) => { e.stopPropagation(); const m = vendorResourceProfiles.find((emp) => Number(emp.id) === Number(id)) || allEmployees.find((emp) => Number(emp.id) === Number(id)); openMemberProfile(m); }}
                                                                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); const m = vendorResourceProfiles.find((emp) => Number(emp.id) === Number(id)) || allEmployees.find((emp) => Number(emp.id) === Number(id)); openMemberProfile(m); } }}
                                                                    >
                                                                        {(getEmployeeName(id) || "?")[0]}
                                                                    </div>
                                                                ))}
                                                                {memberIds.length > 3 && (
                                                                    <div
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        className="w-9 h-9 rounded-full border-2 border-white bg-[#AEACAC] text-white text-[10px] font-bold flex items-center justify-center shadow-sm shrink-0 relative z-0 cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            const emps = memberIds.map((id) => vendorResourceProfiles.find((emp) => Number(emp.id) === Number(id)) || allEmployees.find((emp) => Number(emp.id) === Number(id))).filter(Boolean) as Employee[];
                                                                            setAllMembersList(emps);
                                                                            setShowAllMembersModal(true);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter" || e.key === " ") {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                const emps = memberIds.map((id) => vendorResourceProfiles.find((emp) => Number(emp.id) === Number(id)) || allEmployees.find((emp) => Number(emp.id) === Number(id))).filter(Boolean) as Employee[];
                                                                                setAllMembersList(emps);
                                                                                setShowAllMembersModal(true);
                                                                            }
                                                                        }}
                                                                    >
                                                                        +{memberIds.length - 3}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className={`px-3.5 py-1 rounded-[8px] text-white text-[13px] font-bold font-Gantari shadow-sm ${isHighPri ? "bg-[#DD4342]" : "bg-[#94D6F2]"}`}>
                                                        {p.priority || "Normal"}
                                                    </div>
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
                    <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[22px] font-bold text-[#1E293B] font-sora">New Project</h3>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-[#F1F5F9] rounded-lg bg-[#F2F2F2] cursor-pointer">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreate}>
                                {renderFormFields()}
                                <div className="flex gap-4 pt-10">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-4 rounded-[5px] bg-[#F4F5F7] text-[#353535] font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createSubmitting}
                                        className="flex-1 px-4 py-4 rounded-[5px] bg-[#DD4342] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                                    >
                                        {createSubmitting ? "Creating..." : "Create Project"}
                                    </button>
                                </div>
                                {createError && (
                                    <p className="text-[#DD4342] text-sm font-bold text-center mt-4">
                                        {createError}
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}


            {showAllMembersModal && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-[28px] font-semibold text-[#1A1A1A] font-Gantari">All Members ({allMembersList.length})</h3>
                            <button type="button" onClick={() => setShowAllMembersModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" aria-label="Close">
                                <img src={closeBtnIcon} alt="close" className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {allMembersList.length > 0 ? (
                                <div className="space-y-4">
                                    {allMembersList.map((member, index) => (
                                        <div
                                            key={member.id ?? index}
                                            role="button"
                                            tabIndex={0}
                                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => { openMemberProfile(member); setShowAllMembersModal(false); }}
                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openMemberProfile(member); setShowAllMembersModal(false); } }}
                                        >
                                            <div className="w-12 h-12 rounded-full border-2 border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                                                <img src={ProfileIcon} alt={member.full_name || "Member"} className="w-full h-full object-cover p-1" />
                                            </div>
                                            <div>
                                                <p className="text-[16px] font-semibold text-[#1A1A1A] font-Gantari">{member.full_name || "Unknown"}</p>
                                                {member.email && <p className="text-[14px] text-[#8B8B8B] font-Gantari">{member.email}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <p className="text-[16px] font-Gantari">No members found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showMemberProfileModal && selectedMember && (
                <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-xl w-full max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-[28px] font-semibold text-[#1A1A1A] font-Gantari">View Details</h3>
                            <button type="button" onClick={() => { setShowMemberProfileModal(false); setSelectedMember(null); }} className="p-2 rounded-[5px] bg-[#F2F2F2] cursor-pointer">
                                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-8 py-6 custom-scrollbar space-y-4">
                            <p className="text-[20px] font-Gantari font-bold text-[#1A1A1A]">{selectedMember.full_name || "Not Available"}</p>
                            {selectedMember.employee_id && <p className="text-[16px] font-Gantari"><span className="text-[#999]">Employee ID: </span>{selectedMember.employee_id}</p>}
                            {selectedMember.email && <p className="text-[16px] font-Gantari"><span className="text-[#999]">Email: </span>{selectedMember.email}</p>}
                            {(selectedMember.phone || selectedMember.phone_number) && <p className="text-[16px] font-Gantari"><span className="text-[#999]">Phone Number: </span>{selectedMember.phone || selectedMember.phone_number}</p>}
                            {selectedMember.user_role && <p className="text-[16px] font-Gantari"><span className="text-[#999]">Role: </span>{selectedMember.user_role}</p>}
                            {selectedMember.department && <p className="text-[16px] font-Gantari"><span className="text-[#999]">Department: </span>{selectedMember.department}</p>}
                            {selectedMember.address && <p className="text-[16px] font-Gantari"><span className="text-[#999]">Address: </span>{selectedMember.address}</p>}
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
                            <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-[#F2F2F2] font-bold text-slate-600 transition-colors hover:bg-slate-200 cursor-pointer">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold transition-all hover:bg-red-600 shadow-lg shadow-red-100 cursor-pointer">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
