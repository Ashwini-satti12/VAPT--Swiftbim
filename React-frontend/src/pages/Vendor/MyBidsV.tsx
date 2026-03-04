import { useEffect, useState } from 'react';
import api from '../../lib/api';

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

const STATUS_STYLES: Record<string, string> = {
    submitted: 'bg-[#EFF6FF] text-[#1D4ED8]',
    shortlisted: 'bg-[#F0FDF4] text-[#16A34A]',
    won: 'bg-[#F0FDF4] text-[#15803D]',
    removed: 'bg-[#FFF1F2] text-[#BE123C]',
    lost: 'bg-[#FFF1F2] text-[#BE123C]',
    default: 'bg-[#F2F2F2] text-[#717171]',
};

export default function MyBidsV() {
    const [loading, setLoading] = useState(true);
    const [bids, setBids] = useState<Bid[]>([]);

    useEffect(() => {
        api.get<{ bids: Bid[] }>('/api/vendors/mybids')
            .then(({ data }) => setBids(data.bids ?? []))
            .catch(() => setBids([]))
            .finally(() => setLoading(false));
    }, []);

    const formatCurrency = (amount: number, currency = 'USD') => {
        if (!amount) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString();
    };

    const getStatusStyle = (status: string) =>
        STATUS_STYLES[status?.toLowerCase()] ?? STATUS_STYLES.default;

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DE3D3A]" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-gantari">My Bids</h2>
                    <p className="text-sm text-slate-500 mt-1 font-gantari">All bids you have submitted across active and past opportunities</p>
                </div>
                <span className="text-sm font-medium text-[#353535] bg-[#F2F2F2] px-4 py-1.5 rounded-full font-gantari">
                    {bids.length} Total
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
                {bids.length === 0 ? (
                    <div className="bg-white/50 backdrop-blur-sm rounded-[20px] p-16 text-center text-slate-500 border border-white/40">
                        <p className="text-lg font-semibold font-gantari mb-2">No bids submitted yet</p>
                        <p className="text-sm font-gantari">Visit the Opportunities page to find and bid on active projects.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] overflow-hidden">
                        <div className="bg-[#F8FAFC] px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
                            <h3 className="text-lg font-bold text-[#1E293B] font-gantari">Bid History</h3>
                            <div className="flex gap-2">
                                {['submitted', 'shortlisted', 'won'].map(s => (
                                    <span key={s} className={`text-[11px] px-2.5 py-1 rounded-full font-bold font-gantari ${getStatusStyle(s)}`}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}: {bids.filter(b => b.status?.toLowerCase() === s).length}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead className="bg-[#F8FAFC]">
                                    <tr>
                                        <th className="py-4 px-6 font-gantari text-[#64748B] text-sm uppercase tracking-wider">Project</th>
                                        <th className="py-4 px-6 font-gantari text-[#64748B] text-sm uppercase tracking-wider">Bid Amount</th>
                                        <th className="py-4 px-6 font-gantari text-[#64748B] text-sm uppercase tracking-wider">Budget</th>
                                        <th className="py-4 px-6 font-gantari text-[#64748B] text-sm uppercase tracking-wider">Deadline</th>
                                        <th className="py-4 px-6 font-gantari text-[#64748B] text-sm uppercase tracking-wider">Submitted</th>
                                        <th className="py-4 px-6 font-gantari text-[#64748B] text-sm uppercase tracking-wider text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0]">
                                    {bids.map((bid) => (
                                        <tr key={bid.id} className="hover:bg-[#F8FAFC] transition-colors">
                                            <td className="py-5 px-6">
                                                <div className="text-sm font-bold text-[#1E293B] font-gantari">{bid.project_name || `Opportunity #${bid.opportunity_id}`}</div>
                                                {bid.timeline && <div className="text-[11px] text-[#64748B] mt-0.5 font-gantari">Timeline: {bid.timeline}</div>}
                                                {bid.team_size ? <div className="text-[11px] text-[#64748B] font-gantari">Team: {bid.team_size} members</div> : null}
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm font-bold text-[#DE3D3A] font-gantari">{formatCurrency(bid.bid_amount, bid.currency)}</div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm text-[#475569] font-gantari">{bid.outsource_budget ? formatCurrency(bid.outsource_budget, bid.currency) : '—'}</div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm text-[#475569] font-gantari">{formatDate(bid.bid_deadline || '')}</div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm text-[#475569] font-gantari">{formatDate(bid.created_at)}</div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex justify-center">
                                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold font-gantari ${getStatusStyle(bid.status)}`}>
                                                        {bid.status ? bid.status.charAt(0).toUpperCase() + bid.status.slice(1) : 'Unknown'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
