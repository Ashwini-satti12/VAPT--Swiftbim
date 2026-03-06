import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";

const apiBase = (api.defaults.baseURL as string) || '';
import { VscEye } from "react-icons/vsc";
import { BiDotsVerticalRounded, BiEdit } from "react-icons/bi";
import { RiDeleteBin5Fill } from "react-icons/ri";
import { FiX } from "react-icons/fi";
import Dot from "../../assets/ProjectManager/MyTask/Dot.svg";
import { FaCircleDollarToSlot } from "react-icons/fa6";

interface Project {
    id: number;
    project_name?: string;
    progress?: number;
    total_tasks?: number;
    completed_tasks?: number;
    budget?: string;
    module_name?: string;
    client_name?: string;
    project_manager?: string;
    start_date?: string;
    end_date?: string;
    total_hours?: string;
    per_day?: string;
    client_id?: number;
    department?: string;
    bim_lead?: string;
    bim_co_ordinator?: string;
    member?: string;
    resources?: string;
    required_resources?: string;
    priority?: string;
    location?: string;
    description?: string;
    budget_ceiling?: string;
    bidding_end_date?: string;
}

interface Employee {
    id: number;
    full_name?: string;
    user_role?: string;
    empid?: string;
    profile_picture?: string;
    email?: string;
    phone_number?: string;
    dob?: string;
    doj?: string;
    user_type?: string;
    address?: string;
    department?: string;
}

export default function ProjectsV() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [list, setList] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createName, setCreateName] = useState("");
    const [createBudget, setCreateBudget] = useState("");
    const [createModuleName, setCreateModuleName] = useState("");
    const [moduleNameTags, setModuleNameTags] = useState<string[]>([]);
    const [moduleNameInput, setModuleNameInput] = useState("");
    const [createClientName, setCreateClientName] = useState("");
    const [createProjectManager, setCreateProjectManager] = useState("");
    const [createStartDate, setCreateStartDate] = useState("");
    const [createEndDate, setCreateEndDate] = useState("");
    const [createTotalHours, setCreateTotalHours] = useState("");
    const [createPerDay, setCreatePerDay] = useState("");
    const [createDepartment, setCreateDepartment] = useState("");
    const [createBIMLead, setCreateBIMLead] = useState("");
    const [createBIMCoOrdinator, setCreateBIMCoOrdinator] = useState("");
    const [createMember, setCreateMember] = useState("");
    const [memberTags, setMemberTags] = useState<string[]>([]);
    const [memberInput, setMemberInput] = useState("");
    const [createResources, setCreateResources] = useState("");
    const [createRequiredResources, setCreateRequiredResources] = useState("");
    const [createPriority, setCreatePriority] = useState("");
    const [createLocation, setCreateLocation] = useState("");
    const [createDescription, setCreateDescription] = useState("");
    const [createFile, setCreateFile] = useState<File | null>(null);

    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [createError, setCreateError] = useState("");
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [showMilestones, setShowMilestones] = useState(false);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [showProjectView, setShowProjectView] = useState(false);
    const [selectedProjectForView, setSelectedProjectForView] =
        useState<Project | null>(null);
    const [showMilestonesModal, setShowMilestonesModal] = useState(false);
    const [selectedProjectForMilestones, setSelectedProjectForMilestones] =
        useState<Project | null>(null);

    // Add Milestone Modal State
    const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
    const [milestoneName, setMilestoneName] = useState("");
    const [milestoneAmount, setMilestoneAmount] = useState("");
    const [milestoneDueDate, setMilestoneDueDate] = useState("");
    const [milestoneNotes, setMilestoneNotes] = useState("");

    // Edit Project Modal State
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
    const [createBudgetCeiling, setCreateBudgetCeiling] = useState("");
    const [createBiddingEndDate, setCreateBiddingEndDate] = useState("");

    // Employee data for dropdowns
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projectManagers, setProjectManagers] = useState<Employee[]>([]);
    const [bimLeads, setBimLeads] = useState<Employee[]>([]);
    const [bimCoordinators, setBimCoordinators] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    // All employees for member lookup
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

    // Profile modal state
    const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Employee | null>(null);

    // All members modal state
    const [showAllMembersModal, setShowAllMembersModal] = useState(false);
    const [allMembersList, setAllMembersList] = useState<Employee[]>([]);

    // Task statistics for project view
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
    const isEditSourceInHouse = createDepartment === "Budget Ceiling";
    const isEditSourceOutsource = createDepartment === "Submission Deadline";
    const isManagement = panelType === 1;
    const isTechnicalDirector = user?.user_role === "Technical Director";
    const canCreate = isManagement;
    const canEdit = panelType !== 3;
    const canDelete = isManagement;
    const title = isManagement ? "Projects" : "Projects Involved";

    const mapApiProjectToProject = (r: Record<string, unknown>): Project => {
        const num = (v: unknown) =>
            v === null || v === undefined ? undefined : Number(v);
        const str = (v: unknown) => (v != null ? String(v) : undefined);
        const d = (v: unknown) =>
            v != null && typeof v === "string" ? v : undefined;
        return {
            id: num(r.id) ?? 0,
            project_name: str(r.project_name),
            progress: num(r.progress) ?? 0,
            total_tasks: num(r.total_tasks),
            completed_tasks: num(r.completed_tasks),
            budget: str(r.budget),
            module_name: str(r.modules),
            client_name: str(r.client_id),
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
        };
    };

    useEffect(() => {
        // Fetch employees for member lookup
        api
            .get<{ employees?: Employee[] }>("/api/employees")
            .then(({ data }) => {
                setAllEmployees(data.employees ?? []);
            })
            .catch(() => {
                setAllEmployees([]);
            });

        // Fetch projects - use data directly from projects table
        api
            .get<{ projects?: Record<string, unknown>[] }>("/api/projects")
            .then(({ data }) => {
                const projects = (data.projects ?? []).map(mapApiProjectToProject);
                setList(projects);
            })
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    }, []);

    // Fetch employees and departments when create or edit modal opens
    useEffect(() => {
        if (showEditModal || showCreateModal) {
            api
                .get<{ employees?: Employee[] }>("/api/employees")
                .then(({ data }) => {
                    const allEmployees = data.employees ?? [];
                    setEmployees(allEmployees);
                    setProjectManagers(
                        allEmployees.filter((e) => e.user_role === "Project Manager")
                    );
                    setBimLeads(
                        allEmployees.filter((e) => e.user_role === "BIM Lead")
                    );
                    setBimCoordinators(
                        allEmployees.filter((e) => e.user_role === "BIM Coordinator")
                    );
                })
                .catch(() => {
                    setEmployees([]);
                    setProjectManagers([]);
                    setBimLeads([]);
                    setBimCoordinators([]);
                });

            api
                .get<{ departments?: string[] }>("/api/departments")
                .then(({ data }) => setDepartments(data.departments ?? []))
                .catch(() => setDepartments([]));
        }
    }, [showEditModal, showCreateModal]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Check if click is outside any dropdown
            if (!target.closest('.dropdown-container')) {
                setEditDropdownOpen(null);
            }
        };
        if (editDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [editDropdownOpen]);

    // Fetch task statistics and tower data for selected project view
    useEffect(() => {
        if (showProjectView && selectedProjectForView) {
            setLoadingTaskStats(true);
            const projectId = selectedProjectForView.id;

            // Initialize with project table data immediately
            const projectCompleted = selectedProjectForView.completed_tasks || 0;
            const projectTotal = selectedProjectForView.total_tasks || 0;

            // Set initial stats from project table so cards show data immediately
            setTaskStats({
                todo: Math.max(0, projectTotal - projectCompleted),
                inProgress: 0,
                paused: 0,
                completed: projectCompleted,
            });

            api
                .get<{
                    tasks?: Array<{
                        status?: string;
                        modules_name?: string;
                        projectid?: number | string;
                        project_id?: number | string;
                        Approval?: string;
                    }>
                }>("/api/tasks", {
                    params: {
                        project_id: String(projectId),
                        condition: "1"
                    },
                })
                .then(({ data }) => {
                    const tasks = data.tasks ?? [];

                    const normalizeStatus = (status: string | undefined): string => {
                        if (!status) return "";
                        const s = String(status).toLowerCase().trim();
                        if (s === "todo" || s === "to do") return "todo";
                        if (s === "inprogress" || s === "in progress" || s === "in_progress") return "inprogress";
                        if (s === "pause" || s === "paused") return "pause";
                        if (s === "completed" || s === "complete") return "completed";
                        return s;
                    };

                    const projectTasks = tasks.filter((t) => {
                        const taskProjectId = t.projectid || t.project_id;
                        if (taskProjectId == null) return false;
                        return String(taskProjectId) === String(projectId) || Number(taskProjectId) === Number(projectId);
                    });

                    const stats = {
                        todo: projectTasks.filter((t) => normalizeStatus(t.status) === "todo").length,
                        inProgress: projectTasks.filter((t) => normalizeStatus(t.status) === "inprogress").length,
                        paused: projectTasks.filter((t) => normalizeStatus(t.status) === "pause").length,
                        completed: projectTasks.filter((t) => normalizeStatus(t.status) === "completed").length,
                    };

                    if (projectTasks.length > 0) {
                        setTaskStats(stats);
                    } else {
                        setTaskStats({
                            todo: Math.max(0, projectTotal - projectCompleted),
                            inProgress: 0,
                            paused: 0,
                            completed: projectCompleted,
                        });
                    }

                    const projectModules = selectedProjectForView.module_name || "";
                    const allModuleNames: string[] = [];

                    if (projectModules) {
                        const parsedModules = projectModules
                            .split(',')
                            .map(m => m.trim())
                            .filter(m => m.length > 0);

                        parsedModules.forEach(module => {
                            let moduleName = module.trim();
                            if (moduleName.includes(' - ')) {
                                const parts = moduleName.split(' - ');
                                if (parts.length > 1) {
                                    moduleName = parts[0].trim();
                                }
                            }
                            if (moduleName.includes('/') && !moduleName.includes(' - ')) {
                                moduleName = moduleName.split('/')[0].trim();
                            }
                            if (moduleName && !allModuleNames.includes(moduleName)) {
                                allModuleNames.push(moduleName);
                            }
                        });
                    }

                    const moduleTaskMap = new Map<string, {
                        total: number;
                        completed: number;
                        approved: number;
                    }>();

                    projectTasks.forEach((task) => {
                        const taskModuleName = (task.modules_name || "").trim();
                        if (!taskModuleName || taskModuleName === "") return;

                        let moduleKey = taskModuleName;
                        if (taskModuleName.includes(' - ')) {
                            const parts = taskModuleName.split(' - ');
                            if (parts.length > 1) {
                                moduleKey = parts[0].trim();
                            }
                        }
                        if (moduleKey.includes('/') && !moduleKey.includes(' - ')) {
                            moduleKey = moduleKey.split('/')[0].trim();
                        }

                        const module = moduleKey || "Default";
                        const status = normalizeStatus(task.status);
                        const approval = (task.Approval || "").toLowerCase();

                        if (!moduleTaskMap.has(module)) {
                            moduleTaskMap.set(module, { total: 0, completed: 0, approved: 0 });
                        }
                        const moduleData = moduleTaskMap.get(module)!;
                        moduleData.total++;
                        if (status === "completed") moduleData.completed++;
                        if (approval === "approved") moduleData.approved++;
                    });

                    const towers: Array<{
                        id: number;
                        name: string;
                        progress: number;
                        completedTasks: number;
                        totalTasks: number;
                        status: 'Approved' | 'Pending' | 'Review';
                    }> = [];

                    const formatTowerName = (moduleName: string, index: number): string => {
                        if (!moduleName || moduleName === "Default") {
                            return `Tower ${String(index + 1).padStart(2, '0')}`;
                        }
                        const towerMatch = moduleName.match(/tower[\s-]?(\d+)/i);
                        if (towerMatch) return `Tower ${towerMatch[1].padStart(2, '0')}`;
                        const numMatch = moduleName.match(/\d+/);
                        if (numMatch && moduleName.length < 30) return `Tower ${numMatch[0].padStart(2, '0')}`;
                        return moduleName.length > 25 ? moduleName.substring(0, 25) + "..." : moduleName;
                    };

                    if (allModuleNames.length > 0) {
                        allModuleNames.forEach((moduleName, index) => {
                            let taskData = moduleTaskMap.get(moduleName) || { total: 0, completed: 0, approved: 0 };
                            if (taskData.total === 0) {
                                for (const [taskModuleName, data] of moduleTaskMap.entries()) {
                                    if (taskModuleName === "Unassigned") continue;
                                    const taskModuleLower = taskModuleName.toLowerCase();
                                    const projectModuleLower = moduleName.toLowerCase();
                                    if (taskModuleLower === projectModuleLower ||
                                        taskModuleLower.startsWith(projectModuleLower) ||
                                        projectModuleLower.startsWith(taskModuleLower) ||
                                        taskModuleLower.includes(projectModuleLower) ||
                                        projectModuleLower.includes(taskModuleLower)) {
                                        taskData = {
                                            total: taskData.total + data.total,
                                            completed: taskData.completed + data.completed,
                                            approved: taskData.approved + data.approved
                                        };
                                    }
                                }
                            }
                            const progress = taskData.total > 0 ? Math.round((taskData.completed / taskData.total) * 100) : 0;
                            let status: 'Approved' | 'Pending' | 'Review';
                            const approvalRate = taskData.total > 0 ? (taskData.approved / taskData.total) : 0;
                            if (taskData.total === 0) status = 'Review';
                            else if (approvalRate >= 0.8 || progress >= 80) status = 'Approved';
                            else if (progress >= 50 || approvalRate >= 0.5) status = 'Pending';
                            else status = 'Review';

                            towers.push({
                                id: index + 1,
                                name: formatTowerName(moduleName, index),
                                progress,
                                completedTasks: taskData.completed,
                                totalTasks: taskData.total,
                                status,
                            });
                        });
                    }

                    setTowerData(towers);
                })
                .catch(() => {
                    const projectCompleted = selectedProjectForView.completed_tasks || 0;
                    const projectTotal = selectedProjectForView.total_tasks || 0;
                    setTaskStats({
                        todo: Math.max(0, projectTotal - projectCompleted),
                        inProgress: 0,
                        paused: 0,
                        completed: projectCompleted,
                    });
                    setTowerData([]);
                })
                .finally(() => setLoadingTaskStats(false));
        } else {
            setTaskStats({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
            setTowerData([]);
        }
    }, [showProjectView, selectedProjectForView]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
                {showProjectView && selectedProjectForView ? (
                    <div className="flex flex-col h-full bg-white">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 px-6 py-6 md:px-10 md:py-8 border-b border-slate-50">
                            <button
                                type="button"
                                onClick={() => setShowProjectView(false)}
                                className="p-3.5 rounded-xl bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                                title="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <div>
                                <h3 className="text-[22px] md:text-[26px] font-Gantari font-bold text-[#1A1A1A]">
                                    {selectedProjectForView.project_name ?? "Prestige Park Grove"}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-0.5">
                                    <p className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#999999]">Tower 1 to 09</p>
                                    <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-[#999999]"></span>
                                    <p className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#999999]">Overall Progress Tracker</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-6 md:pt-8 space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-[#DD4342] p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px]">
                                    <p className="text-white text-[17px] font-bold opacity-90">To Do Tasks</p>
                                    <p className="text-white text-[48px] font-bold">{taskStats.todo}</p>
                                </div>
                                <div className="bg-[#F4F5F7] p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px]">
                                    <p className="text-[#333333] text-[17px] font-bold opacity-90">In Progress Tasks</p>
                                    <p className="text-[#333333] text-[48px] font-bold">{taskStats.inProgress}</p>
                                </div>
                                <div className="bg-[#F4F5F7] p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px]">
                                    <p className="text-[#333333] text-[17px] font-bold opacity-90">Paused Tasks</p>
                                    <p className="text-[#333333] text-[48px] font-bold">{taskStats.paused}</p>
                                </div>
                                <div className="bg-[#F4F5F7] p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px]">
                                    <p className="text-[#333333] text-[17px] font-bold opacity-90">Completed Tasks</p>
                                    <p className="text-[#333333] text-[48px] font-bold">{taskStats.completed}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border border-slate-100 rounded-[2rem] p-6 md:p-8">
                                {towerData.length > 0 ? (
                                    towerData.map((tower) => {
                                        const statusColor = tower.status === "Review" ? "#DD4342" : tower.status === "Pending" ? "#FF9F00" : "#0A9344";
                                        const statusBg = tower.status === "Review" ? "bg-[#FFEBEC]" : tower.status === "Pending" ? "bg-[#FFF4E5]" : "bg-[#E7F6ED]";
                                        const circ = 2 * Math.PI * 34;
                                        return (
                                            <div key={tower.id} className="bg-white border border-slate-100 rounded-[1.5rem] p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="text-[18px] font-bold text-[#1A1A1A]">{tower.name}</span>
                                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${statusBg}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }}></span>
                                                        <span className="text-[12px] font-bold" style={{ color: statusColor }}>{tower.status}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative flex items-center justify-center w-20 h-20">
                                                        <svg className="w-full h-full transform -rotate-90">
                                                            <circle cx="40" cy="40" r="34" stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                                                            <circle cx="40" cy="40" r="34" stroke={statusColor} strokeWidth="6" fill="transparent" strokeDasharray={circ} strokeDashoffset={circ - (tower.progress / 100) * circ} strokeLinecap="round" />
                                                        </svg>
                                                        <span className="absolute text-[15px] font-bold">{tower.progress}%</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[14px] font-bold text-[#999999] mb-1">Tasks Done</p>
                                                        <p className="text-[18px] font-bold">{tower.completedTasks}<span className="text-[#999999]">/{tower.totalTasks}</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full text-center py-8 text-gray-500">No tower/module data available</div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : showMilestones && currentProject ? (
                    <div className="flex flex-col h-full bg-white">
                        <div className="flex items-center justify-between px-10 py-8">
                            <div className="flex items-center gap-6">
                                <button type="button" onClick={() => setShowMilestones(false)} className="p-3.5 rounded-xl bg-[#F8F9FA] hover:bg-gray-100 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <div>
                                    <h3 className="text-[26px] font-bold">Payment Milestones</h3>
                                    <p className="text-[16px] font-bold text-[#999999]">{currentProject.project_name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                            <h4 className="text-[22px] font-bold text-[#353535] mb-2">No Payment Milestones Found</h4>
                            <p className="text-[15px] font-bold text-[#999999] mb-10">Add your First Payment to get started with payment tracking</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between pb-6">
                            <h2 className="text-[24px] font-semibold text-[#000000]">{title}</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto pt-4 pb-4 px-4 space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {list.length === 0 ? (
                                    <div className="col-span-full bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">No projects found.</div>
                                ) : (
                                    list.map((p) => {
                                        const total = p.total_tasks ?? 0;
                                        const completed = p.completed_tasks ?? 0;
                                        const progress = Math.round(p.progress ?? 0);
                                        const memberIds = p.member ? p.member.split(',').map(m => m.trim()).filter(Boolean).map(Number) : [];
                                        const rad = 28;
                                        const circ = 2 * Math.PI * rad;
                                        return (
                                            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <h3 className="text-[20px] font-semibold text-[#353535] leading-tight">{p.project_name ?? "Untitled Project"}</h3>
                                                        <div className="relative">
                                                            <button type="button" onClick={() => setOpenMenuProjectId(prev => prev === p.id ? null : p.id)} className="rounded-full">
                                                                <img src={Dot} alt="Dot" className="w-6 h-6" />
                                                            </button>
                                                            <div className={`absolute -right-40 w-50 bg-white/20 backdrop-blur rounded-[15px] border border-[#59595980] z-20 transition-all ${openMenuProjectId === p.id ? "opacity-100 visible" : "opacity-0 invisible"}`}>
                                                                <button onClick={() => { setOpenMenuProjectId(null); setSelectedProjectForView(p); setShowProjectView(true); }} className="w-full flex items-center gap-4 px-6 py-2.5 hover:text-[#DD4342] font-semibold text-[#6B6B6B] text-sm"><VscEye /> View</button>
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
                                                                <circle cx="40" cy="40" r={rad} stroke="#0a9344" strokeWidth="6" fill="transparent" strokeDasharray={circ} strokeDashoffset={circ - (progress / 100) * circ} strokeLinecap="round" />
                                                            </svg>
                                                            <span className="absolute font-bold">{progress}%</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between mb-2">
                                                                <span className="text-[15px] font-bold text-[#8B8B8B]">Tasks Done</span>
                                                                <span className="text-[15px] font-bold">{completed}/{total}</span>
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
                                                            <div key={id} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                                                                <img src={`https://i.pravatar.cc/150?u=${id}`} alt="avatar" />
                                                            </div>
                                                        ))}
                                                        {memberIds.length > 3 && (
                                                            <div className="w-10 h-10 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
                                                                +{memberIds.length - 3}
                                                            </div>
                                                        )}
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

            {deleteId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/20">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
                        <h3 className="text-xl font-bold mb-4">Delete Project</h3>
                        <p className="text-gray-600 mb-8">Are you sure you want to delete this project? This action cannot be undone.</p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setDeleteId(null)} className="px-6 py-2 rounded-xl bg-gray-100 font-bold">Cancel</button>
                            <button onClick={() => {
                                api.delete(`/api/projects/${deleteId}`).then(() => {
                                    setList(prev => prev.filter(p => p.id !== deleteId));
                                    setDeleteId(null);
                                });
                            }} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}