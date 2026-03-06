import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

type Proposal = {
    id: number;
    vendor_id?: number;
    bid_id?: number;
    opportunity_id?: number;
    project_name?: string;
    vendor_name?: string;
    executive_summary?: string;
    about_us?: string;
    address?: string;
    website_url?: string;
    email_address?: string;
    selected_currency?: string;
    scope_of_work?: string;
    technologies_used?: string;
    deliverables?: string;
    exclusions?: string;
    commercial_offer?: string;
    payment_terms?: string;
    bid_amount?: number;
    status: string;
    reason?: string;
    technical_requirements?: string;
    created_at: string;
    currency?: string;
    source?: string;
};

function stripHtml(html: string): string {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

function safeParse(val: any): any[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return []; }
}

export default function ProposalsV() {
    const [loading, setLoading] = useState(true);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState<Proposal | null>(null);
    const navigate = useNavigate();
    const [rejectReason, setRejectReason] = useState('');
    const [clarNote, setClarNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const fetchProposals = () => {
        api.get<{ proposals: Proposal[] }>('/api/vendors/proposals')
            .then(({ data }) => setProposals(data.proposals ?? []))
            .catch(() => setProposals([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchProposals(); }, []);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const getStatusBadge = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'sent' || s === 'pending') return 'bg-[#FFF8E7] text-[#92400E]';
        if (s === 'accepted') return 'bg-[#E6F4EA] text-[#1E7E34]';
        if (s === 'rejected') return 'bg-[#FFF1F2] text-[#BE123C]';
        if (s === 'clarification_requested') return 'bg-[#EAF0FB] text-[#1967D2]';
        return 'bg-[#F2F2F2] text-[#616161]';
    };

    const getStatusLabel = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'sent') return 'Sent';
        if (s === 'pending') return 'Pending';
        if (s === 'accepted') return 'Accepted';
        if (s === 'rejected') return 'Rejected';
        if (s === 'clarification_requested') return 'Clarification';
        return status || 'Unknown';
    };

    const handleAction = async (proposalId: number, action: 'accept' | 'reject' | 'clarification') => {
        setSubmitting(true);
        try {
            const reason = action === 'reject' ? rejectReason : action === 'clarification' ? clarNote : '';
            await api.post(`/api/vendors/proposals/${proposalId}/respond`, { action, reason });
            setSuccessMsg(`Proposal ${action === 'accept' ? 'accepted — project created!' : action === 'reject' ? 'rejected' : 'clarification requested'} successfully!`);
            setSelected(null);
            setRejectReason('');
            setClarNote('');
            fetchProposals();
            if (action === 'accept') {
                setTimeout(() => navigate('/v/projects'), 1500);
            }
            setTimeout(() => setSuccessMsg(null), 4000);
        } catch { }
        finally { setSubmitting(false); }
    };

    const filtered = proposals.filter(p =>
        (p.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- VIEW PROPOSAL DETAIL ---
    if (selected) {
        const techs = safeParse(selected.technologies_used);
        const commercials = safeParse(selected.commercial_offer);
        const payments = safeParse(selected.payment_terms);
        const isPending = (selected.status || '').toLowerCase() === 'sent' || (selected.status || '').toLowerCase() === 'pending';
        const currencyLabel = selected.selected_currency || selected.currency || 'AED';

        return (
            <div className="flex flex-col h-full bg-white">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 flex-shrink-0 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setSelected(null); setRejectReason(''); setClarNote(''); }}
                            className="p-2.5 rounded-xl bg-[#F2F2F2] hover:bg-slate-200 transition-colors">
                            <svg className="w-5 h-5 text-[#353535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h2 className="text-xl font-semibold text-[#020202] font-gantari">View Proposal</h2>
                    </div>
                    <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari ${getStatusBadge(selected.status)}`}>
                        {getStatusLabel(selected.status)}
                    </span>
                </div>

                {/* Scrollable content inside white container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
                    <div className="bg-white border border-[rgb(89,89,89)]/20 rounded-xl shadow-sm p-8 w-full space-y-0">

                        {/* Project Header */}
                        <div className="mb-8">
                            <h1 className="font-gantari font-semibold text-xl text-[#020202] text-center mb-6">
                                {selected.project_name || `Proposal #${selected.id}`}
                            </h1>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 bg-[#F9FAFB] rounded-lg p-5">
                                <div><span className="text-[#8B8B8B] block text-xs font-semibold font-gantari mb-1">Vendor</span><span className="text-[#020202] text-sm font-bold font-gantari">{selected.vendor_name || '—'}</span></div>
                                <div><span className="text-[#8B8B8B] block text-xs font-semibold font-gantari mb-1">Currency</span><span className="text-[#020202] text-sm font-bold font-gantari">{currencyLabel}</span></div>
                                <div><span className="text-[#8B8B8B] block text-xs font-semibold font-gantari mb-1">Email</span><span className="text-[#020202] text-sm font-bold font-gantari">{selected.email_address || '—'}</span></div>
                                <div><span className="text-[#8B8B8B] block text-xs font-semibold font-gantari mb-1">Received On</span><span className="text-[#020202] text-sm font-bold font-gantari">{formatDate(selected.created_at)}</span></div>
                            </div>
                        </div>

                        {/* 1. Executive Summary */}
                        {selected.executive_summary && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                                    1. Executive Summary
                                </h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4">
                                    <p className="text-[15px] text-[#353535] font-gantari leading-relaxed whitespace-pre-line">{stripHtml(selected.executive_summary)}</p>
                                </div>
                            </div>
                        )}

                        {/* 2. About Us */}
                        {selected.about_us && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                                    2. About Us
                                </h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4">
                                    <p className="text-[15px] text-[#353535] font-gantari leading-relaxed whitespace-pre-line">{stripHtml(selected.about_us)}</p>
                                </div>
                                {(selected.address || selected.website_url || selected.email_address) && (
                                    <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-200">
                                        <h3 className="font-gantari font-semibold text-[#020202] text-sm">Our Location:</h3>
                                        {selected.address && (
                                            <div className="flex items-start gap-3">
                                                <span className="mt-0.5 min-w-[20px] text-center">📍</span>
                                                <span className="text-[15px] text-[#353535] font-gantari">{selected.address}</span>
                                            </div>
                                        )}
                                        {selected.website_url && (
                                            <div className="flex items-center gap-3">
                                                <span className="min-w-[20px] text-center">🌐</span>
                                                <a href={selected.website_url.startsWith('http') ? selected.website_url : `https://${selected.website_url}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="text-[15px] text-[#1967D2] font-gantari font-medium hover:underline">{selected.website_url}</a>
                                            </div>
                                        )}
                                        {selected.email_address && (
                                            <div className="flex items-center gap-3">
                                                <span className="min-w-[20px] text-center">✉️</span>
                                                <span className="text-[15px] text-[#353535] font-gantari">{selected.email_address}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Scope of Work */}
                        {selected.scope_of_work && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                                    3. Scope of Work
                                </h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4 text-[15px] text-[#353535] font-gantari leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: selected.scope_of_work }} />
                            </div>
                        )}

                        {/* Technology Table */}
                        {techs.length > 0 && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                                    Technology to be Used
                                </h2>
                                <div className="bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-[#F2F2F2]">
                                                <th className="px-4 py-3 text-left w-16 font-gantari font-bold text-gray-700 text-sm">S.No</th>
                                                <th className="px-4 py-3 text-left font-gantari font-bold text-gray-700 text-sm">Software</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {techs.map((t: string, i: number) => (
                                                <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'} border-t border-gray-100`}>
                                                    <td className="px-4 py-3">
                                                        <span className="font-gantari text-[#020202] text-sm">{i + 1}.</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-gantari text-[#353535] text-[15px]">{t}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 4. Deliverables */}
                        {selected.deliverables && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                                    4. Deliverables
                                </h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4 text-[15px] text-[#353535] font-gantari leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: selected.deliverables }} />
                            </div>
                        )}

                        {/* 5.1 Exclusions */}
                        {selected.exclusions && stripHtml(selected.exclusions) && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                                    5.1 Exclusions
                                </h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4 text-[15px] text-[#353535] font-gantari leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: selected.exclusions }} />
                            </div>
                        )}

                        {/* 6. Commercial Offer */}
                        {commercials.length > 0 && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                                    6. Commercial Offer
                                </h2>
                                <div className="bg-[#F2F2F2] rounded-md overflow-hidden border border-gray-200">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-[#F2F2F2]">
                                                <th className="px-6 py-3 text-left w-16 font-gantari font-semibold text-[#020202] text-sm">S.No</th>
                                                <th className="px-6 py-3 text-left font-gantari font-semibold text-[#020202] text-sm">Milestone</th>
                                                <th className="px-6 py-3 text-center w-36 font-gantari font-semibold text-[#020202] text-sm">Duration</th>
                                                <th className="px-6 py-3 text-center w-36 font-gantari font-semibold text-[#020202] text-sm">Resources</th>
                                                <th className="px-6 py-3 text-center w-40 font-gantari font-semibold text-[#020202] text-sm">Price Per Unit</th>
                                                <th className="px-6 py-3 text-center w-40 font-gantari font-semibold text-[#020202] text-sm">Total Price ({currencyLabel})</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {commercials.map((c: any, i: number) => (
                                                <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-[#EBEBEB]'}`}>
                                                    <td className="px-6 py-3 font-gantari text-[#020202] text-sm">{i + 1}.</td>
                                                    <td className="px-6 py-3 font-gantari text-[#353535] text-[15px]">{c.milestone || c.milestones || c.task || '—'}</td>
                                                    <td className="px-6 py-3 text-center font-gantari text-[#353535] text-sm">{c.duration || '—'}</td>
                                                    <td className="px-6 py-3 text-center font-gantari text-[#353535] text-sm">{c.resources || '—'}</td>
                                                    <td className="px-6 py-3 text-center font-gantari text-[#8B8B8B] text-sm">{c.resourceUnit || c.resource_unit || c.rate || '—'}</td>
                                                    <td className="px-6 py-3 text-center font-gantari text-[#020202] text-sm font-bold">{c.totalPrice || c.total_price || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 6.1 Payment Terms */}
                        {payments.length > 0 && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                                    6.1 Payment Terms
                                </h2>
                                <div className="bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-[#F2F2F2] border-b">
                                                <th className="px-4 py-3 text-left w-16 font-gantari font-bold text-[#020202] text-sm">S.No</th>
                                                <th className="px-4 py-3 text-center font-gantari font-bold text-[#020202] text-sm">Payment Basis</th>
                                                <th className="px-4 py-3 text-center font-gantari font-bold text-[#020202] text-sm">Terms</th>
                                                <th className="px-4 py-3 text-center font-gantari font-bold text-[#020202] text-sm">Timeline (Weeks)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map((p: any, i: number) => (
                                                <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'} border-t border-gray-100`}>
                                                    <td className="px-4 py-3 font-gantari text-[#020202] text-sm">{i + 1}.</td>
                                                    <td className="px-4 py-3 text-center font-gantari text-[#353535] text-[15px]">{p.basis || '—'}</td>
                                                    <td className="px-4 py-3 text-center font-gantari text-[#353535] text-sm">{p.terms || '—'}</td>
                                                    <td className="px-4 py-3 text-center font-gantari text-[#353535] text-sm">{p.timeline || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons for pending proposals */}
                        {isPending && (
                            <div className="pt-6 border-t border-gray-100 space-y-4">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-2">Respond to Proposal</h2>
                                <div className="flex items-center justify-center gap-4">
                                    <button disabled={submitting} onClick={() => handleAction(selected.id, 'accept')}
                                        className="flex-1 max-w-xs py-3 bg-[#22C55E] text-white rounded-md font-bold font-gantari text-sm hover:bg-[#16A34A] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                        Accept Proposal
                                    </button>
                                </div>

                                <div className="border border-[#FCA5A5] rounded-xl p-5">
                                    <p className="text-sm font-bold font-gantari text-[#020202] mb-3">Reject Proposal</p>
                                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (optional)..." rows={2}
                                        className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-sm placeholder:text-[#8B8B8B] resize-none focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] mb-3" />
                                    <button disabled={submitting} onClick={() => handleAction(selected.id, 'reject')}
                                        className="bg-[#F2F2F2] hover:bg-[#FFE5E5] text-[#DE3D3A] font-gantari font-medium px-6 py-2 rounded-md transition-colors focus:outline-none text-sm">
                                        ✕ Reject
                                    </button>
                                </div>

                                <div className="border border-[#BFDBFE] rounded-xl p-5">
                                    <p className="text-sm font-bold font-gantari text-[#020202] mb-3">Request Clarification</p>
                                    <textarea value={clarNote} onChange={e => setClarNote(e.target.value)} placeholder="What do you need clarified?..." rows={2}
                                        className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-sm placeholder:text-[#8B8B8B] resize-none focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] mb-3" />
                                    <button disabled={submitting} onClick={() => handleAction(selected.id, 'clarification')}
                                        className="bg-[#F2F2F2] hover:bg-[#EFF6FF] text-[#1D4ED8] font-gantari font-medium px-6 py-2 rounded-md transition-colors focus:outline-none text-sm">
                                        💬 Request Clarification
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- TABLE LIST VIEW ---
    return (
        <div className="px-1 pt-1 pb-0 space-y-8 flex flex-col h-full bg-white">
            {/* Toast */}
            {successMsg && (
                <div className="fixed top-5 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl bg-[#1A8A47] text-white font-gantari text-sm font-medium min-w-[280px]">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="text-2xl font-semibold text-[#000000]">Proposals</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex items-center gap-2 px-4 py-2 bg-[#EAEAEA] rounded-md min-w-[220px]">
                        <svg className="w-4 h-4 text-[#616161] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search project..." className="bg-transparent text-sm font-medium text-[#353535] placeholder:text-[#616161] focus:outline-none w-full font-gantari" />
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
                            <p className="text-lg font-semibold mb-1 text-[#353535]">No proposals received yet</p>
                            <p className="text-sm">You haven't received any proposals from the Technical Director yet.</p>
                        </div>
                    ) : (
                        <table className="min-w-full border-collapse">
                            <thead className="sticky top-0 z-10 bg-white">
                                <tr className="border-b border-gray-100 bg-white">
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Project Name</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Vendor Name</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Currency</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Received On</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Status</th>
                                    <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((proposal, index) => {
                                    const slNo = (index + 1).toString().padStart(2, '0');
                                    return (
                                        <tr key={`${proposal.source}-${proposal.id}`} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'} transition-colors`}>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-3 py-3 text-center text-sm font-semibold text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {proposal.project_name || `Proposal #${proposal.id}`}
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                <div className="text-sm font-semibold text-[#353535] font-gantari">{proposal.vendor_name || '—'}</div>
                                                {proposal.email_address && <div className="text-xs text-[#616161] font-gantari mt-0.5">{proposal.email_address}</div>}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {proposal.selected_currency || proposal.currency || '—'}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {formatDate(proposal.created_at)}
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari ${getStatusBadge(proposal.status)}`}>
                                                    {getStatusLabel(proposal.status)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                <button onClick={() => { setSelected(proposal); setRejectReason(''); setClarNote(''); }}
                                                    className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-md text-xs font-bold font-gantari bg-[#DD4342] text-white hover:bg-[#c23b3a] shadow-sm shadow-red-100 transition-all">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    View Proposal
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
