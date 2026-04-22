import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { FiUploadCloud } from "react-icons/fi";
import threedot from "../../../assets/ProjectManager/project/threedot.svg";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import ProfileIcon from "../../../assets/ProductNavbarIcons/Profile.svg";
import closeBtnIcon from "../../../assets/ProductNavbarIcons/close button.svg";
import backIcon from "../../../assets/TechnicalDirector/back icon.svg";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";

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
  client_id?: string;
  no_resource?: string;
  no_resources_required?: string;
  required_resources?: string;
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
  return `${day}/${month}/${year}`;
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
  const [allMembersList, setAllMembersList] = useState<VendorResourceProfileRow[]>([]);
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<VendorResourceProfileRow | null>(null);

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

  const resolveVendorDocUrl = (rawPath: string) => {
    const cleaned = (rawPath || "").trim();
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    const base = String(api.defaults.baseURL || "").replace(/\/api\/?$/, "").replace(/\/+$/, "");
    if (cleaned.startsWith("/uploads/")) {
      const rest = cleaned.replace(/^\/+/, "");
      if (/^uploads\/[^/]+$/i.test(rest)) {
        const fileOnly = rest.replace(/^uploads\//i, "");
        return `${base}/static/uploads/vendor_docs/${fileOnly}`;
      }
      return `${base}${cleaned}`;
    }
    return `${base}/static/uploads/vendor_docs/${cleaned}`;
  };

  const resolveVendorMember = (id: string | number) =>
    resourceProfiles.find((e) => Number(e.id) === Number(id));

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
    ])
      .then(([myTasksRes, projectsRes, resRes]) => {
        const myTasks = myTasksRes.data.tasks ?? [];
        const allProjects = (projectsRes.data.projects ?? []) as Project[];
        const profiles = resRes.data.resources ?? [];
        setResourceProfiles(profiles);
        setProjects(filterInvolvedVendorProjects(allProjects, myTasks, user, profiles));
      })
      .catch(() => {
        setProjects([]);
        setResourceProfiles([]);
      })
      .finally(() => setLoading(false));
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

  const filtered = useMemo(() => {
    if (!q) return projects;
    return projects.filter((p) => {
      const name = String(p.project_name || "").toLowerCase();
      const status = String(p.status || "").toLowerCase();
      const prio = String(p.priority || "").toLowerCase();
      return `${name} ${status} ${prio}`.includes(q);
    });
  }, [projects, q]);

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
      <div className="flex flex-col h-full overflow-hidden">
        {showProjectView && selectedProject ? (
          <div className="flex flex-col h-screen bg-white overflow-hidden">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {[
                  { label: "To Do Tasks", value: taskStats.todo, status: "todo" },
                  { label: "In Progress", value: taskStats.inProgress, status: "in_progress" },
                  { label: "Paused", value: taskStats.paused, status: "paused" },
                  { label: "Completed", value: taskStats.completed, status: "completed" },
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
                    className="text-left bg-[#F2F2F2] p-3 md:p-4 rounded-md flex flex-col h-[70px] md:h-[90px] hover:bg-[#DD4342] focus:outline-none cursor-pointer transition-all group border-1 border-slate-200"
                  >
                    <p className="text-[#353535] group-hover:text-white text-[16px] md:text-[18px] font-medium">
                      {stat.label}
                    </p>
                    <p className="text-[#353535] group-hover:text-white text-[18px] md:text-[22px] font-bold leading-none mt-auto self-center">
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
                                <h5 className="text-[16px] font-Gantari font-bold text-[#1A1A1A] truncate pr-2">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: "Project Manager", id: selectedProject.project_manager_id },
                      { label: "BIM Lead", id: selectedProject.lead_id },
                    ].map((role) => {
                      const emp = resolveVendorMember(role.id || "");
                      const profileUrl = emp?.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture) : null;
                      return (
                        <div key={role.label} className="flex items-center gap-3">
                          <div
                            role="button"
                            tabIndex={0}
                            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm cursor-pointer transition-all"
                            onClick={() => openMemberProfile(emp)}
                          >
                            {profileUrl ? (
                              <img src={profileUrl} alt={role.label} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                            ) : (
                              <img src={ProfileIcon} alt={role.label} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[16px] font-medium text-[#1A1A1A] truncate">{getEmployeeName(role.id) || "Not assigned"}</p>
                            <p className="text-[14px] font-medium text-[#8B8B8B]">{role.label}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex flex-col">
                      <p className="text-[16px] font-medium text-[#353535]">BIM Coordinator</p>
                      <p className="text-[14px] font-medium text-[#8B8B8B]">{selectedProject.bim_coordinator || selectedProject.bim_coordinator_name || "N/A"}</p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[16px] font-medium text-[#353535]">Members Involved</p>
                      {(() => {
                        const memberIds = (selectedProject.members || "").split(",").filter(Boolean).map((id) => Number(id));
                        const projectMembers = memberIds.map((id) => resolveVendorMember(id)).filter(Boolean) as VendorResourceProfileRow[];
                        if (!projectMembers.length) return <div className="text-[14px] font-medium text-[#8B8B8B]">N/A</div>;
                        const visibleMembers = projectMembers.slice(0, 3);
                        const remainingCount = Math.max(0, projectMembers.length - 3);
                        return (
                          <div className="flex items-center -space-x-4">
                            {visibleMembers.map((emp) => {
                              const profileUrl = emp.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture) : null;
                              return (
                                <div
                                  key={emp.id}
                                  role="button"
                                  tabIndex={0}
                                  className="w-9 h-9 rounded-full border border-white bg-slate-100 overflow-hidden cursor-pointer"
                                  title={emp.full_name}
                                  onClick={() => openMemberProfile(emp)}
                                >
                                  {profileUrl ? (
                                    <img src={profileUrl} alt={emp.full_name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[12px] font-medium text-slate-600">
                                      {(emp.full_name || "U").charAt(0).toUpperCase()}
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
                            ? `${getCurrencySymbol(projectCurrencyCode(selectedProject))}${selectedProject.budget || selectedProject.budget_ceiling}`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-56 text-[14px] font-medium text-[#353535] shrink-0">Outsourcing Budget</span>
                        <span className="text-[#616161] mx-4 shrink-0">:</span>
                        <span className="text-[14px] font-medium text-[#616161]">
                          {selectedProject.budget_ceiling
                            ? `${getCurrencySymbol(projectCurrencyCode(selectedProject))}${selectedProject.budget_ceiling}`
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
                        {selectedProject.document_attachment ? (
                          <div className="flex items-center gap-3">
                            <span className="text-[14px] font-medium text-[#353535] line-clamp-1">{selectedProject.document_attachment.split("/").pop()}</span>
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
        ) : (
          <div className="px-5">
            <div className="bg-white py-3 flex-shrink-0">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h1 className="text-[24px] font-semibold text-[#000000] font-Gantari">Projects</h1>
                <input
                  value={searchParams.get("q") || ""}
                  onChange={(e) => {
                    const next = new URLSearchParams(searchParams);
                    const value = e.target.value.trim();
                    if (value) next.set("q", value);
                    else next.delete("q");
                    setSearchParams(next, { replace: true });
                  }}
                  placeholder="Search project"
                  className="w-[220px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                {filtered.map((p) => {
                  const normalizedStatus = normalizeProjectStatus(p);
                  const progress = normalizedStatus === "completed" ? 100 : safePercent(p.progress, 0);
                  const memberIds = p.members ? p.members.split(",").filter(Boolean).map(Number) : [];
                  const radius = 28;
                  const circumference = 2 * Math.PI * radius;
                  const offset = circumference - (progress / 100) * circumference;

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

                      <div className="flex items-center justify-between border-t border-[#E8E8E8] pt-4 mt-auto">
                        <div className="flex -space-x-2 min-w-0">
                          {(() => {
                            const projectEmployees = memberIds.map((id) => resolveVendorMember(id)).filter(Boolean) as VendorResourceProfileRow[];
                            const visibleMembers = projectEmployees.slice(0, 3);
                            const remainingCount = Math.max(0, projectEmployees.length - 3);
                            return (
                              <>
                                {visibleMembers.map((emp) => {
                                  const profileUrl = emp.profile_picture ? getGlobalProfileUrl(emp.id, emp.profile_picture) : null;
                                  return (
                                    <div
                                      key={emp.id}
                                      className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden cursor-pointer"
                                      title={emp.full_name}
                                    >
                                      {profileUrl ? (
                                        <img src={profileUrl} alt={emp.full_name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ProfileIcon; }} />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[10px] font-medium text-slate-600">
                                          {(emp.full_name || "U").charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {remainingCount > 0 && (
                                  <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                                    +{remainingCount}
                                  </div>
                                )}
                              </>
                            );
                          })()}
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
                })}
                {filtered.length === 0 && (
                  <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                    No projects found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAllMembersModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-[28px] font-semibold text-[#1A1A1A] font-Gantari">All Members ({allMembersList.length})</h3>
              <button onClick={() => setShowAllMembersModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                <img src={closeBtnIcon} alt="close" className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {allMembersList.map((member, index) => (
                  <div
                    key={member.id ?? index}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => { openMemberProfile(member); setShowAllMembersModal(false); }}
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
            </div>
          </div>
        </div>
      )}

      {showMemberProfileModal && selectedMember && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-[28px] font-semibold text-[#1A1A1A] font-Gantari">View Details</h3>
              <button onClick={() => { setShowMemberProfileModal(false); setSelectedMember(null); }} className="p-2 rounded-[5px] bg-[#F2F2F2] cursor-pointer">
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
    </div>
  );
}

