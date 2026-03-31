import { useEffect, useState } from "react";
import api from "../../../lib/api";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import threeDotsIcon from "../../../assets/ProjectManager/CreateTeam/three dots.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import eyeIcon from "../../../assets/ProjectManager/consultant/eyeIcon.svg";
import upArrow from "../../../assets/TechnicalDirector/upArrow.svg";
// import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";


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
        team_name: "", project_id: "", leader_id: "", description: ""
    });
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
    const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
    const [leaderDropdownOpen, setLeaderDropdownOpen] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);

    const [openMenuTeamId, setOpenMenuTeamId] = useState<number | null>(null);
    const [selectedShow, setSelectedShow] = useState<string>("Show");
    const [showDropdownOpen, setShowDropdownOpen] = useState(false);

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

    const toggleMember = (id: number) => {
        setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setCreateSubmitting(true);
        api.post("/api/vendors/vendor-teams", {
            team_name: createForm.team_name,
            project_id: createForm.project_id || undefined,
            leader: createForm.leader_id ? Number(createForm.leader_id) : undefined,
            employee: selectedMemberIds.join(","),
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
                                        onClick={() =>
                                            setOpenMenuTeamId(
                                                openMenuTeamId === (team.id ?? team.team_id)
                                                    ? null
                                                    : ((team.id ?? team.team_id) as number),
                                            )
                                        }
                                        className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
                                    >
                                        <img src={threeDotsIcon} alt="Options" className="w-[18px] h-auto object-contain" />
                                    </button>
                                    {openMenuTeamId === (team.id ?? team.team_id) && (
                                        <div className="absolute right-0 mt-3 w-[158px] bg-white/20 backdrop-blur rounded-[15px] border border-[#59595980] py-2.5 z-[110] animate-in fade-in zoom-in duration-200 origin-top-right shadow-xl">
                                            <button onClick={() => setOpenMenuTeamId(null)}
                                                className="w-full px-5 py-2 flex items-center gap-3 transition-colors text-left group/item cursor-pointer">
                                                <img src={eyeIcon} alt="View" className="w-5 h-5 [filter:brightness(0)] group-hover/item:[filter:brightness(0)_saturate(100%)_invert(24%)_sepia(94%)_saturate(1500%)_hue-rotate(338deg)_brightness(100%)]" />
                                                <span className="text-[16px] font-medium text-[#353535] group-hover/item:text-[#DD4342]">View</span>
                                            </button>
                                            <button onClick={() => setOpenMenuTeamId(null)}
                                                className="w-full px-5 py-2 flex items-center gap-3 transition-colors text-left group/item cursor-pointer text-[#353535] group-hover/item:text-[#DD4342]">
                                                <img src={editIcon} alt="Edit" className="w-5 h-5 [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover/item:[filter:brightness(0)_saturate(100%)_invert(24%)_sepia(94%)_saturate(1500%)_hue-rotate(338deg)_brightness(100%)]" />
                                                <span className="text-[16px] font-medium group-hover/item:text-[#DD4342]">Edit</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleDelete((team.id ?? team.team_id) as number);
                                                    setOpenMenuTeamId(null);
                                                }}
                                                className="w-full px-5 py-2 flex items-center gap-3 transition-colors text-left group/item cursor-pointer text-[#353535] group-hover/item:text-[#DD4342]">
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
                                        className="flex items-center gap-1.5 text-sm font-semibold text-[#8B8B8B] pr-1 cursor-pointer"
                                    >
                                        Details
                                        <img src={upArrow} alt="Up" className="w-5 h-5 object-contain" />
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
                    <div className="bg-white rounded-3xl w-full max-w-[600px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-8">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2.5 rounded-xl transition-colors bg-[#F2F3F4] text-gray-500 hover:bg-gray-200 cursor-pointer"
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <h3 className="text-[24px] font-bold text-[#1E293B]">Create New Team</h3>
                                <div className="w-10" />
                            </div>
                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[16px] font-medium text-[#000000] block">Team Name</label>
                                    <input
                                        type="text"
                                        value={createForm.team_name}
                                        onChange={e => setCreateForm({ ...createForm, team_name: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 bg-[#F2F3F4] border border-transparent rounded-xl text-[14px] text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#F2F2F2] transition-all"
                                        placeholder="Enter Team Name"
                                    />
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-[16px] font-medium text-[#000000] block">Select Project</label>
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
                                    <label className="text-[16px] font-medium text-[#000000] block">Select Team Leader</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setLeaderDropdownOpen(!leaderDropdownOpen)}
                                            className="w-full px-4 py-2 bg-[#F2F3F4] border border-transparent rounded-xl text-[14px] text-[#353535] flex items-center justify-between outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#F2F2F2] transition-all cursor-pointer"
                                        >
                                            <span className={!createForm.leader_id ? "text-[#8B8B8B]" : ""}>
                                                {getEmployeeName(createForm.leader_id) || "Select Team Leader"}
                                            </span>
                                            <img
                                                src={ArrowDown}
                                                alt="arrow"
                                                className={`h-4 w-4 opacity-60 transition-transform ${leaderDropdownOpen ? "rotate-180" : ""}`}
                                            />
                                        </button>
                                        {leaderDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 z-[210] mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-40 overflow-y-auto custom-scrollbar">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCreateForm({ ...createForm, leader_id: "" });
                                                        setLeaderDropdownOpen(false);
                                                    }}
                                                    className="block w-full text-left px-4 py-2 text-sm text-[#8B8B8B] hover:bg-[#F2F2F2]"
                                                >
                                                    Select Team Leader
                                                </button>
                                                {employees.map((emp) => (
                                                    <button
                                                        key={emp.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setCreateForm({ ...createForm, leader_id: emp.id.toString() });
                                                            setLeaderDropdownOpen(false);
                                                        }}
                                                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#F2F2F2] ${createForm.leader_id === emp.id.toString() ? "bg-[#F2F2F2] font-bold" : "text-[#353535]"}`}
                                                    >
                                                        {emp.full_name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-[16px] font-medium text-[#000000] block">Select Member</label>
                                    <div
                                        onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                                        className="w-full px-4 py-2 bg-[#F2F3F4] rounded-xl min-h-[40px] cursor-pointer flex flex-wrap gap-2 items-center justify-between transition-all hover:bg-gray-200 border border-transparent focus-within:border-[#F2F2F2]"
                                    >
                                        <div className="flex flex-wrap gap-2">
                                            {selectedMemberIds.length === 0 ? (
                                                <span className="text-[#8B8B8B] text-[14px]">Select Member</span>
                                            ) : (
                                                selectedMemberIds.map(id => (
                                                    <span key={id} className="bg-white px-2 py-0.5 rounded-md text-[12px] font-bold text-[#353535] shadow-sm flex items-center gap-1.5 border border-gray-100">
                                                        {getEmployeeName(id)}
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleMember(id); }} className="hover:text-red-500 font-bold cursor-pointer">×</button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                        <img src={ArrowDown} alt="arrow" className="h-4 w-4 opacity-60" />
                                    </div>
                                    {memberDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-50 max-h-40 overflow-y-auto custom-scrollbar">
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

                                <div className="flex justify-center gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-10 py-2 bg-[#F2F2F2] text-[#353535] rounded-lg font-bold hover:bg-gray-200 transition-colors cursor-pointer"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createSubmitting}
                                        className="px-10 py-2 bg-[#DBE9FE] text-[#353535] rounded-lg font-bold hover:bg-blue-200 transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {createSubmitting ? "Submitting..." : "Submit"}
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
