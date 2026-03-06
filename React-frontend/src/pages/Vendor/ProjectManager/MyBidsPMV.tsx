import { useEffect, useState } from "react";
import api from "../../../lib/api";

type Bid = {
    id: number;
    opportunity_id: number;
    bid_amount: number;
    status: string;
    notes?: string;
    timeline?: string;
    team_size?: number;
    created_at: string;
    // joined from vendor_bidding
    project_name?: string;
    outsource_budget?: number;
    bid_deadline?: string;
    currency?: string;
};

export default function MyBidsPMV() {
    const [loading, setLoading] = useState(true);
    const [bids, setBids] = useState<Bid[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailBid, setDetailBid] = useState<Bid | null>(null);

    useEffect(() => {
        api.get<{ bids: Bid[] }>('/api/vendors/mybids')
            .then(({ data }) => setBids(data.bids ?? []))
            .catch(() => setBids([]))
            .finally(() => setLoading(false));
    }, []);

    const formatBudget = (amount: number | undefined) => {
        if (!amount) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    const getStatusLabel = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'submitted') return 'Submitted';
        if (s === 'shortlisted') return 'Shortlisted';
        if (s === 'won') return 'Won';
        if (s === 'lost') return 'Lost';
        if (s === 'removed') return 'Removed';
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    };

    const getStatusBadge = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'submitted') return 'bg-[#EAF0FB] text-[#1967D2]';
        if (s === 'shortlisted') return 'bg-[#E6F4EA] text-[#1E7E34]';
        if (s === 'won') return 'bg-[#E6F4EA] text-[#1E7E34]';
        if (s === 'lost' || s === 'removed') return 'bg-[#FFF1F2] text-[#BE123C]';
        return 'bg-[#F2F2F2] text-[#616161]';
    };

    const filtered = bids.filter(b =>
        (b.project_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="px-1 pt-1 pb-0 space-y-8 flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="text-2xl font-semibold text-[#000000]">My Bids</h2>
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
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DE3D3A]" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center text-[#616161] font-gantari">
                            <svg className="w-14 h-14 mx-auto mb-4 text-[#AEACAC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-semibold mb-1 text-[#353535]">No bids submitted yet</p>
                            <p className="text-sm">Visit the Opportunities page to find and bid on active projects.</p>
                        </div>
                    ) : (
                        <table className="min-w-full border-collapse">
                            <thead className="sticky top-0 z-10 bg-white">
                                <tr className="border-b border-gray-100 bg-white">
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Project Name</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Bid Amount</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Budget</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Deadline</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Submitted On</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Status</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((bid, index) => {
                                    const slNo = (index + 1).toString().padStart(2, '0');
                                    return (
                                        <tr key={bid.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'} transition-colors`}>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-3 py-3 text-center text-sm font-semibold text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {bid.project_name || `Opportunity #${bid.opportunity_id}`}
                                                {bid.timeline && (
                                                    <div className="text-xs text-[#616161] font-normal mt-0.5 line-clamp-1">Timeline: {bid.timeline}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm font-bold text-[#DE3D3A] font-gantari whitespace-nowrap align-middle">
                                                {formatBudget(bid.bid_amount)}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm font-bold text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {formatBudget(bid.outsource_budget)}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {bid.bid_deadline
                                                    ? new Date(bid.bid_deadline).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {bid.created_at
                                                    ? new Date(bid.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari ${getStatusBadge(bid.status)}`}>
                                                    {getStatusLabel(bid.status)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                <button
                                                    className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-md text-xs font-bold font-gantari transition-all bg-[#DD4342] text-white hover:bg-[#c23b3a] shadow-sm shadow-red-100"
                                                    onClick={() => setDetailBid(bid)}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    View
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

            {/* Detail Modal */}
            {detailBid && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-xl font-bold text-[#12141D] font-gantari">Bid Details</h3>
                            <button onClick={() => setDetailBid(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="flex flex-col gap-3 text-sm font-gantari">
                            <div className="flex gap-2"><span className="text-[#717171] font-medium w-32">Project</span><span className="text-[#353535] font-semibold">{detailBid.project_name || `Opportunity #${detailBid.opportunity_id}`}</span></div>
                            <div className="flex gap-2"><span className="text-[#717171] font-medium w-32">Bid Amount</span><span className="text-[#DE3D3A] font-bold">{formatBudget(detailBid.bid_amount)}</span></div>
                            <div className="flex gap-2"><span className="text-[#717171] font-medium w-32">Budget</span><span className="text-[#353535] font-semibold">{formatBudget(detailBid.outsource_budget)}</span></div>
                            <div className="flex gap-2"><span className="text-[#717171] font-medium w-32">Status</span><span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${getStatusBadge(detailBid.status)}`}>{getStatusLabel(detailBid.status)}</span></div>
                            <div className="flex gap-2"><span className="text-[#717171] font-medium w-32">Deadline</span><span className="text-[#353535] font-semibold">{detailBid.bid_deadline ? new Date(detailBid.bid_deadline).toLocaleDateString() : '—'}</span></div>
                            <div className="flex gap-2"><span className="text-[#717171] font-medium w-32">Submitted</span><span className="text-[#353535] font-semibold">{detailBid.created_at ? new Date(detailBid.created_at).toLocaleDateString() : '—'}</span></div>
                            {detailBid.timeline && <div className="flex gap-2"><span className="text-[#717171] font-medium w-32">Timeline</span><span className="text-[#353535] font-semibold">{detailBid.timeline}</span></div>}
                            {detailBid.team_size ? <div className="flex gap-2"><span className="text-[#717171] font-medium w-32">Team Size</span><span className="text-[#353535] font-semibold">{detailBid.team_size} members</span></div> : null}
                            {detailBid.notes && (
                                <div className="flex flex-col gap-1 mt-1"><span className="text-[#717171] font-medium">Notes</span><p className="text-[#353535] leading-relaxed bg-[#F8F8F8] rounded-lg p-3">{detailBid.notes}</p></div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDetailBid(null)} className="flex-1 py-2.5 bg-[#F2F2F2] text-[#353535] rounded-lg font-semibold font-gantari text-sm hover:bg-slate-200 transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
