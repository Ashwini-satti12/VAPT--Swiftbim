import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { PlusIcon } from "@heroicons/react/24/outline";
import threeDotsIcon from "../../assets/ProjectManager/CreateTeam/three dots.svg";
import editIcon from "../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import upArrow from "../../assets/TechnicalDirector/upArrow.svg";
import ProfileIcon from "../../assets/ProductNavbarIcons/Profile.svg";
import CloseIcon from "../../assets/ProductNavbarIcons/close button.svg";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";

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

interface Employee {
  id: number;
  full_name?: string;
  user_role?: string;
  empid?: string;
  profile_picture?: string;
  email?: string;
  phone_number?: string;
  dob?: string;
  doj?: string;
  user_type?: string;
  address?: string;
  department?: string;
  active?: string | null;
}

interface Team {
  team_id: number;
  teamname?: string;
  team_name?: string;
  leader: number;
  leader_name?: string;
  employee: string;
  project_lead?: number;
  project_id?: number;
  project_name?: string;
}

interface Project {
  id: number;
  project_name?: string;
  members?: string;
  members_names?: string[];
  project_manager_name?: string;
  lead_name?: string;
  bim_coordinator_name?: string;
  uploader_name?: string;
}

function isTechnicalDirectorRole(role: string | undefined): boolean {
  return String(role || "").trim() === "Technical Director";
}

function TeamCard({
  team,
  employees,
  canManageTeams,
  onEdit,
  onDelete,
  onViewDetails,
  onShowAllMembers,
  onShowMemberProfile,
}: {
  team: Team;
  employees: Employee[];
  /** Only Technical Director may edit/delete teams from this screen. */
  canManageTeams: boolean;
  onEdit: (team: Team) => void;
  onDelete: (id: number) => void;
  onViewDetails: (team: Team) => void;
  onShowAllMembers: (members: Employee[]) => void;
  onShowMemberProfile: (member: Employee) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const memberIds = (team.employee ?? "")
    .split(",")
    .filter(Boolean)
    .map((id) => id.trim());

  const getEmpName = (id: number | string) => {
    const e = employees.find((emp) => String(emp.id) === String(id));
    return e ? e.full_name || "Unknown" : "Unknown";
  };

  const getEmployee = (id: number | string) => {
    return employees.find((emp) => String(emp.id) === String(id));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-md p-3.5 border border-[#E5E7EB] w-full flex flex-col transition-all hover:shadow-md group relative font-Gantari">
      {/* Team Name */}
      <div className="flex flex-col mb-3 pt-1">
        <span className="text-[14px] font-medium text-[#8B8B8B] mb-1.5">
          Team Name
        </span>
        <span className="text-[16px] sm:text-[18px] font-semibold text-[#353535] pr-8 truncate">
          {team.team_name || team.teamname || "Untitled Team"}
        </span>
      </div>

      {canManageTeams && (
        <div className="absolute top-6 right-6" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img
              src={threeDotsIcon}
              alt="Options"
              className="w-5 h-5 object-contain"
            />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-3 w-[158px] bg-white/20 backdrop-blur-md rounded-xl border border-[#59595980] py-2.5 z-[110] animate-in fade-in zoom-in duration-200 origin-top-right shadow-xl">
              <button
                type="button"
                onClick={() => {
                  onEdit(team);
                  setShowMenu(false);
                }}
                className="w-full px-6 py-3 flex items-center gap-4 transition-colors text-left group/item cursor-pointer"
              >
                <img
                  src={editIcon}
                  alt="Edit"
                  className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                />
                <span className="text-[14px] font-medium text-[#8B8B8B] group-hover/item:text-[#DD4342]">
                  Edit
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(team.team_id);
                  setShowMenu(false);
                }}
                className="w-full px-6 py-3 flex items-center gap-4 transition-colors text-left group/item cursor-pointer"
              >
                <img
                  src={deleteIcon}
                  alt="Delete"
                  className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                />
                <span className="text-[14px] font-medium text-[#8B8B8B] group-hover/item:text-[#DD4342]">
                  Delete
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Team Leader */}
      <div className="flex flex-col mb-4">
        <span className="text-[14px] font-medium text-[#8B8B8B] mb-1.5">
          Team Leader
        </span>
        <span className="text-[16px] sm:text-[18px] font-semibold text-[#353535] truncate flex items-center gap-2">
          {team.leader_name || getEmpName(team.leader)}
          {(() => {
            const emp = getEmployee(team.leader);
            return emp && !isEmployeeActiveForProjectAssignment(emp) ? (
              <span className="text-xs font-normal text-red-500">(Inactive)</span>
            ) : null;
          })()}
        </span>
      </div>

      <div className="h-[1px] w-full bg-[#E5E7EB] mb-4"></div>

      {/* Members & Details */}
      <div className="mt-auto flex items-center justify-between">
        <div className="flex -space-x-3">
          {(() => {
            const projectEmployees = memberIds
              .map((id) => getEmployee(id))
              .filter(Boolean) as Employee[];

            const visibleMembers = projectEmployees.slice(0, 3);
            const remainingCount = Math.max(0, projectEmployees.length - 3);

            return (
              <>
                {visibleMembers.map((emp) => {
                  const profileUrl = emp.profile_picture
                    ? getGlobalProfileUrl(emp.id, emp.profile_picture)
                    : null;

                  return (
                    <div
                      key={emp.id}
                      className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                      title={emp.full_name}
                      onClick={() => onShowMemberProfile(emp)}
                    >
                      {profileUrl ? (
                        <img
                          src={profileUrl}
                          alt={emp.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = ProfileIcon;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[10px] font-bold text-slate-600">
                          {(emp.full_name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
                {remainingCount > 0 && (
                  <div
                    className="w-9 h-9 rounded-full border-1 border-dashed bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => onShowAllMembers(projectEmployees)}
                  >
                    +{remainingCount}
                  </div>
                )}
                {visibleMembers.length === 0 && memberIds.length > 0 && (
                  <div
                    className="w-9 h-9 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() =>
                      onShowAllMembers(
                        memberIds
                          .map((id) => getEmployee(id))
                          .filter(Boolean) as Employee[],
                      )
                    }
                  >
                    +{memberIds.length}
                  </div>
                )}
              </>
            );
          })()}
        </div>
        <button
          onClick={() => onViewDetails(team)}
          className="flex items-center gap-2 text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] transition-colors pr-2 cursor-pointer group/details"
        >
          Details
          <img src={upArrow} alt="Up" className="w-5 h-5 object-contain transition-all duration-200 group-hover/details:brightness-0 group-hover/details:invert-[20%]" />
        </button>
      </div>
    </div>
  );
}

export default function CreateteamTD() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
  const [leaderDropdownUpward, setLeaderDropdownUpward] = useState(false);
  const [memberDropdownUpward, setMemberDropdownUpward] = useState(false);
  const [leaderSearchQuery, setLeaderSearchQuery] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectDropdownUpward, setProjectDropdownUpward] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  const [showEditProjectDropdown, setShowEditProjectDropdown] = useState(false);
  const [editProjectDropdownUpward, setEditProjectDropdownUpward] = useState(false);
  const editProjectDropdownRef = useRef<HTMLDivElement>(null);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const leaderDropdownRef = useRef<HTMLDivElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);

  // Profile modal state
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Employee | null>(null);

  // All members modal state
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [allMembersList, setAllMembersList] = useState<Employee[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMemberDropdown(false);
      }
      if (
        leaderDropdownRef.current &&
        !leaderDropdownRef.current.contains(event.target as Node)
      ) {
        setShowLeaderDropdown(false);
      }
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProjectDropdown(false);
      }
      if (
        editProjectDropdownRef.current &&
        !editProjectDropdownRef.current.contains(event.target as Node)
      ) {
        setShowEditProjectDropdown(false);
      }
      if (
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowEntriesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [form, setForm] = useState({
    leader: "",
    employee: [] as string[],
    project_lead: "",
    project_id: "",
    team_name: "",
  });

  const [editForm, setEditForm] = useState({
    leader: "",
    employee: [] as string[],
    project_lead: "",
    project_id: "",
    team_name: "",
  });

  useEffect(() => {
    Promise.all([
      api.get<{ teams?: Team[] }>("/api/teams"),
      api.get<{ employees?: Employee[] }>("/api/employees"),
      api.get<{ projects?: Project[] }>("/api/projects"),
    ])
      .then(([teamsRes, empsRes, projectsRes]) => {
        const sortedTeams = (teamsRes.data.teams ?? []).sort((a, b) => b.team_id - a.team_id);
        setTeams(sortedTeams);
        setEmployees(empsRes.data.employees ?? []);
        setProjects(projectsRes.data.projects ?? []);
      })
      .catch(() => {
        setTeams([]);
        setEmployees([]);
        setProjects([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showEntriesOpen && showEntriesDropdownContentRef.current) {
      showEntriesDropdownContentRef.current.scrollTop = 0;
    }
  }, [showEntriesOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leader) return;
    setSubmitting(true);

    api
      .post("/api/teams", {
        team_name: form.team_name,
        leader: form.leader,
        employee: form.employee.join(","),
        project_lead: form.project_lead || undefined,
        project_id: form.project_id ? Number(form.project_id) : undefined,
      })
      .then(({ data }) => {
        if (data.success) {
          setShowAddModal(false);
          // Refresh data instead of page reload for better UX
          api
            .get<{ teams?: Team[] }>("/api/teams")
            .then((res) => {
              const sorted = (res.data.teams ?? []).sort((a, b) => b.team_id - a.team_id);
              setTeams(sorted);
            });
          setForm({
            leader: "",
            employee: [],
            project_lead: "",
            project_id: "",
            team_name: "",
          });
          setSuccessMsg("Team Created Successfully");
          setTimeout(() => setSuccessMsg(""), 3000);
        }
      })
      .catch(() => { })
      .finally(() => setSubmitting(false));
  };

  const handleMemberToggle = (id: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditForm((prev) => {
        const exists = prev.employee.includes(id);
        if (exists) {
          return { ...prev, employee: prev.employee.filter((e) => e !== id) };
        } else {
          return { ...prev, employee: [...prev.employee, id] };
        }
      });
    } else {
      setForm((prev) => {
        const exists = prev.employee.includes(id);
        if (exists) {
          return { ...prev, employee: prev.employee.filter((e) => e !== id) };
        } else {
          return { ...prev, employee: [...prev.employee, id] };
        }
      });
    }
  };

  const handleEditClick = (team: Team) => {
    const inferredProjectId =
      team.project_id != null
        ? String(team.project_id)
        : team.project_name
          ? String(
            projects.find((p) => p.project_name === team.project_name)?.id ??
            "",
          )
          : "";
    setSelectedTeam(team);
    setEditForm({
      leader: String(team.leader),
      employee: team.employee ? team.employee.split(",").filter(Boolean) : [],
      project_lead: team.project_lead ? String(team.project_lead) : "",
      project_id: inferredProjectId,
      team_name: team.team_name || team.teamname || "",
    });
    setShowLeaderDropdown(false);
    setShowMemberDropdown(false);
    setShowEditModal(true);
  };

  const handleDelete = (teamId: number) => {
    setTeamToDelete(teamId);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (teamToDelete === null) return;
    setSubmitting(true);
    api
      .delete(`/api/teams/${teamToDelete}`)
      .then(({ data }) => {
        if (data.success) {
          setTeams(teams.filter((t) => t.team_id !== teamToDelete));
          setShowDeleteModal(false);
          setTeamToDelete(null);
          setSuccessMsg("Team Deleted Successfully");
          setTimeout(() => setSuccessMsg(""), 3000);
        }
      })
      .catch(console.error)
      .finally(() => setSubmitting(false));
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !editForm.leader) return;
    setSubmitting(true);

    api
      .patch(`/api/teams/${selectedTeam.team_id}`, {
        team_name: editForm.team_name,
        leader: editForm.leader,
        employee: editForm.employee.join(","),
        project_lead: editForm.project_lead || 0,
        project_id: editForm.project_id
          ? Number(editForm.project_id)
          : undefined,
      })
      .then(({ data }) => {
        if (data.success) {
          setShowEditModal(false);
          api
            .get<{ teams?: Team[] }>("/api/teams")
            .then((res) => {
              const sorted = (res.data.teams ?? []).sort((a, b) => b.team_id - a.team_id);
              setTeams(sorted);
            });
          setSuccessMsg("Team Updated Successfully");
          setTimeout(() => setSuccessMsg(""), 3000);
        }
      })
      .catch(() => { })
      .finally(() => setSubmitting(false));
  };

  const getEmpName = (id: number | string) => {
    const e = employees.find((emp) => emp.id == id);
    return e ? e.full_name : "Unknown";
  };

  const selectableEmployees = employees.filter(
    isEmployeeActiveForProjectAssignment,
  );

  const getProjectEmployees = (projectId: string | number) => {
    if (!projectId) return selectableEmployees;
    const proj = projects.find((p) => String(p.id) === String(projectId));
    if (!proj) return selectableEmployees;

    const involvedNames = new Set<string>();
    if (proj.project_manager_name) involvedNames.add(proj.project_manager_name);
    if (proj.lead_name) involvedNames.add(proj.lead_name);
    if (proj.bim_coordinator_name) involvedNames.add(proj.bim_coordinator_name);
    if (proj.uploader_name) involvedNames.add(proj.uploader_name);
    if (Array.isArray(proj.members_names)) {
      proj.members_names.forEach(name => {
        if (name) involvedNames.add(name);
      });
    }

    const filtered = selectableEmployees.filter(
      (e) => e.full_name && involvedNames.has(e.full_name),
    );
    return filtered.length > 0 ? filtered : selectableEmployees;
  };

  const currentUserRole = useMemo(() => {
    const fromUser = user?.user_role?.trim();
    if (fromUser) return fromUser;
    if (user?.id != null) {
      const em = employees.find((e) => e.id === user.id);
      return em?.user_role?.trim() ?? "";
    }
    return "";
  }, [user?.user_role, user?.id, employees]);

  const isTechnicalDirector = isTechnicalDirectorRole(currentUserRole);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DD4342]" />
      </div>
    );
  }

  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const filteredTeams = teams.filter((t) => {
    if (!searchQuery) return true;
    const tName = (t.team_name || t.teamname || "").toLowerCase();
    const pName = (t.project_name || "").toLowerCase();
    const lName = (t.leader_name || getEmpName(t.leader) || "").toLowerCase();
    return (
      tName.includes(searchQuery) ||
      pName.includes(searchQuery) ||
      lName.includes(searchQuery)
    );
  });

  const effectiveShowEntryValue =
    selectedShowEntries || showEntriesOptions[0].value;
  const selectedRange =
    showEntriesOptions.find((opt) => opt.value === effectiveShowEntryValue) ??
    showEntriesOptions[0];
  const rangeEnd =
    selectedRange.end === null
      ? filteredTeams.length
      : Math.min(selectedRange.end, filteredTeams.length);
  const displayTeams = filteredTeams.slice(selectedRange.start, rangeEnd);

  return (
    <div className="h-full flex flex-col p-2 overflow-hidden bg-white relative">
      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-5 py-3 rounded-lg bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 min-w-[300px] animate-in fade-in slide-in-from-top-2 duration-300 font-Gantari">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#58D662]">
            <svg
              className="w-3.5 h-3.5 text-white"
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
          </div>
          <span className="text-[16px] font-medium text-[#2D2D2D]">
            {successMsg}
          </span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 px-2 sm:px-0">
        <h2 className="text-[24px] font-semibold text-[#000000] font-Gantari">
          Team Workspace
        </h2>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Show entries dropdown */}
          <div
            className="relative w-1/2 sm:w-[150px]"
            ref={showEntriesDropdownRef}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEntriesOpen((o) => !o);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-Gantari transition-all cursor-pointer border-0 min-w-0"
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
                    className="w-full text-left px-4 py-2 text-[14px] transition-colors font-Gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
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
                        className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-Gantari font-normal transition-colors cursor-pointer ${isChosen
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
          {isTechnicalDirector && (
            <button
              type="button"
              onClick={() => {
                setShowLeaderDropdown(false);
                setShowMemberDropdown(false);
                setShowAddModal(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-[#DD4342] text-[#F2F2F2] rounded-md transition-all font-medium text-[14px] shadow-sm cursor-pointer whitespace-nowrap w-1/2 sm:w-auto"
            >
              New Team
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-0 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayTeams.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-[#AEACAC52] flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center">
                <PlusIcon className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E293B]">
                  No teams found
                </h3>
                <p className="text-[#64748B]">
                  {searchQuery
                    ? "No teams match your search."
                    : isTechnicalDirector
                      ? 'Click "New Team" to get started.'
                      : "You are not part of any team yet."}
                </p>
              </div>
            </div>
          ) : (
            displayTeams.map((team) => (
              <TeamCard
                key={team.team_id}
                team={team}
                employees={employees}
                canManageTeams={isTechnicalDirector}
                onEdit={handleEditClick}
                onDelete={handleDelete}
                onViewDetails={(t) => {
                  setSelectedTeam(t);
                  setShowDetailsModal(true);
                }}
                onShowAllMembers={(members) => {
                  setAllMembersList(members);
                  setShowAllMembersModal(true);
                }}
                onShowMemberProfile={(member) => {
                  setSelectedMember(member);
                  setShowMemberProfileModal(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-2 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full max-h-[90vh] flex flex-col p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden my-auto">
            <div className="relative mb-10 flex items-center justify-center min-h-[40px] w-full">
              <div className="group absolute left-0 z-10 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer"
                >
                  <img src={CloseIcon} alt="Close" className="w-5 h-5 object-contain" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-[24px] font-semibold text-[#000000]">
                Create New Team
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[14px] font-medium text-[#353535] mb-3">
                    Team Name <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Team Name"
                    className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-md text-[14px] text-[#8B8B8B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                    value={form.team_name}
                    onChange={(e) =>
                      setForm({ ...form, team_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-[#000000] mb-3">
                    Select Project <span className="text-[#DD4342]">*</span>
                  </label>
                  <div className="relative" ref={projectDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        const el = projectDropdownRef.current;
                        if (el) {
                          const rect = el.getBoundingClientRect();
                          setProjectDropdownUpward(window.innerHeight - rect.bottom < 220);
                        }
                        setShowProjectDropdown(!showProjectDropdown);
                      }}
                      className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] flex items-center justify-between transition-all cursor-pointer font-Gantari"
                    >
                      <span>
                        {form.project_id
                          ? projects.find((p) => String(p.id) === form.project_id)?.project_name || "Select Project"
                          : "Select Project"}
                      </span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 4.5L6 7.5L9 4.5"
                          stroke="#8B8B8B"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {showProjectDropdown && (
                      <div
                        className={`absolute left-0 w-full bg-[#FFFFFF] rounded-[10px] shadow-lg border border-[#AEACAC52] py-2 z-[110] animate-in fade-in zoom-in duration-200 max-h-60 overflow-y-auto no-scrollbar flex flex-col ${projectDropdownUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"
                          }`}
                      >
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setForm((f) => ({ ...f, project_id: String(p.id), leader: "", employee: [] }));
                              setShowProjectDropdown(false);
                            }}
                            className="w-full px-5 py-2.5 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors cursor-pointer"
                          >
                            {p.project_name ?? `Project ${p.id}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#353535] mb-3">
                    Select Team Leader <span className="text-[#DD4342]">*</span>
                  </label>
                  <div className="relative" ref={leaderDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Select Team Leader"
                        value={
                          showLeaderDropdown
                            ? leaderSearchQuery
                            : form.leader
                              ? (employees.find(
                                (emp) => String(emp.id) === form.leader,
                              )?.full_name ?? "")
                              : ""
                        }
                        onChange={(e) => {
                          setLeaderSearchQuery(e.target.value);
                          if (e.target.value === "")
                            setForm((f) => ({ ...f, leader: "" }));
                          setShowLeaderDropdown(true);
                        }}
                        onFocus={() => {
                          const el = leaderDropdownRef.current;
                          if (el) {
                            const rect = el.getBoundingClientRect();
                            setLeaderDropdownUpward(
                              window.innerHeight - rect.bottom < 220,
                            );
                          }
                          setShowLeaderDropdown(true);
                          setLeaderSearchQuery(
                            form.leader
                              ? (employees.find(
                                (emp) => String(emp.id) === form.leader,
                              )?.full_name ?? "")
                              : "",
                          );
                        }}
                        className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all font-Gantari"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={`transition-transform duration-200`}
                        >
                          <path
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="#8B8B8B"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    {showLeaderDropdown && (
                      <div
                        className={`absolute left-0 w-full bg-[#FFFFFF] rounded-[10px] shadow-lg border border-[#AEACAC52] py-2 z-[110] animate-in fade-in zoom-in duration-200 max-h-60 flex flex-col ${leaderDropdownUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"}`}
                      >
                        <div className="overflow-y-auto no-scrollbar max-h-44">
                          {getProjectEmployees(form.project_id)
                            .filter(
                              (e) =>
                                !leaderSearchQuery.trim() ||
                                e.full_name
                                  ?.toLowerCase()
                                  .includes(leaderSearchQuery.toLowerCase()),
                            )
                            .map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                onMouseDown={(ev) => {
                                  ev.preventDefault();
                                  setForm({ ...form, leader: String(e.id) });
                                  setLeaderSearchQuery("");
                                  setShowLeaderDropdown(false);
                                }}
                                className="w-full px-5 py-2.5 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors cursor-pointer flex items-center gap-3"
                              >
                                {(() => {
                                  const profileUrl = e.profile_picture ? getGlobalProfileUrl(e.id, e.profile_picture) : null;
                                  return (
                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                      {profileUrl ? (
                                        <img
                                          src={profileUrl}
                                          alt={e.full_name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = ProfileIcon;
                                          }}
                                        />
                                      ) : (
                                        (e.full_name || "U")[0].toUpperCase()
                                      )}
                                    </div>
                                  );
                                })()}
                                {e.full_name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#353535] mb-3">
                    Select Member <span className="text-[#DD4342]">*</span>
                  </label>
                  <div className="relative" ref={memberDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Select Member"
                        value={
                          showMemberDropdown
                            ? memberSearchQuery
                            : form.employee.length === 0
                              ? ""
                              : `${form.employee.length} Member(s) Selected`
                        }
                        onChange={(e) => {
                          setMemberSearchQuery(e.target.value);
                          setShowMemberDropdown(true);
                        }}
                        onFocus={() => {
                          const el = memberDropdownRef.current;
                          if (el) {
                            const rect = el.getBoundingClientRect();
                            setMemberDropdownUpward(
                              window.innerHeight - rect.bottom < 220,
                            );
                          }
                          setShowMemberDropdown(true);
                          setMemberSearchQuery("");
                        }}
                        className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all font-Gantari"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={`transition-transform duration-200`}
                        >
                          <path
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="#8B8B8B"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    {showMemberDropdown && (
                      <div
                        className={`absolute left-0 w-full bg-[#FFFFFF] rounded-[10px] shadow-lg border border-[#AEACAC52] py-2 z-[110] animate-in fade-in zoom-in duration-200 max-h-60 flex flex-col ${memberDropdownUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"}`}
                      >
                        <div className="overflow-y-auto no-scrollbar max-h-44">
                          {getProjectEmployees(form.project_id)
                            .filter(
                              (e) =>
                                !memberSearchQuery.trim() ||
                                e.full_name
                                  ?.toLowerCase()
                                  .includes(memberSearchQuery.toLowerCase()),
                            )
                            .map((e) => (
                              <label
                                key={e.id}
                                className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#F2F2F2] cursor-pointer transition-colors group"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.employee.includes(String(e.id))}
                                  onChange={() =>
                                    handleMemberToggle(String(e.id))
                                  }
                                  className="w-5 h-5 rounded border-gray-300 text-[#000000] focus:ring-0 cursor-pointer"
                                />
                                {(() => {
                                  const profileUrl = e.profile_picture ? getGlobalProfileUrl(e.id, e.profile_picture) : null;
                                  return (
                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden border">
                                      {profileUrl ? (
                                        <img src={profileUrl} alt={e.full_name} className="w-full h-full object-cover" />
                                      ) : (
                                        (e.full_name || "U")[0].toUpperCase()
                                      )}
                                    </div>
                                  );
                                })()}
                                <span className="text-[14px] text-[#8B8B8B] group-hover:text-[#353535]">
                                  {e.full_name}
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-6 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-12 py-2 rounded-md bg-[#F2F2F2] text-[#616161] text-[14px] font-medium transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-12 py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[14px] font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full max-h-[90vh] flex flex-col p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden my-auto">
            <div className="relative mb-10 flex items-center justify-center min-h-[40px] w-full">
              <div className="group absolute left-0 z-10 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer"
                >
                  <img src={CloseIcon} alt="Close" className="w-5 h-5 object-contain" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-[24px] font-semibold text-[#000000]">
                Edit Team Details
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className="block text-[14px] font-medium text-[#353535] mb-3">
                    Team Name <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Team Name"
                    className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-md text-[14px] text-[#8B8B8B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                    value={editForm.team_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, team_name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-[#000000] mb-3">
                    Select Project <span className="text-[#DD4342]">*</span>
                  </label>
                  <div className="relative" ref={editProjectDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        const el = editProjectDropdownRef.current;
                        if (el) {
                          const rect = el.getBoundingClientRect();
                          setEditProjectDropdownUpward(window.innerHeight - rect.bottom < 220);
                        }
                        setShowEditProjectDropdown(!showEditProjectDropdown);
                      }}
                      className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] flex items-center justify-between transition-all cursor-pointer font-Gantari"
                    >
                      <span>
                        {editForm.project_id
                          ? projects.find((p) => String(p.id) === editForm.project_id)?.project_name || "Select Project"
                          : "Select Project"}
                      </span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 4.5L6 7.5L9 4.5"
                          stroke="#8B8B8B"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {showEditProjectDropdown && (
                      <div
                        className={`absolute left-0 w-full bg-[#FFFFFF] rounded-[10px] shadow-lg border border-[#AEACAC52] py-2 z-[110] animate-in fade-in zoom-in duration-200 max-h-60 overflow-y-auto no-scrollbar flex flex-col ${editProjectDropdownUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"
                          }`}
                      >
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setEditForm((f) => ({ ...f, project_id: String(p.id), leader: "", employee: [] }));
                              setShowEditProjectDropdown(false);
                            }}
                            className="w-full px-5 py-2.5 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors cursor-pointer"
                          >
                            {p.project_name ?? `Project ${p.id}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#353535] mb-3">
                    Select Team Leader <span className="text-[#DD4342]">*</span>
                  </label>
                  <div className="relative" ref={leaderDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Select Team Leader"
                        value={
                          showLeaderDropdown
                            ? leaderSearchQuery
                            : editForm.leader
                              ? (employees.find(
                                (emp) => String(emp.id) === editForm.leader,
                              )?.full_name ?? "")
                              : ""
                        }
                        onChange={(e) => {
                          setLeaderSearchQuery(e.target.value);
                          if (e.target.value === "")
                            setEditForm((f) => ({ ...f, leader: "" }));
                          setShowLeaderDropdown(true);
                        }}
                        onFocus={() => {
                          const el = leaderDropdownRef.current;
                          if (el) {
                            const rect = el.getBoundingClientRect();
                            setLeaderDropdownUpward(
                              window.innerHeight - rect.bottom < 220,
                            );
                          }
                          setShowLeaderDropdown(true);
                          setLeaderSearchQuery(
                            editForm.leader
                              ? (employees.find(
                                (emp) => String(emp.id) === editForm.leader,
                              )?.full_name ?? "")
                              : "",
                          );
                        }}
                        className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all font-Gantari"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={`transition-transform duration-200`}
                        >
                          <path
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="#8B8B8B"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    {showLeaderDropdown && (
                      <div
                        className={`absolute left-0 w-full bg-[#FFFFFF] rounded-[10px] shadow-lg border border-[#AEACAC52] py-2 z-[110] animate-in fade-in zoom-in duration-200 max-h-60 flex flex-col ${leaderDropdownUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"}`}
                      >
                        <div className="overflow-y-auto no-scrollbar max-h-44">
                          {getProjectEmployees(editForm.project_id)
                            .filter(
                              (e) =>
                                !leaderSearchQuery.trim() ||
                                e.full_name
                                  ?.toLowerCase()
                                  .includes(leaderSearchQuery.toLowerCase()),
                            )
                            .map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                onMouseDown={(ev) => {
                                  ev.preventDefault();
                                  setEditForm({
                                    ...editForm,
                                    leader: String(e.id),
                                  });
                                  setLeaderSearchQuery("");
                                  setShowLeaderDropdown(false);
                                }}
                                className="w-full px-5 py-2.5 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors cursor-pointer"
                              >
                                {e.full_name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#353535] mb-3">
                    Select Member <span className="text-[#DD4342]">*</span>
                  </label>
                  <div className="relative" ref={memberDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Select Member"
                        value={
                          showMemberDropdown
                            ? memberSearchQuery
                            : editForm.employee.length === 0
                              ? ""
                              : `${editForm.employee.length} Member(s) Selected`
                        }
                        onChange={(e) => {
                          setMemberSearchQuery(e.target.value);
                          setShowMemberDropdown(true);
                        }}
                        onFocus={() => {
                          const el = memberDropdownRef.current;
                          if (el) {
                            const rect = el.getBoundingClientRect();
                            setMemberDropdownUpward(
                              window.innerHeight - rect.bottom < 220,
                            );
                          }
                          setShowMemberDropdown(true);
                          setMemberSearchQuery("");
                        }}
                        className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all font-Gantari"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={`transition-transform duration-200`}
                        >
                          <path
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="#8B8B8B"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    {showMemberDropdown && (
                      <div
                        className={`absolute left-0 w-full bg-[#FFFFFF] rounded-[10px] shadow-lg border border-[#AEACAC52] py-2 z-[110] animate-in fade-in zoom-in duration-200 max-h-60 flex flex-col ${memberDropdownUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"}`}
                      >
                        <div className="overflow-y-auto no-scrollbar max-h-44">
                          {getProjectEmployees(editForm.project_id)
                            .filter(
                              (e) =>
                                !memberSearchQuery.trim() ||
                                e.full_name
                                  ?.toLowerCase()
                                  .includes(memberSearchQuery.toLowerCase()),
                            )
                            .map((e) => (
                              <label
                                key={e.id}
                                className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#F2F2F2] cursor-pointer transition-colors group"
                              >
                                <input
                                  type="checkbox"
                                  checked={editForm.employee.includes(
                                    String(e.id),
                                  )}
                                  onChange={() =>
                                    handleMemberToggle(String(e.id), true)
                                  }
                                  className="w-5 h-5 rounded border-gray-300 text-[#000000] focus:ring-0 cursor-pointer"
                                />
                                {(() => {
                                  const profileUrl = e.profile_picture ? getGlobalProfileUrl(e.id, e.profile_picture) : null;
                                  return (
                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden border">
                                      {profileUrl ? (
                                        <img src={profileUrl} alt={e.full_name} className="w-full h-full object-cover" />
                                      ) : (
                                        (e.full_name || "U")[0].toUpperCase()
                                      )}
                                    </div>
                                  );
                                })()}
                                <span className="text-[14px] text-[#8B8B8B] group-hover:text-[#353535]">
                                  {e.full_name}
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-6 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-12 py-2 rounded-md bg-[#F2F2F2] text-[#616161] text-[14px] font-medium transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-12 py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[14px] font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {submitting ? "Updating..." : "Update"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white rounded-md shadow-2xl max-w-[600px] w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="p-8 pb-4 relative flex items-center justify-center min-h-[40px] w-full">
              <div className="group absolute left-8 z-20 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer"
                >
                  <img src={CloseIcon} alt="Close" className="w-5 h-5 object-contain" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-[20px] font-semibold text-slate-800 font-Gantari px-12 truncate max-w-full">
                  {selectedTeam.team_name ||
                    selectedTeam.teamname ||
                    selectedTeam.leader_name ||
                    getEmpName(selectedTeam.leader)}
                </h3>
                <p className="text-[16px] text-slate-500 mt-1">Team Details</p>
              </div>
            </div>

            <div className="p-8 pt-0 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div>
                  <h4 className="text-[18px] font-semibold text-slate-800 mb-4">
                    Project Name
                  </h4>
                </div>
                <div className="bg-[#F2F2F2] rounded-md p-6 border border-[#AEACAC52]">

                  <p className="font-semibold text-slate-800">
                    {selectedTeam.project_name || "N/A"}
                  </p>
                </div>

                <div> <h4 className="text-[18px] font-semibold text-slate-800 mb-4">
                  Team Lead
                </h4>
                </div>
                <div className="bg-[#F2F2F2] rounded-md p-6 border border-[#AEACAC52]">

                  <div className="flex items-center gap-4">
                    {(() => {
                      const leaderEmp = employees.find(e => String(e.id) === String(selectedTeam.leader));
                      const profileUrl = leaderEmp?.profile_picture ? getGlobalProfileUrl(leaderEmp.id, leaderEmp.profile_picture) : null;
                      return (
                        <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm overflow-hidden">
                          {profileUrl ? (
                            <img
                              src={profileUrl}
                              alt="Leader"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = ProfileIcon;
                              }}
                            />
                          ) : (
                            (selectedTeam.leader_name || getEmpName(selectedTeam.leader))?.[0] ?? ""
                          )}
                        </div>
                      );
                    })()}
                    <div>
                      <p className="font-semibold text-slate-800">
                        {selectedTeam.leader_name ||
                          getEmpName(selectedTeam.leader)}
                      </p>
                      <p className="text-[14px] text-slate-500">Team Leader</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[18px] font-semibold text-slate-800 mb-4 pl-1">
                    Team Members (
                    {selectedTeam.employee.split(",").filter(Boolean).length})
                  </h4>
                  <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md overflow-hidden">
                    {selectedTeam.employee
                      .split(",")
                      .filter(Boolean)
                      .map((eid, i) => {
                        const empInfo = employees.find(
                          (e) => e.id.toString() === eid,
                        );
                        return (
                          <div
                            key={eid}
                            className={`flex items-center gap-4 p-4 transition-colors ${i !== 0 ? "border-t border-slate-100" : ""}`}
                          >
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 overflow-hidden">
                              {empInfo?.profile_picture ? (
                                <img
                                  src={getGlobalProfileUrl(empInfo.id, empInfo.profile_picture)}
                                  alt={empInfo.full_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = ProfileIcon;
                                  }}
                                />
                              ) : (
                                (getEmpName(eid)?.[0] ?? "")
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800">
                                {getEmpName(eid)}
                              </p>
                              {empInfo?.email && (
                                <p className="text-[14px] text-slate-500">
                                  {empInfo.email}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* All Members Modal */}
      {showAllMembersModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100 shrink-0">
              <div className="group relative inline-flex shrink-0 absolute left-10">
                <button
                  type="button"
                  onClick={() => setShowAllMembersModal(false)}
                  className="p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors cursor-pointer"
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
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                All Members ({allMembersList.length})
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-6 custom-scrollbar">
              {allMembersList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allMembersList.map((emp) => {
                    const profileUrl = emp.profile_picture
                      ? getGlobalProfileUrl(emp.id, emp.profile_picture)
                      : null;

                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedMember(emp);
                          setShowAllMembersModal(false);
                          setShowMemberProfileModal(true);
                        }}
                      >
                        {profileUrl ? (
                          <img
                            src={profileUrl}
                            alt={emp.full_name || "Member"}
                            className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = ProfileIcon;
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full border-1 border-white shadow-sm bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-600 font-bold text-lg">
                              {(emp.full_name || `E${emp.id}`)
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                            {emp.full_name || `Employee ${emp.id}`}
                          </p>
                          {emp.user_role && (
                            <p className="text-[14px] font-Gantari font-bold text-[#999999]">
                              {emp.user_role}
                            </p>
                          )}
                          {emp.email && (
                            <p className="text-[13px] font-Gantari text-[#666666] mt-1">
                              {emp.email}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-[16px] font-Gantari">No members found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Modal */}
      {showMemberProfileModal && selectedMember && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-[3px] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-md max-w-[520px] w-full overflow-hidden px-[20px] py-[20px] relative shadow-2xl flex flex-col gap-6 font-Gantari animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-center relative shrink-0">
              <div className="absolute left-1 group inline-flex shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowMemberProfileModal(false);
                    setSelectedMember(null);
                  }}
                  className="p-2 rounded-md bg-[#F2F2F2] transition-all cursor-pointer"
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
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-3 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-[24px] font-semibold text-[#000000] font-Gantari">
                Member Profile
              </h3>
            </div>

            {/* Profile Section */}
            <div className="flex items-center gap-4 px-2">
              <div className="w-[38px] h-[38px] rounded-full overflow-hidden bg-[#F4F4F4] shrink-0 border border-slate-200 shadow-sm">
                {selectedMember.profile_picture ? (
                  <img
                    src={getGlobalProfileUrl(selectedMember.id, selectedMember.profile_picture)}
                    alt={selectedMember.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = ProfileIcon;
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-[10px]">
                      {(selectedMember.full_name || "U")[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-[18px] font-bold text-[#000000] font-Gantari leading-tight">
                  {selectedMember.full_name || "Not Available"}
                </h4>
                <p className="text-[14px] font-semibold text-[#353535] font-Gantari">
                  {selectedMember.empid || "N/A"}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="px-2 sm:px-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {[
                { label: 'Date of Birth', value: selectedMember.dob ? new Date(selectedMember.dob).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : 'N/A' },
                { label: 'Phone Number', value: selectedMember.phone_number },
                { label: 'Email ID', value: selectedMember.email },
                { label: 'User Role', value: selectedMember.user_role },
                { label: 'Address', value: selectedMember.address },
                { label: 'Department', value: selectedMember.department },
                { label: 'Joined Date', value: selectedMember.doj ? new Date(selectedMember.doj).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : 'N/A' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[130px_15px_1fr] text-[14px] items-start pb-2"
                >
                  <span className="text-[#020202] font-Gantari">{item.label}</span>
                  <span className="text-[#020202] font-Gantari text-center">:</span>
                  <span className="text-[#616161] font-Gantari break-words leading-relaxed">
                    {item.value || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-md shadow-2xl max-w-[500px] w-full p-8 flex flex-col items-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="relative flex items-center justify-center w-full mb-4">
              <div className="group relative inline-flex shrink-0 absolute left-0">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTeamToDelete(null);
                  }}
                  className="p-1.5 bg-[#F2F2F2] rounded-md transition-all cursor-pointer"
                >
                  <img src={CloseIcon} alt="Close" className="w-5 h-5 object-contain" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-[18px] font-semibold text-[#020202] font-Gantari">
                Delete Team
              </h3>
            </div>

            <div className="text-center w-full">
              <p className="text-[14px] text-[#020202] mb-10">
                Are you sure you want to delete this team?
              </p>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTeamToDelete(null);
                  }}
                  className="px-8 py-2 bg-[#F2F2F2] text-[#353535] rounded-md text-[14px] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={submitting}
                  className="px-8 py-2 bg-[#FFE4E3] text-[#E00100] rounded-md text-[14px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
