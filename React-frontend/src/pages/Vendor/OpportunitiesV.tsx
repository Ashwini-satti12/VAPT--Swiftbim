import { useEffect, useState } from 'react';
import api from '../../lib/api';

type Opportunity = {
    id: number;
    project_name: string;
    outsource_budget: number;
    budget_ceiling?: number;
    bid_deadline: string;
    status: string;
    description?: string;
    technical_requirements?: string;
    bids_count?: number;
    host_name?: string;
    currency?: string;
    already_bid?: boolean;
};

type BidFormState = {
    bid_amount: string;
    notes: string;
    timeline: string;
    team_size: string;
};

export default function OpportunitiesV() {
    const [loading, setLoading] = useState(true);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
    const [bidForm, setBidForm] = useState<BidFormState>({ bid_amount: '', notes: '', timeline: '', team_size: '' });
    const [bidSubmitting, setBidSubmitting] = useState(false);
    const [bidSuccess, setBidSuccess] = useState<number | null>(null);
    const [bidError, setBidError] = useState<string | null>(null);

    useEffect(() => {
        api.get<{ opportunities: Opportunity[] }>('/api/vendors/opportunities')
            .then(({ data }) => setOpportunities(data.opportunities ?? []))
            .catch(() => setOpportunities([]))
            .finally(() => setLoading(false));
    }, []);

    const daysUntil = (dateStr: string) => {
        const deadline = new Date(dateStr);
        const diff = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const formatCurrency = (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    };

    const handleBidSubmit = async () => {
        if (!selectedOpportunity || !bidForm.bid_amount) {
            setBidError('Bid amount is required.');
            return;
        }
        setBidSubmitting(true);
        setBidError(null);
        try {
            await api.post(`/api/vendors/opportunities/${selectedOpportunity.id}/bid`, {
                bid_amount: Number(bidForm.bid_amount),
                notes: bidForm.notes,
                timeline: bidForm.timeline,
                team_size: Number(bidForm.team_size) || 0,
            });
            setBidSuccess(selectedOpportunity.id);
            // Mark as already_bid locally so button updates immediately
            setOpportunities(prev => prev.map(o =>
                o.id === selectedOpportunity.id ? { ...o, already_bid: true } : o
            ));
            setSelectedOpportunity(null);
            setBidForm({ bid_amount: '', notes: '', timeline: '', team_size: '' });
        } catch (_err) {
            setBidError('Failed to submit bid. Please try again.');
        } finally {
            setBidSubmitting(false);
        }
    };

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
                    <h2 className="text-2xl font-bold text-slate-800 font-gantari">Opportunities</h2>
                    {/* <p className="text-sm text-slate-500 mt-1 font-gantari">Active bidding opportunities — submit your bid before the deadline</p> */}
                </div>
                <span className="text-sm font-medium text-[#DE3D3A] bg-[#FFE5E5] px-4 py-1.5 rounded-full font-gantari">
                    {opportunities.filter(o => o.status === 'active').length} Active
                </span>
            </div>

            {/* Success banner */}
            {bidSuccess !== null && (
                <div className="mb-4 p-4 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <p className="font-medium font-gantari text-[#14532D] text-sm">Your bid has been submitted successfully!</p>
                    <button onClick={() => setBidSuccess(null)} className="ml-auto text-[#14532D] hover:text-[#166534]">✕</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                {opportunities.length === 0 ? (
                    <div className="bg-white/50 backdrop-blur-sm rounded-[20px] p-16 text-center text-slate-500 border border-white/40">
                        <p className="text-lg font-semibold font-gantari mb-2">No active opportunities</p>
                        <p className="text-sm font-gantari">Check back later — new bidding opportunities will appear here when available.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {opportunities.map(opp => {
                            const days = daysUntil(opp.bid_deadline);
                            const isUrgent = days <= 3;

                            return (
                                <div
                                    key={opp.id}
                                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col"
                                >
                                    <div className="p-6 flex-1 flex flex-col">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-[16px] font-bold text-slate-800 font-gantari line-clamp-2 flex-1 pr-2">
                                                {opp.project_name || 'Unnamed Project'}
                                            </h3>
                                            <span className={`shrink-0 text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${opp.status === 'active' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F2F2F2] text-[#717171]'}`}>
                                                {opp.status}
                                            </span>
                                        </div>

                                        {/* Details */}
                                        <div className="flex flex-col gap-2 flex-1">
                                            {opp.host_name && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[#717171] font-gantari">Host:</span>
                                                    <span className="text-xs font-semibold text-[#353535] font-gantari">{opp.host_name}</span>
                                                </div>
                                            )}
                                            {(opp.outsource_budget > 0 || opp.budget_ceiling) && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[#717171] font-gantari">Outsourcing Budget:</span>
                                                    <span className="text-sm font-bold text-[#DE3D3A] font-gantari">
                                                        {formatCurrency(opp.budget_ceiling || opp.outsource_budget, opp.currency)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-[#717171] font-gantari">Deadline:</span>
                                                <span className={`text-xs font-semibold font-gantari ${isUrgent ? 'text-[#E47E00]' : 'text-[#353535]'}`}>
                                                    {opp.bid_deadline ? new Date(opp.bid_deadline).toLocaleDateString() : '—'}
                                                    {opp.bid_deadline && ` (${days > 0 ? `${days}d left` : 'Ended'})`}
                                                </span>
                                            </div>
                                            {(opp.bids_count !== undefined) && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[#717171] font-gantari">Bids received:</span>
                                                    <span className="text-xs font-semibold text-[#353535] font-gantari">{opp.bids_count}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* CTA */}
                                        <div className="mt-5 border-t border-gray-100/80 pt-4">
                                            {opp.already_bid || bidSuccess === opp.id ? (
                                                <div className="text-center text-sm font-semibold text-[#16A34A] font-gantari py-1">✅ Bid Submitted</div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setSelectedOpportunity(opp);
                                                        setBidError(null);
                                                    }}
                                                    className="flex items-center justify-center w-full py-2.5 rounded-lg bg-[#DD4342] text-white font-medium text-[14px] hover:bg-[#c93d3d] transition-colors font-gantari"
                                                >
                                                    Submit Bid
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bid Modal */}
            {selectedOpportunity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-[#12141D] font-gantari">Submit Bid</h3>
                            <button onClick={() => { setSelectedOpportunity(null); setBidError(null); }} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button>
                        </div>

                        <p className="text-sm font-medium text-[#353535] font-gantari mb-6 bg-[#F8F8F8] p-4 rounded-xl">
                            📁 <span className="font-bold">{selectedOpportunity.project_name}</span>
                            {(selectedOpportunity.budget_ceiling || selectedOpportunity.outsource_budget) > 0 && (
                                <> — Outsourcing Budget: <span className="text-[#DE3D3A] font-bold">{formatCurrency(selectedOpportunity.budget_ceiling || selectedOpportunity.outsource_budget, selectedOpportunity.currency)}</span></>
                            )}
                        </p>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#353535] font-gantari mb-1">Bid Amount <span className="text-[#DE3D3A]">*</span></label>
                                <input
                                    type="number"
                                    value={bidForm.bid_amount}
                                    onChange={e => setBidForm(f => ({ ...f, bid_amount: e.target.value }))}
                                    placeholder="Enter your bid amount"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#353535] font-gantari mb-1">Timeline / Approach</label>
                                <input
                                    type="text"
                                    value={bidForm.timeline}
                                    onChange={e => setBidForm(f => ({ ...f, timeline: e.target.value }))}
                                    placeholder="e.g. 3 months"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#353535] font-gantari mb-1">Team Size</label>
                                <input
                                    type="number"
                                    value={bidForm.team_size}
                                    onChange={e => setBidForm(f => ({ ...f, team_size: e.target.value }))}
                                    placeholder="Number of team members"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#353535] font-gantari mb-1">Notes</label>
                                <textarea
                                    value={bidForm.notes}
                                    onChange={e => setBidForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Any additional notes or approach details"
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/30 resize-none"
                                />
                            </div>

                            {bidError && (
                                <div className="p-3 bg-[#FFE5E5] rounded-lg text-sm text-[#DE3D3A] font-gantari font-medium">{bidError}</div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setSelectedOpportunity(null); setBidError(null); }}
                                className="flex-1 py-2.5 bg-[#F2F2F2] text-[#353535] rounded-lg font-semibold font-gantari text-sm hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBidSubmit}
                                disabled={bidSubmitting}
                                className="flex-1 py-2.5 bg-[#DD4342] text-white rounded-lg font-semibold font-gantari text-sm hover:bg-[#c93d3d] transition-colors disabled:opacity-60"
                            >
                                {bidSubmitting ? 'Submitting…' : 'Submit Bid'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
