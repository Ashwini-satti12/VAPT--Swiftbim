import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";

function stripHtml(html: string): string {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

function safeParse(val: any): any[] {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.map(item => (typeof item === 'string' ? item : item?.module || item));
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[')) {
            try { 
                const parsed = JSON.parse(trimmed); 
                if (Array.isArray(parsed)) {
                    return parsed.map(item => (typeof item === 'string' ? item : item?.module || item));
                }
                return [];
            } catch { return []; }
        }
        return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

function safeParsePayment(val: any): any[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed) {
            try { return JSON.parse(trimmed); } catch { return []; }
        }
    }
    return [];
}

export default function ViewProposalTD() {
    const navigate = useNavigate();
    const location = useLocation();
    const state: any = (location && (location as any).state) || {};
    const bid = state?.bid || null;
    const proposalId = state?.proposalId || null;

    const [loading, setLoading] = useState(true);
    const [proposal, setProposal] = useState<any>(null);

    useEffect(() => {
        if (!proposalId) {
            setLoading(false);
            return;
        }

        api.get<{ proposal?: any }>(`/api/vendors/proposals/td/${proposalId}`)
        .then(({ data }) => {
            if (data.proposal) {
                setProposal(data.proposal);
            }
        })
        .catch(() => {
            // ignore
        })
        .finally(() => {
            setLoading(false);
        });
    }, [proposalId]);

    const techs = safeParse(proposal?.technologies_used);
    const payments = safeParsePayment(proposal?.payment_terms);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    return (
        <div className="px-1 pt-1 space-y-8 flex flex-col min-h-full bg-white font-gantari overflow-y-auto w-full pb-10">
            {/* Page Header */}
            <div className="flex items-center justify-between px-2">
                <button
                    type="button"
                    onClick={() => navigate("/td/proposals")}
                    className="p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all hover:opacity-90"
                    title="Back to proposals"
                >
                    <img src={backIcon} alt="Back" className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-semibold text-[#000000]">View Proposal</h1>
                <div className="w-10"></div>
            </div>

            <div className="flex-1 space-y-8 px-2">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
                    </div>
                ) : !proposal ? (
                     <div className="py-20 text-center text-[#616161] font-gantari">
                        <p className="text-lg font-semibold mb-1 text-[#353535]">No proposal found</p>
                        <p className="text-sm">The proposal details could not be loaded.</p>
                     </div>
                ) : (
                    <div className="bg-white border border-[#AEACAC52] rounded-xl shadow-sm p-8 w-full space-y-0 relative">
                        {/* Project Header */}
                        <div className="mb-8">
                            <h1 className="font-gantari font-semibold text-xl text-[#020202] text-center mb-6">
                                {proposal.project_name || bid?.project_name || `Proposal`}
                            </h1>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 bg-[#F9FAFB] rounded-lg p-5">
                                <div><span className="text-[#8B8B8B] block text-xs font-semibold font-gantari mb-1">Vendor</span><span className="text-[#020202] text-sm font-bold font-gantari">{proposal.vendor_name || bid?.vendor_name || '—'}</span></div>
                                <div><span className="text-[#8B8B8B] block text-xs font-semibold font-gantari mb-1">Email</span><span className="text-[#020202] text-sm font-bold font-gantari">{proposal.email_address || proposal.vendor_email || bid?.vendor_email || '—'}</span></div>
                                <div><span className="text-[#8B8B8B] block text-xs font-semibold font-gantari mb-1">Service ID</span><span className="text-[#020202] text-sm font-bold font-gantari">{proposal.opportunity_id ? `OPP-${proposal.opportunity_id}` : (bid?.opportunity_id ? `OPP-${bid.opportunity_id}` : '—')}</span></div>
                                <div><span className="text-[#8B8B8B] block text-xs font-semibold font-gantari mb-1">Created On</span><span className="text-[#020202] text-sm font-bold font-gantari">{formatDate(proposal.created_at)}</span></div>
                            </div>
                            {proposal.status && (
                                <div className="mt-4 text-center">
                                    <span className="inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari bg-[#EAF0FB] text-[#1967D2]">
                                        Status: {proposal.status}
                                    </span>
                                </div>
                            )}
                        </div>

                        {proposal.reason && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                                    Vendor Note / Request
                                </h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4">
                                    <p className="text-[15px] text-[#353535] font-gantari leading-relaxed whitespace-pre-line">
                                        {proposal.reason}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 1. Executive Summary */}
                        {proposal.executive_summary && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">1. Executive Summary</h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4">
                                    <p className="text-[15px] text-[#353535] font-gantari leading-relaxed whitespace-pre-line">{stripHtml(proposal.executive_summary)}</p>
                                </div>
                            </div>
                        )}

                        {/* 2. About Us */}
                        {(proposal.about_us || proposal.aboutus) && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">2. About Us</h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4">
                                    <p className="text-[15px] text-[#353535] font-gantari leading-relaxed whitespace-pre-line">{stripHtml(proposal.about_us || proposal.aboutus)}</p>
                                </div>
                                {(proposal.address || proposal.website_url || proposal.email_address) && (
                                    <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-200">
                                        <h3 className="font-gantari font-semibold text-[#020202] text-sm">Location Info:</h3>
                                        {proposal.address && (
                                            <div className="flex items-start gap-3">
                                                <span className="mt-0.5 min-w-[20px] text-center">📍</span>
                                                <span className="text-[15px] text-[#353535] font-gantari">{proposal.address}</span>
                                            </div>
                                        )}
                                        {proposal.website_url && (
                                            <div className="flex items-center gap-3">
                                                <span className="min-w-[20px] text-center">🌐</span>
                                                <a href={proposal.website_url.startsWith('http') ? proposal.website_url : `https://${proposal.website_url}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="text-[15px] text-[#1967D2] font-gantari font-medium hover:underline">{proposal.website_url}</a>
                                            </div>
                                        )}
                                        {proposal.email_address && (
                                            <div className="flex items-center gap-3">
                                                <span className="min-w-[20px] text-center">✉️</span>
                                                <span className="text-[15px] text-[#353535] font-gantari">{proposal.email_address}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Scope of Work */}
                        {proposal.scope_of_work && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">3. Scope of Work</h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4 text-[15px] text-[#353535] font-gantari leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: proposal.scope_of_work }} />
                            </div>
                        )}

                        {/* Technology Table */}
                        {techs.length > 0 && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">Technology to be Used</h2>
                                <div className="bg-gray-100 rounded-md overflow-hidden border border-[#AEACAC52]">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-[#F2F2F2] border-b border-gray-100">
                                                <th className="px-4 py-3 text-left w-16 font-gantari font-bold text-[#353535] text-sm">S.No</th>
                                                <th className="px-4 py-3 text-left font-gantari font-bold text-[#353535] text-sm">Software / Module</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {techs.map((t: string, i: number) => (
                                                <tr key={i} className={`${i % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'} border-b border-gray-50`}>
                                                    <td className="px-4 py-3">
                                                        <span className="font-gantari text-[#353535] text-sm">{i + 1}.</span>
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
                        {(proposal.deliverables || proposal.deliverables_intro || proposal.deliverables_list) && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">4. Deliverables</h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4 text-[15px] text-[#353535] font-gantari leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: proposal.deliverables || proposal.deliverables_intro || proposal.deliverables_list }} />
                            </div>
                        )}

                        {/* 5. Exclusions */}
                        {(proposal.exclusions || proposal.exclusions_list) && stripHtml(proposal.exclusions || proposal.exclusions_list) && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">5. Exclusions</h2>
                                <div className="bg-[#F9FAFB] rounded-md px-5 py-4 text-[15px] text-[#353535] font-gantari leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: proposal.exclusions || proposal.exclusions_list }} />
                            </div>
                        )}

                        {/* 6. Payment Terms */}
                        {payments.length > 0 && (
                            <div className="mb-8">
                                <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">6. Payment Terms</h2>
                                <div className="bg-gray-100 rounded-md overflow-hidden border border-[#AEACAC52]">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-[#F2F2F2] border-b border-gray-100">
                                                <th className="px-4 py-3 text-left w-16 font-gantari font-bold text-[#353535] text-sm">S.No</th>
                                                <th className="px-4 py-3 text-center font-gantari font-bold text-[#353535] text-sm">Payment Basis</th>
                                                <th className="px-4 py-3 text-center font-gantari font-bold text-[#353535] text-sm">Terms</th>
                                                <th className="px-4 py-3 text-center font-gantari font-bold text-[#353535] text-sm">Timeline (Weeks)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map((p: any, i: number) => (
                                                <tr key={i} className={`${i % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'} border-b border-gray-50`}>
                                                    <td className="px-4 py-3 font-gantari text-[#353535] text-sm">{i + 1}.</td>
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
                    </div>
                )}
            </div>
        </div>
    );
}
