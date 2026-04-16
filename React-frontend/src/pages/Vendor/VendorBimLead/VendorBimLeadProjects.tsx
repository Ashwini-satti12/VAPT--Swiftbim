import { useEffect, useState, useMemo } from "react";
import api from "../../../lib/api";
import { useNavigate } from "react-router-dom";
import { RiDeleteBin5Fill } from "react-icons/ri";
import { FiUploadCloud, FiPaperclip } from "react-icons/fi";
import threedot from "../../../assets/ProjectManager/project/threedot.svg";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import paymentMilestoneIcon from "../../../assets/ProjectManager/project/paymentMilestone.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
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
  currency?: string;
  selected_currency?: string;
  modules?: string;
  client_id?: string;
  project_manager_id?: string;
  start_date?: string;
  due_date?: string;
  totalhours?: string;
  perday?: string;
  per_day?: string;
  department?: string;
  lead_id?: string;
  bim_coordinator_id?: string;
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
  bidding_end_date?: string;
  end_date?: string;
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

interface Tower {
  id: number;
  name: string;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  status: "Approved" | "Pending" | "Review";
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
  const text = normalized
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length > 0;
}

export default function VendorBimLeadProjects() {
  const getCurrencySymbol = (code?: string) => {
    const c = (code || "").toUpperCase();
    if (c === "USD") return "$";
    if (c === "EUR") return "EUR";
    if (c === "GBP") return "GBP";
    if (c === "AED") return "AED";
    return "₹";
  };
  const projectCurrencyCode = (p?: Project | null) =>
    ((p?.selected_currency || p?.currency || "INR") as string).toUpperCase();
  const navigate = useNavigate();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<number | null>(
    null,
  );
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [vendorResourceProfiles, setVendorResourceProfiles] = useState<
    Employee[]
  >([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [clientsList, setClientsList] = useState<
    Array<{ id: number; fullName?: string; full_name?: string }>
  >([]);

  const [showProjectView, setShowProjectView] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [taskStats, setTaskStats] = useState({
    todo: 0,
    inProgress: 0,
    paused: 0,
    completed: 0,
  });
  const [towerData, setTowerData] = useState<Tower[]>([]);
  const [loadingTaskStats, setLoadingTaskStats] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createBudget, setCreateBudget] = useState("");
  const [createModuleName, setCreateModuleName] = useState("");
  const [moduleInput, setModuleInput] = useState("");

  const [createFile, setCreateFile] = useState<File | null>(null);
  const [existingDoc, setExistingDoc] = useState<string | null>(null);
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
  const [createDepartment, setCreateDepartment] = useState("");
  const [createTaskName, setCreateTaskName] = useState("");

  // const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editDropdownOpen, setEditDropdownOpen] = useState<string | null>(null);

  const [projectManagers, setProjectManagers] = useState<Employee[]>([]);
  const [bimLeads, setBimLeads] = useState<Employee[]>([]);
  const [bimCoordinators, setBimCoordinators] = useState<Employee[]>([]);

  const [showMilestones, setShowMilestones] = useState(false);
  const [milestonesProject, setMilestonesProject] = useState<Project | null>(
    null,
  );

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [allMembersList, setAllMembersList] = useState<Employee[]>([]);
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Employee | null>(null);

  // const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editError, setEditError] = useState("");
  const resolveVendorDocUrl = (rawPath: string) => {
    const cleaned = (rawPath || "").trim();
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    const base = String(api.defaults.baseURL || "").replace(/\/+$/, "");
    if (cleaned.startsWith("/uploads/")) {
      const rest = cleaned.replace(/^\/+/, ""); // uploads/<...>
      if (/^uploads\/[^/]+$/i.test(rest)) {
        const fileOnly = rest.replace(/^uploads\//i, "");
        return `${base}/static/uploads/vendor_docs/${fileOnly}`;
      }
      return `${base}${cleaned}`;
    }
    if (
      cleaned.startsWith("/uploads/") ||
      cleaned.startsWith("/static/uploads/")
    ) {
      return `${base}${cleaned}`;
    }
    if (
      cleaned.startsWith("uploads/") ||
      cleaned.startsWith("static/uploads/")
    ) {
      return `${base}/${cleaned}`;
    }
    return `${base}/static/uploads/vendor_docs/${cleaned}`;
  };
  const resolveVendorMember = (id: string | number) =>
    vendorResourceProfiles.find((e) => Number(e.id) === Number(id)) ||
    allEmployees.find((e) => Number(e.id) === Number(id));
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

  const fetchProjects = () => {
    api
      .get<{ projects?: Project[] }>("/api/vendors/vendor-projects")
      .then(({ data }) => setList(data.projects ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
    api
      .get<{ employees?: Employee[] }>("/api/employees")
      .then(({ data }) => {
        const allEmp = data.employees ?? [];
        setAllEmployees(allEmp);
        setBimCoordinators(
          allEmp.filter((e) =>
            ["BIM Coordinator", "FrontEnd Developer"].includes(
              e.user_role || "",
            ),
          ),
        );
      })
      .catch(() => {
        setAllEmployees([]);
        setBimCoordinators([]);
      });
    api
      .get<{ success: boolean; employees?: Employee[] }>(
        "/api/vendors/vendor-by-role?role=Vendor PM",
      )
      .then(({ data }) => setProjectManagers(data.employees ?? []))
      .catch(() => setProjectManagers([]));
    api
      .get<{ success: boolean; employees?: Employee[] }>(
        "/api/vendors/vendor-by-role?role=Vendor Bim Lead",
      )
      .then(({ data }) => setBimLeads(data.employees ?? []))
      .catch(() => setBimLeads([]));
    api
      .get<{ resources?: Employee[] }>("/api/vendors/vendor-resource-profiles")
      .then(({ data }) => setVendorResourceProfiles(data.resources ?? []))
      .catch(() => setVendorResourceProfiles([]));

    // Fetch clients
    api
      .get<{ clients?: any[] }>("/api/clients")
      .then(({ data }) => setClientsList(data.clients ?? []))
      .catch(() => setClientsList([]));

    // Outside click listener for project menu
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
    let cancelled = false;
    const projectId =
      showProjectView && selectedProject?.id ? selectedProject.id : null;

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
      }>(`/api/vendors/vendor-projects/${projectId}/module-progress`)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const c = data.status_counts ?? {};
        setTaskStats({
          todo: Number(c.todo ?? 0),
          inProgress: Number(c.inprogress ?? 0),
          paused: Number(c.paused ?? 0),
          completed: Number(c.completed ?? 0),
        });

        const towers = (data.modules ?? []).map((m, idx) => {
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
        setTaskStats({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
        setTowerData([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTaskStats(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showProjectView, selectedProject?.id]);

  const nameToId = (name: string, list: Employee[]) => {
    const found = list.find((e) => e.full_name === name);
    return found ? String(found.id) : "";
  };

  const idToName = (id: string | number | undefined, list: Employee[]) => {
    if (!id) return "";
    const found = list.find((e) => e.id === Number(id));
    return found?.full_name || "";
  };
  const getClientNameById = (id: string | number | undefined): string => {
    if (!id) return "";
    const found = clientsList.find((c) => String(c.id) === String(id));
    return (found?.fullName || found?.full_name || "") as string;
  };

  const getClientIdByName = (name: string): number | "" => {
    if (!name) return "";
    const found = clientsList.find((c) => (c.fullName || c.full_name) === name);
    return found ? found.id : "";
  };

  const idToNameClients = (id: string | number | undefined, list: any[]) => {
    if (!id) return "";
    const found = list.find((c) => String(c.id) === String(id));
    return found?.fullName || found?.full_name || "";
  };

  const openEdit = (p: Project) => {
    setEditId(p.id);
    setCreateName(p.project_name || "");
    setCreateBudget(p.budget || "");
    setCreateModuleName(p.modules || "");
    setCreateClientName(idToNameClients(p.client_id, clientsList));
    setCreateProjectManager(
      idToName(p.project_manager_id, projectManagers) ||
        idToName(p.project_manager_id, allEmployees),
    );
    setCreateStartDate(p.start_date ? p.start_date.split("T")[0] : "");
    setCreateEndDate(p.end_date || p.due_date || "");
    setCreateTotalHours(p.totalhours || "");
    setCreatePerDay(p.per_day || p.perday || "");
    setCreateBIMLead(
      idToName(p.lead_id, bimLeads) || idToName(p.lead_id, allEmployees),
    );
    setCreateBIMCoOrdinator(
      idToName(p.bim_coordinator_id, bimCoordinators) ||
        idToName(p.bim_coordinator_id, allEmployees),
    );
    setCreateResources(p.resources || p.no_resource || "");
    setCreateRequiredResources(
      p.required_resources || p.no_resources_required || "",
    );
    setSelectedMemberIds(
      p.members ? p.members.split(",").filter(Boolean).map(Number) : [],
    );
    setCreatePriority(p.priority || "Medium");
    setCreateLocation(p.location || "");
    setCreateDescription(p.description || "");
    setCreateDeliverables(p.deliverables || "");
    setCreateDepartment(p.department || "");
    setCreateTaskName(p.deliverables || "");
    setExistingDoc(p.document_attachment || null);
    setShowEditModal(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    if (
      !createName.trim() ||
      !createStartDate ||
      !createEndDate ||
      !createPriority ||
      !createDescription
    ) {
      setEditError("Please fill all required fields.");
      return;
    }
    setEditError("");
    setEditSubmitting(true);
    api
      .patch(`/api/vendors/vendor-projects/${editId}`, {
        project_name: createName,
        budget: createBudget,
        modules: createModuleName,
        client_id: getClientIdByName(createClientName),
        project_manager_id: nameToId(createProjectManager, projectManagers),
        start_date: createStartDate,
        end_date: createEndDate,
        totalhours: createTotalHours,
        per_day: createPerDay,
        lead_id: nameToId(createBIMLead, bimLeads),
        bim_coordinator_id: nameToId(createBIMCoOrdinator, bimCoordinators),
        members: selectedMemberIds.join(","),
        resources: createResources,
        required_resources: createRequiredResources,
        priority: createPriority,
        location: createLocation,
        description: createDescription,
        deliverables: createTaskName,
        department: createDepartment,
      })
      .then(async ({ data }) => {
        if (data.success) {
          if (createFile) {
            const formData = new FormData();
            formData.append("file", createFile);
            try {
              await api.post(
                `/api/vendors/vendor-projects/${editId}/upload-document`,
                formData,
                {
                  headers: { "Content-Type": "multipart/form-data" },
                },
              );
            } catch (err) {
              console.error("Failed to upload document", err);
            }
          }

          setShowEditModal(false);
          // Reset fields
          setCreateName("");
          setCreateBudget("");
          setCreateModuleName("");
          setCreateClientName("");
          setCreateProjectManager("");
          setCreateStartDate("");
          setCreateEndDate("");
          setCreateTotalHours("");
          setCreatePerDay("");
          setCreateBIMLead("");
          setCreateBIMCoOrdinator("");
          setSelectedMemberIds([]);
          setCreateResources("");
          setCreateRequiredResources("");
          setCreatePriority("");
          setCreateLocation("");
          setCreateDescription("");
          setCreateDeliverables("");
          setCreateFile(null);
          setExistingDoc(null);
          setCreateDepartment("");
          setCreateTaskName("");
          setCreateFile(null);

          setSuccessMsg("Project updated!");
          setTimeout(() => setSuccessMsg(null), 3000);

          // Update selected project state if it is currently being viewed
          if (selectedProject && selectedProject.id === editId) {
            setSelectedProject((prev) => 
               prev ? {
                ...prev,
                project_name: createName,
                budget: createBudget,
                modules: createModuleName,
                client_id: String(getClientIdByName(createClientName)),
                project_manager_id: nameToId(createProjectManager, projectManagers),
                start_date: createStartDate,
                end_date: createEndDate,
                totalhours: createTotalHours,
                per_day: createPerDay,
                lead_id: nameToId(createBIMLead, bimLeads),
                bim_coordinator_id: nameToId(createBIMCoOrdinator, bimCoordinators),
                bim_coordinator: createBIMCoOrdinator,
                members: selectedMemberIds.join(","),
                resources: createResources,
                required_resources: createRequiredResources,
                priority: createPriority,
                location: createLocation,
                description: createDescription,
                deliverables: createTaskName,
                department: createDepartment,
              } : null
            );
          }

          fetchProjects();
        }
      })
      .catch(() => {})
      .finally(() => setEditSubmitting(false));
  };

  const handleDelete = () => {
    if (!deleteId) return;
    api.delete(`/api/vendors/vendor-projects/${deleteId}`).then(() => {
      setList((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
      setSuccessMsg("Project deleted!");
      setTimeout(() => setSuccessMsg(null), 3000);
    });
  };

  const getEmployeeName = (id: any) => resolveVendorMember(id)?.full_name || "";
  const formatDate = (d: any) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : "—";

  const toggleMember = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
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
    return raw
      .split(",")
      .map((m: string) => m.trim())
      .filter(Boolean);
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
    const newModules = modulesList.filter((m: string) => m !== name);
    setCreateModuleName(newModules.join(", "));
  };

  const renderMemberSelector = () => (
    <div className="space-y-2">
      <label className="block text-[16px] font-medium text-[#353535]">
        Team Members
      </label>
      <div className="relative">
        <div
          onClick={() =>
            setEditDropdownOpen((prev) =>
              prev === "members" ? null : "members",
            )
          }
          className="w-full px-4 py-2 bg-[#F2F2F2] rounded-md cursor-pointer flex flex-wrap gap-2 items-center min-h-[40px]"
        >
          {selectedMemberIds.length === 0 ? (
            <span className="text-gray-400 font-medium">Select members</span>
          ) : (
            selectedMemberIds.map((id: number) => (
              <div
                key={id}
                className="bg-white px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm border border-[#E2E8F0]"
              >
                <span className="text-[13px] font-bold text-[#1E293B]">
                  {getEmployeeName(id)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMember(id);
                  }}
                  className="text-gray-400 hover:text-[#DD4342] transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
              </div>
            ))
          )}
        </div>
        {editDropdownOpen === "members" && (
          <div className="absolute z-[200] left-0 right-0 mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-2">
            {vendorResourceProfiles.map((emp) => (
              <div
                key={emp.id}
                onClick={() => toggleMember(emp.id)}
                className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC] rounded-lg cursor-pointer transition-colors group"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedMemberIds.includes(emp.id) ? "bg-[#DD4342] border-[#DD4342]" : "border-[#CBD5E1] group-hover:border-[#DD4342]"}`}
                >
                  {selectedMemberIds.includes(emp.id) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={4}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#1E293B]">
                    {emp.full_name}
                  </p>
                  <p className="text-xs text-[#94A3B8] font-medium">
                    {emp.user_role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFormFields = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Project Name <span className="text-[#DD4342]">*</span>
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
            placeholder="Enter Project Name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
        </div>
        {!showEditModal && (
          <div className="space-y-2">
            <label className="block text-[16px] font-medium text-[#353535]">
              Client Name <span className="text-[#DD4342]">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
              placeholder="Enter Client Name"
              value={createClientName}
              onChange={(e) => setCreateClientName(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#020202]">
            Modules Name <span className="text-[#DD4342]">*</span>
          </label>
          <div className="relative group">
            <input
              type="text"
              className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
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
            <span className="w-4 h-4 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-[10px] font-bold">
              i
            </span>
            Please enter names, separated by commas, and then press enter
          </p>
          <div className="flex flex-wrap gap-3">
            {modulesList.map((mod: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-4 py-2 bg-[#F2F2F2] rounded-full border border-slate-100 group hover:border-[#DD4342]/20 transition-all"
              >
                <span className="text-[13px] font-bold text-[#353535]">
                  {mod}
                </span>
                <button
                  type="button"
                  onClick={() => removeModule(mod)}
                  className="p-0.5 text-gray-400 hover:text-[#DD4342] transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
              </div>
            ))}
          </div>
        </div>
        {/* Budget hidden for VBL in edit mode */}
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Select Project Manager <span className="text-[#DD4342]">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setEditDropdownOpen((prev) => (prev === "pm" ? null : "pm"))
              }
              className="w-full flex items-center justify-between px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari outline-none focus:border-[#AEACAC52]"
            >
              <span
                className={
                  createProjectManager ? "text-[#353535]" : "text-gray-400"
                }
              >
                {createProjectManager || "Select Project Manager"}
              </span>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${editDropdownOpen === "pm" ? "rotate-180" : ""}`}
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
            {editDropdownOpen === "pm" && (
              <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-48 overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setCreateProjectManager("");
                    setEditDropdownOpen(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-[14px] text-gray-700 hover:bg-[#F2F2F2]"
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
                    className={`block w-full text-left px-4 py-2 text-[14px] text-gray-700 hover:bg-[#F2F2F2] ${createProjectManager === pm.full_name ? "bg-[#FFF1F1] text-[#DD4342]" : "text-[#353535]"}`}
                  >
                    {pm.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Select BIM Lead <span className="text-[#DD4342]">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setEditDropdownOpen((prev) =>
                  prev === "bimLead" ? null : "bimLead",
                )
              }
              className="w-full flex items-center justify-between px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
            >
              <span
                className={createBIMLead ? "text-[#353535]" : "text-gray-400"}
              >
                {createBIMLead || "Select BIM Lead"}
              </span>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${editDropdownOpen === "bimLead" ? "rotate-180" : ""}`}
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
            {editDropdownOpen === "bimLead" && (
              <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-md py-1 max-h-48 overflow-y-auto custom-scrollbar">
                {bimLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => {
                      setCreateBIMLead(lead.full_name || "");
                      setEditDropdownOpen(null);
                    }}
                    className={`block w-full text-left px-4 py-3 text-sm hover:bg-[#F2F2F2] ${createBIMLead === lead.full_name ? "bg-[#FFF1F1] text-[#DD4342]" : "text-[#353535]"}`}
                  >
                    {lead.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#000000]">
            Project Start Date <span className="text-[#DD4342]">*</span>
          </label>
          <input
            type="date"
            value={createStartDate}
            onChange={(e) => {
              const val = e.target.value;
              setCreateStartDate(val);
              if (val && (!createEndDate || createEndDate === "")) {
                const d = new Date(val);
                d.setMonth(d.getMonth() + 6);
                setCreateEndDate(d.toISOString().split("T")[0]);
              }
            }}
            className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Project End Date <span className="text-[#DD4342]">*</span>
          </label>
          <input
            type="date"
            value={createEndDate}
            onChange={(e) => setCreateEndDate(e.target.value)}
            className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Priority <span className="text-[#DD4342]">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setEditDropdownOpen((o) =>
                  o === "priority" ? null : "priority",
                )
              }
              className="w-full flex items-center justify-between px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
            >
              <span
                className={createPriority ? "text-[#353535]" : "text-gray-400"}
              >
                {createPriority || "Select Priority"}
              </span>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${editDropdownOpen === "priority" ? "rotate-180" : ""}`}
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
            {editDropdownOpen === "priority" && (
              <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-md py-1">
                {["High", "Medium", "Low"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setCreatePriority(p);
                      setEditDropdownOpen(null);
                    }}
                    className={`block w-full text-left px-4 py-2 text-[14px] text-gray-700 hover:bg-[#F2F2F2] ${createPriority === p ? "bg-[#FFF1F1] text-[#DD4342]" : "text-[#353535]"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Select BIM Coordinator
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setEditDropdownOpen((prev) =>
                  prev === "coord" ? null : "coord",
                )
              }
              className="w-full flex items-center justify-between px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari outline-none focus:border-[#AEACAC52]"
            >
              <span
                className={
                  createBIMCoOrdinator ? "text-[#353535]" : "text-gray-400"
                }
              >
                {createBIMCoOrdinator || "Select BIM Coordinator"}
              </span>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${editDropdownOpen === "coord" ? "rotate-180" : ""}`}
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
            {editDropdownOpen === "coord" && (
              <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-md py-1 max-h-48 overflow-y-auto custom-scrollbar">
                {bimCoordinators.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCreateBIMCoOrdinator(c.full_name || "");
                      setEditDropdownOpen(null);
                    }}
                    className={`block w-full text-left px-4 py-3 text-sm hover:bg-[#F2F2F2] ${createBIMCoOrdinator === c.full_name ? "bg-[#FFF1F1] text-[#DD4342]" : "text-[#353535]"}`}
                  >
                    {c.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Location
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
            placeholder="Enter Location"
            value={createLocation}
            onChange={(e) => setCreateLocation(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Total Project Hours
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
            placeholder="e.g. 500"
            value={createTotalHours}
            onChange={(e) => setCreateTotalHours(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Hours/Day
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
            placeholder="e.g. 8"
            value={createPerDay}
            onChange={(e) => setCreatePerDay(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Total Resources Available
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
            placeholder="e.g. 5"
            value={createResources}
            onChange={(e) => setCreateResources(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Total Resources Required
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
            placeholder="e.g. 10"
            value={createRequiredResources}
            onChange={(e) => setCreateRequiredResources(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-6 mt-6">
        {renderMemberSelector()}
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#353535]">
            Description <span className="text-[#DD4342]">*</span>
          </label>
          <textarea
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] resize-none"
            placeholder="Provide a detailed project description..."
          />
        </div>
      </div>
      <div className="space-y-2 mt-6">
        <label className="block text-[16px] font-medium text-[#353535]">
          Attach File
        </label>
        <div className="relative">
          <input
            type="file"
            id="edit-file-upload"
            className="hidden"
            onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
          />
          {existingDoc && !createFile ? (
            <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#DD4342]/20 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <FiPaperclip className="w-5 h-5 text-[#DD4342]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1E293B] truncate max-w-[200px] md:max-w-md">
                    {existingDoc.split("_").pop() || "Document"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolveVendorDocUrl(existingDoc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-[#DD4342] hover:bg-red-50 rounded-lg transition-all"
                  title="View document"
                >
                  <img src={viewIcon} alt="View" className="w-5 h-5" />
                </a>
                <a
                  href={resolveVendorDocUrl(existingDoc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-[#DD4342] hover:bg-red-50 rounded-lg transition-all"
                  title="Download document"
                >
                  <FiUploadCloud className="w-5 h-5 rotate-180" />
                </a>
                <label
                  htmlFor="edit-file-upload"
                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                  title="Replace file"
                >
                  <img src={editIcon} alt="Replace" className="w-5 h-5" />
                </label>
              </div>
            </div>
          ) : !createFile ? (
            <label
              htmlFor="edit-file-upload"
              className="flex flex-col items-center justify-center w-full h-32 bg-[#F2F3F4] border-2 border-dashed border-slate-200 rounded-md cursor-pointer hover:border-[#DD4342]/20 transition-all"
            >
              <FiUploadCloud className="w-8 h-8 mb-2 text-slate-400" />
              <p className="text-sm text-slate-500">
                Click or drag and drop to upload
              </p>
            </label>
          ) : (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-[#DD4342]/10">
              <div className="flex items-center gap-3">
                <FiPaperclip className="text-[#DD4342]" />
                <span className="text-sm font-bold text-[#353535]">
                  {createFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCreateFile(null)}
                className="text-slate-400 hover:text-red-500 cursor-pointer"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
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
    <div className="bg-white min-h-screen font-gantari">
      <div className="flex flex-col h-[calc(100vh-100px)] lg:h-[calc(100vh-100px)] overflow-hidden">
        {/* Project View (In-Page) */}
        {showEditModal ? (
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center gap-4 md:gap-6 px-5 py-2 md:px-5 md:py-2 border-b border-slate-50 cursor-pointer">
              <div className="relative group inline-flex shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditDropdownOpen(null);
                    setEditError("");
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
                    setCreateBIMLead("");
                    setCreateBIMCoOrdinator("");
                    setCreateResources("");
                    setCreateRequiredResources("");
                    setCreatePriority("");
                    setCreateLocation("");
                    setCreateDescription("");
                    setCreateDeliverables("");
                    setSelectedMemberIds([]);
                    setCreateFile(null);
                  }}
                  className="p-2 rounded-md bg-[#F2F2F2] text-[#000000] transition-colors cursor-pointer"
                >
                  <img src={backIcon} alt="Back" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[18px] md:text-[24px] font-Gantari font-semibold text-[#1A1A1A] truncate text-center pr-10">
                  Edit Project Details
                </h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 md:px-5 pb-10 pt-6 md:pt-8 custom-scrollbar">
              <form
                onSubmit={handleEdit}
                className="max-w-4xl mx-auto space-y-10"
              >
                {renderFormFields()}
                <div className="flex justify-center gap-6 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditDropdownOpen(null);
                      setEditError("");
                    }}
                    className="px-5 py-2 rounded-md bg-[#F2F2F2] text-[#666666] font-medium text-[16px] cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2 rounded-md bg-[#DD4342] text-white font-medium text-[16px] cursor-pointer"
                  >
                    {editSubmitting ? "Updating..." : "Update Project"}
                  </button>
                </div>
                {editError && (
                  <p className="text-[#DD4342] text-sm font-bold text-center mt-4 uppercase tracking-wider cursor-pointer">
                    {editError}
                  </p>
                )}
              </form>
            </div>
          </div>
        ) : showProjectView && selectedProject ? (
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center gap-4 md:gap-6 px-4 md:px-5 py-4 md:py-2 border-b border-slate-50">
              <div className="relative group inline-flex shrink-0">
                <button
                  type="button"
                  onClick={() => setShowProjectView(false)}
                  className="p-2 rounded-md bg-[#F2F2F2] text-[#000000] transition-colors cursor-pointer"
                >
                  <img src={backIcon} alt="Back" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md  px-2 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[18px] md:text-[24px] font-medium text-[#000000] truncate text-center pr-10">
                  {selectedProject.project_name ?? "Untitled Project"}
                </h3>
                <p className="text-[12px] md:text-[14px] font-medium text-[#999999] text-center pr-10">
                  Overall Progress Tracker
                </p>
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Fixed KPI Cards at top */}
              <div className="px-4 md:px-5 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  {[
                    {
                      label: "To Do Tasks",
                      value: taskStats.todo,
                      status: "todo",
                    },
                    {
                      label: "In Progress",
                      value: taskStats.inProgress,
                      status: "in_progress",
                    },
                    {
                      label: "Paused",
                      value: taskStats.paused,
                      status: "paused",
                    },
                    {
                      label: "Completed",
                      value: taskStats.completed,
                      status: "completed",
                    },
                  ].map((stat, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        navigate(
                          "/vendor-bim-lead/teamtasks?status=" +
                            stat.status +
                            (selectedProject?.project_name
                              ? `&project=${encodeURIComponent(selectedProject.project_name)}`
                              : ""),
                        )
                      }
                      className="text-left bg-[#F2F2F2] p-3 md:p-4 rounded-md flex flex-col h-[70px] md:h-[90px] hover:bg-[#DD4342] focus:outline-none cursor-pointer transition-all group border-1 border-slate-200"
                    >
                      <p className="text-[#353535] group-hover:text-white text-[16px] md:text-[18px] font-medium">
                        {stat.label}
                      </p>
                      <p className="text-[#353535] group-hover:text-white text-[18px] md:text-[22px] font-bold leading-none mt-auto self-center lg:self-center">
                        {stat.value}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Content Below KPI Cards */}
              <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-10 pt-4 md:pt-6 custom-scrollbar space-y-8">
                {/* Modules */}
                <div className="border border-slate-200 rounded-xl md:rounded-xl p-6 md:p-4">
                  <h4 className="text-[20px] font-Gantari font-semibold text-[#000000] mb-4">
                    Modules
                  </h4>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                      {loadingTaskStats ? (
                        <div className="col-span-full py-10 flex flex-col items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DD4342]" />
                          <p className="text-gray-500 font-medium">
                            Loading module analysis...
                          </p>
                        </div>
                      ) : towerData.length > 0 ? (
                        towerData.map((tower) => {
                          const statusColor =
                            tower.status === "Approved"
                              ? "#008F22"
                              : tower.status === "Pending"
                                ? "#EB7200"
                                : "#E00100";
                          const statusBg =
                            tower.status === "Approved"
                              ? "bg-[#E0FFE8]"
                              : tower.status === "Pending"
                                ? "bg-[#FFEAD6]"
                                : "bg-[#FFD9D9]";

                          return (
                            <div
                              key={tower.id}
                              className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[150px]"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="text-[16px] font-Gantari font-bold text-[#1A1A1A] truncate pr-2">
                                  {tower.name}
                                </h5>
                                <div
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md shrink-0 ${statusBg}`}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: statusColor }}
                                  ></span>
                                  <span
                                    className="text-[11px] font-bold font-Gantari"
                                    style={{ color: statusColor }}
                                  >
                                    {tower.status}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-auto">
                                <div className="relative flex items-center justify-center w-16 h-16">
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
                                        163.36 - (tower.progress / 100) * 163.36
                                      }
                                      strokeLinecap="round"
                                      style={{
                                        transition:
                                          "stroke-dashoffset 1s ease-in-out",
                                      }}
                                    />
                                  </svg>
                                  <span className="absolute text-[14px] font-bold text-[#353535] font-Gantari">
                                    {tower.progress}%
                                  </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <p className="text-[12px] font-medium text-[#8B8B8B] font-Gantari mb-1">
                                    Tasks Done
                                  </p>
                                  <div className="flex items-baseline">
                                    <p className="text-[18px] font-bold text-[#353535] font-Gantari">
                                      {tower.completedTasks}
                                    </p>
                                    <p className="text-[14px] font-medium text-[#8B8B8B] font-Gantari">
                                      /{tower.totalTasks}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-10 text-center text-gray-500 font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                          No module progress available yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Project Description */}
                <div className="border border-slate-200 rounded-[10px] p-4 md:p-4">
                  <h4 className="text-[18px] md:text-[20px] font-medium  font-gantari text-[#000000]">
                    Project Description
                  </h4>
                  {hasProjectDescriptionContent(selectedProject.description) ? (
                    <div
                      className="text-[14px] font-medium font-gantari text-[#353535] leading-relaxed break-words quill-content"
                      dangerouslySetInnerHTML={{
                        __html: normalizeProjectDescriptionHtml(
                          selectedProject.description,
                        ),
                      }}
                    />
                  ) : (
                    <p className="text-[16px] font-medium text-[#666666] mt-4 leading-relaxed break-words">
                      No description available
                    </p>
                  )}
                </div>

                {/* Team Roles Section */}
                <div className="border border-slate-200 rounded-[10px] p-4 md:p-5 space-y-6">
                  <h4 className="text-[18px] md:text-[20px] font-semibold text-[#000000]">
                    Team Overview
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      {
                        label: "Project Manager",
                        id: selectedProject.project_manager_id,
                      },
                      { label: "BIM Lead", id: selectedProject.lead_id },
                    ].map((role) => (
                      <div key={role.label} className="flex items-center gap-3">
                        {(() => {
                          const emp = resolveVendorMember(role.id || "");
                          const profileUrl = emp?.profile_picture
                            ? getGlobalProfileUrl(emp.id, emp.profile_picture)
                            : null;
                          return (
                            <>
                              <div
                                role="button"
                                tabIndex={0}
                                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0  overflow-hidden shadow-sm cursor-pointer transition-all"
                                onClick={() => openMemberProfile(emp)}
                              >
                                {profileUrl ? (
                                  <img
                                    src={profileUrl}
                                    alt={role.label}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        ProfileIcon;
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={ProfileIcon}
                                    alt={role.label}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[16px] font-medium text-[#1A1A1A] truncate">
                                  {getEmployeeName(role.id) || "Not assigned"}
                                </p>
                                <p className="text-[14px] font-medium text-[#8B8B8B]">
                                  {role.label}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ))}
                    <div className="flex flex-col">
                      <p className="text-[16px] font-medium text-[#353535]">
                        BIM Coordinator
                      </p>
                      <p className="text-[14px] font-medium text-[#8B8B8B]">
                        {selectedProject.bim_coordinator || "N/A"}
                      </p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[16px] font-medium text-[#353535]">
                        Members Involved
                      </p>
                      {(() => {
                        const memberIds = (selectedProject.members || "")
                          .split(",")
                          .filter(Boolean)
                          .map((id) => Number(id));
                        const projectMembers = memberIds
                          .map((id) => resolveVendorMember(id))
                          .filter(Boolean) as Employee[];
                        if (!projectMembers.length) {
                          return (
                            <div className="text-[14px] font-medium text-[#8B8B8B]">
                              N/A
                            </div>
                          );
                        }
                        const visibleMembers = projectMembers.slice(0, 3);
                        const remainingCount = Math.max(
                          0,
                          projectMembers.length - 3,
                        );
                        return (
                          <div className="flex items-center -space-x-4">
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
                                  className="w-9 h-9 rounded-full border-white bg-slate-100 overflow-hidden cursor-pointer"
                                  title={emp.full_name}
                                  onClick={() => openMemberProfile(emp)}
                                >
                                  {profileUrl ? (
                                    <img
                                      src={profileUrl}
                                      alt={emp.full_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          ProfileIcon;
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[12px] font-medium text-slate-600">
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
                                className="w-9 h-9 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => {
                                  setAllMembersList(projectMembers);
                                  setShowAllMembersModal(true);
                                }}
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

                <div className="border border-slate-200 rounded-lg px-5 py-2">
                  <h4 className="text-[18px] md:text-[20px] font-semibold text-[#000000] mb-4">
                    Project Details
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-2 md:gap-y-4 lg:gap-x-16">
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">Client Name</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161] font-gantari">{getClientNameById(selectedProject.client_id) || "N/A"}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">Start Date</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161] font-gantari">{formatDate(selectedProject.start_date)}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">Total Project Hours</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">
                          {selectedProject.totalhours || (selectedProject as any).total_hours ? `${selectedProject.totalhours || (selectedProject as any).total_hours}hrs` : "N/A"}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">Budget</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161] font-gantari">
                          {selectedProject.budget || selectedProject.budget_ceiling
                            ? `${getCurrencySymbol(projectCurrencyCode(selectedProject))}${selectedProject.budget || selectedProject.budget_ceiling}`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">Total Resources Available</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{selectedProject.no_resource || "000"}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">Location</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{selectedProject.location || "N/A"}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">End Date</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{formatDate(selectedProject.end_date || selectedProject.due_date)}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">Hours/Day</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">
                          {selectedProject.per_day || selectedProject.perday ? `${selectedProject.per_day || selectedProject.perday}hrs` : "0:00hrs"}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">Total Resources Required</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{selectedProject.no_resources_required || "000"}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">Required Resources</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{selectedProject.required_resources || "000"}</span>
                      </div>
                    </div>

                    <div className="lg:col-span-2 ">
                      <div className="flex items-center">
                        <span className="w-48 text-[14px] font-medium text-[#353535] shrink-0">Project Document</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        {selectedProject.document_attachment ? (
                          <div className="flex items-center gap-3">
                            <span className="text-[14px] font-medium text-[#353535] line-clamp-1 flex-1">
                              {selectedProject.document_attachment.split("/").pop()?.split("_").pop() || "Document.pdf"}
                            </span>
                            <a
                              href={resolveVendorDocUrl(selectedProject.document_attachment)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-[#E8F0FE] text-[#1967D2] rounded flex items-center justify-center hover:bg-[#D2E3FC] transition-colors"
                            >
                              <FiUploadCloud className="w-4 h-4 rotate-180" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[14px] font-medium text-[#616161]">No Document Available</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : showMilestones && milestonesProject ? (
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50">
              <div className="flex items-center gap-6">
                <div className="relative group inline-flex shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMilestones(false)}
                    className="p-2 rounded-md bg-[#F2F2F2] transition-colors cursor-pointer"
                  >
                    <img src={backIcon} alt="Back" className="w-5 h-5" />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                    <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10">
                      <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                        Go Back
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[26px] font-bold text-center pr-10">Payment Milestones</h3>
                  <p className="text-[16px] font-bold text-[#999999] text-center pr-10">
                    {milestonesProject.project_name}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50/30">
              <h4 className="text-[22px] font-bold text-[#353535] mb-2">
                No Payment Milestones Found
              </h4>
              <p className="text-[15px] font-bold text-[#999999] mb-10">
                Add your first payment to get started with payment tracking
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 px-5">
              <h2 className="text-[24px] font-semibold text-[#000000]">
                Projects
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto pt-4 pb-10 px-5 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.length === 0 ? (
                  <div className="col-span-full bg-[#F8FAFC] rounded-2xl border-2 border-dashed border-slate-200 p-20 text-center">
                    <p className="text-slate-500 font-medium">
                      No projects assigned yet.
                    </p>
                  </div>
                ) : (
                  list.map((p) => {
                    const progress = Math.round(Number(p.progress) || 0);
                    const memberIds = p.members
                      ? p.members.split(",").filter(Boolean).map(Number)
                      : [];

                    const radius = 28;
                    const circumference = 2 * Math.PI * radius;
                    const offset =
                      circumference - (progress / 100) * circumference;

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProject(p);
                          setShowProjectView(true);
                        }}
                        className="bg-white rounded-md border border-slate-200 p-2 pt-1 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-4 mt-2 pr-0">
                            <div className="relative flex items-center justify-center shrink-0">
                              <svg className="w-16 h-16 md:w-20 md:h-20 transform -rotate-90">
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
                              <span className="absolute text-[14px] md:text-[16px] font-Gantari font-bold text-[#353535]">
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
                                  className="w-4 h-4 text-[#8B8B8B]"
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
                                  className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                >
                                  <img
                                    src={viewIcon}
                                    alt="view"
                                    className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                  />
                                  <span className="text-[16px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342] ">
                                    View
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuProjectId(null);
                                    setMilestonesProject(p);
                                    setShowMilestones(true);
                                  }}
                                  className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
                                    openEdit(p);
                                  }}
                                  className="w-full flex items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
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
                              </div>
                            </div>
                          </div>

                          <div className="mb-2 ml-6 -mt-2 min-h-[45px] flex flex-col justify-center">
                            <h3 className="text-[20px] font-Gantari font-semibold text-[#353535] leading-tight">
                              {p.project_name ?? "Untitled Project"}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#E8E8E8] pt-4 mt-auto">
                          <div className="flex -space-x-4 min-w-0">
                            {(() => {
                              const projectEmployees = memberIds
                                .map((id) => resolveVendorMember(id))
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
                                        className="w-9 h-9 rounded-full border border-white bg-slate-100 overflow-hidden cursor-pointer"
                                        title={emp.full_name}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openMemberProfile(emp);
                                        }}
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                          ) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openMemberProfile(emp);
                                          }
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
                                          <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[12px] font-medium text-slate-600">
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
                                      className="w-9 h-9 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setAllMembersList(projectEmployees);
                                        setShowAllMembersModal(true);
                                      }}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === " "
                                        ) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setAllMembersList(projectEmployees);
                                          setShowAllMembersModal(true);
                                        }
                                      }}
                                    >
                                      +{remainingCount}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          {p.priority ? (
                            <div
                              className={`px-4 py-1 rounded-[5px] text-white text-[13px] font-medium font-Gantari shadow-sm shrink-0 ${
                                (p.priority || "").toLowerCase() === "high" || 
                                (p.priority || "").toLowerCase() === "urgent" 
                                  ? "bg-[#DD4342]" 
                                  : "bg-[#94D6F2]"
                              }`}
                            >
                              {p.priority}
                            </div>
                          ) : (
                            <div className="px-4 py-1 rounded-[5px] bg-[#94D6F2] text-white text-[13px] font-medium font-Gantari shadow-sm shrink-0">
                              Low
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

      {showAllMembersModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-[28px] font-semibold text-[#1A1A1A] font-Gantari">
                All Members ({allMembersList.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAllMembersModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                aria-label="Close"
              >
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
                      onClick={() => {
                        openMemberProfile(member);
                        setShowAllMembersModal(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openMemberProfile(member);
                          setShowAllMembersModal(false);
                        }
                      }}
                    >
                      <div className="w-12 h-12 rounded-full border-2 border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={ProfileIcon}
                          alt={member.full_name || "Member"}
                          className="w-full h-full object-cover p-1"
                        />
                      </div>
                      <div>
                        <p className="text-[16px] font-semibold text-[#1A1A1A] font-Gantari">
                          {member.full_name || "Unknown"}
                        </p>
                        {member.email && (
                          <p className="text-[14px] text-[#8B8B8B] font-Gantari">
                            {member.email}
                          </p>
                        )}
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
              <h3 className="text-[28px] font-semibold text-[#1A1A1A] font-Gantari">
                View Details
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowMemberProfileModal(false);
                  setSelectedMember(null);
                }}
                className="p-2 rounded-[5px] bg-[#F2F2F2] cursor-pointer"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-8 py-6 custom-scrollbar space-y-4">
              <p className="text-[20px] font-Gantari font-bold text-[#1A1A1A]">
                {selectedMember.full_name || "Not Available"}
              </p>
              {selectedMember.employee_id && (
                <p className="text-[16px] font-Gantari">
                  <span className="text-[#999]">Employee ID: </span>
                  {selectedMember.employee_id}
                </p>
              )}
              {selectedMember.email && (
                <p className="text-[16px] font-Gantari">
                  <span className="text-[#999]">Email: </span>
                  {selectedMember.email}
                </p>
              )}
              {(selectedMember.phone || selectedMember.phone_number) && (
                <p className="text-[16px] font-Gantari">
                  <span className="text-[#999]">Phone Number: </span>
                  {selectedMember.phone || selectedMember.phone_number}
                </p>
              )}
              {selectedMember.user_role && (
                <p className="text-[16px] font-Gantari">
                  <span className="text-[#999]">Role: </span>
                  {selectedMember.user_role}
                </p>
              )}
              {selectedMember.department && (
                <p className="text-[16px] font-Gantari">
                  <span className="text-[#999]">Department: </span>
                  {selectedMember.department}
                </p>
              )}
              {selectedMember.address && (
                <p className="text-[16px] font-Gantari">
                  <span className="text-[#999]">Address: </span>
                  {selectedMember.address}
                </p>
              )}
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
            <h3 className="text-xl font-bold text-[#1E293B] mb-2 font-gantari">
              Delete Project
            </h3>
            <p className="text-slate-500 mb-8 font-gantari">
              Are you sure you want to delete this project? This action cannot
              be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#F2F2F2] font-bold text-slate-600 transition-colors hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold transition-all hover:bg-red-600 shadow-lg shadow-red-100 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Notification */}
      {successMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-[#1A1A1A] text-white px-8 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-white"
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
            <p className="text-[16px] font-bold font-gantari pr-4">
              {successMsg}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
