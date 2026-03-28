import { useEffect, useState } from "react";
import api from "../../../lib/api";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import threeDotsIcon from "../../../assets/ProjectManager/CreateTeam/three dots.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
// import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";


interface Team {
    id: number;
    team_name: string;
    project_id?: number;
    project_name?: string;
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
    const SHOW_OPTIONS = ["Show", "10", "50", "100", "All"];
    const [teams, setTeams] = useState<Team[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        team_name: "", project_id: "", leader_id: "", description: ""
    });
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
    const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);

    const [openMenuTeamId, setOpenMenuTeamId] = useState<number | null>(null);
    const [selectedShow, setSelectedShow] = useState<string>("Show");

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.get<{ teams?: Team[] }>("/api/vendors/vendor-teams"),
            api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
            api.get<{ employees?: Employee[] }>("/api/employees")
        ]).then(([teamsRes, projectsRes, employeesRes]) => {
            setTeams(teamsRes.data.teams ?? []);
            setProjects(projectsRes.data.projects ?? []);
            setEmployees(employeesRes.data.employees ?? []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleMember = (id: number) => {
        setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setCreateSubmitting(true);
        api.post("/api/vendors/vendor-teams", {
            ...createForm,
            members: selectedMemberIds.join(",")
        })
            .then(() => {
                setShowCreateModal(false);
                setCreateForm({ team_name: "", project_id: "", leader_id: "", description: "" });
                setSelectedMemberIds([]);
                fetchData();
            })
            .finally(() => setCreateSubmitting(false));
    };

    const handleDelete = (id: number) => {
        if (!confirm("Are you sure you want to delete this team?")) return;
        api.delete(`/api/vendors/vendor-teams/${id}`)
            .then(() => fetchData());
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
                            <select
                                value={selectedShow}
                                onChange={(e) => setSelectedShow(e.target.value)}
                                className="appearance-none rounded-md bg-[#E8E8E8] px-4 py-2 pr-8 text-sm text-[#353535] cursor-pointer"
                            >
                                {SHOW_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                        {o}
                                    </option>
                                ))}
                            </select>
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2"
                            />
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
                    displayedTeams.map(team => (
                        <div key={team.id} className="bg-white rounded-2xl p-6 border border-[#E5E7EB] w-full flex flex-col transition-all hover:shadow-md group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="min-w-0 pr-4">
                                    <p className="text-[15px] font-medium text-[#999999] mb-1.5">Team Name</p>
                                    <h3 className="text-[18px] font-bold text-[#353535] truncate">{team.team_name}</h3>
                                </div>
                                <div className="relative">
                                    <button onClick={() => setOpenMenuTeamId(openMenuTeamId === team.id ? null : team.id)} className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
                                        <img src={threeDotsIcon} alt="Options" className="w-[18px] h-auto object-contain" />
                                    </button>
                                    {openMenuTeamId === team.id && (
                                        <div className="absolute right-[-70px] mt-3 w-[158px] bg-white/20 backdrop-blur-md rounded-xl border border-[#59595980] py-2.5 z-[110] animate-in fade-in zoom-in duration-200 origin-top-right shadow-xl">
                                            <button onClick={() => setOpenMenuTeamId(null)}
                                                className="w-full px-6 py-3 flex items-center gap-4 transition-colors text-left group/item cursor-pointer">
                                                <img src={editIcon} alt="Edit" className="w-5 h-5 [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:brightness(0)_saturate(100%)_invert(24%)_sepia(94%)_saturate(1500%)_hue-rotate(338deg)_brightness(100%)]" />
                                                <span className="text-[16px] font-semibold text-[#616161] group-hover/item:text-[#DD4342]">Edit</span>
                                            </button>
                                            <button onClick={() => { handleDelete(team.id); setOpenMenuTeamId(null); }}
                                                className="w-full px-6 py-3 flex items-center gap-4 transition-colors text-left group/item cursor-pointer">
                                                <img src={deleteIcon} alt="Delete" className="w-5 h-5 [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:brightness(0)_saturate(100%)_invert(24%)_sepia(94%)_saturate(1500%)_hue-rotate(338deg)_brightness(100%)]" />
                                                <span className="text-[16px] font-semibold text-[#616161] group-hover/item:text-[#DD4342]">Delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col mb-5">
                                <span className="text-[15px] font-medium text-[#999999] mb-1.5">Team Leader</span>
                                <span className="text-[18px] font-bold text-[#353535] truncate">{getEmployeeName(team.leader_id) || "No Lead"}</span>
                            </div>
                            <div className="h-[1px] w-full bg-[#E5E7EB] mb-5"></div>

                            <div className="mb-5">
                                <h4 className="text-[15px] font-medium text-[#999999] mb-2">Members</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(team.members || "").split(",").filter(Boolean).map(id => {
                                        const name = getEmployeeName(id);
                                        return (
                                            <div key={id} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100" title={name}>
                                                <div className="w-5 h-5 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-[9px] font-bold">
                                                    {(name || "?")[0]}
                                                </div>
                                                <span className="text-[12px] font-bold text-gray-600">{name}</span>
                                            </div>
                                        );
                                    })}
                                    {!(team.members || "").split(",").filter(Boolean).length && <p className="text-xs text-gray-400">No members assigned</p>}
                                </div>
                            </div>

                            <div className="mt-auto flex items-center justify-end">
                                <button className="text-[13px] font-bold text-[#DD4342] hover:underline transition-all">View Details</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            </div>

            {/* Create Team Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-[600px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-8">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2.5 rounded-xl transition-colors bg-[#F2F3F4] text-gray-500 hover:bg-gray-200"
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <h3 className="text-[24px] font-bold text-[#1E293B]">New Team</h3>
                                <div className="w-10" />
                            </div>
                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[16px] font-medium text-[#000000] block">Team Name *</label>
                                    <input
                                        type="text"
                                        value={createForm.team_name}
                                        onChange={e => setCreateForm({ ...createForm, team_name: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 bg-[#F2F3F4] border border-transparent rounded-xl text-[14px] text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#F2F2F2] transition-all"
                                        placeholder="Enter team name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 relative">
                                        <label className="text-[16px] font-medium text-[#000000] block">Project</label>
                                        <div className="relative">
                                            <select
                                                value={createForm.project_id}
                                                onChange={e => setCreateForm({ ...createForm, project_id: e.target.value })}
                                                className="w-full px-4 py-2 bg-[#F2F3F4] border border-transparent rounded-xl text-[14px] text-[#353535] appearance-none outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#F2F2F2] transition-all cursor-pointer"
                                            >
                                                <option value="" className="text-[#8B8B8B]">Select Project</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                                            </select>
                                            <img src={ArrowDown} alt="arrow" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative">
                                        <label className="text-[16px] font-medium text-[#000000] block">Team/Department</label>
                                        <div className="relative">
                                            <select
                                                className="w-full px-4 py-2 bg-[#F2F3F4] border border-transparent rounded-xl text-[14px] text-[#353535] appearance-none outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#F2F2F2] transition-all cursor-pointer"
                                            >
                                                <option value="" className="text-[#8B8B8B]">Select Team</option>
                                            </select>
                                            <img src={ArrowDown} alt="arrow" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 relative">
                                        <label className="text-[16px] font-medium text-[#000000] block">Assign To</label>
                                        <div className="relative">
                                            <select
                                                value={createForm.leader_id}
                                                onChange={e => setCreateForm({ ...createForm, leader_id: e.target.value })}
                                                className="w-full px-4 py-2 bg-[#F2F3F4] border border-transparent rounded-xl text-[14px] text-[#353535] appearance-none outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#F2F2F2] transition-all cursor-pointer"
                                            >
                                                <option value="" className="text-[#8B8B8B]">Select Leader</option>
                                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                            </select>
                                            <img src={ArrowDown} alt="arrow" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative">
                                        <label className="text-[16px] font-medium text-[#000000] block">Members</label>
                                        <div
                                            onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                                            className="w-full px-4 py-2 bg-[#F2F3F4] rounded-xl min-h-[40px] cursor-pointer flex flex-wrap gap-2 items-center transition-all hover:bg-gray-200 border border-transparent focus-within:border-[#F2F2F2]"
                                        >
                                            {selectedMemberIds.length === 0 ? (
                                                <span className="text-[#8B8B8B] text-[14px]">Select team members</span>
                                            ) : (
                                                selectedMemberIds.map(id => (
                                                    <span key={id} className="bg-white px-2 py-0.5 rounded-md text-[12px] font-bold text-[#353535] shadow-sm flex items-center gap-1.5 border border-gray-100">
                                                        {getEmployeeName(id)}
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleMember(id); }} className="hover:text-red-500 font-bold">×</button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                        {memberDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-50 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                {employees.map(emp => (
                                                    <div key={emp.id} onClick={() => toggleMember(emp.id)}
                                                        className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedMemberIds.includes(emp.id) ? 'bg-[#DD4342] border-[#DD4342]' : 'border-gray-200 group-hover:border-[#DD4342]'}`}>
                                                            {selectedMemberIds.includes(emp.id) && <span className="text-white text-xs font-bold">✓</span>}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700">{emp.full_name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[16px] font-medium text-[#000000] block">Description</label>
                                    <textarea
                                        value={createForm.description}
                                        onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 bg-[#F2F3F4] border border-transparent rounded-xl text-[14px] text-[#353535] placeholder-[#8B8B8B] resize-none outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#F2F2F2] transition-all"
                                        placeholder="Team description..."
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-3 bg-[#F2F3F4] text-[#475569] rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createSubmitting}
                                        className="flex-1 px-4 py-3 bg-[#DD4342] text-white rounded-xl font-bold hover:bg-[#DD4342]/90 shadow-lg shadow-red-100 transition-all disabled:opacity-50"
                                    >
                                        {createSubmitting ? "Creating..." : "Create Team"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
