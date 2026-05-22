import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import api from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { FiUploadCloud } from "react-icons/fi";
import threedot from "../../../assets/ProjectManager/project/threedot.svg";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import ProfileIcon from "../../../assets/ProductNavbarIcons/Profile.svg";
import closeBtnIcon from "../../../assets/ProductNavbarIcons/close button.svg";
import backIcon from "../../../assets/TechnicalDirector/back icon.svg";
import swifterzLogo from "../../../assets/ProductNavbarIcons/swifterzlogo.png";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";
import ProjectAllMembersModal from "../../../components/ProjectAllMembersModal";
import ProjectCardTeamAvatars from "../../../components/ProjectCardTeamAvatars";
import {
  fetchVendorTeamEmployees,
  mapVendorProjectFromApi,
  toVendorProjectTeamLike,
  useProjectTeamRoster,
} from "../../../hooks/useProjectTeamRoster";
import type { PmTeamRosterEntry } from "../../../utils/projectTeamRoster";
import ProjectDocumentsSection from "../../../components/ProjectDocumentsSection";
import {
  getProjectApiBase,
  type ProjectDocumentItem,
} from "../../../utils/projectDetails";

type VendorResourceProfileRow = {
  id: number;
  vendor_employee_id?: number | null;
  full_name?: string;
  name?: string;
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
};

type Employee = VendorResourceProfileRow;

type Project = {
  id: number;
  project_name?: string;
  members?: string | null;
  members_names?: string | string[] | null;
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  bim_coordinator?: string | null;
  uploader_name?: string | null;
  project_manager_id?: number | string | null;
  lead_id?: number | string | null;
  bim_coordinator_id?: number | string | null;
  status?: string | null;
  progress?: number | string | null;
  priority?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  budget?: string;
  currency?: string;
  selected_currency?: string;
  totalhours?: string;
  perday?: string;
  per_day?: string;
  location?: string;
  description?: string;
  deliverables?: string;
  budget_ceiling?: string;
  document_attachment?: string;
  attachments?: ProjectDocumentItem[];
  client_id?: string;
  no_resource?: string;
  no_resources_required?: string;
  required_resources?: string;
  source?: string;
  project_manager_profile_picture?: string;
  lead_profile_picture?: string;
  bim_coordinator_profile_picture?: string;
  member_profile_pictures?: Array<{
    id: number | string;
    profile_picture?: string;
  }>;
};

type Tower = {
  id: number;
  name: string;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  status: "Approved" | "Pending" | "Review";
};

type Task = {
  id: number;
  project_id?: number;
  projectid?: number;
};

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

function normName(s: string | undefined | null): string {
  return (s || "").trim().toLowerCase();
}

function filterInvolvedVendorProjects(
  allProjects: Project[],
  myTasks: Task[],
  user: { id: number; full_name?: string } | null | undefined,
  resourceProfiles: VendorResourceProfileRow[] = [],
): Project[] {
  if (!user) return [];

  const uid = String(user.id);
  const name = normName(user.full_name);

  const profileIdStrs = new Set<string>();
  for (const r of resourceProfiles) {
    if (
      r.vendor_employee_id != null &&
      Number(r.vendor_employee_id) === Number(user.id)
    ) {
      profileIdStrs.add(String(r.id));
    }
  }

  const taskProjectIds = new Set(
    myTasks
      .map((t) => Number(t.project_id ?? t.projectid))
      .filter((id) => !Number.isNaN(id) && id > 0),
  );

  return allProjects.filter((p) => {
    const pid = Number(p.id);
    if (!Number.isNaN(pid) && pid > 0 && taskProjectIds.has(pid)) return true;

    const tokens = String(p.members || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const t of tokens) {
      if (t === uid || profileIdStrs.has(t)) return true;
      if (name && normName(t) === name) return true;
    }

    let memberNames: string[] = [];
    if (Array.isArray(p.members_names)) memberNames = p.members_names.map(String);
    else if (typeof p.members_names === "string" && p.members_names.trim()) {
      memberNames = p.members_names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (name && memberNames.some((n) => normName(n) === name)) return true;

    const cmp = (v?: string | null) => name && normName(v) === name;
    if (
      cmp(p.project_manager_name) ||
      cmp(p.lead_name) ||
      cmp(p.bim_coordinator_name) ||
      cmp(p.uploader_name)
    ) {
      return true;
    }

    const pm = p.project_manager_id != null ? String(p.project_manager_id) : "";
    const ld = p.lead_id != null ? String(p.lead_id) : "";
    const bc = p.bim_coordinator_id != null ? String(p.bim_coordinator_id) : "";
    return pm === uid || ld === uid || bc === uid;
  });
}

function normalizeProjectStatus(project: Project): "in_progress" | "completed" {
  const status = String(project.status || "").toLowerCase().trim();
  const progressNum =
    typeof project.progress === "number"
      ? project.progress
      : Number(String(project.progress || "0"));
  if (
    status.includes("complete") ||
    status === "done" ||
    (!Number.isNaN(progressNum) && progressNum >= 100)
  ) {
    return "completed";
  }
  return "in_progress";
}

function safePercent(progress: unknown, fallback: number): number {
  const n =
    typeof progress === "number" ? progress : Number(String(progress ?? ""));
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

function initials(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const res = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return res || "V";
}

function splitCsv(v: unknown): string[] {
  if (!v) return [];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatDate(d: any) {
  if (!d) return "—";
  const s = String(d).trim();
  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, mo, day] = s.slice(0, 10).split("-").map(Number);
    date = new Date(y, mo - 1, day);
  } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(s)) {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) date = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    else date = new Date(s);
  } else {
    date = new Date(s);
  }
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
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

export default function ProjectEV() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resourceProfiles, setResourceProfiles] = useState<
    VendorResourceProfileRow[]
  >([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [projectManagers, setProjectManagers] = useState<Employee[]>([]);
  const [bimLeads, setBimLeads] = useState<Employee[]>([]);
  const [vendorTeamEmployees, setVendorTeamEmployees] = useState<Employee[]>(
    [],
  );

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
  const [openMenuProjectId, setOpenMenuProjectId] = useState<number | null>(null);

  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [allMembersList, setAllMembersList] = useState<PmTeamRosterEntry[]>([]);
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<VendorResourceProfileRow | null>(null);

  const getCurrencySymbol = (code?: string) => {
    return (code || "INR").toUpperCase();
  };

  const projectCurrencyCode = (p?: Project | null) =>
    ((p?.selected_currency || p?.currency || "INR") as string).toUpperCase();

  const apiBaseForFiles = getProjectApiBase(String(api.defaults.baseURL || ""));

  const { teamRosterForProject, resolveProjectMember } = useProjectTeamRoster(
    allEmployees,
    resourceProfiles,
    vendorTeamEmployees,
  );
  const teamRosterForVendorProject = (proj: Project) =>
    teamRosterForProject(toVendorProjectTeamLike(proj));

  const resolveVendorMember = (id: string | number) =>
    resolveProjectMember(id, "Outsource") ||
    resourceProfiles.find((e) => Number(e.id) === Number(id)) ||
    projectManagers.find((e) => Number(e.id) === Number(id)) ||
    bimLeads.find((e) => Number(e.id) === Number(id)) ||
    allEmployees.find((e) => Number(e.id) === Number(id));

  const getEmployeeName = (id: any) => resolveVendorMember(id)?.full_name || "";

  const openMemberProfile = (member?: VendorResourceProfileRow) => {
    if (!member) return;
    setSelectedMember({
      ...member,
      employee_id: member.employee_id || member.empid,
      phone: member.phone || member.phone_number,
      user_role: member.user_role || member.role || member.designation,
    });
    setShowMemberProfileModal(true);
  };

  useEffect(() => {
    if (!user?.id) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks"),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
      api.get<{ success?: boolean; resources?: VendorResourceProfileRow[] }>(
        "/api/vendors/vendor-resource-profiles",
      ),
      api.get<{ employees?: Employee[] }>("/api/employees"),
      api.get<{ success: boolean; employees?: Employee[] }>(
        "/api/vendors/vendor-by-role?role=Vendor PM",
      ),
      api.get<{ success: boolean; employees?: Employee[] }>(
        "/api/vendors/vendor-by-role?role=Vendor Bim Lead",
      ),
    ])
      .then(([myTasksRes, projectsRes, resRes, allEmpRes, pmRes, blRes]) => {
        const myTasks = myTasksRes.data.tasks ?? [];
        const allProjects = (projectsRes.data.projects ?? []) as Project[];
        const profiles = resRes.data.resources ?? [];
        const allEmp = allEmpRes.data.employees ?? [];
        const pms = pmRes.data.employees ?? [];
        const bls = blRes.data.employees ?? [];

        setResourceProfiles(profiles);
        setAllEmployees(allEmp);
        setProjectManagers(pms);
        setBimLeads(bls);

        setProjects(
          filterInvolvedVendorProjects(
            allProjects.map(
              (row) => mapVendorProjectFromApi(row as Record<string, unknown>) as Project,
            ),
            myTasks,
            user,
            profiles,
          ),
        );
      })
      .catch(() => {
        setProjects([]);
        setResourceProfiles([]);
        setAllEmployees([]);
        setProjectManagers([]);
        setBimLeads([]);
      })
      .finally(() => setLoading(false));

    fetchVendorTeamEmployees((url) => api.get(url))
      .then(setVendorTeamEmployees)
      .catch(() => setVendorTeamEmployees([]));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const projectId = showProjectView && selectedProject?.id ? selectedProject.id : null;
    if (!projectId) {
      setTaskStats({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
      setTowerData([]);
      setLoadingTaskStats(false);
      return;
    }
    setLoadingTaskStats(true);
    api.get<{
      success?: boolean;
      status_counts?: { todo?: number; inprogress?: number; paused?: number; completed?: number };
      modules?: Array<{ module_name?: string; total_tasks?: number; completed_tasks?: number; completion_percentage?: number }>;
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
        if (!cancelled) {
          setTaskStats({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
          setTowerData([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTaskStats(false);
      });
    return () => { cancelled = true; };
  }, [showProjectView, selectedProject?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest(".project-menu-container")) {
        setOpenMenuProjectId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [projectFilter, setProjectFilter] = useState("");
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.setAttribute("data-ev-scrollbar", "1");
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
    return Array.from(new Set(projects.map((p) => (p.project_name || "").trim()).filter(Boolean))).sort();
  }, [projects]);

  const projectFilterOptions = useMemo(() => {
    return [
      { label: "Project Name", value: "" },
      ...projectNames.map((name) => ({ label: name, value: name })),
    ];
  }, [projectNames]);

  const handleProjectFilter = (v: string) => {
    setProjectFilter(v);
  };

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const name = String(p.project_name || "").toLowerCase();
      const status = String(p.status || "").toLowerCase();
      const prio = String(p.priority || "").toLowerCase();
      const matchesSearch = !q || `${name} ${status} ${prio}`.includes(q);
      if (!matchesSearch) return false;
      if (projectFilter && p.project_name !== projectFilter) return false;
      return true;
    });
  }, [projects, q, projectFilter]);

  const effectiveShowEntryValue = selectedShowEntries || showEntriesOptions[0].value;
  const selectedRange = showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ?? showEntriesOptions[0];
  const rangeEnd = selectedRange.end === null ? filtered.length : Math.min(selectedRange.end, filtered.length);
  const listInRange = useMemo(() => {
    return filtered.slice(selectedRange.start, rangeEnd);
  }, [filtered, selectedRange, rangeEnd]);

  const profileNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of resourceProfiles) {
      const id = r?.id != null ? String(r.id) : "";
      const name = (r.full_name || (r as any).name || "").toString();
      if (id && name) map.set(id, name);
    }
    return map;
  }, [resourceProfiles]);

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
        {showProjectView && selectedProject ? (
          <div className="flex flex-col h-full bg-white overflow-hidden">
            {/* Header stays fixed */}
            <div className="flex items-center gap-4 md:gap-6 px-4 md:px-5 py-4 md:py-2 border-b border-slate-50 shrink-0">
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
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-2 py-0.5 relative z-10">
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

            {/* Content area is scrollable */}
            <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-24 pt-4 md:pt-6 custom-scrollbar space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label: "To Do Tasks", value: loadingTaskStats ? "..." : taskStats.todo, status: "todo" },
                  { label: "In Progress Tasks", value: loadingTaskStats ? "..." : taskStats.inProgress, status: "in_progress" },
                  { label: "Paused Tasks", value: loadingTaskStats ? "..." : taskStats.paused, status: "paused" },
                  { label: "Completed Tasks", value: loadingTaskStats ? "..." : taskStats.completed, status: "completed" },
                ].map((stat, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      navigate(
                        "/ve/teamtasks?status=" +
                          stat.status +
                          (selectedProject?.project_name
                            ? `&project=${encodeURIComponent(selectedProject.project_name)}`
                            : ""),
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
                <div className="border border-slate-200 rounded-xl md:rounded-xl p-6 md:p-4">
                  <h4 className="text-[20px] font-Gantari font-semibold text-[#000000] mb-4">
                    Modules
                  </h4>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                      {loadingTaskStats ? (
                        <div className="col-span-full py-10 flex flex-col items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DD4342]" />
                          <p className="text-gray-500 font-medium">Loading module analysis...</p>
                        </div>
                      ) : towerData.length > 0 ? (
                        towerData.map((tower) => {
                          const statusColor =
                            tower.status === "Approved" ? "#008F22" : tower.status === "Pending" ? "#EB7200" : "#E00100";
                          const statusBg =
                            tower.status === "Approved" ? "bg-[#E0FFE8]" : tower.status === "Pending" ? "bg-[#FFEAD6]" : "bg-[#FFD9D9]";
                          return (
                            <div
                              key={tower.id}
                              className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[150px]"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h5 
                                  className="text-[16px] font-Gantari font-bold text-[#1A1A1A] truncate pr-2"
                                  title={tower.name}
                                >
                                  {tower.name}
                                </h5>
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md shrink-0 ${statusBg}`}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }}></span>
                                  <span className="text-[11px] font-bold font-Gantari" style={{ color: statusColor }}>
                                    {tower.status}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-auto">
                                <div className="relative flex items-center justify-center w-16 h-16">
                                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                                    <circle cx="32" cy="32" r="26" stroke="#F2F3F5" strokeWidth="5" fill="transparent" />
                                    <circle
                                      cx="32"
                                      cy="32"
                                      r="26"
                                      stroke={statusColor}
                                      strokeWidth="5"
                                      fill="transparent"
                                      strokeDasharray={163.36}
                                      strokeDashoffset={163.36 - (tower.progress / 100) * 163.36}
                                      strokeLinecap="round"
                                      style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                                    />
                                  </svg>
                                  <span className="absolute text-[14px] font-bold text-[#353535] font-Gantari">
                                    {tower.progress}%
                                  </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <p className="text-[12px] font-medium text-[#8B8B8B] font-Gantari mb-1">Tasks Done</p>
                                  <div className="flex items-baseline">
                                    <p className="text-[18px] font-bold text-[#353535] font-Gantari">{tower.completedTasks}</p>
                                    <p className="text-[14px] font-medium text-[#8B8B8B] font-Gantari">/{tower.totalTasks}</p>
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

                <div className="border border-slate-200 rounded-[10px] p-4 md:p-4">
                  <h4 className="text-[18px] md:text-[20px] font-medium font-gantari text-[#000000]">
                    Project Description
                  </h4>
                  {hasProjectDescriptionContent(selectedProject.description) ? (
                    <div
                      className="text-[14px] font-medium font-gantari text-[#353535] leading-relaxed break-words quill-content"
                      dangerouslySetInnerHTML={{ __html: normalizeProjectDescriptionHtml(selectedProject.description) }}
                    />
                  ) : (
                    <p className="text-[16px] font-medium text-[#666666] mt-4 leading-relaxed break-words">
                      No description available
                    </p>
                  )}
                </div>

                <div className="border border-slate-200 rounded-[10px] p-4 md:p-5 space-y-6">
                  <h4 className="text-[18px] md:text-[20px] font-semibold text-[#000000]">Team Overview</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                         {/* Project Manager */}
                                         <div className="space-y-4">
                                             <p className="text-[16px] font-medium text-[#000000]">Project Manager</p>
                                             <div className="flex items-center gap-4">
                                                 {(() => {
                                                     const id = selectedProject.project_manager_id;
                                                     const name = getEmployeeName(id);
                                                     const emp = projectManagers.find(e => e.id === Number(id)) || allEmployees.find(e => e.id === Number(id));
                                                     const profileUrl = emp?.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture, "vendor") : null;
                                                     return (
                                                         <>
                                                             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-sm">
                                                                 {profileUrl ? (
                                                                     <img src={profileUrl} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = swifterzLogo; }} />
                                                                 ) : (
                                                                     <img src={swifterzLogo} className="w-7 h-7 object-contain" alt="" />
                                                                 )}
                                                             </div>
                                                             <p className="text-[14px] font-bold text-[#666666] uppercase truncate transition-all">
                                                                 {name || "Not assigned"}
                                                             </p>
                                                         </>
                                                     );
                                                 })()}
                                             </div>
                                         </div>

                                         {/* BIM Lead */}
                                         <div className="space-y-4">
                                             <p className="text-[16px] font-medium text-[#000000]">BIM Lead</p>
                                             <div className="flex items-center gap-4">
                                                 {(() => {
                                                     const id = selectedProject.lead_id;
                                                     const name = getEmployeeName(id);
                                                     const emp = bimLeads.find(e => e.id === Number(id)) || allEmployees.find(e => e.id === Number(id));
                                                     const profileUrl = emp?.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture, "vendor") : null;
                                                     return (
                                                         <>
                                                             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-sm">
                                                                 {profileUrl ? (
                                                                     <img src={profileUrl} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = swifterzLogo; }} />
                                                                 ) : (
                                                                     <img src={swifterzLogo} className="w-7 h-7 object-contain" alt="" />
                                                                 )}
                                                             </div>
                                                             <p className="text-[14px] font-bold text-[#666666] uppercase truncate transition-all">
                                                                 {name || "Not assigned"}
                                                             </p>
                                                         </>
                                                     );
                                                 })()}
                                             </div>
                                         </div>
                                         {/* Members Involved */}
                                         <div className="space-y-4">
                                             <p className="text-[16px] font-medium text-[#000000]">Members Involved</p>
                                             {(() => {
                                                 const memberIds = (selectedProject.members || "").split(",").filter(Boolean);
                                                 const projectMembers = memberIds.map(id => {
                                                     return resourceProfiles.find(r => r.id === Number(id)) || allEmployees.find(e => e.id === Number(id));
                                                 }).filter(Boolean);

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
                                                             const profileUrl = member.profile_picture ? getGlobalProfileUrl(member.id, member.profile_picture, "vendor") : null;
                                                             return (
                                                                 <div key={member.id} className="relative group shrink-0">
                                                                     <div
                                                                         role="button"
                                                                         tabIndex={0}
                                                                         className="w-10 h-10 rounded-full bg-white flex items-center justify-center border-2 border-white overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                                                         onClick={() => openMemberProfile(member)}
                                                                         onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openMemberProfile(member); } }}
                                                                     >
                                                                         {profileUrl ? (
                                                                             <img src={profileUrl} className="w-full h-full object-cover" alt={member.full_name || "Member"} onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                                                         ) : (
                                                                             <img src={ProfileIcon} className="w-full h-full object-cover p-1" alt={member.full_name || "Member"} />
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
                                                                 onClick={() => { setAllMembersList(projectMembers as any[]); setShowAllMembersModal(true); }}
                                                                 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAllMembersList(projectMembers as any[]); setShowAllMembersModal(true); } }}
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

                <div className="border border-slate-200 rounded-lg px-5 py-6">
                  <h4 className="text-[18px] md:text-[20px] font-semibold text-[#000000] mb-4">Project Details</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 lg:gap-x-16">
                    <div className="space-y-3">
                      <div className="flex">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Actual Start Date</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161] font-gantari">{formatDate(selectedProject.start_date)}</span>
                      </div>
                      <div className="flex">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Total Project Hours</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{selectedProject.totalhours ? `${selectedProject.totalhours}hrs` : "N/A"}</span>
                      </div>
                      <div className="flex">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Budget</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161] font-gantari">
                          {selectedProject.budget || selectedProject.budget_ceiling
                            ? `${selectedProject.budget || selectedProject.budget_ceiling} ${projectCurrencyCode(selectedProject)}`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Outsourcing Budget</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">
                          {selectedProject.budget_ceiling
                            ? `${selectedProject.budget_ceiling} ${projectCurrencyCode(selectedProject)}`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Total Resources Available</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{selectedProject.no_resource || "00"}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Location</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{selectedProject.location || "N/A"}</span>
                      </div>
                      <div className="flex">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Actual End Date</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{formatDate(selectedProject.end_date || selectedProject.due_date)}</span>
                      </div>
                      <div className="flex">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Hours/Day</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{selectedProject.per_day || selectedProject.perday ? `${selectedProject.per_day || selectedProject.perday}hrs` : "0:00hrs"}</span>
                      </div>
                      <div className="flex">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Required Resources</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">{selectedProject.required_resources || selectedProject.no_resources_required || "00"}</span>
                      </div>
                    </div>
                    <div className="lg:col-span-2">
                      <div className="flex items-center">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Project Document</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
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
        ) : (
          <div className="px-5">
            <div className="bg-white py-3 flex-shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                <h1 className="text-[24px] font-semibold text-[#000000] font-Gantari">Projects</h1>
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
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                {listInRange.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 font-gantari">
                    No projects found.
                  </div>
                ) : (
                  listInRange.map((p) => {
                  const normalizedStatus = normalizeProjectStatus(p);
                  const progress = normalizedStatus === "completed" ? 100 : safePercent(p.progress, 0);
                  const radius = 28;
                  const circumference = 2 * Math.PI * radius;
                  const offset = circumference - (progress / 100) * circumference;

                  return (
                    <div
                      key={p.id}
                      onClick={(e) => { e.stopPropagation(); setOpenMenuProjectId(openMenuProjectId === p.id ? null : p.id); }}
                      className="bg-white rounded-md border border-slate-200 p-2 pt-1 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-4 mt-2 pr-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <svg className="w-16 h-16 md:w-20 md:h-20 transform -rotate-90">
                              <circle cx="50%" cy="50%" r={radius} stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
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
                                style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
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
                                setOpenMenuProjectId((prev) => (prev === p.id ? null : p.id));
                              }}
                              className="p-2 rounded-full text-[#8B8B8B] transition-colors cursor-pointer"
                            >
                              <img src={threedot} alt="threeDots" className="w-4 h-4 text-[#8B8B8B]" />
                            </button>
                            <div
                              className={`absolute right-0 mt-3 w-40 bg-white/40 backdrop-blur-md rounded-xl border border-[#595959]/50 shadow-xl transition-all origin-top-right z-50 ${openMenuProjectId === p.id ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
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
                                <span className="text-[16px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342]">View</span>
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

                      <div
                        className="flex items-center justify-between border-t border-[#E8E8E8] pt-4 mt-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center -space-x-4 min-w-0 pr-2">
                          <ProjectCardTeamAvatars
                            roster={teamRosterForVendorProject(p)}
                            profileUserType="vendor"
                            avatarClassName="w-8 h-8"
                            onOpenAll={() => {
                              setAllMembersList(teamRosterForVendorProject(p));
                              setShowAllMembersModal(true);
                            }}
                            onMemberClick={(emp) => {
                              if (!emp.id) return;
                              const full = resolveVendorMember(emp.id);
                              if (full) openMemberProfile(full);
                            }}
                          />
                        </div>
                        <div
                          className={`px-3 py-1 rounded-[5px] text-white text-[12px] font-medium font-Gantari shadow-sm shrink-0 ${
                            (p.priority || "").toLowerCase() === "high" || (p.priority || "").toLowerCase() === "urgent"
                              ? "bg-[#DD4342]"
                              : "bg-[#94D6F2]"
                          }`}
                        >
                          {p.priority || "Medium"}
                        </div>
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ProjectAllMembersModal
        open={showAllMembersModal}
        members={allMembersList}
        profileUserType="vendor"
        onClose={() => setShowAllMembersModal(false)}
        onMemberClick={(emp) => {
          if (!emp.id) return;
          const full = resolveVendorMember(emp.id);
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
    </div>
  );
}

