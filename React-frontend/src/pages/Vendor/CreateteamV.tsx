import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { getGlobalProfileUrl } from '../../lib/profileHelpers';
import { PlusIcon } from '@heroicons/react/24/outline';
import threeDotsIcon from '../../assets/ProjectManager/CreateTeam/three dots.svg';
import editIcon from '../../assets/ProjectManager/project/editIcon.svg';
import deleteIcon from '../../assets/ProjectManager/project/deleteIcon.svg';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';
import upArrow from '../../assets/TechnicalDirector/upArrow.svg';
import ProfileIcon from '../../assets/ProductNavbarIcons/Profile.svg';
import CloseIcon from '../../assets/ProductNavbarIcons/close button.svg';
import viewIcon from '../../assets/ProjectManager/project/viewIcon.svg';

const SCROLLBAR_STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
    height: 4px;
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
    full_name: string;
    email: string;
    profile_picture?: string;
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
    project_manager_id?: string | number;
    lead_id?: string | number;
    bim_coordinator_id?: string | number;
    members?: string;
}



function TeamCard({
    team,
    getEmp,
    onEdit,
    onDelete,
    onViewDetails,
}: {
    team: Team;
    getEmp: (id: number | string) => Employee | undefined;
    onEdit: (team: Team) => void;
    onDelete: (team: Team) => void;
    onViewDetails: (team: Team) => void;
}) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const memberIds = (team.employee ?? "")
        .split(",")
        .filter(Boolean)
        .map((id) => id.trim());

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

            <div className="absolute top-6 right-6" ref={menuRef}>
                <button
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
                            onClick={() => {
                                onViewDetails(team);
                                setShowMenu(false);
                            }}
                            className="w-full px-6 py-3 flex items-center gap-4 transition-colors text-left group/item cursor-pointer"
                        >
                            <img
                                src={viewIcon}
                                alt="View"
                                className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                            />
                            <span className="text-[14px] font-medium text-[#8B8B8B] group-hover/item:text-[#DD4342]">
                                View
                            </span>
                        </button>
                        <button
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
                            onClick={() => {
                                onDelete(team);
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


            {/* Team Leader */}
            <div className="flex flex-col mb-4">
                <span className="text-[14px] font-medium text-[#8B8B8B] mb-1.5">
                    Team Leader
                </span>
                <span className="text-[16px] sm:text-[18px] font-semibold text-[#353535] truncate flex items-center gap-2">
                    {team.leader_name || getEmp(team.leader)?.full_name || 'N/A'}
                </span>
            </div>

            <div className="h-[1px] w-full bg-[#E5E7EB] mb-4"></div>

            {/* Members & Details */}
            <div className="mt-auto flex items-center justify-between">
                <div className="flex -space-x-3">
                    {(() => {
                        const visibleMembers = memberIds.slice(0, 3);
                        const remainingCount = Math.max(0, memberIds.length - 3);

                        return (
                            <>
                                {visibleMembers.map((eid) => {
                                    const emp = getEmp(eid);
                                    const name = emp?.full_name || 'N/A';
                                    const profileUrl = emp?.profile_picture
                                        ? getGlobalProfileUrl(emp.id, emp.profile_picture, "vendor")
                                        : null;

                                    return (
                                        <div
                                            key={eid}
                                            className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all font-Gantari"
                                            title={name}
                                        >
                                            {profileUrl ? (
                                                <img
                                                    src={profileUrl}
                                                    alt={name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = ProfileIcon;
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[10px] font-bold text-slate-600">
                                                    {(name || "U").charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {remainingCount > 0 && (
                                    <div
                                        className="w-9 h-9 rounded-full border-1 border-dashed bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors font-Gantari"
                                    >
                                        +{remainingCount}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
                <button
                    onClick={() => onViewDetails(team)}
                    className="flex items-center gap-2 text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] transition-colors pr-2 cursor-pointer group/details font-Gantari"
                >
                    Details
                    <img src={upArrow} alt="Up" className="w-5 h-5 object-contain transition-all duration-200 group-hover/details:brightness-0 group-hover/details:invert-[20%]" />
                </button>
            </div>
        </div>
    );
}

export default function CreateteamV() {
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get("q")?.toLowerCase() || "";
    const [showEntriesDropdown, setShowEntriesDropdown] = useState(false);
    const [showEntries, setShowEntries] = useState("");
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);

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

    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [teamPendingDelete, setTeamPendingDelete] = useState<Team | null>(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const memberDropdownRef = useRef<HTMLDivElement>(null);
    const leaderDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedProjectFilter, setSelectedProjectFilter] = useState<{ id: string | number; name: string } | null>(null);
    const [showProjectFilterDropdown, setShowProjectFilterDropdown] = useState(false);
    const projectFilterDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
                setShowMemberDropdown(false);
            }
            if (leaderDropdownRef.current && !leaderDropdownRef.current.contains(event.target as Node)) {
                setShowLeaderDropdown(false);
            }
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
                setShowProjectDropdown(false);
            }
            if (showEntriesDropdownRef.current && !showEntriesDropdownRef.current.contains(event.target as Node)) {
                setShowEntriesDropdown(false);
            }
            if (projectFilterDropdownRef.current && !projectFilterDropdownRef.current.contains(event.target as Node)) {
                setShowProjectFilterDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [form, setForm] = useState({
        leader: '',
        employee: [] as string[],
        project_lead: '',
        project_id: '',
        team_name: '',
    });

    const [editForm, setEditForm] = useState({
        leader: '',
        employee: [] as string[],
        project_lead: '',
        project_id: '',
        team_name: '',
    });

    useEffect(() => {
        Promise.all([
            api.get<{ teams?: Team[] }>('/api/vendors/vendor-teams'),
            api.get<{ success?: boolean; resources?: Employee[] }>('/api/vendors/vendor-resource-profiles'),
            api.get<{ projects?: Project[] }>('/api/vendors/vendor-projects'),
        ])
            .then(([teamsRes, resourcesRes, projectsRes]) => {
                setTeams(teamsRes.data.teams ?? []);
                setEmployees(resourcesRes.data.resources ?? []);
                setProjects(projectsRes.data.projects ?? []);
            })
            .catch(() => {
                setTeams([]);
                setEmployees([]);
                setProjects([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const getProjectEmployees = (projectId: string | number) => {
        if (!projectId) return employees.map(e => ({ ...e, isProjectMember: false }));
        const proj = projects.find((p) => String(p.id) === String(projectId));
        if (!proj) return employees.map(e => ({ ...e, isProjectMember: false }));

        const involvedIds = new Set<string>();
        if (proj.project_manager_id) involvedIds.add(String(proj.project_manager_id));
        if (proj.lead_id) involvedIds.add(String(proj.lead_id));
        if (proj.bim_coordinator_id) involvedIds.add(String(proj.bim_coordinator_id));

        if (proj.members) {
            proj.members.split(',').forEach(id => {
                const trimmed = id.trim();
                if (trimmed) involvedIds.add(trimmed);
            });
        }

        const projectMembers = employees.filter(e => involvedIds.has(String(e.id))).map(e => ({ ...e, isProjectMember: true }));
        const otherMembers = employees.filter(e => !involvedIds.has(String(e.id))).map(e => ({ ...e, isProjectMember: false }));

        return [...projectMembers, ...otherMembers];
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.leader) return;
        setSubmitting(true);

        const selectedProject = projects.find(
            (p) => String(p.id) === String(form.project_id),
        );
        api.post('/api/vendors/vendor-teams', {
            team_name: form.team_name,
            leader: form.leader,
            employee: form.employee.join(','),
            project_lead: form.project_lead || undefined,
            project_id: form.project_id ? Number(form.project_id) : undefined,
            project_name: selectedProject?.project_name ?? '',
        })
            .then(({ data }) => {
                if (data.success) {
                    toast.success('Team created successfully');
                    setShowAddModal(false);
                    api.get<{ teams?: Team[] }>('/api/vendors/vendor-teams').then(res => setTeams(res.data.teams ?? []));
                    setForm({ leader: '', employee: [], project_lead: '', project_id: '', team_name: '' });
                }
            })
            .catch(() => { })
            .finally(() => setSubmitting(false));
    };

    const handleMemberToggle = (id: string, isEdit: boolean = false) => {
        if (isEdit) {
            setEditForm(prev => {
                const exists = prev.employee.includes(id);
                if (exists) {
                    return { ...prev, employee: prev.employee.filter(e => e !== id) };
                } else {
                    return { ...prev, employee: [...prev.employee, id] };
                }
            });
        } else {
            setForm(prev => {
                const exists = prev.employee.includes(id);
                if (exists) {
                    return { ...prev, employee: prev.employee.filter(e => e !== id) };
                } else {
                    return { ...prev, employee: [...prev.employee, id] };
                }
            });
        }
    };

    const handleEditClick = (team: Team) => {
        const pid = team.project_id as number | string | undefined;
        const inferredProjectId =
            pid != null && pid !== ''
                ? String(pid)
                : team.project_name
                    ? String(
                        projects.find((p) => p.project_name === team.project_name)
                            ?.id ?? '',
                    )
                    : '';
        setSelectedTeam(team);
        setEditForm({
            leader: String(team.leader),
            employee: team.employee.split(',').filter(Boolean),
            project_lead: team.project_lead ? String(team.project_lead) : '',
            project_id: inferredProjectId,
            team_name: team.team_name || team.teamname || '',
        });
        setShowEditModal(true);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeam || !editForm.leader) return;
        setSubmitting(true);

        const selectedProject = projects.find(
            (p) => String(p.id) === String(editForm.project_id),
        );
        api.patch(`/api/vendors/vendor-teams/${selectedTeam.team_id}`, {
            team_name: editForm.team_name,
            leader: editForm.leader,
            employee: editForm.employee.join(','),
            project_lead: editForm.project_lead
                ? Number(editForm.project_lead)
                : undefined,
            project_id: editForm.project_id ? Number(editForm.project_id) : undefined,
            project_name: selectedProject?.project_name ?? '',
        })
            .then(({ data }) => {
                if (data.success) {
                    toast.success('Team updated successfully');
                    setShowEditModal(false);
                    api.get<{ teams?: Team[] }>('/api/vendors/vendor-teams').then(res => setTeams(res.data.teams ?? []));
                }
            })
            .catch(() => { })
            .finally(() => setSubmitting(false));
    };

    const getEmp = (id: number | string): Employee | undefined => {
        return employees.find(e => e.id === Number(id));
    };

    const getTeamDisplayName = (team: Team) =>
        team.team_name ||
        team.teamname ||
        team.leader_name ||
        getEmp(team.leader)?.full_name ||
        'Unnamed Team';

    const handleDeleteRequest = (team: Team) => {
        setTeamPendingDelete(team);
    };

    const handleConfirmDelete = () => {
        if (!teamPendingDelete) return;
        const id = teamPendingDelete.team_id;
        setDeleteSubmitting(true);
        api.delete(`/api/vendors/vendor-teams/${id}`)
            .then(() => {
                toast.success('Team deleted successfully');
                setTeams((prev) => prev.filter((t) => t.team_id !== id));
                setTeamPendingDelete(null);
            })
            .catch(() => { })
            .finally(() => setDeleteSubmitting(false));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    const displayTeams = teams
        .filter((t) => {
            if (selectedProjectFilter) {
                const pid = t.project_id || (t.project_name ? projects.find(p => p.project_name === t.project_name)?.id : null);
                if (String(pid) !== String(selectedProjectFilter.id)) return false;
            }
            if (!searchQuery) return true;
            const name = (t.team_name || t.teamname || "").toLowerCase();
            const project = (t.project_name || "").toLowerCase();
            const leaderObj = getEmp(t.leader);
            const leaderName = (leaderObj?.full_name || "").toLowerCase();
            return name.includes(searchQuery.toLowerCase()) || project.includes(searchQuery.toLowerCase()) || leaderName.includes(searchQuery.toLowerCase());
        })
        .slice(
            showEntriesOptions.find((o) => o.value === showEntries)?.start || 0,
            showEntriesOptions.find((o) => o.value === showEntries)?.end || teams.length
        );

    return (
        <div className="h-full flex flex-col p-2 font-Gantari">
            <style>{SCROLLBAR_STYLE}</style>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-[24px] font-semibold text-[#000000]">
                    Team Workspace
                </h2>
                <div className="flex items-center gap-3">
                    {/* Project Filter */}
                    <div className="relative min-w-[140px] max-w-[220px] sm:w-[200px]" ref={projectFilterDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setShowProjectFilterDropdown(!showProjectFilterDropdown)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-Gantari transition-all cursor-pointer border-0"
                        >
                            <span className={`truncate text-left flex-1 ${!selectedProjectFilter ? "text-[#8B8B8B]" : "text-[#353535]"}`}>
                                {!selectedProjectFilter ? (
                                    "Select Project"
                                ) : (
                                    <>
                                        <span className="font-normal">Project:</span>{" "}
                                        <span className="font-semibold">{selectedProjectFilter.name}</span>
                                    </>
                                )}
                            </span>
                            <img
                                src={ArrowDown}
                                alt=""
                                className={`w-3 h-3 shrink-0 transition-transform duration-200 ${showProjectFilterDropdown ? "rotate-180" : ""} ${!selectedProjectFilter ? "opacity-60 grayscale" : "opacity-90"}`}
                            />
                        </button>

                        {showProjectFilterDropdown && (
                            <div className="absolute top-full right-0 mt-1 w-full bg-white border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedProjectFilter(null);
                                            setShowProjectFilterDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors font-Gantari"
                                    >
                                        All Projects
                                    </button>
                                    {projects.map((proj) => {
                                        const isChosen = selectedProjectFilter?.id === proj.id;
                                        return (
                                            <button
                                                key={proj.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProjectFilter({ id: proj.id, name: proj.project_name || "Untitled" });
                                                    setShowProjectFilterDropdown(false);
                                                }}
                                                className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-Gantari transition-colors cursor-pointer ${isChosen
                                                    ? "text-[#353535] bg-[#F2F2F2] font-semibold"
                                                    : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"
                                                    }`}
                                            >
                                                <span className="truncate flex-1">{proj.project_name || "Untitled"}</span>
                                                {isChosen && (
                                                    <svg
                                                        className="w-4 h-4 shrink-0 text-[#353535]"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
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
                    <div className="relative min-w-[140px] max-w-[200px] w-[150px]" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowEntriesDropdown(!showEntriesDropdown);
                            }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-Gantari transition-all cursor-pointer border-0 min-w-0"
                        >
                            <span className={`min-w-0 flex-1 truncate overflow-hidden text-left ${!showEntries ? "text-[#8B8B8B]" : "text-[#353535]"}`}>
                                {!showEntries ? (
                                    SHOW_ENTRIES_PLACEHOLDER
                                ) : (
                                    <>
                                        <span className="text-[14px]">{SHOW_ENTRIES_SELECTED_PREFIX}</span>{" "}
                                        <span className="font-semibold">{showEntriesOptions.find((o) => o.value === showEntries)?.label}</span>
                                    </>
                                )}
                            </span>
                            <img
                                src={ArrowDown}
                                alt=""
                                className={`w-3 h-3 shrink-0 transition-transform duration-200 ${showEntriesDropdown ? "rotate-180" : ""} ${!showEntries ? "opacity-60 grayscale" : "opacity-90"}`}
                            />
                        </button>

                        {showEntriesDropdown && (
                            <div className="absolute top-full right-0 left-auto mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                                <div className="max-h-[168px] overflow-y-auto custom-scrollbar">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEntries("");
                                            setShowEntriesDropdown(false);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-[#8B8B8B] hover:bg-slate-50 transition-colors"
                                    >
                                        {SHOW_ENTRIES_PLACEHOLDER}
                                    </button>
                                    {showEntriesOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setShowEntries(option.value);
                                                setShowEntriesDropdown(false);
                                            }}
                                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 flex items-center justify-between ${showEntries === option.value ? "text-[#DD4342] font-semibold bg-[#DD4342]/5" : "text-[#353535]"}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            setShowMemberDropdown(false);
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-[#F2F2F2] rounded-md transition-all font-medium text-[14px] shadow-sm cursor-pointer"
                    >

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
                                getEmp={getEmp}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteRequest}
                                onViewDetails={(t) => {
                                    setSelectedTeam(t);
                                    setShowDetailsModal(true);
                                }}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Delete team confirmation */}
            {teamPendingDelete && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-md shadow-2xl max-w-[500px] w-full p-8 flex flex-col items-center animate-in zoom-in-95 duration-200 relative overflow-hidden font-Gantari">
                        <div className="relative flex items-center justify-center w-full mb-6 min-h-[40px]">
                            <div className="absolute left-0 z-10 top-1/2 -translate-y-1/2">
                                <div className="group relative inline-flex shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => !deleteSubmitting && setTeamPendingDelete(null)}
                                        className="p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer"
                                        aria-label="Close"
                                    >
                                        <img src={CloseIcon} alt="Close" className="w-5 h-5 object-contain" />
                                    </button>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                        <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                                            <span className="font-gantari text-[14px] font-semibold text-[#353535] whitespace-nowrap">Close</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-[20px] font-Gantari font-semibold text-[#020202] text-center">
                                Delete Team
                            </h3>
                        </div>

                        <div className="text-center w-full mb-10">
                            <p className="text-[14px] text-[#020202]">
                                Are you sure, you want to delete{"  "}
                                <span className="font-bold text-[#E00100]">{getTeamDisplayName(teamPendingDelete)}</span>?
                            </p>
                        </div>

                        <div className="flex justify-center gap-4 w-full">
                            <button
                                type="button"
                                disabled={deleteSubmitting}
                                onClick={() => setTeamPendingDelete(null)}
                                className="px-8 py-2 bg-[#F2F2F2] text-[#353535] rounded-md text-[14px] font-medium transition-colors cursor-pointer"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                disabled={deleteSubmitting}
                                onClick={handleConfirmDelete}
                                className="px-8 py-2 bg-[#FFE4E3] text-[#E00100] rounded-md text-[14px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {deleteSubmitting ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-2 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full max-h-[90vh] flex flex-col p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden my-auto font-Gantari">
                        <div className="relative mb-10 flex items-center justify-center min-h-[40px] w-full">
                            <div className="group absolute left-0 z-10 top-1/2 -translate-y-1/2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer"
                                >
                                    <img src={CloseIcon} alt="Close" className="w-5 h-5 object-contain" />
                                </button>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                    <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                    <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                                        <span className="font-gantari text-[14px] font-semibold text-[#353535] whitespace-nowrap">Close</span>
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
                                    <label className="block text-[14px] font-medium text-[#353535] mb-3 font-Gantari">
                                        Team Name <span className="text-[#DD4342]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter Team Name"
                                        className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2.5 rounded-md text-[14px] text-[#353535] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all"
                                        value={form.team_name}
                                        onChange={(e) =>
                                            setForm({ ...form, team_name: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[16px] font-medium text-[#8B8B8B] mb-3">
                                        Select Project
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
                                            className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2.5 rounded-md text-left text-[14px] flex items-center justify-between group active:ring-1 active:ring-[#AEACAC52] transition-all cursor-pointer"
                                        >
                                            <span className={form.project_id ? "text-[#353535]" : "text-[#8B8B8B]"}>
                                                {form.project_id
                                                    ? projects.find((p) => String(p.id) === String(form.project_id))?.project_name ?? "Selected Project"
                                                    : "Select Project"}
                                            </span>
                                            <img
                                                src={ArrowDown}
                                                alt=""
                                                className={`w-4 h-4 transition-transform duration-200 ${showProjectDropdown ? "rotate-180" : ""}`}
                                            />
                                        </button>

                                        {showProjectDropdown && (
                                            <div className={`absolute left-0 right-0 z-20 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${projectDropdownUpward ? "bottom-full mb-1" : "top-full mt-1"}`}>
                                                <div className="p-2 border-b border-[#E5E7EB]">
                                                    <input
                                                        type="text"
                                                        placeholder="Search project..."
                                                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-[#E5E7EB] rounded outline-none focus:border-[#DD4342]/30"
                                                        value={projectSearchQuery}
                                                        onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setForm({ ...form, project_id: "" });
                                                            setShowProjectDropdown(false);
                                                            setProjectSearchQuery("");
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm text-[#8B8B8B] hover:bg-slate-50 transition-colors"
                                                    >
                                                        Select Project
                                                    </button>
                                                    {projects
                                                        .filter((p) => (p.project_name || "").toLowerCase().includes(projectSearchQuery.toLowerCase()))
                                                        .map((project) => (
                                                            <button
                                                                key={project.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setForm({ ...form, project_id: String(project.id), leader: '', employee: [] });
                                                                    setShowProjectDropdown(false);
                                                                    setProjectSearchQuery("");
                                                                }}
                                                                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${String(form.project_id) === String(project.id) ? "text-[#DD4342] font-semibold bg-[#DD4342]/5" : "text-[#353535]"}`}
                                                            >
                                                                {project.project_name}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[16px] font-medium text-[#000000] mb-3 font-Gantari">
                                        Team Leader <span className="text-[#DD4342]">*</span>
                                    </label>
                                    <div className="relative" ref={leaderDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const el = leaderDropdownRef.current;
                                                if (el) {
                                                    const rect = el.getBoundingClientRect();
                                                    setLeaderDropdownUpward(window.innerHeight - rect.bottom < 220);
                                                }
                                                setShowLeaderDropdown(!showLeaderDropdown);
                                            }}
                                            className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2.5 rounded-md text-left text-[14px] flex items-center justify-between group active:ring-1 active:ring-[#AEACAC52] transition-all cursor-pointer font-Gantari"
                                        >
                                            <span className={form.leader ? "text-[#353535]" : "text-[#8B8B8B]"}>
                                                {form.leader
                                                    ? employees.find((e) => String(e.id) === String(form.leader))?.full_name ?? "Selected Leader"
                                                    : "Select Leader"}
                                            </span>
                                            <img
                                                src={ArrowDown}
                                                alt=""
                                                className={`w-4 h-4 transition-transform duration-200 ${showLeaderDropdown ? "rotate-180" : ""}`}
                                            />
                                        </button>

                                        {showLeaderDropdown && (
                                            <div className={`absolute left-0 right-0 z-20 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${leaderDropdownUpward ? "bottom-full mb-1" : "top-full mt-1"}`}>
                                                <div className="p-2 border-b border-[#E5E7EB]">
                                                    <input
                                                        type="text"
                                                        placeholder="Search employee..."
                                                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-[#E5E7EB] rounded outline-none focus:border-[#DD4342]/30"
                                                        value={leaderSearchQuery}
                                                        onChange={(e) => setLeaderSearchQuery(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    {employees
                                                        .filter((e) => (e.full_name || "").toLowerCase().includes(leaderSearchQuery.toLowerCase()))
                                                        .map((emp) => (
                                                            <button
                                                                key={emp.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setForm({ ...form, leader: String(emp.id) });
                                                                    setShowLeaderDropdown(false);
                                                                    setLeaderSearchQuery("");
                                                                }}
                                                                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${String(form.leader) === String(emp.id) ? "text-[#DD4342] font-semibold bg-[#DD4342]/5" : "text-[#353535]"}`}
                                                            >
                                                                {emp.full_name}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[16px] font-medium text-[#000000] mb-3 font-Gantari">
                                        Add Members ({form.employee.length})
                                    </label>
                                    <div className="relative" ref={memberDropdownRef}>
                                        <div
                                            onClick={() => {
                                                const el = memberDropdownRef.current;
                                                if (el) {
                                                    const rect = el.getBoundingClientRect();
                                                    setMemberDropdownUpward(window.innerHeight - rect.bottom < 220);
                                                }
                                                setShowMemberDropdown(!showMemberDropdown);
                                            }}
                                            className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2.5 rounded-md text-left text-[14px] flex items-center justify-between group active:ring-1 active:ring-[#AEACAC52] transition-all cursor-pointer min-h-[44px] font-Gantari"
                                        >
                                            <div className="flex flex-wrap gap-1.5 flex-1 pr-4">
                                                {form.employee.length > 0 ? (
                                                    form.employee.map((eid) => (
                                                        <span
                                                            key={eid}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E5E7EB] rounded-md text-xs font-semibold text-[#353535] shadow-sm animate-in zoom-in-95 duration-150"
                                                        >
                                                            {employees.find((e) => String(e.id) === String(eid))?.full_name || eid}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMemberToggle(eid);
                                                                }}
                                                                className="hover:text-red-500 transition-colors"
                                                            >
                                                                <PlusIcon className="w-3 h-3 rotate-45 stroke-[3]" />
                                                            </button>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[#8B8B8B]">Select teammates</span>
                                                )}
                                            </div>
                                            <img
                                                src={ArrowDown}
                                                alt=""
                                                className={`w-4 h-4 transition-transform duration-200 ${showMemberDropdown ? "rotate-180" : ""}`}
                                            />
                                        </div>

                                        {showMemberDropdown && (
                                            <div className={`absolute left-0 right-0 z-20 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${memberDropdownUpward ? "bottom-full mb-1" : "top-full mt-1"}`}>
                                                <div className="p-2 border-b border-[#E5E7EB]">
                                                    <input
                                                        type="text"
                                                        placeholder="Search member..."
                                                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-[#E5E7EB] rounded outline-none focus:border-[#DD4342]/30"
                                                        value={memberSearchQuery}
                                                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    {getProjectEmployees(form.project_id)
                                                        .filter((e) => String(e.id) !== String(form.leader))
                                                        .filter((e) => (e.full_name || "").toLowerCase().includes(memberSearchQuery.toLowerCase()))
                                                        .map((emp) => {
                                                            const isSelected = form.employee.includes(String(emp.id));
                                                            return (
                                                                <button
                                                                    key={emp.id}
                                                                    type="button"
                                                                    onClick={() => handleMemberToggle(String(emp.id))}
                                                                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-all hover:bg-slate-50 ${isSelected ? "bg-[#DD4342]/5 text-[#DD4342] font-semibold" : "text-[#353535]"}`}
                                                                >
                                                                    <span>{emp.full_name}</span>
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? "bg-[#DD4342] border-[#DD4342]" : "border-[#AEACAC52]"}`}>
                                                                        {isSelected && <PlusIcon className="w-3 h-3 text-white stroke-[3] rotate-45" />}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-center gap-6 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-12 py-2 rounded-md bg-[#F2F2F2] text-[#616161] text-[14px] font-medium transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-12 py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[14px] font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                                    >
                                        {submitting ? "Creating..." : "Create Team"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-2 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full max-h-[90vh] flex flex-col p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden my-auto font-Gantari">
                        <div className="relative mb-10 flex items-center justify-center min-h-[40px] w-full">
                            <div className="group absolute left-0 z-10 top-1/2 -translate-y-1/2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer"
                                >
                                    <img src={CloseIcon} alt="Close" className="w-5 h-5 object-contain" />
                                </button>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                    <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                    <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                                        <span className="font-gantari text-[14px] font-semibold text-[#353535] whitespace-nowrap">Close</span>
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-[24px] font-semibold text-[#000000] font-Gantari">
                                Edit Team details
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div>
                                    <label className="block text-[14px] font-medium text-[#353535] mb-3 font-Gantari">
                                        Team Name <span className="text-[#DD4342]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter Team Name"
                                        className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2.5 rounded-md text-[14px] text-[#353535] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all font-Gantari"
                                        value={editForm.team_name}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, team_name: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[16px] font-medium text-[#000000] mb-3 font-Gantari">
                                        Select Project
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
                                            className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2.5 rounded-md text-left text-[14px] flex items-center justify-between group active:ring-1 active:ring-[#AEACAC52] transition-all cursor-pointer font-Gantari"
                                        >
                                            <span className={editForm.project_id ? "text-[#353535]" : "text-[#8B8B8B]"}>
                                                {editForm.project_id
                                                    ? projects.find((p) => String(p.id) === String(editForm.project_id))?.project_name ?? "Selected Project"
                                                    : "Select Project"}
                                            </span>
                                            <img
                                                src={ArrowDown}
                                                alt=""
                                                className={`w-4 h-4 transition-transform duration-200 ${showProjectDropdown ? "rotate-180" : ""}`}
                                            />
                                        </button>

                                        {showProjectDropdown && (
                                            <div className={`absolute left-0 right-0 z-20 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${projectDropdownUpward ? "bottom-full mb-1" : "top-full mt-1"}`}>
                                                <div className="p-2 border-b border-[#E5E7EB]">
                                                    <input
                                                        type="text"
                                                        placeholder="Search project..."
                                                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-[#E5E7EB] rounded outline-none focus:border-[#DD4342]/30"
                                                        value={projectSearchQuery}
                                                        onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    {projects
                                                        .filter((p) => (p.project_name || "").toLowerCase().includes(projectSearchQuery.toLowerCase()))
                                                        .map((project) => (
                                                            <button
                                                                key={project.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditForm({ ...editForm, project_id: String(project.id), leader: '', employee: [] });
                                                                    setShowProjectDropdown(false);
                                                                    setProjectSearchQuery("");
                                                                }}
                                                                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${String(editForm.project_id) === String(project.id) ? "text-[#DD4342] font-semibold bg-[#DD4342]/5" : "text-[#353535]"}`}
                                                            >
                                                                {project.project_name}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[16px] font-medium text-[#000000] mb-3 font-Gantari">
                                        Team Leader <span className="text-[#DD4342]">*</span>
                                    </label>
                                    <div className="relative" ref={leaderDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const el = leaderDropdownRef.current;
                                                if (el) {
                                                    const rect = el.getBoundingClientRect();
                                                    setLeaderDropdownUpward(window.innerHeight - rect.bottom < 220);
                                                }
                                                setShowLeaderDropdown(!showLeaderDropdown);
                                            }}
                                            className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2.5 rounded-md text-left text-[14px] flex items-center justify-between group active:ring-1 active:ring-[#AEACAC52] transition-all cursor-pointer font-Gantari"
                                        >
                                            <span className={editForm.leader ? "text-[#353535]" : "text-[#8B8B8B]"}>
                                                {editForm.leader
                                                    ? employees.find((e) => String(e.id) === String(editForm.leader))?.full_name ?? "Selected Leader"
                                                    : "Select Leader"}
                                            </span>
                                            <img
                                                src={ArrowDown}
                                                alt=""
                                                className={`w-4 h-4 transition-transform duration-200 ${showLeaderDropdown ? "rotate-180" : ""}`}
                                            />
                                        </button>

                                        {showLeaderDropdown && (
                                            <div className={`absolute left-0 right-0 z-20 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${leaderDropdownUpward ? "bottom-full mb-1" : "top-full mt-1"}`}>
                                                <div className="p-2 border-b border-[#E5E7EB]">
                                                    <input
                                                        type="text"
                                                        placeholder="Search employee..."
                                                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-[#E5E7EB] rounded outline-none focus:border-[#DD4342]/30"
                                                        value={leaderSearchQuery}
                                                        onChange={(e) => setLeaderSearchQuery(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    {getProjectEmployees(editForm.project_id)
                                                        .filter((e) => (e.full_name || "").toLowerCase().includes(leaderSearchQuery.toLowerCase()))
                                                        .map((emp) => (
                                                            <button
                                                                key={emp.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditForm({ ...editForm, leader: String(emp.id) });
                                                                    setShowLeaderDropdown(false);
                                                                    setLeaderSearchQuery("");
                                                                }}
                                                                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors hover:bg-slate-50 ${String(editForm.leader) === String(emp.id) ? "text-[#DD4342] font-semibold bg-[#DD4342]/5" : "text-[#353535]"}`}
                                                            >
                                                                <span>{emp.full_name}</span>
                                                                {(emp as any).isProjectMember && (
                                                                    <span className="text-[10px] bg-[#DD4342]/10 text-[#DD4342] px-1.5 py-0.5 rounded font-bold uppercase">Project</span>
                                                                )}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[16px] font-medium text-[#000000] mb-3 font-Gantari">
                                        Members ({editForm.employee.length})
                                    </label>
                                    <div className="relative" ref={memberDropdownRef}>
                                        <div
                                            onClick={() => {
                                                const el = memberDropdownRef.current;
                                                if (el) {
                                                    const rect = el.getBoundingClientRect();
                                                    setMemberDropdownUpward(window.innerHeight - rect.bottom < 220);
                                                }
                                                setShowMemberDropdown(!showMemberDropdown);
                                            }}
                                            className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2.5 rounded-md text-left text-[14px] flex items-center justify-between group active:ring-1 active:ring-[#AEACAC52] transition-all cursor-pointer min-h-[44px] font-Gantari"
                                        >
                                            <div className="flex flex-wrap gap-1.5 flex-1 pr-4">
                                                {editForm.employee.length > 0 ? (
                                                    editForm.employee.map((eid) => (
                                                        <span
                                                            key={eid}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E5E7EB] rounded-md text-xs font-semibold text-[#353535] shadow-sm animate-in zoom-in-95 duration-150"
                                                        >
                                                            {employees.find((e) => String(e.id) === String(eid))?.full_name || eid}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMemberToggle(eid, true);
                                                                }}
                                                                className="hover:text-red-500 transition-colors"
                                                            >
                                                                <PlusIcon className="w-3 h-3 rotate-45 stroke-[3]" />
                                                            </button>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[#8B8B8B]">Select teammates</span>
                                                )}
                                            </div>
                                            <img
                                                src={ArrowDown}
                                                alt=""
                                                className={`w-4 h-4 transition-transform duration-200 ${showMemberDropdown ? "rotate-180" : ""}`}
                                            />
                                        </div>

                                        {showMemberDropdown && (
                                            <div className={`absolute left-0 right-0 z-20 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${memberDropdownUpward ? "bottom-full mb-1" : "top-full mt-1"}`}>
                                                <div className="p-2 border-b border-[#E5E7EB]">
                                                    <input
                                                        type="text"
                                                        placeholder="Search member..."
                                                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-[#E5E7EB] rounded outline-none focus:border-[#DD4342]/30"
                                                        value={memberSearchQuery}
                                                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    {getProjectEmployees(editForm.project_id)
                                                        .filter((e) => String(e.id) !== String(editForm.leader))
                                                        .filter((e) => (e.full_name || "").toLowerCase().includes(memberSearchQuery.toLowerCase()))
                                                        .map((emp) => {
                                                            const isSelected = editForm.employee.includes(String(emp.id));
                                                            return (
                                                                <button
                                                                    key={emp.id}
                                                                    type="button"
                                                                    onClick={() => handleMemberToggle(String(emp.id), true)}
                                                                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-all hover:bg-slate-50 ${isSelected ? "bg-[#DD4342]/5 text-[#DD4342] font-semibold" : "text-[#353535]"}`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span>{emp.full_name}</span>
                                                                        {(emp as any).isProjectMember && (
                                                                            <span className="text-[10px] bg-[#DD4342]/10 text-[#DD4342] px-1.5 py-0.5 rounded font-bold uppercase">Project</span>
                                                                        )}
                                                                    </div>
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? "bg-[#DD4342] border-[#DD4342]" : "border-[#AEACAC52]"}`}>
                                                                        {isSelected && <PlusIcon className="w-3 h-3 text-white stroke-[3] rotate-45" />}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-center gap-6 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-6 py-2 rounded-md bg-[#F2F2F2] text-[#616161] text-[14px] font-medium transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2 rounded-md bg-[#DBE9FE] text-[#101827] text-[14px] font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm font-Gantari"
                                    >
                                        {submitting ? "Updating..." : "Update"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedTeam && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="bg-white rounded-md shadow-2xl max-w-[600px] w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 relative overflow-hidden font-Gantari">
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
                                        getEmp(selectedTeam.leader)?.full_name ||
                                        'Unnamed Team'}
                                </h3>
                                <p className="text-[16px] text-slate-500 mt-1 font-Gantari">Team Details</p>
                            </div>
                        </div>

                        <div className="p-8 pt-0 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[18px] font-semibold text-slate-800 mb-4 font-Gantari">
                                        Project Name
                                    </h4>
                                    <div className="bg-[#F2F2F2] rounded-md p-6 border border-[#AEACAC52]">
                                        <p className="font-semibold text-slate-800 font-Gantari">
                                            {selectedTeam.project_name || "N/A"}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[18px] font-semibold text-slate-800 mb-4 font-Gantari">
                                        Team Lead
                                    </h4>
                                    <div className="bg-[#F2F2F2] rounded-md p-6 border border-[#AEACAC52]">
                                        <div className="flex items-center gap-4">
                                            {(() => {
                                                const leaderEmp = getEmp(selectedTeam.leader);
                                                const profileUrl = leaderEmp?.profile_picture ? getGlobalProfileUrl(leaderEmp.id, leaderEmp.profile_picture, "vendor") : null;
                                                const leaderName = selectedTeam.leader_name || leaderEmp?.full_name || 'N/A';
                                                return (
                                                    <>
                                                        <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm overflow-hidden shrink-0">
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
                                                                leaderName[0] || ""
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800 font-Gantari">
                                                                {leaderName}
                                                            </p>
                                                            <p className="text-[14px] text-slate-500 font-Gantari">Team Leader</p>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[18px] font-semibold text-slate-800 mb-4 pl-1 font-Gantari">
                                        Team Members ({selectedTeam.employee.split(",").filter(Boolean).length})
                                    </h4>
                                    <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md overflow-hidden">
                                        {selectedTeam.employee
                                            .split(",")
                                            .filter(Boolean)
                                            .map((eid, i) => {
                                                const empInfo = getEmp(eid);
                                                const memberName = empInfo?.full_name || eid;
                                                return (
                                                    <div
                                                        key={eid}
                                                        className={`flex items-center gap-4 p-4 transition-colors ${i !== 0 ? "border-t border-slate-100" : ""}`}
                                                    >
                                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 overflow-hidden shrink-0">
                                                            {empInfo?.profile_picture ? (
                                                                <img
                                                                    src={getGlobalProfileUrl(empInfo.id, empInfo.profile_picture, "vendor")}
                                                                    alt={memberName}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = ProfileIcon;
                                                                    }}
                                                                />
                                                            ) : (
                                                                memberName[0] || ""
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-slate-800 truncate font-Gantari">
                                                                {memberName}
                                                            </p>
                                                            {empInfo?.email && (
                                                                <p className="text-[14px] text-slate-500 truncate font-Gantari">
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

        </div>
    );
}
