import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg"
import editIcon from "../../assets/ProjectManager/project/editIcon.svg"
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg"
import paymentMilestoneIcon from "../../assets/ProjectManager/project/paymentMilestone.svg"
import threedot from "../../assets/ProjectManager/project/threedot.svg"

const apiBase = (api.defaults.baseURL as string) || '';

const nameToId = (name: string, employeesList: Employee[]) => {
  if (!name || name === "Nothing Selected") return undefined;
  if (/^\d+$/.test(name)) return Number(name);
  const emp = employeesList.find((e) => e.full_name === name);
  return emp ? emp.id : undefined;
};

function FormSelect({
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F2F3F4] rounded-[5px] text-left transition-all focus:outline-none"
      >
        <span
          className={
            value
              ? "text-[#000000] font-medium text-[16px]"
              : "text-gray-400 font-medium text-[16px]"
          }
        >
          {value || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[8px] shadow-lg overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-[16px] font-medium transition-colors  
                ${value === opt ? "bg-[#FFF2F2] text-[#DD4342]" : "text-[#333333]"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

export default function ProjectsTD() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBudget, setCreateBudget] = useState("");
  const [createModuleName, setCreateModuleName] = useState("");
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
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [createResources, setCreateResources] = useState("");
  const [createRequiredResources, setCreateRequiredResources] = useState("");
  const [createPriority, setCreatePriority] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createDescription, setCreateDescription] = useState("");

  const [createError, setCreateError] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
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
  const [clientsList, setClientsList] = useState<Array<{ id: number; fullName?: string; full_name?: string }>>([]);

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
      client_name: str(r.client_name),
      project_manager: str(r.project_manager_name),
      start_date: d(r.start_date),
      end_date: d(r.due_date),
      total_hours: str(r.totalhours),
      per_day: str(r.perday),
      resources: str(r.resources),
      required_resources: str(r.required_resources),
      department: str(r.department_name),
      budget_ceiling: str(r.budget_ceiling),
      bidding_end_date: str(r.bidding_end_date),
      bim_lead: str(r.lead_name),
      bim_co_ordinator: str(r.bim_coordinator_name),
      member: str(r.members),
      priority: str(r.priority),
      location: str(r.location),
      description: str(r.description),
    };
  };

  useEffect(() => {
    // Fetch employees for member lookup and dropdowns
    api
      .get<{ employees?: Employee[] }>("/api/employees")
      .then(({ data }) => {
        const allEmp = data.employees ?? [];
        setAllEmployees(allEmp);
        setEmployees(allEmp);
        setProjectManagers(allEmp.filter((e) => e.user_role === "Project Manager"));
        setBimLeads(allEmp.filter((e) => e.user_role === "BIM Lead"));
        setBimCoordinators(allEmp.filter((e) => e.user_role === "BIM Coordinator"));
      })
      .catch(() => {
        setAllEmployees([]);
        setEmployees([]);
        setProjectManagers([]);
        setBimLeads([]);
        setBimCoordinators([]);
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

    api
      .get<{ departments?: string[] }>("/api/departments")
      .then(() => { /* departments data consumed but state was removed */ })
      .catch(() => { });

    api
      .get<{ clients?: Array<{ id: number; fullName?: string; full_name?: string }> }>("/api/clients/from-users")
      .then(({ data }) => setClientsList(data.clients ?? []))
      .catch(() => setClientsList([]));
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

    // If already showing this project, no need to reset everything
    if (showProjectView && selectedProjectForView?.id === id) {
      return;
    }

    // Try to find project in the already loaded list for an immediate UI update
    const existingProject = list.find(p => p.id === id);
    if (existingProject) {
      setSelectedProjectForView(existingProject);
      setShowProjectView(true);
    } else if (!showProjectView) {
      // If not in list and not yet showing view, set showProjectView to true to show loading
      setShowProjectView(true);
    }

    // Always fetch fresh details to ensure data is up to date, but don't clear existing while loading
    api
      .get<Record<string, unknown>>(`/ api / projects / ${id} `)
      .then(({ data }) => setSelectedProjectForView(mapApiProjectToProject(data)))
      .catch(() => {
        if (!existingProject) {
          setSearchParams({}, { replace: true });
          setShowProjectView(false);
        }
      });
  }, [searchParams, list, setSearchParams]);

  // Set default module name tags when create modal opens
  useEffect(() => {
    if (showCreateModal) {
      setSelectedMemberIds([]);
    }
  }, [showCreateModal]);

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
  // (single source of truth to avoid races)
  useEffect(() => {
    let cancelled = false;
    const projectId = showProjectView ? selectedProjectForView?.id : undefined;
    if (!projectId) {
      setTaskStats({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
      setTowerData([]);
      setLoadingTaskStats(false);
      return;
    }

    setLoadingTaskStats(true);
    setTowerData([]);

    api
      .get<{
        success?: boolean;
        total_tasks?: number;
        completed_tasks?: number;
        project_completion_percentage?: number;
        status_counts?: { todo?: number; inprogress?: number; paused?: number; completed?: number };
        modules?: Array<{
          module_name?: string;
          total_tasks?: number;
          completed_tasks?: number;
          completion_percentage?: number;
        }>;
      }>(`/ api / projects / ${projectId}/module-progress`)
      .then(({ data }) => {
        if (cancelled || !data) return;

        const counts = data.status_counts ?? {};
        setTaskStats({
          todo: Number(counts.todo ?? 0),
          inProgress: Number(counts.inprogress ?? 0),
          paused: Number(counts.paused ?? 0),
          completed: Number(counts.completed ?? 0),
        });

        const mods = data.modules ?? [];
        const towers = mods.map((m, idx) => {
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
        });
        setTowerData(towers);
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: use projects table counts (already on selectedProjectForView)
        const projectCompleted = selectedProjectForView?.completed_tasks || 0;
        const projectTotal = selectedProjectForView?.total_tasks || 0;
        setTaskStats({
          todo: Math.max(0, projectTotal - projectCompleted),
          inProgress: 0,
          paused: 0,
          completed: projectCompleted,
        });
        setTowerData([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTaskStats(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showProjectView, selectedProjectForView?.id]);

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

  // Helper function to get employee name by ID
  const getEmployeeName = (id: string | number | undefined): string => {
    if (!id) return "";
    const emp = employees.find((e) => e.id === Number(id));
    return emp?.full_name || "";
  };

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
        {/* Main Content View Switcher */}
        {showProjectView ? (
          <div className="flex flex-col h-full bg-white">
            {/* Project View Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 px-6 py-6 md:px-10 md:py-8 border-b border-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowProjectView(false);
                  setSelectedProjectForView(null);
                  setSearchParams({}, { replace: true });
                }}
                className="p-3 md:p-2 rounded-xl bg-[#F2F2F2] text-[#000000]"
                title="Close"
              >
                <svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="min-w-0">
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#1A1A1A] truncate">
                  {selectedProjectForView?.project_name ?? "Loading..."}
                </h3>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-0.5">
                  <span className="hidden sm:block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#999999]"></span>
                  <p className="text-[14px] md:text-[16px] font-Gantari font-semibold text-[#999999]">
                    Overall Progress Tracker
                  </p>
                </div>
              </div>
            </div>

            {!selectedProjectForView ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-3 text-[#666666] font-Gantari font-semibold">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#DD4342]" />
                  Loading project...
                </div>
              </div>
            ) : (
              /* Project View Content */
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 md:px-10 pb-10 pt-6 md:pt-8 custom-scrollbar space-y-8">
                {/* Task Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-8">
                  {/* To Do Tasks */}
                  <button
                    type="button"
                    onClick={() => navigate('/teamtask?status=todo')}
                    className="text-left bg-[#F4F5F7] p-6 rounded-[1rem] md:rounded-[1.25rem] shadow-sm flex flex-col h-[100px] md:h-[140px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group"
                  >
                    <div className="flex items-center justify-left mb-2">
                      <p className="text-[#353535] group-hover:text-white text-[18px] md:text-[20px] font-Gantari font-semibold">To Do Tasks</p>
                    </div>
                    <p className="text-[#353535] group-hover:text-white text-[28px] md:text-[36px] font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {loadingTaskStats ? "..." : taskStats.todo}
                    </p>
                  </button>

                  {/* In Progress Tasks */}
                  <button
                    type="button"
                    onClick={() => navigate('/teamtask?status=in_progress')}
                    className="text-left bg-[#F4F5F7] p-6 rounded-[1rem] md:rounded-[1.25rem] shadow-sm flex flex-col h-[100px] md:h-[140px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#353535] group-hover:text-white text-[18px] md:text-[20px] font-Gantari font-semibold opacity-90">In Progress Tasks</p>
                    </div>
                    <p className="text-[#353535] group-hover:text-white text-[28px] md:text-[36px] font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {loadingTaskStats ? "..." : taskStats.inProgress}
                    </p>
                  </button>

                  {/* Paused Tasks */}
                  <button
                    type="button"
                    onClick={() => navigate('/teamtask?status=paused')}
                    className="text-left bg-[#F4F5F7] p-6 rounded-[1rem] md:rounded-[1.25rem] shadow-sm flex flex-col h-[100px] md:h-[140px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#333333] group-hover:text-white text-[18px] md:text-[20px] font-Gantari font-semibold">Paused Tasks</p>
                    </div>
                    <p className="text-[#333333] group-hover:text-white text-[28px] md:text-[36px] font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {loadingTaskStats ? "..." : taskStats.paused}
                    </p>
                  </button>

                  {/* Completed Tasks */}
                  <button
                    type="button"
                    onClick={() => navigate('/teamtask?status=completed')}
                    className="text-left bg-[#F4F5F7] p-6 rounded-[1rem] md:rounded-[1.25rem] shadow-sm flex flex-col h-[100px] md:h-[140px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#333333] group-hover:text-white text-[18px] md:text-[20px] font-Gantari font-semibold opacity-90">Completed Tasks</p>
                    </div>
                    <p className="text-[#333333] group-hover:text-white text-[28px] md:text-[36px] font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {loadingTaskStats ? "..." : taskStats.completed}
                    </p>
                  </button>
                </div>

                {/* Tower Progress Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 border border-slate-200 rounded-[10px] md:rounded-[10px] p-4 md:p-6 lg:p-8 custom-scrollbar">
                  {loadingTaskStats ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      Loading tower data...
                    </div>
                  ) : towerData.length > 0 ? (
                    towerData.map((tower) => {
                      const statusColor =
                        tower.status === "Review"
                          ? "#DD4342"
                          : tower.status === "Pending"
                            ? "#FF9F00"
                            : "#0A9344";
                      const statusBg =
                        tower.status === "Review"
                          ? "bg-[#FFEBEC]"
                          : tower.status === "Pending"
                            ? "bg-[#FFF4E5]"
                            : "bg-[#E7F6ED]";
                      const circumference = 188.4;

                      return (
                        <div
                          key={tower.id}
                          className="bg-white border border-slate-200 w-auto rounded-[10px] md:rounded-[10px] p-4 md:p-6"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[16px] md:text-[18px] font-Gantari font-bold text-[#1A1A1A]">
                              {tower.name}
                            </span>
                            <div
                              className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusBg}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: statusColor }}
                              ></span>
                              <span
                                className="text-[11px] md:text-[12px] font-bold"
                                style={{ color: statusColor }}
                              >
                                {tower.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 shrink-0">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle
                                  cx="50%"
                                  cy="50%"
                                  r="30"
                                  stroke="#F1F5F9"
                                  strokeWidth="5"
                                  fill="transparent"
                                  className="md:r-[34] md:stroke-6"
                                />
                                <circle
                                  cx="50%"
                                  cy="50%"
                                  r="30"
                                  stroke={statusColor}
                                  strokeWidth="5"
                                  fill="transparent"
                                  className="md:r-[34] md:stroke-6"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={
                                    circumference - (tower.progress / 100) * circumference
                                  }
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="absolute text-[13px] md:text-[15px] font-semibold text-[#1A1A1A]">
                                {tower.progress}%
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] md:text-[14px] font-semibold text-[#999999] mb-1">
                                Tasks Done
                              </p>
                              <p className="text-[16px] md:text-[18px] font-semibold text-[#1A1A1A]">
                                {tower.completedTasks}
                                <span className="text-[#999999]">/{tower.totalTasks}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      No tower/module data available
                    </div>
                  )}
                </div>

                {/* Project Description */}
                <div className="border border-slate-200 rounded-[10px] md:rounded-[10px] p-6 md:p-8 lg:p-10">
                  <h4 className="text-[18px] md:text-[22px] font-Gantari font-bold text-[#000000]">Project Description</h4>
                  <p className="text-[16px] md:text-[18px] font-Gantari font-medium text-[#666666] mt-4 leading-relaxed">
                    {selectedProjectForView.description ?? 'No description available'}
                  </p>
                </div>

                {/* Team Overview Section */}
                <div className="border border-slate-200 rounded-[10px] md:rounded-[10px] p-6 lg:p-10">
                  <h4 className="text-[18px] md:text-[22px] font-Gantari font-bold text-[#000000] mb-8">
                    Team Overview
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 md:gap-12">
                    {/* Project Manager */}
                    {(() => {
                      const projectManagerId = selectedProjectForView.project_manager;
                      const projectManager = projectManagerId
                        ? allEmployees.find(e => Number(e.id) === Number(projectManagerId))
                        : null;
                      const pmProfileUrl = projectManager?.profile_picture
                        ? (projectManager.profile_picture.startsWith('http://') || projectManager.profile_picture.startsWith('https://')
                          ? projectManager.profile_picture
                          : `${apiBase}/uploads/${projectManager.profile_picture}`)
                        : null;

                      return (
                        <div className="flex items-center gap-4">
                          {pmProfileUrl ? (
                            <img
                              src={pmProfileUrl}
                              className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-white shadow-sm object-cover shrink-0"
                              alt={projectManager?.full_name || "PM"}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=pm${projectManagerId}`;
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center shrink-0">
                              <span className="text-slate-600 font-semibold">
                                {(projectManager?.full_name || "PM").charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[16px] md:text-[18px] font-Gantari font-bold text-[#000000] truncate">
                              {projectManager?.full_name || "Not Assigned"}
                            </p>
                            <p className="text-[14px] md:text-[15px] font-Gantari font-bold text-[#616161] truncate">
                              Project Manager
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* BIM Lead */}
                    {(() => {
                      const bimLeadId = selectedProjectForView.bim_lead;
                      const bimLead = bimLeadId
                        ? allEmployees.find(e => Number(e.id) === Number(bimLeadId))
                        : null;
                      const bimProfileUrl = bimLead?.profile_picture
                        ? (bimLead.profile_picture.startsWith('http://') || bimLead.profile_picture.startsWith('https://')
                          ? bimLead.profile_picture
                          : `${apiBase}/uploads/${bimLead.profile_picture}`)
                        : null;

                      return (
                        <div className="flex items-center gap-4">
                          {bimProfileUrl ? (
                            <img
                              src={bimProfileUrl}
                              className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-white shadow-sm object-cover shrink-0"
                              alt={bimLead?.full_name || "BIM Lead"}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=bim${bimLeadId}`;
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center shrink-0">
                              <span className="text-slate-600 font-bold">
                                {(bimLead?.full_name || "BL").charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[16px] md:text-[18px] font-Gantari font-bold text-[#000000] truncate">
                              {bimLead?.full_name || "Not Assigned"}
                            </p>
                            <p className="text-[14px] md:text-[15px] font-Gantari font-bold text-[#616161] truncate">
                              BIM Lead
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Department Involved */}
                    <div className="min-w-0">
                      <p className="text-[16px] md:text-[18px] font-Gantari font-bold text-[#000000] mb-2">
                        Department Involved
                      </p>
                      <p className="text-[16px] md:text-[18px] font-Gantari font-bold text-[#616161] truncate">
                        {selectedProjectForView.department || "N/A"}
                      </p>
                    </div>

                    {/* Members Involved */}
                    <div>
                      <p className="text-[16px] md:text-[18px] font-Gantari font-bold text-[#000000] mb-2">
                        Members Involved
                      </p>
                      <div className="flex -space-x-3">
                        {(() => {
                          // Get members from project
                          const memberIds = selectedProjectForView.member
                            ? selectedProjectForView.member.split(',').map(m => m.trim()).filter(Boolean).map(Number)
                            : [];

                          // Get employee data for members
                          const projectMembers = memberIds
                            .map(id => allEmployees.find(e => Number(e.id) === Number(id)))
                            .filter(Boolean) as Employee[];

                          // Show up to 3 members, then +X for remaining
                          const visibleMembers = projectMembers.slice(0, 3);
                          const remainingCount = Math.max(0, projectMembers.length - 3);

                          // Helper to get profile image URL
                          const getProfileImageUrl = (emp: Employee) => {
                            if (emp.profile_picture) {
                              if (emp.profile_picture.startsWith('http://') || emp.profile_picture.startsWith('https://')) {
                                return emp.profile_picture;
                              }
                              return `${apiBase}/uploads/${emp.profile_picture}`;
                            }
                            return null;
                          };

                          return (
                            <>
                              {visibleMembers.length > 0 ? (
                                visibleMembers.map((emp) => {
                                  const profileUrl = getProfileImageUrl(emp);
                                  return (
                                    <div
                                      key={emp.id}
                                      className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0"
                                      title={emp.full_name || `Employee ${emp.id}`}
                                    >
                                      {profileUrl ? (
                                        <img
                                          src={profileUrl}
                                          alt={emp.full_name || "Member"}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${emp.id}`;
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                          {(emp.full_name || `E${emp.id}`).charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                // Fallback: show placeholder if no members
                                [1, 2, 3].map((j) => (
                                  <div
                                    key={j}
                                    className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0"
                                  >
                                    <img
                                      src={`https://i.pravatar.cc/150?u=${selectedProjectForView.id + j}`}
                                      alt="avatar"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))
                              )}
                              {(remainingCount > 0 || (visibleMembers.length === 0 && projectMembers.length === 0 && memberIds.length > 0)) && (
                                <div
                                  className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors shrink-0"
                                  onClick={() => {
                                    setAllMembersList(projectMembers);
                                    setShowAllMembersModal(true);
                                  }}
                                  title={`Click to see all members`}
                                >
                                  +{remainingCount || memberIds.length}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Details Section */}
                <div className="border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10">
                  <h4 className="text-[18px] md:text-[22px] font-Gantari font-bold text-[#1A1A1A] mb-8">
                    Project Details
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 md:gap-y-6 lg:gap-x-20">
                    <div className="space-y-4 md:space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                          Client Name
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                        <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                          {selectedProjectForView.client_name || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                          Actual Start Date
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                        <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                          {selectedProjectForView.start_date
                            ? new Date(selectedProjectForView.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                          Total Project Hours
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                        <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                          {selectedProjectForView.total_hours ? `${selectedProjectForView.total_hours}hrs` : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                          Budget
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                        <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                          {selectedProjectForView.budget ? `${selectedProjectForView.budget}$` : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                          Total Resources Available
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                        <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                          {selectedProjectForView.resources || "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4 md:space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                          Location
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                        <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                          {selectedProjectForView.location || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                          Actual End Date
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                        <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                          {selectedProjectForView.end_date
                            ? new Date(selectedProjectForView.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                          Hours/Day
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                        <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                          {selectedProjectForView.per_day ? `${selectedProjectForView.per_day}hrs` : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                          {selectedProjectForView.required_resources || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                          Required Resources
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                        <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#666666]">
                          {selectedProjectForView.required_resources || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 md:mt-12 flex flex-col sm:flex-row sm:items-center">
                    <span className="w-full sm:w-48 text-[15px] md:text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                      Project Document
                    </span>
                    <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#999999]">
                        No Document Available
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : showMilestones && currentProject ? (
          <div className="flex flex-col h-full bg-white">
            {/* Milestones Header */}
            <div className="flex items-center justify-between px-10 py-8">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setShowMilestones(false)}
                  className="p-3.5 rounded-xl bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div>
                  <h3 className="text-[26px] font-Gantari font-bold text-[#1A1A1A]">
                    Payment Milestones
                  </h3>
                  <p className="text-[16px] font-Gantari font-bold text-[#999999] mt-0.5">
                    {currentProject.project_name ?? "Prestige Park Grove"}
                    _Tower 1 to 09
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMilestoneModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#DD4342] text-white font-Gantari font-bold text-[16px] shadow-sm hover:bg-[#c93a39] transition-colors"
                title="Add Milestone"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Milestone
              </button>
            </div>

            {/* Milestones Content - No Scroll Version */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col px-10 pb-10 custom-scrollbar">
              {/* Summary Cards */}
              {(() => {
                const totalAmount = milestones.reduce((sum, m) => sum + Number(m.milestone_amount || 0), 0);
                const paidAmount = milestones.filter(m => (m.status || '').toLowerCase() === 'paid').reduce((sum, m) => sum + Number(m.milestone_amount || 0), 0);
                const pendingAmount = totalAmount - paidAmount;
                const progressPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-[#DD4342] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                      <p className="text-white text-[16px] font-Gantari font-bold opacity-90">Total Amount</p>
                      <p className="text-white text-[32px] font-Gantari font-bold">{totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                      <p className="text-[#333333] text-[16px] font-Gantari font-bold">Paid Amount</p>
                      <p className="text-[#333333] text-[32px] font-Gantari font-bold">{paidAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                      <p className="text-[#333333] text-[16px] font-Gantari font-bold">Pending Amount</p>
                      <p className="text-[#333333] text-[32px] font-Gantari font-bold">{pendingAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                      <p className="text-[#333333] text-[16px] font-Gantari font-bold">Progress</p>
                      <p className="text-[#333333] text-[32px] font-Gantari font-bold">{progressPercent}%</p>
                    </div>
                  </div>
                );
              })()}

              {milestonesLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DD4342]"></div>
                </div>
              ) : milestones.length === 0 ? (
                /* Central Box Area - Now Flexible */
                <div className="flex-1 border-2 border-slate-100 border-dashed rounded-[2.5rem] bg-white px-24 flex flex-col items-center justify-center text-center">
                  <h4 className="text-[22px] font-Gantari font-bold text-[#353535] mb-2">
                    No Payment Milestones Found
                  </h4>
                  <p className="text-[15px] font-Gantari font-bold text-[#999999] mb-10 max-w-sm">
                    Add your First Payment to get started with payment tracking
                  </p>
                  <button
                    onClick={() => setShowAddMilestoneModal(true)}
                    className="flex items-center gap-2 px-10 py-4 rounded-xl bg-[#DD4342] text-white font-Gantari font-bold text-[18px] shadow-lg shadow-red-500/10 hover:bg-[#c93a39] transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Milestone
                  </button>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 px-1">
              <h2 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#000000]">
                {title}
              </h2>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#DD4342] text-[#F2F2F2] text-[15px] md:text-[16px] font-Gantari font-semibold transition-all hover:bg-[#c93a39] shadow-sm active:scale-95"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Project
                </button>
              )}
            </div>

            {/* Dashboard Content with Scrollbar */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-4 pl-4 pr-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {list.length === 0 ? (
                  <div className="col-span-full bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                    No projects found.
                  </div>
                ) : (
                  list.map((p) => {
                    // Use data directly from projects table
                    const progress = Math.round(p.progress ?? 0);

                    // Get members from project.member field (comma-separated string)
                    const memberIds = p.member
                      ? p.member.split(',').map(m => m.trim()).filter(Boolean).map(Number)
                      : [];

                    const radius = 28;
                    const circumference = 2 * Math.PI * radius;
                    const offset =
                      circumference - (progress / 100) * circumference;

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 pt-1 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4 mt-2 pr-0">
                            <div className="relative flex items-center justify-center">
                              <svg className="w-20 h-20 transform -rotate-90">
                                <circle
                                  cx="40"
                                  cy="40"
                                  r={radius}
                                  stroke="#f1f5f9"
                                  strokeWidth="6"
                                  fill="transparent"
                                />
                                <circle
                                  cx="40"
                                  cy="40"
                                  r={radius}
                                  stroke="#0a9344"
                                  strokeWidth="6"
                                  fill="transparent"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={offset}
                                  strokeLinecap="round"
                                  style={{
                                    transition: "stroke-dashoffset 0.8s ease-in-out",
                                  }}
                                />
                              </svg>
                              <span className="absolute text-[16px] font-Gantari font-bold text-[#353535]">
                                {progress}%
                              </span>
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuProjectId((prev) =>
                                    prev === p.id ? null : p.id,
                                  );
                                }}
                                className="p-2 rounded-full text-[#8B8B8B] transition-colors"
                              >
                                <img src={threedot} alt="threeDots" className="w-5 h-5 text-[#8B8B8B]" />

                              </button>
                              <div
                                className={`absolute -right-25 mt-3 w-60 bg-white/20 backdrop-blur-md rounded-[10px] border border-[#FFFFFF] shadow-xl transition-all origin-top-right ${openMenuProjectId === p.id ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuProjectId(null);
                                    setSearchParams({ projectId: String(p.id) });
                                  }}
                                  className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group"
                                >
                                  <img src={viewIcon} alt="view" className="w-5 h-5 " />
                                  <span className="text-[16px] font-semibold text-[#000000] font-Gantari group-hover:text-[#DD4342]">
                                    View
                                  </span>
                                </button>
                                {(isTechnicalDirector || isManagement) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuProjectId(null);
                                      setCurrentProject(p);
                                      setShowMilestones(true);
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group"
                                  >
                                    <img src={paymentMilestoneIcon} alt="payment milestone" className="w-5 h-5" />
                                    <span className="text-[16px] font-semibold text-[#000000] group-hover:text-[#DD4342] font-Gantari">
                                      Payment Milestones
                                    </span>
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuProjectId(null);
                                      setSelectedProjectForEdit(p);
                                      setCreateName(p.project_name ?? "");
                                      setCreateBudget(p.budget ? `${p.budget}` : "Fetching...");
                                      setCreateModuleName(p.module_name ?? "");
                                      setCreateClientName(
                                        clientsList.find((c) => String(c.id) === String(p.client_name))?.fullName ??
                                        clientsList.find((c) => String(c.id) === String(p.client_name))?.full_name ??
                                        p.client_name ?? ""
                                      );
                                      setCreateProjectManager(p.project_manager ?? "");
                                      setCreateStartDate(p.start_date ?? "");
                                      setCreateEndDate(p.end_date ?? "");
                                      setCreateTotalHours(p.total_hours ?? "");
                                      setCreatePerDay(p.per_day ?? "");
                                      setCreateDepartment(
                                        p.department === 'Budget Ceiling' || p.department === 'Submission Deadline'
                                          ? p.department
                                          : '',
                                      );
                                      setCreateBudgetCeiling(p.budget_ceiling ?? "");
                                      const biddingDate = p.bidding_end_date
                                        ? p.bidding_end_date.includes('T')
                                          ? p.bidding_end_date.split('T')[0]
                                          : p.bidding_end_date
                                        : "";
                                      setCreateBiddingEndDate(biddingDate);
                                      setCreateBIMLead(p.bim_lead ?? "");
                                      setCreateBIMCoOrdinator(p.bim_co_ordinator ?? "");
                                      setCreateMember(p.member ?? "");
                                      setCreateResources(p.resources ?? "");
                                      setCreateRequiredResources(p.required_resources ?? "");
                                      setCreatePriority(p.priority ?? "");
                                      setCreateLocation(p.location ?? "");
                                      setCreateDescription(p.description ?? "");
                                      setShowEditModal(true);
                                      if (p.client_name) {
                                        import('../../lib/api').then(({ default: api }) => {
                                          api.get<{ client_budget: number | null }>(`/api/vendors/client-budget?client_id=${p.client_name}`)
                                            .then(({ data }) => {
                                              if (data.client_budget !== null && data.client_budget !== undefined) {
                                                setCreateBudget(String(data.client_budget));
                                              }
                                            });
                                        });
                                      }
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group"
                                  >
                                    <img src={editIcon} alt="edit" className="w-5 h-5 " />
                                    <span className="text-[16px] font-semibold text-[#000000] group-hover:text-[#DD4342] font-Gantari">
                                      Edit
                                    </span>
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuProjectId(null);
                                      setDeleteId(p.id);
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group"
                                  >
                                    <img src={deleteIcon} alt="delete" className="w-5 h-5" />
                                    <span className="text-[16px] font-semibold text-[#000000] group-hover:text-[#DD4342] font-Gantari">
                                      Delete
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mb-4 ml-6 -mt-2">
                            <h3 className="text-[18px] md:text-[20px] font-Gantari font-semibold text-[#1A1A1A] leading-tight">
                              {p.project_name ?? "Untitled Project"}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#E8E8E8] pt-4 mt-auto">
                          <div className="flex -space-x-4">
                            {(() => {
                              const projectEmployees = memberIds
                                .map(id => allEmployees.find(e => Number(e.id) === Number(id)))
                                .filter(Boolean) as Employee[];

                              const visibleMembers = projectEmployees.slice(0, 3);
                              const remainingCount = Math.max(0, projectEmployees.length - 3);

                              return (
                                <>
                                  {visibleMembers.map((emp) => {
                                    const profileUrl = emp.profile_picture
                                      ? (emp.profile_picture.startsWith('http'))
                                        ? emp.profile_picture
                                        : `${apiBase}/uploads/${emp.profile_picture}`
                                      : null;

                                    return (
                                      <div
                                        key={emp.id}
                                        className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                        title={emp.full_name}
                                        onClick={() => {
                                          setSelectedMember(emp);
                                          setShowMemberProfileModal(true);
                                        }}
                                      >
                                        {profileUrl ? (
                                          <img
                                            src={profileUrl}
                                            alt={emp.full_name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${emp.id}`;
                                            }}
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[10px] font-bold text-slate-600">
                                            {(emp.full_name || 'U').charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {remainingCount > 0 && (
                                    <div
                                      className="w-9 h-9 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
                                      onClick={() => {
                                        setAllMembersList(projectEmployees);
                                        setShowAllMembersModal(true);
                                      }}
                                    >
                                      +{remainingCount}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          {p.priority && (
                            <div
                              className={`px-3.5 py-1 rounded-[8px] text-white text-[13px] font-bold font-Gantari shadow-sm ${p.priority.toLowerCase() === "high"
                                ? "bg-[#DD4342]"
                                : "bg-[#94D6F2]"
                                }`}
                            >
                              {p.priority}
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

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl border-2 border-gray-100 max-w-4xl w-full flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-8 py-6">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError("");
                }}
                className="absolute left-6 p-2 rounded-lg bg-[#F2F2F2] text-[#000000]"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-semibold text-[#000000]">
                Add New Project
              </h3>
            </div>

            <div className="flex-1 p-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCreateError("");
                  setCreateSubmitting(true);
                  api
                    .post<{ success?: boolean; project_id?: number }>(
                      "/api/projects",
                      {
                        project_name: createName.trim(),
                        budget: createBudget || undefined,
                        modules: createModuleName || undefined,
                        client_id: (() => {
                          if (!createClientName) return undefined;
                          const byName = clientsList.find((c) => (c.fullName ?? c.full_name) === createClientName);
                          if (byName) return byName.id;
                          if (/^\d+$/.test(createClientName)) return Number(createClientName);
                          return undefined;
                        })(),
                        project_manager_id: nameToId(createProjectManager, projectManagers),
                        lead_id: nameToId(createBIMLead, bimLeads),
                        bim_coordinator_id: nameToId(createBIMCoOrdinator, bimCoordinators),
                        members: selectedMemberIds.join(',') || createMember || undefined,
                        department: createDepartment || undefined,
                        due_date: createEndDate || undefined,
                        start_date: createStartDate || undefined,
                        totalhours: createTotalHours || undefined,
                        perday: createPerDay || undefined,
                        resources: createResources || undefined,
                        required_resources: createRequiredResources || undefined,
                        priority: createPriority || undefined,
                        location: createLocation || undefined,
                        description: createDescription || undefined,
                      },
                    )
                    .then(({ data }) => {
                      if (data.success) {
                        setShowCreateModal(false);
                        setCreateName("");
                        setCreateBudget("");
                        setCreateModuleName("");
                        setCreateClientName("");
                        setCreateProjectManager("");
                        setCreateStartDate("");
                        setCreateEndDate("");
                        setCreateTotalHours("");
                        setCreatePerDay("");
                        setCreateDepartment("");
                        setCreateBudgetCeiling("");
                        setCreateBiddingEndDate("");
                        setCreateBIMLead("");
                        setCreateBIMCoOrdinator("");
                        setCreateMember("");
                        setSelectedMemberIds([]);
                        setModuleNameTags([]);
                        setCreatePriority("");
                        setCreateLocation("");
                        setCreateDescription("");
                        api
                          .get<{ projects?: Record<string, unknown>[] }>(
                            "/api/projects",
                          )
                          .then((res) =>
                            setList(
                              (res.data.projects ?? []).map(
                                mapApiProjectToProject,
                              ),
                            ),
                          )
                          .catch(() => { });
                      }
                    })
                    .catch((err) =>
                      setCreateError(
                        err.response?.data?.message ||
                        "Failed to create project",
                      ),
                    )
                    .finally(() => setCreateSubmitting(false));
                }}
                className="space-y-6"
              >
                {createError && (
                  <p className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    {createError}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Project Name & Budget */}
                  <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000]">
                      Project Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-semibold text-[#000000] placeholder-gray-400 focus:outline-none"
                      placeholder="Enter Your Project Name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Budget <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      value={createBudget}
                      onChange={(e) => setCreateBudget(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-semibold text-[#000000] placeholder-gray-400 focus:outline-none"
                      placeholder="Enter Project Budget"
                    />
                  </div>

                  {/* Client Name & Project Manager */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Client Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="Client Name"
                      placeholder="Nothing selected"
                      options={clientsList.map((c) => (c.fullName ?? c.full_name ?? "")).filter(Boolean) as string[]}
                      value={createClientName}
                      onChange={setCreateClientName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000]">
                      Select Project Manager <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="Select Project Manager"
                      placeholder="Nothing Selected"
                      options={projectManagers.map((e) => e.full_name ?? "").filter(Boolean) as string[]}
                      value={createProjectManager}
                      onChange={setCreateProjectManager}
                    />
                  </div>

                  {/* BIM Lead & BIM Coordinator */}
                  <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000]">
                      Select BIM Lead <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="Select BIM Lead"
                      placeholder="Nothing Selected"
                      options={bimLeads.map((e) => e.full_name ?? "").filter(Boolean) as string[]}
                      value={createBIMLead}
                      onChange={setCreateBIMLead}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000]">
                      Select BIM Coordinator
                    </label>
                    <FormSelect
                      label="Select BIM Coordinator"
                      placeholder="Nothing Selected"
                      options={bimCoordinators.map((e) => e.full_name ?? "").filter(Boolean) as string[]}
                      value={createBIMCoOrdinator}
                      onChange={setCreateBIMCoOrdinator}
                    />
                  </div>
                </div>
                <div className="flex justify-center gap-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-10 py-3 rounded-[5px] bg-[#F1F1F1] text-gray-700 font-semibold transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-10 py-3 rounded-[5px] bg-[#E2EEFF] text-[#1D7AFC] font-semibold transition-all"
                  >
                    {createSubmitting ? "Creating..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-xl w-full p-12 relative flex flex-col items-center">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className="absolute left-10 top-10 p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
              title="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Content */}
            <h3 className="text-[28px] font-Gantari font-bold text-[#1A1A1A] mt-4 mb-3">
              Delete Project
            </h3>
            <p className="text-[18px] font-Gantari font-bold text-[#353535] mb-10 text-center">
              Are you sure, you want to Delete this?
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-12 py-3.5 rounded-[5px] bg-[#F1F1F1] text-[#666666] font-Gantari font-bold text-[16px] transition-all hover:bg-gray-200"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteId === null) return;
                  api
                    .delete(`/api/projects/${deleteId}`)
                    .then(({ data }) => {
                      if ((data as { success?: boolean }).success) {
                        setList((prev) =>
                          prev.filter((p) => p.id !== deleteId),
                        );
                        setDeleteId(null);
                      }
                    })
                    .catch(() => { });
                }}
                className="px-12 py-3.5 rounded-[5px] bg-[#FFEBEC] text-[#DD4342] font-Gantari font-bold text-[16px] transition-all hover:bg-[#FFDEDE]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Milestone Modal */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full flex flex-col p-10">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center mb-10">
              <button
                type="button"
                onClick={() => setShowAddMilestoneModal(false)}
                className="absolute left-0 p-3 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                Add Payment Milestone
              </h3>
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
              className="space-y-6 px-1"
            >
              <div className="space-y-2">
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                  Milestone Name*
                </label>
                <input
                  type="text"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                  placeholder="Enter Milestone name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                  Amount ($)*
                </label>
                <input
                  type="number" step="0.01"
                  value={milestoneAmount}
                  onChange={(e) => setMilestoneAmount(e.target.value)}
                  className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                  placeholder="Enter Amount"
                  required
                />
                <div className="flex justify-between text-[13px] font-Gantari font-bold text-[#999999]">
                  <span>Project Budget: 5,000,00$</span>
                  <span>Available Budget: 5,000,00$</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                  Due Date*
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={milestoneDueDate}
                    onChange={(e) => setMilestoneDueDate(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                    required
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                  Notes
                </label>
                <textarea
                  value={milestoneNotes}
                  onChange={(e) => setMilestoneNotes(e.target.value)}
                  rows={4}
                  className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400 resize-none"
                  placeholder="Type Your Notes..."
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-center gap-6 pt-6">
                <button
                  type="button"
                  onClick={() => setShowAddMilestoneModal(false)}
                  className="px-12 py-3.5 rounded-[5px] bg-[#F1F1F1] text-[#666666] font-Gantari font-bold text-[16px] transition-all hover:bg-gray-200"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-12 py-3.5 rounded-[5px] bg-[#E2EEFF] text-[#1D7AFC] font-Gantari font-bold text-[16px] transition-all hover:bg-[#D5E6FF] shadow-sm"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Details Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-8">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditDropdownOpen(null);
                  setCreateBudgetCeiling("");
                  setCreateBiddingEndDate("");
                  // Reset all form fields
                  setCreateName("");
                  setCreateBudget("");
                  setCreateModuleName("");
                  setCreateClientName("");
                  setCreateProjectManager("");
                  setCreateStartDate("");
                  setCreateEndDate("");
                  setCreateTotalHours("");
                  setCreatePerDay("");
                  setCreateDepartment("");
                  setCreateBIMLead("");
                  setCreateBIMCoOrdinator("");
                  setCreateMember("");
                  setCreateResources("");
                  setCreateRequiredResources("");
                  setCreatePriority("");
                  setCreateLocation("");
                  setCreateDescription("");
                }}
                className="absolute left-10 p-3 rounded-[5px] bg-[#F2F2F2]  text-gray-800 transition-colors"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                Edit Details
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 pb-10 custom-scrollbar">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedProjectForEdit) return;
                  const id = selectedProjectForEdit.id;
                  setIsEditSubmitting(true);
                  api
                    .patch(`/api/projects/${id}`, {
                      project_name: createName.trim(),
                      budget: createBudget || undefined,
                      modules: createModuleName || undefined,
                      client_id: (() => {
                        if (!createClientName) return undefined;
                        const byName = clientsList.find((c) => (c.fullName ?? c.full_name) === createClientName);
                        if (byName) return byName.id;
                        if (/^\d+$/.test(createClientName)) return Number(createClientName);
                        return undefined;
                      })(),
                      project_manager_id: nameToId(createProjectManager, projectManagers),
                      lead_id: nameToId(createBIMLead, bimLeads),
                      bim_coordinator_id: nameToId(createBIMCoOrdinator, bimCoordinators),
                      members: createMember || undefined,
                      department: createDepartment || undefined,
                      ...(isEditSourceOutsource
                        ? {
                          budget_ceiling: createBudgetCeiling || undefined,
                          bidding_end_date: createBiddingEndDate || undefined,
                        }
                        : {}),
                      due_date: createEndDate || undefined,
                      start_date: createStartDate || undefined,
                      totalhours: createTotalHours || undefined,
                      perday: createPerDay || undefined,
                      resources: createResources || undefined,
                      required_resources: createRequiredResources || undefined,
                      priority: createPriority || undefined,
                      location: createLocation || undefined,
                      description: createDescription || undefined,
                    })
                    .then(({ data }) => {
                      if ((data as { success?: boolean }).success) {
                        setShowEditModal(false);
                        setEditDropdownOpen(null);
                        setCreateBudgetCeiling("");
                        setCreateBiddingEndDate("");
                        // Refresh the project list to get updated data
                        api
                          .get<{ projects?: Record<string, unknown>[] }>(
                            "/api/projects",
                          )
                          .then((res) =>
                            setList(
                              (res.data.projects ?? []).map(
                                mapApiProjectToProject,
                              ),
                            ),
                          )
                          .catch(() => { });
                      }
                    })
                    .catch(() => { })
                    .finally(() => setIsEditSubmitting(false));
                }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {/* Row 1: Project name, Client name */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                      Project Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Project name"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                      Client Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Client Name"
                      value={createClientName}
                      onChange={(e) => setCreateClientName(e.target.value)}
                    />
                  </div>

                  {/* Row 2: Client Budget (read-only from contracts), Select source */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                      Client Budget
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] font-Gantari font-medium text-gray-500 cursor-not-allowed"
                      placeholder="Auto-fetched from contract"
                      value={createBudget}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                      Select Source
                    </label>
                    <div className="relative dropdown-container">
                      <button
                        type="button"
                        onClick={() =>
                          setEditDropdownOpen((o) => (o === 'source' ? null : 'source'))
                        }
                        className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-left cursor-pointer"
                      >
                        <span className={createDepartment === 'Budget Ceiling' || createDepartment === 'Submission Deadline' ? 'text-gray-700' : 'text-gray-400'}>
                          {createDepartment === 'Budget Ceiling' ? 'In House' : createDepartment === 'Submission Deadline' ? 'Outsource' : 'Select Source'}
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === 'source' ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {editDropdownOpen === 'source' && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment('');
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${!createDepartment ? 'bg-[#E2EEFF] text-[#1D7AFC]' : 'text-gray-700'
                              }`}
                          >
                            Select Source
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment('Budget Ceiling');
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${createDepartment === 'Budget Ceiling' ? 'bg-[#E2EEFF] text-[#1D7AFC]' : 'text-gray-700'
                              }`}
                          >
                            In House
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment('Submission Deadline');
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${createDepartment === 'Submission Deadline' ? 'bg-[#E2EEFF] text-[#1D7AFC]' : 'text-gray-700'
                              }`}
                          >
                            Outsource
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* In House: Select Project Manager, BIM Lead, BIM Coordinator */}
                  {isEditSourceInHouse && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Select Project Manager
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() =>
                              setEditDropdownOpen((o) => (o === "pm" ? null : "pm"))
                            }
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-left cursor-pointer"
                          >
                            <span className={getEmployeeName(createProjectManager) ? "text-gray-700" : "text-gray-400"}>
                              {getEmployeeName(createProjectManager) || "Select Project Manager"}
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
                                className="block w-full text-left px-5 py-2.5 text-sm font-Gantari text-gray-700 hover:bg-[#F4F5F7]"
                              >
                                Select Project Manager
                              </button>
                              {projectManagers.map((pm) => (
                                <button
                                  key={pm.id}
                                  type="button"
                                  onClick={() => {
                                    setCreateProjectManager(String(pm.id));
                                    setEditDropdownOpen(null);
                                  }}
                                  className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${createProjectManager === String(pm.id)
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
                      <div className="space-y-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Select BIM Lead
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() =>
                              setEditDropdownOpen((o) => (o === "bimLead" ? null : "bimLead"))
                            }
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-left cursor-pointer"
                          >
                            <span className={getEmployeeName(createBIMLead) ? "text-gray-700" : "text-gray-400"}>
                              {getEmployeeName(createBIMLead) || "Select BIM Lead"}
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
                                className="block w-full text-left px-5 py-2.5 text-sm font-Gantari text-gray-700 hover:bg-[#F4F5F7]"
                              >
                                Select BIM Lead
                              </button>
                              {bimLeads.map((lead) => (
                                <button
                                  key={lead.id}
                                  type="button"
                                  onClick={() => {
                                    setCreateBIMLead(String(lead.id));
                                    setEditDropdownOpen(null);
                                  }}
                                  className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${createBIMLead === String(lead.id)
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
                      <div className="space-y-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Select BIM Coordinator
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() =>
                              setEditDropdownOpen((o) => (o === "bimCoord" ? null : "bimCoord"))
                            }
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-left cursor-pointer"
                          >
                            <span className={getEmployeeName(createBIMCoOrdinator) ? "text-gray-700" : "text-gray-400"}>
                              {getEmployeeName(createBIMCoOrdinator) || "Select BIM Coordinator"}
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
                                className="block w-full text-left px-5 py-2.5 text-sm font-Gantari text-gray-700 hover:bg-[#F4F5F7]"
                              >
                                Select BIM Coordinator
                              </button>
                              {bimCoordinators.map((coord) => (
                                <button
                                  key={coord.id}
                                  type="button"
                                  onClick={() => {
                                    setCreateBIMCoOrdinator(String(coord.id));
                                    setEditDropdownOpen(null);
                                  }}
                                  className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${createBIMCoOrdinator === String(coord.id)
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
                      </div>
                    </>
                  )}

                  {/* Outsource: Outsourcing Budget, Bidding End Date */}
                  {isEditSourceOutsource && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Outsourcing Budget
                        </label>
                        <input
                          type="text"
                          className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                          placeholder="Enter Outsourcing Budget"
                          value={createBudgetCeiling}
                          onChange={(e) => setCreateBudgetCeiling(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Bidding End Date
                        </label>
                        <input
                          type="date"
                          className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                          value={createBiddingEndDate}
                          onChange={(e) => setCreateBiddingEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-center gap-6 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditDropdownOpen(null);
                      setCreateBudgetCeiling("");
                      setCreateBiddingEndDate("");
                      // Reset all form fields
                      setCreateName("");
                      setCreateBudget("");
                      setCreateModuleName("");
                      setCreateClientName("");
                      setCreateProjectManager("");
                      setCreateStartDate("");
                      setCreateEndDate("");
                      setCreateTotalHours("");
                      setCreatePerDay("");
                      setCreateDepartment("");
                      setCreateBIMLead("");
                      setCreateBIMCoOrdinator("");
                      setCreateMember("");
                      setCreateResources("");
                      setCreateRequiredResources("");
                      setCreatePriority("");
                      setCreateLocation("");
                      setCreateDescription("");
                    }}
                    className="px-12 py-3 rounded-[5px] bg-[#F1F1F1] text-[#666666] font-Gantari font-bold text-[16px] transition-all hover:bg-gray-200"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSubmitting}
                    className="px-12 py-3 rounded-[5px] bg-[#E2EEFF] text-[#1D7AFC] font-Gantari font-bold text-[16px] transition-all hover:bg-[#D5E6FF] shadow-sm"
                  >
                    {isEditSubmitting ? "Updating..." : "Update Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* All Members Modal */}
      {showAllMembersModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setShowAllMembersModal(false)}
                className="absolute left-10 p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                All Members ({allMembersList.length})
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-6 custom-scrollbar">
              {allMembersList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allMembersList.map((emp) => {
                    const profileUrl = emp.profile_picture
                      ? (emp.profile_picture.startsWith('http://') || emp.profile_picture.startsWith('https://'))
                        ? emp.profile_picture
                        : `${apiBase}/uploads/${emp.profile_picture}`
                      : null;

                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedMember(emp);
                          setShowAllMembersModal(false);
                          setShowMemberProfileModal(true);
                        }}
                      >
                        {profileUrl ? (
                          <img
                            src={profileUrl}
                            alt={emp.full_name || "Member"}
                            className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${emp.id}`;
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-600 font-bold text-lg">
                              {(emp.full_name || `E${emp.id}`).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                            {emp.full_name || `Employee ${emp.id}`}
                          </p>
                          {emp.user_role && (
                            <p className="text-[14px] font-Gantari font-bold text-[#999999]">
                              {emp.user_role}
                            </p>
                          )}
                          {emp.email && (
                            <p className="text-[13px] font-Gantari text-[#666666] mt-1">
                              {emp.email}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-[16px] font-Gantari">No members found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Modal */}
      {showMemberProfileModal && selectedMember && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full flex flex-col">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowMemberProfileModal(false);
                  setSelectedMember(null);
                }}
                className="absolute left-10 p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                Member Profile
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-8 custom-scrollbar">
              <div className="flex flex-col items-center">
                {selectedMember.profile_picture ? (
                  <img
                    src={
                      selectedMember.profile_picture.startsWith('http://') || selectedMember.profile_picture.startsWith('https://')
                        ? selectedMember.profile_picture
                        : `${apiBase}/uploads/${selectedMember.profile_picture}`
                    }
                    alt={selectedMember.full_name || "Member"}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover mb-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${selectedMember.id}`;
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center mb-6">
                    <span className="text-slate-600 font-bold text-3xl">
                      {(selectedMember.full_name || `E${selectedMember.id}`).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="w-full space-y-4">
                  <div>
                    <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Full Name</p>
                    <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">
                      {selectedMember.full_name || "Not Available"}
                    </p>
                  </div>

                  {selectedMember.empid && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Employee ID</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.empid}
                      </p>
                    </div>
                  )}

                  {selectedMember.dob && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Date of Birth</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {new Date(selectedMember.dob).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  )}

                  {selectedMember.phone_number && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Phone Number</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.phone_number}
                      </p>
                    </div>
                  )}

                  {selectedMember.email && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Email</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.email}
                      </p>
                    </div>
                  )}

                  {selectedMember.user_role && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Role</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.user_role}
                      </p>
                    </div>
                  )}

                  {selectedMember.address && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Address</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.address}
                      </p>
                    </div>
                  )}

                  {selectedMember.department && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Department</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.department}
                      </p>
                    </div>
                  )}

                  {selectedMember.doj && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Date of Joining</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {new Date(selectedMember.doj).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
