import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';
import viewIcon from '../../assets/ProjectManager/project/viewIcon.svg';
const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";
const SHOW_ENTRIES_SELECTED_PREFIX = "Show:";
const showEntriesOptions: {
    value: string;
    label: string;
    start: number;
    end: number | null;
}[] = [
    { value: "1-50", label: "1-50", start: 0, end: 50 },
    { value: "51-100", label: "51-100", start: 50, end: 100 },
    { value: "101-150", label: "101-150", start: 100, end: 150 },
    { value: "151-200", label: "151-200", start: 150, end: 200 },
    { value: "201-250", label: "201-250", start: 200, end: 250 },
    { value: "251-300", label: "251-300", start: 250, end: 300 },
    { value: "all", label: "All", start: 0, end: null },
];

type AcceptedBid = {
    id: number;
    vendor_id: number;
    opportunity_id: number;
    bid_amount: number;
    notes: string;
    timeline: string;
    team_size: number;
    status: string;
    created_at: string;
    project_name: string;
    vendor_name: string;
    vendor_email: string;
    outsource_budget: number;
    budget_ceiling: number;
    proposal_exists?: boolean;
    proposal_id?: number;
    proposal_status?: string;
};

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

export default function ProposalsV() {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const [bids, setBids] = useState<AcceptedBid[]>([]);
    const [selectedShowEntries, setSelectedShowEntries] = useState("");
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
    const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const state: any = (location && (location as any).state) || {};
        if (state?.created || state?.updated) {
            toast.success(state.msg || "Proposal submitted successfully!");
        }
        if (location.state) {
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, location.pathname, navigate]);

    const fetchAcceptedBids = () => {
        api.get<{ bids: AcceptedBid[] }>('/api/vendors/bidding/accepted-bids-vendor')
            .then(({ data }) => setBids(data.bids ?? []))
            .catch(() => setBids([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchAcceptedBids(); }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                showEntriesDropdownRef.current &&
                !showEntriesDropdownRef.current.contains(event.target as Node)
            ) {
                setShowEntriesOpen(false);
            }
        };
        if (showEntriesOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showEntriesOpen]);

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
        if (s === 'expired') return 'bg-[#F2F2F2] text-[#616161]';
        return 'bg-[#F2F2F2] text-[#616161]';
    };

    const getStatusLabel = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'sent') return 'Sent';
        if (s === 'pending') return 'Pending';
        if (s === 'accepted') return 'Accepted';
        if (s === 'rejected') return 'Rejected';
        if (s === 'clarification_requested') return 'Clarification';
        if (s === 'expired') return 'Expired';
        return status || 'Unknown';
    };

    const effectiveShowEntryValue = selectedShowEntries || showEntriesOptions[0].value;
    const selectedRange = showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ?? showEntriesOptions[0];
    const rangeEnd = selectedRange.end === null ? bids.length : Math.min(selectedRange.end, bids.length);
    const displayList = bids.slice(selectedRange.start, rangeEnd);

    // --- TABLE LIST VIEW ---
    return (
        <div className="px-1 pt-1 pb-0 space-y-8 flex flex-col h-full bg-white">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="text-2xl font-semibold text-[#000000]">Proposals</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-[150px]" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowEntriesOpen((o) => !o);
                            }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
                        >
                            <span
                                className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedShowEntries === ""
                                    ? "text-[#8B8B8B]"
                                    : "text-[#353535]"
                                    }`}
                            >
                                {selectedShowEntries === "" ? (
                                    SHOW_ENTRIES_PLACEHOLDER
                                ) : (
                                    <>
                                        <span className="text-[14px]">
                                            {SHOW_ENTRIES_SELECTED_PREFIX}
                                        </span>{" "}
                                        <span className="font-semibold">{selectedRange.label}</span>
                                    </>
                                )}
                            </span>
                            <img
                                src={ArrowDown}
                                alt=""
                                className={`w-3 h-3 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""
                                    } ${selectedShowEntries === ""
                                        ? "opacity-60 grayscale"
                                        : "opacity-90"
                                    }`}
                                aria-hidden
                            />
                        </button>
                        {showEntriesOpen && (
                            <div className="absolute top-full right-0 left-auto mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                                <div
                                    ref={showEntriesDropdownContentRef}
                                    className="max-h-[168px] overflow-y-auto custom-scrollbar"
                                >
                                    <button
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedShowEntries("");
                                            setShowEntriesOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
                                    >
                                        {SHOW_ENTRIES_PLACEHOLDER}
                                    </button>
                                    {showEntriesOptions.map((opt) => {
                                        const isChosen = selectedShowEntries === opt.value;
                                        return (
                                            <button
                                                key={`${opt.value}-${opt.start}-${String(opt.end)}`}
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setSelectedShowEntries(opt.value);
                                                    setShowEntriesOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen
                                                    ? "text-[#353535] bg-[#F2F2F2]"
                                                    : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"
                                                    }`}
                                            >
                                                <span className="truncate min-w-0">{opt.label}</span>
                                                {isChosen && (
                                                    <svg
                                                        className="w-4 h-4 shrink-0 text-[#353535]"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                        aria-hidden
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2.5}
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
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
                    ) : displayList.length === 0 ? (
                        <div className="py-20 text-center text-[#616161] font-gantari">
                            <svg className="w-14 h-14 mx-auto mb-4 text-[#AEACAC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-semibold mb-1 text-[#353535]">No accepted bids yet</p>
                            <p className="text-sm">Once your bid is accepted, you can create and submit a proposal here.</p>
                        </div>
                    ) : (
                        <table className="min-w-full border-collapse">
                            <thead className="sticky top-0 z-10 bg-white after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1.5px] after:bg-[rgb(89,89,89)]/10">
                                <tr className="bg-white">
                                    <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap border-b-[1.5px] border-[#F2F2F2]">Sl.No</th>
                                    <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap border-b-[1.5px] border-[#F2F2F2]">Project Name</th>
                                    <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap border-b-[1.5px] border-[#F2F2F2]">Vendor Name</th>
                                    <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap border-b-[1.5px] border-[#F2F2F2]">Bid Amount</th>
                                    <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap border-b-[1.5px] border-[#F2F2F2]">Timeline</th>
                                    <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap border-b-[1.5px] border-[#F2F2F2]">Status</th>
                                    <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap border-b-[1.5px] border-[#F2F2F2]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {displayList.map((bid, index) => {
                                    const slNo = (selectedRange.start + index + 1).toString().padStart(2, '0');
                                    const displayStatus =
                                        bid.proposal_exists && bid.proposal_status
                                            ? bid.proposal_status
                                            : bid.status;
                                    const clarificationEdit =
                                        (displayStatus || '').toLowerCase().replace(/-/g, '_') === 'clarification_requested';
                                    const canOpenCreateOrEdit =
                                        !bid.proposal_exists ||
                                        (clarificationEdit && bid.proposal_id != null && bid.proposal_id !== undefined);
                                    return (
                                        <tr key={bid.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'} transition-colors`}>
                                            <td className="px-4 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-4 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {bid.project_name}
                                            </td>
                                            <td className="px-4 py-6 text-center whitespace-nowrap align-middle">
                                                <div className="text-[14px] text-[#353535] font-gantari">{bid.vendor_name || '—'}</div>
                                            </td>
                                            <td className="px-4 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {bid.bid_amount != null ? String(bid.bid_amount) : '—'}
                                            </td>
                                            <td className="px-4 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                {bid.timeline || '—'}
                                            </td>
                                            <td className="px-4 py-6 text-center whitespace-nowrap align-middle">
                                                <span className={`inline-flex px-4 py-1.5 rounded-md text-[14px] font-gantari ${getStatusBadge(displayStatus)}`}>
                                                    {getStatusLabel(displayStatus)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-6 text-center whitespace-nowrap align-middle">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            canOpenCreateOrEdit &&
                                                            navigate("/v/create-proposal", {
                                                                state: {
                                                                    bid,
                                                                    ...(clarificationEdit && bid.proposal_id != null
                                                                        ? { proposalId: bid.proposal_id, editProposal: true }
                                                                        : {}),
                                                                },
                                                            })
                                                        }
                                                        disabled={!canOpenCreateOrEdit}
                                                        title={clarificationEdit ? "Edit proposal" : "Create proposal"}
                                                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[14px] font-gantari transition-all bg-[#DD4342] text-white shadow-sm shadow-red-100 cursor-pointer ${!canOpenCreateOrEdit ? 'cursor-not-allowed opacity-50' : ''}`}
                                                    >
                                                        <img src={viewIcon} alt="" className="w-4 h-4 object-contain brightness-0 invert" />
                                                        {clarificationEdit ? "Edit" : "Create"}
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            bid.proposal_exists && navigate("/td/view-proposal", {
                                                                state: {
                                                                    proposalId: bid.proposal_id,
                                                                    bid,
                                                                    source: "vendor_submitted",
                                                                    returnTo: "/v/proposals",
                                                                },
                                                            })
                                                        }
                                                        disabled={!bid.proposal_exists}
                                                        title="View Proposal"
                                                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[14px] font-gantari transition-all bg-[#DD4342] text-white shadow-sm shadow-red-100 cursor-pointer ${!bid.proposal_exists ? 'cursor-not-allowed opacity-50' : ''}`}
                                                    >
                                                        <img src={viewIcon} alt="View" className="w-4 h-4 object-contain brightness-0 invert" />
                                                        View
                                                    </button>
                                                </div>
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
