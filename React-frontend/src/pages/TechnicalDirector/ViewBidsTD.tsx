import { useEffect, useState } from 'react';
import api from '../../lib/api';
import type { BiddingEntry } from './BiddingTD';

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
    // enriched from employee table
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

const rankLabel = (rank: number) => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
};

const rankColors: Record<number, { text: string; bg: string }> = {
    1: { text: 'text-green-600', bg: 'bg-green-50' },
    2: { text: 'text-blue-600', bg: 'bg-blue-50' },
    3: { text: 'text-orange-500', bg: 'bg-orange-50' },
};

export default function ViewBidsTD({ project, onBack }: ViewBidsTDProps) {
    const [loading, setLoading] = useState(true);
    const [bids, setBids] = useState<VendorBid[]>([]);
    const [opportunity, setOpportunity] = useState<Partial<BiddingEntry>>(project);

    useEffect(() => {
        api.get<{ opportunity: BiddingEntry; bids: VendorBid[] }>(`/api/vendors/bidding/${project.id}/bids`)
            .then(({ data }) => {
                setBids(data.bids ?? []);
                if (data.opportunity) setOpportunity(data.opportunity);
            })
            .catch(() => setBids([]))
            .finally(() => setLoading(false));
    }, [project.id]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const top4Bids = bids.filter(b => b.is_top4);

    return (
        <div className="min-h-screen bg-[#F0F4F8] font-sans text-[#334155] flex flex-col">
            {/* Header */}
            <div className="bg-white px-8 py-4 flex items-center gap-4 shadow-sm border-b border-slate-200">
                <button onClick={onBack} className="text-[#353535] hover:bg-slate-100 p-1.5 rounded-full transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <h1 className="text-2xl font-bold text-[#353535] font-gantari tracking-tight">Bidding Details</h1>
            </div>

            <div className="flex-1 p-8 space-y-8 max-w-[1600px] mx-auto w-full">
                {/* Project Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-[#353535] inline-block px-8 py-2 rounded-br-3xl">
                        <h2 className="text-white font-bold font-gantari tracking-wide">Project Summary</h2>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                        <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-slate-100" />
                        {/* Left */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-500 w-36 text-sm">Project:</span>
                                <span className="font-bold text-slate-700 font-gantari">{opportunity.project_name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-500 w-36 text-sm">Outsourcing Budget:</span>
                                <span className="text-lg font-black text-[#353535] font-gantari">
                                    {formatCurrency(opportunity.budget_ceiling || opportunity.outsource_budget || 0)}
                                </span>
                            </div>
                            {opportunity.description && (
                                <div className="flex items-start gap-3">
                                    <span className="font-semibold text-slate-500 w-36 text-sm shrink-0">Description:</span>
                                    <span className="text-sm text-slate-600 font-gantari">{opportunity.description}</span>
                                </div>
                            )}
                        </div>
                        {/* Right */}
                        <div className="space-y-4 md:pl-12">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-500 w-44 text-sm">Bidding End Date:</span>
                                <span className="font-bold text-slate-700 font-gantari">{formatDate(opportunity.bid_deadline || '')}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-500 w-44 text-sm">Total Bids Received:</span>
                                <span className="font-bold text-slate-700 font-gantari text-lg">{bids.length}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-500 w-44 text-sm">Status:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${(opportunity.computed_status || opportunity.status || 'active') === 'active'
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : 'bg-gray-50 text-gray-500 border-gray-100'
                                    }`}>
                                    {(opportunity.computed_status || opportunity.status || 'active') === 'active' ? 'Open' : 'Closed'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vendor Bids Table */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <svg className="w-5 h-5 text-[#353535]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 7.13l.97 2.29 2.48.21-1.88 1.63.55 2.44-2.12-1.25-2.12 1.25.55-2.44-1.88-1.63 2.48-.21.97-2.29M12 2l-3.3 7.82-8.35.71 6.38 5.56-1.8 7.91L12 19l7.07 4.14-1.8-7.91 6.38-5.56-8.35-.71L12 2z" />
                        </svg>
                        <h2 className="text-lg font-bold text-slate-700 font-gantari uppercase tracking-wide">Vendor Bids</h2>
                        <span className="text-sm text-slate-400 font-gantari">({bids.length} bids — ranked by lowest amount)</span>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DE3D3A]" />
                            </div>
                        ) : bids.length === 0 ? (
                            <div className="py-16 text-center text-slate-400 font-gantari">
                                <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-base font-semibold">No bids received yet</p>
                                <p className="text-sm mt-1">Vendors will appear here once they submit bids.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#F8FAFC] border-b border-slate-200">
                                        <th className="px-6 py-4 text-sm font-bold text-[#353535] font-gantari">Vendor Name</th>
                                        <th className="px-6 py-4 text-sm font-bold text-[#353535] font-gantari">Contact Email</th>
                                        <th className="px-6 py-4 text-sm font-bold text-[#353535] text-center font-gantari">Bid Amount</th>
                                        <th className="px-6 py-4 text-sm font-bold text-[#353535] text-center font-gantari">Timeline</th>
                                        <th className="px-6 py-4 text-sm font-bold text-[#353535] text-center font-gantari">Team Size</th>
                                        <th className="px-6 py-4 text-sm font-bold text-[#353535] text-center font-gantari">Bid Date</th>
                                        <th className="px-6 py-4 text-sm font-bold text-[#353535] text-center font-gantari">Rank</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bids.map((bid) => {
                                        const colors = rankColors[bid.rank] || { text: 'text-slate-500', bg: 'bg-slate-50' };
                                        return (
                                            <tr key={bid.id} className={`hover:bg-slate-50 transition duration-150 ${bid.rank === 1 ? 'bg-green-50/30' : ''}`}>
                                                <td className="px-6 py-5">
                                                    <div className="font-bold text-slate-700 font-gantari">{bid.vendor_name}</div>
                                                    {bid.notes && (
                                                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{bid.notes}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="text-[#353535] text-sm underline cursor-pointer font-gantari">{bid.vendor_email || '—'}</span>
                                                </td>
                                                <td className="px-6 py-5 text-center font-bold text-slate-800 font-gantari">
                                                    {formatCurrency(bid.bid_amount)}
                                                </td>
                                                <td className="px-6 py-5 text-center text-slate-600 font-gantari text-sm">
                                                    {bid.timeline || '—'}
                                                </td>
                                                <td className="px-6 py-5 text-center font-gantari text-sm text-slate-600">
                                                    {bid.team_size > 0 ? `${bid.team_size} members` : '—'}
                                                </td>
                                                <td className="px-6 py-5 text-center text-slate-600 font-gantari text-sm">
                                                    {formatDate(bid.created_at)}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}>
                                                        {rankLabel(bid.rank)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Top Recommended Vendors */}
                {top4Bids.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <svg className="w-5 h-5 text-[#353535]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 10.63 21 8.55 21 6V5c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                            </svg>
                            <h2 className="text-lg font-bold text-slate-700 font-gantari uppercase tracking-wide">Top Recommended Vendors</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                            {top4Bids.map((bid) => {
                                const colors = rankColors[bid.rank] || { text: 'text-slate-500', bg: 'bg-slate-50' };
                                const initials = (bid.vendor_name || 'V').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                                return (
                                    <div key={bid.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center hover:shadow-md transition duration-300">
                                        <div className={`w-16 h-16 mb-3 flex items-center justify-center rounded-full text-xl font-black tracking-tighter ${colors.bg} ${colors.text}`}>
                                            {initials}
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-base font-gantari">{bid.vendor_name}</h3>
                                        <p className="text-xs text-slate-400 mt-0.5 mb-3 font-gantari">{bid.vendor_email}</p>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full mb-4 ${colors.bg} ${colors.text}`}>
                                            {rankLabel(bid.rank)} Place
                                        </span>
                                        <div className="w-full bg-slate-50 rounded-lg p-3">
                                            <div className="text-xl font-black text-[#353535] font-gantari">{formatCurrency(bid.bid_amount)}</div>
                                            {bid.timeline && (
                                                <div className="text-xs text-slate-400 mt-1 font-gantari">{bid.timeline}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
