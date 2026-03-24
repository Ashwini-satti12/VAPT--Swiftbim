import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import {
  PlusIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import threeDotsIcon from "../../assets/ProjectManager/CreateTeam/three dots.svg";
import eyeIcon from "../../assets/ProjectManager/consultant/eyeIcon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import upArrow from "../../assets/TechnicalDirector/upArrow.svg";
import ProfileIcon from "../../assets/ProductNavbarIcons/Profile.svg";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";

const showEntriesOptions: {
  value: string;
  label: string;
  start: number;
  end: number | null;
}[] = [
  { value: "show", label: "Show", start: 0, end: 50 },
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
}

function TeamCard({
  team,
  employees,
  onEdit,
  onDelete,
  onViewDetails,
  onShowAllMembers,
  onShowMemberProfile,
}: {
  team: Team;
  employees: Employee[];
  onEdit: (team: Team) => void;
  onDelete: (id: number) => void;
  onViewDetails: (team: Team) => void;
  onShowAllMembers: (members: Employee[]) => void;
  onShowMemberProfile: (member: Employee) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const memberIds = team.employee
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
    <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] w-full flex flex-col transition-all hover:shadow-md group relative font-Gantari">
      {/* Team Name */}
      <div className="flex flex-col mb-4 pt-1">
        <span className="text-[15px] font-medium text-[#999999] mb-1.5">
          Team Name
        </span>
        <span className="text-[18px] font-bold text-[#353535] pr-8 truncate">
          {team.team_name || team.teamname || "Untitled Team"}
        </span>
      </div>

      <div className="absolute top-6 right-6" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
        >
          <img
            src={threeDotsIcon}
            alt="Options"
            className="w-[18px] h-auto object-contain"
          />
        </button>

        {showMenu && (
          <div className="absolute right-[-70px] mt-3 w-[158px] bg-white/20 backdrop-blur rounded-[15px] border border-[#59595980] py-2.5 z-[110] animate-in fade-in zoom-in duration-200 origin-top-right">
            <button
              onClick={() => {
                onViewDetails(team);
                setShowMenu(false);
              }}
              className="w-full px-5 py-2 flex items-center gap-3 transition-colors text-left group/item"
            >
              <img
                src={eyeIcon}
                alt="View"
                className="w-5 h-5 [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:brightness(0)_saturate(100%)_invert(24%)_sepia(94%)_saturate(1500%)_hue-rotate(338deg)_brightness(100%)]"
              />
              <span className="text-[16px] font-medium text-[#616161] group-hover/item:text-[#DD4342]">
                View
              </span>
            </button>
            <button
              onClick={() => {
                onEdit(team);
                setShowMenu(false);
              }}
              className="w-full px-5 py-2 flex items-center gap-3 transition-colors text-left group/item"
            >
              <PencilSquareIcon className="w-5 h-5 text-[#616161] group-hover/item:text-[#DD4342]" />
              <span className="text-[16px] font-medium text-[#616161] group-hover/item:text-[#DD4342]">
                Edit
              </span>
            </button>
            <button
              onClick={() => {
                onDelete(team.team_id);
                setShowMenu(false);
              }}
              className="w-full px-5 py-2 flex items-center gap-3 transition-colors text-left group/item"
            >
              <TrashIcon className="w-5 h-5 text-[#616161] group-hover/item:text-[#DD4342]" />
              <span className="text-[16px] font-medium text-[#616161] group-hover/item:text-[#DD4342]">
                Delete
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Team Leader */}
      <div className="flex flex-col mb-5">
        <span className="text-[15px] font-medium text-[#999999] mb-1.5">
          Team Leader
        </span>
        <span className="text-[18px] font-bold text-[#353535] truncate">
          {team.leader_name || getEmpName(team.leader)}
        </span>
      </div>

      <div className="h-[1px] w-full bg-[#E5E7EB] mb-5"></div>

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
          className="flex items-center gap-1.5 text-sm font-semibold text-[#8B8B8B] transition-colors pr-2"
        >
          Details
          <img src={upArrow} alt="Up" className="w-5 h-5 object-contain" />
        </button>
      </div>
    </div>
  );
}

export default function CreateteamTD() {
  const [searchParams] = useSearchParams();
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const leaderDropdownRef = useRef<HTMLDivElement>(null);

  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const [selectedShowEntries, setSelectedShowEntries] = useState("show");
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);

  // Profile modal state
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Employee | null>(null);

  // All members modal state
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [allMembersList, setAllMembersList] = useState<Employee[]>([]);

  const selectedRange =
    showEntriesOptions.find((opt) => opt.value === selectedShowEntries) ||
    showEntriesOptions[0];

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
        setTeams(teamsRes.data.teams ?? []);
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
            .then((res) => setTeams(res.data.teams ?? []));
          setForm({
            leader: "",
            employee: [],
            project_lead: "",
            project_id: "",
            team_name: "",
          });
        }
      })
      .catch(() => {})
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
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    api
      .delete(`/api/teams/${teamId}`)
      .then(({ data }) => {
        if (data.success) {
          setTeams(teams.filter((t) => t.team_id !== teamId));
        }
      })
      .catch(console.error);
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
        project_id: editForm.project_id ? Number(editForm.project_id) : undefined,
      })
      .then(({ data }) => {
        if (data.success) {
          setShowEditModal(false);
          api
            .get<{ teams?: Team[] }>("/api/teams")
            .then((res) => setTeams(res.data.teams ?? []));
        }
      })
      .catch(() => {})
      .finally(() => setSubmitting(false));
  };

  const getEmpName = (id: number | string) => {
    const e = employees.find((emp) => emp.id == id);
    return e ? e.full_name : "Unknown";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DD4342]" />
      </div>
    );
  }

  const searchQuery = searchParams.get('q')?.toLowerCase() || "";
  
  const filteredTeams = teams.filter(t => {
      if (!searchQuery) return true;
      const tName = (t.team_name || t.teamname || "").toLowerCase();
      const pName = (t.project_name || "").toLowerCase();
      const lName = (t.leader_name || getEmpName(t.leader) || "").toLowerCase();
      return tName.includes(searchQuery) ||
             pName.includes(searchQuery) ||
             lName.includes(searchQuery);
  });

  const displayTeams =
    selectedRange.end === null
      ? filteredTeams
      : filteredTeams.slice(selectedRange.start, selectedRange.end);

  return (
    <div className="h-full flex flex-col p-2">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[24px] font-semibold text-[#000000] font-Gantari">
          Team
        </h2>
        <div className="flex items-center gap-3">
          {/* Show entries dropdown */}
          <div className="relative" ref={showEntriesDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEntriesOpen((o) => !o);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md hover:bg-[#DDDDDD] transition-all cursor-pointer border-0"
            >
              {selectedShowEntries === "show" ? (
                <span className="text-sm font-medium text-[#616161] font-gantari">
                  Show
                </span>
              ) : (
                <>
                  <span className="text-sm font-medium text-[#353535] font-gantari">
                    Show:
                  </span>
                  <span className="text-sm font-medium text-[#353535] font-gantari">
                    {selectedRange.label}
                  </span>
                </>
              )}
              <img
                src={ArrowDown}
                alt="arrow"
                className="w-3.5 h-3.5 object-contain transition-transform"
                style={{
                  transform: showEntriesOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </button>
            {showEntriesOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1 max-h-[160px] overflow-y-auto no-scrollbar">
                {showEntriesOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShowEntries(opt.value);
                      setShowEntriesOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium font-gantari transition-colors ${selectedShowEntries === opt.value ? "text-[#353535] bg-gray-100" : "text-[#616161] hover:text-[#353535] hover:bg-gray-50"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setShowLeaderDropdown(false);
              setShowMemberDropdown(false);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md transition-all font-semibold shadow-lg shadow-red-200 active:scale-95"
          >
            <PlusIcon className="w-5 h-5 stroke-[3]" />
            New Team
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
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
                  Click "New Team" to get started.
                </p>
              </div>
            </div>
          ) : (
            displayTeams.map((team) => (
              <TeamCard
                key={team.team_id}
                team={team}
                employees={employees}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full p-6 animate-in zoom-in-95 duration-200 relative overflow-visible my-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-8 left-8 p-2 bg-[#F2F2F2] rounded-lg text-[#1E293B]  transition-colors"
            >
              <XMarkIcon className="w-6 h-6 stroke-[2.5]" />
            </button>

            <div className="text-center mb-10">
              <h3 className="text-[26px] font-medium text-[#000000]">
                Create New Team
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[16px] font-medium text-[#000000] mb-3">
                  Team Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Team Name"
                  className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-lg text-[14px] text-[#1E293B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                  value={form.team_name}
                  onChange={(e) =>
                    setForm({ ...form, team_name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-[16px] font-medium text-[#000000] mb-3">
                  Select Project
                </label>
                <select
                  value={form.project_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, project_id: e.target.value }))
                  }
                  required
                  className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-lg text-[14px] text-[#1E293B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                >
                  <option value="" disabled>
                    Select Project
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name ?? `Project ${p.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[16px] font-medium text-[#000000] mb-3">
                  Select Team Leader
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
                      className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[10px] text-[14px] text-[#1E293B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-transform duration-200 ${showLeaderDropdown ? "rotate-180" : ""}`}
                      >
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
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
                        {employees
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
                              className="w-full px-5 py-2.5 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors"
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
                <label className="block text-[16px] font-medium text-[#000000] mb-3">
                  Select Member
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
                      className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-lg text-[14px] text-[#1E293B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-transform duration-200 ${showMemberDropdown ? "rotate-180" : ""}`}
                      >
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
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
                        {employees
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
                  className="px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] text-[16px] font-medium transition-all active:scale-[0.98]"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#000000] text-[16px] font-medium transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full p-6 animate-in zoom-in-95 duration-200 relative overflow-visible my-auto">
            {/* Close button in top left as per image */}
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-8 left-8 p-2 bg-[#F2F2F2] rounded-lg text-[#1E293B] transition-colors"
            >
              <XMarkIcon className="w-6 h-6 stroke-[2.5]" />
            </button>

            <div className="text-center mb-10">
              <h3 className="text-[26px] font-medium text-[#000000]">
                Edit Team Details
              </h3>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-[16px] font-medium text-[#000000] mb-3">
                  Team Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Team Name"
                  className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-lg text-[14px] text-[#1E293B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                  value={editForm.team_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, team_name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-[16px] font-medium text-[#000000] mb-3">
                  Select Project
                </label>
                <select
                  value={editForm.project_id}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, project_id: e.target.value }))
                  }
                  required
                  className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-lg text-[14px] text-[#1E293B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                >
                  <option value="" disabled>
                    Select Project
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name ?? `Project ${p.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[16px] font-medium text-[#000000] mb-3">
                  Select Team Leader
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
                      className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-lg text-[14px] text-[#1E293B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-transform duration-200 ${showLeaderDropdown ? "rotate-180" : ""}`}
                      >
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
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
                        {employees
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
                              className="w-full px-5 py-2.5 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors"
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
                <label className="block text-[16px] font-medium text-[#000000] mb-3">
                  Select Member
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
                      className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-lg text-[14px] text-[#1E293B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-transform duration-200 ${showMemberDropdown ? "rotate-180" : ""}`}
                      >
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
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
                        {employees
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
                  className="px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] text-[16px] font-medium transition-all active:scale-[0.98]"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#000000] text-[16px] font-medium transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-[600px] w-full p-8 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-6 right-6 p-2 bg-slate-50 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <XMarkIcon className="w-6 h-6 stroke-2" />
            </button>

            <div className="mb-8 pr-12">
              <h3 className="text-2xl font-bold text-slate-800 font-sora">
                {selectedTeam.team_name ||
                  selectedTeam.teamname ||
                  selectedTeam.leader_name ||
                  getEmpName(selectedTeam.leader)}
              </h3>
              <p className="text-slate-500 mt-1">Team Details</p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Project
                </h4>
                <p className="font-semibold text-slate-800">
                  {selectedTeam.project_name || "N/A"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Leadership
                </h4>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm">
                    {
                      (
                        selectedTeam.leader_name ||
                        getEmpName(selectedTeam.leader)
                      )?.[0] ?? ""
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {selectedTeam.leader_name ||
                        getEmpName(selectedTeam.leader)}
                    </p>
                    <p className="text-sm text-slate-500">Team Leader</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 pl-1">
                  Team Members (
                  {selectedTeam.employee.split(",").filter(Boolean).length})
                </h4>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar">
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
                          className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${i !== 0 ? "border-t border-slate-100" : ""}`}
                        >
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                            {getEmpName(eid)?.[0] ?? ""}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {getEmpName(eid)}
                            </p>
                            {empInfo?.email && (
                              <p className="text-sm text-slate-500">
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
      )}
      {/* All Members Modal */}
      {showAllMembersModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setShowAllMembersModal(false)}
                className="absolute left-10 p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen overflow-y-auto p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col my-auto animate-in zoom-in-95 duration-200 shrink-0">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowMemberProfileModal(false);
                  setSelectedMember(null);
                }}
                className="absolute left-10 p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
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
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                Member Profile
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-10 py-8 custom-scrollbar">
              <div className="flex flex-col items-center">
                {selectedMember.profile_picture ? (
                  <img
                    src={getGlobalProfileUrl(
                      selectedMember.id,
                      selectedMember.profile_picture,
                    )}
                    alt={selectedMember.full_name || "Member"}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover mb-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = ProfileIcon;
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center mb-6">
                    <span className="text-slate-600 font-bold text-3xl">
                      {(selectedMember.full_name || `E${selectedMember.id}`)
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="w-full space-y-4">
                  <div>
                    <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                      Full Name
                    </p>
                    <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">
                      {selectedMember.full_name || "Not Available"}
                    </p>
                  </div>

                  {selectedMember.empid && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Employee ID
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.empid}
                      </p>
                    </div>
                  )}

                  {selectedMember.dob && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Date of Birth
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {new Date(selectedMember.dob).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "2-digit", year: "numeric" },
                        )}
                      </p>
                    </div>
                  )}

                  {selectedMember.phone_number && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Phone Number
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.phone_number}
                      </p>
                    </div>
                  )}

                  {selectedMember.email && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Email
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.email}
                      </p>
                    </div>
                  )}

                  {selectedMember.user_role && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Role
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.user_role}
                      </p>
                    </div>
                  )}

                  {selectedMember.address && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Address
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.address}
                      </p>
                    </div>
                  )}

                  {selectedMember.department && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Department
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.department}
                      </p>
                    </div>
                  )}

                  {selectedMember.doj && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">
                        Date of Joining
                      </p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {new Date(selectedMember.doj).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "2-digit", year: "numeric" },
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
