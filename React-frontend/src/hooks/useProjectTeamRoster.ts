import { useMemo } from "react";
import { getGlobalProfileUrl, getRosterProfileUrl } from "../lib/profileHelpers";
import {
  collectPmProjectTeamRoster,
  memberIdsFromProject,
  splitCsv,
  type PmEmployeeLike,
  type PmProjectTeamLike,
  type PmTeamRosterEntry,
} from "../utils/projectTeamRoster";
import { parseAttachmentsField } from "../utils/projectDetails";

export type RosterEmployeeLike = PmEmployeeLike & {
  id: number | string;
  full_name?: string;
  profile_picture?: string;
  vendor_employee_id?: number | string | null;
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

type PicMeta = { pic: string; profileUserId: number | string };

function buildPicMap(employees: RosterEmployeeLike[]): Map<string, PicMeta> {
  const map = new Map<string, PicMeta>();
  for (const emp of employees) {
    const id = emp.id;
    if (id == null || !emp.profile_picture) continue;
    const profileUserId =
      emp.vendor_employee_id != null &&
      String(emp.vendor_employee_id).trim() !== ""
        ? emp.vendor_employee_id
        : id;
    map.set(String(id), { pic: emp.profile_picture, profileUserId });
  }
  return map;
}

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

  const isOutsourceProject = (proj?: {
    source?: string;
    department?: string;
  }) =>
    proj?.source === "Outsource" ||
    String(proj?.department ?? "")
      .trim()
      .toLowerCase() === "submission deadline";

  const employeesForProject = (proj?: ProjectWithVendorProfiles) => {
    if (isOutsourceProject(proj)) {
      return [...vendorTeamEmployees, ...vendorResourceProfiles];
    }
    return rosterEmployees;
  };

  const resolveProjectMember = (
    id: string | number,
    projectSource?: string,
    proj?: ProjectWithVendorProfiles,
  ) => {
    if (projectSource === "Outsource" || (proj && isOutsourceProject(proj))) {
      const sid = String(id);
      const isMember =
        proj != null &&
        memberIdsFromProject(proj).some((m) => String(m) === sid);
      if (isMember) {
        const fromResource = vendorResourceProfiles.find(
          (e) => Number(e.id) === Number(id) || String(e.id) === sid,
        );
        if (fromResource) return fromResource;
      }
      const fromTeam = vendorTeamEmployees.find(
        (e) => Number(e.id) === Number(id) || String(e.id) === sid,
      );
      if (fromTeam) return fromTeam;
      return vendorResourceProfiles.find(
        (e) => Number(e.id) === Number(id) || String(e.id) === sid,
      );
    }
    return rosterEmployees.find(
      (e) => Number(e.id) === Number(id) || String(e.id) === String(id),
    );
  };

  const profileUserTypeForMember = (
    empId?: string | number,
    projectSource?: string,
  ) =>
    projectSource === "Outsource" ||
    vendorTeamEmployees.some((e) => Number(e.id) === Number(empId)) ||
    vendorResourceProfiles.some((e) => Number(e.id) === Number(empId))
      ? "vendor"
      : undefined;

  const profileUrlFor = (
    emp: RosterEmployeeLike | null | undefined,
    projectSource?: string,
  ) => {
    if (!emp?.profile_picture) return null;
    const profileUserId = emp.vendor_employee_id ?? emp.id;
    return getGlobalProfileUrl(
      profileUserId,
      emp.profile_picture,
      profileUserTypeForMember(emp.id, projectSource),
    );
  };

  const enrichOutsourceRosterProfiles = (
    proj: ProjectWithVendorProfiles,
    roster: PmTeamRosterEntry[],
  ): PmTeamRosterEntry[] => {
    if (!isOutsourceProject(proj)) return roster;

    const teamPicMap = buildPicMap(vendorTeamEmployees);
    const resourcePicMap = buildPicMap(vendorResourceProfiles);
    const memberPicById = new Map<string, string>();
    for (const m of proj.member_profile_pictures ?? []) {
      if (m?.id != null && m.profile_picture) {
        memberPicById.set(String(m.id), m.profile_picture);
      }
    }

    const pmIds = new Set(splitCsv(proj.project_manager_id));
    const leadIds = new Set(splitCsv(proj.lead_id));
    const memberIds = new Set(
      memberIdsFromProject(proj).map((m) => String(m)),
    );

    return roster.map((entry) => {
      const id = String(entry.id);
      let pic: string | undefined;
      let profileUserId: number | string =
        entry.profile_user_id ?? entry.id;

      if (pmIds.has(id)) {
        const team = teamPicMap.get(id);
        if (team) {
          pic = team.pic;
          profileUserId = team.profileUserId;
        } else if (
          proj.project_manager_profile_picture &&
          splitCsv(proj.project_manager_id).length === 1
        ) {
          pic = proj.project_manager_profile_picture;
        }
      } else if (leadIds.has(id)) {
        const team = teamPicMap.get(id);
        if (team) {
          pic = team.pic;
          profileUserId = team.profileUserId;
        } else if (
          proj.lead_profile_picture &&
          splitCsv(proj.lead_id).length === 1
        ) {
          pic = proj.lead_profile_picture;
        }
      } else if (memberIds.has(id)) {
        const resource = resourcePicMap.get(id);
        if (resource) {
          pic = resource.pic;
          profileUserId = resource.profileUserId;
        } else {
          pic = memberPicById.get(id);
          const team = teamPicMap.get(id);
          if (!pic && team) {
            pic = team.pic;
            profileUserId = team.profileUserId;
          }
        }
      } else {
        const team = teamPicMap.get(id);
        const resource = resourcePicMap.get(id);
        if (team) {
          pic = team.pic;
          profileUserId = team.profileUserId;
        } else if (resource) {
          pic = resource.pic;
          profileUserId = resource.profileUserId;
        } else {
          pic = memberPicById.get(id);
        }
      }

      if (!pic) return entry;
      return { ...entry, profile_picture: pic, profile_user_id: profileUserId };
    });
  };

  const teamRosterForProject = (proj: ProjectWithVendorProfiles) => {
    const outsource = isOutsourceProject(proj);
    const basePool = outsource ? vendorTeamEmployees : rosterEmployees;
    const roster = collectPmProjectTeamRoster(proj, basePool, {
      skipBimCoordinator: outsource,
      roleEmployees: outsource ? vendorTeamEmployees : undefined,
      memberEmployees: outsource ? vendorResourceProfiles : undefined,
    });
    return enrichOutsourceRosterProfiles(proj, roster);
  };

  const rosterProfileUrl = (
    entry: PmTeamRosterEntry,
    projectSource?: string,
  ) =>
    getRosterProfileUrl(
      entry,
      profileUserTypeForMember(
        entry.profile_user_id ?? entry.id,
        projectSource,
      ),
    );

  return {
    rosterEmployees,
    isOutsourceProject,
    employeesForProject,
    resolveProjectMember,
    profileUserTypeForMember,
    profileUrlFor,
    rosterProfileUrl,
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

/** Normalize vendor-projects API rows for roster avatar enrichment. */
export function mapVendorProjectFromApi<T extends Record<string, unknown>>(row: T) {
  const attachments = parseAttachmentsField(row.attachments);
  return {
    ...row,
    source: "Outsource" as const,
    ...vendorProfileFieldsFromApi(row),
    attachments: attachments?.length ? attachments : undefined,
    document_attachment:
      row.document_attachment != null
        ? String(row.document_attachment)
        : undefined,
  };
}

export function toVendorProjectTeamLike(
  proj: ProjectWithVendorProfiles & {
    project_manager_name?: string | null;
    lead_name?: string | null;
    bim_coordinator_name?: string | null;
  },
): ProjectWithVendorProfiles {
  return {
    ...proj,
    source: proj.source ?? "Outsource",
    project_manager: proj.project_manager_name ?? proj.project_manager,
    bim_lead: proj.lead_name ?? proj.bim_lead,
    bim_co_ordinator: proj.bim_coordinator_name ?? proj.bim_co_ordinator,
  };
}
