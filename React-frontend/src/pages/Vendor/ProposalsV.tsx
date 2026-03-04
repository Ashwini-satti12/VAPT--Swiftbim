import { useEffect, useState } from 'react';
import api from '../../lib/api';

type Proposal = {
    id: number;
    vendor_id?: number;
    project_name?: string;
    bid_amount?: number;
    status: string;
    reason?: string;
    technical_requirements?: string;
    created_at: string;
    currency?: string;
    milestones?: string; // JSON string or serialized
};

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-[#FFF8E7] text-[#92400E]',
    accepted: 'bg-[#F0FDF4] text-[#15803D]',
    rejected: 'bg-[#FFF1F2] text-[#BE123C]',
    clarification_requested: 'bg-[#EFF6FF] text-[#1D4ED8]',
    default: 'bg-[#F2F2F2] text-[#717171]',
};

export default function ProposalsV() {
    const [loading, setLoading] = useState(true);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [selected, setSelected] = useState<Proposal | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [clarNote, setClarNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const fetchProposals = () => {
        api.get<{ proposals: Proposal[] }>('/api/vendors/proposals')
            .then(({ data }) => setProposals(data.proposals ?? []))
            .catch(() => setProposals([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchProposals(); }, []);

    const handleAction = async (proposalId: number, action: 'accept' | 'reject' | 'clarification') => {
        setSubmitting(true);
        try {
            const reason = action === 'reject' ? rejectReason : action === 'clarification' ? clarNote : '';
            await api.post(`/api/vendors/proposals/${proposalId}/respond`, { action, reason });
            setActionSuccess(`Proposal ${action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'clarification requested'} successfully!`);
            setSelected(null);
            setRejectReason('');
            setClarNote('');
            fetchProposals();
        } catch {
            /* silently fail */
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number, currency = 'USD') => {
        if (!amount) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
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
                    <h2 className="text-2xl font-bold text-slate-800 font-gantari">Proposals</h2>
                    <p className="text-sm text-slate-500 mt-1 font-gantari">Proposals received from the Technical Director — review and respond</p>
                </div>
                <span className="text-sm font-medium text-[#E47E00] bg-[#FFF8E7] px-4 py-1.5 rounded-full font-gantari">
                    {proposals.filter(p => p.status === 'pending').length} Pending
                </span>
            </div>

            {actionSuccess && (
                <div className="mb-4 p-4 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <p className="font-medium font-gantari text-[#14532D] text-sm">{actionSuccess}</p>
                    <button onClick={() => setActionSuccess(null)} className="ml-auto text-[#14532D] hover:text-[#166534]">✕</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
                {proposals.length === 0 ? (
                    <div className="bg-white/50 backdrop-blur-sm rounded-[20px] p-16 text-center text-slate-500 border border-white/40">
                        <p className="text-lg font-semibold font-gantari mb-2">No proposals received</p>
                        <p className="text-sm font-gantari">You haven't received any proposals from the Technical Director yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {proposals.map(proposal => (
                            <div
                                key={proposal.id}
                                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col"
                            >
                                <div className="p-6 flex-1 flex flex-col">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-[16px] font-bold text-slate-800 font-gantari line-clamp-2 flex-1 pr-2">
                                            {proposal.project_name || `Proposal #${proposal.id}`}
                                        </h3>
                                        <span className={`shrink-0 text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${getStatusStyle(proposal.status)}`}>
                                            {proposal.status?.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-2 flex-1">
                                        {proposal.bid_amount ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-[#717171] font-gantari">Bid Amount:</span>
                                                <span className="text-sm font-bold text-[#DE3D3A] font-gantari">{formatCurrency(proposal.bid_amount, proposal.currency)}</span>
                                            </div>
                                        ) : null}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-[#717171] font-gantari">Received:</span>
                                            <span className="text-xs font-semibold text-[#353535] font-gantari">
                                                {new Date(proposal.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {proposal.technical_requirements && (
                                            <p className="text-xs text-[#717171] font-gantari mt-2 line-clamp-2">{proposal.technical_requirements}</p>
                                        )}
                                        {proposal.reason && (
                                            <div className="mt-2 p-2.5 bg-[#FFF8E7] rounded-lg">
                                                <p className="text-xs font-medium text-[#92400E] font-gantari">Note: {proposal.reason}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {proposal.status === 'pending' && (
                                        <div className="mt-5 border-t border-gray-100/80 pt-4">
                                            <button
                                                onClick={() => { setSelected(proposal); setRejectReason(''); setClarNote(''); }}
                                                className="flex items-center justify-center w-full py-2.5 rounded-lg bg-[#DD4342] text-white font-medium text-[14px] hover:bg-[#c93d3d] transition-colors font-gantari"
                                            >
                                                View & Respond
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Response Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-[#12141D] font-gantari">Respond to Proposal</h3>
                            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button>
                        </div>

                        {/* Proposal Summary */}
                        <div className="bg-[#F8F8F8] p-4 rounded-xl mb-6">
                            <p className="font-bold text-[#353535] font-gantari">{selected.project_name || `Proposal #${selected.id}`}</p>
                            {selected.bid_amount ? (
                                <p className="text-sm text-[#717171] font-gantari mt-1">Bid Amount: <span className="text-[#DE3D3A] font-bold">{formatCurrency(selected.bid_amount, selected.currency)}</span></p>
                            ) : null}
                            {selected.technical_requirements && (
                                <p className="text-sm text-[#717171] font-gantari mt-2">{selected.technical_requirements}</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-4">
                            {/* Accept */}
                            <button
                                disabled={submitting}
                                onClick={() => handleAction(selected.id, 'accept')}
                                className="w-full py-3 bg-[#22C55E] text-white rounded-xl font-bold font-gantari text-sm hover:bg-[#16A34A] transition-colors disabled:opacity-60"
                            >
                                ✅ Accept Proposal
                            </button>

                            {/* Reject with reason */}
                            <div className="border border-[#FCA5A5] rounded-xl p-4">
                                <p className="text-sm font-semibold font-gantari text-[#353535] mb-2">Reject Proposal</p>
                                <textarea
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    placeholder="Reason for rejection (optional)"
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/30 resize-none mb-2"
                                />
                                <button
                                    disabled={submitting}
                                    onClick={() => handleAction(selected.id, 'reject')}
                                    className="w-full py-2.5 bg-[#FFE5E5] text-[#DE3D3A] rounded-lg font-bold font-gantari text-sm hover:bg-red-100 transition-colors"
                                >
                                    ✕ Reject
                                </button>
                            </div>

                            {/* Clarification */}
                            <div className="border border-[#BFDBFE] rounded-xl p-4">
                                <p className="text-sm font-semibold font-gantari text-[#353535] mb-2">Request Clarification</p>
                                <textarea
                                    value={clarNote}
                                    onChange={e => setClarNote(e.target.value)}
                                    placeholder="What do you need clarified?"
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 resize-none mb-2"
                                />
                                <button
                                    disabled={submitting}
                                    onClick={() => handleAction(selected.id, 'clarification')}
                                    className="w-full py-2.5 bg-[#EFF6FF] text-[#1D4ED8] rounded-lg font-bold font-gantari text-sm hover:bg-blue-100 transition-colors"
                                >
                                    💬 Request Clarification
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
