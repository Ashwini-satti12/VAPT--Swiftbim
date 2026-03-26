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
import paymentMilestone from "../../assets/ProjectManager/project/paymentMilestone.svg";
import threedot from "../../assets/ProjectManager/project/threedot.svg";
import addBtnIcon from "../../assets/TechnicalDirector/add btn.svg";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import closeBtnIcon from "../../assets/ProductNavbarIcons/close button.svg";

interface Employee {
  id: number;
  full_name: string;
  employee_id: string;
  email: string;
  phone: string;
  user_role: string;
  profile_picture?: string;
  active?: string | null;
}

const nameToId = (name: string, employeesList: Employee[]) => {
  if (!name || name === "Nothing Selected") return undefined;
  if (/^\d+$/.test(name)) return Number(name);
  const emp = employeesList.find((e) => e.full_name === name);
  return emp ? emp.id : undefined;
};

// const idToName = (
//   id: string | number | undefined,
//   employeesList: Employee[],
// ) => {
//   if (!id) return "";
//   const emp = employeesList.find((e) => String(e.id) === String(id));
//   return emp ? emp.full_name : "";
// };

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
            value
              ? "text-[#353535] font-medium"
              : "text-[#8B8B8B] font-medium"
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
  module_name?: string;
  client_id?: number | string;
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
}

interface Milestone {
  id: number;
  milestone_name: string;
  milestone_amount: number;
  due_date: string;
  status: string;
  notes?: string;
}

export default function ProjectsBL() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBudget, setCreateBudget] = useState("");
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
  const [editDepartment, setEditDepartment] = useState("");
  const [editProjectManager, setEditProjectManager] = useState("");
  const [editBIMLead, setEditBIMLead] = useState("");
  const [editBIMCoOrd, setEditBIMCoOrd] = useState("");
  const [_editMember, _setEditMember] = useState("");
  const [createClientName, setCreateClientName] = useState("");
  const [createProjectManager, setCreateProjectManager] = useState("");
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
  const [createTotalHours, setCreateTotalHours] = useState("");
  const [createPerDay, setCreatePerDay] = useState("");
  const [createDepartment, setCreateDepartment] = useState("");
  const [createBIMLead, setCreateBIMLead] = useState("");
  const [createBIMCoOrdinator, setCreateBIMCoOrdinator] = useState("");
  const [createResources, setCreateResources] = useState("");
  const [createRequiredResources, setCreateRequiredResources] = useState("");
  const [createPriority, setCreatePriority] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [removedFiles, setRemovedFiles] = useState<string[]>([]);

  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showProjectView, setShowProjectView] = useState(
    !!searchParams.get("projectId"),
  );
  const [selectedProjectForView, setSelectedProjectForView] =
    useState<Project | null>(null);
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [allMembersList, setAllMembersList] = useState<Employee[]>([]);
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Employee | null>(null);

  // Select Options States
  const [projectManagers, setProjectManagers] = useState<string[]>([]);
  const [bimLeads, setBimLeads] = useState<string[]>([]);
  const [bimCoordinators, setBimCoordinators] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [clientsList, setClientsList] = useState<
    { id: number; full_name: string }[]
  >([]);
  const priorityOptions = ["High", "Normal"];

  // Fetch employees + departments at mount so project view can resolve members
  useEffect(() => {
    let isMounted = true;
    const fetchEmployeesAndDepartments = async () => {
      try {
        const [empRes, depRes, clientRes] = await Promise.all([
          api.get("/api/employees"),
          api.get("/api/departments"),
          api.get("/api/clients/from-users"),
        ]);
        if (!isMounted) return;
        const empData: Employee[] = empRes.data.employees || [];
        const selectable = empData.filter(isEmployeeActiveForProjectAssignment);
        setProjectManagers(
          selectable
            .filter(
              (e) =>
                e.user_role === "Project Manager" ||
                e.user_role === "BIM Project Manager",
            )
            .map((e) => e.full_name),
        );
        setBimLeads(
          selectable
            .filter((e) => e.user_role === "BIM Lead")
            .map((e) => e.full_name),
        );
        setBimCoordinators(
          selectable
            .filter((e) => e.user_role === "BIM Coordinator")
            .map((e) => e.full_name),
        );
        setAllEmployees(empData);
        setDepartments(depRes.data.departments || []);
        setClientsList(clientRes.data.clients || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchEmployeesAndDepartments();
    return () => {
      isMounted = false;
    };
  }, []);

  // Reset members selection when create modal opens
  useEffect(() => {
    if (showCreateModal) setSelectedMemberIds([]);
  }, [showCreateModal]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const panelType = user?.panel_type ?? 3;
  const resetFormFields = () => {
    setCreateName("");
    setCreateBudget("");
    setModuleNameTags([]);
    setModuleNameInput("");
    setEditModuleTags([]);
    setEditModuleInput("");
    setEditTaskTags([]);
    setEditTaskInput("");
    setCreateTaskTags([]);
    setCreateTaskInput("");
    setCreateTaskTags([]);
    setCreateTaskInput("");
    setEditPriority("");
    setEditDepartment("");
    setEditProjectManager("");
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
    setCreateError("");
  };
  const isManagement = panelType === 1;
  const isTechnicalDirector = user?.user_role === "Technical Director";
  const canCreate = isManagement;
  const canEdit = panelType !== 3;
  const canDelete = isManagement;
  const title = isManagement ? "Projects" : "Projects Involved";

  const mapApiProjectToProject = (r: Record<string, unknown>): Project => ({
    id: Number(r.id) ?? 0,
    project_name: r.project_name != null ? String(r.project_name) : undefined,
    progress: Number(r.progress) ?? 0,
    total_tasks: r.total_tasks != null ? Number(r.total_tasks) : undefined,
    completed_tasks:
      r.completed_tasks != null ? Number(r.completed_tasks) : undefined,
    priority: r.priority != null ? String(r.priority) : "Normal",
    budget: r.budget != null ? String(r.budget) : undefined,
    module_name: r.modules != null ? String(r.modules) : undefined,
    client_name: r.client_name != null ? String(r.client_name) : undefined,
    project_manager: r.project_manager_name != null ? String(r.project_manager_name) : undefined,
    project_manager_id: r.project_manager_id != null ? String(r.project_manager_id) : undefined,
    project_manager_name: r.project_manager_name != null ? String(r.project_manager_name) : undefined,
    start_date: r.start_date != null ? String(r.start_date) : undefined,
    end_date:
      r.end_date != null
        ? String(r.end_date)
        : r.due_date != null
          ? String(r.due_date)
          : undefined,
    total_hours: r.totalhours != null ? String(r.totalhours) : undefined,
    per_day: r.perday != null ? String(r.perday) : undefined,
    department:
      r.department_name != null ? String(r.department_name) : undefined,
    bim_lead: r.lead_name != null ? String(r.lead_name) : undefined,
    lead_id: r.lead_id != null ? String(r.lead_id) : undefined,
    lead_name: r.lead_name != null ? String(r.lead_name) : undefined,
    bim_co_ordinator: r.bim_coordinator_name != null ? String(r.bim_coordinator_name) : undefined,
    bim_coordinator_id: r.bim_coordinator_id != null ? String(r.bim_coordinator_id) : undefined,
    bim_coordinator_name: r.bim_coordinator_name != null ? String(r.bim_coordinator_name) : undefined,
    member: r.members != null ? String(r.members) : undefined,
    resources: r.resources != null ? String(r.resources) : undefined,
    required_resources:
      r.required_resources != null ? String(r.required_resources) : undefined,
    location: r.location != null ? String(r.location) : undefined,
    description: r.description != null ? String(r.description) : undefined,
    tasks: r.tasks != null ? String(r.tasks) : undefined,
    document_attachment:
      r.document_attachment != null ? String(r.document_attachment) : undefined,
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

  useEffect(() => {
    const status = searchParams.get('status');
    api
      .get<{ projects?: Record<string, unknown>[] }>("/api/projects", {
        params: { status: status || undefined }
      })
      .then((res) => {
        const allProjects = res.data.projects ?? [];
        const userId = user?.id;
        const filtered = userId
          ? allProjects.filter((p: any) => {
              if (!p.lead_id) return false;
              return String(p.lead_id).split(',').map(s => s.trim()).includes(String(userId));
            })
          : allProjects;
        setList(filtered.map(mapApiProjectToProject));
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

    const existingProject = list.find((p) => p.id === id);
    if (existingProject) {
      setSelectedProjectForView(existingProject);
      setShowProjectView(true);
    } else if (!showProjectView) {
      setShowProjectView(true);
    }

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }
  return (
    <div className="bg-white h-full flex flex-col overflow-hidden">
      {/* Main Content View Switcher */}
      {showProjectView && selectedProjectForView ? (
          <div className="flex flex-col h-full bg-white">
            {/* Project View Header */}
            <div className="relative flex items-center justify-center px-4 md:px-6 py-4 md:py-6 border-b border-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowProjectView(false);
                  setSelectedProjectForView(null);
                  setSearchParams({}, { replace: true });
                }}
                className="absolute left-4 p-2 rounded-[5px] bg-[#F2F2F2] text-[#000000] cursor-pointer"
                title="Close"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#1A1A1A]">
                  {selectedProjectForView?.project_name ?? "Loading..."}
                </h3>
                <div className="flex items-center justify-center gap-2 md:gap-3 mt-0.5">
                  <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#999999]"></span>
                  <p className="text-[14px] md:text-[16px] font-Gantari font-semibold text-[#999999]">
                    Overall Progress Tracker
                  </p>
                </div>
              </div>
            </div>

          {/* Project View Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-10 pt-6 md:pt-8 custom-scrollbar space-y-4">
            {/* Task Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              <button
                type="button"
                onClick={() => navigate('/bl/teamtasks?status=todo' + (selectedProjectForView?.project_name ? `&project=${encodeURIComponent(selectedProjectForView.project_name)}` : ''))}
                className="text-left bg-[#F2F2F2] p-6 rounded-lg flex flex-col h-[100px] md:h-[120px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-slate-200"
              >
                <p className="text-[#353535] group-hover:text-white text-xl font-Gantari font-semibold">
                  To Do Tasks
                </p>
                <p className="text-[#353535] group-hover:text-white text-3xl font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                  {Math.max(
                    0,
                    (selectedProjectForView.total_tasks ?? 0) -
                    (selectedProjectForView.completed_tasks ?? 0),
                  )}
                </p>
              </button>

              {/* In Progress Tasks */}
              <button
                type="button"
                onClick={() => navigate('/bl/teamtasks?status=in_progress' + (selectedProjectForView?.project_name ? `&project=${encodeURIComponent(selectedProjectForView.project_name)}` : ''))}
                className="text-left bg-[#F2F2F2] p-6 rounded-lg flex flex-col h-[100px] md:h-[120px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-slate-200"
              >
                <p className="text-[#353535] group-hover:text-white text-xl font-Gantari font-semibold">
                  In Progress Tasks
                </p>
                <p className="text-[#353535] group-hover:text-white text-3xl font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                  {selectedProjectForView.progress ?? 0}
                </p>
              </button>

              {/* Paused Tasks */}
              <button
                type="button"
                onClick={() => navigate('/bl/teamtasks?status=paused' + (selectedProjectForView?.project_name ? `&project=${encodeURIComponent(selectedProjectForView.project_name)}` : ''))}
                className="text-left bg-[#F2F2F2] p-6 rounded-lg flex flex-col h-[100px] md:h-[120px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-slate-200"
              >
                <p className="text-[#353535] group-hover:text-white text-xl font-Gantari font-semibold">
                  Paused Tasks
                </p>
                <p className="text-[#353535] group-hover:text-white text-3xl font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                  {selectedProjectForView.total_tasks ?? 0}
                </p>
              </button>

              {/* Completed Tasks */}
              <button
                type="button"
                onClick={() => navigate('/bl/teamtasks?status=completed' + (selectedProjectForView?.project_name ? `&project=${encodeURIComponent(selectedProjectForView.project_name)}` : ''))}
                className="text-left bg-[#F2F2F2] p-6 rounded-lg flex flex-col h-[100px] md:h-[120px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-slate-200"
              >
                <p className="text-[#353535] group-hover:text-white text-xl font-Gantari font-semibold">
                  Completed Tasks
                </p>
                <p className="text-[#353535] group-hover:text-white text-3xl font-Gantari font-bold leading-none mt-auto self-center lg:self-center">
                  {selectedProjectForView.completed_tasks ?? 0}
                </p>
              </button>
            </div>

            {/* Tower Progress Grid */}
            <div className="border border-slate-200 rounded-xl md:rounded-xl p-6 md:p-8 lg:p-4">
              <div className="max-h-[290px] overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {selectedProjectForView.module_name ? (
                    selectedProjectForView.module_name.split(",").map((mod, i) => {
                      const modProgress = selectedProjectForView.progress ?? 0;
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
                          className="bg-white border border-slate-200 rounded-[12px] p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[180px]"
                        >
                          <div className="flex justify-between items-start">
                            <h5 className="text-[18px] font-Gantari font-bold text-[#1A1A1A] truncate pr-2">
                              {mod.trim()}
                            </h5>
                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 ${statusBg}`}
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
                          <div className="flex items-center justify-between mt-4">
                            <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle
                                  cx="40"
                                  cy="40"
                                  r="32"
                                  stroke="#F2F3F5"
                                  strokeWidth="6"
                                  fill="transparent"
                                />
                                <circle
                                  cx="40"
                                  cy="40"
                                  r="32"
                                  stroke={statusColor}
                                  strokeWidth="6"
                                  fill="transparent"
                                  strokeDasharray={201}
                                  strokeDashoffset={
                                    201 - (modProgress / 100) * 201
                                  }
                                  strokeLinecap="round"
                                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                                />
                              </svg>
                              <span className="absolute text-[15px] font-bold text-[#1A1A1A] font-Gantari">
                                {modProgress}%
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <p className="text-[14px] font-medium text-[#999999] font-Gantari mb-1">
                                Tasks Done
                              </p>
                              <div className="flex items-baseline border-t border-slate-100 pt-1">
                                <p className="text-[20px] font-bold text-[#1A1A1A] font-Gantari">
                                  {selectedProjectForView.completed_tasks ?? 0}
                                </p>
                                <p className="text-[16px] font-bold text-[#999999] font-Gantari">
                                  /{selectedProjectForView.total_tasks ?? 0}
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
            <div className="border border-slate-200 rounded-xl md:rounded-xl p-6 md:p-8 lg:p-4">
              <h4 className="text-xl font-Gantari font-semibold text-[#000000]">
                Project Description
              </h4>
              <p className="text-md font-Gantari font-medium text-[#666666] mt-4 leading-relaxed">
                {selectedProjectForView.description ??
                  "No description available"}
              </p>
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
                    ? String(selectedProjectForView.project_manager_id).split(',').map(id => id.trim()).filter(Boolean)
                    : [];
                  const pmNames = selectedProjectForView.project_manager_name
                    ? String(selectedProjectForView.project_manager_name).split(',').map(n => n.trim()).filter(Boolean)
                    : [];

                  if (pmIds.length === 0 && pmNames.length === 0) {
                    return (
                      <div className="min-w-0">
                        <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">Project Manager</p>
                        <div className="flex items-center -space-x-3">
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center shrink-0 shadow-sm relative z-0" title="Not assigned">
                            <span className="text-slate-600 text-xs font-bold">PM</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const maxCount = Math.max(pmIds.length, pmNames.length);
                  const pmEntries = Array.from({ length: maxCount }).map((_, i) => {
                    const pId = pmIds[i];
                    const pName = pmNames[i];
                    const pmEmp = pId ? allEmployees.find((e: any) => String(e.id) === pId) : null;
                    const dName = pmEmp?.full_name || pName || "Unknown";
                    const url = pmEmp?.profile_picture ? getGlobalProfileUrl(pmEmp.id, pmEmp.profile_picture) : null;
                    return { key: i, dName, url };
                  });
                  const visiblePm = pmEntries.slice(0, 3);
                  const pmRemaining = Math.max(0, pmEntries.length - 3);
                  const pmOverflowTitle =
                    pmRemaining > 0 ? pmEntries.slice(3).map((e) => e.dName).join(", ") : undefined;

                  return (
                    <div className="min-w-0">
                      <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">
                        {maxCount > 1 ? "Project Managers" : "Project Manager"}
                      </p>
                      <div className="flex items-center -space-x-3">
                        {visiblePm.map((entry) => (
                          <div key={entry.key} className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0 relative z-0" title={entry.dName}>
                            {entry.url ? (
                              <img src={entry.url} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                {entry.dName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                        {pmRemaining > 0 && (
                          <div className="relative z-10 w-9 h-9 md:w-10 md:h-10 min-w-[2.25rem] min-h-[2.25rem] md:min-w-[2.5rem] md:min-h-[2.5rem] rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm shrink-0 select-none" title={pmOverflowTitle}>
                            +{pmRemaining}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* BIM Lead */}
                {(() => {
                  const blIds = selectedProjectForView.lead_id
                    ? String(selectedProjectForView.lead_id).split(',').map(id => id.trim()).filter(Boolean)
                    : [];
                  const blNames = selectedProjectForView.lead_name
                    ? String(selectedProjectForView.lead_name).split(',').map(n => n.trim()).filter(Boolean)
                    : [];

                  if (blIds.length === 0 && blNames.length === 0) {
                    return (
                      <div className="min-w-0">
                        <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">BIM Lead</p>
                        <div className="flex items-center -space-x-3">
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center shrink-0 shadow-sm relative z-0" title="Not assigned">
                            <span className="text-slate-600 text-xs font-bold">BL</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const maxCount = Math.max(blIds.length, blNames.length);
                  const blEntries = Array.from({ length: maxCount }).map((_, i) => {
                    const pId = blIds[i];
                    const pName = blNames[i];
                    const blEmp = pId ? allEmployees.find((e: any) => String(e.id) === pId) : null;
                    const dName = blEmp?.full_name || pName || "Unknown";
                    const url = blEmp?.profile_picture ? getGlobalProfileUrl(blEmp.id, blEmp.profile_picture) : null;
                    return { key: i, dName, url };
                  });
                  const visibleBl = blEntries.slice(0, 3);
                  const blRemaining = Math.max(0, blEntries.length - 3);
                  const blOverflowTitle =
                    blRemaining > 0 ? blEntries.slice(3).map((e) => e.dName).join(", ") : undefined;

                  return (
                    <div className="min-w-0">
                      <p className="text-md font-Gantari font-semibold text-[#000000] mb-2">
                        {maxCount > 1 ? "BIM Leads" : "BIM Lead"}
                      </p>
                      <div className="flex items-center -space-x-3">
                        {visibleBl.map((entry) => (
                          <div key={entry.key} className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0 relative z-0" title={entry.dName}>
                            {entry.url ? (
                              <img src={entry.url} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                {entry.dName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                        {blRemaining > 0 && (
                          <div className="relative z-10 w-9 h-9 md:w-10 md:h-10 min-w-[2.25rem] min-h-[2.25rem] md:min-w-[2.5rem] md:min-h-[2.5rem] rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm shrink-0 select-none" title={blOverflowTitle}>
                            +{blRemaining}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Department Involved */}
                <div className="flex flex-col gap-3">
                  <p className="text-md font-Gantari font-semibold text-[#000000]">Department Involved</p>
                  <p className="text-sm font-Gantari text-[#616161] truncate">{selectedProjectForView.department || 'N/A'}</p>
                </div>

                {/* Members Involved */}
                <div className="flex flex-col gap-3">
                  <p className="text-md font-Gantari font-semibold text-[#000000]">Members Involved</p>
                  {(() => {
                    const memberIdsForView = selectedProjectForView.member
                      ? selectedProjectForView.member.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
                      : [];
                    
                    if (memberIdsForView.length === 0) {
                      return <p className="text-sm font-Gantari font-bold text-[#999999]">N/A</p>;
                    }

                    return (
                      <div className="flex flex-wrap items-center -space-x-4">
                        {memberIdsForView.slice(0, 3).map((id, j) => {
                          const emp = allEmployees.find(e => Number(e.id) === Number(id) || String(e.id) === String(id));
                          const url = emp?.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture) : null;
                          return (
                            <div
                              key={j}
                              role="button"
                              tabIndex={0}
                              className="relative z-0 w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                              title={emp?.full_name}
                              onClick={() => { if (emp) { setSelectedMember(emp); setShowMemberProfileModal(true); } }}
                              onKeyDown={(e) => { if (e.key === 'Enter' && emp) { setSelectedMember(emp); setShowMemberProfileModal(true); } }}
                            >
                              {url ? (
                                <img src={url} alt={emp?.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <img src={ProfileIcon} alt={emp?.full_name} className="w-full h-full object-cover p-1" />
                              )}
                            </div>
                          );
                        })}
                        {memberIdsForView.length > 3 && (
                          <div
                            role="button"
                            tabIndex={0}
                            className="relative z-10 w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm shrink-0 cursor-pointer hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all select-none"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const emps = memberIdsForView
                                .map((id) => allEmployees.find((e) => Number(e.id) === Number(id) || String(e.id) === String(id)))
                                .filter(Boolean) as Employee[];
                              setAllMembersList(emps);
                              setShowAllMembersModal(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                const emps = memberIdsForView
                                  .map((id) => allEmployees.find((e) => Number(e.id) === Number(id) || String(e.id) === String(id)))
                                  .filter(Boolean) as Employee[];
                                setAllMembersList(emps);
                                setShowAllMembersModal(true);
                              }
                            }}
                            title="Click to see all members"
                          >
                            +{memberIdsForView.length - 3}
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
              <h4 className="text-xl font-Gantari font-semibold text-[#1A1A1A] mb-6">
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
                        ? `${selectedProjectForView.budget}$`
                        : "N/A"}
                    </span>
                  </div>
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
                    <span className="hidden sm:inline text-[#999999] mr-4">:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-md font-Gantari font-medium text-[#666666]">
                        No Document Available
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Member Profile Modal */}
            {showMemberProfileModal && selectedMember && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen overflow-y-auto p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col my-auto shrink-0">
                  <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMemberProfileModal(false);
                        setSelectedMember(null);
                      }}
                      className="absolute left-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
                      title="Close"
                    >
                      <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
                    </button>
                    <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                      Member Profile
                    </h3>
                  </div>
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
                            {(
                              selectedMember.full_name ||
                              `E${selectedMember.id}`
                            )
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
                        {selectedMember.employee_id && (
                          <div>
                            <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                              Employee ID
                            </p>
                            <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                              {selectedMember.employee_id}
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
                        {selectedMember.phone && (
                          <div>
                            <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                              Phone Number
                            </p>
                            <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                              {selectedMember.phone}
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Members Modal */}
            {showAllMembersModal && (
              <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] shadow-2xl max-w-3xl w-full p-6 md:p-10 relative">
                  <button
                    type="button"
                    onClick={() => setShowAllMembersModal(false)}
                    className="absolute left-4 top-4 md:top-6 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
                  </button>
                  <h3 className="text-[20px] md:text-[24px] font-Gantari font-bold text-[#1A1A1A] text-center">
                    All Members ({allMembersList.length})
                  </h3>

                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                    {allMembersList.map((m) => (
                      <div
                        key={m.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedMember(m);
                          setShowAllMembersModal(false);
                          setShowMemberProfileModal(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedMember(m);
                            setShowAllMembersModal(false);
                            setShowMemberProfileModal(true);
                          }
                        }}
                      >
                        <img
                          src={
                            m.profile_picture
                              ? getGlobalProfileUrl(m.id, m.profile_picture)
                              : ProfileIcon
                          }
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = ProfileIcon;
                          }}
                          className="w-14 h-14 rounded-full object-cover border border-slate-100"
                          alt={m.full_name}
                        />
                        <div className="min-w-0">
                          <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A] truncate">
                            {m.full_name}
                          </p>
                          <p className="text-[13px] font-Gantari font-bold text-[#999999] truncate">
                            {m.user_role}
                          </p>
                          <p className="text-[13px] font-Gantari font-medium text-[#666666] truncate">
                            {m.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : showMilestones && currentProject ? (
          <div className="flex flex-col h-full bg-white">
            {/* Milestones Header */}
            <div className="relative flex items-center justify-center px-4 md:px-6 py-4 md:py-8 border-b border-slate-50">
              <button
                type="button"
                onClick={() => setShowMilestones(false)}
                className="absolute left-4 p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                title="Close"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                  Payment Milestones
                </h3>
                <p className="text-sm font-Gantari font-bold text-[#999999] mt-0.5">
                  {currentProject.project_name ?? "Prestige Park Grove"}_Tower 1 to 09
                </p>
              </div>
              <button
                onClick={() => setShowAddMilestoneModal(true)}
                className="absolute right-4 md:right-6 flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-lg bg-[#DD4342] text-white font-Gantari font-bold text-[14px] md:text-[16px] shadow-sm hover:bg-[#c93a39] transition-colors cursor-pointer"
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
                    className="bg-white border border-slate-100 rounded-[1.25rem] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[18px] font-Gantari font-bold text-[#1A1A1A] mb-1 truncate">
                        {m.milestone_name}
                      </h5>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] font-Gantari text-[#999999]">
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
                              ? new Date(m.due_date).toLocaleDateString("en-GB")
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
                            <span className="truncate max-w-xs">{m.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
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
                                .catch(() => { });
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
                                .catch(() => { });
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
      ) : showCreateModal ? (
          <div className="flex flex-col h-full bg-white">
            {/* Create Project Header */}
            <div className="relative flex items-center justify-center px-4 md:px-6 py-4 md:py-6 border-b border-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError("");
                }}
                className="absolute left-4 p-2 rounded-[5px] bg-[#F2F2F2] text-[#1A1A1A] transition-all cursor-pointer"
                title="Close"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
              </button>
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari">
                Add New Project
              </h3>
            </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCreateError("");
                setCreateSubmitting(true);
                const formData = new FormData();
                formData.append("project_name", createName.trim());
                if (createBudget) formData.append("budget", createBudget);
                if (moduleNameTags.length > 0)
                  formData.append("modules", moduleNameTags.join(", "));

                const clientId = clientsList.find(
                  (c) => c.full_name === createClientName,
                )?.id;
                if (clientId) formData.append("client_id", String(clientId));

                const pmId = nameToId(createProjectManager, allEmployees);
                if (pmId) formData.append("project_manager_id", String(pmId));

                const leadId = nameToId(createBIMLead, allEmployees);
                if (leadId) formData.append("lead_id", String(leadId));

                const bcId = nameToId(createBIMCoOrdinator, allEmployees);
                if (bcId) formData.append("bim_coordinator_id", String(bcId));

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
                if (createResources)
                  formData.append("resources", createResources);
                if (createRequiredResources)
                  formData.append(
                    "required_resources",
                    createRequiredResources,
                  );
                if (createPriority) formData.append("priority", createPriority);
                if (createLocation) formData.append("location", createLocation);
                if (createDescription)
                  formData.append("description", createDescription);
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
                      resetFormFields();
                      api
                        .get<{ projects?: Record<string, unknown>[] }>(
                          "/api/projects",
                        )
                        .then((res) => {
                          const allProjects = res.data.projects ?? [];
                          const userId = user?.id;
                          const filtered = userId
                            ? allProjects.filter(
                              (p: any) =>
                                String(p.lead_id) === String(userId),
                            )
                            : allProjects;
                          setList(
                            filtered.map((r: any) => ({
                              id: r.id,
                              project_name: r.project_name,
                              progress: r.progress ?? 0,
                              total_tasks: r.total_tasks ?? 0,
                              completed_tasks: r.completed_tasks ?? 0,
                              priority: r.priority ?? "Normal",
                            })),
                          );
                        })
                        .catch(() => { });
                    }
                  })
                  .catch((err) =>
                    setCreateError(
                      err.response?.data?.message || "Failed to create project",
                    ),
                  )
                  .finally(() => setCreateSubmitting(false));
              }}
              className="max-w-[1174px] mx-auto px-0 py-5 space-y-6 md:space-y-8"
            >
              {createError && (
                <p className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                  {createError}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-5 md:gap-y-6 px-4">
                {/* ── Project Name ── */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Budget <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createBudget}
                    onChange={(e) => setCreateBudget(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    placeholder="Enter Project Budget"
                  />
                </div>

                {/* ── Module Name ── */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                </div>

                {/* ── Client Name ── */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Client Name <span className="text-[#DD4342]">*</span>
                  </label>
                  <FormSelect
                    label="Client Name"
                    placeholder="Select Client"
                    options={clientsList.map((c) => c.full_name)}
                    value={createClientName}
                    onChange={setCreateClientName}
                  />
                </div>

                {/* ── Project Manager dropdown ── */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Project Start Date <span className="text-[#DD4342]">*</span>
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
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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

                {/* ── Total Hours ── */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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

                {/* ── Per Day ── */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Per Day <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createPerDay}
                    onChange={(e) => setCreatePerDay(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    placeholder="Enter Per Day Hours"
                  />
                </div>

                {/* ── Department dropdown ── */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Select Department <span className="text-[#DD4342]">*</span>
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
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                  className="md:col-span-2 space-y-2"
                  style={{ position: "relative" }}
                >
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Select Members <span className="text-[#DD4342]">*</span>
                  </label>
                  <div
                    className="w-full min-h-[48px] px-4 py-2 bg-[#F2F3F4] rounded-[5px] cursor-pointer flex flex-wrap gap-2 items-center cursor-pointer"
                    onClick={() => setMemberDropdownOpen((o) => !o)}
                  >
                    {selectedMemberIds.length === 0 && (
                      <span className="text-gray-400 text-[16px] font-Gantari">
                        Select Members
                      </span>
                    )}
                    {selectedMemberIds.map((id) => {
                      const emp = allEmployees.find((e) => e.id === id);
                      return emp ? (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 bg-white border border-gray-200 text-[#333] text-[14px] font-Gantari font-medium px-2 py-0.5 rounded-full"
                        >
                          {emp.full_name}
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
                      ) : null;
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
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Resources <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createResources}
                    onChange={(e) => setCreateResources(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    placeholder="Enter Actual Resources"
                  />
                </div>

                {/* ── Required Resources ── */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Required Resources <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createRequiredResources}
                    onChange={(e) => setCreateRequiredResources(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    placeholder="Enter Required Resources"
                  />
                </div>

                {/* ── Priority dropdown ── */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Location <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createLocation}
                    onChange={(e) => setCreateLocation(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    placeholder="Enter Project Location"
                  />
                </div>

                {/* ── Project Description (full width) ── */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Attach File <span className="text-[#DD4342]">*</span>
                  </label>
                  <div className="flex items-center bg-[#F2F3F4] rounded-[5px] overflow-hidden">
                    <div className="flex-1 px-4 py-3 text-[16px] text-gray-400 font-medium truncate">
                      {createFiles.length > 0
                        ? `${createFiles.length} file(s) selected`
                        : "Choose Files"}
                    </div>
                    <label className="px-6 py-3 bg-[#E8E8E8] text-[#555555] font-semibold text-[16px] cursor-pointer transition-colors whitespace-nowrap cursor-pointer">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {createFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-white border border-[#AEACAC52] rounded-[8px] group transition-all hover:border-[#DD4342]"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#F2F3F4] flex items-center justify-center text-[#DD4342]">
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
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-[#333] truncate">
                              {file.name}
                            </p>
                            <p className="text-[12px] text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setCreateFiles((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-center gap-4 pt-4 ">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all font-Gantari min-w-[160px] cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] disabled:opacity-50 transition-all font-Gantari min-w-[160px] cursor-pointer disabled:cursor-not-allowed"
                >
                  {createSubmitting ? "Creating..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : showEditModal ? (
          <div className="flex flex-col h-full bg-white">
            {/* Edit Project Header */}
            <div className="relative flex items-center justify-center px-4 md:px-6 py-4 md:py-6 border-b border-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  resetFormFields();
                }}
                className="absolute left-4 p-2 rounded-[5px] bg-[#F2F2F2] text-[#1A1A1A] transition-all cursor-pointer"
                title="Close"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
              </button>
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari">
                Edit Project Details
              </h3>
            </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 custom-scrollbar">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedProjectForEdit) return;
                setIsEditSubmitting(true);
                const formData = new FormData();
                formData.append("project_name", createName.trim());
                if (createBudget) formData.append("budget", createBudget);
                if (editModuleTags.length > 0)
                  formData.append("modules", editModuleTags.join(", "));

                const clientId = clientsList.find(
                  (c) => c.full_name === createClientName,
                )?.id;
                if (clientId) formData.append("client_id", String(clientId));

                const pmId = nameToId(createProjectManager, allEmployees);
                if (pmId) formData.append("project_manager_id", String(pmId));

                const leadId = nameToId(createBIMLead, allEmployees);
                if (leadId) formData.append("lead_id", String(leadId));

                const bcId = nameToId(createBIMCoOrdinator, allEmployees);
                if (bcId) formData.append("bim_coordinator_id", String(bcId));

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
                if (editPriority) formData.append("priority", editPriority);
                if (createResources)
                  formData.append("resources", createResources);
                if (createRequiredResources)
                  formData.append(
                    "required_resources",
                    createRequiredResources,
                  );
                if (createLocation) formData.append("location", createLocation);
                if (createDescription)
                  formData.append("description", createDescription);
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
                      api
                        .get<{ projects?: Record<string, unknown>[] }>(
                          "/api/projects",
                        )
                        .then((res) => {
                          const allProjects = res.data.projects ?? [];
                          const userId = user?.id;
                          const filtered = userId
                            ? allProjects.filter(
                              (p: any) =>
                                String(p.lead_id) === String(userId),
                            )
                            : allProjects;
                          setList(filtered.map(mapApiProjectToProject));
                        })
                        .catch(() => { });
                    }
                  })
                  .catch(() => { })
                  .finally(() => setIsEditSubmitting(false));
              }}
              className="mx-auto px-4 space-y-6 md:space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-5 md:gap-y-6">
                {/* Project Name */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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

                {/* Budget */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Budget <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createBudget}
                    onChange={(e) => setCreateBudget(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    placeholder="Enter Project Budget"
                  />
                </div>

                {/* Modules Name */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                            className="text-gray-400 transition-colors leading-none cursor-pointer"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Client Name */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Client Name <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={createClientName}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] cursor-not-allowed opacity-70"
                    placeholder="Enter Client Name"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Project Start Date <span className="text-[#DD4342]">*</span>
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
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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

                {/* Total Hours */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
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

                {/* Per Day */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Per Day <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createPerDay}
                    onChange={(e) => setCreatePerDay(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    placeholder="Enter Per Day Hours"
                  />
                </div>

                {/* Select Department */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Select Department <span className="text-[#DD4342]">*</span>
                  </label>
                  <FormSelect
                    label="Department"
                    placeholder="Select Department"
                    options={departments}
                    value={editDepartment}
                    onChange={setEditDepartment}
                  />
                </div>

                {/* Select Project Manager */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Select Project Manager{" "}
                    <span className="text-[#DD4342]">*</span>
                  </label>
                  <FormSelect
                    label="Project Manager"
                    placeholder="Select Project Manager"
                    options={projectManagers}
                    value={editProjectManager}
                    onChange={setEditProjectManager}
                  />
                </div>

                {/* Select BIM Lead */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Select BIM Lead <span className="text-[#DD4342]">*</span>
                  </label>
                  <FormSelect
                    label="BIM Lead"
                    placeholder="Select BIM Lead"
                    options={bimLeads}
                    value={editBIMLead}
                    onChange={setEditBIMLead}
                  />
                </div>

                {/* Select BIM Co-Ordinator */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Select BIM Co-Ordinator{" "}
                    <span className="text-[#DD4342]">*</span>
                  </label>
                  <FormSelect
                    label="BIM Co-Ordinator"
                    placeholder="Select BIM Co-Ordinator"
                    options={bimCoordinators}
                    value={editBIMCoOrd}
                    onChange={setEditBIMCoOrd}
                  />
                </div>

                {/* Select Members (multi-select, like PM) */}
                <div
                  className="md:col-span-2 space-y-2"
                  style={{ position: "relative" }}
                >
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Select Members <span className="text-[#DD4342]">*</span>
                  </label>
                  <div
                    className="w-full min-h-[48px] px-4 py-2 bg-[#F2F3F4] rounded-[5px] cursor-pointer flex flex-wrap gap-2 items-center"
                    onClick={() => setMemberDropdownOpen((o) => !o)}
                  >
                    {selectedMemberIds.length === 0 && (
                      <span className="text-gray-400 text-[16px] font-Gantari">
                        Select Members
                      </span>
                    )}
                    {selectedMemberIds.map((id) => {
                      const emp = allEmployees.find((e) => e.id === id);
                      return emp ? (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 bg-white border border-gray-200 text-[#333] text-[14px] font-Gantari font-medium px-2 py-0.5 rounded-full"
                        >
                          {emp.full_name}
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
                      ) : null;
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
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Location <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createLocation}
                    onChange={(e) => setCreateLocation(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    placeholder="Enter Project Location"
                  />
                </div>

                {/* Resources */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Resources <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createResources}
                    onChange={(e) => setCreateResources(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    placeholder="Enter Actual Resources"
                  />
                </div>

                {/* Required Resources */}
                <div className="space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Required Resources <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createRequiredResources}
                    onChange={(e) => setCreateRequiredResources(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    placeholder="Enter Required Resources"
                  />
                </div>

                {/* Project Description */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Project Description{" "}
                    <span className="text-[#DD4342]">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
                    placeholder="Type Project Description"
                  />
                </div>

                {/* Attach File */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-[16px] font-Gantari font-semibold text-[#000000]">
                    Attach File <span className="text-[#DD4342]">*</span>
                  </label>
                  <div className="flex items-center bg-[#F2F3F4] rounded-[5px] overflow-hidden">
                    <div className="flex-1 px-4 py-3 text-[16px] text-gray-400 font-medium truncate">
                      {createFiles.length + existingFiles.length > 0
                        ? `${createFiles.length + existingFiles.length} file(s) total`
                        : "Choose Files"}
                    </div>
                    <label className="px-6 py-3 bg-[#E8E8E8] text-[#555555] font-semibold text-[16px] cursor-pointer transition-colors whitespace-nowrap">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {existingFiles.map((fileName, idx) => (
                        <div
                          key={`exist-${idx}`}
                          className="flex items-center gap-3 p-3 bg-[#EEF4FF] border border-[#C7D9FF] rounded-[8px] group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#1D7AFC]">
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
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <a
                              href={`${api.defaults.baseURL}/uploads/${fileName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[14px] font-semibold text-[#1D7AFC] hover:underline truncate block cursor-pointer"
                            >
                              {fileName}
                            </a>
                            <p className="text-[12px] text-[#1D7AFC]/70">
                              Existing File
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const file = existingFiles[idx];
                              setExistingFiles((prev) =>
                                prev.filter((_, i) => i !== idx),
                              );
                              setRemovedFiles((prev) => [...prev, file]);
                            }}
                            className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}

                      {createFiles.map((file, idx) => (
                        <div
                          key={`new-${idx}`}
                          className="flex items-center gap-3 p-3 bg-white border border-[#AEACAC52] rounded-[8px] group transition-all hover:border-[#DD4342]"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#F2F3F4] flex items-center justify-center text-[#DD4342]">
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
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-[#333] truncate">
                              {file.name}
                            </p>
                            <p className="text-[12px] text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setCreateFiles((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-center gap-6 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                  }}
                  className="px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-Gantari font-semibold text-[16px] transition-all cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-8 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-Gantari font-semibold text-[16px] transition-all shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
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
                  resetFormFields();
                  setShowCreateModal(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#DD4342] text-[#F2F2F2] text-[16px]  font-Gantari font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <img src={addBtnIcon} alt="Add" className="w-5 h-5" />
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
                  const progress = Math.round(p.progress ?? 0);
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
                        <div className="flex items-start justify-between mb-4 mt-2 pr-0">
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
                                setOpenMenuId((prev) =>
                                  prev === p.id ? null : p.id,
                                );
                              }}
                              className="p-2 rounded-full text-[#8B8B8B] transition-colors cursor-pointer"
                            >
                              <img src={threedot} alt="threeDots" className="w-5 h-5 text-[#8B8B8B]" />
                            </button>
                            <div
                              className={`absolute right-0 mt-3 w-60 bg-white/20 backdrop-blur-md rounded-xl border border-[#595959]/50 shadow-xl transition-all origin-top-right z-20 ${openMenuId === p.id ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setSearchParams({ projectId: String(p.id) });
                                }}
                                className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
                              {(isTechnicalDirector || isManagement) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setCurrentProject(p);
                                    setShowMilestones(true);
                                  }}
                                  className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                >
                                  <img src={paymentMilestone} alt="payment milestone" className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]" />
                                  <span className="text-[16px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
                                    Payment Milestones
                                  </span>
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    resetFormFields();
                                    setSelectedProjectForEdit(p);
                                    setCreateName(p.project_name ?? "");
                                    setCreateBudget(p.budget ?? "");
                                    const foundClient = clientsList.find(
                                      (c) =>
                                        String(c.id) === String(p.client_id),
                                    );
                                    setCreateClientName(
                                      foundClient
                                        ? foundClient.full_name
                                        : (p.client_name ?? ""),
                                    );
                                    setCreateProjectManager(
                                      p.project_manager ?? "",
                                    );
                                    setEditProjectManager(
                                      p.project_manager ?? "",
                                    );
                                    setCreateStartDate(p.start_date ?? "");
                                    setCreateEndDate(p.end_date ?? "");
                                    setCreateTotalHours(p.total_hours ?? "");
                                    setCreatePerDay(p.per_day ?? "");
                                    setCreateDepartment(p.department ?? "");
                                    setEditDepartment(p.department ?? "");
                                    setCreateBIMLead(p.bim_lead ?? "");
                                    setEditBIMLead(p.bim_lead ?? "");
                                    setCreateBIMCoOrdinator(
                                      p.bim_co_ordinator ?? "",
                                    );
                                    setEditBIMCoOrd(p.bim_co_ordinator ?? "");
                                    setCreateResources(p.resources ?? "");
                                    setCreateRequiredResources(
                                      p.required_resources ?? "",
                                    );
                                    setEditPriority(p.priority ?? "");
                                    setCreatePriority(p.priority ?? "");
                                    setCreateLocation(p.location ?? "");
                                    setCreateDescription(p.description ?? "");
                                    setEditModuleTags(
                                      p.module_name
                                        ? p.module_name
                                          .split(",")
                                          .map((m) => m.trim())
                                          .filter(Boolean)
                                        : [],
                                    );

                                    if (p.member) {
                                      const memIds = p.member
                                        .split(",")
                                        .map((s) => parseInt(s.trim(), 10))
                                        .filter((n) => !isNaN(n));
                                      setSelectedMemberIds(memIds);
                                    } else {
                                      setSelectedMemberIds([]);
                                    }

                                    setEditTaskTags(
                                      p.tasks
                                        ? p.tasks
                                          .split(",")
                                          .map((t) => t.trim())
                                          .filter(Boolean)
                                        : [],
                                    );

                                    const docs = p.document_attachment
                                      ? p.document_attachment
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean)
                                      : [];
                                    setExistingFiles(docs);
                                    setRemovedFiles([]);
                                    setCreateFiles([]);
                                    setShowEditModal(true);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                >
                                  <img src={editIcon} alt="edit" className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]" />
                                  <span className="text-[16px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
                                    Edit
                                  </span>
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(p.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                >
                                  <img src={deleteIcon} alt="delete" className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]" />
                                  <span className="text-[16px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari">
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
                                    ? getGlobalProfileUrl(emp.id, emp.profile_picture)
                                    : null;

                                  return (
                                    <div
                                      key={emp.id}
                                      className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                      title={emp.full_name}
                                    >
                                      {profileUrl ? (
                                        <img
                                          src={profileUrl}
                                          alt={emp.full_name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = ProfileIcon;
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
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation (Keep as modal) */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className="absolute left-4 top-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
              title="Close"
            >
              <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
            </button>

            {/* Content */}
            <h3 className="text-[18px] font-gantari font-semibold text-[#020202] mt-[12px] mb-3">
              Delete Project
            </h3>
            <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center">
              Are you sure, you want to Delete this?
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto mb-6">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteId === null) return;
                  api
                    .delete(`/api/projects/${deleteId}`)
                    .then(() => {
                      setList((prev) => prev.filter((p) => p.id !== deleteId));
                      setDeleteId(null);
                    })
                    .catch(() => {
                      setDeleteId(null);
                    });
                }}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
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
            <div className="relative flex items-center justify-center mb-6 md:mb-10">
              <button
                type="button"
                onClick={() => setShowAddMilestoneModal(false)}
                className="absolute left-0 p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
                title="Close"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
              </button>
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
                  .catch(() => { });
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
                  className="w-full sm:w-auto px-10 md:px-12 py-3 md:py-3.5 rounded-[5px] bg-[#F1F1F1] text-[#666666] font-Gantari font-bold text-[15px] md:text-[16px] transition-all hover:bg-gray-200 cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-10 md:px-12 py-3 md:py-3.5 rounded-[5px] bg-[#E2EEFF] text-[#1D7AFC] font-Gantari font-bold text-[15px] md:text-[16px] transition-all hover:bg-[#D5E6FF] shadow-sm cursor-pointer"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
