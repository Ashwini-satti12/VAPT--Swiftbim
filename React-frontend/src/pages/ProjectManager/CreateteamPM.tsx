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
                <circle stroke="#F1F5F9" fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius} />
                <circle stroke={color} fill="transparent" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset }} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} className="transition-all duration-1000 ease-out" />
            </svg>
            <span className="absolute text-[16px] font-bold text-[#1E293B] flex items-center justify-center" style={{ width: '44px', height: '24px' }}>
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
        <div className="bg-white rounded-[10px] p-4 border border-[#AEACAC52] w-full flex flex-col transition-all hover:shadow-lg group shrink-0 relative">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-[16px] font-bold text-[#1E293B] truncate pr-8">
                    {team.team_name || team.leader_name || getEmpName(team.leader)}
                </h3>
                <div className="absolute top-4 right-4" ref={menuRef}>
                    <button onClick={() => setShowMenu(!showMenu)} className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity">
                        <img src={threeDotsIcon} alt="Options" className="w-[18px] h-auto object-contain" style={{ width: '18px' }} />
                    </button>
                    {showMenu && (
                        <div className="absolute right-[-70px] mt-2 w-[158px] bg-[#FFFFFF] rounded-[15px] shadow-[0px_10px_30px_rgba(0,0,0,0.1)] border border-[#59595980]/50 py-2 z-[110] animate-in fade-in zoom-in duration-200 origin-top-right">
                            <button onClick={() => { onEdit(team); setShowMenu(false); }} className="w-full px-4 py-1.5 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left group/item">
                                <PencilSquareIcon className="w-4 h-4 text-[#DD4342]" />
                                <span className="text-[15px] font-medium text-[#DD4342]">Edit</span>
                            </button>
                            <button className="w-full px-4 py-1.5 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left group/item">
                                <TrashIcon className="w-4 h-4 text-[#616161]" />
                                <span className="text-[15px] font-medium text-[#616161]">Delete</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 mb-3">
                <Gauge percentage={completion} />
                <div className="flex flex-col">
                    <span className="text-[13px] font-gantari text-[#8B8B8B] leading-none mb-1">COMPLETION</span>
                    <span className="text-[20px] font-gantari text-[#353535] leading-none">{status}</span>
                </div>
            </div>

            <div className="h-px bg-[#F1F5F9] w-full mb-3" />

            <div className="flex justify-between items-center">
                <div className="flex -space-x-2">
                    {memberIds.slice(0, 4).map((eid) => (
                        <div key={eid} className="w-7 h-7 rounded-full border-2 border-white bg-[#F1F5F9] flex items-center justify-center text-[9px] font-bold text-[#64748B] overflow-hidden shadow-sm" title={getEmpName(eid)}>
                            <span className="uppercase">{getEmpName(eid)[0]}</span>
                        </div>
                    ))}
                    {memberIds.length > 4 && (
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-[#F8FAFC] flex items-center justify-center text-[9px] font-bold text-[#94A3B8] border-dashed shadow-sm">
                            +{memberIds.length - 4}
                        </div>
                    )}
                </div>
                <button className="flex items-center gap-1.5 text-[#8B8B8B] font-gantari text-[14px] transition-colors group/btn">
                    Details
                    <ArrowUpRightIcon className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </button>
            </div>
        </div>
    );
}

/* ── Reusable custom member dropdown ── */
function MemberDropdown({
    employees,
    selected,
    onToggle,
}: {
    employees: Employee[];
    selected: string[];
    onToggle: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedNames = selected.map(id => employees.find(e => String(e.id) === id)?.full_name).filter(Boolean);

    return (
        <div className="relative" ref={ref}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full bg-[#F2F3F4] px-5 py-4 rounded-[10px] flex justify-between items-center outline-none transition-all"
            >
                <span className={`text-sm font-gantari ${selected.length === 0 ? 'text-[#8B8B8B]' : 'text-[#000000] font-medium'}`}>
                    {selected.length === 0
                        ? 'Select Member'
                        : selectedNames.join(', ')}
                </span>
                <svg
                    width="20" height="20" viewBox="0 0 20 20" fill="none"
                    className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                >
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="#8B8B8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Dropdown panel — matches reference image */}
            {open && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-white rounded-[12px] shadow-[0px_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E5E5] z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-bottom">
                    {/* 4 rows visible then scroll (including Select row) */}
                    <div className="max-h-[192px] overflow-y-auto">
                        {/* "Select" clear option */}
                        <button
                            type="button"
                            onClick={() => { employees.forEach(e => { if (selected.includes(String(e.id))) onToggle(String(e.id)); }); }}
                            className="w-full h-[48px] text-left px-5 font-gantari text-[15px] border-b border-white transition-colors bg-white text-[#353535] hover:bg-[#F2F3F4] hover:text-[#000000]"
                        >
                            Select
                        </button>
                        {employees.map(e => {
                            const isSelected = selected.includes(String(e.id));
                            return (
                                <button
                                    key={e.id}
                                    type="button"
                                    onClick={() => onToggle(String(e.id))}
                                    className={`w-full h-[48px] text-left px-5 font-gantari text-[15px] border-b border-white transition-colors
                                        ${isSelected
                                            ? 'bg-[#F2F3F4] text-[#000000] font-semibold'
                                            : 'bg-white text-[#353535] hover:bg-[#F2F3F4] hover:text-[#000000]'
                                        }`}
                                >
                                    {e.full_name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Single-select Leader dropdown (same design as MemberDropdown) ── */
function LeaderDropdown({
    employees,
    selected,
    onSelect,
    placeholder = 'Select Team Leader',
}: {
    employees: Employee[];
    selected: string;
    onSelect: (id: string) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedName = employees.find(e => String(e.id) === selected)?.full_name;

    return (
        <div className="relative" ref={ref}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full bg-[#F2F3F4] px-5 py-4 rounded-[10px] flex justify-between items-center outline-none transition-all"
            >
                <span className={`text-sm font-gantari ${!selectedName ? 'text-[#8B8B8B]' : 'text-[#000000] font-medium'}`}>
                    {selectedName || placeholder}
                </span>
                <svg
                    width="20" height="20" viewBox="0 0 20 20" fill="none"
                    className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                >
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="#8B8B8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Dropdown panel — matches reference image, opens upward */}
            {open && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-white rounded-[12px] shadow-[0px_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E5E5] z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-bottom">
                    {/* 4 rows visible then scroll (including Select row) */}
                    <div className="max-h-[192px] overflow-y-auto">
                        {/* "Select" clear option */}
                        <button
                            type="button"
                            onClick={() => { onSelect(''); setOpen(false); }}
                            className="w-full h-[48px] text-left px-5 font-gantari text-[15px] border-b border-white transition-colors bg-white text-[#353535] hover:bg-[#F2F3F4] hover:text-[#000000]"
                        >
                            Select
                        </button>
                        {employees.map(e => {
                            const isSelected = String(e.id) === selected;
                            return (
                                <button
                                    key={e.id}
                                    type="button"
                                    onClick={() => { onSelect(String(e.id)); setOpen(false); }}
                                    className={`w-full h-[48px] text-left px-5 font-gantari text-[15px] border-b border-white transition-colors
                                        ${isSelected
                                            ? 'bg-[#F2F3F4] text-[#000000] font-semibold'
                                            : 'bg-white text-[#353535] hover:bg-[#F2F3F4] hover:text-[#000000]'
                                        }`}
                                >
                                    {e.full_name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CreateTeamPM() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [submitting, setSubmitting] = useState(false);

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
                    api.get<{ teams?: Team[] }>('/api/teams').then(res => setTeams(res.data.teams ?? []));
                    setForm({ leader: '', employee: [], project_lead: '', team_name: '' });
                }
            })
            .catch(() => { })
            .finally(() => setSubmitting(false));
    };

    const handleMemberToggle = (id: string, isEdit: boolean = false) => {
        if (isEdit) {
            setEditForm(prev => ({
                ...prev,
                employee: prev.employee.includes(id)
                    ? prev.employee.filter(e => e !== id)
                    : [...prev.employee, id],
            }));
        } else {
            setForm(prev => ({
                ...prev,
                employee: prev.employee.includes(id)
                    ? prev.employee.filter(e => e !== id)
                    : [...prev.employee, id],
            }));
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

    /* ── Shared form field classes ── */
    const inputCls = "w-full bg-[#F2F3F4] px-5 py-4 rounded-[10px] text-sm font-gantari text-[#000000] placeholder:text-[#8B8B8B] outline-none transition-all border-none focus:ring-1 focus:ring-gray-300";
    const selectCls = "w-full bg-[#F2F3F4] px-5 py-4 rounded-[10px] text-sm font-gantari appearance-none outline-none transition-all border-none focus:ring-1 focus:ring-gray-300 cursor-pointer";
    const labelCls = "block text-base font-gantari font-semibold text-[#000000] mb-2";

    return (
        <div className="h-full flex flex-col pt-2 px-6 pb-6">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-[#1E293B]">Team</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#DD4342] text-[#FFFFFF] rounded-md transition-all font-bold shadow-lg shadow-red-200 active:scale-95"
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

            {/* ── Add Modal ── */}
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
                            <h3 className="font-gantari font-semibold text-xl text-[#000000]">Create New Team</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Team Name */}
                            <div>
                                <label className={labelCls}>Team Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter Team Name"
                                    className={inputCls}
                                    value={form.team_name}
                                    onChange={(e) => setForm({ ...form, team_name: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Team Leader — custom dropdown */}
                            <div>
                                <label className={labelCls}>Select Team Leader</label>
                                <LeaderDropdown
                                    employees={employees}
                                    selected={form.leader}
                                    onSelect={(id) => setForm(f => ({ ...f, leader: id }))}
                                />
                            </div>

                            {/* Select Member — custom dropdown, no checkboxes */}
                            <div>
                                <label className={labelCls}>Select Member</label>
                                <MemberDropdown
                                    employees={employees}
                                    selected={form.employee}
                                    onToggle={(id) => handleMemberToggle(id, false)}
                                />
                            </div>

                            <div className="flex justify-center gap-6 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-12 py-3.5 bg-[#F1F1F1] text-[#616161] rounded-[8px] text-[18px] font-gantari font-medium hover:bg-gray-200 transition-all active:scale-[0.98]"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-12 py-3.5 bg-[#DDEBFF] text-[#000000] rounded-[8px] text-[18px] font-gantari font-medium hover:bg-[#CFE3FF] transition-all disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ── */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="bg-white rounded-[20px] shadow-2xl max-w-[564px] w-full p-10 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="absolute top-8 left-8 p-3 bg-[#F8FAFC] rounded-[8px] text-[#1E293B] hover:bg-gray-100 transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6 stroke-[2.5]" />
                        </button>

                        <div className="text-center mb-10">
                            <h3 className="font-gantari font-semibold text-xl text-[#000000]">Edit Team Details</h3>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-5">
                            {/* Team Name */}
                            <div>
                                <label className={labelCls}>Team Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter Team Name"
                                    className={inputCls}
                                    value={editForm.team_name}
                                    onChange={(e) => setEditForm({ ...editForm, team_name: e.target.value })}
                                />
                            </div>

                            {/* Team Leader — custom dropdown */}
                            <div>
                                <label className={labelCls}>Select Team Leader</label>
                                <LeaderDropdown
                                    employees={employees}
                                    selected={editForm.leader}
                                    onSelect={(id) => setEditForm(f => ({ ...f, leader: id }))}
                                />
                            </div>

                            {/* Select Member — custom dropdown, no checkboxes */}
                            <div>
                                <label className={labelCls}>Select Member</label>
                                <MemberDropdown
                                    employees={employees}
                                    selected={editForm.employee}
                                    onToggle={(id) => handleMemberToggle(id, true)}
                                />
                            </div>

                            <div className="flex justify-center gap-6 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-12 py-3.5 bg-[#F1F1F1] text-[#616161] rounded-[8px] text-[18px] font-gantari font-medium hover:bg-gray-200 transition-all active:scale-[0.98]"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-12 py-3.5 bg-[#DDEBFF] text-[#000000] rounded-[8px] text-[18px] font-gantari font-medium hover:bg-[#CFE3FF] transition-all disabled:opacity-50 active:scale-[0.98]"
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