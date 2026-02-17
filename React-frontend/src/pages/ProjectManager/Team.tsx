import { useEffect, useState } from 'react';
import api from '../../lib/api';

interface Employee {
    id: number;
    full_name: string;
    email: string;
}

interface Team {
    team_id: number;
    leader: number;
    leader_name?: string;
    employee: string; // comma separated IDs
    project_lead?: number;
}

export default function Team() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        leader: '',
        employee: [] as string[], // array of employee IDs
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
                    // Refresh list or optimistic update
                    // simple reload for now or fetch
                    window.location.reload();
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

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    const getEmpName = (id: number | string) => {
        const e = employees.find(emp => emp.id == id);
        return e ? e.full_name : 'Unknown';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800">Teams</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-[#3d3399] text-white rounded-lg hover:bg-[#2d2389] font-medium"
                >
                    Create Team
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                        No teams found.
                    </div>
                ) : (
                    teams.map(team => (
                        <div key={team.team_id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-semibold text-lg text-slate-800 mb-2">
                                Leader: {team.leader_name || getEmpName(team.leader)}
                            </h3>
                            <div className="text-sm text-slate-600 space-y-1">
                                <p><strong>Members:</strong> {team.employee.split(',').length}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {team.employee.split(',').map(eid => (
                                        <span key={eid} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">
                                            {getEmpName(eid.trim())}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">Create New Team</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Team Leader *</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399]"
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Project Lead (Optional)</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399]"
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Team Members</label>
                                <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-lg p-2 space-y-1">
                                    {employees.map(e => (
                                        <label key={e.id} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.employee.includes(String(e.id))}
                                                onChange={() => handleMemberToggle(String(e.id))}
                                                className="rounded text-[#3d3399] focus:ring-[#3d3399]"
                                            />
                                            <span className="text-sm text-slate-700">{e.full_name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-[#3d3399] text-white rounded-lg hover:bg-[#2d2389] disabled:opacity-50"
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
