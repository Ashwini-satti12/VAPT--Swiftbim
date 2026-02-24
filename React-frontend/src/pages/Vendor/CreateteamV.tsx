import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';
import { PlusIcon, ArrowUpRightIcon, XMarkIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import colonIcon from '../../assets/project/colon.png';

interface Employee {
    id: number;
    full_name: string;
    email: string;
}

interface Team {
    team_id: number;
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

    const color = percentage >= 85 ? '#00B633' : percentage >= 70 ? '#008F22' : '#DD4342';

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

function TeamCard({ team, getEmpName }: { team: Team; getEmpName: (id: number | string) => string }) {
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
                    {team.leader_name || getEmpName(team.leader)}
                </h3>
                <div className="absolute top-6 right-6" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
                    >
                        <img src={colonIcon} alt="Options" className="w-[18px] h-auto object-contain" style={{ width: '18px' }} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-[20px] shadow-xl border border-gray-100 py-3 z-[110] animate-in fade-in zoom-in duration-200 origin-top-right">
                            <button className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group/item border-b border-gray-50 last:border-0">
                                <PencilSquareIcon className="w-5 h-5 text-[#DD4342]" />
                                <span className="text-[16px] font-bold text-[#DD4342]">Edit</span>
                            </button>
                            <button className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group/item">
                                <TrashIcon className="w-5 h-5 text-[#616161]" />
                                <span className="text-[16px] font-bold text-[#616161]">Delete</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-8 mb-6">
                <Gauge percentage={completion} />
                <div className="flex flex-col">
                    <span
                        className="text-[15px] font-medium text-[#8B8B8B] font-Gantari leading-none mb-1.5"
                        style={{ width: '97px', height: '18px' }}
                    >
                        Completion
                    </span>
                    <span
                        className="text-[24px] font-semibold text-[#353535] font-Gantari leading-none"
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

                <button className="flex items-center gap-1.5 text-[#64748B] font-bold text-[14px] hover:text-[#DD4342] transition-colors group/btn">
                    Details
                    <ArrowUpRightIcon className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </button>
            </div>
        </div>
    );
}

export default function CreateteamV() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        leader: '',
        employee: [] as string[],
        project_lead: '',
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
            leader: form.leader,
            employee: form.employee.join(','),
            project_lead: form.project_lead || undefined
        })
            .then(({ data }) => {
                if (data.success) {
                    setShowAddModal(false);
                    // Refresh data instead of page reload for better UX
                    api.get<{ teams?: Team[] }>('/api/teams').then(res => setTeams(res.data.teams ?? []));
                    setForm({ leader: '', employee: [], project_lead: '' });
                }
            })
            .catch(() => { })
            .finally(() => setSubmitting(false));
    };

    const handleMemberToggle = (id: string) => {
        setForm(prev => {
            const exists = prev.employee.includes(id);
            if (exists) {
                return { ...prev, employee: prev.employee.filter(e => e !== id) };
            } else {
                return { ...prev, employee: [...prev.employee, id] };
            }
        });
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
                            <TeamCard key={team.team_id} team={team} getEmpName={getEmpName} />
                        ))
                    )}
                </div>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold text-[#1E293B]">Create New Team</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 bg-[#F8FAFC] rounded-xl text-[#64748B] hover:text-[#1E293B] transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-[#64748B] mb-2 px-1">Team Leader *</label>
                                <select
                                    className="w-full bg-[#F8FAFC] border-none px-4 py-3 rounded-2xl focus:ring-2 focus:ring-[#DD4342] text-[#1E293B] font-medium transition-all outline-none"
                                    value={form.leader}
                                    onChange={(e) => setForm({ ...form, leader: e.target.value })}
                                    required
                                >
                                    <option value="">Select Leader</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[#64748B] mb-2 px-1">Project Lead (Optional)</label>
                                <select
                                    className="w-full bg-[#F8FAFC] border-none px-4 py-3 rounded-2xl focus:ring-2 focus:ring-[#DD4342] text-[#1E293B] font-medium transition-all outline-none"
                                    value={form.project_lead}
                                    onChange={(e) => setForm({ ...form, project_lead: e.target.value })}
                                >
                                    <option value="">Select Project Lead</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[#64748B] mb-2 px-1">Team Members</label>
                                <div className="max-h-48 overflow-y-auto bg-[#F8FAFC] rounded-2xl p-4 space-y-2 no-scrollbar border border-transparent focus-within:border-[#DD4342]/20 transition-all">
                                    {employees.map(e => (
                                        <label key={e.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors shadow-none hover:shadow-sm">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={form.employee.includes(String(e.id))}
                                                    onChange={() => handleMemberToggle(String(e.id))}
                                                    className="w-5 h-5 rounded-lg border-2 border-[#E2E8F0] text-[#DD4342] focus:ring-[#DD4342] checked:bg-[#DD4342] transition-colors appearance-none checked:border-[#DD4342]"
                                                    style={{ backgroundImage: form.employee.includes(String(e.id)) ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")` : 'none', backgroundSize: '100% 100%' }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-[#1E293B]">{e.full_name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-6 py-3 bg-[#F8FAFC] text-[#64748B] rounded-2xl font-bold hover:bg-[#F1F5F9] transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] px-6 py-3 bg-[#DD4342] text-white rounded-2xl hover:bg-[#C53030] disabled:opacity-50 transition-all font-bold shadow-lg shadow-red-200 active:scale-95"
                                >
                                    {submitting ? 'Creating...' : 'Create Team'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}