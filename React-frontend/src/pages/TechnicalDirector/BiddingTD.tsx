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

    const getStatusLabel = (entry: BiddingEntry) => {
        const s = (entry.computed_status || entry.status || 'active').toLowerCase();
        if (s === 'active') return 'Open';
        if (s === 'awarded') return 'Awarded';
        return 'Closed';
    };

    const getStatusBadge = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'active') return 'bg-[#EAF0FB] text-[#1967D2]';
        if (s === 'awarded') return 'bg-[#E6F4EA] text-[#1E7E34]';
        return 'bg-[#F2F2F2] text-[#616161]';
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
        <div className="px-1 pt-1 pb-0 space-y-8 flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="text-2xl font-semibold text-[#000000]">Bidding</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex items-center gap-2 px-4 py-2 bg-[#EAEAEA] rounded-md min-w-[200px]">
                        <svg className="w-4 h-4 text-[#616161] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search project..."
                            className="bg-transparent text-sm font-medium text-[#353535] placeholder:text-[#616161] focus:outline-none w-full font-gantari"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="text-[#616161] hover:text-[#353535] transition-colors ml-1">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                <div className="overflow-x-auto overflow-y-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-220px)]">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center text-[#616161] font-gantari">
                            <svg className="w-14 h-14 mx-auto mb-4 text-[#AEACAC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-semibold mb-1 text-[#353535]">No outsourced projects yet</p>
                            <p className="text-sm">When a project is marked as Outsource, it will appear here.</p>
                        </div>
                    ) : (
                        <table className="min-w-full border-collapse">
                            <thead className="sticky top-0 z-10 bg-white">
                                <tr className="border-b border-gray-100 bg-white">
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Project Name</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Outsourcing Budget</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Bidding End Date</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Total Bids</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Status</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((project, index) => {
                                    const label = getStatusLabel(project);
                                    const isOpen = label === 'Open';
                                    const slNo = (index + 1).toString().padStart(2, '0');
                                    return (
                                        <tr key={project.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]': 'bg-white'} transition-colors`}>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-3 py-3 text-center text-sm font-semibold text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {project.project_name}
                                                {project.description && (
                                                    <div className="text-xs text-[#616161] font-normal mt-0.5 line-clamp-1">{project.description}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm font-bold text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {formatBudget(project.budget_ceiling || project.outsource_budget)}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {project.bid_deadline
                                                    ? new Date(project.bid_deadline).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-gantari`}>
                                                    {project.total_bids ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari ${getStatusBadge(project.computed_status || project.status)}`}>
                                                    {label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                <button
                                                    className={`flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-md text-xs font-bold font-gantari transition-all ${isOpen && project.total_bids === 0
                                                        ? 'bg-[#F2F2F2] text-[#616161] cursor-not-allowed opacity-60'
                                                        : 'bg-[#DD4342] text-white hover:bg-[#c23b3a] shadow-sm shadow-red-100'
                                                        }`}
                                                    onClick={() => setSelectedProject(project)}
                                                    disabled={isOpen && project.total_bids === 0}
                                                >
                                                    <img src={viewIcon} alt="View" className="w-4 h-4 object-contain" />
                                                    View Bids
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
