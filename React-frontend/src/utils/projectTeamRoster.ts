/** Build full project team roster (PM, BL, BC, members) for cards and modals. */

export type PmEmployeeLike = {
  id: number | string;
  full_name?: string;
  user_role?: string;
  email?: string;
  profile_picture?: string;
};

export type PmProjectTeamLike = {
  project_manager_id?: string | null;
  project_manager_name?: string | null;
  project_manager?: string | null;
  lead_id?: string | null;
  lead_name?: string | null;
  bim_lead?: string | null;
  bim_coordinator_id?: string | null;
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
};

const rosterKey = (id: number | string, name: string) =>
  id ? `id:${id}` : `name:${name}`;

function splitCsv(value?: string | null): string[] {
  if (!value) return [];
  return value
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
  idsCsv: string | undefined | null,
  namesCsv: string | undefined | null,
  employees: PmEmployeeLike[],
): PmEmployeeLike[] {
  const names = splitCsv(namesCsv);
  if (names.length > 0) {
    return names.map((name, i) => {
      const idPart = splitCsv(idsCsv)[i];
      const fromId = idPart ? resolveById(idPart, employees) : undefined;
      if (fromId) return fromId;
      const byName = employees.find((e) => e.full_name === name);
      return (
        byName || {
          id: idPart && /^\d+$/.test(idPart) ? Number(idPart) : -(i + 1),
          full_name: name,
        }
      );
    });
  }
  return splitCsv(idsCsv)
    .map((id) => resolveById(id, employees))
    .filter((e): e is PmEmployeeLike => Boolean(e));
}

function memberIdsFromProject(project: PmProjectTeamLike): (string | number)[] {
  const raw = project.members || project.member || "";
  return splitCsv(raw).map((m) => {
    const n = Number(m);
    return Number.isNaN(n) ? m : n;
  });
}

/** Ordered roster: Project Manager → BIM Lead → BIM Coordinator → Members. */
export function collectPmProjectTeamRoster(
  project: PmProjectTeamLike,
  employees: PmEmployeeLike[],
): PmTeamRosterEntry[] {
  const out: PmTeamRosterEntry[] = [];
  const seen = new Set<string>();

  const push = (emp: PmEmployeeLike | undefined, defaultRole: string) => {
    if (!emp) return;
    const name = (emp.full_name || "").trim();
    const id = Number(emp.id);
    if (!name && !id) return;
    const key = rosterKey(id || name, name);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: Number.isFinite(id) && id > 0 ? id : 0,
      full_name: name || `Employee ${id}`,
      user_role: (emp.user_role && String(emp.user_role).trim()) || defaultRole,
      email: emp.email,
      profile_picture: emp.profile_picture,
    });
  };

  for (const emp of namesFromIds(
    project.project_manager_id,
    project.project_manager_name || project.project_manager,
    employees,
  )) {
    push(emp, "Project Manager");
  }

  for (const emp of namesFromIds(
    project.lead_id,
    project.lead_name || project.bim_lead,
    employees,
  )) {
    push(emp, "BIM Lead");
  }

  for (const emp of namesFromIds(
    project.bim_coordinator_id,
    project.bim_coordinator_name || project.bim_co_ordinator,
    employees,
  )) {
    push(emp, "BIM Coordinator");
  }

  for (const mid of memberIdsFromProject(project)) {
    const emp = employees.find(
      (e) => Number(e.id) === Number(mid) || String(e.id) === String(mid),
    );
    push(emp, "Member");
  }

  return out.filter((e) => e.full_name);
}
