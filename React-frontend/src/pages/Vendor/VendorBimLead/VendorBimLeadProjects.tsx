import { useEffect, useState } from "react";
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
}

interface Employee {
  id: number;
  full_name?: string;
  user_role?: string;
  profile_picture?: string;
  email?: string;
}

export default function VendorBimLeadProjects() {
  const navigate = useNavigate();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<number | null>(
    null,
  );
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [clientsList, setClientsList] = useState<
    Array<{ id: number; fullName?: string; full_name?: string }>
  >([]);

  const [showProjectView, setShowProjectView] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [taskStats] = useState({
    todo: 0,
    inProgress: 0,
    paused: 0,
    completed: 0,
  });

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

  // const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editError, setEditError] = useState("");

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
        const emps = data.employees ?? [];
        setAllEmployees(emps);
        setProjectManagers(
          emps.filter((e) => e.user_role === "Project Manager"),
        );
        setBimLeads(emps.filter((e) => e.user_role === "BIM Lead"));
        setBimCoordinators(
          emps.filter((e) => e.user_role === "BIM Coordinator"),
        );
      })
      .catch(() => {
        setAllEmployees([]);
        setProjectManagers([]);
        setBimLeads([]);
        setBimCoordinators([]);
      });

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
    setCreateProjectManager(idToName(p.project_manager_id, allEmployees));
    setCreateStartDate(p.start_date ? p.start_date.split("T")[0] : "");
    setCreateEndDate(p.end_date || p.due_date || "");
    setCreateTotalHours(p.totalhours || "");
    setCreatePerDay(p.per_day || p.perday || "");
    setCreateBIMLead(idToName(p.lead_id, allEmployees));
    setCreateBIMCoOrdinator(idToName(p.bim_coordinator_id, allEmployees));
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
      .then(({ data }) => {
        if (data.success) {
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
          setCreateDeliverables("");
          setCreateDepartment("");
          setCreateTaskName("");
          setCreateFile(null);

          setSuccessMsg("Project updated!");
          setTimeout(() => setSuccessMsg(null), 3000);
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

  const getEmployeeName = (id: any) =>
    allEmployees.find((e) => e.id === Number(id))?.full_name || "";
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

  const renderMemberSelector = () => (
    <div className="space-y-2">
      <label className="block text-[15px] font-bold text-[#353535]">
        Team Members
      </label>
      <div className="relative">
        <div
          onClick={() =>
            setEditDropdownOpen((prev) =>
              prev === "members" ? null : "members",
            )
          }
          className="w-full px-4 py-3 bg-[#F2F2F2] rounded-lg cursor-pointer flex flex-wrap gap-2 items-center min-h-[50px] hover:bg-[#EAEAEA] transition-colors"
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
            {allEmployees.map((emp) => (
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
              className="w-full flex items-center justify-between px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] placeholder:font-medium bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
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
          {!createFile ? (
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
                className="text-slate-400 hover:text-red-500"
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
      <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
        {successMsg && (
          <div className="fixed top-5 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl bg-[#1A8A47] text-white font-gantari text-sm font-medium animate-in slide-in-from-right duration-300">
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Project View (In-Page) */}
        {showEditModal ? (
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center gap-4 md:gap-6 px-6 py-6 md:px-10 md:py-8 border-b border-slate-50 cursor-pointer">
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
                title="Back"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#1A1A1A] truncate">
                  Edit Project Details
                </h3>
                <p className="text-[14px] font-Gantari font-semibold text-[#999999]">
                  Update your project information
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-6 md:pt-8 custom-scrollbar">
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
                    className="px-5 py-2 rounded-md bg-[#F2F2F2] text-[#666666] font-medium text-[16px]"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2 rounded-md bg-[#DD4342] text-white font-medium text-[16px]"
                  >
                    {editSubmitting ? "Updating..." : "Update Project"}
                  </button>
                </div>
                {editError && (
                  <p className="text-[#DD4342] text-sm font-bold text-center mt-4 uppercase tracking-wider">
                    {editError}
                  </p>
                )}
              </form>
            </div>
          </div>
        ) : showProjectView && selectedProject ? (
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center gap-4 md:gap-6 px-6 py-6 md:px-10 md:py-8 border-b border-slate-50">
              <button
                type="button"
                onClick={() => setShowProjectView(false)}
                className="p-2 rounded-md bg-[#F2F2F2] text-[#000000] transition-colors"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h3 className="text-[20px] md:text-[24px] font-medium text-[#000000]">
                  {selectedProject.project_name ?? "Untitled Project"}
                </h3>
                <p className="text-[14px] font-medium text-[#999999]">
                  Overall Progress Tracker
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-10 pt-6 md:pt-8 custom-scrollbar space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-8">
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
                    className="text-left bg-[#F2F2F2] p-4 rounded-md flex flex-col h-[80px] md:h-[100px] hover:bg-[#DD4342] focus:outline-none cursor-pointer transition-all group"
                  >
                    <p className="text-[#353535] group-hover:text-white text-[16px] md:text-[18px] font-medium">
                      {stat.label}
                    </p>
                    <p className="text-[#353535] group-hover:text-white text-[20px] md:text-[24px] font-bold leading-none mt-auto self-center">
                      {stat.value}
                    </p>
                  </button>
                ))}
              </div>
              <div className="border border-slate-200 rounded-lg p-4 md:p-6">
                <h4 className="text-[20px] font-Gantari font-medium text-[#000000] mb-4">
                  Project Details
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 md:gap-y-6 lg:gap-x-20">
                  <div className="space-y-4 md:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                        Actual Start Date
                      </span>
                      <span className="hidden sm:inline text-[#616161] mr-4">
                        :
                      </span>
                      <span className="text-[16px] font-gantari font-medium text-[#616161]">
                        {formatDate(selectedProject.start_date)}
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
                        {selectedProject.totalhours
                          ? `${selectedProject.totalhours}hrs`
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
                        {selectedProject.budget_ceiling || "N/A"}
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
                        {selectedProject.resources ||
                          selectedProject.no_resource ||
                          "N/A"}
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
                        {selectedProject.location || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <span className="w-full sm:w-48 text-[16px] font-gantari font-medium text-[#353535]">
                        Actual End Date
                      </span>
                      <span className="hidden sm:inline text-[#616161] mr-4">
                        :
                      </span>
                      <span className="text-[16px] font-gantari font-medium text-[#616161]">
                        {formatDate(
                          selectedProject.end_date || selectedProject.due_date,
                        )}
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
                        {selectedProject.per_day || selectedProject.perday
                          ? `${selectedProject.per_day || selectedProject.perday}hrs`
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
                        {selectedProject.required_resources ||
                          selectedProject.no_resources_required ||
                          "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-[10px] p-6 md:p-8">
                <h4 className="text-[18px] md:text-[20px] font-semibold text-[#000000]">
                  Project Description
                </h4>
                <p className="text-[16px] font-medium text-[#666666] mt-4 leading-relaxed">
                  {selectedProject.description ?? "No description available"}
                </p>
              </div>

              {/* Team Roles Section */}
              <div className="border border-slate-200 rounded-[10px] p-6 md:p-8 space-y-6">
                <h4 className="text-[18px] md:text-[20px] font-semibold text-[#000000]">
                  Team Overview
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    {
                      label: "Project Manager",
                      id: selectedProject.project_manager_id,
                    },
                    { label: "BIM Lead", id: selectedProject.lead_id },
                    {
                      label: "BIM Coordinator",
                      id: selectedProject.bim_coordinator_id,
                    },
                  ].map((role) => (
                    <div key={role.label} className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <span className="text-slate-400 font-semibold text-[16px]">
                          {getEmployeeName(role.id)
                            ? getEmployeeName(role.id).charAt(0).toUpperCase()
                            : "??"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#999999] uppercase tracking-wider">
                          {role.label}
                        </p>
                        <p className="text-[15px] font-bold text-[#353535] truncate">
                          {getEmployeeName(role.id) || "Not assigned"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <p className="text-[16px] font-medium text-[#353535] mb-4">
                    Team Members
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {(selectedProject.members || "")
                      .split(",")
                      .filter(Boolean)
                      .map((id) => {
                        const emp = allEmployees.find(
                          (e) => e.id === Number(id),
                        );
                        return emp ? (
                          <div
                            key={id}
                            className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-[16px] font-medium">
                              {(emp.full_name || "?")[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[16px] font-medium text-[#1E293B] truncate">
                                {emp.full_name}
                              </p>
                              <p className="text-[16px] text-[#999] font-medium">
                                {emp.user_role || "Member"}
                              </p>
                            </div>
                          </div>
                        ) : null;
                      })}
                    {!(selectedProject.members || "").split(",").filter(Boolean)
                      .length && (
                      <p className="text-[#999] text-sm italic">
                        No team members assigned
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : showMilestones && milestonesProject ? (
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setShowMilestones(false)}
                  className="p-3 rounded-lg bg-[#F8F9FA] hover:bg-gray-100 transition-colors"
                >
                  <img src={backIcon} alt="Back" className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-[26px] font-bold">Payment Milestones</h3>
                  <p className="text-[16px] font-bold text-[#999999]">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 px-4">
              <h2 className="text-[24px] font-semibold text-[#000000]">
                Projects
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto pt-4 pb-10 px-4 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
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
                        className="bg-white rounded-2xl border border-slate-200 p-4 pt-1 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
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
                                    transition:
                                      "stroke-dashoffset 0.8s ease-in-out",
                                  }}
                                />
                              </svg>
                              <span className="absolute text-[16px] font-Gantari font-bold text-[#353535]">
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

                          <div className="mb-4 ml-4 -mt-4">
                            <h3 className="text-[18px] md:text-[20px] font-Gantari font-medium text-[#000000]">
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
                                        className="w-9 h-9 rounded-full border border-white bg-slate-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#F2F2F2]"
                                        title={emp.full_name}
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
                                    <div className="w-9 h-9 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors">
                                      +{remainingCount}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          {p.priority && (
                            <span
                              className={`px-2.5 py-1 rounded-md text-[12px] font-Gantari font-semibold tracking-wider ${p.priority === "High" || p.priority === "Urgent" ? "bg-red-200 text-red-600 border border-red-100" : p.priority === "Medium" ? "bg-orange-200 text-orange-600 border border-orange-100" : "bg-green-200 text-green-600 border border-green-100"}`}
                            >
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

      {/* Create Modal removed - vendors cannot create projects */}
      {/* {showCreateModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
      {/* <div className="relative flex items-center justify-center px-10 py-8 border-b border-slate-50">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute left-10 p-2 rounded-md bg-[#F2F2F2] text-[#000000] cursor-pointer"
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
              <h3 className="text-[24px] font-medium text-[#000000]">
                Add New Project
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
              <form onSubmit={handleCreate} className="space-y-10">
                {renderFormFields()}
                <div className="flex justify-center gap-6 pt-6 pb-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2 rounded-md sm:text-[14px] bg-[#F2F2F2] text-[#353535] font-medium cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-6 py-2 rounded-md bg-[#DBE9FE] text-[#353535] text-[14px] font-medium cursor-pointer"
                  >
                    {createSubmitting ? "Creating..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )} */}

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
    </div>
  );
}
