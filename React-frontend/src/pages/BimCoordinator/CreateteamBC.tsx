import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';
import { PlusIcon, ArrowUpRightIcon, XMarkIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import threeDotsIcon from '../../assets/ProjectManager/CreateTeam/three dots.svg';

interface Employee {
    id: number;
    full_name: string;
    email: string;
}

interface Team {
    team_id: number;
    team_name?: string;
    leader: number;
    leader_name?: string;
    employee: string;
    project_lead?: number;
}

const Gauge = ({ percentage }: { percentage: number }) => {
    const diameter = 66;
    const radius = diameter / 2;
    const strokeWidth = 8;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const color = percentage >= 85 ? '#00B633' : percentage >= 70 ? '#008F22' : '#EB7200';

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: '70px', height: '70px' }}>
            <svg height={diameter} width={diameter} className="transform -rotate-90">
                <circle
                    stroke="#F1F5F9"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke={color}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    style={{ strokeDashoffset }}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <span
                className="absolute text-[16px] font-bold text-[#1E293B] flex items-center justify-center"
                style={{ width: '44px', height: '24px' }}
            >
                {percentage}%
            </span>
        </div>
    );
};

function TeamCard({ team, getEmpName, onEdit }: { team: Team; getEmpName: (id: number | string) => string; onEdit: (team: Team) => void }) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const completion = 50 + (team.team_id % 45);
    const status = completion >= 85 ? 'Excellent' : completion >= 70 ? 'Good' : 'Average';
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
        <div className="bg-white rounded-[10px] p-6 border border-[#AEACAC52] w-full max-w-[347px] h-[254px] flex flex-col transition-all hover:shadow-lg group shrink-0 relative">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[18px] font-bold text-[#1E293B] truncate pr-8">
                    {team.team_name || team.leader_name || getEmpName(team.leader)}
                </h3>
                <div className="absolute top-6 right-6" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
                    >
                        <img src={threeDotsIcon} alt="Options" className="w-[18px] h-auto object-contain" style={{ width: '18px' }} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-[-70px] mt-3 w-[158px] bg-[#FFFFFF] rounded-[15px] shadow-[0px_10px_30px_rgba(0,0,0,0.1)] border border-[#59595980]/50 py-2.5 z-[110] animate-in fade-in zoom-in duration-200 origin-top-right">
                            <button
                                onClick={() => {
                                    onEdit(team);
                                    setShowMenu(false);
                                }}
                                className="w-full px-5 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group/item"
                            >
                                <PencilSquareIcon className="w-5 h-5 text-[#DD4342]" />
                                <span className="text-[18px] font-medium text-[#DD4342]">Edit</span>
                            </button>
                            <button className="w-full px-5 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group/item">
                                <TrashIcon className="w-5 h-5 text-[#616161]" />
                                <span className="text-[18px] font-medium text-[#616161]">Delete</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-8 mb-6">
                <Gauge percentage={completion} />
                <div className="flex flex-col">
                    <span
                        className="text-[15px] font-gantari text-[#8B8B8B] font-Gantari leading-none mb-1.5"
                        style={{ width: '97px', height: '18px' }}
                    >
                        Completion
                    </span>
                    <span
                        className="text-[24px] font-gantari text-[#353535] font-Gantari leading-none"
                        style={{ height: '29px' }}
                    >
                        {status}
                    </span>
                </div>
            </div>

            <div className="h-px bg-[#F1F5F9] w-full mb-6" />

            <div className="mt-auto flex justify-between items-center">
                <div className="flex -space-x-2">
                    {memberIds.slice(0, 4).map((eid) => (
                        <div
                            key={eid}
                            className="w-9 h-9 rounded-full border-2 border-white bg-[#F1F5F9] flex items-center justify-center text-[10px] font-bold text-[#64748B] overflow-hidden shadow-sm"
                            title={getEmpName(eid)}
                        >
                            <span className="uppercase">{getEmpName(eid)[0]}</span>
                        </div>
                    ))}
                    {memberIds.length > 4 && (
                        <div className="w-9 h-9 rounded-full border-2 border-white bg-[#F8FAFC] flex items-center justify-center text-[9px] font-bold text-[#94A3B8] border-dashed shadow-sm">
                            +{memberIds.length - 4}
                        </div>
                    )}
                </div>

                <button className="flex items-center gap-1.5 text-[#8B8B8B] font-gantari text-[16px] transition-colors group/btn">
                    Details
                    <ArrowUpRightIcon className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </button>
            </div>
        </div>
    );
}

export default function CreateteamBC() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMemberDropdown, setShowMemberDropdown] = useState(false);
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
            api.get<{ teams?: Team[] }>('/api/teams'),
            api.get<{ employees?: Employee[] }>('/api/employees')
        ])
            .then(([teamsRes, empsRes]) => {
                setTeams(teamsRes.data.teams ?? []);
                setEmployees(empsRes.data.employees ?? []);
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

        api.post('/api/teams', {
            team_name: form.team_name,
            leader: form.leader,
            employee: form.employee.join(','),
            project_lead: form.project_lead || undefined
        })
            .then(({ data }) => {
                if (data.success) {
                    setShowAddModal(false);
                    // Refresh data instead of page reload for better UX
                    api.get<{ teams?: Team[] }>('/api/teams').then(res => setTeams(res.data.teams ?? []));
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
            team_name: team.team_name || '',
        });
        setShowEditModal(true);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeam || !editForm.leader) return;
        setSubmitting(true);

        api.patch(`/api/teams/${selectedTeam.team_id}`, {
            team_name: editForm.team_name,
            leader: editForm.leader,
            employee: editForm.employee.join(','),
            project_lead: editForm.project_lead || 0,
        })
            .then(({ data }) => {
                if (data.success) {
                    setShowEditModal(false);
                    api.get<{ teams?: Team[] }>('/api/teams').then(res => setTeams(res.data.teams ?? []));
                }
            })
            .catch(() => { })
            .finally(() => setSubmitting(false));
    };

    const getEmpName = (id: number | string) => {
        const e = employees.find(emp => emp.id == id);
        return e ? e.full_name : 'Unknown';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-[#1E293B]">Team</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#DD4342] text-white rounded-xl hover:bg-[#C53030] transition-all font-bold shadow-lg shadow-red-200 active:scale-95"
                >
                    <PlusIcon className="w-5 h-5 stroke-[3]" />
                    New Team
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        teams.map(team => (
                            <TeamCard key={team.team_id} team={team} getEmpName={getEmpName} onEdit={handleEditClick} />
                        ))
                    )}
                </div>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="bg-white rounded-[20px] shadow-2xl max-w-[564px] w-full p-10 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-8 left-8 p-3 bg-[#F8FAFC] rounded-[8px] text-[#1E293B] hover:bg-gray-100 transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6 stroke-[2.5]" />
                        </button>

                        <div className="text-center mb-10">
                            <h3 className="text-[28px] font-medium text-[#000000]">Create New Team</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[18px] font-medium text-[#000000] mb-3">Team Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter Team Name"
                                    className="w-full bg-[#F3F4F6] border-none px-5 py-4 rounded-[10px] text-[16px] text-[#1E293B] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-gray-300 outline-none transition-all"
                                    value={form.team_name}
                                    onChange={(e) => setForm({ ...form, team_name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[18px] font-medium text-[#000000] mb-3">Select Team Leader</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#F3F4F6] border-none px-5 py-4 rounded-[10px] text-[16px] text-[#1E293B] appearance-none focus:ring-1 focus:ring-gray-300 outline-none transition-all cursor-pointer"
                                        value={form.leader}
                                        onChange={(e) => setForm({ ...form, leader: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Team Leader</option>
                                        {employees.map(e => (
                                            <option key={e.id} value={e.id}>{e.full_name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[18px] font-medium text-[#000000] mb-3">Select Member</label>
                                <div className="relative" ref={memberDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                                        className="w-full bg-[#F3F4F6] border-none px-5 py-4 rounded-[10px] text-[16px] text-[#1E293B] flex justify-between items-center focus:ring-1 focus:ring-gray-300 outline-none transition-all"
                                    >
                                        <span className={form.employee.length === 0 ? "text-[#9CA3AF]" : "text-[#1E293B]"}>
                                            {form.employee.length === 0
                                                ? "Select Member"
                                                : `${form.employee.length} Member(s) Selected`}
                                        </span>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-200 ${showMemberDropdown ? 'rotate-180' : ''}`}>
                                            <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    {showMemberDropdown && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-[#F3F4F6] rounded-[10px] shadow-lg border border-gray-100 py-3 z-[110] animate-in fade-in zoom-in duration-200 origin-top max-h-60 overflow-y-auto no-scrollbar">
                                            {employees.map(e => (
                                                <label key={e.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-100 cursor-pointer transition-colors group">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.employee.includes(String(e.id))}
                                                        onChange={() => handleMemberToggle(String(e.id))}
                                                        className="w-5 h-5 rounded border-gray-300 text-[#000000] focus:ring-0 cursor-pointer"
                                                    />
                                                    <span className="text-[16px] text-[#1E293B] group-hover:text-black">{e.full_name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-center gap-6 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-12 py-3.5 bg-[#F1F1F1] text-[#616161] rounded-[8px] text-[20px] font-medium hover:bg-gray-200 transition-all active:scale-[0.98]"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-12 py-3.5 bg-[#DDEBFF] text-[#000000] rounded-[8px] text-[20px] font-medium hover:bg-[#CFE3FF] transition-all disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="bg-white rounded-[20px] shadow-2xl max-w-[564px] w-full p-10 animate-in zoom-in-95 duration-200 relative">
                        {/* Close button in top left as per image */}
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="absolute top-8 left-8 p-3 bg-[#F8FAFC] rounded-[8px] text-[#1E293B] hover:bg-gray-100 transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6 stroke-[2.5]" />
                        </button>

                        <div className="text-center mb-10">
                            <h3 className="text-[28px] font-medium text-[#000000]">Edit Team Details</h3>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-[18px] font-medium text-[#000000] mb-3">Team Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter Team Name"
                                    className="w-full bg-[#F3F4F6] border-none px-5 py-4 rounded-[10px] text-[16px] text-[#1E293B] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-gray-300 outline-none transition-all"
                                    value={editForm.team_name}
                                    onChange={(e) => setEditForm({ ...editForm, team_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-[18px] font-medium text-[#000000] mb-3">Select Team Leader</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#F3F4F6] border-none px-5 py-4 rounded-[10px] text-[16px] text-[#1E293B] appearance-none focus:ring-1 focus:ring-gray-300 outline-none transition-all cursor-pointer"
                                        value={editForm.leader}
                                        onChange={(e) => setEditForm({ ...editForm, leader: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Team Leader</option>
                                        {employees.map(e => (
                                            <option key={e.id} value={e.id}>{e.full_name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[18px] font-medium text-[#000000] mb-3">Select Member</label>
                                <div className="relative" ref={memberDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                                        className="w-full bg-[#F3F4F6] border-none px-5 py-4 rounded-[10px] text-[16px] text-[#1E293B] flex justify-between items-center focus:ring-1 focus:ring-gray-300 outline-none transition-all"
                                    >
                                        <span className={editForm.employee.length === 0 ? "text-[#9CA3AF]" : "text-[#1E293B]"}>
                                            {editForm.employee.length === 0
                                                ? "Select Member"
                                                : `${editForm.employee.length} Member(s) Selected`}
                                        </span>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-200 ${showMemberDropdown ? 'rotate-180' : ''}`}>
                                            <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    {showMemberDropdown && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-[#F3F4F6] rounded-[10px] shadow-lg border border-gray-100 py-3 z-[110] animate-in fade-in zoom-in duration-200 origin-top max-h-60 overflow-y-auto no-scrollbar">
                                            {employees.map(e => (
                                                <label key={e.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-100 cursor-pointer transition-colors group">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.employee.includes(String(e.id))}
                                                        onChange={() => handleMemberToggle(String(e.id), true)}
                                                        className="w-5 h-5 rounded border-gray-300 text-[#000000] focus:ring-0 cursor-pointer"
                                                    />
                                                    <span className="text-[16px] text-[#1E293B] group-hover:text-black">{e.full_name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-center gap-6 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-12 py-3.5 bg-[#F1F1F1] text-[#616161] rounded-[8px] text-[20px] font-medium hover:bg-gray-200 transition-all active:scale-[0.98]"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-12 py-3.5 bg-[#DDEBFF] text-[#000000] rounded-[8px] text-[20px] font-medium hover:bg-[#CFE3FF] transition-all disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {submitting ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}