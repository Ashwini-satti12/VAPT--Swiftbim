import { useEffect, useRef, useState } from 'react';
import api from '../../lib/api';
import ViewBidsTD from './ViewBidsTD';
import viewIcon from '../../assets/ProjectManager/Client/whiteviewicon.svg';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';

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

const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
    { value: 'show', label: 'Show', start: 0, end: 50 },
    { value: '1-50', label: '1-50', start: 0, end: 50 },
    { value: '51-100', label: '51-100', start: 50, end: 100 },
    { value: '101-150', label: '101-150', start: 100, end: 150 },
    { value: '151-200', label: '151-200', start: 150, end: 200 },
    { value: '201-250', label: '201-250', start: 200, end: 250 },
    { value: 'all', label: 'All', start: 0, end: null },
];

export default function BiddingTD() {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<BiddingEntry[]>([]);
    const [selectedProject, setSelectedProject] = useState<BiddingEntry | null>(null);
    const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        api.get<{ bidding: BiddingEntry[] }>('/api/vendors/bidding')
            .then(({ data }) => setProjects(data.bidding ?? []))
            .catch(() => setProjects([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showEntriesDropdownRef.current && !showEntriesDropdownRef.current.contains(event.target as Node)) {
                setShowEntriesOpen(false);
            }
        };
        if (showEntriesOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEntriesOpen]);

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

    const filtered = projects;

    const selectedRange = showEntriesOptions.find(o => o.value === selectedShowEntries) ?? showEntriesOptions[0];
    const rangeEnd = selectedRange.end === null ? filtered.length : Math.min(selectedRange.end, filtered.length);
    const displayList = filtered.slice(selectedRange.start, rangeEnd);

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
                    <div className="relative" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowEntriesOpen(o => !o); }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer border-0"
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
                                className={`ml-2 w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {showEntriesOpen && (
                            <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1 max-h-[160px] overflow-y-auto custom-scrollbar" onMouseDown={(e) => e.preventDefault()}>
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
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
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
                            <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
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
                                {displayList.map((project, index) => {
                                    const label = getStatusLabel(project);
                                    const isOpen = label === 'Open';
                                    const slNo = (selectedRange.start + index + 1).toString().padStart(2, '0');
                                    return (
                                        <tr key={project.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'} transition-colors`}>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-3 py-6 text-center text-sm font-semibold text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {project.project_name}
                                                {project.description && (
                                                    <div className="text-xs text-[#616161] font-normal mt-0.5 line-clamp-1">{project.description}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-6 text-center text-sm font-bold text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {formatBudget(project.budget_ceiling || project.outsource_budget)}
                                            </td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {project.bid_deadline
                                                    ? new Date(project.bid_deadline).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-gantari`}>
                                                    {project.total_bids ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                                                <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari ${getStatusBadge(project.computed_status || project.status)}`}>
                                                    {label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                                                <button
                                                    className={`flex items-center justify-center gap-2 mx-auto px-4 py-3 rounded-md text-xs font-bold font-gantari transition-all ${isOpen && project.total_bids === 0
                                                        ? 'bg-[#F2F2F2] text-[#616161] cursor-not-allowed opacity-60'
                                                        : 'bg-[#DD4342] text-white shadow-sm shadow-red-100'
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
