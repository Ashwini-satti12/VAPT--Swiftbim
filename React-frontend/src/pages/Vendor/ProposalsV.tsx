import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';
import addressIcon from '../../assets/TechnicalDirector/Vector.svg';
import websiteIcon from '../../assets/TechnicalDirector/world-wide-web 1.svg';
import emailIcon from '../../assets/TechnicalDirector/mail icon.svg';

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
    /** Reject / Request panels: textarea shown only after clicking the action button */
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [showRequestInput, setShowRequestInput] = useState(false);

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
            if (action === 'accept') {
                setSuccessMsg('Successfully accepted');
            } else if (action === 'reject') {
                setSuccessMsg('Proposal rejected successfully.');
            } else {
                setSuccessMsg('Clarification request sent successfully.');
            }
            setSelected(null);
            setRejectReason('');
            setClarNote('');
            setShowRejectInput(false);
            setShowRequestInput(false);
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
            <div className="w-full min-w-0 px-0 pt-1 pb-6 space-y-8 flex flex-col min-h-full bg-white font-gantari relative overflow-y-auto custom-scrollbar">
                {successMsg && (
                    <div className="fixed top-5 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl bg-[#1A8A47] text-white font-gantari text-sm font-medium min-w-[280px]" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{successMsg}</span>
                    </div>
                )}
                {/* Page header — aligned with CreateProposalTD */}
                <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 w-full flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => { setSelected(null); setRejectReason(''); setClarNote(''); setShowRejectInput(false); setShowRequestInput(false); }}
                        className="p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all hover:opacity-90"
                        title="Back to proposals"
                    >
                        <img src={backIcon} alt="" className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-semibold text-[#000000]">View Proposal</h1>
                    <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-bold min-w-[4.5rem] ${getStatusBadge(selected.status)}`}>
                        {getStatusLabel(selected.status)}
                    </span>
                </div>

                <div className="flex-1 space-y-10 px-4 sm:px-6 lg:px-8 w-full min-w-0">
                    {/* Summary banner — CreateProposalTD-style */}
                    <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md py-6 flex flex-wrap items-center">
                        <div className="flex-1 min-w-[140px] px-6 sm:px-2 border-r border-[#AEACAC52]">
                            <p className="text-lg font-bold text-[#353535] mb-1 tracking-wider text-center">Project Name</p>
                            <p className="font-semibold text-[#616161] text-base truncate text-center uppercase tracking-wide">{selected.project_name || `Proposal #${selected.id}`}</p>
                        </div>
                        <div className="flex-1 min-w-[140px] px-6 sm:px-2 border-r border-[#AEACAC52]">
                            <p className="text-lg font-bold text-[#353535] mb-1 tracking-wider text-center">Vendor Name</p>
                            <p className="font-semibold text-[#616161] text-base truncate text-center">{selected.vendor_name || '—'}</p>
                        </div>
                        <div className="flex-1 min-w-[140px] px-6 sm:px-2 border-r border-[#AEACAC52]">
                            <p className="text-lg font-bold text-[#353535] mb-1 tracking-wider text-center">Currency</p>
                            <p className="font-semibold text-[#616161] text-base text-center">{currencyLabel}</p>
                        </div>
                        <div className="flex-1 min-w-[140px] px-6 sm:px-2 border-r border-[#AEACAC52]">
                            <p className="text-lg font-bold text-[#353535] mb-1 tracking-wider text-center">Email</p>
                            <p className="font-semibold text-[#616161] text-base truncate text-center">{selected.email_address || '—'}</p>
                        </div>
                        <div className="flex-1 min-w-[140px] px-6 sm:px-2 last:border-r-0 sm:border-r-0">
                            <p className="text-lg font-bold text-[#353535] mb-1 tracking-wider text-center">Received On</p>
                            <p className="font-semibold text-[#616161] text-base text-center">{formatDate(selected.created_at)}</p>
                        </div>
                    </div>

                        {/* 1. Executive Summary */}
                        {selected.executive_summary && (
                            <div className="space-y-4">
                                <h2 className="font-bold text-lg text-[#020202]">1. Executive Summary</h2>
                                <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-transparent">
                                    <p className="text-base text-[#353535] font-gantari leading-relaxed whitespace-pre-line">{stripHtml(selected.executive_summary)}</p>
                                </div>
                            </div>
                        )}

                        {/* 2. About Us */}
                        {selected.about_us && (
                            <div className="space-y-4">
                                <h2 className="font-bold text-lg text-[#020202]">2. About Us</h2>
                                <div className="bg-[#F2F2F2] rounded-md px-4 py-3">
                                    <p className="text-base text-[#353535] font-gantari leading-relaxed whitespace-pre-line">{stripHtml(selected.about_us)}</p>
                                </div>
                                {(selected.address || selected.website_url || selected.email_address) && (
                                    <div className="space-y-4 pt-2 w-full">
                                        {selected.address && (
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-3 min-w-[140px] shrink-0">
                                                    <img src={addressIcon} alt="" className="w-5 h-5" />
                                                    <div className="flex-1 flex justify-between text-sm font-semibold text-[#020202]">
                                                        <span>Address</span>
                                                        <span>:</span>
                                                    </div>
                                                </div>
                                                <span className="text-[#616161] font-medium text-base flex-1">{selected.address}</span>
                                            </div>
                                        )}
                                        {selected.website_url && (
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-3 min-w-[140px] shrink-0">
                                                    <img src={websiteIcon} alt="" className="w-5 h-5" />
                                                    <div className="flex-1 flex justify-between text-sm font-semibold text-[#020202]">
                                                        <span>Website</span>
                                                        <span>:</span>
                                                    </div>
                                                </div>
                                                <a href={selected.website_url.startsWith('http') ? selected.website_url : `https://${selected.website_url}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="text-[#1967D2] font-medium hover:underline text-base flex-1 truncate">{selected.website_url}</a>
                                            </div>
                                        )}
                                        {selected.email_address && (
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-3 min-w-[140px] shrink-0">
                                                    <img src={emailIcon} alt="" className="w-5 h-5" />
                                                    <div className="flex-1 flex justify-between text-sm font-semibold text-[#020202]">
                                                        <span>Email</span>
                                                        <span>:</span>
                                                    </div>
                                                </div>
                                                <span className="text-[#616161] font-medium text-base flex-1">{selected.email_address}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Scope of Work */}
                        {selected.scope_of_work && (
                            <div className="space-y-4">
                                <h2 className="font-bold text-lg text-[#020202]">3. Scope of Work</h2>
                                <div className="bg-[#F2F2F2] rounded-md px-4 py-3 text-base text-[#353535] font-gantari leading-relaxed border border-[#AEACAC52] [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: selected.scope_of_work }} />
                            </div>
                        )}

                        {/* Technology Table */}
                        {techs.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="font-bold text-lg text-[#020202]">Technology to be Used</h2>
                                <div className="bg-[#F2F2F2] rounded-md overflow-hidden border border-[#AEACAC52]">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-[#F2F2F2]">
                                                <th className="px-4 py-3 text-left w-16 font-gantari font-bold text-gray-700 text-sm">Sl.No</th>
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
                            <div className="space-y-4">
                                <h2 className="font-bold text-lg text-[#020202]">4. Deliverables</h2>
                                <div className="bg-[#F2F2F2] rounded-md px-4 py-3 text-base text-[#353535] font-gantari leading-relaxed border border-[#AEACAC52] [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: selected.deliverables }} />
                            </div>
                        )}

                        {/* 5.1 Exclusions */}
                        {selected.exclusions && stripHtml(selected.exclusions) && (
                            <div className="space-y-4">
                                <h2 className="font-bold text-lg text-[#020202]">5. Exclusions</h2>
                                <div className="bg-[#F2F2F2] rounded-md px-4 py-3 text-base text-[#353535] font-gantari leading-relaxed border border-[#AEACAC52] [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: selected.exclusions }} />
                            </div>
                        )}

                        {/* 6. Commercial Offer */}
                        {commercials.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="font-bold text-lg text-[#020202]">6. Commercial Offer</h2>
                                <div className="bg-[#F2F2F2] rounded-md overflow-hidden border border-[#AEACAC52]">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-[#F2F2F2]">
                                                <th className="px-6 py-3 text-left w-16 font-gantari font-semibold text-[#020202] text-sm">Sl.No</th>
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
                            <div className="space-y-4">
                                <h2 className="font-bold text-lg text-[#020202]">6. Payment Terms</h2>
                                <div className="bg-[#F2F2F2] rounded-md overflow-hidden border border-[#AEACAC52]">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-[#F2F2F2] border-b border-[#AEACAC52]">
                                                <th className="px-4 py-3 text-left w-16 font-gantari font-bold text-[#020202] text-sm">Sl.No</th>
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
                            <div className="pt-8 space-y-4">
                                <div className="flex flex-row flex-wrap gap-3 items-center justify-center">
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => handleAction(selected.id, 'accept')}
                                        className="shrink-0 w-[100px] sm:w-[112px] py-2.5 px-3 rounded-md border border-[#AEACAC52] bg-[#E1F6EB] text-[#008F22] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => { setShowRejectInput(true); setShowRequestInput(false); }}
                                        className={`shrink-0 w-[100px] sm:w-[112px] py-2.5 px-3 rounded-md font-semibold text-sm transition-colors disabled:opacity-60 ${showRejectInput ? 'border-2 border-[#DD4342] bg-[#FFF2F2] text-[#DD4342]' : 'border border-[#AEACAC52] bg-[#FFF2F2] text-[#DD4342] hover:opacity-90'}`}
                                    >
                                        Reject
                                    </button>
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => { setShowRequestInput(true); setShowRejectInput(false); }}
                                        className={`shrink-0 w-[100px] sm:w-[112px] py-2.5 px-3 rounded-md font-semibold text-sm transition-colors disabled:opacity-60 ${showRequestInput ? 'border-2 border-[#1967D2] bg-[#DBEAFE] text-[#1D4ED8]' : 'border border-[#AEACAC52] bg-[#DBEAFE] text-[#1967D2] hover:opacity-90'}`}
                                    >
                                        Request
                                    </button>
                                </div>

                                {showRejectInput && (
                                    <div className="w-full border border-[#AEACAC52] rounded-md p-5 bg-white">
                                        <p className="text-sm font-bold text-[#020202] mb-3">Reject Proposal</p>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Reason for rejection (optional)..."
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-base placeholder:text-[#8B8B8B] resize-none focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] mb-3"
                                        />
                                        <div className="flex justify-center w-full">
                                            <button
                                                type="button"
                                                disabled={submitting}
                                                onClick={() => handleAction(selected.id, 'reject')}
                                                className="inline-flex items-center justify-center gap-2 bg-[#DD4342] text-white hover:opacity-90 font-semibold px-8 py-2.5 rounded-lg transition-all text-sm disabled:opacity-60 min-w-[140px]"
                                            >
                                                {submitting ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : null}
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {showRequestInput && (
                                    <div className="w-full border border-[#AEACAC52] rounded-md p-5 bg-white">
                                        <p className="text-sm font-bold text-[#020202] mb-3">Request Clarification</p>
                                        <textarea
                                            value={clarNote}
                                            onChange={(e) => setClarNote(e.target.value)}
                                            placeholder="Enter your reason or what you need clarified..."
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-base placeholder:text-[#8B8B8B] resize-none focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] mb-3"
                                        />
                                        <div className="flex justify-center w-full">
                                            <button
                                                type="button"
                                                disabled={submitting}
                                                onClick={() => handleAction(selected.id, 'clarification')}
                                                className="inline-flex items-center justify-center gap-2 bg-[#DD4342] text-white hover:opacity-90 font-semibold px-8 py-2.5 rounded-lg transition-all text-sm disabled:opacity-60 min-w-[140px]"
                                            >
                                                {submitting ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : null}
                                                Send request
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
                                                <button onClick={() => { setSelected(proposal); setRejectReason(''); setClarNote(''); setShowRejectInput(false); setShowRequestInput(false); }}
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
