import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';
import { PlusIcon, XMarkIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import threeDotsIcon from '../../assets/ProjectManager/CreateTeam/three dots.svg';
import eyeIcon from '../../assets/ProjectManager/consultant/eyeIcon.svg';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';

const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
    { value: 'show', label: 'Show', start: 0, end: 50 },
    { value: '1-50', label: '1-50', start: 0, end: 50 },
    { value: '51-100', label: '51-100', start: 50, end: 100 },
    { value: '101-150', label: '101-150', start: 100, end: 150 },
    { value: '151-200', label: '151-200', start: 150, end: 200 },
    { value: '201-250', label: '201-250', start: 200, end: 250 },
    { value: '251-300', label: '251-300', start: 250, end: 300 },
    { value: 'all', label: 'All', start: 0, end: null },
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
        <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] w-full flex flex-col transition-all hover:shadow-md group relative font-Gantari">
            {/* Team Name */}
            <div className="flex flex-col mb-4 pt-1">
                <span className="text-[15px] font-medium text-[#999999] mb-1.5">Team Name</span>
                <span className="text-[18px] font-bold text-[#353535] pr-8 truncate">
                    {team.team_name || team.teamname || "Untitled Team"}
                </span>
            </div>

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

            {/* Team Leader */}
            <div className="flex flex-col mb-5">
                <span className="text-[15px] font-medium text-[#999999] mb-1.5">Team Leader</span>
                <span className="text-[18px] font-bold text-[#353535] truncate">
                    {team.leader_name || getEmpName(team.leader)}
                </span>
            </div>

            <div className="h-[1px] w-full bg-[#E5E7EB] mb-5"></div>

            {/* Members & Details */}
            <div className="mt-auto flex items-center justify-between">
                <div className="flex -space-x-2">
                    {memberIds.slice(0, 4).map((eid) => (
                        <div
                            key={eid}
                            className="w-[42px] h-[42px] rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[13px] font-bold text-[#475569] shadow-sm uppercase overflow-hidden"
                            title={getEmpName(eid)}
                        >
                            {getEmpName(eid)[0]}
                        </div>
                    ))}
                    {memberIds.length > 4 && (
                        <div className="w-[42px] h-[42px] rounded-full border-2 border-[#D1D5DB] border-dashed bg-white flex items-center justify-center text-[14px] font-bold text-[#999999] select-none shadow-sm relative z-10">
                            +{memberIds.length - 4}
                        </div>
                    )}
                </div>
                <button 
                  onClick={() => onViewDetails(team)}
                  className="text-[18px] font-bold text-[#666666] hover:text-[#353535] transition-colors pr-2"
                >
                    Details
                </button>
            </div>

        </div>
    );
}

export default function CreateteamTD() {
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

    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const [selectedShowEntries, setSelectedShowEntries] = useState('show');
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);

    const selectedRange = showEntriesOptions.find(opt => opt.value === selectedShowEntries) || showEntriesOptions[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
                setShowMemberDropdown(false);
            }
            if (showEntriesDropdownRef.current && !showEntriesDropdownRef.current.contains(event.target as Node)) {
                setShowEntriesOpen(false);
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
            employee: team.employee ? team.employee.split(',').filter(Boolean) : [],
            project_lead: team.project_lead ? String(team.project_lead) : '',
            team_name: team.team_name || team.teamname || '',
        });
        setShowEditModal(true);
    };

    const handleDelete = (teamId: number) => {
        if (!window.confirm('Are you sure you want to delete this team?')) return;
        api.delete(`/api/teams/${teamId}`)
            .then(({ data }) => {
                if (data.success) {
                    setTeams(teams.filter(t => t.team_id !== teamId));
                }
            })
            .catch(console.error);
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

    const displayTeams = selectedRange.end === null
        ? teams
        : teams.slice(selectedRange.start, selectedRange.end);

    return (
        <div className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-[#1E293B]">Team</h2>
                <div className="flex items-center gap-3">
                    {/* Show entries dropdown */}
                    <div className="relative" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowEntriesOpen(o => !o); }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md hover:bg-[#DDDDDD] transition-all cursor-pointer border-0"
                        >
                            {selectedShowEntries === 'show' ? (
                                <span className="text-sm font-medium text-[#616161] font-gantari">Show</span>
                            ) : (
                                <>
                                    <span className="text-sm font-medium text-[#353535] font-gantari">Show:</span>
                                    <span className="text-sm font-medium text-[#353535] font-gantari">{selectedRange.label}</span>
                                </>
                            )}
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className="w-3.5 h-3.5 object-contain transition-transform"
                                style={{ transform: showEntriesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                            />
                        </button>
                        {showEntriesOpen && (
                            <div
                                className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1 max-h-[160px] overflow-y-auto no-scrollbar"
                            >
                                {showEntriesOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setSelectedShowEntries(opt.value); setShowEntriesOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium font-gantari transition-colors ${selectedShowEntries === opt.value ? 'text-[#353535] bg-gray-100' : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
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
                                <h3 className="text-lg font-bold text-[#1E293B]">No teams found</h3>
                                <p className="text-[#64748B]">Click "New Team" to get started.</p>
                            </div>
                        </div>
                    ) : (
                        displayTeams.map(team => (
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
                                {selectedTeam.team_name || selectedTeam.teamname || selectedTeam.leader_name || getEmpName(selectedTeam.leader)}
                            </h3>
                            <p className="text-slate-500 mt-1">Team Details</p>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Leadership</h4>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm">
                                        {(selectedTeam.leader_name || getEmpName(selectedTeam.leader))[0]}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{selectedTeam.leader_name || getEmpName(selectedTeam.leader)}</p>
                                        <p className="text-sm text-slate-500">Team Leader</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 pl-1">
                                    Team Members ({selectedTeam.employee.split(',').filter(Boolean).length})
                                </h4>
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {selectedTeam.employee.split(',').filter(Boolean).map((eid, i) => {
                                        const empInfo = employees.find(e => e.id.toString() === eid);
                                        return (
                                            <div key={eid} className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${i !== 0 ? 'border-t border-slate-100' : ''}`}>
                                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                                                    {getEmpName(eid)[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{getEmpName(eid)}</p>
                                                    {empInfo?.email && <p className="text-sm text-slate-500">{empInfo.email}</p>}
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
        </div>
    );
}