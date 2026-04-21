import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
import api from "../../lib/api";
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";
import ProfileIcon from "../../assets/ProductNavbarIcons/Profile.svg";

import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import paymentMilestone from "../../assets/ProjectManager/project/paymentMilestone.svg";
import threedot from "../../assets/ProjectManager/project/threedot.svg";
import addBtnIcon from "../../assets/TechnicalDirector/add btn.svg";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import closeBtnIcon from "../../assets/ProductNavbarIcons/close button.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import downloadIcon from "../../assets/TechnicalDirector/download icon.svg";

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", label: "Saudi Riyal" },
  { code: "QAR", symbol: "﷼", label: "Qatari Riyal" },
  { code: "OMR", symbol: "﷼", label: "Omani Riyal" },
  { code: "BHD", symbol: ".د.ب", label: "Bahraini Dinar" },
  { code: "KWD", symbol: "د.ك", label: "Kuwaiti Dinar" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "CNY", symbol: "¥", label: "Chinese Yuan" },
  { code: "MYR", symbol: "RM", label: "Malaysian Ringgit" },
  { code: "THB", symbol: "฿", label: "Thai Baht" },
  { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah" },
];

interface Employee {
  id: number;
  full_name: string;
  employee_id: string;
  email: string;
  phone: string;
  user_role: string;
  vendor_type?: string;
  profile_picture?: string;
  active?: string | null;
}

const nameToId = (name: string, employeesList: Employee[]) => {
  if (!name || name === "Nothing Selected") return undefined;
  const trimmed = name.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const emp = employeesList.find((e) => e.full_name === trimmed);
  return emp ? emp.id : undefined;
};

const idToName = (
  id: string | number | undefined,
  employeesList: Employee[],
) => {
  if (id === undefined || id === null || id === "") return "";
  const emp = employeesList.find((e) => String(e.id) === String(id).trim());
  return emp ? emp.full_name : "";
};

const csvToDisplayNamesFromIds = (
  ids: string | undefined,
  employeesList: Employee[],
): string => {
  if (!ids) return "";
  return ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => idToName(id, employeesList) || id)
    .join(", ");
};

const nameOrCsvToIdCsv = (value: string, employeesList: Employee[]): string => {
  if (!value) return "";
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (/^\d+$/.test(item)) return item;
      const id = nameToId(item, employeesList);
      return id != null ? String(id) : "";
    })
    .filter(Boolean)
    .join(",");
};

const decodeHtmlEntities = (value: string): string => {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const normalizeProjectDescriptionHtml = (raw?: string): string => {
  if (!raw) return "";
  let normalized = raw;
  for (let i = 0; i < 2; i += 1) {
    const decoded = decodeHtmlEntities(normalized);
    if (decoded === normalized) break;
    normalized = decoded;
  }
  return normalized;
};

const hasProjectDescriptionContent = (raw?: string): boolean => {
  const normalized = normalizeProjectDescriptionHtml(raw);
  const text = normalized
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length > 0;
};

const getProjectDurationDays = (start: string, end: string): number | null => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate < startDate
  )
    return null;
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
  return diffDays > 0 ? diffDays : null;
};

const calculateTotalHours = (
  perDay: string,
  start: string,
  end: string,
): string => {
  const perDayNum = Number(perDay);
  if (Number.isNaN(perDayNum) || perDayNum <= 0) return "";
  const durationDays = getProjectDurationDays(start, end);
  if (!durationDays) return "";
  return (perDayNum * durationDays).toFixed(2);
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
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] font-Gantari transition-all outline-none cursor-pointer ${open ? "!border-[#AEACAC52]" : ""}`}
      >
        <span
          className={
            value ? "text-[#353535] font-medium" : "text-[#8B8B8B] font-medium"
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
        <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-white border border-[#E0E0E0] rounded-[5px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] overflow-hidden max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-[14px] font-Gantari transition-colors cursor-pointer  
                ${value === opt ? "bg-[#FFF2F2] text-[#DD4342]" : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F4F4F4]"}`}
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
  budget_ceiling?: string;
  module_name?: string;
  client_name?: string;
  project_manager?: string;
  project_manager_id?: string;
  project_manager_name?: string;
  start_date?: string;
  end_date?: string;
  total_hours?: string;
  per_day?: string;
  department?: string;
  bim_lead?: string;
  lead_id?: string;
  lead_name?: string;
  bim_co_ordinator?: string;
  bim_coordinator_id?: string;
  bim_coordinator_name?: string;
  member?: string;
  resources?: string;
  required_resources?: string;
  priority?: string;
  location?: string;
  description?: string;
  tasks?: string;
  document_attachment?: string;
  source?: "In House" | "Outsource";
  currency?: string;
  currency_locked?: boolean;
}

interface Milestone {
  id: number;
  milestone_name: string;
  milestone_amount: number;
  due_date: string;
  status: string;
  notes?: string;
}

export default function ProjectsBC() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBudget, setCreateBudget] = useState("");
  const [createCurrency, setCreateCurrency] = useState("INR");
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [moduleNameTags, setModuleNameTags] = useState<string[]>([]);
  const [moduleNameInput, setModuleNameInput] = useState("");
  // Edit modal tag states
  const [editModuleTags, setEditModuleTags] = useState<string[]>([]);
  const [editModuleInput, setEditModuleInput] = useState("");
  const [editTaskTags, setEditTaskTags] = useState<string[]>([]);
  const [editTaskInput, setEditTaskInput] = useState("");
  const [createTaskTags, setCreateTaskTags] = useState<string[]>([]);
  const [createTaskInput, setCreateTaskInput] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editMember, _setEditMember] = useState("");
  const [createClientName, setCreateClientName] = useState("");
  const [createProjectManager, setCreateProjectManager] = useState("");
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
  const [createTotalHours, setCreateTotalHours] = useState("");
  const [createPerDay, setCreatePerDay] = useState("");
  const [createDepartment, setCreateDepartment] = useState("");
  const [createBIMLead, setCreateBIMLead] = useState("");
  const [createBIMCoOrdinator, setCreateBIMCoOrdinator] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [removedFiles, setRemovedFiles] = useState<string[]>([]);

  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showProjectView, setShowProjectView] = useState(
    !!searchParams.get("projectId"),
  );
  const [selectedProjectForView, setSelectedProjectForView] =
    useState<Project | null>(null);
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [allMembersList, setAllMembersList] = useState<Employee[]>([]);
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Employee | null>(null);
  const [pmTaskStats, setPmTaskStats] = useState({
    todo: 0,
    inProgress: 0,
    paused: 0,
    completed: 0,
  });
  const [pmTaskStatsLoading, setPmTaskStatsLoading] = useState(false);

  useEffect(() => {
    const computedTotal = calculateTotalHours(
      createPerDay,
      createStartDate,
      createEndDate,
    );
    if (computedTotal) setCreateTotalHours(computedTotal);
  }, [createPerDay, createStartDate, createEndDate]);

  // Add Project Form State (Restoring used ones)
  const [createResources, setCreateResources] = useState("");
  const [createRequiredResources, setCreateRequiredResources] = useState("");
  const [createPriority, setCreatePriority] = useState("");
  const [createLocation, setCreateLocation] = useState("");

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

  // Select Options States
  const [projectManagers, setProjectManagers] = useState<string[]>([]);
  const [bimLeads, setBimLeads] = useState<string[]>([]);
  const [bimCoordinators, setBimCoordinators] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const priorityOptions = ["High", "Low", "Normal"];
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch employees + departments once at mount so View modal can resolve names
  useEffect(() => {
    let isMounted = true;
    const fetchEmployeesAndDepartments = async () => {
      try {
        const [empRes, depRes] = await Promise.all([
          api.get("/api/employees"),
          api.get("/api/departments"),
        ]);
        if (isMounted) {
          const empData: Employee[] = empRes.data.employees || [];
          const selectable = empData.filter(
            isEmployeeActiveForProjectAssignment,
          );
          const roleOf = (e: Employee) =>
            String(e.user_role || "")
              .toLowerCase()
              .trim();
          setProjectManagers(
            selectable
              .filter((e) => {
                const role = roleOf(e);
                return role.includes("project manager");
              })
              .map((e) => e.full_name),
          );
          setBimLeads(
            selectable
              .filter((e) => {
                const role = roleOf(e);
                return role.includes("bim lead");
              })
              .map((e) => e.full_name),
          );
          setBimCoordinators(
            selectable
              .filter((e) => {
                const role = roleOf(e);
                return role.includes("coordinator");
              })
              .map((e) => e.full_name),
          );
          setAllEmployees(empData);
          setDepartments(depRes.data.departments || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchEmployeesAndDepartments();
    return () => {
      isMounted = false;
    };
  }, []);

  // On Create modal open, reset tags
  useEffect(() => {
    if (showCreateModal) {
      setSelectedMemberIds([]);
    }
  }, [showCreateModal]);

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

  const panelType = user?.panel_type ?? 3;
  const isManagement = panelType === 1;
  const isTechnicalDirector = user?.user_role === "Technical Director";
  const canCreate = isManagement;
  const canEdit = panelType !== 3;
  const canDelete = isManagement;
  const title = isManagement ? "Projects" : "Projects Involved";
  const mapApiProjectToProject = (r: any): Project => ({
    id: r.id,
    project_name: r.project_name,
    progress: r.progress ?? 0,
    total_tasks: r.total_tasks ?? 0,
    completed_tasks: r.completed_tasks ?? 0,
    priority: r.priority ?? "Normal",
    budget: r.budget,
    budget_ceiling:
      r.budget_ceiling != null ? String(r.budget_ceiling) : undefined,
    currency:
      r.selected_currency != null &&
      String(r.selected_currency).trim().length > 0
        ? String(r.selected_currency)
        : r.currency != null
          ? String(r.currency)
          : "INR",
    currency_locked:
      r.selected_currency != null &&
      String(r.selected_currency).trim().length > 0,
    module_name: r.modules,
    client_name: r.client_name,
    project_manager:
      r.project_manager_name != null
        ? String(r.project_manager_name)
        : r.project_manager_id != null
          ? String(r.project_manager_id)
          : undefined,
    project_manager_id:
      r.project_manager_id != null ? String(r.project_manager_id) : undefined,
    project_manager_name:
      r.project_manager_name != null
        ? String(r.project_manager_name)
        : undefined,
    bim_lead: r.lead_id != null ? String(r.lead_id) : undefined,
    lead_id: r.lead_id != null ? String(r.lead_id) : undefined,
    lead_name:
      r.lead_name != null
        ? String(r.lead_name)
        : r.bim_lead_name != null
          ? String(r.bim_lead_name)
          : undefined,
    bim_co_ordinator:
      r.bim_coordinator_id != null ? String(r.bim_coordinator_id) : undefined,
    bim_coordinator_id:
      r.bim_coordinator_id != null ? String(r.bim_coordinator_id) : undefined,
    bim_coordinator_name:
      r.bim_coordinator_name != null
        ? String(r.bim_coordinator_name)
        : undefined,
    start_date: r.start_date,
    end_date: r.end_date ?? r.due_date,
    total_hours: r.totalhours,
    per_day: r.perday,
    department:
      r.department_name != null
        ? String(r.department_name)
        : r.department != null
          ? String(r.department)
          : undefined,
    member: r.members,
    resources: r.resources,
    required_resources: r.required_resources,
    location: r.location,
    description: r.description,
    tasks: r.tasks,
    document_attachment: r.document_attachment,
  });

  // Fetch task status counts for the selected project
  useEffect(() => {
    const projectId = showProjectView ? selectedProjectForView?.id : undefined;
    if (!projectId) {
      setPmTaskStats({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
      setPmTaskStatsLoading(false);
      return;
    }
    setPmTaskStatsLoading(true);
    let cancelled = false;

    const isOutsource =
      selectedProjectForView?.source === "Outsource" ||
      searchParams.get("source") === "Outsource";
    const statsApi = isOutsource
      ? `/api/vendors/vendor-projects/${projectId}/module-progress`
      : `/api/projects/${projectId}/module-progress`;

    api
      .get<{
        status_counts?: {
          todo?: number;
          inprogress?: number;
          paused?: number;
          completed?: number;
        };
      }>(statsApi)
      .then(({ data }) => {
        if (cancelled) return;
        const c = data?.status_counts ?? {};
        setPmTaskStats({
          todo: Number(c.todo ?? 0),
          inProgress: Number(c.inprogress ?? 0),
          paused: Number(c.paused ?? 0),
          completed: Number(c.completed ?? 0),
        });
      })
      .catch(() => {
        if (cancelled) return;
        const completed = selectedProjectForView?.completed_tasks ?? 0;
        const total = selectedProjectForView?.total_tasks ?? 0;
        setPmTaskStats({
          todo: Math.max(0, total - completed),
          inProgress: 0,
          paused: 0,
          completed,
        });
      })
      .finally(() => {
        if (!cancelled) setPmTaskStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    showProjectView,
    selectedProjectForView?.id,
    selectedProjectForView?.source,
    searchParams,
  ]);

  const fetchProjects = () => {
    const status = searchParams.get("status");
    const params = { status: status || undefined };

    setLoading(true);
    Promise.all([
      api.get<{ projects?: Record<string, unknown>[] }>("/api/projects", {
        params,
      }),
      api.get<{ projects?: Record<string, unknown>[] }>(
        "/api/vendors/vendor-projects",
        { params },
      ),
    ])
      .then(([res1, res2]) => {
        const internal = (res1.data.projects ?? []).map((p) => ({
          ...p,
          source: "In House",
        }));
        const vendor = (res2.data.projects ?? []).map((p) => ({
          ...p,
          source: "Outsource",
        }));

        const allProjects = [...internal, ...vendor];

        const userId = user?.id;
        const filtered = userId
          ? allProjects.filter((p: any) => {
              if (!p.bim_coordinator_id) return false;
              return String(p.bim_coordinator_id)
                .split(",")
                .map((s: string) => s.trim())
                .includes(String(userId));
            })
          : allProjects;
        setList(filtered.map(mapApiProjectToProject));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, [searchParams]);

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

    const existingProject = list.find((p) => p.id === id);
    if (existingProject) {
      setSelectedProjectForView(existingProject);
      setShowProjectView(true);
    } else if (!showProjectView) {
      setShowProjectView(true);
    }

    const source = searchParams.get("source") || "In House";
    const baseApi =
      source === "Outsource" ? "/api/vendors/vendor-projects" : "/api/projects";

    api
      .get<Record<string, unknown>>(`${baseApi}/${id}`)
      .then(({ data }) => {
        setSelectedProjectForView(mapApiProjectToProject(data));
      })
      .catch(() => {
        if (!existingProject) {
          setSearchParams({}, { replace: true });
          setShowProjectView(false);
        }
      });
  }, [searchParams, list, setSearchParams]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white h-full overflow-hidden">
      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl bg-white border border-gray-100 min-w-[320px] animate-in fade-in slide-in-from-top-2 duration-300 font-gantari">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#1A8A47] shrink-0">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span className="text-[16px] font-semibold text-[#353535]">
            {successMsg}
          </span>
        </div>
      )}
      <div className="flex flex-col h-full overflow-hidden min-h-0">
        {/* Main Content View Switcher */}
        {showProjectView && selectedProjectForView ? (
          <div className="flex flex-col h-full bg-white">
            {/* Project View Header */}
            <div className="relative flex items-center justify-center px-4 md:px-6 py-2 border-b border-slate-50">
              <div className="absolute left-4 group">
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectView(false);
                    setSelectedProjectForView(null);
                    setSearchParams({}, { replace: true });
                  }}
                  className="p-2 rounded-md bg-[#F2F2F2] text-[#000000] cursor-pointer"
                >
                  <img src={backIcon} alt="Back" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-1 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#000000]">
                  {selectedProjectForView.project_name ?? "Loading..."}
                </h3>
                <div className="flex items-center justify-center gap-2 md:gap-3 mt-0.5">
                  <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#353535]"></span>
                  <p className="text-[14px] md:text-[14px] font-Gantari font-semibold text-[#353535]">
                    Overall Progress Tracker
                  </p>
                </div>
              </div>
            </div>

            {/* Project View Content */}
            <div className="flex-1 flex flex-col overflow-hidden mt-4">
              <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-4 pb-6 px-5">
                {/* Task Status Cards - Static at top */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 shrink-0">
                  {/* To Do Tasks */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/bc/teamtasks?status=todo" +
                          (selectedProjectForView?.project_name
                            ? `?project=${encodeURIComponent(selectedProjectForView.project_name)}`
                            : ""),
                      )
                    }
                    className="text-left bg-[#F2F2F2] p-2 rounded-md flex flex-col h-[100px] md:h-[80px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-[#AEACAC52]"
                  >
                    <div className="flex items-center justify-left mb-2">
                      <p className="text-[#353535] group-hover:text-white text-[18px] font-Gantari font-semibold">
                        To Do Tasks
                      </p>
                    </div>
                    <p className="text-[#353535] group-hover:text-white text-[20px] font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {pmTaskStatsLoading ? "..." : pmTaskStats.todo}
                    </p>
                  </button>

                  {/* In Progress Tasks */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/bc/teamtasks?status=in_progress" +
                          (selectedProjectForView?.project_name
                            ? `?project=${encodeURIComponent(selectedProjectForView.project_name)}`
                            : ""),
                      )
                    }
                    className="text-left bg-[#F2F2F2] p-2 rounded-md flex flex-col h-[100px] md:h-[80px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-[#AEACAC52]"
                  >
                    <div className="flex items-center justify-left mb-2">
                      <p className="text-[#353535] group-hover:text-white text-[18px] font-Gantari font-semibold">
                        In Progress Tasks
                      </p>
                    </div>
                    <p className="text-[#353535] group-hover:text-white text-[20px] font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {pmTaskStatsLoading ? "..." : pmTaskStats.inProgress}
                    </p>
                  </button>

                  {/* Paused Tasks */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/bc/teamtasks?status=paused" +
                          (selectedProjectForView?.project_name
                            ? `?project=${encodeURIComponent(selectedProjectForView.project_name)}`
                            : ""),
                      )
                    }
                    className="text-left bg-[#F2F2F2] p-2 rounded-md flex flex-col h-[100px] md:h-[80px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-[#AEACAC52]"
                  >
                    <div className="flex items-center justify-left mb-2">
                      <p className="text-[#353535] group-hover:text-white text-[18px] font-Gantari font-semibold">
                        Paused Tasks
                      </p>
                    </div>
                    <p className="text-[#353535] group-hover:text-white text-[20px] font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {pmTaskStatsLoading ? "..." : pmTaskStats.paused}
                    </p>
                  </button>

                  {/* Completed Tasks */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/bc/teamtasks?status=completed" +
                          (selectedProjectForView?.project_name
                            ? `?project=${encodeURIComponent(selectedProjectForView.project_name)}`
                            : ""),
                      )
                    }
                    className="text-left bg-[#F2F2F2] p-2 rounded-md flex flex-col h-[100px] md:h-[80px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-[#AEACAC52]"
                  >
                    <div className="flex items-center justify-left mb-2">
                      <p className="text-[#353535] group-hover:text-white text-[18px] font-Gantari font-semibold">
                        Completed Tasks
                      </p>
                    </div>
                    <p className="text-[#353535] group-hover:text-white text-[20px] font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                      {pmTaskStatsLoading ? "..." : pmTaskStats.completed}
                    </p>
                  </button>
                </div>

                {/* Tower Progress Grid */}
                <div className="border border-[#AEACAC52] rounded-md px-4 ">
                  <h4 className="text-[20px] font-Gantari font-semibold text-[#000000] px-4 md:px-5 lg:px-2 pt-6 md:pt-8 lg:pt-2">
                    Modules
                  </h4>
                  <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-6 md:p-8 lg:p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-4">
                      {selectedProjectForView.module_name ? (
                        selectedProjectForView.module_name
                          .split(",")
                          .map((mod, i) => {
                            const modProgress = Math.round(
                              selectedProjectForView.progress ?? 0,
                            );
                            const statusColor =
                              modProgress >= 80
                                ? "#008F22"
                                : modProgress >= 50
                                  ? "#EB7200"
                                  : "#E00100";
                            const statusBg =
                              modProgress >= 80
                                ? "bg-[#E0FFE8]"
                                : modProgress >= 50
                                  ? "bg-[#FFEAD6]"
                                  : "bg-[#FFD9D9]";
                            const statusLabel =
                              modProgress >= 80
                                ? "Approved"
                                : modProgress >= 50
                                  ? "Pending"
                                  : "Review";
                            return (
                              <div
                                key={i}
                                className="bg-white border border-[#AEACAC52] rounded-md p-2 flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[120px]"
                              >
                                <div className="flex justify-between items-start">
                                  <h5 className="text-[18px] font-Gantari font-bold text-[#1A1A1A] truncate pr-2">
                                    {mod.trim()}
                                  </h5>
                                  <div
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md shrink-0 ${statusBg}`}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: statusColor }}
                                    ></span>
                                    <span
                                      className="text-[12px] font-bold font-Gantari"
                                      style={{ color: statusColor }}
                                    >
                                      {statusLabel}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                  <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                                    <svg
                                      className="w-full h-full transform -rotate-90"
                                      viewBox="0 0 64 64"
                                    >
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
                                          163.36 - (modProgress / 100) * 163.36
                                        }
                                        strokeLinecap="round"
                                        style={{
                                          transition:
                                            "stroke-dashoffset 1s ease-in-out",
                                        }}
                                      />
                                    </svg>
                                    <span className="absolute text-[14px] font-bold text-[#8B8B8B] font-Gantari">
                                      {modProgress}%
                                    </span>
                                  </div>

                                  <div className="flex flex-col items-end">
                                    <p className="text-[14px] font-medium text-[#8B8B8B] font-Gantari mb-1">
                                      Tasks Done
                                    </p>
                                    <div className="flex items-baseline border-t border-slate-100 pt-1">
                                      <p className="text-[18px] font-bold text-[#353535] font-Gantari">
                                        {selectedProjectForView.completed_tasks ??
                                          0}
                                      </p>
                                      <p className="text-[14px] font-bold text-[#8B8B8B] font-Gantari">
                                        /
                                        {selectedProjectForView.total_tasks ??
                                          0}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <div className="col-span-full py-8 text-center text-gray-500 font-Gantari">
                          Currently, no modules have been added.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Project Description */}
                <div className="border border-[#AEACAC52] rounded-md p-6 md:p-8 lg:p-4">
                  <h4 className="text-[20px] font-Gantari font-semibold text-[#000000]">
                    Project Description
                  </h4>
                  {hasProjectDescriptionContent(
                    selectedProjectForView.description,
                  ) ? (
                    <div
                      className="text-[14px] font-Gantari font-medium text-[#666666] mt-4 leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:max-w-full [&_*]:whitespace-normal [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#DD4342] [&_a]:underline"
                      dangerouslySetInnerHTML={{
                        __html: normalizeProjectDescriptionHtml(
                          selectedProjectForView.description,
                        ),
                      }}
                    />
                  ) : (
                    <p className="text-[14px] font-Gantari font-medium text-[#666666] mt-4 leading-relaxed">
                      This project involves comprehensive BIM modeling and
                      coordination for the selected facility, ensuring all
                      architectural, structural, and MEP systems are perfectly
                      aligned according to international standards.
                    </p>
                  )}
                </div>

                {/* Team Overview Section */}
                <div className="border border-slate-200 rounded-xl md:rounded-xl p-6 lg:p-4">
                  <h4 className="text-xl font-Gantari font-semibold text-[#000000] mb-8">
                    Team Overview
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 md:gap-12 items-start">
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
                          ? String(selectedProjectForView.project_manager_name)
                              .split(",")
                              .map((n) => n.trim())
                              .filter(Boolean)
                          : [];

                      if (pmIds.length === 0 && pmNames.length === 0) {
                        return (
                          <div className="min-w-0">
                            <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">
                              Project Manager
                            </p>
                            <div className="flex items-center -space-x-3">
                              <div
                                className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center shrink-0 shadow-sm relative z-0"
                                title="Not assigned"
                              >
                                <span className="text-slate-600 text-xs font-bold">
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
                          const dName = pmEmp?.full_name || pName || "Unknown";
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
                                  <img
                                    src={visiblePm[0].url}
                                    className="w-full h-full object-cover"
                                    alt=""
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        ProfileIcon;
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                    {visiblePm[0].dName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-Gantari font-medium text-[#616161] truncate">
                                {visiblePm[0].dName}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center -space-x-3">
                              {visiblePm.map((entry) => (
                                <div
                                  key={entry.key}
                                  className="relative group shrink-0"
                                >
                                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm relative z-0">
                                    {entry.url ? (
                                      <img
                                        src={entry.url}
                                        className="w-full h-full object-cover"
                                        alt=""
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src =
                                            ProfileIcon;
                                        }}
                                      />
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
                          const dName = blEmp?.full_name || pName || "Unknown";
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
                                  <img
                                    src={visibleBl[0].url}
                                    className="w-full h-full object-cover"
                                    alt=""
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        ProfileIcon;
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                    {visibleBl[0].dName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-Gantari font-medium text-[#616161] truncate">
                                {visibleBl[0].dName}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center -space-x-3">
                              {visibleBl.map((entry) => (
                                <div
                                  key={entry.key}
                                  className="relative group shrink-0"
                                >
                                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm relative z-0">
                                    {entry.url ? (
                                      <img
                                        src={entry.url}
                                        className="w-full h-full object-cover"
                                        alt=""
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src =
                                            ProfileIcon;
                                        }}
                                      />
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

                    {/* BIM Coordinator */}
                    {(() => {
                        const bcIds = selectedProjectForView.bim_coordinator_id
                          ? String(selectedProjectForView.bim_coordinator_id)
                              .split(",")
                              .map((id) => id.trim())
                              .filter(Boolean)
                          : [];
                        const bcNames = selectedProjectForView.bim_coordinator_name
                          ? String(selectedProjectForView.bim_coordinator_name)
                              .split(",")
                              .map((n) => n.trim())
                              .filter(Boolean)
                          : [];

                        if (bcIds.length === 0 && bcNames.length === 0) {
                          return (
                            <div className="min-w-0">
                              <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">
                                BIM Coordinator
                              </p>
                              <div className="flex items-center -space-x-3">
                                <div
                                  className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center shrink-0 shadow-sm relative z-0"
                                  title="Not assigned"
                                >
                                  <span className="text-slate-600 text-xs font-bold">
                                    BC
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const maxCount = Math.max(bcIds.length, bcNames.length);
                        const bcEntries = Array.from({ length: maxCount }).map(
                          (_, i) => {
                            const pId = bcIds[i];
                            const pName = bcNames[i];
                            const bcEmp = pId
                              ? allEmployees.find((e: any) => String(e.id) === pId)
                              : null;
                            const dName = bcEmp?.full_name || pName || "Unknown";
                            const url = bcEmp?.profile_picture
                              ? getGlobalProfileUrl(bcEmp.id, bcEmp.profile_picture)
                              : null;
                            return { key: i, dName, url };
                          }
                        );
                        const visibleBc = bcEntries.slice(0, 3);
                        const bcRemaining = Math.max(0, bcEntries.length - 3);
                        const bcOverflowTitle =
                          bcRemaining > 0
                            ? bcEntries
                                .slice(3)
                                .map((e) => e.dName)
                                .join(", ")
                            : undefined;

                        return (
                          <div className="min-w-0">
                            <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">
                              {maxCount > 1 ? "BIM Coordinators" : "BIM Coordinator"}
                            </p>
                            {maxCount === 1 ? (
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0">
                                  {visibleBc[0].url ? (
                                    <img
                                      src={visibleBc[0].url}
                                      className="w-full h-full object-cover"
                                      alt=""
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          ProfileIcon;
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                      {visibleBc[0].dName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm font-Gantari font-medium text-[#616161] truncate">
                                  {visibleBc[0].dName}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center -space-x-3">
                                {visibleBc.map((entry) => (
                                  <div key={entry.key} className="relative group shrink-0">
                                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm relative z-0">
                                      {entry.url ? (
                                        <img
                                          src={entry.url}
                                          className="w-full h-full object-cover"
                                          alt=""
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                              ProfileIcon;
                                          }}
                                        />
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
                                {bcRemaining > 0 && (
                                  <div className="relative group shrink-0">
                                    <div className="relative z-10 w-9 h-9 md:w-10 md:h-10 min-w-[2.25rem] min-h-[2.25rem] md:min-w-[2.5rem] md:min-h-[2.5rem] rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm shrink-0 select-none">
                                      +{bcRemaining}
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                      {bcOverflowTitle}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    {/* Department Involved
                    <div className="flex flex-col gap-3">
                      <p className="text-md font-Gantari font-semibold text-[#000000]">
                        BIM Coordinator
                      </p>
                      <p className="text-sm font-Gantari text-[#616161] truncate">
                        {selectedProjectForView.bim_coordinator_name || "N/A"}
                      </p>
                    </div> */}

                    {/* Members Involved */}
                    <div className="flex flex-col gap-3">
                      <p className="text-md font-Gantari font-semibold text-[#000000]">
                        Members Involved
                      </p>
                      {(() => {
                        const memberIdsForView = selectedProjectForView.member
                          ? selectedProjectForView.member
                              .split(",")
                              .map((s) => parseInt(s.trim(), 10))
                              .filter((n) => !isNaN(n))
                          : [];

                        if (memberIdsForView.length === 0) {
                          return (
                            <p className="text-sm font-Gantari font-bold text-[#999999]">
                              N/A
                            </p>
                          );
                        }

                        return memberIdsForView.length === 1 ? (
                          <div className="flex items-center gap-3">
                            {(() => {
                              const id = memberIdsForView[0];
                              const emp = allEmployees.find(
                                (e) =>
                                  Number(e.id) === Number(id) ||
                                  String(e.id) === String(id),
                              );
                              const url = emp?.profile_picture
                                ? getGlobalProfileUrl(
                                    emp.id,
                                    emp.profile_picture,
                                  )
                                : null;
                              return (
                                <>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                    onClick={() => {
                                      if (emp) {
                                        setSelectedMember(emp);
                                        setShowMemberProfileModal(true);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && emp) {
                                        setSelectedMember(emp);
                                        setShowMemberProfileModal(true);
                                      }
                                    }}
                                  >
                                    {url ? (
                                      <img
                                        src={url}
                                        alt={emp?.full_name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <img
                                        src={ProfileIcon}
                                        alt={emp?.full_name}
                                        className="w-full h-full object-cover p-1"
                                      />
                                    )}
                                  </div>
                                  <span className="text-sm font-Gantari font-medium text-[#616161] truncate">
                                    {emp?.full_name || "Unknown"}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center -space-x-4">
                            {memberIdsForView.slice(0, 3).map((id, j) => {
                              const emp = allEmployees.find(
                                (e) =>
                                  Number(e.id) === Number(id) ||
                                  String(e.id) === String(id),
                              );
                              const url = emp?.profile_picture
                                ? getGlobalProfileUrl(
                                    emp.id,
                                    emp.profile_picture,
                                  )
                                : null;
                              return (
                                <div
                                  key={j}
                                  className="relative group shrink-0"
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className="relative z-0 w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                    onClick={() => {
                                      if (emp) {
                                        setSelectedMember(emp);
                                        setShowMemberProfileModal(true);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && emp) {
                                        setSelectedMember(emp);
                                        setShowMemberProfileModal(true);
                                      }
                                    }}
                                  >
                                    {url ? (
                                      <img
                                        src={url}
                                        alt={emp?.full_name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <img
                                        src={ProfileIcon}
                                        alt={emp?.full_name}
                                        className="w-full h-full object-cover p-1"
                                      />
                                    )}
                                  </div>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
                                    {emp?.full_name || "Unknown"}
                                  </div>
                                </div>
                              );
                            })}
                            {memberIdsForView.length > 3 && (
                              <div className="relative group shrink-0">
                                <div
                                  role="button"
                                  tabIndex={0}
                                  className="relative z-10 w-9 h-9 md:w-10 md:h-10 min-w-[2.25rem] min-h-[2.25rem] md:min-w-[2.5rem] md:min-h-[2.5rem] rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm shrink-0 cursor-pointer hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all select-none"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const emps = memberIdsForView
                                      .map((id) =>
                                        allEmployees.find(
                                          (e) =>
                                            Number(e.id) === Number(id) ||
                                            String(e.id) === String(id),
                                        ),
                                      )
                                      .filter(Boolean) as Employee[];
                                    setAllMembersList(emps);
                                    setShowAllMembersModal(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      const emps = memberIdsForView
                                        .map((id) =>
                                          allEmployees.find(
                                            (e) =>
                                              Number(e.id) === Number(id) ||
                                              String(e.id) === String(id),
                                          ),
                                        )
                                        .filter(Boolean) as Employee[];
                                      setAllMembersList(emps);
                                      setShowAllMembersModal(true);
                                    }
                                  }}
                                >
                                  +{memberIdsForView.length - 3}
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

                {/* Project Details Section */}
                <div className="rounded-lg border border-slate-200 p-6 md:p-4">
                  <h4 className="text-xl font-Gantari font-semibold text-[#1A1A1A] mb-8">
                    Project Details
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 md:gap-y-6 lg:gap-x-20">
                    <div className="space-y-4 md:space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Client Name
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
                          :
                        </span>
                        <span className="text-md font-Gantari font-medium text-[#666666]">
                          {selectedProjectForView.client_name || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Actual Start Date
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
                          :
                        </span>
                        <span className="text-md font-Gantari font-medium text-[#666666]">
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
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Total Project Hours
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
                          :
                        </span>
                        <span className="text-md font-Gantari font-medium text-[#666666]">
                          {selectedProjectForView.total_hours
                            ? `${selectedProjectForView.total_hours}hrs`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Budget
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
                          :
                        </span>
                        <span className="text-md font-Gantari font-medium text-[#666666]">
                          {selectedProjectForView.budget
                            ? `${CURRENCIES.find((c) => c.code === selectedProjectForView.currency)?.symbol || ""} ${selectedProjectForView.budget}`
                            : "N/A"}
                        </span>
                      </div>
                      {selectedProjectForView.source === "Outsource" && (
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                            Outsourcing Budget
                          </span>
                          <span className="hidden sm:inline text-[#999999] mr-4">
                            :
                          </span>
                          <span className="text-md font-Gantari font-medium text-[#666666]">
                            {selectedProjectForView.budget_ceiling
                              ? `${CURRENCIES.find((c) => c.code === selectedProjectForView.currency)?.symbol || ""} ${selectedProjectForView.budget_ceiling}`
                              : "N/A"}
                          </span>
                        </div>
                      )}
                      {/* <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Task Name
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
                          :
                        </span>
                        <span className="text-md font-Gantari font-medium text-[#666666]">
                          {selectedProjectForView.tasks || "N/A"}
                        </span>
                      </div> */}
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Total Resources Available
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
                          :
                        </span>
                        <span className="text-md font-Gantari font-medium text-[#666666]">
                          {selectedProjectForView.resources || "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4 md:space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Location
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
                          :
                        </span>
                        <span className="text-md font-Gantari font-medium text-[#666666]">
                          {selectedProjectForView.location || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Actual End Date
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
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
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Hours/Day
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
                          :
                        </span>
                        <span className="text-md font-Gantari font-medium text-[#666666]">
                          {selectedProjectForView.per_day
                            ? `${selectedProjectForView.per_day}hrs`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Required Resources
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
                          :
                        </span>
                        <span className="text-md font-Gantari font-medium text-[#666666]">
                          {selectedProjectForView.required_resources || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-md font-Gantari font-medium text-[#353535]">
                          Project Document
                        </span>
                        <span className="hidden sm:inline text-[#999999] mr-4">
                          :
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedProjectForView.document_attachment ? (
                            selectedProjectForView.document_attachment
                              .split(",")
                              .map((file) => file.trim())
                              .filter(Boolean)
                              .map((fileName, idx) => {
                                const isOutsource =
                                  selectedProjectForView.source === "Outsource";
                                const url = isOutsource
                                  ? `${api.defaults.baseURL}static/uploads/vendor_docs/${fileName}`
                                  : `${api.defaults.baseURL}uploads/${fileName}`;

                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 w-full md:max-w-md mt-1"
                                  >
                                    <span className="text-[14px] font-medium text-[#353535] line-clamp-1 flex-1 font-gantari">
                                      {fileName.split("_").pop() || "Document"}
                                    </span>
                                    <div className="flex gap-2.5">
                                      <div className="relative group/tooltip inline-flex shrink-0">
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 rounded transition-colors"
                                        >
                                          <img
                                            src={viewIcon}
                                            alt="View"
                                            className="w-4 h-4"
                                          />
                                        </a>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                          <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                                            <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                              View
                                            </span>
                                          </div>
                                          <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-r border-b border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                                        </div>
                                      </div>

                                      <div className="relative group/tooltip inline-flex shrink-0">
                                        <a
                                          href={url}
                                          download
                                          className="p-1 hover:bg-white rounded transition-colors"
                                        >
                                          <img
                                            src={downloadIcon}
                                            alt="Download"
                                            className="w-4 h-4"
                                          />
                                        </a>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                          <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                                            <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                              Download
                                            </span>
                                          </div>
                                          <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-r border-b border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                          ) : (
                            <span className="text-md font-Gantari font-medium text-[#666666] mt-1">
                              No Document Available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : showMilestones && currentProject ? (
          <div className="flex flex-col h-full bg-white">
            {/* Milestones Header */}
            <div className="relative flex items-center justify-center px-4 md:px-6 py-4 md:py-8 border-b border-slate-50">
              <div className="absolute left-4 group">
                <button
                  type="button"
                  onClick={() => setShowMilestones(false)}
                  className="p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                >
                  <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                  Payment Milestones
                </h3>
                <p className="text-sm font-Gantari font-bold text-[#999999] mt-0.5">
                  {currentProject?.project_name ?? "Prestige Park Grove"}_Tower
                  1 to 09
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="border border-slate-200 bg-[#F2F2F2] p-5 lg:p-6 rounded-[8px] flex flex-col justify-between min-h-[110px] group hover:bg-[#DD4342]">
                      <p className="text-[#353535] text-xl font-Gantari font-semibold group-hover:text-[#F2F2F2] transition-colors whitespace-nowrap">
                        Total Amount
                      </p>
                      <p className="text-[#353535] text-3xl text-center mt-3 font-Gantari font-bold group-hover:text-[#F2F2F2] transition-colors">
                        {totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="border border-slate-200 bg-[#F2F3F4] p-5 lg:p-6 rounded-[8px] flex flex-col justify-between min-h-[110px] group hover:bg-[#DD4342]">
                      <p className="text-[#353535] text-xl font-Gantari font-semibold group-hover:text-[#F2F2F2] transition-colors whitespace-nowrap">
                        Paid Amount
                      </p>
                      <p className="text-[#353535] text-3xl text-center mt-3 font-Gantari font-bold group-hover:text-[#F2F2F2] transition-colors">
                        {paidAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="border border-slate-200 bg-[#F2F3F4] p-5 lg:p-6 rounded-[8px] flex flex-col justify-between min-h-[110px] group hover:bg-[#DD4342]">
                      <p className="text-[#333333] text-xl font-Gantari font-semibold group-hover:text-[#F2F2F2] transition-colors whitespace-nowrap">
                        Pending Amount
                      </p>
                      <p className="text-[#333333] text-3xl text-center mt-3 font-Gantari font-bold group-hover:text-[#F2F2F2] transition-colors">
                        {pendingAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="border border-slate-200 bg-[#F2F3F4] p-5 lg:p-6 rounded-[8px] flex flex-col justify-between min-h-[110px] group hover:bg-[#DD4342]">
                      <p className="text-[#333333] text-xl font-Gantari font-semibold group-hover:text-[#F2F2F2] transition-colors whitespace-nowrap">
                        Progress
                      </p>
                      <p className="text-[#333333] text-3xl text-center mt-3 font-Gantari font-bold group-hover:text-[#F2F2F2] transition-colors">
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
                            className="p-2 rounded-lg bg-red-50 text-[#DD4342] hover:bg-red-100 transition-colors"
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
        ) : showCreateModal ? (
          <div className="flex flex-col h-full bg-white">
            {/* Create Project Header */}
            <div className="relative flex items-center justify-center px-4 md:px-4 py-2 border-b border-slate-50">
              <div className="absolute left-4 group">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError("");
                  }}
                  className="p-2 rounded-md bg-[#F2F2F2] text-[#000000] transition-all cursor-pointer"
                >
                  <img src={backIcon} alt="Close" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-1 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari">
                Add New Project
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCreateError("");

                  if (
                    !createName.trim() ||
                    !createBudget.trim() ||
                    moduleNameTags.length === 0 ||
                    !createClientName.trim() ||
                    !createProjectManager.trim() ||
                    !createStartDate.trim() ||
                    !createEndDate.trim() ||
                    !createPerDay.trim() ||
                    !createTotalHours.trim() ||
                    !createDepartment.trim() ||
                    !createBIMLead.trim() ||
                    !createBIMCoOrdinator.trim() ||
                    selectedMemberIds.length === 0 ||
                    !createResources.trim() ||
                    !createRequiredResources.trim() ||
                    !createPriority.trim() ||
                    !createLocation.trim() ||
                    !createDescription.trim() ||
                    createTaskTags.length === 0 ||
                    createFiles.length === 0
                  ) {
                    setCreateError(
                      "Please fill in all required fields and attach at least one file.",
                    );
                    return;
                  }

                  setCreateSubmitting(true);
                  const formData = new FormData();
                  formData.append("project_name", createName.trim());
                  if (createBudget) formData.append("budget", createBudget);
                  formData.append("currency", createCurrency);
                  if (moduleNameTags.length > 0)
                    formData.append("modules", moduleNameTags.join(", "));
                  if (createClientName)
                    formData.append("client_id", createClientName);
                  const pmIdsCreate = nameOrCsvToIdCsv(
                    createProjectManager,
                    allEmployees,
                  );
                  if (pmIdsCreate)
                    formData.append("project_manager_id", pmIdsCreate);
                  const leadIdsCreate = nameOrCsvToIdCsv(
                    createBIMLead,
                    allEmployees,
                  );
                  if (leadIdsCreate) formData.append("lead_id", leadIdsCreate);
                  const bcIdsCreate = nameOrCsvToIdCsv(
                    createBIMCoOrdinator,
                    allEmployees,
                  );
                  if (bcIdsCreate)
                    formData.append("bim_coordinator_id", bcIdsCreate);
                  if (selectedMemberIds.length > 0)
                    formData.append("members", selectedMemberIds.join(","));
                  if (createDepartment)
                    formData.append("department", createDepartment);
                  if (createEndDate) formData.append("due_date", createEndDate);
                  if (createStartDate)
                    formData.append("start_date", createStartDate);
                  if (createTotalHours)
                    formData.append("totalhours", createTotalHours);
                  if (createPerDay) formData.append("perday", createPerDay);
                  if (createPriority)
                    formData.append("priority", createPriority);
                  if (createLocation)
                    formData.append("location", createLocation);
                  if (createDescription)
                    formData.append("description", createDescription);
                  if (createResources)
                    formData.append("resources", createResources);
                  if (createRequiredResources)
                    formData.append(
                      "required_resources",
                      createRequiredResources,
                    );
                  if (createTaskTags.length > 0)
                    formData.append("tasks", createTaskTags.join(", "));

                  createFiles.forEach((file) => {
                    formData.append("files", file);
                  });

                  api
                    .post<{ success?: boolean; project_id?: number }>(
                      "/api/projects",
                      formData,
                      {
                        headers: { "Content-Type": "multipart/form-data" },
                      },
                    )
                    .then(({ data }) => {
                      if (data.success) {
                        setShowCreateModal(false);
                        setCreateTaskTags([]);
                        setCreateTaskInput("");
                        setCreateName("");
                        setCreateBudget("");
                        setCreateCurrency("INR");
                        setCurrencyDropdownOpen(false);
                        setModuleNameTags([]);
                        setModuleNameInput("");
                        setCreateClientName("");
                        setCreateProjectManager("");
                        setCreateStartDate("");
                        setCreateEndDate("");
                        setCreateTotalHours("");
                        setCreatePerDay("");
                        setCreateDepartment("");
                        setCreateBIMLead("");
                        setCreateBIMCoOrdinator("");
                        setSelectedMemberIds([]);
                        setCreateResources("");
                        setCreateRequiredResources("");
                        setCreatePriority("");
                        setCreateLocation("");
                        setCreateDescription("");
                        setCreateFiles([]);
                        setExistingFiles([]);
                        setRemovedFiles([]);
                        setSuccessMsg("Project created successfully!");
                        setTimeout(() => setSuccessMsg(null), 3000);
                        api
                          .get<{ projects?: Record<string, unknown>[] }>(
                            "/api/projects",
                          )
                          .then((res) => {
                            const allProjects = res.data.projects ?? [];
                            const userId = user?.id;
                            const filtered = userId
                              ? allProjects.filter((p: any) => {
                                  if (!p.bim_coordinator_id) return false;
                                  return String(p.bim_coordinator_id)
                                    .split(",")
                                    .map((s: string) => s.trim())
                                    .includes(String(userId));
                                })
                              : allProjects;
                            setList(filtered.map(mapApiProjectToProject));
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
                className="max-w-5xl mx-auto px-4 py-5 space-y-6 md:space-y-8 pb-10"
              >
                {createError && (
                  <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">
                      !
                    </div>
                    <div className="flex-1">
                      <p className="mt-0.5 text-[13px] leading-snug">
                        {createError}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-5 md:gap-y-6">
                  {/* ── Project Name ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Project Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Project Name"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Budget <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative w-1/3">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedProjectForEdit?.currency_locked) return;
                            setCurrencyDropdownOpen(!currencyDropdownOpen);
                          }}
                          className={`w-full h-[36px] flex items-center justify-between px-3 bg-[#F2F3F4] rounded-[5px] transition-all focus:outline-none border border-transparent focus:border-[#AEACAC52] ${selectedProjectForEdit?.currency_locked ? "cursor-not-allowed opacity-80" : "cursor-pointer"} ${currencyDropdownOpen ? "!border-[#AEACAC52]" : ""}`}
                        >
                          <span className="text-[14px] text-[#353535] font-medium truncate">
                            {
                              CURRENCIES.find((c) => c.code === createCurrency)
                                ?.symbol
                            }{" "}
                            {createCurrency}
                          </span>
                          <img
                            src={ArrowDown}
                            alt="arrow"
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${currencyDropdownOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {currencyDropdownOpen &&
                          !selectedProjectForEdit?.currency_locked && (
                            <div className="absolute z-[210] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[8px] shadow-lg overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                              {CURRENCIES.map((c) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setCreateCurrency(c.code);
                                    setCurrencyDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2 text-[14px] transition-colors hover:bg-[#F2F2F2] flex items-center justify-between cursor-pointer ${
                                    createCurrency === c.code
                                      ? "text-[#353535] bg-[#F8F8F8] font-bold"
                                      : "text-[#8B8B8B] font-medium"
                                  }`}
                                >
                                  {c.code}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                      <input
                        type="text"
                        required
                        value={createBudget}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          const parts = val.split(".");
                          if (parts.length <= 2) setCreateBudget(val);
                        }}
                        className="flex-1 px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                        placeholder="Enter Project Budget"
                      />
                    </div>
                  </div>

                  {/* ── Module Name ── */}
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Modules Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      value={moduleNameInput}
                      onChange={(e) => setModuleNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = moduleNameInput.trim().replace(/,$/, "");
                          if (val && !moduleNameTags.includes(val)) {
                            setModuleNameTags((prev) => [...prev, val]);
                          }
                          setModuleNameInput("");
                        }
                      }}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Modules Name"
                    />
                    <p className="flex items-center gap-1.5 text-[12px] text-[#DD4342] font-medium">
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Please enter names, separated by commas, and then press
                      enter
                    </p>
                    {moduleNameTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {moduleNameTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 bg-[#F2F3F4] border border-gray-200 text-[#333333] text-[16px] font-Gantari font-medium px-3 py-1 rounded-[15px]"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() =>
                                setModuleNameTags((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                              className="text-gray-400 transition-colors leading-none cursor-pointer"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Task Name */}
                  {/* <div className="md:col-span-2 space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Task Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      value={createTaskInput}
                      onChange={(e) => setCreateTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = createTaskInput.trim().replace(/,$/, "");
                          if (val && !createTaskTags.includes(val))
                            setCreateTaskTags((prev) => [...prev, val]);
                          setCreateTaskInput("");
                        }
                      }}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Task Name"
                    />
                    <p className="flex items-center gap-1.5 text-[12px] text-[#DD4342] font-medium">
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Please enter names, separated by commas, and then press
                      enter
                    </p>
                    {createTaskTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {createTaskTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 bg-[#F2F3F4] border border-gray-200 text-[#333333] text-[16px] font-Gantari font-medium px-3 py-1 rounded-[15px]"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() =>
                                setCreateTaskTags((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                              className="text-gray-400 transition-colors leading-none cursor-pointer"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div> */}

                  {/* ── Client Name ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Client Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createClientName}
                      onChange={(e) => setCreateClientName(e.target.value)}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] font-semibold placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Client Name"
                    />
                  </div>

                  {/* ── Project Manager dropdown ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Project Manager <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="Project Manager"
                      placeholder="Select project manager"
                      options={projectManagers}
                      value={createProjectManager}
                      onChange={setCreateProjectManager}
                    />
                  </div>

                  {/* ── Project Start Date ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Project Start Date{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={createStartDate}
                      onChange={(e) => setCreateStartDate(e.target.value)}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    />
                  </div>

                  {/* ── Project End Date ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Project End Date <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={createEndDate}
                      onChange={(e) => setCreateEndDate(e.target.value)}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    />
                  </div>

                  {/* ── Per Day ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Per Day <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createPerDay}
                      onChange={(e) =>
                        setCreatePerDay(e.target.value.replace(/  +/g, " "))
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Per Day Hours"
                    />
                  </div>

                  {/* ── Total Hours ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Total Hours <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createTotalHours}
                      onChange={(e) => setCreateTotalHours(e.target.value)}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Total Hours"
                    />
                  </div>

                  {/* ── Department dropdown ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Select Department{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="Department"
                      placeholder="Select Department"
                      options={departments}
                      value={createDepartment}
                      onChange={setCreateDepartment}
                    />
                  </div>
                  {/* ── BIM Lead dropdown ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Select BIM Lead <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="BIM Lead"
                      placeholder="Select BIM Lead"
                      options={bimLeads}
                      value={createBIMLead}
                      onChange={setCreateBIMLead}
                    />
                  </div>
                  {/* ── BIM Co-ordinator dropdown ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Select BIM Co-Ordinator{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="BIM Co-Ordinator"
                      placeholder="Select BIM Co-Ordinator"
                      options={bimCoordinators}
                      value={createBIMCoOrdinator}
                      onChange={setCreateBIMCoOrdinator}
                    />
                  </div>
                  {/* ── Members multi-select ── */}
                  <div
                    className="md:col-span-2 space-y-4"
                    style={{ position: "relative" }}
                  >
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Select Members <span className="text-[#DD4342]">*</span>
                    </label>
                    <div
                      className="w-full min-h-[40px] px-4 py-2 bg-[#F2F3F4] border border-transparent rounded-[5px] cursor-pointer flex flex-wrap gap-2 items-center font-Gantari transition-all outline-none focus-within:border-[#AEACAC52]"
                      onClick={() => setMemberDropdownOpen((o) => !o)}
                    >
                      {selectedMemberIds.length === 0 && (
                        <span className="text-gray-400 text-[16px] font-Gantari">
                          Select Members
                        </span>
                      )}
                      {selectedMemberIds.map((id) => {
                        const emp = allEmployees.find((e) => e.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 bg-white border border-gray-200 text-[#333] text-[14px] font-Gantari font-medium px-2 py-0.5 rounded-full"
                          >
                            {emp?.full_name || String(id)}
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setSelectedMemberIds((prev) =>
                                  prev.filter((x) => x !== id),
                                );
                              }}
                              className="text-gray-400 hover:text-red-500 ml-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                      <span className="ml-auto text-gray-400 text-sm">
                        {memberDropdownOpen ? "▲" : "▼"}
                      </span>
                    </div>
                    {memberDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[8px] shadow-lg max-h-56 overflow-hidden flex flex-col">
                        <div className="p-2 border-b">
                          <input
                            type="text"
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search employees..."
                            className="w-full px-3 py-1.5 bg-[#F2F3F4] border border-transparent rounded-[5px] text-[14px] font-Gantari focus:outline-none focus:border-[#AEACAC52]"
                          />
                        </div>
                        <div className="overflow-y-auto">
                          {allEmployees
                            .filter(isEmployeeActiveForProjectAssignment)
                            .filter(e => {
                              const role = String(e.user_role || '').toLowerCase();
                              return (
                                !role.includes('project manager') &&
                                !role.includes('bim lead') &&
                                !role.includes('coordinator') &&
                                !role.includes('technical director')
                              );
                            })
                            .filter((e) =>
                              e.full_name
                                .toLowerCase()
                                .includes(memberSearch.toLowerCase()),
                            )
                            .map((e) => (
                              <label
                                key={e.id}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F2F3F4] cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMemberIds.includes(e.id)}
                                  onChange={() =>
                                    setSelectedMemberIds((prev) =>
                                      prev.includes(e.id)
                                        ? prev.filter((x) => x !== e.id)
                                        : [...prev, e.id],
                                    )
                                  }
                                  onClick={(ev) => ev.stopPropagation()}
                                  className="w-4 h-4 accent-[#DD4342]"
                                />
                                <span className="text-[14px] font-Gantari text-[#333]">
                                  {e.full_name}
                                </span>
                                <span className="ml-auto text-[12px] text-gray-400">
                                  {e.user_role}
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Resources ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Resources <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createResources}
                      onChange={(e) =>
                        setCreateResources(e.target.value.replace(/  +/g, " "))
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Actual Resources"
                    />
                  </div>

                  {/* ── Required Resources ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Required Resources{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createRequiredResources}
                      onChange={(e) =>
                        setCreateRequiredResources(
                          e.target.value.replace(/  +/g, " "),
                        )
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Required Resources"
                    />
                  </div>

                  {/* ── Priority dropdown ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Priority <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="Priority"
                      placeholder="Select Priority"
                      options={priorityOptions}
                      value={createPriority}
                      onChange={setCreatePriority}
                    />
                  </div>

                  {/* ── Location ── */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Location <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createLocation}
                      onChange={(e) =>
                        setCreateLocation(e.target.value.replace(/  +/g, " "))
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Project Location"
                    />
                  </div>

                  {/* ── Project Description (full width) ── */}
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Project Description{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <textarea
                      required
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
                      placeholder="Type Project Description"
                    />
                  </div>

                  {/* ── Attach File (full width) ── */}
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Attach File <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden">
                      <div className="flex-1 px-4 py-2 text-[14px] text-[#979797] font-Gantari truncate">
                        {createFiles.length > 0
                          ? `${createFiles.length} file(s) selected`
                          : "Choose Files"}
                      </div>
                      <label className="px-5 py-2 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer transition-colors shrink-0 font-Gantari">
                        Browse File
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setCreateFiles((prev) => [...prev, ...files]);
                          }}
                        />
                      </label>
                    </div>
                    {createFiles.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        {createFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 bg-[#F2F3F4] rounded-[5px] group w-full"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-semibold text-[#353535] truncate">
                                {file.name}
                              </p>
                              <p className="text-[12px] font-medium text-[#8B8B8B]">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  window.open(
                                    URL.createObjectURL(file),
                                    "_blank",
                                  )
                                }
                                className="text-[#DD4342] hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                                title="View file"
                              >
                                <img
                                  src={viewIcon}
                                  alt="View"
                                  className="w-5 h-5"
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCreateFiles((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                                className="text-[#616161] hover:text-[#DD4342] transition-colors cursor-pointer shrink-0"
                                title="Remove file"
                              >
                                <img
                                  src={deleteIcon}
                                  alt="Delete"
                                  className="w-5 h-5"
                                />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 pt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateError("");
                      setModuleNameTags([]);
                      setModuleNameInput("");
                      setCreateTaskTags([]);
                      setCreateTaskInput("");
                    }}
                    className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#F2F2F2] text-[#000000] font-semibold text-[16px] transition-all font-Gantari cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className={`w-full sm:w-auto px-5 py-2 rounded-md bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] transition-all font-Gantari ${createSubmitting ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  >
                    {createSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : showEditModal ? (
          <div className="flex flex-col h-full bg-white">
            {/* Edit Project Header */}
            <div className="relative flex items-center justify-center px-4 py-2 border-b border-slate-50">
              <div className="absolute left-4 group">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-[5px] bg-[#F2F2F2] text-[#1A1A1A] transition-all cursor-pointer"
                >
                  <img src={backIcon} alt="Close" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-1 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari">
                Edit Project Details
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 min-h-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedProjectForEdit) return;
                  setEditError("");

                  if (
                    !createName.trim() ||
                    !createBudget.trim() ||
                    editModuleTags.length === 0 ||
                    !createClientName.trim() ||
                    !createProjectManager.trim() ||
                    !createStartDate.trim() ||
                    !createEndDate.trim() ||
                    !createPerDay.trim() ||
                    !createTotalHours.trim() ||
                    !createDepartment.trim() ||
                    !createBIMLead.trim() ||
                    !createBIMCoOrdinator.trim() ||
                    selectedMemberIds.length === 0 ||
                    !createResources.trim() ||
                    !createRequiredResources.trim() ||
                    !editPriority.trim() ||
                    !createLocation.trim() ||
                    !createDescription.trim() ||
                    editTaskTags.length === 0
                  ) {
                    setEditError("Please fill in all required fields.");
                    return;
                  }

                  setIsEditSubmitting(true);
                  const membersPayload =
                    selectedMemberIds.length > 0
                      ? selectedMemberIds.join(",")
                      : editMember || undefined;

                  const formData = new FormData();
                  formData.append("project_name", createName.trim());
                  if (createBudget) formData.append("budget", createBudget);
                  if (editModuleTags.length > 0)
                    formData.append("modules", editModuleTags.join(", "));
                  if (createClientName)
                    formData.append("client_id", createClientName);
                  const pmIds = nameOrCsvToIdCsv(
                    createProjectManager,
                    allEmployees,
                  );
                  if (pmIds) formData.append("project_manager_id", pmIds);
                  const leadIds = nameOrCsvToIdCsv(createBIMLead, allEmployees);
                  if (leadIds) formData.append("lead_id", leadIds);
                  const bcIds = nameOrCsvToIdCsv(
                    createBIMCoOrdinator,
                    allEmployees,
                  );
                  if (bcIds) formData.append("bim_coordinator_id", bcIds);
                  if (membersPayload)
                    formData.append("members", membersPayload);
                  if (createDepartment)
                    formData.append("department", createDepartment);
                  if (createEndDate) formData.append("due_date", createEndDate);
                  if (createStartDate)
                    formData.append("start_date", createStartDate);
                  if (createTotalHours)
                    formData.append("totalhours", createTotalHours);
                  if (createPerDay) formData.append("perday", createPerDay);
                  if (editPriority) formData.append("priority", editPriority);
                  if (createLocation)
                    formData.append("location", createLocation);
                  if (createDescription)
                    formData.append("description", createDescription);
                  if (createResources)
                    formData.append("resources", createResources);
                  if (createRequiredResources)
                    formData.append(
                      "required_resources",
                      createRequiredResources,
                    );
                  if (editTaskTags.length > 0)
                    formData.append("tasks", editTaskTags.join(", "));
                  if (createFiles.length > 0) {
                    createFiles.forEach((file) => {
                      formData.append("files", file);
                    });
                  }
                  if (removedFiles.length > 0) {
                    formData.append("removed_files", removedFiles.join(","));
                  }

                  api
                    .put<{ success?: boolean }>(
                      `/api/projects/${selectedProjectForEdit.id}`,
                      formData,
                      {
                        headers: { "Content-Type": "multipart/form-data" },
                      },
                    )
                    .then(({ data }) => {
                      if (data.success) {
                        setShowEditModal(false);
                        setSuccessMsg("Project updated successfully!");
                        setTimeout(() => setSuccessMsg(null), 3000);
                        api
                          .get<{ projects?: Record<string, unknown>[] }>(
                            "/api/projects",
                          )
                          .then((res) => {
                            const allProjects = res.data.projects ?? [];
                            const userId = user?.id;
                            const filtered = userId
                              ? allProjects.filter((p: any) => {
                                  if (!p.bim_coordinator_id) return false;
                                  return String(p.bim_coordinator_id)
                                    .split(",")
                                    .map((s: string) => s.trim())
                                    .includes(String(userId));
                                })
                              : allProjects;
                            setList(filtered.map(mapApiProjectToProject));
                          })
                          .catch(() => {});
                      }
                    })
                    .catch(() => {})
                    .finally(() => setIsEditSubmitting(false));
                }}
                className="mx-auto space-y-6 md:space-y-8 mt-8"
              >
                {editError && (
                  <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">
                      !
                    </div>
                    <div className="flex-1">
                      <p className="mt-0.5 text-[13px] leading-snug">
                        {editError}
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-5 md:gap-y-6">
                  {/* Project Name */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Project Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createName}
                      onChange={(e) =>
                        setCreateName(e.target.value.replace(/  +/g, " "))
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Project Name"
                    />
                  </div>

                  {/* Budget */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Budget <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createBudget}
                      onChange={(e) =>
                        setCreateBudget(e.target.value.replace(/  +/g, " "))
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Project Budget"
                    />
                  </div>

                  {/* Modules Name */}
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Modules Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      value={editModuleInput}
                      onChange={(e) => setEditModuleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = editModuleInput.trim().replace(/,$/, "");
                          if (val && !editModuleTags.includes(val))
                            setEditModuleTags((prev) => [...prev, val]);
                          setEditModuleInput("");
                        }
                      }}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Modules Name"
                    />
                    <p className="flex items-center gap-1.5 text-[12px] text-[#DD4342] font-medium">
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Please enter names, separated by commas, and then press
                      enter
                    </p>
                    {editModuleTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {editModuleTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 bg-[#F2F3F4] border border-gray-200 text-[#333333] text-[16px] font-Gantari font-medium px-3 py-1 rounded-[15px]"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() =>
                                setEditModuleTags((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                              className="text-gray-400 transition-colors leading-none"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Task Name */}
                  {/* <div className="md:col-span-2 space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Task Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      value={editTaskInput}
                      onChange={(e) => setEditTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = editTaskInput.trim().replace(/,$/, "");
                          if (val && !editTaskTags.includes(val))
                            setEditTaskTags((prev) => [...prev, val]);
                          setEditTaskInput("");
                        }
                      }}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Task Name"
                    />
                    <p className="flex items-center gap-1.5 text-[12px] text-[#DD4342] font-medium">
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Please enter names, separated by commas, and then press
                      enter
                    </p>
                    {editTaskTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {editTaskTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 bg-[#F2F3F4] border border-gray-200 text-[#333333] text-[16px] font-Gantari font-medium px-3 py-1 rounded-[15px]"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() =>
                                setEditTaskTags((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                              className="text-gray-400 transition-colors leading-none"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div> */}

                  {/* Client Name */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Client Name <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={createClientName}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] font-semibold placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari cursor-not-allowed focus:outline-none"
                      placeholder="Enter Client Name"
                    />
                  </div>

                  {/* Priority */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Priority <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="Priority"
                      placeholder="Select Priority"
                      options={priorityOptions}
                      value={editPriority}
                      onChange={setEditPriority}
                    />
                  </div>

                  {/* Start Date */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Project Start Date{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={createStartDate}
                      onChange={(e) => setCreateStartDate(e.target.value)}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Project End Date <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={createEndDate}
                      onChange={(e) => setCreateEndDate(e.target.value)}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    />
                  </div>

                  {/* Per Day */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Per Day <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createPerDay}
                      onChange={(e) =>
                        setCreatePerDay(e.target.value.replace(/  +/g, " "))
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Per Day Hours"
                    />
                  </div>

                  {/* Total Hours */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Total Hours <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createTotalHours}
                      onChange={(e) =>
                        setCreateTotalHours(e.target.value.replace(/  +/g, " "))
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Total Hours"
                    />
                  </div>

                  {/* Select Department */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Select Department{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="Department"
                      placeholder="Select Department"
                      options={departments}
                      value={createDepartment}
                      onChange={setCreateDepartment}
                    />
                  </div>

                  {/* Select Project Manager */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Select Project Manager{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="Project Manager"
                      placeholder="Select Project Manager"
                      options={projectManagers}
                      value={createProjectManager}
                      onChange={setCreateProjectManager}
                    />
                  </div>

                  {/* Select BIM Lead */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Select BIM Lead <span className="text-[#DD4342]">*</span>
                    </label>
                    <FormSelect
                      label="BIM Lead"
                      placeholder="Select BIM Lead"
                      options={bimLeads}
                      value={createBIMLead}
                      onChange={setCreateBIMLead}
                    />
                  </div>

                  {/* Select BIM Co-Ordinator (read-only for BIM Coordinator) */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Select BIM Co-Ordinator{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={createBIMCoOrdinator}
                      className="w-full px-4 py-2 text-[14px] text-gray-500 bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  {/* Select Members (multi-select, same as PM) */}
                  <div
                    className="md:col-span-2 space-y-4"
                    style={{ position: "relative" }}
                  >
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Select Members <span className="text-[#DD4342]">*</span>
                    </label>
                    <div
                      className="w-full min-h-[40px] px-4 py-2 bg-[#F2F3F4] border border-transparent rounded-[5px] cursor-pointer flex flex-wrap gap-2 items-center font-Gantari transition-all outline-none focus-within:border-[#AEACAC52]"
                      onClick={() => setMemberDropdownOpen((o) => !o)}
                    >
                      {selectedMemberIds.length === 0 && (
                        <span className="text-gray-400 text-[16px] font-Gantari">
                          Select Members
                        </span>
                      )}
                      {selectedMemberIds.map((id) => {
                        const emp = allEmployees.find((e) => e.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 bg-white border border-gray-200 text-[#333] text-[14px] font-Gantari font-medium px-2 py-0.5 rounded-full"
                          >
                            {emp?.full_name || String(id)}
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setSelectedMemberIds((prev) =>
                                  prev.filter((x) => x !== id),
                                );
                              }}
                              className="text-gray-400 hover:text-red-500 ml-1"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                      <span className="ml-auto text-gray-400 text-sm">
                        {memberDropdownOpen ? "▲" : "▼"}
                      </span>
                    </div>
                    {memberDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[8px] shadow-lg max-h-56 overflow-hidden flex flex-col">
                        <div className="p-2 border-b">
                          <input
                            type="text"
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search employees..."
                            className="w-full px-3 py-1.5 bg-[#F2F3F4] rounded-[5px] text-[14px] font-Gantari focus:outline-none"
                          />
                        </div>
                        <div className="overflow-y-auto">
                          {allEmployees
                            .filter(isEmployeeActiveForProjectAssignment)
                            .filter(e => {
                              const role = String(e.user_role || '').toLowerCase();
                              return (
                                !role.includes('project manager') &&
                                !role.includes('bim lead') &&
                                !role.includes('coordinator') &&
                                !role.includes('technical director')
                              );
                            })
                            .filter((e) =>
                              e.full_name
                                .toLowerCase()
                                .includes(memberSearch.toLowerCase()),
                            )
                            .map((e) => (
                              <label
                                key={e.id}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F2F3F4] cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMemberIds.includes(e.id)}
                                  onChange={() =>
                                    setSelectedMemberIds((prev) =>
                                      prev.includes(e.id)
                                        ? prev.filter((x) => x !== e.id)
                                        : [...prev, e.id],
                                    )
                                  }
                                  onClick={(ev) => ev.stopPropagation()}
                                  className="w-4 h-4 accent-[#DD4342]"
                                />
                                <span className="text-[14px] font-Gantari text-[#333]">
                                  {e.full_name}
                                </span>
                                <span className="ml-auto text-[12px] text-gray-400">
                                  {e.user_role}
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Location <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createLocation}
                      onChange={(e) =>
                        setCreateLocation(e.target.value.replace(/  +/g, " "))
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Project Location"
                    />
                  </div>

                  {/* Resources */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Resources <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createResources}
                      onChange={(e) =>
                        setCreateResources(e.target.value.replace(/  +/g, " "))
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Actual Resources"
                    />
                  </div>

                  {/* Required Resources */}
                  <div className="space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Required Resources{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createRequiredResources}
                      onChange={(e) =>
                        setCreateRequiredResources(
                          e.target.value.replace(/  +/g, " "),
                        )
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      placeholder="Enter Required Resources"
                    />
                  </div>

                  {/* Project Description */}
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Project Description{" "}
                      <span className="text-[#DD4342]">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={createDescription}
                      onChange={(e) =>
                        setCreateDescription(
                          e.target.value.replace(/  +/g, " "),
                        )
                      }
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
                      placeholder="Type Project Description"
                    />
                  </div>

                  {/* Attach File */}
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                      Attach File <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden">
                      <div className="flex-1 px-4 py-2 text-[14px] text-[#979797] font-Gantari truncate">
                        {createFiles.length + existingFiles.length > 0
                          ? `${createFiles.length + existingFiles.length} file(s) total`
                          : "Choose Files"}
                      </div>
                      <label className="px-5 py-2 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer transition-colors shrink-0 font-Gantari">
                        Browse File
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setCreateFiles((prev) => [...prev, ...files]);
                          }}
                        />
                      </label>
                    </div>
                    {(existingFiles.length > 0 || createFiles.length > 0) && (
                      <div className="grid grid-cols-1 gap-2">
                        {/* Existing Files */}
                        {existingFiles.map((fileName, idx) => (
                          <div
                            key={`exist-${idx}`}
                            className="flex items-center gap-3 p-3 bg-[#F2F3F4] rounded-[5px] group w-full"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-semibold text-[#353535] truncate">
                                {fileName}
                              </p>
                              <p className="text-[12px] font-medium text-[#8B8B8B]">
                                Existing File
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <a
                                href={`${api.defaults.baseURL}/uploads/${fileName}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#DD4342] hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                                title="View file"
                              >
                                <img
                                  src={viewIcon}
                                  alt="View"
                                  className="w-5 h-5"
                                />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  const file = existingFiles[idx];
                                  setExistingFiles((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  );
                                  setRemovedFiles((prev) => [...prev, file]);
                                }}
                                className="text-[#616161] hover:text-[#DD4342] transition-colors cursor-pointer shrink-0"
                                title="Remove file"
                              >
                                <img
                                  src={deleteIcon}
                                  alt="Delete"
                                  className="w-5 h-5"
                                />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Newly Selected Files */}
                        {createFiles.map((file, idx) => (
                          <div
                            key={`new-${idx}`}
                            className="flex items-center gap-3 p-3 bg-[#F2F3F4] rounded-[5px] group w-full"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-semibold text-[#353535] truncate">
                                {file.name}
                              </p>
                              <p className="text-[12px] font-medium text-[#8B8B8B]">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  window.open(
                                    URL.createObjectURL(file),
                                    "_blank",
                                  )
                                }
                                className="text-[#DD4342] hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                                title="View file"
                              >
                                <img
                                  src={viewIcon}
                                  alt="View"
                                  className="w-5 h-5"
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCreateFiles((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                                className="text-[#616161] hover:text-[#DD4342] transition-colors cursor-pointer shrink-0"
                                title="Remove file"
                              >
                                <img
                                  src={deleteIcon}
                                  alt="Delete"
                                  className="w-5 h-5"
                                />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 pt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditError("");
                      setEditModuleTags([]);
                      setEditModuleInput("");
                      setEditTaskTags([]);
                      setEditTaskInput("");
                    }}
                    className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#F2F2F2] text-[#000000] font-semibold text-[16px] transition-all font-Gantari cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSubmitting}
                    className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] disabled:opacity-50 transition-all font-Gantari cursor-pointer"
                  >
                    {isEditSubmitting ? "Updating..." : "Update Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
              <h2 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#000000]">
                {title}
              </h2>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setCreateName("");
                    setCreateBudget("");
                    setCreateClientName("");
                    setCreateProjectManager("");
                    setCreateStartDate("");
                    setCreateEndDate("");
                    setCreateTotalHours("");
                    setCreatePerDay("");
                    setCreateDepartment("");
                    setCreateBIMLead("");
                    setCreateBIMCoOrdinator("");
                    setCreateDescription("");
                    setCreateFiles([]);
                    setExistingFiles([]);
                    setRemovedFiles([]);
                    setCreateResources("");
                    setCreateRequiredResources("");
                    setCreatePriority("");
                    setCreateLocation("");
                    setModuleNameTags([]);
                    setModuleNameInput("");
                    setEditModuleTags([]);
                    setEditModuleInput("");
                    setSelectedMemberIds([]);
                    setMemberSearch("");
                    setCreateTaskTags([]);
                    setCreateTaskInput("");
                    setCreateError("");
                    setShowCreateModal(true);
                  }}
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
                  <div className="col-span-full bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                    No projects found.
                  </div>
                ) : (
                  filteredList.map((p) => {
                    const progress = Math.round(p.progress ?? 0);
                    const radius = 22;
                    const circumference = 2 * Math.PI * radius;
                    const offset =
                      circumference - (progress / 100) * circumference;

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-md border border-slate-200 p-2 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-4 mt-2 pr-0">
                            <div className="relative flex items-center justify-center">
                              <svg className="w-[52px] h-[52px] transform -rotate-90">
                                <circle
                                  cx="26"
                                  cy="26"
                                  r={radius}
                                  stroke="#f1f5f9"
                                  strokeWidth="4"
                                  fill="transparent"
                                />
                                <circle
                                  cx="26"
                                  cy="26"
                                  r={radius}
                                  stroke={
                                    progress >= 80
                                      ? "#0a9344"
                                      : progress >= 1
                                        ? "#DD4342"
                                        : "#999999"
                                  }
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
                                className={`absolute right-0 mt-3 w-60 bg-white/90 backdrop-blur-md rounded-md border border-[#595959]/50 shadow-xl transition-all origin-top-right z-50 ${
                                  openMenuProjectId === p.id
                                    ? "opacity-100 scale-100 visible"
                                    : "opacity-0 scale-95 invisible"
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuProjectId(null);
                                    setSearchParams({
                                      projectId: String(p.id),
                                      source: String(p.source || "In House"),
                                    });
                                  }}
                                  className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer"
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
                                    className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer"
                                  >
                                    <img
                                      src={paymentMilestone}
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
                                        p.budget ? `${p.budget}` : "",
                                      );
                                      setEditModuleTags(
                                        p.module_name
                                          ? p.module_name
                                              .split(",")
                                              .map((m) => m.trim())
                                              .filter(Boolean)
                                          : [],
                                      );
                                      setCreateClientName(p.client_name ?? "");
                                      const pmDisplay =
                                        p.project_manager_name ||
                                        csvToDisplayNamesFromIds(
                                          p.project_manager_id,
                                          allEmployees,
                                        ) ||
                                        p.project_manager ||
                                        "";
                                      setCreateProjectManager(pmDisplay);
                                      setCreateStartDate(
                                        p.start_date
                                          ? String(p.start_date)
                                              .split("T")[0]
                                              .split(" ")[0]
                                          : "",
                                      );
                                      setCreateEndDate(
                                        p.end_date
                                          ? String(p.end_date)
                                              .split("T")[0]
                                              .split(" ")[0]
                                          : "",
                                      );
                                      setCreateTotalHours(p.total_hours ?? "");
                                      setCreatePerDay(p.per_day ?? "");
                                      setCreateDepartment(p.department ?? "");
                                      const blDisplay =
                                        p.lead_name ||
                                        csvToDisplayNamesFromIds(
                                          p.lead_id,
                                          allEmployees,
                                        ) ||
                                        csvToDisplayNamesFromIds(
                                          p.bim_lead,
                                          allEmployees,
                                        ) ||
                                        "";
                                      setCreateBIMLead(blDisplay);
                                      const bcDisplay =
                                        p.bim_coordinator_name ||
                                        csvToDisplayNamesFromIds(
                                          p.bim_coordinator_id,
                                          allEmployees,
                                        ) ||
                                        csvToDisplayNamesFromIds(
                                          p.bim_co_ordinator,
                                          allEmployees,
                                        ) ||
                                        "";
                                      setCreateBIMCoOrdinator(bcDisplay);
                                      setSelectedMemberIds(
                                        p.member
                                          ? p.member
                                              .split(",")
                                              .map((m) =>
                                                parseInt(m.trim(), 10),
                                              )
                                              .filter((n) => !isNaN(n))
                                          : [],
                                      );
                                      setCreateResources(p.resources ?? "");
                                      setCreateRequiredResources(
                                        p.required_resources ?? "",
                                      );
                                      setCreatePriority(p.priority ?? "");
                                      setEditPriority(p.priority ?? "");
                                      setCreateLocation(p.location ?? "");
                                      setCreateDescription(p.description ?? "");
                                      const tasksArr = p.tasks
                                        ? p.tasks
                                            .split(",")
                                            .map((t) => t.trim())
                                            .filter(Boolean)
                                        : [];
                                      setEditTaskTags(tasksArr);
                                      setExistingFiles(
                                        p.document_attachment
                                          ? p.document_attachment
                                              .split(",")
                                              .map((f) => f.trim())
                                              .filter(Boolean)
                                          : [],
                                      );
                                      setShowEditModal(true);
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer"
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuProjectId(null);
                                      setDeleteProject(p);
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer"
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

                          <div className="mb-2 ml-6 -mt-2 min-h-[45px] flex items-center">
                            <h3 className="text-[18px] font-Gantari font-semibold text-[#1A1A1A] leading-tight line-clamp-2">
                              {p.project_name ?? "Untitled Project"}
                            </h3>
                          </div>
                        </div>

                        <div
                          role="button"
                          tabIndex={0}
                          className="flex items-center justify-between border-t border-[#E8E8E8] pt-2 mt-auto cursor-pointer"
                          onClick={() =>
                            setSearchParams({
                              projectId: String(p.id),
                              source: String(p.source || "In House"),
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSearchParams({
                                projectId: String(p.id),
                                source: String(p.source || "In House"),
                              });
                            }
                          }}
                          title="View project details"
                        >
                          <div
                            className="flex items-center -space-x-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(() => {
                              const rawIds = p.member
                                ? p.member
                                    .split(",")
                                    .map((m) => m.trim())
                                    .filter(Boolean)
                                : [];
                              const memberIds_card = rawIds.map((m) => {
                                const n = Number(m);
                                return Number.isNaN(n) ? m : n;
                              });
                              const projectEmployees = memberIds_card
                                .map((id) =>
                                  allEmployees.find(
                                    (e) =>
                                      Number(e.id) === Number(id) ||
                                      String(e.id) === String(id),
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
                                        role="button"
                                        tabIndex={0}
                                        className="relative z-0 w-9 h-9 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                        title={emp.full_name}
                                        onClick={(e) => {
                                          e.stopPropagation();
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
                                      role="button"
                                      tabIndex={0}
                                      className="relative z-10 w-9 h-9 min-w-[2.25rem] min-h-[2.25rem] rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-500 shadow-sm cursor-pointer hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all select-none"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
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
                              className={`px-3.5 py-1 rounded-[8px] text-white text-[13px] font-bold font-Gantari shadow-sm ${
                                p.priority === "High"
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
          </div>
        )}

        {deleteProject !== null && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[20px] shadow-2xl max-w-sm w-full p-8 text-center border border-gray-100">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 font-Gantari">
                Delete Project
              </h3>
              <p className="text-gray-500 mb-8 font-Gantari">
                Are you sure you want to delete this project? This action cannot
                be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setDeleteProject(null)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all font-Gantari cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteProject === null) return;
                    const isOutsource = deleteProject.source === "Outsource";
                    const baseEndpoint = isOutsource
                      ? `/api/vendors/vendor-projects/${deleteProject.id}`
                      : `/api/projects/${deleteProject.id}`;

                    api
                      .delete(baseEndpoint)
                      .then(() => {
                        setList((prev) =>
                          prev.filter((p) => p.id !== deleteProject.id),
                        );
                        setDeleteProject(null);
                      })
                      .catch(() => {});
                  }}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all font-Gantari shadow-lg shadow-red-200 cursor-pointer"
                >
                  Delete
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
              <div className="relative flex items-center justify-center mb-6 md:mb-10">
                <div className="absolute left-0 group">
                  <button
                    type="button"
                    onClick={() => setShowAddMilestoneModal(false)}
                    className="p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                  >
                    <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                    <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                      <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                        Close
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-bold text-[#1A1A1A] text-center px-12">
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
                className="space-y-5 md:space-y-6 px-1"
              >
                <div className="space-y-2">
                  <label className="block text-[14px] md:text-[15px] font-Gantari font-bold text-[#353535]">
                    Milestone Name*
                  </label>
                  <input
                    type="text"
                    value={milestoneName}
                    onChange={(e) => setMilestoneName(e.target.value)}
                    className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F4F5F7] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                    placeholder="Enter Milestone name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[14px] md:text-[15px] font-Gantari font-bold text-[#353535]">
                    Amount ($)*
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={milestoneAmount}
                    onChange={(e) => setMilestoneAmount(e.target.value)}
                    className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                    placeholder="Enter Amount"
                    required
                  />
                  <div className="flex flex-col sm:flex-row justify-between gap-1 text-[12px] md:text-[13px] font-Gantari font-bold text-[#999999]">
                    <span>Project Budget: 5,000,00$</span>
                    <span>Available Budget: 5,000,00$</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[14px] md:text-[15px] font-Gantari font-bold text-[#353535]">
                    Due Date*
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={milestoneDueDate}
                      onChange={(e) => setMilestoneDueDate(e.target.value)}
                      className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      required
                    />
                    <div className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
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
                  <label className="block text-[14px] md:text-[15px] font-Gantari font-bold text-[#353535]">
                    Notes
                  </label>
                  <textarea
                    value={milestoneNotes}
                    onChange={(e) => setMilestoneNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400 resize-none"
                    placeholder="Type Your Notes..."
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6 pt-4 md:pt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddMilestoneModal(false)}
                    className="w-full sm:w-auto px-10 md:px-12 py-3 md:py-3.5 rounded-[5px] bg-[#F1F1F1] text-[#666666] font-Gantari font-bold text-[15px] md:text-[16px] transition-all hover:bg-gray-200"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-10 md:px-12 py-3 md:py-3.5 rounded-[5px] bg-[#E2EEFF] text-[#1D7AFC] font-Gantari font-bold text-[15px] md:text-[16px] transition-all hover:bg-[#D5E6FF] shadow-sm"
                  >
                    Add Milestone
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* All Members Modal */}
        {showAllMembersModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]">
              <div className="relative flex items-center justify-center p-6 border-b border-gray-100">
                <div className="absolute left-6 group">
                  <button
                    type="button"
                    onClick={() => setShowAllMembersModal(false)}
                    className="p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
                  >
                    <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                    <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                      <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                        Close
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className="text-[22px] font-Gantari font-semibold text-[#1A1A1A]">
                  Team Members
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {allMembersList.map((emp) => {
                    const profileUrl = emp.profile_picture
                      ? getGlobalProfileUrl(emp.id, emp.profile_picture)
                      : null;
                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => {
                          setSelectedMember(emp);
                          setShowMemberProfileModal(true);
                        }}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                          {profileUrl ? (
                            <img
                              src={profileUrl}
                              alt={emp.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold">
                              {(emp.full_name || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-Gantari font-bold text-[#1A1A1A] group-hover:text-[#DD4342] transition-colors leading-tight">
                            {emp.full_name}
                          </p>
                          <p className="text-[13px] font-Gantari font-medium text-slate-500">
                            {emp.user_role}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Member Profile Detail Modal */}
        {showMemberProfileModal && selectedMember && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col items-center overflow-hidden">
              <div className="w-full relative h-32 bg-slate-100 flex items-center justify-center">
                <div className="absolute left-6 top-6 z-10 group">
                  <button
                    type="button"
                    onClick={() => setShowMemberProfileModal(false)}
                    className="p-2 rounded-[5px] bg-white/80 backdrop-blur-md text-gray-800 transition-colors cursor-pointer"
                  >
                    <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                    <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                      <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                        Close
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-16 w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
                  {selectedMember.profile_picture ? (
                    <img
                      src={getGlobalProfileUrl(
                        selectedMember.id,
                        selectedMember.profile_picture,
                      )}
                      alt={selectedMember.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-3xl font-bold text-slate-400">
                      {(selectedMember.full_name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-20 pb-10 px-8 w-full flex flex-col items-center text-center">
                <h3 className="text-[26px] font-Gantari font-bold text-[#1A1A1A] mb-1">
                  {selectedMember.full_name}
                </h3>
                <p className="text-[16px] font-Gantari font-semibold text-[#DD4342] mb-8 bg-[#DD4342]/10 px-4 py-1 rounded-full uppercase tracking-wider">
                  {selectedMember.user_role}
                </p>

                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-lg mx-auto bg-slate-50/80 p-8 rounded-2xl border border-slate-100">
                  {selectedMember.employee_id && (
                    <div>
                      <p className="text-[13px] font-Gantari font-bold text-[#999999] mb-1 uppercase tracking-tight">
                        Employee ID
                      </p>
                      <p className="text-[15px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.employee_id}
                      </p>
                    </div>
                  )}

                  {selectedMember.phone && (
                    <div>
                      <p className="text-[13px] font-Gantari font-bold text-[#999999] mb-1 uppercase tracking-tight">
                        Phone Number
                      </p>
                      <p className="text-[15px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.phone}
                      </p>
                    </div>
                  )}

                  {selectedMember.email && (
                    <div className="md:col-span-2">
                      <p className="text-[13px] font-Gantari font-bold text-[#999999] mb-1 uppercase tracking-tight">
                        Email Address
                      </p>
                      <p className="text-[15px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.email}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
