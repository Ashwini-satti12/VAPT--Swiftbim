import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

type DashboardStats = {
    active_opportunities: number;
    bids_submitted: number;
    proposals_awaiting: number;
    active_projects: number;
};

const defaultStats: DashboardStats = {
    active_opportunities: 0,
    bids_submitted: 0,
    proposals_awaiting: 0,
    active_projects: 0,
};

type Alert = {
    type: 'warning' | 'info' | 'success';
    message: string;
};

export default function DashboardV() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>(defaultStats);
    const [alerts] = useState<Alert[]>([
        { type: 'warning', message: 'Bid ending in 2 days for "Alpha Towers BIM Project"' },
        { type: 'info', message: 'New bidding opportunity is available — check Opportunities' },
    ]);

    useEffect(() => {
        api.get<DashboardStats>('/api/vendors/dashboard/stats')
            .then(({ data }) => setStats({
                active_opportunities: Number(data?.active_opportunities) || 0,
                bids_submitted: Number(data?.bids_submitted) || 0,
                proposals_awaiting: Number(data?.proposals_awaiting) || 0,
                active_projects: Number(data?.active_projects) || 0,
            }))
            .catch(() => setStats(defaultStats))
            .finally(() => setLoading(false));
    }, []);

    const kpiCards = [
        { label: 'Active\nOpportunities', value: stats.active_opportunities, barColor: '#DE3D3A', barPct: 75 },
        { label: 'Bids\nSubmitted', value: stats.bids_submitted, barColor: '#3B82F6', barPct: 50 },
        { label: 'Proposals\nAwaiting', value: stats.proposals_awaiting, barColor: '#E47E00', barPct: 30 },
        { label: 'Active\nProjects', value: stats.active_projects, barColor: '#00882E', barPct: 20 },
    ];

    const quickActions = [
        { label: 'View Opportunities', path: '/v/opportunities', color: '#DE3D3A', icon: '🎯' },
        { label: 'My Bids', path: '/v/mybids', color: '#3B82F6', icon: '📋' },
        { label: 'Proposals', path: '/v/proposals', color: '#E47E00', icon: '📄' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DE3D3A]" />
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:h-full lg:overflow-hidden">
            {/* Header and KPI Cards */}
            <div className="bg-white pb-6 pt-0 border-b border-transparent shrink-0">
                <h1 className="text-xl font-medium font-gantari text-slate-800 mb-6">Dashboard</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpiCards.map((card, i) => (
                        <div key={i} className="bg-[#F2F2F2] group hover:bg-[#DE3D3A] rounded-2xl border border-[#AEACAC52] p-6 shadow-lg flex flex-col min-h-[140px] lg:h-[100px] transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-xl text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari leading-tight whitespace-pre-line">{card.label}</h3>
                                </div>
                                <p className="text-[28px] lg:text-[32px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none pt-1">{card.value}</p>
                            </div>
                            <div className="mt-auto w-full">
                                <div className="h-2 w-full bg-white rounded-full flex items-center px-1 overflow-hidden">
                                    <div className="h-1 rounded-full transition-all" style={{ backgroundColor: card.barColor, width: `${card.barPct}%` }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4 pt-6 overflow-visible lg:overflow-hidden">
                {/* Alerts + Quick Actions */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Alerts Section */}
                    <div className="bg-white rounded-2xl border border-[#AEACAC52] shadow-sm p-6 shrink-0">
                        <h2 className="text-xl font-semibold text-[#353535] font-gantari mb-4">Alerts</h2>
                        <div className="flex flex-col gap-3">
                            {alerts.length === 0 ? (
                                <p className="text-sm text-slate-400 font-gantari">No alerts at this time.</p>
                            ) : (
                                alerts.map((alert, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-start gap-3 p-4 rounded-xl border ${alert.type === 'warning'
                                            ? 'bg-[#FFF8E7] border-[#F59E0B]/30 text-[#92400E]'
                                            : alert.type === 'success'
                                                ? 'bg-[#F0FDF4] border-[#22C55E]/30 text-[#14532D]'
                                                : 'bg-[#EFF6FF] border-[#3B82F6]/30 text-[#1E3A5F]'
                                            }`}
                                    >
                                        <span className="text-lg shrink-0">
                                            {alert.type === 'warning' ? '⚠️' : alert.type === 'success' ? '✅' : 'ℹ️'}
                                        </span>
                                        <p className="text-sm font-medium font-gantari">{alert.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl border border-[#AEACAC52] shadow-sm p-6 shrink-0">
                        <h2 className="text-xl font-semibold text-[#353535] font-gantari mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {quickActions.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => navigate(action.path)}
                                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-transparent bg-[#F8F8F8] hover:border-[#DE3D3A] hover:bg-white transition-all duration-200 group cursor-pointer"
                                >
                                    <span className="text-3xl">{action.icon}</span>
                                    <span className="text-sm font-bold font-gantari text-[#353535] group-hover:text-[#DE3D3A] text-center">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Profile Summary */}
                <div className="lg:col-span-1 flex flex-col bg-white rounded-2xl border border-[#AEACAC52] shadow-sm p-6 h-fit">
                    <h2 className="text-xl font-semibold text-[#353535] font-gantari mb-4">Profile Status</h2>
                    <div className="flex flex-col gap-4">
                        {/* Completeness */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium font-gantari text-[#353535]">Profile Completeness</span>
                                <span className="text-sm font-bold text-[#DE3D3A]">80%</span>
                            </div>
                            <div className="h-3 w-full bg-[#F2F2F2] rounded-full overflow-hidden">
                                <div className="h-full bg-[#DE3D3A] rounded-full" style={{ width: '80%' }} />
                            </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-3 p-4 bg-[#F0FDF4] rounded-xl border border-[#22C55E]/30">
                            <div className="w-3 h-3 rounded-full bg-[#22C55E] shrink-0" />
                            <div>
                                <p className="text-sm font-bold font-gantari text-[#14532D]">Account Verified</p>
                                <p className="text-xs text-[#15803D] font-gantari">Your profile is approved and visible to clients</p>
                            </div>
                        </div>

                        {/* Checklist */}
                        <div className="mt-2">
                            <p className="text-sm font-semibold font-gantari text-[#353535] mb-3">Checklist</p>
                            {[
                                { label: 'Company Details', done: true },
                                { label: 'Contact Person', done: true },
                                { label: 'Portfolio Projects', done: true },
                                { label: 'Certifications', done: false },
                                { label: 'Team Members', done: false },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 py-1.5">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${item.done ? 'bg-[#22C55E] text-white' : 'bg-[#F2F2F2] text-[#AEACAC]'}`}>
                                        {item.done ? '✓' : '○'}
                                    </div>
                                    <span className={`text-sm font-gantari ${item.done ? 'text-[#353535]' : 'text-[#AEACAC]'}`}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
