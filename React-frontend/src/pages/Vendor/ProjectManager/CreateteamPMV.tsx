import { useEffect, useState, useRef } from "react";
import api from "../../../lib/api";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import threeDotsIcon from "../../../assets/ProjectManager/CreateTeam/three dots.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import eyeIcon from "../../../assets/ProjectManager/consultant/eyeIcon.svg";
import upArrow from "../../../assets/TechnicalDirector/upArrow.svg";

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



function TeamCard({ team, getEmpName, onEdit, onDelete, onViewDetails }: { team: Team; getEmpName: (id: number | string) => string; onEdit: (team: Team) => void; onDelete: (id: number) => void; onViewDetails: (team: Team) => void }) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const memberIds = team.employee.split(',').filter(Boolean);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="bg-white rounded-md p-3.5 border border-[#E5E7EB] w-full flex flex-col transition-all hover:shadow-md group relative font-Gantari">
            {/* Team Name */}
            <div className="flex flex-col mb-3 pt-1">
                <span className="text-[14px] font-medium text-[#8B8B8B] mb-1.5">
                    Team Name
                </span>
                <span className="text-[18px] font-semibold text-[#353535] pr-8 truncate">
                    {team.team_name || team.teamname || (getEmpName(team.leader) !== 'N/A' ? getEmpName(team.leader) : team.leader_name) || "Untitled Team"}
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

            {/* Team Leader */}
            <div className="flex flex-col mb-4">
                <span className="text-[14px] font-medium text-[#8B8B8B] mb-1.5">
                    Team Leader
                </span>
                <span className="text-[18px] font-semibold text-[#353535] truncate flex items-center gap-2">
                    {getEmpName(team.leader) !== 'N/A' ? getEmpName(team.leader) : (team.leader_name || 'N/A')}
                </span>
            </div>

            {/* Divider */}
            <div className="h-[1px] w-full bg-[#E5E7EB] mb-4"></div>

            {/* Members + Details */}
            <div className="mt-auto flex items-center justify-between">
                <div>
                    <div className="flex -space-x-3">
                        {memberIds.slice(0, 3).map((eid) => (
                            <div
                                key={eid}
                                className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
                                title={getEmpName(eid)}
                            >
                                <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[10px] font-bold text-slate-600 uppercase">
                                    {(getEmpName(eid) || 'U').charAt(0).toUpperCase()}
                                </div>
                            </div>
                        ))}
                        {memberIds.length > 3 && (
                            <div className="w-9 h-9 rounded-full border-1 border-dashed bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors">
                                +{memberIds.length - 3}
                            </div>
                        )}
                        {memberIds.length === 0 && (
                            <span className="text-[12px] text-[#CBD5E1]">No members yet</span>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => onViewDetails(team)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#8B8B8B] hover:text-[#353535] pr-1 cursor-pointer transition-all duration-200"
                >
                    Details
                    <img src={upArrow} alt="Up" className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>
        </div>
    );
}

export default function CreateteamPMV() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMemberDropdown, setShowMemberDropdown] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    // Dropdown states for Add Modal
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [projectDropdownUpward, setProjectDropdownUpward] = useState(false);
    const projectDropdownRef = useRef<HTMLDivElement>(null);

    const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
    const [leaderSearchQuery, setLeaderSearchQuery] = useState("");
    const [leaderDropdownUpward, setLeaderDropdownUpward] = useState(false);
    const leaderDropdownRef = useRef<HTMLDivElement>(null);

    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [memberDropdownUpward, setMemberDropdownUpward] = useState(false);
    const memberDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedProjectFilter, setSelectedProjectFilter] = useState<{ id: string | number; name: string } | null>(null);
    const [showProjectFilterDropdown, setShowProjectFilterDropdown] = useState(false);
    const projectFilterDropdownRef = useRef<HTMLDivElement>(null);

    const [showEntries, setShowEntries] = useState("");
    const [showEntriesDropdown, setShowEntriesDropdown] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);

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
            if (projectFilterDropdownRef.current && !projectFilterDropdownRef.current.contains(event.target as Node)) {
                setShowProjectFilterDropdown(false);
            }
            if (showEntriesDropdownRef.current && !showEntriesDropdownRef.current.contains(event.target as Node)) {
                setShowEntriesDropdown(false);
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
            api.get<{ projects?: Project[] }>('/api/vendors/vendor-projects')
        ])
            .then(([teamsRes, empsRes, projectsRes]) => {
                setTeams(teamsRes.data.teams ?? []);
                setEmployees(empsRes.data.resources ?? []);
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
        if (!projectId) return employees;
        const proj = projects.find((p) => String(p.id) === String(projectId));
        if (!proj) return employees;

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

        const filtered = employees.filter(e => involvedIds.has(String(e.id)));
        return filtered.length > 0 ? filtered : employees;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.leader) return;
        setSubmitting(true);

        api.post('/api/vendors/vendor-teams', {
            team_name: form.team_name,
            leader: form.leader,
            employee: form.employee.join(','),
            project_lead: form.project_lead || undefined,
            project_id: form.project_id ? Number(form.project_id) : undefined,
        })
            .then(({ data }) => {
                if (data.success) {
                    setShowAddModal(false);
                    setSuccessMsg('Team Created Successfully');
                    setTimeout(() => setSuccessMsg(''), 3000);
                    // Refresh data instead of page reload for better UX
                    api.get<{ teams?: Team[] }>('/api/vendors/vendor-teams').then(res => setTeams(res.data.teams ?? []));
                    setForm({ leader: '', employee: [], project_lead: '', project_id: '', team_name: '' });
                }
            })
            .catch(() => { })
            .finally(() => setSubmitting(false));
    }; ``

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
        const inferredProjectId =
            team.project_id != null
                ? String(team.project_id)
                : team.project_name
                    ? String(projects.find(p => p.project_name === team.project_name)?.id ?? '')
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

        api.patch(`/api/vendors/vendor-teams/${selectedTeam.team_id}`, {
            team_name: editForm.team_name,
            leader: editForm.leader,
            employee: editForm.employee.join(','),
            project_lead: editForm.project_lead || 0,
            project_id: editForm.project_id ? Number(editForm.project_id) : undefined,
        })
            .then(({ data }) => {
                if (data.success) {
                    setShowEditModal(false);
                    setSuccessMsg('Team Updated Successfully');
                    setTimeout(() => setSuccessMsg(''), 3000);
                    api.get<{ teams?: Team[] }>('/api/vendors/vendor-teams').then(res => setTeams(res.data.teams ?? []));
                }
            })
            .catch(() => { })
            .finally(() => setSubmitting(false));
    };

    const getEmpName = (id: number | string) => {
        const emp = employees.find(e => e.id === Number(id));
        return emp?.full_name || 'N/A';
    };

    const handleDelete = (id: number) => {
        if (!window.confirm('Are you sure you want to delete this team?')) return;
        api.delete(`/api/vendors/vendor-teams/${id}`)
            .then(() => {
                setTeams(teams.filter(t => t.team_id !== id));
            });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DD4342]"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-2 font-Gantari relative">
            {successMsg && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-5 py-3 rounded-lg bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 min-w-[300px] animate-in fade-in slide-in-from-top-2 duration-300 font-Gantari">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#58D662]">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span className="text-[16px] font-medium text-[#2D2D2D]">{successMsg}</span>
                </div>
            )}
            {/* Header section */}
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-[24px] font-semibold text-[#000000] font-Gantari">Create Team</h2>
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
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className={`shrink-0 transition-transform duration-200 ${showProjectFilterDropdown ? "rotate-180" : ""} ${!selectedProjectFilter ? "opacity-60 grayscale" : "opacity-90"}`}
                            >
                                <path d="M3 4.5L6 7.5L9 4.5" stroke="#8B8B8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
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

                    {/* Show Entries Dropdown */}
                    <div className="relative min-w-[140px] max-w-[200px] w-[150px]" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setShowEntriesDropdown(!showEntriesDropdown)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-Gantari transition-all cursor-pointer border-0"
                        >
                            <span className={`truncate text-left flex-1 ${!showEntries ? "text-[#8B8B8B]" : "text-[#353535]"}`}>
                                {!showEntries ? (
                                    SHOW_ENTRIES_PLACEHOLDER
                                ) : (
                                    <>
                                        <span className="text-[14px] font-normal">{SHOW_ENTRIES_SELECTED_PREFIX}</span>{" "}
                                        <span className="font-semibold">{showEntries}</span>
                                    </>
                                )}
                            </span>
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className={`shrink-0 transition-transform duration-200 ${showEntriesDropdown ? "rotate-180" : ""} ${!showEntries ? "opacity-60 grayscale" : "opacity-90"}`}
                            >
                                <path d="M3 4.5L6 7.5L9 4.5" stroke="#8B8B8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {showEntriesDropdown && (
                            <div className="absolute top-full right-0 mt-1 w-full bg-white border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEntries("");
                                            setShowEntriesDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors font-Gantari"
                                    >
                                        {SHOW_ENTRIES_PLACEHOLDER}
                                    </button>
                                    {showEntriesOptions.map((opt) => {
                                        const isChosen = showEntries === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setShowEntries(opt.value);
                                                    setShowEntriesDropdown(false);
                                                }}
                                                className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-Gantari transition-colors cursor-pointer ${isChosen
                                                    ? "text-[#353535] bg-[#F2F2F2] font-semibold"
                                                    : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"
                                                    }`}
                                            >
                                                <span className="truncate flex-1">{opt.label}</span>
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
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md transition-all font-semibold shadow-lg shadow-red-200 cursor-pointer"
                    >
                        <PlusIcon className="w-5 h-5 stroke-[3]" />
                        New Team
                    </button>
                </div>
            </div>

            {/* Teams Grid */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {(() => {
                        const filtered = teams.filter(t => {
                            if (!selectedProjectFilter) return true;
                            const pid = t.project_id || (t.project_name ? projects.find(p => p.project_name === t.project_name)?.id : null);
                            return String(pid) === String(selectedProjectFilter.id);
                        });

                        const paged = filtered.slice(
                            showEntriesOptions.find((o) => o.value === showEntries)?.start || 0,
                            showEntriesOptions.find((o) => o.value === showEntries)?.end || teams.length
                        );

                        if (paged.length === 0) {
                            return (
                                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-[#AEACAC52] flex flex-col items-center justify-center gap-4">
                                    <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center">
                                        <PlusIcon className="w-8 h-8 text-[#94A3B8]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[#1E293B]">No teams found</h3>
                                        <p className="text-[#64748B]">Click "New Team" to get started.</p>
                                    </div>
                                </div>
                            );
                        }

                        return paged.map((team) => (
                            <TeamCard
                                key={team.team_id}
                                team={team}
                                getEmpName={getEmpName}
                                onEdit={handleEditClick}
                                onDelete={handleDelete}
                                onViewDetails={(t) => {
                                    setSelectedTeam(t);
                                    setShowDetailsModal(true);
                                }}
                            />
                        ));
                    })()}
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full p-6 animate-in zoom-in-95 duration-200 relative overflow-visible my-auto">
                        <div className="group absolute top-8 left-8 z-10">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer border-0 shadow-none"
                            >
                                <XMarkIcon className="w-5 h-5 text-black stroke-[2]" />
                            </button>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-sm px-4 py-0.5 relative z-10">
                                    <span className="font-gantari text-[12px] font-semibold text-[#353535] whitespace-nowrap">Close</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mb-10">
                            <h3 className="text-[24px] font-semibold text-[#000000]">
                                Create New Team
                            </h3>
                        </div>

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
                                <label className="block text-[14px] font-medium text-[#353535] mb-3">
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
                                        className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] flex items-center justify-between transition-all cursor-pointer font-Gantari"
                                    >
                                        <span>
                                            {form.project_id
                                                ? projects.find((p) => String(p.id) === form.project_id)?.project_name || "Select Project"
                                                : "Select Project"}
                                        </span>
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 4.5L6 7.5L9 4.5" stroke="#8B8B8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    {showProjectDropdown && (
                                        <div
                                            className={`absolute left-0 w-full bg-[#FFFFFF] rounded-[10px] shadow-lg border border-[#AEACAC52] py-2 z-[110] animate-in fade-in zoom-in duration-200 max-h-60 overflow-y-auto no-scrollbar flex flex-col ${projectDropdownUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"}`}
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
                                                        ? (employees.find((emp) => String(emp.id) === form.leader)?.full_name ?? "")
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
                                                    setLeaderDropdownUpward(window.innerHeight - rect.bottom < 220);
                                                }
                                                setShowLeaderDropdown(true);
                                                setLeaderSearchQuery(
                                                    form.leader
                                                        ? (employees.find((emp) => String(emp.id) === form.leader)?.full_name ?? "")
                                                        : ""
                                                );
                                            }}
                                            onClick={() => setShowLeaderDropdown(true)}
                                            className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all font-Gantari"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-transform duration-200">
                                                <path d="M3 4.5L6 7.5L9 4.5" stroke="#8B8B8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>

                                    {showLeaderDropdown && (
                                        <div className={`absolute left-0 w-full bg-[#FFFFFF] rounded-[10px] shadow-lg border border-[#AEACAC52] py-2 z-[110] animate-in fade-in zoom-in duration-200 max-h-60 flex flex-col ${leaderDropdownUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"}`}>
                                            <div className="overflow-y-auto no-scrollbar max-h-44">
                                                {getProjectEmployees(form.project_id)
                                                    .filter(e => !leaderSearchQuery.trim() || e.full_name?.toLowerCase().includes(leaderSearchQuery.toLowerCase()))
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
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-[12px] font-bold text-slate-600">
                                                                {(e.full_name || "U")[0].toUpperCase()}
                                                            </div>
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
                                                    setMemberDropdownUpward(window.innerHeight - rect.bottom < 220);
                                                }
                                                setShowMemberDropdown(true);
                                                setMemberSearchQuery("");
                                            }}
                                            onClick={() => setShowMemberDropdown(true)}
                                            className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all font-Gantari"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-transform duration-200">
                                                <path d="M3 4.5L6 7.5L9 4.5" stroke="#8B8B8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>

                                    {showMemberDropdown && (
                                        <div className={`absolute left-0 w-full bg-[#FFFFFF] rounded-[10px] shadow-lg border border-[#AEACAC52] py-2 z-[110] animate-in fade-in zoom-in duration-200 max-h-60 flex flex-col ${memberDropdownUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"}`}>
                                            <div className="overflow-y-auto no-scrollbar max-h-44">
                                                {getProjectEmployees(form.project_id)
                                                    .filter(e => String(e.id) !== form.leader)
                                                    .filter(e => !memberSearchQuery.trim() || e.full_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                                                    .map((e) => (
                                                        <label
                                                            key={e.id}
                                                            className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#F2F2F2] cursor-pointer transition-colors group"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={form.employee.includes(String(e.id))}
                                                                onChange={() => handleMemberToggle(String(e.id))}
                                                                className="w-5 h-5 rounded border-gray-300 text-[#000000] focus:ring-0 cursor-pointer"
                                                            />
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-[12px] font-bold text-slate-600">
                                                                {(e.full_name || "U")[0].toUpperCase()}
                                                            </div>
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
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full p-6 animate-in zoom-in-95 duration-200 relative overflow-visible my-auto">
                        <div className="group absolute top-8 left-8 z-10">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer border-0 shadow-none"
                            >
                                <XMarkIcon className="w-5 h-5 text-black stroke-[2]" />
                            </button>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-sm px-4 py-0.5 relative z-10">
                                    <span className="font-gantari text-[12px] font-semibold text-[#353535] whitespace-nowrap">Close</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="text-center mb-10">
                                <h3 className="text-[24px] font-semibold text-[#000000]">Edit Team</h3>
                            </div>

                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[14px] font-medium text-[#353535] mb-3">Team Name <span className="text-[#DD4342]">*</span></label>
                                    <input
                                        type="text"
                                        value={editForm.team_name}
                                        onChange={(e) => setEditForm({ ...editForm, team_name: e.target.value })}
                                        className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-md text-[14px] text-[#8B8B8B] placeholder:text-[14px] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all font-Gantari"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[14px] font-medium text-[#353535] mb-3">Select Project</label>
                                    <select
                                        value={editForm.project_id}
                                        onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value, leader: "", employee: [] })}
                                        className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-md text-[14px] text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] outline-none transition-all appearance-none cursor-pointer font-Gantari"
                                        required
                                    >
                                        <option value="">Select Project</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.project_name ?? `Project ${p.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[14px] font-medium text-[#353535] mb-3">Team Leader <span className="text-[#DD4342]">*</span></label>
                                    <select
                                        value={editForm.leader}
                                        onChange={(e) => setEditForm({ ...editForm, leader: e.target.value })}
                                        className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-md text-[14px] text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] outline-none transition-all appearance-none cursor-pointer font-Gantari"
                                        required
                                    >
                                        {getProjectEmployees(editForm.project_id).map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2 relative" ref={memberDropdownRef}>
                                    <label className="block text-[14px] font-medium text-[#353535] mb-3">Select Member <span className="text-[#DD4342]">*</span></label>
                                    <div
                                        onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                                        className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-md min-h-[42px] cursor-pointer flex flex-wrap gap-2 items-center font-Gantari"
                                    >
                                        {editForm.employee.length === 0 && (
                                            <span className="text-[14px] text-[#8B8B8B]">Select Member</span>
                                        )}
                                        {editForm.employee.map(eid => (
                                            <span key={eid} className="bg-white px-2.5 py-1 rounded-md text-[13px] font-medium text-[#353535] shadow-sm flex items-center gap-1.5 border border-[#AEACAC52]">
                                                {getEmpName(eid)}
                                                <XMarkIcon
                                                    onClick={(e) => { e.stopPropagation(); handleMemberToggle(eid, true); }}
                                                    className="w-3.5 h-3.5 cursor-pointer hover:text-red-500"
                                                />
                                            </span>
                                        ))}
                                    </div>

                                    {showMemberDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[10px] shadow-lg border border-[#AEACAC52] py-2 z-50 max-h-[220px] overflow-y-auto custom-scrollbar">
                                            {getProjectEmployees(editForm.project_id).filter(emp => String(emp.id) !== editForm.leader).map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => handleMemberToggle(String(emp.id), true)}
                                                    className="flex items-center gap-3 p-2.5 px-5 hover:bg-[#F2F2F2] cursor-pointer transition-colors"
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${editForm.employee.includes(String(emp.id)) ? 'bg-[#DD4342] border-[#DD4342]' : 'border-[#CBD5E1]'}`}>
                                                        {editForm.employee.includes(String(emp.id)) && <PlusIcon className="w-3.5 h-3.5 text-white rotate-45 stroke-[3]" />}
                                                    </div>
                                                    <span className="text-[14px] text-[#8B8B8B] hover:text-[#353535]">{emp.full_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                        {submitting ? 'Updating...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedTeam && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-[500px] w-full animate-in fade-in zoom-in duration-200 relative">
                        <div className="group absolute top-8 left-8 z-10">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer border-0 shadow-none"
                            >
                                <XMarkIcon className="w-5 h-5 text-black stroke-[2]" />
                            </button>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-sm px-4 py-0.5 relative z-10">
                                    <span className="font-gantari text-[12px] font-semibold text-[#353535] whitespace-nowrap">Close</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="text-center mb-6">
                                <h3 className="text-[22px] font-medium text-[#1E293B] px-12">Team Details</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[16px] font-gantari block mb-1 font-medium">Team Name</label>
                                    <div className="text-[14px] font-gantari bg-[#F2F3F4] border-2 border-[#AEACAC52] py-3 px-2 rounded-lg">{selectedTeam.team_name || selectedTeam.teamname || 'Unnamed Team'}</div>
                                </div>

                                <div>
                                    <label className="text-[16px] font-gantari block mb-1 font-medium">Project Name</label>
                                    <div className="text-[14px] font-gantari bg-[#F2F3F4] border-2 border-[#AEACAC52] py-3 px-2 rounded-lg">{selectedTeam.project_name || 'N/A'}</div>
                                </div>

                                <div>
                                    <label className="text-[16px] font-gantari block mb-1 font-medium">Team Leader</label>
                                    <div className="flex items-center gap-3 bg-[#F2F3F4] border-2 border-[#AEACAC52] py-3 px-2 rounded-xl">
                                        <div className="w-10 h-10 rounded-full bg-[#DD4342] text-white flex items-center justify-center font-gantari font-medium uppercase">
                                            {((getEmpName(selectedTeam.leader) !== 'N/A' ? getEmpName(selectedTeam.leader) : selectedTeam.leader_name) || 'L')[0]}
                                        </div>
                                        <div className="font-gantari font-medium text-[#334155]">{getEmpName(selectedTeam.leader) !== 'N/A' ? getEmpName(selectedTeam.leader) : selectedTeam.leader_name}</div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[16px] font-gantari block mb-2 font-medium">Members ({selectedTeam.employee.split(',').filter(Boolean).length})</label>
                                    <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                                        {selectedTeam.employee.split(',').filter(Boolean).map(eid => (
                                            <div key={eid} className="flex items-center gap-2.5 bg-[#F2F3F4] border-2 border-[#AEACAC52] py-3 px-2 rounded-lg">
                                                <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600 uppercase">
                                                    {(getEmpName(eid) || 'M')[0]}
                                                </div>
                                                <div className="text-[14px] font-bold text-[#475569]">{getEmpName(eid)}</div>
                                            </div>
                                        ))}
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
