import { useEffect, useState, useRef } from "react";
import api from "../../../lib/api";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import threeDotsIcon from "../../../assets/ProjectManager/CreateTeam/three dots.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import eyeIcon from "../../../assets/ProjectManager/consultant/eyeIcon.svg";
import upArrow from "../../../assets/TechnicalDirector/upArrow.svg";

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
                    {team.team_name || team.teamname || team.leader_name || getEmpName(team.leader) || "Untitled Team"}
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
                    {team.leader_name || getEmpName(team.leader)}
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
                    className="flex items-center gap-1.5 text-sm font-semibold hover:text-[#353535] pr-1 cursor-pointer  transition-colors"
                >
                    Details
                    <img src={upArrow} alt="Up" className="w-5 h-5 object-contain rotate-5" />
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
            api.get<{ employees?: Employee[] }>('/api/employees'),
            api.get<{ projects?: Project[] }>('/api/vendors/vendor-projects')
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
                    // Refresh data instead of page reload for better UX
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
        <div className="h-full flex flex-col p-2 font-Gantari">
            {/* Header section */}
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-[24px] font-semibold text-[#000000] font-Gantari">Create Team</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md transition-all font-semibold shadow-lg shadow-red-200 cursor-pointer"
                >
                    <PlusIcon className="w-5 h-5 stroke-[3]" />
                    New Team
                </button>
            </div>

            {/* Teams Grid */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {teams.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-[#AEACAC52] flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center">
                                <PlusIcon className="w-8 h-8 text-[#94A3B8]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#1E293B]">No teams found</h3>
                                <p className="text-[#64748B]">Click "New Team" to get started.</p>
                            </div>
                        </div>
                    ) : (
                        teams.map((team) => (
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
                        ))
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-2xl max-w-[564px] w-full p-6 animate-in zoom-in-95 duration-200 relative overflow-visible my-auto">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-8 left-8 p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer z-10"
                        >
                            <XMarkIcon className="w-5 h-5 text-black stroke-[2]" />
                        </button>

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
                                                {employees
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
                                                {employees
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
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="absolute top-8 left-8 p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer z-10"
                        >
                            <XMarkIcon className="w-5 h-5 text-black stroke-[2]" />
                        </button>
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
                                        onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value })}
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
                                        {employees.map(emp => (
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
                                            {employees.filter(emp => String(emp.id) !== editForm.leader).map(emp => (
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
                        <button
                            onClick={() => setShowDetailsModal(false)}
                            className="absolute top-8 left-8 p-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer z-10"
                        >
                            <XMarkIcon className="w-5 h-5 text-black stroke-[2]" />
                        </button>
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
                                    <label className="text-[16px] font-gantari block mb-1 font-medium">Project</label>
                                    <div className="text-[14px] font-gantari bg-[#F2F3F4] border-2 border-[#AEACAC52] py-3 px-2 rounded-lg">{selectedTeam.project_name || 'N/A'}</div>
                                </div>

                                <div>
                                    <label className="text-[16px] font-gantari block mb-1 font-medium">Team Leader</label>
                                    <div className="flex items-center gap-3 bg-[#F2F3F4] border-2 border-[#AEACAC52] py-3 px-2 rounded-xl">
                                        <div className="w-10 h-10 rounded-full bg-[#DD4342] text-white flex items-center justify-center font-gantari font-medium uppercase">
                                            {(selectedTeam.leader_name || getEmpName(selectedTeam.leader) || 'L')[0]}
                                        </div>
                                        <div className="font-gantari font-medium text-[#334155]">{selectedTeam.leader_name || getEmpName(selectedTeam.leader)}</div>
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
