import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import viewIcon from '../../assets/ProjectManager/Client/whiteviewicon.svg';
import editIcon from '../../assets/ProjectManager/project/editIcon.svg';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';

interface AcceptedBid {
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
}

const SHOW_ENTRIES_PLACEHOLDER = 'Show Entries';
const SHOW_ENTRIES_SELECTED_PREFIX = 'Show:';
const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
  { value: '1-50', label: '1-50', start: 0, end: 50 },
  { value: '51-100', label: '51-100', start: 50, end: 100 },
  { value: '101-150', label: '101-150', start: 100, end: 150 },
  { value: '151-200', label: '151-200', start: 150, end: 200 },
  { value: '201-250', label: '201-250', start: 200, end: 250 },
  { value: '251-300', label: '251-300', start: 250, end: 300 },
  { value: 'all', label: 'All', start: 0, end: null },
];

export default function ProposalTD() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState<AcceptedBid[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedShowEntries, setSelectedShowEntries] = useState('');
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (showEntriesOpen && showEntriesDropdownContentRef.current) {
      showEntriesDropdownContentRef.current.scrollTop = 0;
    }
  }, [showEntriesOpen]);

  useEffect(() => {
    const state: any = (location && (location as any).state) || {};
    if (state?.acceptedBid) {
      setSuccessMsg(`${state.acceptedBid.vendor_name || "Vendor"} accepted — create a proposal below.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  }, []);

  useEffect(() => {
    api.get<{ bids: AcceptedBid[] }>("/api/vendors/bidding/accepted-bids")
      .then(({ data }) => setBids(data.bids ?? []))
      .catch(() => setBids([]))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'accepted') return 'Accepted';
    if (s === 'pending') return 'Pending';
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'accepted') return 'bg-[#E1F6EB] text-[#008F22]';
    if (s === 'pending' || s === 'active') return 'bg-[#EAF0FB] text-[#1967D2]';
    if (s === 'rejected') return 'bg-[#FFD9D9] text-[#E00100]';
    return 'bg-[#F2F2F2] text-[#616161]';
  };

  const searchQuery = searchParams.get('q')?.toLowerCase() || "";
  const filtered = bids.filter((bid) => {
    if (!searchQuery) return true;
    return (
      (bid.project_name || "").toLowerCase().includes(searchQuery) ||
      (bid.vendor_name || "").toLowerCase().includes(searchQuery) ||
      (bid.vendor_email || "").toLowerCase().includes(searchQuery) ||
      (bid.status || "").toLowerCase().includes(searchQuery) ||
      (bid.timeline || "").toLowerCase().includes(searchQuery)
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEntriesDropdownRef.current && !showEntriesDropdownRef.current.contains(event.target as Node)) {
        setShowEntriesOpen(false);
      }
    };
    if (showEntriesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEntriesOpen]);

  const effectiveShowEntryValue = selectedShowEntries || showEntriesOptions[0].value;
  const selectedRange = showEntriesOptions.find(o => o.value === effectiveShowEntryValue) ?? showEntriesOptions[0];
  const rangeEnd = selectedRange.end === null ? filtered.length : Math.min(selectedRange.end, filtered.length);
  const listInRange = filtered.slice(selectedRange.start, rangeEnd);
  const displayList = listInRange;

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

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h2 className="text-2xl font-semibold text-[#000000]">Proposals</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Show entries dropdown */}
          <div className="relative min-w-[140px] max-w-[200px] w-[150px]" ref={showEntriesDropdownRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEntriesOpen(o => !o); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
            >
              <span className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedShowEntries === '' ? 'text-[#8B8B8B]' : 'text-[#353535]'}`}>
                {selectedShowEntries === '' ? (
                  SHOW_ENTRIES_PLACEHOLDER
                ) : (
                  <>
                    <span className="text-[14px]">{SHOW_ENTRIES_SELECTED_PREFIX}</span>{' '}
                    <span className="font-semibold">{selectedRange.label}</span>
                  </>
                )}
              </span>
              <img
                src={ArrowDown}
                alt=""
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${showEntriesOpen ? 'rotate-180' : ''} ${selectedShowEntries === '' ? 'opacity-60 grayscale' : 'opacity-90'}`}
                aria-hidden
              />
            </button>
            {showEntriesOpen && (
              <div className="absolute top-full right-0 left-auto mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                <div ref={showEntriesDropdownContentRef} className="max-h-[168px] overflow-y-auto custom-scrollbar">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedShowEntries(''); setShowEntriesOpen(false); }}
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
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedShowEntries(opt.value); setShowEntriesOpen(false); }}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen ? 'text-[#353535] bg-[#F2F2F2]' : 'text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]'}`}
                      >
                        <span className="truncate min-w-0">{opt.label}</span>
                        {isChosen && (
                          <svg className="w-4 h-4 shrink-0 text-[#353535]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
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
      <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-220px)]">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-[#616161] font-gantari">
              <svg className="w-14 h-14 mx-auto mb-4 text-[#AEACAC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold mb-1 text-[#353535]">No accepted bids yet</p>
              <p className="text-sm">Accept vendor bids from the Bidding module to create proposals here.</p>
            </div>
          ) : (
            <table className="min-w-full border-collapse">
              <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Project Name</th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Vendor Name</th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Bid Amount</th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Timeline</th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Status</th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayList.map((bid, index) => {
                  const slNo = (selectedRange.start + index + 1).toString().padStart(2, '0');
                  const displayStatus =
                    bid.proposal_exists && bid.proposal_status
                      ? bid.proposal_status
                      : bid.status;
                  return (
                    <tr key={bid.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                      <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{slNo}</td>
                      <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{bid.project_name}</td>
                      <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                        <div className="text-[14px] text-[#353535] font-gantari">{bid.vendor_name}</div>
                      </td>
                      <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                        {formatCurrency(bid.bid_amount)}
                      </td>
                      <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{bid.timeline || "—"}</td>
                      <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                        <span className={`inline-flex px-4 py-1.5 rounded-lg text-[14px] font-gantari ${getStatusBadge(displayStatus)}`}>
                          {getStatusLabel(displayStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              !bid.proposal_exists && navigate("/td/create-proposal", {
                                state: {
                                  bid,
                                  projectName: bid.project_name,
                                  opportunityId: bid.opportunity_id,
                                },
                              })
                            }
                            disabled={!!bid.proposal_exists}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[14px] font-gantari transition-all bg-[#DD4342] text-white shadow-sm shadow-red-100 cursor-pointer ${
                                bid.proposal_exists 
                                ? 'cursor-not-allowed opacity-50' 
                                : ' '
                            }`}
                          >
                            <img src={viewIcon} alt="" className="w-4 h-4 object-contain" />
                            Create
                          </button>
                          
                          <button
                            onClick={() =>
                              bid.proposal_exists && navigate("/td/view-proposal", {
                                state: {
                                  proposalId: bid.proposal_id,
                                  bid,
                                },
                              })
                            }
                            disabled={!bid.proposal_exists}
                            title="View Proposal"
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[14px] font-gantari transition-all bg-[#DD4342] text-white shadow-sm shadow-red-100 cursor-pointer ${
                                !bid.proposal_exists 
                                ? 'cursor-not-allowed opacity-50' 
                                : ''
                            }`}
                          >
                            <img src={viewIcon} alt="View" className="w-4 h-4 object-contain" />
                            view
                          </button>

                          {/* <button
                            onClick={() =>
                              bid.proposal_exists && navigate("/td/edit-proposal", {
                                state: {
                                  proposalId: bid.proposal_id,
                                  bid,
                                },
                              })
                            }
                            disabled={!bid.proposal_exists}
                            title="Edit Proposal"
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[14px] font-gantari transition-all bg-[#F2F2F2] text-[#353535] shadow-sm shadow-red-100 cursor-pointer ${
                                !bid.proposal_exists 
                                ? 'cursor-not-allowed opacity-50' 
                                : ''
                            }`}
                          >
                            <img src={editIcon} alt="Edit" className="w-4 h-4 object-contain" />
                            
                          </button> */}
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
