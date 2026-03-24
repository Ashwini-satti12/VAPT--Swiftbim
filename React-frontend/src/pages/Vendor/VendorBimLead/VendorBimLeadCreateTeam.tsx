import { useEffect, useState } from "react";
import api from "../../../lib/api";
import { FaPlus, FaEllipsisV, FaRegTrashAlt } from "react-icons/fa";
import { BiEdit } from "react-icons/bi";


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
}

export default function VendorBimLeadCreateTeam() {
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

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    return (
        <div className="bg-white min-h-full font-gantari p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#1A1A1A]">Teams</h2>
                    <p className="text-sm text-gray-500">Manage project teams and members</p>
                </div>
                <button onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center gap-2 bg-[#DD4342] text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm text-sm">
                    <FaPlus className="text-xs" />
                    Create Team
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {teams.length === 0 ? (
                    <div className="col-span-full py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                        <p className="text-gray-500 font-medium">No teams found. Start by creating a team.</p>
                    </div>
                ) : (
                    teams.map(team => (
                        <div key={team.id} className="bg-white border border-gray-200 rounded-3xl p-6 hover:shadow-lg transition-all flex flex-col relative group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="min-w-0 pr-4">
                                    <h3 className="text-xl font-bold text-[#1A1A1A] truncate mb-1 group-hover:text-[#DD4342] transition-colors">{team.team_name}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{team.project_name || "General Team"}</p>
                                </div>
                                <div className="relative">
                                    <button onClick={() => setOpenMenuTeamId(openMenuTeamId === team.id ? null : team.id)} className="p-2 text-gray-300 hover:text-gray-600 transition-colors">
                                        <FaEllipsisV />
                                    </button>
                                    {openMenuTeamId === team.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200 origin-top-right">
                                            <button onClick={() => setOpenMenuTeamId(null)}
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-gray-600 font-semibold text-sm transition-colors"><BiEdit /> Edit Team</button>
                                            <button onClick={() => { handleDelete(team.id); setOpenMenuTeamId(null); }}
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-red-500 font-semibold text-sm transition-colors"><FaRegTrashAlt /> Delete Team</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Members</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(team.members || "").split(",").filter(Boolean).map(id => {
                                        const name = getEmployeeName(id);
                                        return (
                                            <div key={id} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm" title={name}>
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

                            <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lead</span>
                                    <span className="text-sm font-bold text-[#1A1A1A]">{getEmployeeName(team.leader_id) || "No Lead"}</span>
                                </div>
                                <button className="text-[13px] font-bold text-[#DD4342] hover:underline transition-all">View Details</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Team Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-[600px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[22px] font-bold text-[#1E293B]">New Team</h3>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors bg-[#F2F2F2]">
                                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[14px] font-bold text-[#475569] block">Team Name *</label>
                                    <input type="text" value={createForm.team_name} onChange={e => setCreateForm({ ...createForm, team_name: e.target.value })} required
                                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-xl focus:ring-1 focus:ring-[#DD4342] text-[#1E293B] font-medium" placeholder="Enter team name" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 relative">
                                        <label className="text-[14px] font-bold text-[#475569] block">Project</label>
                                        <select value={createForm.project_id} onChange={e => setCreateForm({ ...createForm, project_id: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-xl text-[#1E293B] font-medium appearance-none outline-none">
                                            <option value="">Select Project</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2 relative">
                                        <label className="text-[14px] font-bold text-[#475569] block">Team Lead</label>
                                        <select value={createForm.leader_id} onChange={e => setCreateForm({ ...createForm, leader_id: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-xl text-[#1E293B] font-medium appearance-none outline-none">
                                            <option value="">Select Leader</option>
                                            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2 relative">
                                    <label className="text-[14px] font-bold text-[#475569] block">Members</label>
                                    <div onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                                        className="w-full px-4 py-3 bg-[#F2F2F2] rounded-xl min-h-[48px] cursor-pointer flex flex-wrap gap-2 items-center transition-colors hover:bg-gray-200">
                                        {selectedMemberIds.length === 0 ? (
                                            <span className="text-gray-400 font-medium">Select team members</span>
                                        ) : (
                                            selectedMemberIds.map(id => (
                                                <span key={id} className="bg-white px-2.5 py-1 rounded-md text-[13px] font-bold text-[#1E293B] shadow-sm flex items-center gap-1.5 border border-gray-100">
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
                                <div className="space-y-2">
                                    <label className="text-[14px] font-bold text-[#475569] block">Description</label>
                                    <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} rows={3}
                                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-xl text-[#1E293B] font-medium resize-none outline-none" placeholder="Team description..." />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-3 bg-[#F2F2F2] text-[#475569] rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                                    <button type="submit" disabled={createSubmitting}
                                        className="flex-1 px-4 py-3 bg-[#DD4342] text-white rounded-xl font-bold hover:bg-[#DD4342]/90 shadow-lg shadow-red-100 transition-all disabled:opacity-50">
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
