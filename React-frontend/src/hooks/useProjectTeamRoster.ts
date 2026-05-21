import { useMemo } from "react";
import { getGlobalProfileUrl } from "../lib/profileHelpers";
import {
  collectPmProjectTeamRoster,
  type PmEmployeeLike,
  type PmProjectTeamLike,
  type PmTeamRosterEntry,
} from "../utils/projectTeamRoster";

export type RosterEmployeeLike = PmEmployeeLike & {
  id: number | string;
  full_name?: string;
  profile_picture?: string;
};

export type ProjectWithVendorProfiles = PmProjectTeamLike & {
  source?: string;
  department?: string;
  project_manager_profile_picture?: string;
  lead_profile_picture?: string;
  member_profile_pictures?: Array<{
    id: number | string;
    profile_picture?: string;
  }>;
};

export function useProjectTeamRoster(
  allEmployees: RosterEmployeeLike[],
  vendorResourceProfiles: RosterEmployeeLike[],
  vendorTeamEmployees: RosterEmployeeLike[],
) {
  const rosterEmployees = useMemo(() => {
    const seen = new Set<string>();
    const merged: RosterEmployeeLike[] = [];
    for (const emp of [
      ...allEmployees,
      ...vendorResourceProfiles,
      ...vendorTeamEmployees,
    ]) {
      const key = String(emp.id ?? emp.full_name ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(emp);
    }
    return merged;
  }, [allEmployees, vendorResourceProfiles, vendorTeamEmployees]);

  const outsourceRosterEmployees = useMemo(() => {
    const seen = new Set<string>();
    const merged: RosterEmployeeLike[] = [];
    for (const emp of [...vendorTeamEmployees, ...vendorResourceProfiles]) {
      const key = String(emp.id ?? emp.full_name ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(emp);
    }
    return merged;
  }, [vendorTeamEmployees, vendorResourceProfiles]);

  const isOutsourceProject = (proj?: {
    source?: string;
    department?: string;
  }) =>
    proj?.source === "Outsource" ||
    String(proj?.department ?? "")
      .trim()
      .toLowerCase() === "submission deadline";

  const employeesForProject = (proj?: ProjectWithVendorProfiles) =>
    isOutsourceProject(proj) ? outsourceRosterEmployees : rosterEmployees;

  const resolveProjectMember = (
    id: string | number,
    projectSource?: string,
  ) => {
    const pool =
      projectSource === "Outsource"
        ? outsourceRosterEmployees
        : rosterEmployees;
    return pool.find(
      (e) => Number(e.id) === Number(id) || String(e.id) === String(id),
    );
  };

  const profileUserTypeForMember = (
    empId?: string | number,
    projectSource?: string,
  ) =>
    projectSource === "Outsource" ||
    vendorTeamEmployees.some((e) => Number(e.id) === Number(empId))
      ? "vendor"
      : undefined;

  const profileUrlFor = (
    emp: RosterEmployeeLike | null | undefined,
    projectSource?: string,
  ) => {
    if (!emp?.profile_picture) return null;
    return getGlobalProfileUrl(
      emp.id,
      emp.profile_picture,
      profileUserTypeForMember(emp.id, projectSource),
    );
  };

  const enrichOutsourceRosterProfiles = (
    proj: ProjectWithVendorProfiles,
    roster: PmTeamRosterEntry[],
  ): PmTeamRosterEntry[] => {
    if (!isOutsourceProject(proj)) return roster;
    const memberPicById = new Map<string, string>();
    for (const m of proj.member_profile_pictures ?? []) {
      if (m?.id != null && m.profile_picture) {
        memberPicById.set(String(m.id), m.profile_picture);
      }
    }
    return roster.map((entry) => {
      if (entry.profile_picture) return entry;
      const id = String(entry.id);
      let pic: string | undefined;
      if (
        id &&
        String(proj.project_manager_id ?? "")
          .split(",")
          .map((s) => s.trim())
          .includes(id)
      ) {
        pic = proj.project_manager_profile_picture;
      } else if (
        id &&
        String(proj.lead_id ?? "")
          .split(",")
          .map((s) => s.trim())
          .includes(id)
      ) {
        pic = proj.lead_profile_picture;
      } else {
        pic = memberPicById.get(id);
      }
      return pic ? { ...entry, profile_picture: pic } : entry;
    });
  };

  const teamRosterForProject = (proj: ProjectWithVendorProfiles) =>
    enrichOutsourceRosterProfiles(
      proj,
      collectPmProjectTeamRoster(proj, employeesForProject(proj), {
        skipBimCoordinator: isOutsourceProject(proj),
      }),
    );

  return {
    rosterEmployees,
    outsourceRosterEmployees,
    isOutsourceProject,
    employeesForProject,
    resolveProjectMember,
    profileUserTypeForMember,
    profileUrlFor,
    teamRosterForProject,
  };
}

export const VENDOR_TEAM_ROLES = [
  "Vendor PM",
  "Vendor Bim Lead",
  "Vendor Employee",
] as const;

export async function fetchVendorTeamEmployees(
  apiGet: <T>(url: string) => Promise<{ data: T }>,
): Promise<RosterEmployeeLike[]> {
  const responses = await Promise.all(
    VENDOR_TEAM_ROLES.map((role) =>
      apiGet<{ employees?: RosterEmployeeLike[] }>(
        `/api/vendors/vendor-by-role?role=${encodeURIComponent(role)}`,
      ),
    ),
  );
  const seen = new Set<number>();
  const merged: RosterEmployeeLike[] = [];
  responses.forEach(({ data }) => {
    (data.employees ?? []).forEach((emp) => {
      const id = Number(emp.id);
      if (!id || seen.has(id)) return;
      seen.add(id);
      merged.push(emp);
    });
  });
  return merged;
}

export const vendorProfileFieldsFromApi = (r: Record<string, unknown>) => ({
  project_manager_profile_picture:
    r.project_manager_profile_picture != null
      ? String(r.project_manager_profile_picture)
      : undefined,
  lead_profile_picture:
    r.lead_profile_picture != null
      ? String(r.lead_profile_picture)
      : undefined,
  bim_coordinator_profile_picture:
    r.bim_coordinator_profile_picture != null
      ? String(r.bim_coordinator_profile_picture)
      : undefined,
  member_profile_pictures: Array.isArray(r.member_profile_pictures)
    ? (r.member_profile_pictures as ProjectWithVendorProfiles["member_profile_pictures"])
    : undefined,
});
