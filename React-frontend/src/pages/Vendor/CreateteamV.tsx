import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';
import { getGlobalProfileUrl } from '../../lib/profileHelpers';
import { PlusIcon, XMarkIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import threeDotsIcon from '../../assets/ProjectManager/CreateTeam/three dots.svg';
import eyeIcon from '../../assets/ProjectManager/consultant/eyeIcon.svg';

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
    onDelete: (id: number) => void;
    onViewDetails: (team: Team) => void;
}) {
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
        <div className="bg-white rounded-lg p-6 border border-[#E2E8F0] w-full min-h-[220px] flex flex-col transition-all hover:shadow-md group relative font-inter">
            {/* Header: Title and Options */}
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-[17px] font-bold text-[#1E293B] font-sora truncate pr-8">
                    {team.team_name ||
                        team.teamname ||
                        team.leader_name ||
                        getEmp(team.leader)?.full_name ||
                        'Unnamed Team'}
                </h3>
                <div className="absolute top-6 right-6" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
                    >
                        <img src={threeDotsIcon} alt="Options" className="w-[18px] h-auto object-contain" />
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
                                <img src={eyeIcon} alt="View" className="w-5 h-5 [filter:brightness(0)] group-hover/item:[filter:brightness(0)_saturate(100%)_invert(24%)_sepia(94%)_saturate(1500%)_hue-rotate(338deg)_brightness(100%)]" />
                                <span className="text-[16px] font-medium text-[#353535] group-hover/item:text-[#DD4342]">View</span>
                            </button>
                            <button
                                onClick={() => {
                                    onEdit(team);
                                    setShowMenu(false);
                                }}
                                className="w-full px-5 py-2 flex items-center gap-3 transition-colors text-left group/item"
                            >
                                <PencilSquareIcon className="w-5 h-5 text-[#353535] group-hover/item:text-[#DD4342]" />
                                <span className="text-[16px] font-medium text-[#353535] group-hover/item:text-[#DD4342]">Edit</span>
                            </button>
                            <button
                                onClick={() => {
                                    onDelete(team.team_id);
                                    setShowMenu(false);
                                }}
                                className="w-full px-5 py-2 flex items-center gap-3 transition-colors text-left group/item"
                            >
                                <TrashIcon className="w-5 h-5 text-[#353535] group-hover/item:text-[#DD4342]" />
                                <span className="text-[16px] font-medium text-[#353535] group-hover/item:text-[#DD4342]">Delete</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Team Leader */}
            <div className="flex flex-col mb-5">
                <span className="text-[13px] text-[#64748B] mb-1 font-medium">Team Leader</span>
                <span className="text-[15px] font-bold text-[#334155]">
                    {team.leader_name || getEmp(team.leader)?.full_name || 'N/A'}
                </span>
            </div>

            {/* Members */}
            <div className="mt-2 mb-6 flex-1">
                <span className="text-[12px] text-[#64748B] mb-2 block font-medium">Members ({memberIds.length})</span>
                <div className="flex -space-x-1.5">
                    {memberIds.slice(0, 5).map((eid) => {
                        const emp = getEmp(eid);
                        const name = emp?.full_name || 'N/A';
                        const avatarUrl = emp ? getGlobalProfileUrl(emp.id, emp.profile_picture) : '';

                        return (
                            <div
                                key={eid}
                                className="w-8 h-8 rounded-full border border-white bg-[#F8FAFC] flex items-center justify-center text-[11px] font-bold text-[#475569] shadow-sm uppercase overflow-hidden"
                                title={name}
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span>{name[0]}</span>
                                )}
                            </div>
                        );
                    })}
                    {memberIds.length > 5 && (
                        <div className="w-8 h-8 rounded-full border border-white bg-[#F8FAFC] flex items-center justify-center text-[10px] font-bold text-[#64748B] shadow-sm">
                            +{memberIds.length - 5}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

export default function CreateteamV() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMemberDropdown, setShowMemberDropdown] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const memberDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
                setShowMemberDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [form, setForm] = useState({
        leader: '',
        employee: [] as string[],
        project_lead: '',
        team_name: '',
    });

    const [editForm, setEditForm] = useState({
        leader: '',
        employee: [] as string[],
        project_lead: '',
        team_name: '',
    });

    useEffect(() => {
        Promise.all([
            api.get<{ teams?: Team[] }>('/api/vendors/vendor-teams'),
            api.get<{ success?: boolean; resources?: Employee[] }>('/api/vendors/vendor-resource-profiles'),
        ])
            .then(([teamsRes, resourcesRes]) => {
                setTeams(teamsRes.data.teams ?? []);
                setEmployees(resourcesRes.data.resources ?? []);
            })
            .catch(() => {
                setTeams([]);
                setEmployees([]);
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
            project_lead: form.project_lead || undefined
        })
            .then(({ data }) => {
                if (data.success) {
                    setShowAddModal(false);
                    api.get<{ teams?: Team[] }>('/api/vendors/vendor-teams').then(res => setTeams(res.data.teams ?? []));
                    setForm({ leader: '', employee: [], project_lead: '', team_name: '' });
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
        setSelectedTeam(team);
        setEditForm({
            leader: String(team.leader),
            employee: team.employee.split(',').filter(Boolean),
            project_lead: team.project_lead ? String(team.project_lead) : '',
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

    const getEmp = (id: number | string): Employee | undefined => {
        return employees.find(e => e.id === Number(id));
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
        <div className="min-h-screen bg-[#FFFFFF] font-inter">
            {/* Header section */}
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-[24px] font-bold text-[#1E293B] font-sora">Create Team</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-[#DD4342] text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm"
                >
                    <PlusIcon className="w-5 h-5 stroke-[2.5]" />
                    <span>Create Team</span>
                </button>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {teams.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-[#F8FAFC] rounded-2xl border-2 border-dashed border-[#E2E8F0]">
                        <p className="text-[#64748B] text-[17px] font-medium font-sora">No teams created yet.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-4 text-[#DD4342] font-bold hover:underline"
                        >
                            Create your first team
                        </button>
                    </div>
                ) : (
                    teams.map((team) => (
                        <TeamCard
                            key={team.team_id}
                            team={team}
                            getEmp={getEmp}
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

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[22px] font-bold text-[#1E293B] font-sora">New Team</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors bg-[#F2F2F2] text-black">
                                    <XMarkIcon className="w-6 h-6 stroke-[2.5]" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[14px] font-bold text-[#475569] block">Team Name</label>
                                    <input
                                        type="text"
                                        value={form.team_name}
                                        onChange={(e) => setForm({ ...form, team_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg focus:ring-1 focus:ring-[#DD4342] transition-all text-[#1E293B] font-medium"
                                        placeholder="Enter team name"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[14px] font-bold text-[#475569] block">Team Leader</label>
                                    <select
                                        value={form.leader}
                                        onChange={(e) => setForm({ ...form, leader: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg focus:ring-1 focus:ring-[#DD4342] transition-all text-[#1E293B] font-medium appearance-none"
                                        required
                                    >
                                        <option value="">Select Leader</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2 relative" ref={memberDropdownRef}>
                                    <label className="text-[14px] font-bold text-[#475569] block">Add Members</label>
                                    <div
                                        onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                                        className="w-full px-4 py-3 bg-[#F2F2F2] rounded-lg min-h-[48px] cursor-pointer flex flex-wrap gap-2 items-center"
                                    >
                                        {form.employee.length === 0 ? (
                                            <span className="text-gray-400 font-medium">Select teammates</span>
                                        ) : (
                                            form.employee.map(eid => {
                                                const emp = getEmp(eid);
                                                return (
                                                <span key={eid} className="bg-white px-2.5 py-1 rounded-md text-[13px] font-bold text-[#1E293B] shadow-sm flex items-center gap-1.5 border border-[#E2E8F0]">
                                                    {emp?.full_name || 'N/A'}
                                                    <XMarkIcon
                                                        onClick={(e) => { e.stopPropagation(); handleMemberToggle(eid); }}
                                                        className="w-3.5 h-3.5 cursor-pointer hover:text-red-500"
                                                    />
                                                </span>
                                            )})
                                        )}
                                    </div>

                                    {showMemberDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-[#E2E8F0] p-3 z-50 max-h-[220px] overflow-y-auto custom-scrollbar">
                                            {employees.filter(emp => String(emp.id) !== form.leader).map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => handleMemberToggle(String(emp.id))}
                                                    className="flex items-center gap-3 p-2.5 hover:bg-[#F8FAFC] rounded-lg cursor-pointer transition-colors"
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${form.employee.includes(String(emp.id)) ? 'bg-[#DD4342] border-[#DD4342]' : 'border-[#CBD5E1]'}`}>
                                                        {form.employee.includes(String(emp.id)) && <PlusIcon className="w-3.5 h-3.5 text-white rotate-45 stroke-[3]" />}
                                                    </div>
                                                    <span className="text-[15px] font-medium text-[#334155]">{emp.full_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-3 bg-[#F2F2F2] text-[#475569] rounded-lg font-bold hover:bg-[#E2E8F0] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 px-4 py-3 bg-[#DD4342] text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50"
                                    >
                                        {submitting ? 'Creating...' : 'Create Team'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[22px] font-bold text-[#1E293B] font-sora">Edit Team</h3>
                                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors bg-[#F2F2F2] text-black">
                                    <XMarkIcon className="w-6 h-6 stroke-[2.5]" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[14px] font-bold text-[#475569] block">Team Name</label>
                                    <input
                                        type="text"
                                        value={editForm.team_name}
                                        onChange={(e) => setEditForm({ ...editForm, team_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg focus:ring-1 focus:ring-[#DD4342] transition-all text-[#1E293B] font-medium"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[14px] font-bold text-[#475569] block">Team Leader</label>
                                    <select
                                        value={editForm.leader}
                                        onChange={(e) => setEditForm({ ...editForm, leader: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#F2F2F2] border-none rounded-lg focus:ring-1 focus:ring-[#DD4342] transition-all text-[#1E293B] font-medium appearance-none"
                                        required
                                    >
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2 relative" ref={memberDropdownRef}>
                                    <label className="text-[14px] font-bold text-[#475569] block">Members</label>
                                    <div
                                        onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                                        className="w-full px-4 py-3 bg-[#F2F2F2] rounded-lg min-h-[48px] cursor-pointer flex flex-wrap gap-2 items-center"
                                    >
                                        {editForm.employee.map(eid => {
                                            const emp = getEmp(eid);
                                            return (
                                            <span key={eid} className="bg-white px-2.5 py-1 rounded-md text-[13px] font-bold text-[#1E293B] shadow-sm flex items-center gap-1.5 border border-[#E2E8F0]">
                                                {emp?.full_name || 'N/A'}
                                                <XMarkIcon
                                                    onClick={(e) => { e.stopPropagation(); handleMemberToggle(eid, true); }}
                                                    className="w-3.5 h-3.5 cursor-pointer hover:text-red-500"
                                                />
                                            </span>
                                        )})}
                                    </div>

                                    {showMemberDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-[#E2E8F0] p-3 z-50 max-h-[220px] overflow-y-auto custom-scrollbar">
                                            {employees.filter(emp => String(emp.id) !== editForm.leader).map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => handleMemberToggle(String(emp.id), true)}
                                                    className="flex items-center gap-3 p-2.5 hover:bg-[#F8FAFC] rounded-lg cursor-pointer transition-colors"
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${editForm.employee.includes(String(emp.id)) ? 'bg-[#DD4342] border-[#DD4342]' : 'border-[#CBD5E1]'}`}>
                                                        {editForm.employee.includes(String(emp.id)) && <PlusIcon className="w-3.5 h-3.5 text-white rotate-45 stroke-[3]" />}
                                                    </div>
                                                    <span className="text-[15px] font-medium text-[#334155]">{emp.full_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 px-4 py-3 bg-[#F2F2F2] text-[#475569] rounded-lg font-bold hover:bg-[#E2E8F0] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 px-4 py-3 bg-[#DD4342] text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50"
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
                    <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[22px] font-bold text-[#1E293B] font-sora">Team Details</h3>
                                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors bg-[#F2F2F2] text-black">
                                    <XMarkIcon className="w-6 h-6 stroke-[2.5]" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[13px] text-[#64748B] block mb-1 font-medium">Team Name</label>
                                    <div className="text-[18px] font-bold text-[#1E293B]">{selectedTeam.team_name || selectedTeam.teamname || 'Unnamed Team'}</div>
                                </div>

                                <div>
                                    <label className="text-[13px] text-[#64748B] block mb-1 font-medium">Team Leader</label>
                                    <div className="flex items-center gap-3 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                                        {(() => {
                                            const emp = getEmp(selectedTeam.leader);
                                            const name = emp?.full_name || 'N/A';
                                            const avatarUrl = emp ? getGlobalProfileUrl(emp.id, emp.profile_picture) : '';
                                            return (
                                                <>
                                                    <div className="w-10 h-10 rounded-full bg-[#DD4342] text-white flex items-center justify-center font-bold overflow-hidden">
                                                        {avatarUrl ? (
                                                            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span>{name[0]}</span>
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-[#334155]">{name}</div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[13px] text-[#64748B] block mb-2 font-medium">Members ({selectedTeam.employee.split(',').filter(Boolean).length})</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedTeam.employee.split(',').filter(Boolean).map(eid => {
                                            const emp = getEmp(eid);
                                            const name = emp?.full_name || 'N/A';
                                            const avatarUrl = emp ? getGlobalProfileUrl(emp.id, emp.profile_picture) : '';
                                            return (
                                                <div key={eid} className="flex items-center gap-2.5 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#F1F5F9]">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600 overflow-hidden">
                                                        {avatarUrl ? (
                                                            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span>{name[0]}</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[14px] font-bold text-[#475569]">{name}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="w-full py-3 bg-[#DD4342] text-white rounded-lg font-bold hover:opacity-90 transition-opacity"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
