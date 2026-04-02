import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
import api from "../../lib/api";
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";
import ProfileIcon from "../../assets/ProductNavbarIcons/Profile.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import paymentMilestoneIcon from "../../assets/ProjectManager/project/paymentMilestone.svg";
import threedot from "../../assets/ProjectManager/project/threedot.svg";
import addBtnIcon from "../../assets/TechnicalDirector/add btn.svg";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import closeBtnIcon from "../../assets/ProductNavbarIcons/close button.svg";

const nameToId = (name: string, employeesList: Employee[]) => {
  if (!name || name === "Nothing Selected" || name === "Other")
    return undefined;
  if (/^\d+$/.test(name)) return Number(name);
  const emp = employeesList.find((e) => e.full_name === name);
  return emp ? emp.id : name;
};

const namesToIds = (names: string[], employeesList: Employee[]) => {
  if (!Array.isArray(names)) return undefined;
  return names
    .map((name) => nameToId(name, employeesList))
    .filter((id) => id !== undefined)
    .join(",");
};

function FormSelect({
  placeholder,
  options,
  value,
  onChange,
  isMulti = false,
  showTick = true,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string | string[];
  onChange: (v: any) => void;
  isMulti?: boolean;
  showTick?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (opt: string) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(opt)) {
        onChange(currentValues.filter((v) => v !== opt));
      } else {
        onChange([...currentValues, opt]);
      }
    } else {
      onChange(opt);
      setOpen(false);
    }
  };

  const getDisplayValue = () => {
    if (isMulti) {
      const vals = Array.isArray(value) ? value : [];
      return vals.length > 0 ? vals.join(", ") : placeholder;
    }
    return (value as string) || placeholder;
  };

  const isSelected = (opt: string) => {
    if (isMulti) {
      return Array.isArray(value) && value.includes(opt);
    }
    return value === opt;
  };

  const dropdownOptions = options.includes("Other")
    ? options
    : [...options, "Other"];

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-2 bg-[#E8E8E8] rounded-[5px] text-left transition-all focus:outline-none text-[14px] font-normal border-1 border-transparent focus:border-[#AEACAC52] cursor-pointer ${open ? "!border-[#AEACAC52]" : ""}`}
      >
        <span
          className={
            getDisplayValue() !== placeholder
              ? "text-[#353535]"
              : "text-[#8B8B8B] font-Gantari"
          }
        >
          {getDisplayValue()}
        </span>
        <svg
          className={`w-4 h-4 text-[#8B8B8B] transition-transform ${open ? "rotate-180" : ""}`}
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#FFFFFF] border border-gray-200 rounded-[8px] shadow-lg overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
          {dropdownOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`w-full text-left px-4 py-2 text-[14px] transition-colors flex items-center justify-between cursor-pointer
                ${isSelected(opt) ? "text-[#353535]" : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"}`}
            >
              <span className="truncate">{opt}</span>
              {isSelected(opt) && showTick && (
                <svg
                  className="w-4 h-4 text-[#00A300]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
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
  project_manager_id?: string;
  project_manager_name?: string;
  start_date?: string;
  end_date?: string;
  total_hours?: string;
  per_day?: string;
  client_id?: number;
  department?: string;
  bim_lead?: string;
  lead_id?: string;
  lead_name?: string;
  bim_co_ordinator?: string;
  bim_coordinator_id?: string;
  member?: string;
  members?: string;
  resources?: string;
  required_resources?: string;
  priority?: string;
  location?: string;
  description?: string;
  budget_ceiling?: string;
  bidding_end_date?: string;
  source?: string;
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
  active?: string | null;
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
  const [showOtherClient, setShowOtherClient] = useState(false);
  const [otherClientValue, setOtherClientValue] = useState("");

  const [createProjectManager, setCreateProjectManager] = useState<string[]>(
    [],
  );
  const [showOtherPM, setShowOtherPM] = useState(false);
  const [otherPMValue, setOtherPMValue] = useState("");

  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
  const [createTotalHours, setCreateTotalHours] = useState("");
  const [createPerDay, setCreatePerDay] = useState("");
  const [createDepartment, setCreateDepartment] = useState("");

  const [createBIMLead, setCreateBIMLead] = useState<string[]>([]);
  const [showOtherBIMLead, setShowOtherBIMLead] = useState(false);
  const [otherBIMLeadValue, setOtherBIMLeadValue] = useState("");

  const [createBIMCoOrdinator, setCreateBIMCoOrdinator] = useState<string[]>(
    [],
  );
  const [showOtherBIMCoord, setShowOtherBIMCoord] = useState(false);
  const [otherBIMCoordValue, setOtherBIMCoordValue] = useState("");
  const [createMember, setCreateMember] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [createResources, setCreateResources] = useState("");
  const [createRequiredResources, setCreateRequiredResources] = useState("");
  const [createPriority, setCreatePriority] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createDescription, setCreateDescription] = useState("");

  const [createError, setCreateError] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showProjectView, setShowProjectView] = useState(
    !!searchParams.get("projectId"),
  );
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
    "source" | "pm" | "bimLead" | "bimCoord" | null
  >(null);
  const [createBudgetCeiling, setCreateBudgetCeiling] = useState("");
  const [createBiddingEndDate, setCreateBiddingEndDate] = useState("");

  // Employee data for dropdowns
  const [_employees, setEmployees] = useState<Employee[]>([]);
  const [projectManagers, setProjectManagers] = useState<Employee[]>([]);
  const [bimLeads, setBimLeads] = useState<Employee[]>([]);
  const [bimCoordinators, setBimCoordinators] = useState<Employee[]>([]);
  const [clientsList, setClientsList] = useState<
    Array<{ id: number; fullName?: string; full_name?: string }>
  >([]);

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
  const [towerData, setTowerData] = useState<
    Array<{
      id: number;
      name: string;
      progress: number;
      completedTasks: number;
      totalTasks: number;
      status: "Approved" | "Pending" | "Review";
    }>
  >([]);
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

  // Parses currency-like inputs such as "$800,000", "₹ 8,00,000", etc.
  const parseBudgetValue = (value: unknown) => {
    const cleaned = String(value ?? "").replace(/[^0-9.]/g, "");
    return cleaned ? Number(cleaned) : 0;
  };

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
      project_manager_id: str(r.project_manager_id),
      project_manager_name: str(r.project_manager_name),
      start_date: d(r.start_date),
      end_date: d(r.end_date) ?? d(r.due_date),
      total_hours: str(r.totalhours),
      per_day: str(r.perday),
      resources: str(r.resources),
      required_resources: str(r.required_resources),
      department: str(r.department_name),
      budget_ceiling: str(r.budget_ceiling),
      bidding_end_date: str(r.bidding_end_date),
      bim_lead: str(r.lead_name),
      lead_id: str(r.lead_id),
      lead_name: str(r.lead_name),
      bim_co_ordinator: str(r.bim_coordinator_name),
      bim_coordinator_id: str(r.bim_coordinator_id),
      member: str(r.members),
      members: str(r.members),
      priority: str(r.priority),
      location: str(r.location),
      description: str(r.description),
      source: str(r.source),
    };
  };

  useEffect(() => {
    // Fetch employees for member lookup and dropdowns
    api
      .get<{ employees?: Employee[] }>("/api/employees")
      .then(({ data }) => {
        const allEmp = data.employees ?? [];
        const selectable = allEmp.filter(isEmployeeActiveForProjectAssignment);
        setAllEmployees(allEmp);
        setEmployees(allEmp);
        setProjectManagers(
          selectable.filter((e) => e.user_role === "Project Manager"),
        );
        setBimLeads(selectable.filter((e) => e.user_role === "BIM Lead"));
        setBimCoordinators(
          selectable.filter((e) => e.user_role === "BIM Coordinator"),
        );
      })
      .catch(() => {
        setAllEmployees([]);
        setEmployees([]);
        setProjectManagers([]);
        setBimLeads([]);
        setBimCoordinators([]);
      });

    // Fetch projects - Combine internal and vendor projects
    const status = searchParams.get("status");
    Promise.all([
      api.get<{ projects?: Record<string, unknown>[] }>("/api/projects", {
        params: { status: status || undefined }
      }),
      api.get<{ projects?: Record<string, unknown>[] }>("/api/vendors/vendor-projects", {
        params: { status: status || undefined }
      })
    ])
      .then(([res1, res2]) => {
        const p1 = (res1.data.projects ?? []).map((p) => ({
          ...mapApiProjectToProject(p),
          source: "In House",
        }));
        const p2 = (res2.data.projects ?? []).map((p) => ({
          ...mapApiProjectToProject(p),
          source: "Outsource",
        }));
        setList([...p1, ...p2]);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));

    api
      .get<{ departments?: string[] }>("/api/departments")
      .then(() => {
        /* departments data consumed but state was removed */
      })
      .catch(() => {});

    api
      .get<{
        clients?: Array<{ id: number; fullName?: string; full_name?: string }>;
      }>("/api/clients/from-users")
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
    const existingProject = list.find((p) => p.id === id);
    if (existingProject) {
      setSelectedProjectForView(existingProject);
      setShowProjectView(true);
    } else if (!showProjectView) {
      // If not in list and not yet showing view, set showProjectView to true to show loading
      setShowProjectView(true);
    }

    // Always fetch fresh details to ensure data is up to date, but don't clear existing while loading
    api
      .get<Record<string, unknown>>(`/api/projects/${id}`)
      .then(({ data }) =>
        setSelectedProjectForView(mapApiProjectToProject(data)),
      )
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
      if (!target.closest(".dropdown-container")) {
        setEditDropdownOpen(null);
      }
    };
    if (editDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [editDropdownOpen]);

  // Close project menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".project-menu-container")) {
        setOpenMenuProjectId(null);
      }
    };
    if (openMenuProjectId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuProjectId]);

  // Fetch task statistics and tower data for selected project view
  // (single source of truth to avoid races)
  useEffect(() => {
    let cancelled = false;
    const projectId = showProjectView ? selectedProjectForView?.id : undefined;

    const source = searchParams.get("source") || "In House";
    const statsApi = source === "Outsource" ? `/api/vendors/vendor-projects/${projectId}/module-progress` : `/api/projects/${projectId}/module-progress`;

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
        status_counts?: {
          todo?: number;
          inprogress?: number;
          paused?: number;
          completed?: number;
        };
        modules?: Array<{
          module_name?: string;
          total_tasks?: number;
          completed_tasks?: number;
          completion_percentage?: number;
        }>;
      }>(statsApi)
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
  }, [showProjectView, selectedProjectForView?.id, searchParams]);

  const fetchMilestones = (projectId: number) => {
    setMilestonesLoading(true);
    api
      .get<{ milestones: Milestone[] }>(
        `/api/milestones?project_id=${projectId}`,
      )
      .then(({ data }) => setMilestones(data.milestones || []))
      .catch(() => setMilestones([]))
      .finally(() => setMilestonesLoading(false));
  };

  useEffect(() => {
    if (showMilestones && currentProject?.id) {
      fetchMilestones(currentProject.id);
    }
  }, [showMilestones, currentProject?.id]);

  const searchQuery = searchParams.get("q")?.toLowerCase() || "";
  const filteredList = list.filter((p) => {
    if (!searchQuery) return true;
    return (
      (p.project_name || "").toLowerCase().includes(searchQuery) ||
      (p.client_name || "").toLowerCase().includes(searchQuery) ||
      (p.start_date || "").toLowerCase().includes(searchQuery) ||
      (p.end_date || "").toLowerCase().includes(searchQuery) ||
      (p.module_name || "").toLowerCase().includes(searchQuery) ||
      (p.description || "").toLowerCase().includes(searchQuery) ||
      (p.location || "").toLowerCase().includes(searchQuery) ||
      (p.priority || "").toLowerCase().includes(searchQuery)
    );
  });

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
            <div className="relative flex items-center justify-center px-4 md:px-6 py-6 border-b border-slate-50 mt-[-20px]">
              <button
                type="button"
                onClick={() => {
                  setShowProjectView(false);
                  setSelectedProjectForView(null);
                  setSearchParams({}, { replace: true });
                }}
                className="absolute left-4 p-2 rounded-md bg-[#F2F2F2] text-[#000000] cursor-pointer"
                title="Close"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#1A1A1A]">
                  {selectedProjectForView?.project_name ?? "Loading..."}
                </h3>
                <div className="flex items-center justify-center gap-2 md:gap-3 mt-0.5">
                  <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#353535]"></span>
                  <p className="text-[14px] md:text-[14px] font-gantari font-semibold text-[#353535]">
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
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Fixed KPI Cards at top */}
                <div className="px-4 md:px-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                  {/* To Do Tasks */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/td/teamtasks?status=todo" +
                          (selectedProjectForView?.project_name
                            ? `&project=${encodeURIComponent(selectedProjectForView.project_name)}`
                            : ""),
                      )
                    }
                    className="text-left bg-[#F2F2F2] p-2 rounded-md flex flex-col h-[100px] md:h-[80px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-slate-200"
                  >
                    <div className="flex items-center justify-left mb-2">
                      <p className="text-[#353535] group-hover:text-white text-[18px] font-gantari font-semibold">
                        To Do Tasks
                      </p>
                    </div>
                    <p className="text-[#353535] group-hover:text-white text-[20px] font-gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {loadingTaskStats ? "..." : taskStats.todo}
                    </p>
                  </button>

                  {/* In Progress Tasks */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/td/teamtasks?status=in_progress" +
                          (selectedProjectForView?.project_name
                            ? `&project=${encodeURIComponent(selectedProjectForView.project_name)}`
                            : ""),
                      )
                    }
                    className="text-left bg-[#F2F2F2] p-2 rounded-md flex flex-col h-[100px] md:h-[80px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#353535] group-hover:text-white text-[18px] font-gantari font-semibold">
                        In Progress Tasks
                      </p>
                    </div>
                    <p className="text-[#353535] group-hover:text-white text-[20px] font-gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {loadingTaskStats ? "..." : taskStats.inProgress}
                    </p>
                  </button>

                  {/* Paused Tasks */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/td/teamtasks?status=paused" +
                          (selectedProjectForView?.project_name
                            ? `&project=${encodeURIComponent(selectedProjectForView.project_name)}`
                            : ""),
                      )
                    }
                    className="text-left bg-[#F2F2F2] p-2 rounded-md flex flex-col h-[100px] md:h-[80px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#353535] group-hover:text-white text-[18px] font-gantari font-semibold">
                        Paused Tasks
                      </p>
                    </div>
                    <p className="text-[#353535] group-hover:text-white text-[20px] font-gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {loadingTaskStats ? "..." : taskStats.paused}
                    </p>
                  </button>

                  {/* Completed Tasks */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/td/teamtasks?status=completed" +
                          (selectedProjectForView?.project_name
                            ? `&project=${encodeURIComponent(selectedProjectForView.project_name)}`
                            : ""),
                      )
                    }
                    className="text-left bg-[#F2F2F2] p-2 rounded-md flex flex-col h-[100px] md:h-[80px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#353535] group-hover:text-white text-[18px] font-gantari font-semibold">
                        Completed Tasks
                      </p>
                    </div>
                    <p className="text-[#353535] group-hover:text-white text-[20px] font-gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {loadingTaskStats ? "..." : taskStats.completed}
                    </p>
                  </button>
                  </div>
                </div>

                {/* Scrollable Content Below KPI Cards */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-4 px-4 md:px-2 pb-10 pt-4">
                  <div className="border border-slate-200 rounded-md md:rounded-md p-6 md:p-8 lg:p-2">
                  <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-4">
                      {loadingTaskStats ? (
                        <div className="col-span-full text-center py-8 text-gray-500">
                          Loading tower data...
                        </div>
                      ) : towerData.length > 0 ? (
                        towerData.map((tower) => {
                          const statusColor =
                            tower.status === "Review"
                              ? "#E00100"
                              : tower.status === "Pending"
                                ? "#EB7200"
                                : "#008F22";
                          const statusBg =
                            tower.status === "Review"
                              ? "bg-[#FFD9D9]"
                              : tower.status === "Pending"
                                ? "bg-[#FFEAD6]"
                                : "bg-[#E0FFE8]";

                          return (
                            <div
                              key={tower.id}
                              className="bg-white border border-slate-200 rounded-md p-2 flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[120px]"
                            >
                              <div className="flex justify-between items-start">
                                <h5 className="text-[18px] font-Gantari font-bold text-[#1A1A1A] truncate pr-2">
                                  {tower.name}
                                </h5>
                                <div
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md shrink-0 ${statusBg}`}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: statusColor }}
                                  ></span>
                                  <span
                                    className="text-[12px] font-bold font-gantari"
                                    style={{ color: statusColor }}
                                  >
                                    {tower.status}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-2">
                                <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                                    <circle
                                      cx="32"
                                      cy="32"
                                      r="26"
                                      stroke="#F2F3F5"
                                      strokeWidth="5"
                                      fill="transparent"
                                    />
                                    <circle
                                      cx="32"
                                      cy="32"
                                      r="26"
                                      stroke={statusColor}
                                      strokeWidth="5"
                                      fill="transparent"
                                      strokeDasharray={163.36}
                                      strokeDashoffset={
                                        163.36 - (tower.progress / 100) * 163.36
                                      }
                                      strokeLinecap="round"
                                      style={{
                                        transition:
                                          "stroke-dashoffset 1s ease-in-out",
                                      }}
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

                <div className="space-y-4">
                  {/* Project Description */}
                  <div className="border border-slate-200 rounded-md md:rounded-md p-6 md:p-8 lg:p-4">
                    <h4 className="text-[20px] font-Gantari font-semibold text-[#000000]">
                      Project Description
                    </h4>
                    <p className="text-[14px] font-Gantari font-medium text-[#666666] mt-4 leading-relaxed">
                      {selectedProjectForView.description ??
                        "No description available"}
                    </p>
                  </div>

                  {/* Team Overview Section */}
                  <div className="border border-slate-200 rounded-md md:rounded-md p-6 lg:p-4">
                    <h4 className="text-[20px] font-Gantari font-semibold text-[#000000] mb-8">
                      Team Overview
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 md:gap-12 items-center">
                      {/* Project Manager */}
                      {(() => {
                        const pmIds = selectedProjectForView.project_manager_id
                          ? String(selectedProjectForView.project_manager_id)
                              .split(",")
                              .map((id) => id.trim())
                              .filter(Boolean)
                          : [];
                        const pmNames =
                          selectedProjectForView.project_manager_name
                            ? String(
                                selectedProjectForView.project_manager_name,
                              )
                                .split(",")
                                .map((n) => n.trim())
                                .filter(Boolean)
                            : [];

                        if (pmIds.length === 0 && pmNames.length === 0) {
                          return (
                            <div className="min-w-0">
                              <p className="text-[14px] font-Gantari font-semibold text-[#000000] mb-2">
                                Project Manager
                              </p>
                              <div className="flex items-center -space-x-3">
                                <div
                                  className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center shrink-0 shadow-sm relative z-0"
                                  title="Not assigned"
                                >
                                  <span className="text-slate-600 text-[14px] font-bold">
                                    PM
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const maxCount = Math.max(pmIds.length, pmNames.length);
                        const pmEntries = Array.from({ length: maxCount }).map(
                          (_, i) => {
                            const pId = pmIds[i];
                            const pName = pmNames[i];
                            const pmEmp = pId
                              ? allEmployees.find(
                                  (e: any) => String(e.id) === pId,
                                )
                              : null;
                            const dName =
                              pmEmp?.full_name || pName || "Unknown";
                            const url = pmEmp?.profile_picture
                              ? getGlobalProfileUrl(
                                  pmEmp.id,
                                  pmEmp.profile_picture,
                                )
                              : null;
                            return { key: i, dName, url };
                          },
                        );
                        const visiblePm = pmEntries.slice(0, 3);
                        const pmRemaining = Math.max(0, pmEntries.length - 3);
                        const pmOverflowTitle =
                          pmRemaining > 0
                            ? pmEntries
                                .slice(3)
                                .map((e) => e.dName)
                                .join(", ")
                            : undefined;

                        return (
                          <div className="min-w-0">
                            <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">
                              {maxCount > 1
                                ? "Project Managers"
                                : "Project Manager"}
                            </p>
                            {maxCount === 1 ? (
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0">
                                  {visiblePm[0].url ? (
                                    <img src={visiblePm[0].url} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                      {visiblePm[0].dName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm font-Gantari font-medium text-[#616161] truncate">{visiblePm[0].dName}</span>
                              </div>
                            ) : (
                              <div className="flex items-center -space-x-3">
                                {visiblePm.map((entry) => (
                                  <div key={entry.key} className="relative group shrink-0">
                                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm relative z-0">
                                      {entry.url ? (
                                        <img src={entry.url} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                          {entry.dName.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                      {entry.dName}
                                    </div>
                                  </div>
                                ))}
                                {pmRemaining > 0 && (
                                  <div className="relative group shrink-0">
                                    <div className="relative z-10 w-9 h-9 md:w-10 md:h-10 min-w-[2.25rem] min-h-[2.25rem] md:min-w-[2.5rem] md:min-h-[2.5rem] rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm shrink-0 select-none">
                                      +{pmRemaining}
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                      {pmOverflowTitle}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* BIM Lead */}
                      {(() => {
                        const blIds = selectedProjectForView.lead_id
                          ? String(selectedProjectForView.lead_id)
                              .split(",")
                              .map((id) => id.trim())
                              .filter(Boolean)
                          : [];
                        const blNames = selectedProjectForView.lead_name
                          ? String(selectedProjectForView.lead_name)
                              .split(",")
                              .map((n) => n.trim())
                              .filter(Boolean)
                          : [];

                        if (blIds.length === 0 && blNames.length === 0) {
                          return (
                            <div className="min-w-0">
                              <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">
                                BIM Lead
                              </p>
                              <div className="flex items-center -space-x-3">
                                <div
                                  className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center shrink-0 shadow-sm relative z-0"
                                  title="Not assigned"
                                >
                                  <span className="text-slate-600 text-xs font-bold">
                                    BL
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const maxCount = Math.max(blIds.length, blNames.length);
                        const blEntries = Array.from({ length: maxCount }).map(
                          (_, i) => {
                            const pId = blIds[i];
                            const pName = blNames[i];
                            const blEmp = pId
                              ? allEmployees.find(
                                  (e: any) => String(e.id) === pId,
                                )
                              : null;
                            const dName =
                              blEmp?.full_name || pName || "Unknown";
                            const url = blEmp?.profile_picture
                              ? getGlobalProfileUrl(
                                  blEmp.id,
                                  blEmp.profile_picture,
                                )
                              : null;
                            return { key: i, dName, url };
                          },
                        );
                        const visibleBl = blEntries.slice(0, 3);
                        const blRemaining = Math.max(0, blEntries.length - 3);
                        const blOverflowTitle =
                          blRemaining > 0
                            ? blEntries
                                .slice(3)
                                .map((e) => e.dName)
                                .join(", ")
                            : undefined;

                        return (
                          <div className="min-w-0">
                            <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">
                              {maxCount > 1 ? "BIM Leads" : "BIM Lead"}
                            </p>
                            {maxCount === 1 ? (
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0">
                                  {visibleBl[0].url ? (
                                    <img src={visibleBl[0].url} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                      {visibleBl[0].dName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm font-Gantari font-medium text-[#616161] truncate">{visibleBl[0].dName}</span>
                              </div>
                            ) : (
                              <div className="flex items-center -space-x-3">
                                {visibleBl.map((entry) => (
                                  <div key={entry.key} className="relative group shrink-0">
                                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm relative z-0">
                                      {entry.url ? (
                                        <img src={entry.url} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                          {entry.dName.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                      {entry.dName}
                                    </div>
                                  </div>
                                ))}
                                {blRemaining > 0 && (
                                  <div className="relative group shrink-0">
                                    <div className="relative z-10 w-9 h-9 md:w-10 md:h-10 min-w-[2.25rem] min-h-[2.25rem] md:min-w-[2.5rem] md:min-h-[2.5rem] rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm shrink-0 select-none">
                                      +{blRemaining}
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                      {blOverflowTitle}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Department Involved */}
                      <div className="min-w-0">
                        <p className="text-md font-Gantari font-semibold text-[#000000]">
                          Department Involved
                        </p>
                        <p className="text-sm font-Gantari text-[#616161] truncate">
                          {selectedProjectForView.department || "N/A"}
                        </p>
                      </div>

                      {/* Members Involved */}
                      <div>
                        <p className="text-md font-Gantari font-semibold text-[#000000]">
                          Members Involved
                        </p>
                        <div className="flex items-center -space-x-3">
                          {(() => {
                            // Get members from project (IDs can be numeric or string from API)
                            const rawIds =
                              selectedProjectForView.members ||
                              selectedProjectForView.member
                                ? String(
                                    selectedProjectForView.members ||
                                      selectedProjectForView.member,
                                  )
                                    .split(",")
                                    .map((m) => m.trim())
                                    .filter(Boolean)
                                : [];
                            const memberIds = rawIds.map((m) => {
                              const n = Number(m);
                              return Number.isNaN(n) ? m : n;
                            });

                            // Resolve employee data: match by both number and string ID so we don't miss anyone
                            const projectMembers = memberIds
                              .map((id) =>
                                allEmployees.find(
                                  (e) =>
                                    Number(e.id) === Number(id) ||
                                    String(e.id) === String(id),
                                ),
                              )
                              .filter(Boolean) as Employee[];

                            // Show up to 3 members, then +X for remaining
                            const visibleMembers = projectMembers.slice(0, 3);
                            const remainingCount = Math.max(
                              0,
                              projectMembers.length - 3,
                            );
                            const hasMore = remainingCount > 0;
                            const hasIdsButNoResolved =
                              visibleMembers.length === 0 &&
                              projectMembers.length === 0 &&
                              memberIds.length > 0;

                            // Helper to get profile image URL
                            const getProfileImageUrl = (emp: Employee) => {
                              return getGlobalProfileUrl(
                                emp.id,
                                emp.profile_picture,
                              );
                            };

                            const openAllMembersModal = () => {
                              setAllMembersList(projectMembers);
                              setShowAllMembersModal(true);
                            };

                            return memberIds.length === 1 ? (
                              <div className="flex items-center gap-3">
                                {visibleMembers.map((emp) => (
                                  <div key={emp.id} className="flex items-center gap-3">
                                    <div
                                      className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0 relative z-0"
                                    >
                                      {getProfileImageUrl(emp) ? (
                                        <img
                                          src={getProfileImageUrl(emp)}
                                          alt={emp.full_name || "Member"}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (
                                              e.target as HTMLImageElement
                                            ).src = ProfileIcon;
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                          {(emp.full_name || `E${emp.id}`).charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-sm font-Gantari font-medium text-[#616161] truncate">
                                      {emp.full_name || `Employee ${emp.id}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center -space-x-3">
                                {visibleMembers.length > 0
                                  ? visibleMembers.map((emp) => (
                                      <div key={emp.id} className="relative group shrink-0">
                                        <div
                                          className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm relative z-0"
                                        >
                                          {getProfileImageUrl(emp) ? (
                                            <img
                                              src={getProfileImageUrl(emp)}
                                              alt={emp.full_name || "Member"}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                (
                                                  e.target as HTMLImageElement
                                                ).src = ProfileIcon;
                                              }}
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                              {(emp.full_name || `E${emp.id}`)
                                                .charAt(0)
                                                .toUpperCase()}
                                            </div>
                                          )}
                                        </div>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                          {emp.full_name || `Employee ${emp.id}`}
                                        </div>
                                      </div>
                                    ))
                                  : hasIdsButNoResolved ? [1, 2, 3].map((j) => (
                                      <div
                                        key={j}
                                        className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0 relative z-0"
                                      >
                                        <img
                                          src={ProfileIcon}
                                          alt="avatar"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )) : null}
                                {(hasMore || hasIdsButNoResolved) && (
                                  <div className="relative group shrink-0">
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      className="relative z-10 w-9 h-9 md:w-10 md:h-10 min-w-[2.25rem] min-h-[2.25rem] md:min-w-[2.5rem] md:min-h-[2.5rem] rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm cursor-pointer hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all select-none"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openAllMembersModal();
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          openAllMembersModal();
                                        }
                                      }}
                                    >
                                      +{remainingCount || memberIds.length}
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                      Click to see all members
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Details Section */}
                  <div className="rounded-lg border border-slate-200 p-6 md:p-4">
                    <h4 className="text-[20px] font-Gantari font-semibold text-[#1A1A1A] mb-6">
                      Project Details
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 md:gap-y-6 lg:gap-x-20">
                      <div className="space-y-4 md:space-y-5">

                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                            Actual Start Date
                          </span>
                          <span className="hidden sm:inline text-[#616161] mr-4">
                            :
                          </span>
                          <span className="text-[16px] font-gantari font-medium text-[#616161]">
                            {selectedProjectForView.start_date
                              ? new Date(
                                  selectedProjectForView.start_date,
                                ).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                            Total Project Hours
                          </span>
                          <span className="hidden sm:inline text-[#616161] mr-4">
                            :
                          </span>
                          <span className="text-[16px] font-gantari font-medium text-[#616161]">
                            {selectedProjectForView.total_hours
                              ? `${selectedProjectForView.total_hours}hrs`
                              : "N/A"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                            Outsourcing Budget
                          </span>
                          <span className="hidden sm:inline text-[#616161] mr-4">
                            :
                          </span>
                          <span className="text-[16px] font-gantari font-medium text-[#616161]">
                            {selectedProjectForView.budget_ceiling || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                            Total Resources Available
                          </span>
                          <span className="hidden sm:inline text-[#616161] mr-4">
                            :
                          </span>
                          <span className="text-[16px] font-gantari font-medium text-[#616161]">
                            {selectedProjectForView.resources || "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-4 md:space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                            Location
                          </span>
                          <span className="hidden sm:inline text-[#616161] mr-4">
                            :
                          </span>
                          <span className="text-[16px] font-gantari font-medium text-[#616161]">
                            {selectedProjectForView.location || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                            Actual End Date
                          </span>
                          <span className="hidden sm:inline text-[#616161] mr-4">
                            :
                          </span>
                          <span className="text-md font-Gantari font-medium text-[#666666]">
                            {selectedProjectForView.end_date
                              ? new Date(
                                  selectedProjectForView.end_date,
                                ).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                            Hours/Day
                          </span>
                          <span className="hidden sm:inline text-[#616161] mr-4">
                            :
                          </span>
                          <span className="text-[16px] font-gantari font-medium text-[#616161]">
                            {selectedProjectForView.per_day
                              ? `${selectedProjectForView.per_day}hrs`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                            Required Resources
                          </span>
                          <span className="hidden sm:inline text-[#616161] mr-4">
                            :
                          </span>
                          <span className="text-[16px] font-gantari font-medium text-[#616161]">
                            {selectedProjectForView.required_resources || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                            Project Document
                          </span>
                          <span className="hidden sm:inline text-[#616161] mr-4">
                            :
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[16px] font-gantari font-medium text-[#616161]">
                              No Document Available
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : showMilestones && currentProject ? (
          <div className="flex flex-col h-full bg-white">
            {/* Milestones Header */}
            <div className="relative flex items-center justify-center px-4 md:px-6 py-4 md:py-8 border-b border-slate-50">
              <button
                type="button"
                onClick={() => setShowMilestones(false)}
                className="absolute left-4 p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                title="Back"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                  Payment Milestones
                </h3>
                <p className="text-sm font-Gantari font-bold text-[#999999] mt-0.5">
                  {currentProject?.project_name ?? "Prestige Park Grove"}_Tower 1
                  to 09
                </p>
              </div>
              <button
                onClick={() => setShowAddMilestoneModal(true)}
                className="absolute right-4 md:right-6 flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-lg bg-[#DD4342] text-white font-Gantari font-bold text-[14px] md:text-[16px] shadow-sm transition-colors cursor-pointer"
                title="Add Milestone"
              >
                <img src={addBtnIcon} alt="Add" className="w-5 h-5" />
                Add Milestone
              </button>
            </div>

            {/* Milestones Content - No Scroll Version */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-10 custom-scrollbar">
              {/* Summary Cards */}
              {(() => {
                const totalAmount = milestones.reduce(
                  (sum, m) => sum + Number(m.milestone_amount || 0),
                  0,
                );
                const paidAmount = milestones
                  .filter((m) => (m.status || "").toLowerCase() === "paid")
                  .reduce((sum, m) => sum + Number(m.milestone_amount || 0), 0);
                const pendingAmount = totalAmount - paidAmount;
                const progressPercent =
                  totalAmount > 0
                    ? Math.round((paidAmount / totalAmount) * 100)
                    : 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="border border-[#AEACAC52] bg-[#F2F2F2] p-5 lg:p-6 rounded-md flex flex-col justify-between group hover:bg-[#DD4342]">
                      <p className="text-[#353535] text-[18px] font-Gantari font-semibold group-hover:text-[#F2F2F2] transition-colors whitespace-nowrap">
                        Total Amount
                      </p>
                      <p className="text-[#353535] text-[20px] text-center mt-3 font-Gantari font-bold group-hover:text-[#F2F2F2] transition-colors">
                        {totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="border border-[#AEACAC52] bg-[#F2F3F4] p-5 lg:p-6 rounded-md flex flex-col justify-between group hover:bg-[#DD4342]">
                      <p className="text-[#353535] text-[18px] font-Gantari font-semibold group-hover:text-[#F2F2F2] transition-colors whitespace-nowrap">
                        Paid Amount
                      </p>
                      <p className="text-[#353535] text-[20px] text-center mt-3 font-Gantari font-bold group-hover:text-[#F2F2F2] transition-colors">
                        {paidAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="border border-[#AEACAC52] bg-[#F2F3F4] p-5 lg:p-6 rounded-md flex flex-col justify-between group hover:bg-[#DD4342]">
                      <p className="text-[#333333] text-[18px] font-Gantari font-semibold group-hover:text-[#F2F2F2] transition-colors whitespace-nowrap">
                        Pending Amount
                      </p>
                      <p className="text-[#333333] text-[20px] text-center mt-3 font-Gantari font-bold group-hover:text-[#F2F2F2] transition-colors">
                        {pendingAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="border border-[#AEACAC52] bg-[#F2F3F4] p-5 lg:p-6 rounded-md flex flex-col justify-between group hover:bg-[#DD4342]">
                      <p className="text-[#333333] text-[18px] font-Gantari font-semibold group-hover:text-[#F2F2F2] transition-colors whitespace-nowrap">
                        Progress
                      </p>
                      <p className="text-[#333333] text-[20px] text-center mt-3 font-Gantari font-bold group-hover:text-[#F2F2F2] transition-colors">
                        {progressPercent}%
                      </p>
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
                <div className="flex-1 border border-[#E5E7EB] rounded-[8px] bg-white flex flex-col items-center justify-center text-center py-20">
                  <h4 className="text-[20px] font-Gantari font-bold text-[#353535] mb-3">
                    No Payment Milestones Found
                  </h4>
                  <p className="text-[16px] font-Gantari text-[#666666] mb-8">
                    Add your First Payment to get started with payment tracking
                  </p>
                  <button
                    onClick={() => setShowAddMilestoneModal(true)}
                    className="flex items-center gap-2 px-6 py-2 rounded-[5px] bg-[#DD4342] text-white font-Gantari font-medium text-[16px] hover:bg-[#c93a39] transition-colors cursor-pointer"
                  >
                    <img src={addBtnIcon} alt="Add" className="w-5 h-5" />
                    Add Milestone
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {milestones.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white border border-slate-100 rounded-[1.25rem] p-6 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[18px] font-Gantari font-bold text-[#1A1A1A] mb-1 truncate">
                          {m.milestone_name}
                        </h5>
                        <div className="flex items-center gap-6 text-[14px] font-Gantari text-[#999999]">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
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
                            <span>
                              Due:{" "}
                              {m.due_date
                                ? new Date(m.due_date).toLocaleDateString(
                                    "en-GB",
                                  )
                                : "-"}
                            </span>
                          </div>
                          {m.notes && (
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                                />
                              </svg>
                              <span className="truncate max-w-xs">
                                {m.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">
                            ${Number(m.milestone_amount).toLocaleString()}
                          </p>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-[12px] font-bold font-Gantari ${m.status === "Paid" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}
                          >
                            {m.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.status !== "Paid" && (
                            <button
                              onClick={() => {
                                api
                                  .post(`/api/milestones/${m.id}/mark-paid`)
                                  .then(
                                    () =>
                                      currentProject?.id &&
                                      fetchMilestones(currentProject.id),
                                  )
                                  .catch(() => {});
                              }}
                              className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Mark as Paid"
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
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this milestone?",
                                )
                              ) {
                                api
                                  .delete(`/api/milestones/${m.id}`)
                                  .then(
                                    () =>
                                      currentProject?.id &&
                                      fetchMilestones(currentProject.id),
                                  )
                                  .catch(() => {});
                              }
                            }}
                            className="p-2 rounded-lg bg-red-50 text-[#DD4342] hover:bg-red-100 transition-colors cursor-pointer"
                            title="Delete Milestone"
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
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[16px]  font-Gantari font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <img src={addBtnIcon} alt="Add" className="w-5 h-5" />
                  Create Project
                </button>
              )}
            </div>

            {/* Dashboard Content with Scrollbar */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-4 pl-4 pr-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredList.length === 0 ? (
                  <div className="col-span-full bg-slate-50 rounded-md border border-dashed border-slate-300 p-10 text-center text-slate-500">
                    No projects found.
                  </div>
                ) : (
                  filteredList.map((p) => {
                    // Use data directly from projects table
                    const progress = Math.round(p.progress ?? 0);

                    // Get members from project.member field (comma-separated string)
                    const memberIds = p.member
                      ? p.member
                          .split(",")
                          .map((m) => m.trim())
                          .filter(Boolean)
                          .map(Number)
                      : [];

                    const radius = 22;
                    const circumference = 2 * Math.PI * radius;
                    const offset =
                      circumference - (progress / 100) * circumference;

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-md border border-slate-200 p-2 pt-1 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-4 mt-2 pr-0">
                            <div className="relative flex items-center justify-center">
                              <svg className="w-12 h-12 md:w-16 md:h-16 transform -rotate-90">
                                <circle
                                  cx="50%"
                                  cy="50%"
                                  r={radius}
                                  stroke="#f1f5f9"
                                  strokeWidth="4"
                                  fill="transparent"
                                />
                                <circle
                                  cx="50%"
                                  cy="50%"
                                  r={radius}
                                  stroke="#0a9344"
                                  strokeWidth="4"
                                  fill="transparent"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={offset}
                                  strokeLinecap="round"
                                  style={{
                                    transition:
                                      "stroke-dashoffset 0.8s ease-in-out",
                                  }}
                                />
                              </svg>
                              <span className="absolute text-[12px] font-Gantari font-bold text-[#353535]">
                                {progress}%
                              </span>
                            </div>
                            <div className="relative project-menu-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuProjectId((prev) =>
                                    prev === p.id ? null : p.id,
                                  );
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
                                className={`absolute right-0 mt-3 w-56 bg-white/20 backdrop-blur-md rounded-md border border-[#595959]/50 shadow-xl transition-all origin-top-right ${openMenuProjectId === p.id ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuProjectId(null);
                                    setSearchParams({
                                      projectId: String(p.id),
                                    });
                                  }}
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
                                {(isTechnicalDirector || isManagement) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuProjectId(null);
                                      setCurrentProject(p);
                                      setShowMilestones(true);
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
                                  >
                                    <img
                                      src={paymentMilestoneIcon}
                                      alt="payment milestone"
                                      className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                    />
                                    <span className="text-[14px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
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
                                      setCreateBudget(
                                        p.budget
                                          ? `${p.budget}`
                                          : "Fetching...",
                                      );
                                      setCreateModuleName(p.module_name ?? "");
                                      setCreateClientName(
                                        clientsList.find(
                                          (c) =>
                                            String(c.id) ===
                                            String(p.client_name),
                                        )?.fullName ??
                                          clientsList.find(
                                            (c) =>
                                              String(c.id) ===
                                              String(p.client_name),
                                          )?.full_name ??
                                          p.client_name ??
                                          "",
                                      );
                                      setCreateProjectManager(
                                        p.project_manager
                                          ? p.project_manager
                                              .split(",")
                                              .map((s) => s.trim())
                                          : [],
                                      );
                                      setCreateStartDate(p.start_date ?? "");
                                      setCreateEndDate(p.end_date ?? "");
                                      setCreateTotalHours(p.total_hours ?? "");
                                      setCreatePerDay(p.per_day ?? "");
                                      setCreateDepartment(
                                        p.department === "Budget Ceiling" ||
                                          p.department === "Submission Deadline"
                                          ? p.department
                                          : "",
                                      );
                                      setCreateBudgetCeiling(
                                        p.budget_ceiling ?? "",
                                      );
                                      const biddingDate = p.bidding_end_date
                                        ? p.bidding_end_date.includes("T")
                                          ? p.bidding_end_date.split("T")[0]
                                          : p.bidding_end_date
                                        : "";
                                      setCreateBiddingEndDate(biddingDate);
                                      setCreateBIMLead(
                                        p.bim_lead
                                          ? p.bim_lead
                                              .split(",")
                                              .map((s) => s.trim())
                                          : [],
                                      );
                                      setCreateBIMCoOrdinator(
                                        p.bim_co_ordinator
                                          ? p.bim_co_ordinator
                                              .split(",")
                                              .map((s) => s.trim())
                                          : [],
                                      );
                                      setCreateMember(p.member ?? "");
                                      setCreateResources(p.resources ?? "");
                                      setCreateRequiredResources(
                                        p.required_resources ?? "",
                                      );
                                      setCreatePriority(p.priority ?? "");
                                      setCreateLocation(p.location ?? "");
                                      setCreateDescription(p.description ?? "");
                                      setShowEditModal(true);
                                      if (p.client_name) {
                                        import("../../lib/api").then(
                                          ({ default: api }) => {
                                            api
                                              .get<{
                                                client_budget: number | null;
                                              }>(
                                                `/api/vendors/client-budget?client_id=${p.client_name}`,
                                              )
                                              .then(({ data }) => {
                                                if (
                                                  data.client_budget !== null &&
                                                  data.client_budget !==
                                                    undefined
                                                ) {
                                                  setCreateBudget(
                                                    String(data.client_budget),
                                                  );
                                                }
                                              });
                                          },
                                        );
                                      }
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
                                  >
                                    <img
                                      src={editIcon}
                                      alt="edit"
                                      className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                    />
                                    <span className="text-[14px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
                                      Edit
                                    </span>
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => setDeleteProject(p)}
                                    className="w-full flex items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
                                  >
                                    <img
                                      src={deleteIcon}
                                      alt="delete"
                                      className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                    />
                                    <span className="text-[14px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
                                      Delete
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mb-2 ml-6 -mt-2 min-h-[45px] flex flex-col justify-center">
                            <h3 className="text-[18px] font-Gantari font-semibold text-[#1A1A1A] leading-tight">
                              {p.project_name ?? "Untitled Project"}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#E8E8E8] pt-4 mt-auto">
                          <div className="flex -space-x-4">
                            {(() => {
                              const projectEmployees = memberIds
                                .map((id) =>
                                  allEmployees.find(
                                    (e) => Number(e.id) === Number(id),
                                  ),
                                )
                                .filter(Boolean) as Employee[];

                              const visibleMembers = projectEmployees.slice(
                                0,
                                3,
                              );
                              const remainingCount = Math.max(
                                0,
                                projectEmployees.length - 3,
                              );

                              return (
                                <>
                                  {visibleMembers.map((emp) => {
                                    const profileUrl = emp.profile_picture
                                      ? getGlobalProfileUrl(
                                          emp.id,
                                          emp.profile_picture,
                                        )
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
                                              (
                                                e.target as HTMLImageElement
                                              ).src = ProfileIcon;
                                            }}
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[10px] font-bold text-slate-600">
                                            {(emp.full_name || "U")
                                              .charAt(0)
                                              .toUpperCase()}
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

                          <div className="flex items-center gap-3">
                            {p.priority && (
                              <div
                                className={`px-3.5 py-1 rounded-[8px] text-white text-[13px] font-bold font-Gantari shadow-sm ${
                                  p.priority.toLowerCase() === "high"
                                    ? "bg-[#DD4342]"
                                    : "bg-[#94D6F2]"
                                }`}
                              >
                                {p.priority}
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

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-white rounded-2xl border-2 border-gray-100 max-w-4xl w-full flex flex-col max-h-[85vh] overflow-hidden shadow-xl">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-8 py-6 border-b border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError("");
                }}
                className="absolute left-4 p-2 rounded-[5px] bg-[#F2F2F2] text-[#000000] cursor-pointer"
                title="Close"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
              </button>
              <h3 className="text-[24px] font-Gantari font-semibold text-[#000000]">
                Add New Project
              </h3>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCreateError("");
                  setCreateSubmitting(true);
                  const endpoint = createDepartment === "Submission Deadline" ? "/api/vendors/vendor-projects" : "/api/projects";
                  api
                    .post<{ success?: boolean; project_id?: number }>(
                      endpoint,
                      {
                        project_name: createName.trim(),
                        budget: createBudget || undefined,
                        modules: createModuleName || undefined,
                        client_id: (() => {
                          if (showOtherClient && otherClientValue)
                            return otherClientValue;
                          if (!createClientName) return undefined;
                          const byName = clientsList.find(
                            (c) =>
                              (c.fullName ?? c.full_name) === createClientName,
                          );
                          if (byName) return byName.id;
                          if (/^\d+$/.test(createClientName))
                            return Number(createClientName);
                          return undefined;
                        })(),
                        project_manager_id: namesToIds(
                          [
                            ...createProjectManager,
                            ...(showOtherPM && otherPMValue
                              ? [otherPMValue]
                              : []),
                          ],
                          projectManagers,
                        ),
                        lead_id: namesToIds(
                          [
                            ...createBIMLead,
                            ...(showOtherBIMLead && otherBIMLeadValue
                              ? [otherBIMLeadValue]
                              : []),
                          ],
                          bimLeads,
                        ),
                        bim_coordinator_id: namesToIds(
                          [
                            ...createBIMCoOrdinator,
                            ...(showOtherBIMCoord && otherBIMCoordValue
                              ? [otherBIMCoordValue]
                              : []),
                          ],
                          bimCoordinators,
                        ),
                        members:
                          selectedMemberIds.join(",") ||
                          createMember ||
                          undefined,
                        department: createDepartment || undefined,
                        ...(createDepartment === "Submission Deadline"
                          ? {
                              budget_ceiling: createBudgetCeiling || undefined,
                              bidding_end_date:
                                createBiddingEndDate || undefined,
                            }
                          : {}),
                        due_date: createEndDate || undefined,
                        start_date: createStartDate || undefined,
                        totalhours: createTotalHours || undefined,
                        perday: createPerDay || undefined,
                        resources: createResources || undefined,
                        required_resources:
                          createRequiredResources || undefined,
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
                        setShowOtherClient(false);
                        setOtherClientValue("");
                        setCreateProjectManager([]);
                        setShowOtherPM(false);
                        setOtherPMValue("");
                        setCreateStartDate("");
                        setCreateEndDate("");
                        setCreateTotalHours("");
                        setCreatePerDay("");
                        setCreateDepartment("");
                        setCreateBudgetCeiling("");
                        setCreateBiddingEndDate("");
                        setCreateBIMLead([]);
                        setShowOtherBIMLead(false);
                        setOtherBIMLeadValue("");
                        setCreateBIMCoOrdinator([]);
                        setShowOtherBIMCoord(false);
                        setOtherBIMCoordValue("");
                        setCreateMember("");
                        setSelectedMemberIds([]);
                        setCreatePriority("");
                        setCreateLocation("");
                        setCreateDescription("");
                        Promise.all([
                          api.get<{ projects?: Record<string, unknown>[] }>("/api/projects"),
                          api.get<{ projects?: Record<string, unknown>[] }>("/api/vendors/vendor-projects")
                        ])
                          .then(([res1, res2]) => {
                            const p1 = (res1.data.projects ?? []).map(mapApiProjectToProject);
                            const p2 = (res2.data.projects ?? []).map(mapApiProjectToProject);
                            setList([...p1, ...p2]);
                          })
                          .catch(() => {});
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 -mt-2">
                  {/* Project Name & Budget */}
                  <div className="space-y-2">
                    <label className="block text-[16px] font-medium text-[#000000]">
                      Project Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] transition-all focus:outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Your Project Name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[16px] font-medium text-[#000000]">
                      Budget <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      value={createBudget}
                      onChange={(e) => setCreateBudget(e.target.value)}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] transition-all focus:outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Project Budget"
                    />
                  </div>

                  {/* Client Name & Project Manager */}
                  <div className="space-y-2">
                    <label className="block text-[16px] font-medium text-[#000000]">
                      Client Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="Client Name"
                      placeholder="Nothing selected"
                      options={
                        clientsList
                          .map((c) => c.fullName ?? c.full_name ?? "")
                          .filter(Boolean) as string[]
                      }
                      value={createClientName}
                      showTick={false}
                      onChange={(v) => {
                        setCreateClientName(v);
                        setShowOtherClient(v === "Other");
                      }}
                    />
                    {showOtherClient && (
                      <input
                        type="text"
                        value={otherClientValue}
                        onChange={(e) => setOtherClientValue(e.target.value)}
                        className="w-full mt-2 px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] transition-all focus:outline-none focus:border-[#AEACAC52]"
                        placeholder="Enter Client Name"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[16px] font-medium text-[#000000]">
                      Select Source <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="relative dropdown-container">
                      <button
                        type="button"
                        onClick={() =>
                          setEditDropdownOpen((o) =>
                            o === "source" ? null : "source",
                          )
                        }
                        className={`w-full flex items-center justify-between px-4 py-2 text-[14px] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] focus:outline-none focus:border-[#AEACAC52] transition-all font-Gantari font-medium text-left cursor-pointer ${editDropdownOpen === "source" ? "!border-[#AEACAC52]" : ""}`}
                      >
                        <span
                          className={
                            createDepartment === "Budget Ceiling" ||
                            createDepartment === "Submission Deadline"
                              ? "text-gray-700"
                              : "text-gray-400"
                          }
                        >
                          {createDepartment === "Budget Ceiling"
                            ? "In House"
                            : createDepartment === "Submission Deadline"
                              ? "Outsource"
                              : "Select Source"}
                        </span>
                        <svg
                          className={`w-4 h-4 text-[#8B8B8B] shrink-0 transition-transform ${editDropdownOpen === "source" ? "rotate-180" : ""}`}
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
                      {editDropdownOpen === "source" && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg bg-white border border-[#E0E0E0] shadow-lg py-1 max-h-48 overflow-y-auto custom-scrollbar">
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment("");
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-[14px] font-Gantari cursor-pointer ${!createDepartment ? "bg-[#E2EEFF] text-[#1D7AFC]" : "text-gray-700"}`}
                          >
                            Select Source
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment("Budget Ceiling");
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-[14px] font-Gantari cursor-pointer ${createDepartment === "Budget Ceiling" ? "bg-[#E2EEFF] text-[#1D7AFC]" : "text-gray-700"}`}
                          >
                            In House
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment("Submission Deadline");
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-[14px] font-Gantari cursor-pointer ${createDepartment === "Submission Deadline" ? "bg-[#E2EEFF] text-[#1D7AFC]" : "text-gray-700"}`}
                          >
                            Outsource
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* In House Fields */}
                  {createDepartment === "Budget Ceiling" && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-[16px] font-medium text-[#000000]">
                          Select Project Manager{" "}
                          <span className="text-[#DD4342]">*</span>
                        </label>
                        <FormSelect
                          label="Select Project Manager"
                          placeholder="Nothing Selected"
                          options={
                            projectManagers
                              .map((e) => e.full_name ?? "")
                              .filter(Boolean) as string[]
                          }
                          value={createProjectManager}
                          isMulti={true}
                          onChange={(v) => {
                            setCreateProjectManager(v);
                            setShowOtherPM(v.includes("Other"));
                          }}
                        />
                        {showOtherPM && (
                          <input
                            type="text"
                            value={otherPMValue}
                            onChange={(e) => setOtherPMValue(e.target.value)}
                            className="w-full mt-2 px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] transition-all focus:outline-none focus:border-[#AEACAC52]"
                            placeholder="Enter Project Manager Name"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[16px] font-medium text-[#000000]">
                          Select BIM Lead{" "}
                          <span className="text-[#DD4342]">*</span>
                        </label>
                        <FormSelect
                          label="Select BIM Lead"
                          placeholder="Nothing Selected"
                          options={
                            bimLeads
                              .map((e) => e.full_name ?? "")
                              .filter(Boolean) as string[]
                          }
                          value={createBIMLead}
                          isMulti={true}
                          onChange={(v) => {
                            setCreateBIMLead(v);
                            setShowOtherBIMLead(v.includes("Other"));
                          }}
                        />
                        {showOtherBIMLead && (
                          <input
                            type="text"
                            value={otherBIMLeadValue}
                            onChange={(e) =>
                              setOtherBIMLeadValue(e.target.value)
                            }
                            className="w-full mt-2 px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] transition-all focus:outline-none focus:border-[#AEACAC52]"
                            placeholder="Enter BIM Lead Name"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[16px] font-medium text-[#000000]">
                          Select BIM Coordinator
                        </label>
                        <FormSelect
                          label="Select BIM Coordinator"
                          placeholder="Nothing Selected"
                          options={
                            bimCoordinators
                              .map((e) => e.full_name ?? "")
                              .filter(Boolean) as string[]
                          }
                          value={createBIMCoOrdinator}
                          isMulti={true}
                          onChange={(v) => {
                            setCreateBIMCoOrdinator(v);
                            setShowOtherBIMCoord(v.includes("Other"));
                          }}
                        />
                        {showOtherBIMCoord && (
                          <input
                            type="text"
                            value={otherBIMCoordValue}
                            onChange={(e) =>
                              setOtherBIMCoordValue(e.target.value)
                            }
                            className="w-full mt-2 px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] transition-all focus:outline-none focus:border-[#AEACAC52]"
                            placeholder="Enter BIM Coordinator Name"
                          />
                        )}
                      </div>
                    </>
                  )}

                  {/* Outsource Fields */}
                  {createDepartment === "Submission Deadline" && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-[16px] font-medium text-[#000000]">
                          Outsourcing Budget
                        </label>
                        <input
                          type="text"
                          className={`w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border-1 rounded-[5px] focus:outline-none transition-all font-Gantari font-medium text-[#353535] placeholder-[#8B8B8B] ${(() => {
                            const clientNum = parseBudgetValue(createBudget);
                            const outsourceNum =
                              parseBudgetValue(createBudgetCeiling);
                            return outsourceNum > clientNum
                              ? "border-[#DD4342] focus:border-[#DD4342]"
                              : "border-transparent focus:border-[#AEACAC52]";
                          })()}`}
                          placeholder="Enter Outsourcing Budget"
                          value={createBudgetCeiling}
                          onChange={(e) =>
                            setCreateBudgetCeiling(e.target.value)
                          }
                        />
                        {(() => {
                          const clientNum = parseBudgetValue(createBudget);
                          const outsourceNum =
                            parseBudgetValue(createBudgetCeiling);
                          if (
                            createBudgetCeiling.trim() &&
                            outsourceNum > clientNum
                          ) {
                            return (
                              <p className="text-[14px] font-Gantari font-medium text-[#DD4342] mt-1">
                                Outsourcing budget is exceeding. It should be
                                less than or equal to client budget.
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[16px] font-medium text-[#000000]">
                          Bidding End Date
                        </label>
                        <input
                          type="date"
                          className="w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] focus:outline-none focus:border-[#AEACAC52] transition-all font-Gantari font-medium text-[#353535] placeholder-[#8B8B8B]"
                          value={createBiddingEndDate}
                          onChange={(e) =>
                            setCreateBiddingEndDate(e.target.value)
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-center gap-4 pt-4 ">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-10 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold transition-all cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-10 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold transition-all cursor-pointer"
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
      {deleteProject !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            {/* Close Button */}
            {/* <div className="relative flex items-center justify-center mb-10"> */}
            <h3 className="text-[18px] font-Gantari font-semibold text-[#020202] mt-[12px] mb-3">
              Delete Project
            </h3>

            <button
              type="button"
              onClick={() => setDeleteProject(null)}
              className="absolute left-4 top-4 p-2 rounded-md bg-[#F2F2F2] text-gray-800 transition-colors"
              title="Close"
            >
              <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
            </button>
            {/* </div> */}
            {/* Content */}

            <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-10 text-center">
              Are you sure, you want to Delete this?
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-6 mb-6">
              <button
                type="button"
                onClick={() => setDeleteProject(null)}
                className="px-12 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!deleteProject) return;
                  const endpoint = deleteProject.source === "Outsource" ? `/api/vendors/vendor-projects/${deleteProject.id}` : `/api/projects/${deleteProject.id}`;
                  api
                    .delete(endpoint)
                    .then(({ data }) => {
                      if ((data as { success?: boolean }).success) {
                        Promise.all([
                          api.get<{ projects?: Record<string, unknown>[] }>("/api/projects"),
                          api.get<{ projects?: Record<string, unknown>[] }>("/api/vendors/vendor-projects")
                        ])
                          .then(([res1, res2]) => {
                            const p1 = (res1.data.projects ?? []).map(mapApiProjectToProject);
                            const p2 = (res2.data.projects ?? []).map(mapApiProjectToProject);
                            setList([...p1, ...p2]);
                          })
                          .catch(() => {});
                        setDeleteProject(null);
                      }
                    })
                    .catch(() => {});
                }}
                className="px-12 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
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
                className="absolute left-0 p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                title="Close"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
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
                api
                  .post("/api/milestones", {
                    project_id: currentProject.id,
                    milestone_name: milestoneName.trim(),
                    milestone_amount: milestoneAmount,
                    due_date: milestoneDueDate,
                    notes: milestoneNotes.trim(),
                    action: "add",
                  })
                  .then(() => {
                    setShowAddMilestoneModal(false);
                    setMilestoneName("");
                    setMilestoneAmount("");
                    setMilestoneDueDate("");
                    setMilestoneNotes("");
                    fetchMilestones(currentProject.id);
                  })
                  .catch(() => {});
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
                  type="number"
                  step="0.01"
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
                  className="px-12 py-3.5 rounded-[5px] bg-[#F1F1F1] text-[#666666] font-Gantari font-bold text-[16px] transition-all cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-12 py-3.5 rounded-lg bg-[#E2EEFF] text-[#1D7AFC] font-Gantari font-medium text-md transition-all cursor-pointer"
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
            <div className="relative flex items-center justify-center px-10 py-8 border-b border-gray-100">
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
                  setCreateProjectManager([]);
                  setCreateStartDate("");
                  setCreateEndDate("");
                  setCreateTotalHours("");
                  setCreatePerDay("");
                  setCreateDepartment("");
                  setCreateBIMLead([]);
                  setCreateBIMCoOrdinator([]);
                  setCreateMember("");
                  setCreateResources("");
                  setCreateRequiredResources("");
                  setCreatePriority("");
                  setCreateLocation("");
                  setCreateDescription("");
                }}
                className="absolute left-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
                title="Close"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
              </button>
              <h3 className="text-[24px] font-Gantari font-semibold text-[#000000]">
                Edit Project Details
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 pb-10 custom-scrollbar">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedProjectForEdit) return;
                  if (isEditSourceOutsource && createBudgetCeiling.trim()) {
                    const clientNum = parseBudgetValue(createBudget);
                    const outsourceNum = parseBudgetValue(createBudgetCeiling);
                    if (outsourceNum > clientNum) return;
                  }
                  const id = selectedProjectForEdit.id;
                  setIsEditSubmitting(true);
                  const endpoint = selectedProjectForEdit.source === "Outsource" ? `/api/vendors/vendor-projects/${id}` : `/api/projects/${id}`;
                  api
                    .patch(endpoint, {
                      project_name: createName.trim(),
                      budget: createBudget || undefined,
                      modules: createModuleName || undefined,
                      client_id: (() => {
                        if (showOtherClient && otherClientValue)
                          return otherClientValue;
                        if (!createClientName) return undefined;
                        const byName = clientsList.find(
                          (c) =>
                            (c.fullName ?? c.full_name) === createClientName,
                        );
                        if (byName) return byName.id;
                        if (/^\d+$/.test(createClientName))
                          return Number(createClientName);
                        return undefined;
                      })(),
                      project_manager_id: namesToIds(
                        [
                          ...createProjectManager,
                          ...(showOtherPM && otherPMValue
                            ? [otherPMValue]
                            : []),
                        ],
                        projectManagers,
                      ),
                      lead_id: namesToIds(
                        [
                          ...createBIMLead,
                          ...(showOtherBIMLead && otherBIMLeadValue
                            ? [otherBIMLeadValue]
                            : []),
                        ],
                        bimLeads,
                      ),
                      bim_coordinator_id: namesToIds(
                        [
                          ...createBIMCoOrdinator,
                          ...(showOtherBIMCoord && otherBIMCoordValue
                            ? [otherBIMCoordValue]
                            : []),
                        ],
                        bimCoordinators,
                      ),
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
                        Promise.all([
                          api.get<{ projects?: Record<string, unknown>[] }>("/api/projects"),
                          api.get<{ projects?: Record<string, unknown>[] }>("/api/vendors/vendor-projects")
                        ])
                          .then(([res1, res2]) => {
                            const p1 = (res1.data.projects ?? []).map(mapApiProjectToProject);
                            const p2 = (res2.data.projects ?? []).map(mapApiProjectToProject);
                            setList([...p1, ...p2]);
                          })
                          .catch(() => {});
                      }
                    })
                    .catch(() => {})
                    .finally(() => setIsEditSubmitting(false));
                }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {/* Row 1: Project name, Client name */}
                  <div className="space-y-2">
                    <label className="block text-[16px] font-Gantari font-medium text-[#000000]">
                      Project Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border-1 border-transparent rounded-lg focus:outline-none focus:border-[#AEACAC52] transition-all font-Gantari font-medium text-[#353535] placeholder-[#8B8B8B]"
                      placeholder="Enter Project name"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[16px] font-Gantari font-medium text-[#000000]">
                      Client Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border-1 border-transparent rounded-lg font-Gantari font-medium text-[#353535] cursor-not-allowed focus:outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Client Name"
                      value={createClientName}
                    />
                  </div>

                  {/* Row 2: Client Budget (read-only from contracts), Select source */}
                  <div className="space-y-2">
                    <label className="block text-[16px] font-Gantari font-medium text-[#000000]">
                      Client Budget
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border-1 border-transparent rounded-lg font-Gantari font-medium text-[#353535] cursor-not-allowed focus:outline-none focus:border-[#AEACAC52]"
                      placeholder="Auto-fetched from contract"
                      value={createBudget}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[16px] font-Gantari font-medium text-[#000000]">
                      Select Source
                    </label>
                    <div className="relative dropdown-container">
                      <button
                        type="button"
                        onClick={() =>
                          setEditDropdownOpen((o) =>
                            o === "source" ? null : "source",
                          )
                        }
                        className={`w-full flex items-center justify-between px-4 py-2 text-[14px] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] focus:outline-none focus:border-[#AEACAC52] transition-all font-Gantari font-medium text-left cursor-pointer ${editDropdownOpen === "source" ? "!border-[#AEACAC52]" : ""}`}
                      >
                        <span
                          className={
                            createDepartment === "Budget Ceiling" ||
                            createDepartment === "Submission Deadline"
                              ? "text-gray-700"
                              : "text-gray-400"
                          }
                        >
                          {createDepartment === "Budget Ceiling"
                            ? "In House"
                            : createDepartment === "Submission Deadline"
                              ? "Outsource"
                              : "Select Source"}
                        </span>
                        <svg
                          className={`w-4 h-4 text-[#8B8B8B] shrink-0 transition-transform ${editDropdownOpen === "source" ? "rotate-180" : ""}`}
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
                      {editDropdownOpen === "source" && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg bg-white border border-[#E0E0E0] shadow-lg py-1 max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment("");
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-[14px] font-Gantari cursor-pointer ${
                              !createDepartment
                                ? "bg-[#E2EEFF] text-[#1D7AFC]"
                                : "text-gray-700"
                            }`}
                          >
                            Select Source
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment("Budget Ceiling");
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-[14px] font-Gantari cursor-pointer ${
                              createDepartment === "Budget Ceiling"
                                ? "bg-[#E2EEFF] text-[#1D7AFC]"
                                : "text-gray-700"
                            }`}
                          >
                            In House
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment("Submission Deadline");
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-[14px] font-Gantari cursor-pointer ${
                              createDepartment === "Submission Deadline"
                                ? "bg-[#E2EEFF] text-[#1D7AFC]"
                                : "text-gray-700"
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
                        <label className="block text-[16px] font-Gantari font-medium text-[#000000]">
                          Select Project Manager
                        </label>
                        <FormSelect
                          label="Select Project Manager"
                          placeholder="Select Project Manager"
                          options={projectManagers
                            .map((pm) => pm.full_name ?? "")
                            .filter(Boolean)}
                          value={createProjectManager}
                          isMulti={true}
                          onChange={(v) => {
                            setCreateProjectManager(v);
                            setShowOtherPM(v.includes("Other"));
                          }}
                        />
                        {showOtherPM && (
                          <input
                            type="text"
                            value={otherPMValue}
                            onChange={(e) => setOtherPMValue(e.target.value)}
                            className="w-full mt-2 px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] transition-all focus:outline-none focus:border-[#AEACAC52]"
                            placeholder="Enter Project Manager Name"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Select BIM Lead
                        </label>
                        <FormSelect
                          label="Select BIM Lead"
                          placeholder="Select BIM Lead"
                          options={bimLeads
                            .map((lead) => lead.full_name ?? "")
                            .filter(Boolean)}
                          value={createBIMLead}
                          isMulti={true}
                          onChange={(v) => {
                            setCreateBIMLead(v);
                            setShowOtherBIMLead(v.includes("Other"));
                          }}
                        />
                        {showOtherBIMLead && (
                          <input
                            type="text"
                            value={otherBIMLeadValue}
                            onChange={(e) =>
                              setOtherBIMLeadValue(e.target.value)
                            }
                            className="w-full mt-2 px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] transition-all focus:outline-none focus:border-[#AEACAC52]"
                            placeholder="Enter BIM Lead Name"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Select BIM Coordinator
                        </label>
                        <FormSelect
                          label="Select BIM Coordinator"
                          placeholder="Select BIM Coordinator"
                          options={bimCoordinators
                            .map((coord) => coord.full_name ?? "")
                            .filter(Boolean)}
                          value={createBIMCoOrdinator}
                          isMulti={true}
                          onChange={(v) => {
                            setCreateBIMCoOrdinator(v);
                            setShowOtherBIMCoord(v.includes("Other"));
                          }}
                        />
                        {showOtherBIMCoord && (
                          <input
                            type="text"
                            value={otherBIMCoordValue}
                            onChange={(e) =>
                              setOtherBIMCoordValue(e.target.value)
                            }
                            className="w-full mt-2 px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-1 border-transparent rounded-[5px] transition-all focus:outline-none focus:border-[#AEACAC52]"
                            placeholder="Enter BIM Coordinator Name"
                          />
                        )}
                      </div>
                    </>
                  )}

                  {/* Outsource: Outsourcing Budget, Bidding End Date */}
                  {isEditSourceOutsource && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-[16px] font-Gantari font-medium text-[#000000]">
                          Outsourcing Budget
                        </label>
                        <input
                          type="text"
                          className={`w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border-1 rounded-lg focus:outline-none transition-all font-Gantari font-medium text-[#353535] placeholder-[#8B8B8B] ${(() => {
                            const clientNum = parseBudgetValue(createBudget);
                            const outsourceNum =
                              parseBudgetValue(createBudgetCeiling);
                            return outsourceNum > clientNum
                              ? "border-[#DD4342] focus:border-[#DD4342]"
                              : "border-transparent focus:border-[#AEACAC52]";
                          })()}`}
                          placeholder="Enter Outsourcing Budget"
                          value={createBudgetCeiling}
                          onChange={(e) =>
                            setCreateBudgetCeiling(e.target.value)
                          }
                        />
                        {(() => {
                          const clientNum = parseBudgetValue(createBudget);
                          const outsourceNum =
                            parseBudgetValue(createBudgetCeiling);
                          if (
                            createBudgetCeiling.trim() &&
                            outsourceNum > clientNum
                          ) {
                            return (
                              <p className="text-[14px] font-Gantari font-medium text-[#DD4342] mt-1">
                                Outsourcing budget is exceeding. It should be
                                less than or equal to client budget.
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[16px] font-Gantari font-medium text-[#000000]">
                          Bidding End Date
                        </label>
                        <input
                          type="date"
                          className="w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border-1 border-transparent rounded-lg focus:outline-none focus:border-[#AEACAC52] transition-all font-Gantari font-medium text-[#353535] placeholder-[#8B8B8B]"
                          value={createBiddingEndDate}
                          onChange={(e) =>
                            setCreateBiddingEndDate(e.target.value)
                          }
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
                      setCreateProjectManager([]);
                      setCreateStartDate("");
                      setCreateEndDate("");
                      setCreateTotalHours("");
                      setCreatePerDay("");
                      setCreateDepartment("");
                      setCreateBIMLead([]);
                      setCreateBIMCoOrdinator([]);
                      setCreateMember("");
                      setCreateResources("");
                      setCreateRequiredResources("");
                      setCreatePriority("");
                      setCreateLocation("");
                      setCreateDescription("");
                    }}
                    className="px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-Gantari font-semibold text-[16px] transition-all cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !!(
                        isEditSubmitting ||
                        (isEditSourceOutsource &&
                          createBudgetCeiling.trim() &&
                          parseBudgetValue(createBudgetCeiling) >
                            parseBudgetValue(createBudget))
                      )
                    }
                    className="px-8 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-Gantari font-semibold text-[16px] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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
                className="absolute left-4 p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                title="Close"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
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
                      ? getGlobalProfileUrl(emp.id, emp.profile_picture)
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
                              (e.target as HTMLImageElement).src = ProfileIcon;
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-600 font-bold text-lg">
                              {(emp.full_name || `E${emp.id}`)
                                .charAt(0)
                                .toUpperCase()}
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen overflow-y-auto p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col my-auto shrink-0">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowMemberProfileModal(false);
                  setSelectedMember(null);
                }}
                className="absolute left-4 p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                title="Close"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                View Details
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-10 py-8 custom-scrollbar">
              <div className="flex flex-col items-center">
                {selectedMember.profile_picture ? (
                  <img
                    src={getGlobalProfileUrl(
                      selectedMember.id,
                      selectedMember.profile_picture,
                    )}
                    alt={selectedMember.full_name || "Member"}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover mb-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = ProfileIcon;
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center mb-6">
                    <span className="text-slate-600 font-bold text-3xl">
                      {(selectedMember.full_name || `E${selectedMember.id}`)
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="w-full space-y-4">
                  <div>
                    <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                      Full Name
                    </p>
                    <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">
                      {selectedMember.full_name || "Not Available"}
                    </p>
                  </div>

                  {selectedMember.empid && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Employee ID
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.empid}
                      </p>
                    </div>
                  )}

                  {selectedMember.dob && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Date of Birth
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {new Date(selectedMember.dob).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "2-digit", year: "numeric" },
                        )}
                      </p>
                    </div>
                  )}

                  {selectedMember.phone_number && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Phone Number
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.phone_number}
                      </p>
                    </div>
                  )}

                  {selectedMember.email && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Email
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.email}
                      </p>
                    </div>
                  )}

                  {selectedMember.user_role && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Role
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.user_role}
                      </p>
                    </div>
                  )}

                  {selectedMember.address && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Address
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.address}
                      </p>
                    </div>
                  )}

                  {selectedMember.department && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Department
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.department}
                      </p>
                    </div>
                  )}

                  {selectedMember.doj && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Date of Joining
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {new Date(selectedMember.doj).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "2-digit", year: "numeric" },
                        )}
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
