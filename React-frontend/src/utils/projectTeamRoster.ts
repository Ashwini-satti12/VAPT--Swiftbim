/** Build full project team roster (PM, BL, BC, members) for cards and modals. */

export type PmEmployeeLike = {
  id: number | string;
  full_name?: string;
  user_role?: string;
  email?: string;
  profile_picture?: string;
};

export type PmProjectTeamLike = {
  project_manager_id?: string | number | null;
  project_manager_name?: string | null;
  project_manager?: string | null;
  lead_id?: string | number | null;
  lead_name?: string | null;
  bim_lead?: string | null;
  bim_coordinator_id?: string | number | null;
  bim_coordinator_name?: string | null;
  bim_co_ordinator?: string | null;
  member?: string | null;
  members?: string | null;
};

export type PmTeamRosterEntry = {
  id: number;
  full_name: string;
  user_role?: string;
  email?: string;
  profile_picture?: string;
  /** Entity id used for /api/view_profile_picture (may differ from roster id for resource profiles). */
  profile_user_id?: number | string;
};

const rosterKey = (id: number | string, name: string) =>
  id ? `id:${id}` : `name:${name}`;

export function splitCsv(value?: string | number | null): string[] {
  if (value == null || value === "") return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveById(
  id: string,
  employees: PmEmployeeLike[],
): PmEmployeeLike | undefined {
  return employees.find(
    (e) => Number(e.id) === Number(id) || String(e.id) === String(id),
  );
}

function namesFromIds(
  idsCsv: string | number | undefined | null,
  namesCsv: string | number | undefined | null,
  employees: PmEmployeeLike[],
): PmEmployeeLike[] {
  const names = splitCsv(namesCsv);
  if (names.length > 0) {
    return names
      .map((name, i) => {
        const idPart = splitCsv(idsCsv)[i];
        const fromId = idPart ? resolveById(idPart, employees) : undefined;
        if (fromId) return fromId;
        const byName = employees.find((e) => e.full_name === name);
        if (byName) return byName;
        if (idPart) return resolveById(idPart, employees);
        return undefined;
      })
      .filter((e): e is PmEmployeeLike => Boolean(e));
  }
  return splitCsv(idsCsv)
    .map((id) => resolveById(id, employees))
    .filter((e): e is PmEmployeeLike => Boolean(e));
}

export function memberIdsFromProject(project: PmProjectTeamLike): (string | number)[] {
  const raw = project.members || project.member || "";
  return splitCsv(raw).map((m) => {
    const n = Number(m);
    return Number.isNaN(n) ? m : n;
  });
}

export type CollectPmProjectTeamRosterOptions = {
  /** Omit BIM Coordinator (e.g. outsource vendor projects). */
  skipBimCoordinator?: boolean;
  /** Pool for PM / BIM Lead / BIM Coordinator (vendor_employee rows). */
  roleEmployees?: PmEmployeeLike[];
  /** Pool for `members` field (often vendor_resource_profiles ids). */
  memberEmployees?: PmEmployeeLike[];
};

/** Ordered roster: Project Manager → BIM Lead → BIM Coordinator → Members. */
export function collectPmProjectTeamRoster(
  project: PmProjectTeamLike,
  employees: PmEmployeeLike[],
  options?: CollectPmProjectTeamRosterOptions,
): PmTeamRosterEntry[] {
  const out: PmTeamRosterEntry[] = [];
  const seen = new Set<string>();
  const rolePool = options?.roleEmployees ?? employees;
  const memberPool = options?.memberEmployees ?? employees;

  const push = (emp: PmEmployeeLike | undefined, defaultRole: string) => {
    if (!emp) return;
    const name = (emp.full_name || "").trim();
    const id = Number(emp.id);
    if (!name && !id) return;
    const key = rosterKey(id || name, name);
    if (seen.has(key)) return;
    seen.add(key);
    const raw = emp as PmEmployeeLike & { vendor_employee_id?: number | string };
    const profileUserId =
      raw.vendor_employee_id != null && String(raw.vendor_employee_id).trim() !== ""
        ? raw.vendor_employee_id
        : id;
    out.push({
      id: Number.isFinite(id) && id > 0 ? id : 0,
      full_name: name || `Employee ${id}`,
      user_role: (emp.user_role && String(emp.user_role).trim()) || defaultRole,
      email: emp.email,
      profile_picture: emp.profile_picture,
      profile_user_id: profileUserId,
    });
  };

  const resolveMember = (mid: string | number) => {
    const fromMembers = memberPool.find(
      (e) => Number(e.id) === Number(mid) || String(e.id) === String(mid),
    );
    if (fromMembers) return fromMembers;
    return rolePool.find(
      (e) => Number(e.id) === Number(mid) || String(e.id) === String(mid),
    );
  };

  for (const emp of namesFromIds(
    project.project_manager_id,
    project.project_manager_name || project.project_manager,
    rolePool,
  )) {
    push(emp, "Project Manager");
  }

  for (const emp of namesFromIds(
    project.lead_id,
    project.lead_name || project.bim_lead,
    rolePool,
  )) {
    push(emp, "BIM Lead");
  }

  if (!options?.skipBimCoordinator) {
    for (const emp of namesFromIds(
      project.bim_coordinator_id,
      project.bim_coordinator_name || project.bim_co_ordinator,
      rolePool,
    )) {
      push(emp, "BIM Coordinator");
    }
  }

  for (const mid of memberIdsFromProject(project)) {
    push(resolveMember(mid), "Member");
  }

  return out.filter((e) => e.full_name);
}

/** Members field only — skips IDs that do not resolve to a known employee. */
export function collectProjectMembersOnly(
  project: PmProjectTeamLike,
  employees: PmEmployeeLike[],
): PmTeamRosterEntry[] {
  const out: PmTeamRosterEntry[] = [];
  const seen = new Set<string>();

  for (const mid of memberIdsFromProject(project)) {
    const emp = employees.find(
      (e) => Number(e.id) === Number(mid) || String(e.id) === String(mid),
    );
    if (!emp) continue;
    const name = (emp.full_name || "").trim();
    if (!name) continue;
    const id = Number(emp.id);
    const key = rosterKey(id || name, name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: Number.isFinite(id) && id > 0 ? id : 0,
      full_name: name,
      user_role: (emp.user_role && String(emp.user_role).trim()) || "Member",
      email: emp.email,
      profile_picture: emp.profile_picture,
    });
  }

  return out;
}

/** Member rows from an enriched team roster (correct avatars for outsource). */
export function filterRosterMembers(
  roster: PmTeamRosterEntry[],
  project: PmProjectTeamLike,
): PmTeamRosterEntry[] {
  const memberIds = new Set(memberIdsFromProject(project).map(String));
  return roster.filter((e) => memberIds.has(String(e.id)));
}
