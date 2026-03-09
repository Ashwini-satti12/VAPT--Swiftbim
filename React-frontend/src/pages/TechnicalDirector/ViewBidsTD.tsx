import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import type { BiddingEntry } from './BiddingTD';
import viewIcon from '../../assets/ProjectManager/Client/whiteviewicon.svg';

interface VendorBid {
    id: number;
    vendor_id: number;
    opportunity_id: number;
    bid_amount: number;
    notes: string;
    timeline: string;
    team_size: number;
    status: string;
    created_at: string;
    vendor_name: string;
    vendor_email: string;
    vendor_phone: string;
    company_name: string;
    rank: number;
    is_top4: boolean;
}

interface ViewBidsTDProps {
    project: BiddingEntry;
    onBack: () => void;
}

/** Recomputes ranks: rejected bids go to bottom, rest renumber 1,2,3… */
function rerank(bids: VendorBid[]): VendorBid[] {
    const active = bids.filter(b => b.status !== 'lost').sort((a, b) => a.bid_amount - b.bid_amount);
    const rejected = bids.filter(b => b.status === 'lost');
    const ranked = [
        ...active.map((b, i) => ({ ...b, rank: i + 1 })),
        ...rejected.map((b, i) => ({ ...b, rank: active.length + i + 1 })),
    ];
    return ranked;
}

const rankLabel = (rank: number) => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
};

export default function ViewBidsTD({ project, onBack }: ViewBidsTDProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [bids, setBids] = useState<VendorBid[]>([]);
    const [opportunity, setOpportunity] = useState<Partial<BiddingEntry>>(project);

    // Per-bid action states
    const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
    const [viewLoading, setViewLoading] = useState<Record<number, boolean>>({});
    const [actionToast, setActionToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        api.get<{ opportunity: BiddingEntry; bids: VendorBid[] }>(`/api/vendors/bidding/${project.id}/bids`)
            .then(({ data }) => {
                setBids(rerank(data.bids ?? []));
                if (data.opportunity) setOpportunity(data.opportunity);
            })
            .catch(() => setBids([]))
            .finally(() => setLoading(false));
    }, [project.id]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const showToast = (msg: string, type: 'success' | 'error') => {
        setActionToast({ msg, type });
        setTimeout(() => setActionToast(null), 3500);
    };

    // ── View Vendor → redirect to /td/partner/:id ──
    const handleViewVendor = async (bid: VendorBid) => {
        setViewLoading(prev => ({ ...prev, [bid.id]: true }));
        try {
            const { data } = await api.get<{ vendor: { id: number } | null }>(`/api/vendors/by-email?email=${encodeURIComponent(bid.vendor_email)}`);
            if (data.vendor?.id) {
                navigate(`/td/partner/${data.vendor.id}`);
            } else {
                showToast('Vendor onboarding profile not found.', 'error');
            }
        } catch {
            showToast('Failed to load vendor profile.', 'error');
        } finally {
            setViewLoading(prev => ({ ...prev, [bid.id]: false }));
        }
    };

    // ── Accept ──
    const handleAccept = async (bid: VendorBid) => {
        setActionLoading(prev => ({ ...prev, [bid.id]: true }));
        try {
            const { data } = await api.post<{ success: boolean; bid: VendorBid }>(
                `/api/vendors/bidding/${project.id}/bids/${bid.id}/accept`
            );
            if (data.success) {
                setBids(prev => rerank(prev.map(b => b.id === bid.id ? { ...b, status: 'shortlisted' } : b)));
                showToast(`${bid.vendor_name} accepted — redirecting to Proposals...`, 'success');
                setTimeout(() => {
                    navigate('/td/proposals', {
                        state: {
                            acceptedBid: data.bid || bid,
                            projectName: opportunity.project_name,
                            opportunityId: project.id,
                        },
                    });
                }, 1400);
            } else {
                showToast('Failed to accept bid.', 'error');
            }
        } catch {
            showToast('Error accepting bid.', 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, [bid.id]: false }));
        }
    };

    // ── Reject → move to bottom, increment other ranks ──
    const handleReject = async (bid: VendorBid) => {
        setActionLoading(prev => ({ ...prev, [bid.id]: true }));
        try {
            const { data } = await api.post<{ success: boolean }>(
                `/api/vendors/bidding/${project.id}/bids/${bid.id}/reject`
            );
            if (data.success) {
                // Rerank: rejected → bottom, others reordered
                setBids(prev => rerank(prev.map(b => b.id === bid.id ? { ...b, status: 'lost' } : b)));
                showToast(`${bid.vendor_name}'s bid rejected and moved to bottom.`, 'success');
            } else {
                showToast('Failed to reject bid.', 'error');
            }
        } catch {
            showToast('Error rejecting bid.', 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, [bid.id]: false }));
        }
    };

    const getRankBg = (rank: number, status: string) => {
        if (status === 'lost') return 'bg-[#FCE8E8] text-[#D93025]';
        if (status === 'shortlisted') return 'bg-[#E6F4EA] text-[#1E7E34]';
        if (rank === 1) return 'bg-[#E6F4EA] text-[#1E7E34]';
        if (rank === 2) return 'bg-[#EAF0FB] text-[#1967D2]';
        if (rank === 3) return 'bg-[#FFF3E0] text-[#E65100]';
        return 'bg-[#F2F2F2] text-[#353535]';
    };


    const computedStatus = (opportunity.computed_status || opportunity.status || 'active').toLowerCase();
    const oppStatusLabel = computedStatus === 'active' ? 'Open' : computedStatus === 'awarded' ? 'Awarded' : 'Closed';
    const oppStatusCls = computedStatus === 'active' ? 'bg-blue-50 text-blue-600 border-blue-100' :
        computedStatus === 'awarded' ? 'bg-green-50 text-green-600 border-green-100' :
            'bg-gray-50 text-gray-500 border-gray-100';

    return (
        <div className="h-full flex flex-col px-4 py-2 font-gantari bg-white">
            {/* Toast */}
            {actionToast && (
                <div className={`fixed top-5 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl font-gantari text-sm font-medium min-w-[280px] transition-all ${actionToast.type === 'success' ? 'bg-[#1A8A47] text-white' : 'bg-[#D93025] text-white'}`}>
                    {actionToast.type === 'success'
                        ? <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    }
                    <span>{actionToast.msg}</span>
                </div>
            )}

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between flex-shrink-0 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="text-[#353535] transition-colors"
                        title="Back to Bidding"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div>
                        <h2 className="text-2xl font-semibold text-[#000000]">Bid Details</h2>
                        {/* <p className="text-sm text-[#616161] mt-0.5 font-gantari">
                            {opportunity.project_name} — review and manage vendor bids
                        </p> */}
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${oppStatusCls}`}>
                    {oppStatusLabel}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 space-y-6 flex flex-col min-h-0">

                {/* ── Project Summary ── */}
                <div className="bg-white rounded-2xl border border-[#AEACAC52] shadow-sm overflow-hidden flex-shrink-0">
                    <div className="flex flex-wrap divide-x divide-[#AEACAC52]">
                        <div className="flex-1 min-w-[160px] px-6 py-5">
                            <p className="text-xs text-[#616161] font-gantari mb-1 uppercase tracking-wider">Project Name</p>
                            <p className="text-sm font-bold text-[#353535] font-gantari">{opportunity.project_name || '—'}</p>
                        </div>
                        <div className="flex-1 min-w-[160px] px-6 py-5">
                            <p className="text-xs text-[#616161] font-gantari mb-1 uppercase tracking-wider">Outsourcing Budget</p>
                            <p className="text-sm font-bold text-[#353535] font-gantari">
                                {formatCurrency(opportunity.budget_ceiling || opportunity.outsource_budget || 0)}
                            </p>
                        </div>
                        <div className="flex-1 min-w-[160px] px-6 py-5">
                            <p className="text-xs text-[#616161] font-gantari mb-1 uppercase tracking-wider">Bidding End Date</p>
                            <p className="text-sm font-bold text-[#353535] font-gantari">
                                {opportunity.bid_deadline ? formatDate(opportunity.bid_deadline) : '—'}
                            </p>
                        </div>
                        <div className="flex-1 min-w-[100px] px-6 py-5">
                            <p className="text-xs text-[#616161] font-gantari mb-1 uppercase tracking-wider">Total Bids</p>
                            <p className="text-2xl font-bold text-[#353535] font-gantari leading-none">{bids.length}</p>
                        </div>
                        {opportunity.description && (
                            <div className="flex-1 min-w-[200px] px-6 py-5">
                                <p className="text-xs text-[#616161] font-gantari mb-1 uppercase tracking-wider">Description</p>
                                <p className="text-sm text-[#353535] font-gantari line-clamp-2">{opportunity.description}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Vendor Bids Table ── */}
                <div className="bg-white rounded-2xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                    {/* Table header bar */}
                    {/* <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                        <h3 className="text-base font-bold text-[#353535] font-gantari">
                            Vendor Bids
                            <span className="ml-2 text-sm font-semibold text-[#616161]">({bids.length})</span>
                        </h3>
                        <span className="text-xs text-[#616161] font-gantari">Ranked by lowest bid amount · rejected bids move to bottom</span>
                    </div> */}

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
                        </div>
                    ) : bids.length === 0 ? (
                        <div className="py-20 text-center text-[#616161] font-gantari">
                            <svg className="w-14 h-14 mx-auto mb-4 text-[#E2E8F0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-lg font-semibold mb-1 text-[#353535]">No bids received yet</p>
                            <p className="text-sm">Vendors will appear here once they submit bids.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto overflow-y-auto custom-scrollbar smooth-scroll flex-1 min-h-0">
                            <table className="min-w-full border-collapse">
                                <thead className="sticky top-0 z-10 bg-white">
                                    <tr className="border-b border-gray-100 bg-white">
                                        <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                        <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Vendor Name</th>
                                        <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Contact Email</th>
                                        <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Bid Amount</th>
                                        <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Timeline</th>
                                        <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Team Size</th>
                                        <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Bid Date</th>
                                        <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Rank</th>
                                        <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">View Vendor</th>
                                        <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {bids.map((bid, index) => {
                                        const isRejected = bid.status === 'lost';
                                        const busy = !!actionLoading[bid.id];
                                        const viewBusy = !!viewLoading[bid.id];
                                        const slNo = (index + 1).toString().padStart(2, '0');

                                        return (
                                            <tr
                                                key={bid.id}
                                                className={`${isRejected ? 'opacity-60' : ''} ${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}
                                            >
                                                {/* Sl.No */}
                                                <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>

                                                {/* Vendor Name */}
                                                <td className="px-3 py-3 text-center text-sm font-semibold text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                    {bid.vendor_name}
                                                    {bid.notes && <div className="text-xs text-[#616161] font-normal mt-0.5 line-clamp-1">{bid.notes}</div>}
                                                </td>

                                                {/* Email */}
                                                <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{bid.vendor_email || '—'}</td>

                                                {/* Bid Amount */}
                                                <td className="px-3 py-3 text-center text-sm font-bold text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                    {formatCurrency(bid.bid_amount)}
                                                </td>

                                                {/* Timeline */}
                                                <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{bid.timeline || '—'}</td>

                                                {/* Team Size */}
                                                <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                    {bid.team_size > 0 ? bid.team_size : '—'}
                                                </td>

                                                {/* Bid Date */}
                                                <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{formatDate(bid.created_at)}</td>

                                                {/* Rank */}
                                                <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold font-gantari ${getRankBg(bid.rank, bid.status)}`}>
                                                        {isRejected ? 'Rejected' : rankLabel(bid.rank)}
                                                    </span>
                                                </td>

                                                {/* View Vendor → redirects to /td/partner/:id */}
                                                <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                    <button
                                                        onClick={() => handleViewVendor(bid)}
                                                        disabled={viewBusy}
                                                        className="flex items-center justify-center gap-1.5 mx-auto px-4 py-2 rounded-md text-xs font-bold bg-[#DD4342] text-white hover:bg-[#c23b3a] shadow-sm shadow-red-100 transition-all font-gantari disabled:opacity-60"
                                                        title="View vendor profile"
                                                    >
                                                        {viewBusy
                                                            ? <span className="animate-spin w-3.5 h-3.5 border-b-2 border-white rounded-full inline-block" />
                                                            : <img src={viewIcon} alt="" className="w-4 h-4 object-contain" />
                                                        }
                                                        View
                                                    </button>
                                                </td>

                                                {/* Action */}
                                                <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                    {bid.status === 'shortlisted' ? (
                                                        <span className="inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari bg-[#E6F4EA] text-[#1E7E34]">
                                                            Accepted
                                                        </span>
                                                    ) : bid.status === 'lost' ? (
                                                        <span className="inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari bg-[#FCE8E8] text-[#D93025]">
                                                            Rejected
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            {/* Accept — icon only circle */}
                                                            <button
                                                                disabled={busy}
                                                                onClick={() => handleAccept(bid)}
                                                                title="Accept bid"
                                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#E6F4EA] text-[#1E7E34] transition-colors disabled:opacity-60"
                                                            >
                                                                {busy
                                                                    ? <span className="animate-spin w-3 h-3 border-b-2 border-current rounded-full inline-block" />
                                                                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                }
                                                            </button>
                                                            {/* Reject — icon only circle */}
                                                            <button
                                                                disabled={busy}
                                                                onClick={() => handleReject(bid)}
                                                                title="Reject bid"
                                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FCE8E8] text-[#D93025] transition-colors disabled:opacity-60"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                    )}
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

            <style>{`
                .smooth-scroll { scroll-behavior: smooth; }
                .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #8c8c8c #f3f3f3; }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f3f3f3; border-radius: 20px; margin: 10px 0; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #8c8c8c; border-radius: 20px; border: 2px solid #f3f3f3; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #666666; }
            `}</style>
        </div>
    );
}
