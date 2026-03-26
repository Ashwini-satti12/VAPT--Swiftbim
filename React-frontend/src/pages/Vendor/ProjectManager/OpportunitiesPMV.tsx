import { useEffect, useState } from "react";
import api from "../../../lib/api";

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

type ActiveTab = 'all' | 'active' | 'bid' | 'closed';

// Derive tags from technical_requirements or description
function getTags(opp: Opportunity): string[] {
    const raw = opp.technical_requirements || opp.description || '';
    const words = raw.split(/[\s,;/|]+/).filter((w) => w.length >= 2 && w.length <= 20);
    return words.slice(0, 4);
}

// Initials avatar background colors
const AVATAR_COLORS = [
    '#DE3D3A', '#3B82F6', '#E47E00', '#00882E',
    '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B',
];

function getAvatarColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function formatBudget(amount: number) {
    if (!amount) return '—';
    if (amount >= 10000000) return `₹ ${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(1)} L`;
    if (amount >= 1000) return `₹ ${(amount / 1000).toFixed(0)}K`;
    return `₹ ${amount}`;
}

export default function OpportunitiesPMV() {
    const [loading, setLoading] = useState(true);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
    const [detailOpportunity, setDetailOpportunity] = useState<Opportunity | null>(null);
    const [bidForm, setBidForm] = useState<BidFormState>({ bid_amount: '', notes: '', timeline: '', team_size: '' });
    const [bidSubmitting, setBidSubmitting] = useState(false);
    const [bidSuccess, setBidSuccess] = useState<number | null>(null);
    const [bidError, setBidError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.get<{ opportunities: Opportunity[] }>('/api/vendors/opportunities')
            .then(({ data }) => setOpportunities(data.opportunities ?? []))
            .catch(() => setOpportunities([]))
            .finally(() => setLoading(false));
    }, []);

    const daysUntil = (dateStr: string) => {
        if (!dateStr) return 0;
        const deadline = new Date(dateStr);
        return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
            setOpportunities(prev =>
                prev.map(o => o.id === selectedOpportunity.id ? { ...o, already_bid: true } : o)
            );
            setSelectedOpportunity(null);
            setBidForm({ bid_amount: '', notes: '', timeline: '', team_size: '' });
        } catch {
            setBidError('Failed to submit bid. Please try again.');
        } finally {
            setBidSubmitting(false);
        }
    };

    // KPI stats
    const totalOpps = opportunities.length;
    const activeOpps = opportunities.filter(o => o.status === 'active').length;
    const bidSubmittedOpps = opportunities.filter(o => o.already_bid).length;
    const closedOpps = opportunities.filter(o => o.status !== 'active').length;

    // Filtered list
    const filtered = opportunities.filter(opp => {
        if (activeTab === 'active' && opp.status !== 'active') return false;
        if (activeTab === 'bid' && !opp.already_bid) return false;
        if (activeTab === 'closed' && opp.status === 'active') return false;
        if (search && !opp.project_name.toLowerCase().includes(search.toLowerCase()) &&
            !(opp.host_name || '').toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const tabs: { key: ActiveTab; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'active', label: 'Active' },
        { key: 'bid', label: 'Bid Submitted' },
        { key: 'closed', label: 'Closed' },
    ];

    const kpiCards = [
        { label: 'Total Opportunities', value: totalOpps, pct: 100 },
        { label: 'Active Opportunities', value: activeOpps, pct: totalOpps ? Math.round((activeOpps / totalOpps) * 100) : 0 },
        { label: 'Bids Submitted', value: bidSubmittedOpps, pct: totalOpps ? Math.round((bidSubmittedOpps / totalOpps) * 100) : 0 },
        { label: 'Closed', value: closedOpps, pct: totalOpps ? Math.round((closedOpps / totalOpps) * 100) : 0 },
    ];

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DE3D3A]" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
                {kpiCards.map((card, i) => (
                    <div key={i} className="bg-white border border-[#EBEBEB] rounded-xl px-5 py-4 shadow-sm">
                        <p className="text-[12px] text-[#717171] font-gantari font-medium mb-1">{card.label}</p>
                        <p className="text-[28px] font-bold text-[#222] font-gantari leading-none mb-3">{card.value}</p>
                        {/* Dotted progress bar — like the image */}
                        <div className="flex gap-[3px]">
                            {Array.from({ length: 20 }).map((_, j) => (
                                <div
                                    key={j}
                                    className="h-[3px] flex-1 rounded-full"
                                    style={{ backgroundColor: j < Math.round(card.pct / 5) ? '#353535' : '#E5E5E5' }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Tabs + Search + Filter ── */}
            <div className="flex flex-wrap items-center gap-3 mb-5 shrink-0">
                {/* Tabs */}
                <div className="flex items-center gap-0 border-b border-[#E5E5E5]">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 text-[13px] font-semibold font-gantari whitespace-nowrap transition-colors border-b-2 -mb-px cursor-pointer ${activeTab === tab.key
                                ? 'border-[#DE3D3A] text-[#DE3D3A]'
                                : 'border-transparent text-[#717171] hover:text-[#353535]'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                {/* Search */}
                <div className="relative">
                    <svg className="w-4 h-4 text-[#AEACAC] absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by project name"
                        className="pl-9 pr-4 py-2 text-[13px] border border-[#E5E5E5] rounded-lg font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/20 w-52"
                    />
                </div>

                {/* Filter button */}
                <button className="flex items-center gap-2 px-4 py-2 bg-[#222] text-white text-[13px] font-semibold font-gantari rounded-lg hover:bg-[#333] transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
                    </svg>
                    Filter
                </button>
            </div>

            {/* ── Success Banner ── */}
            {bidSuccess !== null && (
                <div className="mb-4 p-4 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl flex items-center gap-3 shrink-0">
                    <span className="text-xl">✅</span>
                    <p className="font-medium font-gantari text-[#14532D] text-sm">Your bid has been submitted successfully!</p>
                    <button onClick={() => setBidSuccess(null)} className="ml-auto text-[#14532D] hover:text-[#166534] cursor-pointer">✕</button>
                </div>
            )}

            {/* ── Cards Grid ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center text-slate-500 border border-[#EBEBEB]">
                        <p className="text-lg font-semibold font-gantari mb-2">No opportunities found</p>
                        <p className="text-sm font-gantari">Check back later — new bidding opportunities will appear here when available.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                        {filtered.map(opp => {
                            const days = daysUntil(opp.bid_deadline);
                            const isActive = opp.status === 'active';
                            const tags = getTags(opp);
                            const name = opp.project_name || 'Unnamed Project';
                            const avatarBg = getAvatarColor(name);
                            const initials = getInitials(name);
                            const alreadyBid = opp.already_bid || bidSuccess === opp.id;

                            return (
                                <div
                                    key={opp.id}
                                    className="bg-white border border-[#EBEBEB] rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    {/* Top row: avatar + name + status badge */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                                                style={{ backgroundColor: avatarBg }}
                                            >
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[14px] font-bold text-[#222] font-gantari truncate leading-tight">{name}</p>
                                                {opp.host_name && (
                                                    <p className="text-[12px] text-[#717171] font-gantari truncate">{opp.host_name}</p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Status badge — Reg. Open / Reg. Closed */}
                                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${isActive
                                            ? 'bg-[#E8F9E8] text-[#16A34A]'
                                            : 'bg-[#FFE5E5] text-[#DE3D3A]'
                                            }`}>
                                            ● {isActive ? 'Reg. Open' : 'Reg. Closed'}
                                        </span>
                                    </div>

                                    {/* Tags row */}
                                    {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {tags.map((tag, ti) => (
                                                <span key={ti} className="text-[11px] bg-[#F2F2F2] text-[#353535] px-2 py-0.5 rounded font-gantari font-medium">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Deadline row */}
                                    <div className="flex items-center gap-1.5 text-[12px] text-[#717171] font-gantari">
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                                        </svg>
                                        {opp.bid_deadline
                                            ? `${new Date(opp.bid_deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${days > 0 ? `· ${days}d left` : '· Ended'}`
                                            : 'No deadline'
                                        }
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-[#F0F0F0]" />

                                    {/* Budget + Check Details */}
                                    <div className="flex items-center justify-between">
                                        <p className="text-[16px] font-bold text-[#222] font-gantari">
                                            {formatBudget(opp.budget_ceiling || opp.outsource_budget)}
                                        </p>
                                        <button
                                            onClick={() => setDetailOpportunity(opp)}
                                            className="flex items-center gap-1 text-[13px] font-semibold text-[#353535] font-gantari hover:text-[#DE3D3A] transition-colors cursor-pointer"
                                        >
                                            Check Details
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Eligibility / CTA row */}
                                    <div className="flex items-center justify-between pt-1">
                                        {alreadyBid ? (
                                            <span className="flex items-center gap-1.5 text-[12px] text-[#16A34A] font-gantari font-semibold">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Bid Submitted
                                            </span>
                                        ) : isActive ? (
                                            <button
                                                onClick={() => { setSelectedOpportunity(opp); setBidError(null); }}
                                                className="text-[12px] font-bold text-white bg-[#DE3D3A] px-3 py-1.5 rounded-lg font-gantari hover:bg-[#c93d3d] transition-colors cursor-pointer"
                                            >
                                                Submit Bid
                                            </button>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-[12px] text-[#DE3D3A] font-gantari font-semibold">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="10" strokeWidth={2} />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9l-6 6M9 9l6 6" />
                                                </svg>
                                                Closed
                                            </span>
                                        )}

                                        {opp.bids_count !== undefined && (
                                            <span className="text-[11px] text-[#AEACAC] font-gantari">{opp.bids_count} bids</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Detail Modal ── */}
            {detailOpportunity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-[#12141D] font-gantari">{detailOpportunity.project_name}</h3>
                            <button onClick={() => setDetailOpportunity(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none cursor-pointer">&times;</button>
                        </div>
                        <div className="flex flex-col gap-3 text-sm font-gantari">
                            {detailOpportunity.host_name && (
                                <div className="flex gap-2"><span className="text-[#717171] font-medium w-28">Host</span><span className="text-[#353535] font-semibold">{detailOpportunity.host_name}</span></div>
                            )}
                            <div className="flex gap-2"><span className="text-[#717171] font-medium w-28">Status</span><span className={`font-bold ${detailOpportunity.status === 'active' ? 'text-[#16A34A]' : 'text-[#DE3D3A]'}`}>{detailOpportunity.status === 'active' ? 'Open' : 'Closed'}</span></div>
                            <div className="flex gap-2"><span className="text-[#717171] font-medium w-28">Deadline</span><span className="text-[#353535] font-semibold">{detailOpportunity.bid_deadline ? new Date(detailOpportunity.bid_deadline).toLocaleDateString() : '—'}</span></div>
                            <div className="flex gap-2"><span className="text-[#717171] font-medium w-28">Budget</span><span className="text-[#DE3D3A] font-bold">{formatBudget(detailOpportunity.budget_ceiling || detailOpportunity.outsource_budget)}</span></div>
                            {detailOpportunity.description && (
                                <div className="flex flex-col gap-1"><span className="text-[#717171] font-medium">Description</span><p className="text-[#353535] leading-relaxed bg-[#F8F8F8] rounded-lg p-3">{detailOpportunity.description}</p></div>
                            )}
                            {detailOpportunity.technical_requirements && (
                                <div className="flex flex-col gap-1"><span className="text-[#717171] font-medium">Requirements</span><p className="text-[#353535] leading-relaxed bg-[#F8F8F8] rounded-lg p-3">{detailOpportunity.technical_requirements}</p></div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDetailOpportunity(null)} className="flex-1 py-2.5 bg-[#F2F2F2] text-[#353535] rounded-lg font-semibold font-gantari text-sm hover:bg-slate-200 transition-colors cursor-pointer">Close</button>
                            {detailOpportunity.status === 'active' && !(detailOpportunity.already_bid || bidSuccess === detailOpportunity.id) && (
                                <button
                                    onClick={() => { setSelectedOpportunity(detailOpportunity); setDetailOpportunity(null); setBidError(null); }}
                                    className="flex-1 py-2.5 bg-[#DE3D3A] text-white rounded-lg font-semibold font-gantari text-sm hover:bg-[#c93d3d] transition-colors cursor-pointer"
                                >
                                    Submit Bid
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bid Modal ── */}
            {selectedOpportunity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-[#12141D] font-gantari">Submit Bid</h3>
                            <button onClick={() => { setSelectedOpportunity(null); setBidError(null); }} className="text-slate-500 hover:text-slate-800 text-2xl leading-none cursor-pointer">&times;</button>
                        </div>

                        <p className="text-sm font-medium text-[#353535] font-gantari mb-6 bg-[#F8F8F8] p-4 rounded-xl">
                            📁 <span className="font-bold">{selectedOpportunity.project_name}</span>
                            {(selectedOpportunity.budget_ceiling || selectedOpportunity.outsource_budget) > 0 && (
                                <> — Budget: <span className="text-[#DE3D3A] font-bold">{formatBudget(selectedOpportunity.budget_ceiling || selectedOpportunity.outsource_budget)}</span></>
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
                                className="flex-1 py-2.5 bg-[#F2F2F2] text-[#353535] rounded-lg font-semibold font-gantari text-sm hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBidSubmit}
                                disabled={bidSubmitting}
                                className="flex-1 py-2.5 bg-[#DE3D3A] text-white rounded-lg font-semibold font-gantari text-sm hover:bg-[#c93d3d] transition-colors disabled:opacity-60 cursor-pointer"
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
