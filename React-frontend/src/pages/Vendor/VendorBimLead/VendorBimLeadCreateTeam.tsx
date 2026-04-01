import { useEffect, useState } from "react";
import api from "../../../lib/api";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import threeDotsIcon from "../../../assets/ProjectManager/CreateTeam/three dots.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import eyeIcon from "../../../assets/ProjectManager/consultant/eyeIcon.svg";
import upArrow from "../../../assets/TechnicalDirector/upArrow.svg";
import ProfileIcon from "../../../assets/ProductNavbarIcons/Profile.svg";
import CloseIcon from "../../../assets/ProductNavbarIcons/close button.svg";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";
import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";
import { useRef } from "react";


interface Team {
    // Backend returns team_id, but UI historically used id.
    id?: number;
    team_id?: number;
    team_name: string;
    project_id?: number;
    project_name?: string;

    // Backend columns:
    //  - leader (employee id)
    //  - employee (comma-separated employee ids)
    leader?: number;
    employee?: string;

    // UI aliases:
    members?: string;
    leader_id?: number;
    description?: string;
}

interface Project {
    id: number;
    project_name: string;
}

interface Employee {
    id: number;
    full_name: string;
    user_role?: string;
  active?: string;
}

export default function VendorBimLeadCreateTeam() {
    const SHOW_OPTIONS = ["Show", "1-50", "51-100", "101-150","151-200","201-250","251-300", "All"];
    const [teams, setTeams] = useState<Team[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        team_name: "", project_id: "", leader_id: "", employee: [] as string[]
    });
    const [createSubmitting, setCreateSubmitting] = useState(false);

    // Search/Dropdown states for Create Modal
    const [createLeaderSearchQuery, setCreateLeaderSearchQuery] = useState("");
    const [createMemberSearchQuery, setCreateMemberSearchQuery] = useState("");
    const [showCreateLeaderDropdown, setShowCreateLeaderDropdown] = useState(false);
    const [showCreateMemberDropdown, setShowCreateMemberDropdown] = useState(false);
    const [showCreateProjectDropdown, setShowCreateProjectDropdown] = useState(false);
    const createLeaderDropdownRef = useRef<HTMLDivElement>(null);
    const createMemberDropdownRef = useRef<HTMLDivElement>(null);
    const createProjectDropdownRef = useRef<HTMLDivElement>(null);

    const [openMenuTeamId, setOpenMenuTeamId] = useState<number | null>(null);
    const [selectedShow, setSelectedShow] = useState<string>("Show");
    const [showDropdownOpen, setShowDropdownOpen] = useState(false);

    // Edit and Details Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [editForm, setEditForm] = useState({
        team_name: "", project_id: "", leader_id: "", employee: [] as string[]
    });
    
    // Search/Dropdown states for Edit Modal
    const [leaderSearchQuery, setLeaderSearchQuery] = useState("");
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [showEditLeaderDropdown, setShowEditLeaderDropdown] = useState(false);
    const [showEditMemberDropdown, setShowEditMemberDropdown] = useState(false);
    const [showEditProjectDropdown, setShowEditProjectDropdown] = useState(false);
    const editLeaderDropdownRef = useRef<HTMLDivElement>(null);
    const editMemberDropdownRef = useRef<HTMLDivElement>(null);
    const editProjectDropdownRef = useRef<HTMLDivElement>(null);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.get<{ teams?: Team[] }>("/api/vendors/vendor-teams"),
            api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
            api.get<{ employees?: Employee[] }>("/api/employees")
        ]).then(([teamsRes, projectsRes, employeesRes]) => {
            // Normalize backend response fields to match UI usage.
            const normalized = (teamsRes.data.teams ?? []).map((t: Team) => ({
                ...t,
                id: t.id ?? t.team_id,
                leader_id: t.leader_id ?? t.leader,
                members: t.members ?? t.employee,
            }));
            setTeams(normalized);
            setProjects(projectsRes.data.projects ?? []);
            setEmployees(employeesRes.data.employees ?? []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Edit refs
            if (editProjectDropdownRef.current && !editProjectDropdownRef.current.contains(event.target as Node)) {
                setShowEditProjectDropdown(false);
            }
            if (editLeaderDropdownRef.current && !editLeaderDropdownRef.current.contains(event.target as Node)) {
                setShowEditLeaderDropdown(false);
            }
            if (editMemberDropdownRef.current && !editMemberDropdownRef.current.contains(event.target as Node)) {
                setShowEditMemberDropdown(false);
            }
            // Create refs
            if (createProjectDropdownRef.current && !createProjectDropdownRef.current.contains(event.target as Node)) {
                setShowCreateProjectDropdown(false);
            }
            if (createLeaderDropdownRef.current && !createLeaderDropdownRef.current.contains(event.target as Node)) {
                setShowCreateLeaderDropdown(false);
            }
            if (createMemberDropdownRef.current && !createMemberDropdownRef.current.contains(event.target as Node)) {
                setShowCreateMemberDropdown(false);
            }
            // Close Kebab Menu on outside click
            setOpenMenuTeamId(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setCreateSubmitting(true);
        api.post("/api/vendors/vendor-teams", {
            team_name: createForm.team_name,
            project_id: createForm.project_id || undefined,
            leader: createForm.leader_id ? Number(createForm.leader_id) : undefined,
            employee: createForm.employee.join(","),
        })
            .then(() => {
                setShowCreateModal(false);
                setCreateForm({ team_name: "", project_id: "", leader_id: "", employee: [] });
                fetchData();
            })
            .finally(() => setCreateSubmitting(false));
    };

    const handleCreateMemberToggle = (id: string) => {
        setCreateForm(prev => {
            const exists = prev.employee.includes(id);
            if (exists) {
                return { ...prev, employee: prev.employee.filter(e => e !== id) };
            } else {
                return { ...prev, employee: [...prev.employee, id] };
            }
        });
    };

    const handleDelete = (id: number) => {
        if (!confirm("Are you sure you want to delete this team?")) return;
        api.delete(`/api/vendors/vendor-teams/${id}`)
            .then(() => fetchData());
    };

    const handleEditClick = (team: Team) => {
        setLeaderSearchQuery("");
        setMemberSearchQuery("");
        setSelectedTeam(team);
        setEditForm({
            team_name: team.team_name || "",
            project_id: team.project_id ? String(team.project_id) : "",
            leader_id: team.leader_id ? String(team.leader_id) : "",
            employee: team.members ? team.members.split(",").filter(Boolean) : []
        });
        setShowEditModal(true);
        setOpenMenuTeamId(null);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeam) return;
        setCreateSubmitting(true);
        // Use team_id specifically if available, matching CreateteamV pattern
        const teamId = selectedTeam.team_id ?? selectedTeam.id;
        api.patch(`/api/vendors/vendor-teams/${teamId}`, {
            team_name: editForm.team_name,
            project_id: editForm.project_id ? Number(editForm.project_id) : undefined,
            leader: editForm.leader_id ? Number(editForm.leader_id) : undefined,
            employee: editForm.employee.join(","),
        })
            .then(() => {
                setShowEditModal(false);
                fetchData();
            })
            .finally(() => setCreateSubmitting(false));
    };

    const handleEditMemberToggle = (id: string) => {
        setEditForm(prev => {
            const exists = prev.employee.includes(id);
            if (exists) {
                return { ...prev, employee: prev.employee.filter(e => e !== id) };
            } else {
                return { ...prev, employee: [...prev.employee, id] };
            }
        });
    };

    const getEmployeeName = (id: number | string | undefined) => {
        if (!id) return "";
        return employees.find(e => e.id === Number(id))?.full_name || "";
    };
    const showLimit =
        selectedShow === "All" || selectedShow === "Show"
            ? Number.POSITIVE_INFINITY
            : Math.max(1, Number(selectedShow) || 10);
    const displayedTeams = teams.slice(0, showLimit);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 flex flex-col overflow-hidden bg-white font-gantari">
            <div className="bg-white pb-3 flex-shrink-0 px-6 pt-6">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[24px] font-semibold text-[#000000] font-Gantari">
                        Teams
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowDropdownOpen(!showDropdownOpen)}
                                className="flex items-center gap-4 rounded-md bg-[#E8E8E8] px-4 py-2 text-sm text-[#353535] cursor-pointer min-w-[100px] justify-between"
                            >
                                <span>{selectedShow}</span>
                                <img
                                    src={ArrowDown}
                                    alt="arrow"
                                    className={`h-2.5 w-2.5 transition-transform ${showDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {showDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto custom-scrollbar">
                                    {SHOW_OPTIONS.map((o) => (
                                        <button
                                            key={o}
                                            type="button"
                                            onClick={() => {
                                                setSelectedShow(o);
                                                setShowDropdownOpen(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#F2F2F2] ${selectedShow === o ? "bg-[#F2F2F2] text-[#353535] font-bold" : "text-[#353535]"}`}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer"
                        >
                            <img src={AddBtn} alt="Add" className="h-5 w-5" />
                            Create Team
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayedTeams.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-[#AEACAC52] flex flex-col items-center justify-center gap-4">
                        <p className="text-gray-500 font-medium">No teams found. Start by creating a team.</p>
                    </div>
                ) : (
                    displayedTeams.map(team => {
                        const memberIds = (team.members || "").split(",").filter(Boolean);
                        return (
                            <div key={(team.id ?? team.team_id) as number} className="bg-white rounded-2xl p-6 border border-[#E5E7EB] w-full flex flex-col transition-all hover:shadow-md group relative font-Gantari">
                                {/* Team Name */}
                                <div className="flex flex-col mb-4 pt-1">
                                    <span className="text-[15px] font-medium text-[#999999] mb-1.5">Team Name</span>
                                    <span className="text-[18px] font-bold text-[#353535] pr-8 truncate">
                                        {team.team_name}
                                    </span>
                                </div>

                                <div className="absolute top-6 right-6">
                                    <button
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuTeamId(
                                                openMenuTeamId === (team.id ?? team.team_id)
                                                    ? null
                                                    : ((team.id ?? team.team_id) as number),
                                            );
                                        }}
                                        className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
                                    >
                                        <img src={threeDotsIcon} alt="Options" className="w-[18px] h-auto object-contain" />
                                    </button>
                                    {openMenuTeamId === (team.id ?? team.team_id) && (
                                        <div className="absolute right-0 mt-3 w-[158px] bg-white/20 backdrop-blur rounded-[15px] border border-[#59595980] py-2.5 z-[110] animate-in fade-in zoom-in duration-200 origin-top-right shadow-xl">
                                            <button 
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => { e.stopPropagation(); handleEditClick(team); }}
                                                className="w-full px-5 py-2 flex items-center gap-3 transition-colors text-left group/item cursor-pointer text-[#353535] hover:bg-white/40">
                                                <img src={editIcon} alt="Edit" className="w-5 h-5 [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:brightness(0)_saturate(100%)_invert(24%)_sepia(94%)_saturate(1500%)_hue-rotate(338deg)_brightness(100%)]" />
                                                <span className="text-[16px] font-medium group-hover/item:text-[#DD4342]">Edit</span>
                                            </button>
                                            <button
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete((team.id ?? team.team_id) as number);
                                                    setOpenMenuTeamId(null);
                                                }}
                                                className="w-full px-5 py-2 flex items-center gap-3 transition-colors text-left group/item cursor-pointer text-[#353535] hover:bg-white/40">
                                                <img src={deleteIcon} alt="Delete" className="w-5 h-5 [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:brightness(0)_saturate(100%)_invert(24%)_sepia(94%)_saturate(1500%)_hue-rotate(338deg)_brightness(100%)]" />
                                                <span className="text-[16px] font-medium group-hover/item:text-[#DD4342]">Delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Team Leader */}
                                <div className="flex flex-col mb-5">
                                    <span className="text-[15px] font-medium text-[#999999] mb-1.5">Team Leader</span>
                                    <span className="text-[18px] font-bold text-[#353535] truncate">{getEmployeeName(team.leader_id) || "No Lead"}</span>
                                </div>

                                {/* Divider */}
                                <div className="h-[1px] w-full bg-[#E5E7EB] mb-5"></div>

                                {/* Members + Details */}
                                <div className="mt-auto flex items-center justify-between">
                                    <div>
                                        <div className="flex -space-x-3">
                                            {memberIds.slice(0, 5).map(id => {
                                                const name = getEmployeeName(id);
                                                return (
                                                    <div key={id} className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm flex items-center justify-center" title={name}>
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[10px] font-bold text-slate-600 uppercase">
                                                            {(name || "?")[0]}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {memberIds.length > 5 && (
                                                <div className="w-9 h-9 rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors">
                                                    +{memberIds.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedTeam(team);
                                            setShowDetailsModal(true);
                                        }}
                                        className="flex items-center gap-1.5 text-sm font-semibold text-[#8B8B8B] hover:text-[#353535] transition-colors pr-1 cursor-pointer group/details"
                                    >
                                        Details
                                        <img src={upArrow} alt="Up" className="w-5 h-5 object-contain transition-all duration-200 group-hover/details:brightness-0 group-hover/details:invert-[20%]" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            </div>

            {/* Create Team Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-6 left-6 p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer z-10 hover:bg-gray-200"
                        >
                            <img src={CloseIcon} alt="Close" className="w-5 h-5 object-contain" />
                        </button>
                        <div className="text-center mb-10 pt-4">
                            <h3 className="text-[24px] font-semibold text-[#000000]">Create New Team</h3>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div>
                                <label className="block text-[14px] font-medium text-[#353535] mb-3">Team Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter Team Name"
                                    className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-md text-[14px] text-[#353535] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] focus:border-[#AEACAC52] outline-none transition-all font-Gantari"
                                    value={createForm.team_name}
                                    onChange={e => setCreateForm({ ...createForm, team_name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="relative" ref={createProjectDropdownRef}>
                                <label className="block text-[14px] font-medium text-[#353535] mb-3">Select Project</label>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateProjectDropdown(!showCreateProjectDropdown)}
                                    className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] flex items-center justify-between outline-none transition-all cursor-pointer font-Gantari"
                                >
                                    <span>{projects.find(p => String(p.id) === createForm.project_id)?.project_name || "Select Project"}</span>
                                    <img src={ArrowDown} alt="arrow" className={`h-4 w-4 opacity-60 transition-transform ${showCreateProjectDropdown ? "rotate-180" : ""}`} />
                                </button>
                                {showCreateProjectDropdown && (
                                    <div className="absolute top-full left-0 right-0 z-[110] mt-1 bg-white border border-[#AEACAC52] rounded-[10px] shadow-lg py-2 max-h-36 overflow-y-scroll custom-scrollbar">
                                        {projects.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    setCreateForm({ ...createForm, project_id: String(p.id) });
                                                    setShowCreateProjectDropdown(false);
                                                }}
                                                className="w-full px-5 py-2 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors"
                                            >
                                                {p.project_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={createLeaderDropdownRef}>
                                <label className="block text-[14px] font-medium text-[#353535] mb-3">Select Team Leader</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Select Team Leader"
                                        value={showCreateLeaderDropdown ? createLeaderSearchQuery : (getEmployeeName(createForm.leader_id) || "")}
                                        onChange={(e) => {
                                            setCreateLeaderSearchQuery(e.target.value);
                                            setShowCreateLeaderDropdown(true);
                                        }}
                                        onFocus={() => {
                                            setShowCreateLeaderDropdown(true);
                                            setCreateLeaderSearchQuery("");
                                        }}
                                        className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[5px] text-[14px] text-[#353535] focus:ring-1 focus:ring-[#AEACAC52] outline-none transition-all font-Gantari"
                                    />
                                    <img src={ArrowDown} alt="arrow" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60 pointer-events-none" />
                                </div>
                                {showCreateLeaderDropdown && (
                                    <div className="absolute top-full left-0 right-0 z-[110] mt-1 bg-white border border-[#AEACAC52] rounded-[10px] shadow-lg py-2 max-h-36 overflow-y-scroll custom-scrollbar">
                                        {employees.filter(e => !createLeaderSearchQuery || e.full_name.toLowerCase().includes(createLeaderSearchQuery.toLowerCase())).map(e => (
                                            <button
                                                key={e.id}
                                                type="button"
                                                onClick={() => {
                                                    setCreateForm({ ...createForm, leader_id: String(e.id) });
                                                    setShowCreateLeaderDropdown(false);
                                                }}
                                                className="w-full px-5 py-2 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors font-Gantari"
                                            >
                                                {e.full_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={createMemberDropdownRef}>
                                <label className="block text-[14px] font-medium text-[#353535] mb-3">Select Member</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Select Member"
                                        value={showCreateMemberDropdown ? createMemberSearchQuery : (createForm.employee.length ? `${createForm.employee.length} Member(s) Selected` : "")}
                                        onChange={(e) => {
                                            setCreateMemberSearchQuery(e.target.value);
                                            setShowCreateMemberDropdown(true);
                                        }}
                                        onFocus={() => {
                                            setShowCreateMemberDropdown(true);
                                            setCreateMemberSearchQuery("");
                                        }}
                                        className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[5px] text-[14px] text-[#353535] focus:ring-1 focus:ring-[#AEACAC52] outline-none transition-all font-Gantari"
                                    />
                                    <img src={ArrowDown} alt="arrow" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60 pointer-events-none" />
                                </div>
                                {showCreateMemberDropdown && (
                                    <div className="absolute bottom-full left-0 right-0 z-[110] mb-1 bg-white border border-slate-100 rounded-[10px] shadow-2xl py-2 max-h-36 overflow-y-scroll custom-scrollbar">
                                        {employees.filter(e => !createMemberSearchQuery || e.full_name.toLowerCase().includes(createMemberSearchQuery.toLowerCase())).map(e => (
                                            <div key={e.id} onClick={() => handleCreateMemberToggle(String(e.id))} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#F2F2F2] cursor-pointer transition-colors group">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${createForm.employee.includes(String(e.id)) ? 'bg-[#DD4342] border-[#DD4342]' : 'border-gray-200 group-hover:border-[#DD4342]'}`}>
                                                    {createForm.employee.includes(String(e.id)) && <span className="text-white text-[10px] font-bold">✓</span>}
                                                </div>
                                                <span className="text-[14px] text-[#8B8B8B] group-hover:text-[#353535] font-Gantari font-medium">{e.full_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center gap-6 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-12 py-2 bg-[#F2F2F2] text-[#616161] rounded-md text-[14px] font-medium transition-all hover:bg-gray-200 cursor-pointer font-Gantari"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={createSubmitting}
                                    className="px-12 py-2 bg-[#DD4342] text-white rounded-md text-[14px] font-medium transition-all shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer font-Gantari"
                                >
                                    {createSubmitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Team Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="absolute top-6 left-6 p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer z-10 hover:bg-gray-200"
                        >
                            <img src={CloseIcon} alt="Close" className="w-5 h-5 object-contain" />
                        </button>
                        <div className="text-center mb-10 pt-4">
                            <h3 className="text-[24px] font-semibold text-[#000000]">Edit Team</h3>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-6">
                            {/* Team Name */}
                            <div>
                                <label className="block text-[14px] font-medium text-[#353535] mb-3">Team Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-md text-[14px] text-[#353535] placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-[#AEACAC52] outline-none transition-all"
                                    value={editForm.team_name}
                                    onChange={e => setEditForm({ ...editForm, team_name: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Project Selector */}
                            <div className="relative" ref={editProjectDropdownRef}>
                                <label className="block text-[14px] font-medium text-[#353535] mb-3">Select Project</label>
                                <button
                                    type="button"
                                    onClick={() => setShowEditProjectDropdown(!showEditProjectDropdown)}
                                    className="w-full bg-[#F2F3F4] border border-transparent px-5 py-2 rounded-[5px] text-[14px] text-[#8B8B8B] flex items-center justify-between outline-none transition-all cursor-pointer font-Gantari"
                                >
                                    <span>{projects.find(p => String(p.id) === editForm.project_id)?.project_name || "Select Project"}</span>
                                    <img src={ArrowDown} alt="arrow" className={`h-4 w-4 opacity-60 transition-transform ${showEditProjectDropdown ? "rotate-180" : ""}`} />
                                </button>
                                {showEditProjectDropdown && (
                                    <div className="absolute top-full left-0 right-0 z-[110] mt-1 bg-white border border-[#AEACAC52] rounded-[10px] shadow-lg py-2 max-h-36 overflow-y-scroll custom-scrollbar">
                                        {projects.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    setEditForm({ ...editForm, project_id: String(p.id) });
                                                    setShowEditProjectDropdown(false);
                                                }}
                                                className="w-full px-5 py-2 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors"
                                            >
                                                {p.project_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Leader Searchable Dropdown */}
                            <div className="relative" ref={editLeaderDropdownRef}>
                                <label className="block text-[14px] font-medium text-[#353535] mb-3">Select Team Leader</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Select Team Leader"
                                        value={showEditLeaderDropdown ? leaderSearchQuery : (getEmployeeName(editForm.leader_id) || "")}
                                        onChange={(e) => {
                                            setLeaderSearchQuery(e.target.value);
                                            setShowEditLeaderDropdown(true);
                                        }}
                                        onFocus={() => {
                                            setShowEditLeaderDropdown(true);
                                            setLeaderSearchQuery("");
                                        }}
                                        className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[5px] text-[14px] text-[#353535] focus:ring-1 focus:ring-[#AEACAC52] outline-none transition-all font-Gantari"
                                    />
                                    <img src={ArrowDown} alt="arrow" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60 pointer-events-none" />
                                </div>
                                {showEditLeaderDropdown && (
                                    <div className="absolute top-full left-0 right-0 z-[110] mt-1 bg-white border border-[#AEACAC52] rounded-[10px] shadow-lg py-2 max-h-36 overflow-y-scroll custom-scrollbar">
                                        {employees.filter(e => !leaderSearchQuery || e.full_name.toLowerCase().includes(leaderSearchQuery.toLowerCase())).map(e => (
                                            <button
                                                key={e.id}
                                                type="button"
                                                onClick={() => {
                                                    setEditForm({ ...editForm, leader_id: String(e.id) });
                                                    setShowEditLeaderDropdown(false);
                                                }}
                                                className="w-full px-5 py-2 text-left text-[14px] text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] transition-colors"
                                            >
                                                {e.full_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Member Searchable Checkbox Dropdown */}
                            <div className="relative" ref={editMemberDropdownRef}>
                                <label className="block text-[14px] font-medium text-[#353535] mb-3">Select Member</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Select Member"
                                        value={showEditMemberDropdown ? memberSearchQuery : (editForm.employee.length ? `${editForm.employee.length} Member(s) Selected` : "")}
                                        onChange={(e) => {
                                            setMemberSearchQuery(e.target.value);
                                            setShowEditMemberDropdown(true);
                                        }}
                                        onFocus={() => {
                                            setShowEditMemberDropdown(true);
                                            setMemberSearchQuery("");
                                        }}
                                        className="w-full bg-[#F2F3F4] border border-transparent pl-5 pr-10 py-2 rounded-[5px] text-[14px] text-[#353535] focus:ring-1 focus:ring-[#AEACAC52] outline-none transition-all font-Gantari"
                                    />
                                    <img src={ArrowDown} alt="arrow" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60 pointer-events-none" />
                                </div>
                                {showEditMemberDropdown && (
                                    <div className="absolute bottom-full left-0 right-0 z-[110] mb-1 bg-white border border-slate-100 rounded-[10px] shadow-2xl py-2 max-h-36 overflow-y-scroll custom-scrollbar">
                                        {employees.filter(e => !memberSearchQuery || e.full_name.toLowerCase().includes(memberSearchQuery.toLowerCase())).map(e => (
                                            <div key={e.id} onClick={() => handleEditMemberToggle(String(e.id))} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#F2F2F2] cursor-pointer transition-colors group">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${editForm.employee.includes(String(e.id)) ? 'bg-[#DD4342] border-[#DD4342]' : 'border-gray-200 group-hover:border-[#DD4342]'}`}>
                                                    {editForm.employee.includes(String(e.id)) && <span className="text-white text-[10px] font-bold">✓</span>}
                                                </div>
                                                <span className="text-[14px] text-[#8B8B8B] group-hover:text-[#353535] font-Gantari font-medium">{e.full_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center gap-6 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-12 py-2 rounded-md bg-[#F2F2F2] text-[#616161] text-[14px] font-medium transition-all hover:bg-gray-200 cursor-pointer"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={createSubmitting}
                                    className="px-12 py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[14px] font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm hover:opacity-90"
                                >
                                    {createSubmitting ? "Updating..." : "Update"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedTeam && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[15px] shadow-2xl max-w-[600px] w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 relative overflow-hidden font-Gantari">
                        <button
                            onClick={() => setShowDetailsModal(false)}
                            className="absolute top-8 left-8 p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer z-20 hover:bg-gray-200"
                        >
                            <img src={CloseIcon} alt="Close" className="w-5 h-5 object-contain" />
                        </button>

                        <div className="p-8 pb-3 shrink-0 text-center">
                            <h3 className="text-[22px] font-bold text-[#000000] font-Gantari px-12 uppercase">
                                {selectedTeam.team_name}
                            </h3>
                            <p className="text-[16px] text-slate-500 font-medium mt-1">Team Details</p>
                        </div>

                        <div className="p-8 pt-0 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                {/* Project Section */}
                                <div className="bg-[#F2F2F2] rounded-[10px] p-6 border border-[#AEACAC52]">
                                    <h4 className="text-[14px] font-bold text-[#000000] mb-4 uppercase tracking-wider">
                                        PROJECT
                                    </h4>
                                    <p className="text-[18px] font-semibold text-slate-800">
                                        {selectedTeam.project_name || "N/A"}
                                    </p>
                                </div>

                                {/* Leadership Section */}
                                <div className="bg-[#F2F2F2] rounded-[10px] p-6 border border-[#AEACAC52]">
                                    <h4 className="text-[14px] font-bold text-[#000000] mb-4 uppercase tracking-wider">
                                        LEADERSHIP
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-white rounded-full border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-700 shadow-sm overflow-hidden shrink-0 uppercase">
                                            {(getEmployeeName(selectedTeam.leader_id) || "?")[0]}
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-slate-900 leading-tight">
                                                {getEmployeeName(selectedTeam.leader_id)}
                                            </p>
                                            <p className="text-[14px] text-slate-500 font-medium italic mt-0.5">Team Leader</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Members Section */}
                                <div className="bg-[#F2F2F2] rounded-[10px] p-6 border border-[#AEACAC52]">
                                    <h4 className="text-[14px] font-bold text-[#000000] mb-4 uppercase tracking-wider">
                                        TEAM MEMBERS ({(selectedTeam.members || "").split(",").filter(Boolean).length})
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {(selectedTeam.members || "").split(",").filter(Boolean).map(id => {
                                            const name = getEmployeeName(id);
                                            return (
                                                <div key={id} className="flex items-center gap-3 bg-white p-3 rounded-[10px] border border-slate-100 shadow-sm">
                                                    <div className="w-10 h-10 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-sm font-bold uppercase shrink-0">
                                                        {(name || "?")[0]}
                                                    </div>
                                                    <span className="text-[15px] font-bold text-slate-700 truncate">{name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pb-8"></div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar {
                  scrollbar-width: thin;
                  scrollbar-color: #8c8c8c #f3f3f3;
                }
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: #f3f3f3;
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #8c8c8c;
                  border-radius: 10px;
                  border: 1px solid #f3f3f3;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #666666;
                }
            `}</style>
        </div>
    );
}
