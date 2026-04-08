import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import threedot from "../../../assets/ProjectManager/project/threedot.svg";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";

type VendorResourceProfileRow = {
  id: number;
  vendor_employee_id?: number | null;
  full_name?: string;
  name?: string;
};

type Project = {
  id: number;
  project_name?: string;
  members?: string | null;
  members_names?: string | string[] | null;
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  uploader_name?: string | null;
  project_manager_id?: number | string | null;
  lead_id?: number | string | null;
  bim_coordinator_id?: number | string | null;
  status?: string | null;
  progress?: number | string | null;
  priority?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
};

type Task = {
  id: number;
  project_id?: number;
  projectid?: number;
};

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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="bg-white pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-[24px] font-semibold text-[#000000] font-Gantari">
            Projects
          </h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
          {filtered.map((p) => {
            const normalizedStatus = normalizeProjectStatus(p);
            const progress =
              normalizedStatus === "completed"
                ? 100
                : safePercent(p.progress, 0);

            const memberNames: string[] = [];
            // Prefer hydrated names.
            const mn = p.members_names;
            if (Array.isArray(mn)) {
              mn.map(String)
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((s) => memberNames.push(s));
            } else {
              // Fallback: attempt to resolve members ids via resource profiles.
              for (const token of splitCsv(p.members)) {
                const resolved = profileNameById.get(token);
                if (resolved) memberNames.push(resolved);
              }
            }

            const shown = memberNames.slice(0, 3);

            return (
              <div
                key={p.id}
                className="rounded-[8px] border border-[#E5E7EB] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-full border border-slate-200 bg-[#F8FAFC] flex items-center justify-center text-[12px] font-semibold text-[#353535]">
                    {progress}%
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/ve/projects/${p.id}`)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[12px] text-slate-600 hover:text-[#DD4342] hover:border-[#DD4342]"
                      title="View Project"
                    >
                      <img
                        src={viewIcon}
                        alt="view"
                        className="w-3.5 h-3.5 opacity-80"
                      />
                      <span>View</span>
                    </button>
                    <img
                      src={threedot}
                      alt="menu"
                      className="w-4 h-4 opacity-70"
                    />
                  </div>
                </div>

                <h3 className="text-[18px] font-semibold text-[#111827] truncate leading-tight mb-5">
                  {p.project_name || `Project #${p.id}`}
                </h3>

                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {shown.length > 0 ? (
                      shown.map((n, idx) => (
                        <div
                          key={`${p.id}-m-${idx}`}
                          className="w-7 h-7 rounded-full bg-[#E5E7EB] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#353535]"
                          title={n}
                        >
                          {initials(n)}
                        </div>
                      ))
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#E5E7EB] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#353535]">
                        V
                      </div>
                    )}
                  </div>

                  <div
                    className={`inline-flex rounded-[6px] px-3 py-1 text-[11px] font-semibold ${
                      (p.priority || "").toLowerCase() === "high"
                        ? "bg-[#FDE7E7] text-[#E25555]"
                        : (p.priority || "").toLowerCase() === "low"
                          ? "bg-[#DDFCE5] text-[#34A853]"
                          : "bg-[#E8F3FF] text-[#2D7FF9]"
                    }`}
                  >
                    {p.priority ||
                      (normalizedStatus === "completed" ? "Completed" : "Normal")}
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
  );
}

