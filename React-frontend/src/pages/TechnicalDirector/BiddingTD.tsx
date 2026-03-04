import { useEffect, useState } from 'react';
import api from '../../lib/api';
import ViewBidsTD from './ViewBidsTD';
import viewIcon from '../../assets/ProjectManager/Client/whiteviewicon.svg';

export interface BiddingEntry {
    id: number;
    project_id: number;
    project_name: string;
    description?: string;
    outsource_budget: number;
    budget_ceiling?: number;
    bid_deadline: string;
    status: string;
    computed_status: string;
    total_bids: number;
    company_id?: number;
    created_at: string;
}

export default function BiddingTD() {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<BiddingEntry[]>([]);
    const [selectedProject, setSelectedProject] = useState<BiddingEntry | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        api.get<{ bidding: BiddingEntry[] }>('/api/vendors/bidding')
            .then(({ data }) => setProjects(data.bidding ?? []))
            .catch(() => setProjects([]))
            .finally(() => setLoading(false));
    }, []);

    const getStatusStyles = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'active') return 'bg-blue-50 text-blue-600 border-blue-100';
        if (s === 'closed') return 'bg-gray-50 text-gray-500 border-gray-100';
        if (s === 'awarded') return 'bg-green-50 text-green-600 border-green-100';
        return 'bg-gray-50 text-gray-500 border-gray-100';
    };

    const getStatusLabel = (entry: BiddingEntry) => {
        const s = (entry.computed_status || entry.status || 'active').toLowerCase();
        if (s === 'active') return 'Open';
        if (s === 'awarded') return 'Awarded';
        return 'Closed';
    };

    const formatBudget = (amount: number | undefined) => {
        if (!amount) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    const filtered = projects.filter(p =>
        p.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedProject) {
        return <ViewBidsTD project={selectedProject} onBack={() => setSelectedProject(null)} />;
    }

    return (
        <div className="h-full flex flex-col px-4 py-2">
            <div className="flex items-center justify-between flex-shrink-0 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#353535] font-gantari">Bidding Process</h2>
                    <p className="text-sm text-slate-500 mt-1 font-gantari">Projects sent for outsource — track vendor bids in real time</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search project..."
                            className="pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/20 bg-white shadow-sm w-56"
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
                <div className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] overflow-hidden">
                    <div className="bg-[#F8FAFC] px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
                        <h3 className="text-lg font-bold text-[#353535] font-gantari">
                            All Outsourced Projects
                            <span className="ml-2 text-sm font-semibold text-[#94A3B8]">({filtered.length})</span>
                        </h3>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DE3D3A]" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 font-gantari">
                            <svg className="w-14 h-14 mx-auto mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-semibold mb-1">No outsourced projects yet</p>
                            <p className="text-sm">When a project is marked as Outsource, it will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead className="bg-[#F8FAFC]">
                                    <tr>
                                        <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider">Sl.No</th>
                                        <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider">Project Name</th>
                                        <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider text-center">Outsourcing Budget</th>
                                        <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider text-center">Bidding End Date</th>
                                        <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider text-center">Total Bids</th>
                                        <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider text-center">Status</th>
                                        <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0]">
                                    {filtered.map((project, index) => {
                                        const label = getStatusLabel(project);
                                        const isOpen = label === 'Open';
                                        return (
                                            <tr key={project.id} className="transition-colors hover:bg-[#F8FAFC]">
                                                <td className="py-5 px-6 text-sm font-medium text-[#64748B]">{index + 1}</td>
                                                <td className="py-5 px-6">
                                                    <div className="text-sm font-bold text-[#1E293B] font-gantari">{project.project_name}</div>
                                                    {project.description && (
                                                        <div className="text-xs text-[#94A3B8] mt-0.5 line-clamp-1">{project.description}</div>
                                                    )}
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <div className="text-sm font-bold text-[#1E293B] font-gantari">
                                                        {formatBudget(project.budget_ceiling || project.outsource_budget)}
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <div className="text-sm text-[#475569] font-gantari">
                                                        {project.bid_deadline
                                                            ? new Date(project.bid_deadline).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
                                                            : '—'}
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${project.total_bids > 0 ? 'bg-[#FFF3E0] text-[#E65100]' : 'bg-[#F1F5F9] text-[#94A3B8]'
                                                        }`}>
                                                        {project.total_bids ?? 0}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${getStatusStyles(project.computed_status || project.status)}`}>
                                                        {label}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <button
                                                        className={`flex items-center justify-center gap-2 mx-auto px-5 py-2 rounded-lg text-xs font-bold transition-all ${isOpen && project.total_bids === 0
                                                            ? 'bg-white text-[#94A3B8] border border-[#E2E8F0] cursor-not-allowed opacity-60'
                                                            : 'bg-[#DD4342] text-white hover:bg-[#c23b3a] shadow-sm shadow-red-100'
                                                            }`}
                                                        onClick={() => setSelectedProject(project)}
                                                        disabled={isOpen && project.total_bids === 0}
                                                    >
                                                        <img src={viewIcon} alt="View" className="w-4 h-4 object-contain" />
                                                        View bids
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
