import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { vendorProjectIdQuery } from "../../utils/urlIdCrypto";
import { useAuth } from "../../contexts/AuthContext";
import ProfileIcon from "../../assets/ProductNavbarIcons/Profile.svg";
import closeBtnIcon from "../../assets/ProductNavbarIcons/close button.svg";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
import { FiUploadCloud, FiPaperclip } from "react-icons/fi";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import swifterzLogo from "../../assets/ProductNavbarIcons/swifterzlogo.png";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import paymentMilestoneIcon from "../../assets/ProjectManager/project/paymentMilestone.svg";
import threedot from "../../assets/ProjectManager/project/threedot.svg";
import ProjectAllMembersModal from "../../components/ProjectAllMembersModal";
import ProjectCardTeamAvatars from "../../components/ProjectCardTeamAvatars";
import {
  fetchVendorTeamEmployees,
  mapVendorProjectFromApi,
  toVendorProjectTeamLike,
  useProjectTeamRoster,
  type ProjectWithVendorProfiles,
  type RosterEmployeeLike,
} from "../../hooks/useProjectTeamRoster";
import type { PmTeamRosterEntry } from "../../utils/projectTeamRoster";
import ProjectDocumentsSection from "../../components/ProjectDocumentsSection";
import ProjectEditAttachments from "../../components/ProjectEditAttachments";
import {
  getProjectApiBase,
  splitProjectEditDocuments,
  type ProjectDocumentItem,
} from "../../utils/projectDetails";

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
  client_name?: string;
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
  budget_ceiling?: string;
  bidding_end_date?: string;
  end_date?: string;
  proposal_id?: number;
  opportunity_id?: number;
  deliverables?: string;
  document_attachment?: string;
  attachments?: ProjectDocumentItem[];
  source?: string;
  project_manager_name?: string;
  lead_name?: string;
  bim_coordinator_name?: string;
  project_manager_profile_picture?: string;
  lead_profile_picture?: string;
  bim_coordinator_profile_picture?: string;
  member_profile_pictures?: Array<{
    id: number | string;
    profile_picture?: string;
  }>;
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
  dob?: string;
  doj?: string;
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

/** Normalize API / input value to YYYY-MM-DD for date inputs and day math. */
function toCalendarYmd(raw: string): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim().split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

/** Inclusive calendar days from start through end (both dates count as working days). */
function countInclusiveProjectDays(
  startYmd: string,
  endYmd: string,
): number | null {
  const a = toCalendarYmd(startYmd);
  const b = toCalendarYmd(endYmd);
  if (!a || !b) return null;
  const [ys, ms, ds] = a.split("-").map(Number);
  const [ye, me, de] = b.split("-").map(Number);
  const start = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (diffDays < 0) return null;
  return diffDays + 1;
}

/** Opens a local `File` in a new browser tab. */
/** Helper to open a URL in a new tab safely. */
function openUrlInNewTab(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/** Opens a local `File` in a new browser tab using a Blob URL. */
function openAttachmentInNewTab(file: File) {
  const url = URL.createObjectURL(file);
  openUrlInNewTab(url);
  // Revoke after delay so the new tab can load the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
}

/**
 * Fetches a remote document and opens it in a new tab as a Blob URL.
 * This bypasses server-forced downloads (Content-Disposition: attachment).
 */
async function viewRemoteDocument(url: string) {
  try {
    const response = await api.get(url, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(response.data);
    openUrlInNewTab(blobUrl);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 300_000);
  } catch (err) {
    console.error("Error viewing remote document:", err);
    // Fallback to direct link if fetch fails
    openUrlInNewTab(url);
  }
}

const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";
const SHOW_ENTRIES_SELECTED_PREFIX = "Show:";
const showEntriesOptions: {
  value: string;
  label: string;
  start: number;
  end: number | null;
}[] = [
    { value: "1-50", label: "1-50", start: 0, end: 50 },
    { value: "51-100", label: "51-100", start: 50, end: 100 },
    { value: "101-150", label: "101-150", start: 100, end: 150 },
    { value: "151-200", label: "151-200", start: 150, end: 200 },
    { value: "201-250", label: "201-250", start: 200, end: 250 },
    { value: "251-300", label: "251-300", start: 250, end: 300 },
    { value: "all", label: "All", start: 0, end: null },
  ];

const SCROLLBAR_STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
    height: 0px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #979797;
    border-radius: 10px;
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #979797 transparent;
  }
`;

function HeaderDropdown({
  value,
  onChange,
  placeholder,
  options,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  options: { label: string; value: string }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedLabel =
    options.find((opt) => opt.value === value)?.label || placeholder;

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className || "w-full"}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
      >
        <span className={`${value ? "text-[#353535]" : "text-[#8B8B8B]"} truncate`}>
          {selectedLabel}
        </span>
        <img
          src={ArrowDown}
          alt=""
          className={`w-3 h-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-[10px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={`${placeholder}-${opt.value}-${opt.label}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-[14px] font-gantari transition-colors cursor-pointer ${selected
                    ? "text-[#353535] bg-[#F2F2F2]"
                    : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"
                    }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsV() {
  const { user: authUser } = useAuth();
  const userRole = authUser?.user_role || "";
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

  const handleDelete = () => {
    if (deleteId === null) return;
    api
      .delete(`/api/vendors/vendor-projects/${deleteId}`)
      .then(({ data }) => {
        if (data.success) {
          setDeleteId(null);
          toast.success("Project deleted successfully");
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
  const [taskStats, setTaskStats] = useState({
    todo: 0,
    inProgress: 0,
    paused: 0,
    completed: 0,
  });
  const [towerData, setTowerData] = useState<Tower[]>([]);
  const [loadingTaskStats, setLoadingTaskStats] = useState(false);

  // Create/Edit Project Fields (Matching ProjectsTD)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [createName, setCreateName] = useState("");
  const [createBudget, setCreateBudget] = useState("");
  const [createCurrency, setCreateCurrency] = useState("INR");
  const [createModuleName, setCreateModuleName] = useState("");
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [clientViewOnlyDocs, setClientViewOnlyDocs] = useState<
    ProjectDocumentItem[]
  >([]);
  const [createClientName, setCreateClientName] = useState("");
  const [createProjectManager, setCreateProjectManager] = useState("");
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
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
  const [vendorResourceProfiles, setVendorResourceProfiles] = useState<
    Employee[]
  >([]);
  const [vendorTeamEmployees, setVendorTeamEmployees] = useState<
    RosterEmployeeLike[]
  >([]);

  // Milestones view
  const [showMilestones, setShowMilestones] = useState(false);
  const [milestonesProject, setMilestonesProject] = useState<Project | null>(
    null,
  );

  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [allMembersList, setAllMembersList] = useState<PmTeamRosterEntry[]>([]);
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Employee | null>(null);

  const computedTotalHours = useMemo(() => {
    const days = countInclusiveProjectDays(createStartDate, createEndDate);
    const per = parseFloat(String(createPerDay).trim().replace(/,/g, ""));
    if (days === null || days < 1 || !Number.isFinite(per) || per <= 0) {
      return "";
    }
    return (days * per).toFixed(2);
  }, [createStartDate, createEndDate, createPerDay]);

  const getCurrencySymbol = (code?: string) => {
    return (code || "INR").toUpperCase();
  };

  const apiBaseForFiles = getProjectApiBase(String(api.defaults.baseURL || ""));

  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [projectFilter, setProjectFilter] = useState("");
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.setAttribute("data-v-scrollbar", "1");
    styleTag.textContent = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowEntriesOpen(false);
      }
    };
    if (showEntriesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEntriesOpen]);

  const projectNames = useMemo(() => {
    return Array.from(new Set(list.map((p) => (p.project_name || "").trim()).filter(Boolean))).sort();
  }, [list]);

  const projectFilterOptions = useMemo(() => {
    return [
      { label: "Project Name", value: "" },
      ...projectNames.map((name) => ({ label: name, value: name })),
    ];
  }, [projectNames]);

  const handleProjectFilter = (v: string) => {
    setProjectFilter(v);
  };

  const filteredList = useMemo(() => {
    return list.filter(p => {
      const matchesSearch = !searchQuery || (
        (p.project_name || "").toLowerCase().includes(searchQuery) ||
        (p.client_name || "").toLowerCase().includes(searchQuery)
      );
      if (!matchesSearch) return false;
      if (projectFilter && p.project_name !== projectFilter) return false;
      return true;
    });
  }, [list, searchQuery, projectFilter]);

  const effectiveShowEntryValue = selectedShowEntries || showEntriesOptions[0].value;
  const selectedRange = showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ?? showEntriesOptions[0];
  const rangeEnd = selectedRange.end === null ? filteredList.length : Math.min(selectedRange.end, filteredList.length);
  const listInRange = useMemo(() => {
    return filteredList.slice(selectedRange.start, rangeEnd);
  }, [filteredList, selectedRange, rangeEnd]);

  const fetchProjects = (status?: string | null) => {
    const params: any = {};
    if (status) params.status = status;

    api
      .get<{ projects?: Record<string, unknown>[] }>(
        "/api/vendors/vendor-projects",
        { params },
      )
      .then(({ data }) =>
        setList(
          (data.projects ?? []).map(
            (row) => mapVendorProjectFromApi(row) as unknown as Project,
          ),
        ),
      )
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Close main project row menus
      if (!target.closest(".project-menu-container")) {
        setOpenMenuProjectId(null);
      }
      // Close in-form dropdowns (Project Manager, BIM Lead, BIM Coordinator, etc.)
      if (editDropdownOpen && !target.closest(".dropdown-container")) {
        setEditDropdownOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editDropdownOpen]);

  useEffect(() => {
    fetchProjects(statusFilter);

    // Fetch all employees once (used for team member selection, etc.)
    api
      .get<{ employees?: Employee[] }>("/api/employees")
      .then(({ data }) => {
        const allEmp = data.employees ?? [];
        setAllEmployees(allEmp);

        // BIM Coordinators still come from the generic employee list
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

    // Vendor-side Project Managers (role = "Vendor PM" in vendor_employee)
    api
      .get<{ success: boolean; employees?: Employee[] }>(
        "/api/vendors/vendor-by-role?role=Vendor PM",
      )
      .then(({ data }) => {
        setProjectManagers(data.employees ?? []);
      })
      .catch(() => {
        setProjectManagers([]);
      });

    // Vendor-side BIM Leads (role = "Vendor Bim Lead" in vendor_employee)
    api
      .get<{ success: boolean; employees?: Employee[] }>(
        "/api/vendors/vendor-by-role?role=Vendor Bim Lead",
      )
      .then(({ data }) => {
        setBimLeads(data.employees ?? []);
      })
      .catch(() => {
        setBimLeads([]);
      });

    // Fetch clients
    api
      .get<{ clients?: any[] }>("/api/clients")
      .then(({ data }) => setClientsList(data.clients ?? []))
      .catch(() => setClientsList([]));

    // Fetch vendor resource profiles for Team Members dropdown
    api
      .get<{ success: boolean; resources?: Employee[] }>(
        "/api/vendors/vendor-resource-profiles",
      )
      .then(({ data }) => {
        setVendorResourceProfiles(data.resources ?? []);
      })
      .catch(() => {
        setVendorResourceProfiles([]);
      });

    fetchVendorTeamEmployees((url) => api.get(url))
      .then(setVendorTeamEmployees)
      .catch(() => setVendorTeamEmployees([]));
  }, []);

  // Auto-fetch client budget whenever a valid client is selected/typed
  useEffect(() => {
    if (!createClientName || clientsList.length === 0) return;
    const client = clientsList.find(
      (c) => (c.fullName || c.full_name) === createClientName,
    );
    if (!client) return;

    api
      .get<{ client_budget: number | null }>(
        `/api/vendors/client-budget?client_id=${client.id}`,
      )
      .then(({ data }) => {
        if (data.client_budget !== null && data.client_budget !== undefined) {
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
    const resource = vendorResourceProfiles.find((r) => r.id === Number(id));
    if (resource) return resource.full_name || "";
    const emp = allEmployees.find((e) => e.id === Number(id));
    return emp?.full_name || "";
  };

  const getMemberForAvatar = (id: number): Employee | undefined =>
    vendorResourceProfiles.find((r) => r.id === id) ||
    allEmployees.find((e) => e.id === id);
  const openMemberProfile = (member?: Employee | RosterEmployeeLike) => {
    if (!member) return;
    const extra = member as Employee & Record<string, unknown>;
    setSelectedMember({
      ...extra,
      id: Number(member.id),
      employee_id: extra.employee_id || extra.empid,
      phone: extra.phone || extra.phone_number,
      user_role: extra.user_role || extra.role || extra.designation,
    });
    setShowMemberProfileModal(true);
  };

  const { teamRosterForProject, resolveProjectMember } = useProjectTeamRoster(
    allEmployees,
    vendorResourceProfiles,
    vendorTeamEmployees,
  );
  const teamRosterForVendorProject = (proj: Project) =>
    teamRosterForProject(toVendorProjectTeamLike(proj));

  const formatDate = (d: string | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Convert stored HTML description to plain text for editing
  const htmlToPlainText = (html: string | undefined | null): string => {
    if (!html) return "";
    if (typeof window === "undefined" || typeof document === "undefined") {
      // Fallback for non-DOM environments
      return html
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .trim();
    }
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").trim();
  };

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

  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !createName.trim() ||
      !createStartDate ||
      !createEndDate ||
      !createPerDay ||
      !computedTotalHours ||
      !createPriority ||
      !createLocation
    ) {
      setCreateError("Please fill all required fields.");
      return;
    }
    setCreateError("");
    setCreateSubmitting(true);
    api
      .post("/api/vendors/vendor-projects", {
        project_name: createName,
        budget: createBudget,
        modules: createModuleName,
        project_manager_id: nameToId(createProjectManager, projectManagers),
        lead_id: nameToId(createBIMLead, bimLeads),
        bim_coordinator_id: nameToId(createBIMCoOrdinator, bimCoordinators),
        start_date: createStartDate,
        due_date: createEndDate,
        totalhours: computedTotalHours,
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
      .then(async ({ data }) => {
        if (data.success) {
          const projectId = data.project_id;
          if (createFile && projectId) {
            const formData = new FormData();
            formData.append("file", createFile);
            await api.post(
              `/api/vendors/vendor-projects/${projectId}/upload-document`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            );
          }

          setShowCreateModal(false);
          // Reset fields
          setCreateName("");
          setCreateBudget("");
          setCreateCurrency("INR");
          setCreateModuleName("");
          setCreateClientName("");
          setCreateProjectManager("");
          setCreateStartDate("");
          setCreateEndDate("");
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

          toast.success("Project created successfully");
          fetchProjects();
        } else {
          setCreateError(data.message || "Failed to create project.");
        }
      })
      .catch((err) => {
        setCreateError(err.response?.data?.message || "Error occurred.");
      })
      .finally(() => setCreateSubmitting(false));
  };

  const openEdit = (p: Project) => {
    setEditId(p.id);
    setCreateName(p.project_name || "");
    // Vendor accepted bid amount (from vendor_projects.budget / accepted bid)
    setCreateBudget(p.budget || "");
    setCreateCurrency(
      (p.currency || p.selected_currency || "INR").toUpperCase(),
    );
    setCreateModuleName(p.modules || "");
    // Prefer hydrated client_name from backend; otherwise resolve via id
    setCreateClientName(
      p.client_name ||
      getClientNameById(p.client_id) ||
      (p.client_id ? String(p.client_id) : ""),
    );
    // Resolve Project Manager from projectManagers array (vendor PMs from vendor-by-role API)
    // Fall back to allEmployees if not found in projectManagers
    setCreateProjectManager(
      idToName(p.project_manager_id, projectManagers) ||
      idToName(p.project_manager_id, allEmployees) ||
      "",
    );
    // Improvement: check both start_date and potentially other date fields if missing
    const rawStartDate = p.start_date || "";
    setCreateStartDate(rawStartDate ? rawStartDate.split("T")[0] : "");

    setCreateEndDate((p.end_date || p.due_date || "").split("T")[0] || "");
    setCreatePerDay(p.per_day || p.perday || "");
    // Resolve BIM Lead from bimLeads array (vendor BIM Leads from vendor-by-role API)
    // Fall back to allEmployees if not found in bimLeads
    setCreateBIMLead(
      idToName(p.lead_id, bimLeads) || idToName(p.lead_id, allEmployees) || "",
    );
    setCreateBIMCoOrdinator(idToName(p.bim_coordinator_id, allEmployees));
    setCreateResources(p.resources || p.no_resource || "");
    setCreateRequiredResources(
      p.required_resources || p.no_resources_required || "",
    );
    setCreatePriority(p.priority || "");
    setCreateLocation(p.location || "");
    const docSplit = splitProjectEditDocuments(p);
    setClientViewOnlyDocs(docSplit.clientViewOnly);
    setExistingFiles(docSplit.teamEditable.map((d) => d.fileUrl));
    setCreateDeliverables(p.deliverables || "");
    // Strip HTML tags / entities so the textarea shows clean text
    setCreateDescription(htmlToPlainText(p.description));
    setCreateDeliverables(p.deliverables || "");

    setSelectedMemberIds(
      p.members ? p.members.split(",").filter(Boolean).map(Number) : [],
    );
    setShowEditModal(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    if (
      !createName.trim() ||
      !createStartDate ||
      !createEndDate ||
      !createPerDay ||
      !computedTotalHours ||
      !createPriority ||
      !createLocation
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
        project_manager_id: nameToId(createProjectManager, projectManagers),
        lead_id: nameToId(createBIMLead, bimLeads),
        bim_coordinator_id: nameToId(createBIMCoOrdinator, bimCoordinators),
        start_date: createStartDate,
        due_date: createEndDate,
        totalhours: computedTotalHours,
        perday: createPerDay,
        members: selectedMemberIds.join(","),
        // Backend column names are no_resource / no_resources_required
        no_resource: createResources,
        no_resources_required: createRequiredResources,
        priority: createPriority,
        location: createLocation,
        description: createDescription,
        deliverables: createDeliverables,
        document_attachment: existingFiles.join(","),
      })
      .then(async ({ data }) => {
        if (data.success) {
          if (createFile) {
            const formData = new FormData();
            formData.append("file", createFile);
            await api.post(
              `/api/vendors/vendor-projects/${editId}/upload-document`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            );
          }

          setShowEditModal(false);
          // Reset fields
          setCreateName("");
          setCreateBudget("");
          setCreateCurrency("INR");
          setCreateModuleName("");
          setCreateClientName("");
          setCreateProjectManager("");
          setCreateStartDate("");
          setCreateEndDate("");
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
          setExistingFiles([]);
          setClientViewOnlyDocs([]);

          toast.success("Project updated successfully");
          fetchProjects();
        } else {
          setEditError(data.message || "Failed to edit project.");
        }
      })
      .catch((err) => {
        setEditError(err.response?.data?.message || "Error occurred.");
      })
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
        project.client_name || getClientNameById(project.client_id ?? trimmed);
      if (resolved && resolved !== createClientName) {
        setCreateClientName(resolved);
      }
    }
  }, [showEditModal, editId, clientsList, list, createClientName]);

  const toggleMember = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Fetch task stats and tower data for selected project when viewing it
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
        success: boolean;
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

        if (data.status_counts) {
          setTaskStats({
            todo: data.status_counts.todo ?? 0,
            inProgress: data.status_counts.inprogress ?? 0,
            paused: data.status_counts.paused ?? 0,
            completed: data.status_counts.completed ?? 0,
          });
        }

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

  const renderMemberSelector = () => (
    <div className="space-y-4 dropdown-container">
      <label className="block text-[16px] font-medium text-[#000000]">
        Team Members
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={(o) => {
            o.stopPropagation();
            setEditDropdownOpen(
              editDropdownOpen === "members" ? null : "members",
            );
          }}
          className="w-full flex items-center justify-between px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-left cursor-pointer"
        >
          <span
            className={`${selectedMemberIds.length > 0 ? "text-[#353535]" : "text-[#8B8B8B]"} text-[14px]`}
          >
            {selectedMemberIds.length > 0
              ? `${selectedMemberIds.length} members selected`
              : "Select members"}
          </span>
          <svg
            className={`w-5 h-5 text-[#8B8B8B] shrink-0 transition-transform ${editDropdownOpen === "members" ? "rotate-180" : ""}`}
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
        {editDropdownOpen === "members" && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md bg-white border border-slate-200 shadow-lg py-1 max-h-56 overflow-y-auto custom-scrollbar">
            {vendorResourceProfiles.length === 0 ? (
              <div className="px-5 py-3 text-sm text-[#616161] text-center">
                No team members available
              </div>
            ) : (
              <>
                {vendorResourceProfiles.map((resource) => {
                  const isSelected = selectedMemberIds.includes(resource.id);
                  return (
                    <button
                      key={resource.id}
                      type="button"
                      onClick={() => toggleMember(resource.id)}
                      className={`flex items-center justify-between w-full px-5 py-2.5 text-sm hover:bg-[#F2F2F2] transition-colors ${isSelected ? "bg-[#FFF1F1] text-[#DD4342]" : "text-[#353535]"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? "bg-[#DD4342] text-white" : "bg-slate-200 text-slate-500"}`}
                        >
                          {(resource.full_name || "?")[0]}
                        </div>
                        <span className="font-semibold">
                          {resource.full_name}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? "bg-[#DD4342] border-[#DD4342]" : "bg-white border-gray-300"}`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
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
          <label className="block text-[16px] font-medium text-[#000000]">
            Project Name <span className="text-[#DD4342]">*</span>
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-[#353535] placeholder:text-[14px] placeholder:font-normal placeholder-gray-400"
            placeholder="Enter Project name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
        </div>
        {/* Client Name intentionally disabled for Vendor panel (V/PMV/VBL parity). */}

        {/* Row 2: Client Budget (read-only), Outsourcing Budget */}
        {userRole === "Vendor" && (
          <div className="space-y-2">
            <label className="block text-[16px] font-medium text-[#000000]">
              Budget
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                className="w-[120px] px-4 py-2 bg-[#F2F2F2] border-none rounded-md font-medium text-[#616161] cursor-not-allowed"
                value={createCurrency}
              />
              <input
                type="text"
                readOnly
                className="flex-1 px-5 py-2 bg-[#F2F2F2] border-none rounded-md font-medium text-[#616161] cursor-not-allowed placeholder:text-[14px] placeholder:font-normal"
                placeholder="Auto-fetched from contract"
                value={createBudget}
              />
            </div>
          </div>
        )}

        {/* Row 3: Bidding End Date, Project Manager */}
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#000000]">
            Select Project Manager <span className="text-[#DD4342]">*</span>
          </label>
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={() =>
                setEditDropdownOpen((o) => (o === "pm" ? null : "pm"))
              }
              className="w-full flex items-center justify-between px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-left cursor-pointer"
            >
              <span
                className={`${createProjectManager ? "text-[#353535]" : "text-[#8B8B8B]"} text-[14px]`}
              >
                {createProjectManager || "Select Project Manager"}
              </span>
              <svg
                className={`w-5 h-5 text-[#8B8B8B] shrink-0 transition-transform ${editDropdownOpen === "pm" ? "rotate-180" : ""}`}
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
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCreateProjectManager("");
                    setEditDropdownOpen(null);
                  }}
                  className="block w-full text-left px-5 py-2.5 text-sm text-[#353535] hover:bg-[#F2F2F2]"
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
                    className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F2F2F2] ${createProjectManager === pm.full_name
                        ? "bg-[#FFF1F1] text-[#DD4342]"
                        : "text-[#353535]"
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
          <label className="block text-[16px] font-medium text-[#000000]">
            Select BIM Lead <span className="text-[#DD4342]">*</span>
          </label>
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={() =>
                setEditDropdownOpen((o) => (o === "bimLead" ? null : "bimLead"))
              }
              className="w-full flex items-center justify-between px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-left cursor-pointer"
            >
              <span
                className={`${createBIMLead ? "text-[#353535]" : "text-[#8B8B8B]"} text-[14px]`}
              >
                {createBIMLead || "Select BIM Lead"}
              </span>
              <svg
                className={`w-5 h-5 text-[#8B8B8B] shrink-0 transition-transform ${editDropdownOpen === "bimLead" ? "rotate-180" : ""}`}
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
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCreateBIMLead("");
                    setEditDropdownOpen(null);
                  }}
                  className="block w-full text-left px-5 py-2.5 text-sm text-[#353535] hover:bg-[#F2F2F2]"
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
                    className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F2F2F2] ${createBIMLead === lead.full_name
                        ? "bg-[#FFF1F1] text-[#DD4342]"
                        : "text-[#353535]"
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
                    <label className="block text-[16px] font-medium text-[#000000]">
                        Select BIM Coordinator
                    </label>
                    <div className="relative dropdown-container">
                        <button
                            type="button"
                            onClick={() =>
                                setEditDropdownOpen((o) => (o === "bimCoord" ? null : "bimCoord"))
                            }
                            className="w-full flex items-center justify-between px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-left cursor-pointer"
                        >
                            <span className={createBIMCoOrdinator ? "text-[#353535]" : "text-[#8B8B8B]"}>
                                {createBIMCoOrdinator || "Select BIM Coordinator"}
                            </span>
                            <svg
                                className={`w-5 h-5 text-[#8B8B8B] shrink-0 transition-transform ${editDropdownOpen === "bimCoord" ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {editDropdownOpen === "bimCoord" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreateBIMCoOrdinator("");
                                        setEditDropdownOpen(null);
                                    }}
                                    className="block w-full text-left px-5 py-2.5 text-sm text-[#353535] hover:bg-[#F2F2F2]"
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
                                        className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F2F2F2] ${createBIMCoOrdinator === coord.full_name
                                            ? "bg-[#FFF1F1] text-[#DD4342]"
                                            : "text-[#353535]"
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
            className="w-full px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-[#353535]"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#000000]">
            Project End Date <span className="text-[#DD4342]">*</span>
          </label>
          <input
            type="date"
            value={createEndDate}
            onChange={(e) => setCreateEndDate(e.target.value)}
            className="w-full px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-[#353535]"
          />
        </div>

        {/* Row 6: Total Hours, Per Day */}
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#000000]">
            Per Day <span className="text-[#DD4342]">*</span>
          </label>
          <input
            type="text"
            value={createPerDay}
            onChange={(e) => setCreatePerDay(e.target.value)}
            className="w-full px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-[#353535] placeholder:text-[14px] placeholder:font-normal"
            placeholder="Hours Per Day"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#000000]">
            Total Hours <span className="text-[#DD4342]">*</span>
          </label>
          <input
            type="text"
            readOnly
            value={computedTotalHours}
            className="w-full px-5 py-2 bg-[#E8EAED] border-none rounded-md font-normal text-[#353535] cursor-not-allowed placeholder:text-[14px] placeholder:font-normal"
            placeholder="Set start date, end date, and per day"
            title="Calculated: (days from start to end, inclusive) × hours per day"
          />
          <p className="text-[12px] font-Gantari text-[#888888]">
            Auto-calculated from project dates and per day.
          </p>
        </div>

        {/* Row 7: Resources, Required Resources */}
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#000000]">
            Resources <span className="text-[#DD4342]">*</span>
          </label>
          <input
            type="text"
            value={createResources}
            onChange={(e) => setCreateResources(e.target.value)}
            className="w-full px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-[#353535] placeholder:text-[14px] placeholder:font-normal"
            placeholder="Number of Resources"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#000000]">
            Required Resources <span className="text-[#DD4342]">*</span>
          </label>
          <input
            type="text"
            value={createRequiredResources}
            onChange={(e) => setCreateRequiredResources(e.target.value)}
            className="w-full px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-[#353535] placeholder:text-[14px] placeholder:font-normal"
            placeholder="Required Resources Count"
          />
        </div>

        {/* Row 8: Priority, Location */}
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#000000]">
            Priority <span className="text-[#DD4342]">*</span>
          </label>
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={() =>
                setEditDropdownOpen((o) =>
                  o === "priority" ? null : "priority",
                )
              }
              className="w-full flex items-center justify-between px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-left cursor-pointer"
            >
              <span
                className={`${createPriority ? "text-[#353535]" : "text-[#8B8B8B]"} text-[14px]`}
              >
                {createPriority || "Select Priority"}
              </span>
              <svg
                className={`w-5 h-5 text-[#8B8B8B] shrink-0 transition-transform ${editDropdownOpen === "priority" ? "rotate-180" : ""}`}
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
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                {["High", "Medium", "Low"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setCreatePriority(p);
                      setEditDropdownOpen(null);
                    }}
                    className={`block w-full text-left px-5 py-2.5 text-sm hover:bg-[#F2F2F2] ${createPriority === p
                        ? "bg-[#FFF1F1] text-[#DD4342]"
                        : "text-[#353535]"
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
          <label className="block text-[16px] font-medium text-[#000000]">
            Location <span className="text-[#DD4342]">*</span>
          </label>
          <input
            type="text"
            value={createLocation}
            onChange={(e) => setCreateLocation(e.target.value)}
            className="w-full px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-[#353535] placeholder:text-[14px] placeholder:font-normal"
            placeholder="Project Location"
          />
        </div>
      </div>

      <div className="space-y-6 mt-6">
        {renderMemberSelector()}
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#000000]">
            Description <span className="text-[#DD4342]">*</span>
          </label>
          <textarea
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            rows={4}
            className="w-full px-5 py-2 bg-[#F2F2F2] border-none rounded-md focus:ring-2 focus:ring-[#AEACAC52] transition-all font-normal text-[#353535] resize-none placeholder:text-[14px] placeholder:font-normal"
            placeholder="Provide a detailed project description..."
          />
        </div>
      </div>
      <div className="md:col-span-2 space-y-4 pt-6">
        <div className="space-y-2">
          <label className="block text-[16px] font-medium text-[#000000] font-Gantari">
            Project Documents
          </label>

          <ProjectEditAttachments
            clientViewOnly={clientViewOnlyDocs}
            teamFileRefs={existingFiles}
            newFiles={createFile ? [createFile] : []}
            apiBaseUrl={apiBaseForFiles}
            projectSource="Outsource"
            onRemoveTeamFile={(fileRef) =>
              setExistingFiles((prev) => prev.filter((f) => f !== fileRef))
            }
            onRemoveNewFile={() => setCreateFile(null)}
          />

          {/* New File Upload Selector */}
          <div className="flex items-center bg-[#F2F2F2] rounded-md overflow-hidden">
            <div className="flex-1 px-4 text-[14px] text-[#979797] truncate min-w-0 py-2">
              {createFile ? createFile.name : "Choose file"}
            </div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => document.getElementById("file-upload")?.click()}
              className="px-5 py-2 bg-[#E2E2E2] text-[#353535] text-[14px] cursor-pointer transition-colors shrink-0 font-Gantari border-0"
            >
              Browse File
            </button>
          </div>

          {/* Pending Local File View */}
          {createFile && (
            <div className="flex items-center justify-between px-4 py-2 bg-[#F2F3F4] rounded-md mt-2">
              <div className="flex items-center gap-3">
                <FiPaperclip className="w-4 h-4 text-[#DD4342]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-medium text-[#353535] truncate max-w-[200px]">
                    {createFile.name}
                  </span>
                  <span className="text-[11px] text-[#8B8B8B]">
                    Pending Upload
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAttachmentInNewTab(createFile)}
                  className="p-1 hover:bg-white/50 rounded transition-colors"
                  title="View"
                >
                  <img
                    src={viewIcon}
                    alt="View"
                    className="w-5 h-5 opacity-70"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setCreateFile(null)}
                  className="p-1 hover:bg-white/50 rounded transition-colors"
                  title="Discard"
                >
                  <img
                    src={deleteIcon}
                    alt="Delete"
                    className="w-5 h-5 opacity-70"
                  />
                </button>
              </div>
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
        {/* Project View (In-Page) */}
        {showEditModal ? (
          <div className="flex flex-col h-full bg-white">
            <div className="relative flex items-center justify-center px-2 md:px-4 py-6 border-b border-slate-50 mt-[-20px]">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditDropdownOpen(null);
                  // Reset all form fields
                  setCreateName("");
                  setCreateBudget("");
                  setCreateCurrency("INR");
                  setCreateModuleName("");
                  setCreateClientName("");
                  setCreateProjectManager("");
                  setCreateStartDate("");
                  setCreateEndDate("");
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
                className="absolute left-4 p-2 rounded-md bg-[#F2F2F2] text-[#000000] transition-colors cursor-pointer group"
                aria-label="Go Back"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                    <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </button>

              <div className="text-center">
                <h3 className="text-[24px] font-Gantari font-medium text-[#000000]">
                  Edit Project Details
                </h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 md:px-4 pb-10 pt-6 md:pt-8 custom-scrollbar">
              <form
                onSubmit={handleEdit}
                className="max-w-5xl mx-auto space-y-10"
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
                    className="px-12 py-2 rounded-md bg-[#F2F2F2] text-[#616161] font-medium text-[14px] transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-6 py-2 rounded-md bg-[#DD4342] text-[#FFFFFF] font-medium shadow-lg shadow-red-100 transition-all disabled:opacity-50"
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
            <div className="relative flex items-center justify-center px-2 md:px-4 py-6 border-b border-slate-50 mt-[-20px]">
              <button
                type="button"
                onClick={() => setShowProjectView(false)}
                className="absolute left-4 p-2 rounded-md bg-[#F2F2F2] text-[#000000] cursor-pointer group"
                aria-label="Go Back"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                    <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </button>
              <div className="text-center">
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#1A1A1A]">
                  {selectedProject.project_name ?? "Untitled Project"}
                </h3>
              </div>
            </div>
            {/* Project View Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Scrollable Content Including KPI Cards */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-2 md:px-4 pb-10 pt-4 md:pt-4 space-y-8">
                {/* KPI Cards */}
                <div className="mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                    {[
                      {
                        label: "To Do Tasks",
                        value: taskStats.todo,
                        status: "todo",
                      },
                      {
                        label: "In Progress Tasks",
                        value: taskStats.inProgress,
                        status: "in_progress",
                      },
                      {
                        label: "Paused Tasks",
                        value: taskStats.paused,
                        status: "",
                      },
                      {
                        label: "Completed Tasks",
                        value: taskStats.completed,
                        status: "completed",
                      },
                    ].map((stat, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          stat.status &&
                          navigate(
                            `/v/teamtasks?project=${encodeURIComponent(selectedProject?.project_name || "")}&status=${stat.status}`,
                          )
                        }
                        className="text-left bg-[#F2F2F2] px-4 py-4 rounded-md flex items-center justify-between h-[70px] cursor-pointer hover:bg-[#DD4342] transition-colors focus:outline-none group border-1 border-slate-200"
                      >
                        <p className="text-[#353535] group-hover:text-white text-[18px] font-Gantari font-semibold">
                          {stat.label}
                        </p>
                        <p className="text-[#353535] group-hover:text-white text-[24px] font-Gantari font-bold leading-none">
                          {stat.value}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Module Progress Cards */}
                <div className="border border-slate-200 rounded-md md:rounded-md p-4 md:p-6 lg:p-2">
                  <h4 className="text-[20px] font-Gantari font-semibold text-[#000000] mb-4">
                    Modules
                  </h4>
                  <div className="max-h-[220px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-4">
                      {loadingTaskStats ? (
                        <div className="col-span-full py-10 flex flex-col items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DD4342]" />
                          <p className="text-[#616161] font-medium">
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
                              className="bg-white border border-slate-200 rounded-md p-2 flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[126px]"
                            >
                              <div className="flex justify-between items-start min-h-0 pb-2">
                                <h5
                                  className="text-[16px] font-Gantari font-medium text-[#000000] truncate pr-2 w-full"
                                  title={tower.name}
                                >
                                  {tower.name}
                                </h5>
                              </div>
                              <div className="flex items-center justify-between mt-2 mb-2">
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
                                      r="28"
                                      stroke="#0a9344"
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
                                  <span className="absolute text-[12px] font-bold text-[#616161] font-Gantari">
                                    {tower.progress}%
                                  </span>
                                </div>
                                <div className="flex flex-col flex-1 min-w-0 ml-2">
                                  <p className="text-[14px] font-medium text-[#8B8B8B] font-Gantari mb-1 text-right">
                                    Tasks Done
                                  </p>
                                  <div className="flex items-baseline justify-center ml-16 pt-1">
                                    <p className="text-[16px] font-medium text-[#000000] font-Gantari">
                                      {tower.completedTasks}
                                    </p>
                                    <p className="text-[16px] font-medium text-[#000000] font-Gantari">
                                      /{tower.totalTasks}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-10 text-center text-[#616161] font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                          No module progress available yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description (stored as HTML from rich editor) */}
                <div className="min-w-0 max-w-full overflow-hidden border border-slate-200 rounded-md md:rounded-md p-6 md:p-8 lg:p-4">
                  <h4 className="text-[20px] font-Gantari font-semibold text-[#000000]">
                    Project Description
                  </h4>
                  {hasProjectDescriptionContent(selectedProject.description) ? (
                    <div
                      className="project-description-html text-[14px] font-Gantari font-medium text-[#666666] mt-4 w-full min-w-0 max-w-full leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:max-w-full [&_*]:whitespace-normal [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#DD4342] [&_a]:underline"
                      dangerouslySetInnerHTML={{
                        __html: normalizeProjectDescriptionHtml(
                          selectedProject.description,
                        ),
                      }}
                    />
                  ) : (
                    <p className="text-[14px] font-Gantari font-medium text-[#666666] mt-4 leading-relaxed">
                      No description available
                    </p>
                  )}
                </div>

                {/* Team Roles Section */}
                <div className="border border-slate-200 rounded-xl md:rounded-xl p-8 space-y-10">
                  <h4 className="text-[20px] font-Gantari font-semibold text-[#000000]">
                    Team Overview
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {(() => {
                      const id = selectedProject.project_manager_id;
                      const name = getEmployeeName(id);
                      if (!name || name.toLowerCase() === "not assigned")
                        return null;
                      const emp =
                        projectManagers.find((e) => e.id === Number(id)) ||
                        allEmployees.find((e) => e.id === Number(id));
                      const profileUrl = emp?.profile_picture
                        ? getGlobalProfileUrl(
                          emp.id,
                          emp.profile_picture,
                          "vendor",
                        )
                        : null;
                      return (
                        <div className="space-y-4">
                          <p className="text-[16px] font-medium text-[#000000]">
                            Project Manager
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-sm">
                              {profileUrl ? (
                                <img
                                  src={profileUrl}
                                  className="w-full h-full object-cover"
                                  alt=""
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      swifterzLogo;
                                  }}
                                />
                              ) : (
                                <img
                                  src={swifterzLogo}
                                  className="w-7 h-7 object-contain"
                                  alt=""
                                />
                              )}
                            </div>
                            <p className="text-[14px] font-bold text-[#666666] uppercase truncate transition-all">
                              {name}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const id = selectedProject.lead_id;
                      const name = getEmployeeName(id);
                      if (!name || name.toLowerCase() === "not assigned")
                        return null;
                      const emp =
                        bimLeads.find((e) => e.id === Number(id)) ||
                        allEmployees.find((e) => e.id === Number(id));
                      const profileUrl = emp?.profile_picture
                        ? getGlobalProfileUrl(
                          emp.id,
                          emp.profile_picture,
                          "vendor",
                        )
                        : null;
                      return (
                        <div className="space-y-4">
                          <p className="text-[16px] font-medium text-[#000000]">
                            BIM Lead
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-sm">
                              {profileUrl ? (
                                <img
                                  src={profileUrl}
                                  className="w-full h-full object-cover"
                                  alt=""
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      swifterzLogo;
                                  }}
                                />
                              ) : (
                                <img
                                  src={swifterzLogo}
                                  className="w-7 h-7 object-contain"
                                  alt=""
                                />
                              )}
                            </div>
                            <p className="text-[14px] font-bold text-[#666666] uppercase truncate transition-all">
                              {name}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Department Involved */}
                    {/* <div className="space-y-4">
                                        <p className="text-[16px] font-medium text-[#000000]">Department Involved</p>
                                        <div className="h-10 flex items-center">
                                            <p className="text-[14px] font-bold text-[#666666] transition-all">
                                                {selectedProject.department || "N/A"}
                                            </p>
                                        </div>
                                    </div> */}

                    {/* Members Involved */}
                    <div className="space-y-4">
                      <p className="text-[16px] font-medium text-[#000000]">
                        Members Involved
                      </p>
                      {(() => {
                        const memberIds = (selectedProject.members || "")
                          .split(",")
                          .filter(Boolean);
                        const projectMembers = memberIds
                          .map((id) => {
                            return (
                              vendorResourceProfiles.find(
                                (r) => r.id === Number(id),
                              ) || allEmployees.find((e) => e.id === Number(id))
                            );
                          })
                          .filter(Boolean);

                        if (projectMembers.length === 0) {
                          return (
                            <div className="h-10 flex items-center text-[14px] font-bold text-[#666666]">
                              N/A
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center -space-x-3">
                            {projectMembers.slice(0, 3).map((member: any) => {
                              const profileUrl = member.profile_picture
                                ? getGlobalProfileUrl(
                                  member.id,
                                  member.profile_picture,
                                  "vendor",
                                )
                                : null;
                              return (
                                <div
                                  key={member.id}
                                  className="relative group shrink-0"
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center border-2 border-white overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                    onClick={() => openMemberProfile(member)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        openMemberProfile(member);
                                      }
                                    }}
                                  >
                                    {profileUrl ? (
                                      <img
                                        src={profileUrl}
                                        className="w-full h-full object-cover"
                                        alt={member.full_name || "Member"}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src =
                                            ProfileIcon;
                                        }}
                                      />
                                    ) : (
                                      <img
                                        src={ProfileIcon}
                                        className="w-full h-full object-cover p-1"
                                        alt={member.full_name || "Member"}
                                      />
                                    )}
                                  </div>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                    <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                                      <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                        {member.full_name || "Unknown"}
                                      </span>
                                    </div>
                                    <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-b border-r border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                                  </div>
                                </div>
                              );
                            })}
                            {projectMembers.length > 3 && (
                              <div
                                role="button"
                                tabIndex={0}
                                className="relative z-10 w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-500 shadow-sm cursor-pointer hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all select-none"
                                onClick={() => {
                                  if (!selectedProject) return;
                                  setAllMembersList(
                                    teamRosterForVendorProject(selectedProject),
                                  );
                                  setShowAllMembersModal(true);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    if (!selectedProject) return;
                                    setAllMembersList(
                                      teamRosterForVendorProject(selectedProject),
                                    );
                                    setShowAllMembersModal(true);
                                  }
                                }}
                              >
                                +{projectMembers.length - 3}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="rounded-lg border border-slate-200 p-6 md:p-8">
                  <h4 className="text-[20px] font-Gantari font-bold text-[#1A1A1A] mb-6">
                    Project Details
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 md:gap-y-6 lg:gap-x-20">
                    <div className="space-y-4 md:space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[16px] font-gantari font-normal text-[#353535]">
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
                        <span className="w-full sm:w-48 text-[16px] font-gantari font-normal text-[#353535]">
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
                      {userRole === "Vendor" && (
                        <>
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="w-full sm:w-48 text-[16px] font-gantari font-normal text-[#353535]">
                              Budget
                            </span>
                            <span className="hidden sm:inline text-[#616161] mr-4">
                              :
                            </span>
                            <span className="text-[16px] font-gantari font-medium text-[#616161]">
                              {selectedProject.budget
                                ? `${selectedProject.budget} ${(selectedProject.selected_currency || selectedProject.currency || "INR").toUpperCase()}`
                                : "N/A"}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[16px] font-gantari font-normal text-[#353535]">
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
                        <span className="w-full sm:w-48 text-[16px] font-gantari font-normal text-[#353535]">
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
                        <span className="w-full sm:w-48 text-[16px] font-gantari font-normal text-[#353535]">
                          Actual End Date
                        </span>
                        <span className="hidden sm:inline text-[#616161] mr-4">
                          :
                        </span>
                        <span className="text-[16px] font-gantari font-medium text-[#616161]">
                          {formatDate(
                            selectedProject.end_date ||
                            selectedProject.due_date,
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[16px] font-gantari font-normal text-[#353535]">
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
                        <span className="w-full sm:w-48 text-[16px] font-gantari font-normal text-[#353535]">
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
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="w-full sm:w-48 text-[16px] font-gantari font-normal text-[#353535]">
                          Project Document
                        </span>
                        <span className="hidden sm:inline text-[#616161] mr-4">
                          :
                        </span>
                        <ProjectDocumentsSection
                          project={selectedProject}
                          apiBaseUrl={apiBaseForFiles}
                          projectSource={selectedProject.source ?? "Outsource"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : showMilestones && milestonesProject ? (
          /* Milestones View */
          <div className="flex flex-col h-full bg-white">
            <div className="relative flex items-center justify-center px-4 md:px-6 py-4 md:py-8 border-b border-slate-50">
              <button
                type="button"
                onClick={() => setShowMilestones(false)}
                className="absolute left-4 p-2 rounded-md bg-[#F2F2F2] transition-colors cursor-pointer group"
                aria-label="Go Back"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                    <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </button>
              <div className="text-center">
                <h3 className="text-[20px] md:text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                  Payment Milestones
                </h3>
                <p className="text-sm font-Gantari font-bold text-[#999999] mt-0.5">
                  {milestonesProject.project_name}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col py-10 px-4 md:px-10 custom-scrollbar">
              <div className="flex-1 border border-[#E5E7EB] rounded-[8px] bg-white flex flex-col items-center justify-center text-center py-20">
                <h4 className="text-[20px] font-Gantari font-bold text-[#353535] mb-3">
                  No Payment Milestones Found
                </h4>
                <p className="text-[16px] font-Gantari text-[#666666]">
                  Add your First Payment to get started with payment tracking
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Project List */
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 px-5 gap-4">
              <h2 className="text-[20px] md:text-[24px] font-Gantari font-semibold text-[#000000]">
                Projects
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <HeaderDropdown
                  value={projectFilter}
                  onChange={handleProjectFilter}
                  placeholder="Project Name"
                  options={projectFilterOptions}
                  className="w-full sm:w-[180px]"
                />
                <div className="relative w-full sm:w-[150px]" ref={showEntriesDropdownRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEntriesOpen((o) => !o);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
                  >
                    <span
                      className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedShowEntries === ""
                        ? "text-[#8B8B8B]"
                        : "text-[#353535]"
                        }`}
                    >
                      {selectedShowEntries === "" ? (
                        SHOW_ENTRIES_PLACEHOLDER
                      ) : (
                        <>
                          <span className="text-[14px]">
                            {SHOW_ENTRIES_SELECTED_PREFIX}
                          </span>{" "}
                          <span className="font-semibold">{selectedRange.label}</span>
                        </>
                      )}
                    </span>
                    <img
                      src={ArrowDown}
                      alt=""
                      className={`w-3 h-3 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""
                        } ${selectedShowEntries === ""
                          ? "opacity-60 grayscale"
                          : "opacity-90"
                        }`}
                      aria-hidden
                    />
                  </button>
                  {showEntriesOpen && (
                    <div className="absolute top-full right-0 left-auto mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                      <div
                        ref={showEntriesDropdownContentRef}
                        className="max-h-[168px] overflow-y-auto custom-scrollbar"
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedShowEntries("");
                            setShowEntriesOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
                        >
                          {SHOW_ENTRIES_PLACEHOLDER}
                        </button>
                        {showEntriesOptions.map((opt) => {
                          const isChosen = selectedShowEntries === opt.value;
                          return (
                            <button
                              key={`${opt.value}-${opt.start}-${String(opt.end)}`}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedShowEntries(opt.value);
                                setShowEntriesOpen(false);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen
                                ? "text-[#353535] bg-[#F2F2F2]"
                                : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"
                                }`}
                            >
                              <span className="truncate min-w-0">{opt.label}</span>
                              {isChosen && (
                                <svg
                                  className="w-4 h-4 shrink-0 text-[#353535]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pt-4 pb-8 px-5 space-y-8 custom-scrollbar [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#979797] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#7F7F7F] [scrollbar-width:thin] [scrollbar-color:#979797_transparent]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listInRange.length === 0 ? (
                  <div className="col-span-full bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500 font-gantari">
                    No projects found. Create your first project or accept a proposal.
                  </div>
                ) : (
                  listInRange.map((p) => {
                    const progress = Math.round(Number(p.progress) || 0);
                    const memberIds = p.members
                      ? p.members.split(",").filter(Boolean).map(Number)
                      : [];
                    const radius = 28;
                    const isHighPri =
                      (p.priority || "").toLowerCase() === "high" ||
                      (p.priority || "").toLowerCase() === "urgent";
                    return (
                      <div
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuProjectId(
                            openMenuProjectId === p.id ? null : p.id,
                          );
                        }}
                        className="relative bg-white rounded-md border border-slate-200 p-2 pt-1 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                      >
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
                                strokeDasharray={2 * Math.PI * radius}
                                strokeDashoffset={
                                  2 * Math.PI * radius -
                                  (progress / 100) * (2 * Math.PI * radius)
                                }
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
                          <div className="relative shrink-0 project-menu-container">
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuProjectId(null);
                                  openEdit(p);
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuProjectId(null);
                                  navigate(
                                    `/v/milestones?${vendorProjectIdQuery(p.id)}`,
                                  );
                                }}
                                className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left group cursor-pointer"
                              >
                                <img
                                  src={paymentMilestoneIcon}
                                  alt="payment milestone"
                                  className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                />
                                <span className="text-[14px] font-semibold text-[#616161] group-hover:text-[#DD4342] font-Gantari whitespace-nowrap">
                                  Payment Milestones
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mb-2 ml-4 -mt-4 min-h-[45px] flex flex-col justify-center">
                          <h3 className="text-[18px] font-Gantari font-semibold text-[#1A1A1A] leading-tight">
                            {p.project_name ?? "Untitled Project"}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#E8E8E8] pt-4 mt-auto">
                          <div
                            className="flex items-center -space-x-4 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ProjectCardTeamAvatars
                              roster={teamRosterForVendorProject(p)}
                              profileUserType="vendor"
                              onOpenAll={() => {
                                setAllMembersList(teamRosterForVendorProject(p));
                                setShowAllMembersModal(true);
                              }}
                              onMemberClick={(emp) => {
                                if (!emp.id) return;
                                const full = resolveProjectMember(
                                  emp.id,
                                  "Outsource",
                                );
                                if (full) openMemberProfile(full);
                              }}
                            />
                          </div>
                          <div
                            className={`px-3.5 py-1 rounded-[8px] text-white text-[13px] font-bold font-Gantari shadow-sm shrink-0 ${isHighPri ? "bg-[#DD4342]" : "bg-[#94D6F2]"}`}
                          >
                            {p.priority || "Low"}
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-8 border-b border-slate-50">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute left-10 p-2 rounded-md bg-[#F2F2F2] text-[#000000] cursor-pointer group"
                aria-label="Go Back"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                    <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </button>
              <h3 className="text-[24px] font-Gantari font-semibold text-[#000000]">
                Add New Project
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
              <form onSubmit={handleCreate} className="space-y-10">
                {renderFormFields()}

                <div className="flex justify-center gap-6 pt-6 pb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateError("");
                    }}
                    className="px-12 py-4 rounded-xl bg-[#F1F1F1] text-[#666666] font-medium transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-12 py-4 rounded-xl bg-[#DD4342] text-white font-bold hover:opacity-90 shadow-lg shadow-red-100 transition-all disabled:opacity-50"
                  >
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

      <ProjectAllMembersModal
        open={showAllMembersModal}
        members={allMembersList}
        profileUserType="vendor"
        onClose={() => setShowAllMembersModal(false)}
        onMemberClick={(emp) => {
          if (!emp.id) return;
          const full = resolveProjectMember(emp.id, "Outsource");
          if (full) openMemberProfile(full);
          setShowAllMembersModal(false);
        }}
      />

      {showMemberProfileModal && selectedMember && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl max-w-sm w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="relative z-10 flex items-center justify-center px-6 py-4 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowMemberProfileModal(false);
                  setSelectedMember(null);
                }}
                className="absolute left-6 p-2 rounded-md bg-[#F2F2F2] cursor-pointer group"
                aria-label="Close"
              >
                <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                    <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </button>
              <h3 className="text-[24px] font-bold text-[#1A1A1A] font-Gantari text-center">
                View Details
              </h3>
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

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              {/* <RiDeleteBin5Fill size={32} /> */}
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
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#F2F2F2] font-bold text-slate-600 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold transition-all hover:bg-red-600 shadow-lg shadow-red-100"
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
