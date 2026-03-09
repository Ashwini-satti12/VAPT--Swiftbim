import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../lib/api";
import viewIcon from '../../assets/ProjectManager/Client/whiteviewicon.svg';

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
}

const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
  { value: '0-100', label: '0-100', start: 0, end: 100 },
  { value: '101-200', label: '101-200', start: 100, end: 200 },
  { value: '201-300', label: '201-300', start: 200, end: 300 },
  { value: '301-400', label: '301-400', start: 300, end: 400 },
  { value: 'all', label: 'All', start: 0, end: null },
];

const PER_PAGE = 10;
const PAGINATION_VISIBLE = 4;

export default function ProposalTD() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState<AcceptedBid[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationWindowStart, setPaginationWindowStart] = useState(1);

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  };

  const filtered = bids.filter(b =>
    b.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close show entries dropdown when clicking outside
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

  useEffect(() => {
    setCurrentPage(1);
    setPaginationWindowStart(1);
  }, [selectedShowEntries]);

  const selectedRange = showEntriesOptions.find(o => o.value === selectedShowEntries) ?? showEntriesOptions[0];
  const rangeStart = selectedRange.start;
  const rangeEnd = selectedRange.end === null ? filtered.length : Math.min(selectedRange.end, filtered.length);
  const listInRange = filtered.slice(rangeStart, rangeEnd);
  const totalInRange = listInRange.length;
  const totalPages = Math.max(1, Math.ceil(totalInRange / PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const displayedList = listInRange.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const pageRanges: { start: number; end: number; label: string }[] = [];
  for (let p = 1; p <= totalPages; p++) {
    const s = rangeStart + (p - 1) * PER_PAGE;
    const e = Math.min(rangeStart + p * PER_PAGE, rangeEnd);
    const label = s === 0 ? `0-${e}` : `${s + 1}-${e}`;
    pageRanges.push({ start: s, end: e, label });
  }
  const activePage = safePage;
  const maxWindowStart = Math.max(1, totalPages - PAGINATION_VISIBLE + 1);
  const visiblePageRanges = pageRanges.slice(paginationWindowStart - 1, paginationWindowStart - 1 + PAGINATION_VISIBLE);
  const canPrevWindow = paginationWindowStart > 1;
  const canNextWindow = paginationWindowStart <= totalPages - PAGINATION_VISIBLE;
  const goPrevWindow = () => setPaginationWindowStart((s) => Math.max(1, s - PAGINATION_VISIBLE));
  const goNextWindow = () => setPaginationWindowStart((s) => Math.min(s + PAGINATION_VISIBLE, maxWindowStart));

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
          {/* Search */}
          <div className="relative flex items-center gap-2 px-4 py-2 bg-[#EAEAEA] rounded-md min-w-[220px]">
            <svg className="w-4 h-4 text-[#616161] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search vendor or project..."
              className="bg-transparent text-sm font-medium text-[#353535] placeholder:text-[#616161] focus:outline-none w-full font-gantari"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-[#616161] hover:text-[#353535] transition-colors ml-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          {/* Show entries dropdown */}
          <div className="relative" ref={showEntriesDropdownRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEntriesOpen(o => !o); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md hover:bg-[#DDDDDD] transition-all cursor-pointer border-0"
            >
              <span className="text-sm font-medium text-[#353535] font-gantari">Show:</span>
              <span className="text-sm font-medium text-[#353535] font-gantari">{selectedRange.label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#353535" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showEntriesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showEntriesOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1" onMouseDown={(e) => e.preventDefault()}>
                {showEntriesOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedShowEntries(opt.value); setShowEntriesOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium font-gantari transition-colors ${selectedShowEntries === opt.value ? 'text-[#353535] bg-gray-100' : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
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
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                  <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Project Name</th>
                  <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Vendor Name</th>
                  <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Bid Amount</th>
                  <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Timeline</th>
                  <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Accepted On</th>
                  <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedList.map((bid, index) => {
                  const baseIndex = rangeStart + (safePage - 1) * PER_PAGE + index;
                  const slNo = (baseIndex + 1).toString().padStart(2, '0');
                  return (
                    <tr key={bid.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                      <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                      <td className="px-3 py-3 text-center text-sm font-semibold text-[#353535] font-gantari whitespace-nowrap align-middle">{bid.project_name}</td>
                      <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                        <div className="text-sm font-semibold text-[#353535] font-gantari">{bid.vendor_name}</div>
                        <div className="text-xs text-[#616161] font-gantari mt-0.5">{bid.vendor_email}</div>
                      </td>
                      <td className="px-3 py-3 text-center text-sm font-bold text-[#353535] font-gantari whitespace-nowrap align-middle">
                        {formatCurrency(bid.bid_amount)}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{bid.timeline || "—"}</td>
                      <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{formatDate(bid.created_at)}</td>
                      <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                        {bid.proposal_exists ? (
                          <div className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-md text-xs font-bold font-gantari bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Proposal Sent
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              navigate("/td/create-proposal", {
                                state: {
                                  bid,
                                  projectName: bid.project_name,
                                  opportunityId: bid.opportunity_id,
                                },
                              })
                            }
                            className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-md text-xs font-bold font-gantari bg-[#DD4342] text-white hover:bg-[#c23b3a] shadow-sm shadow-red-100 transition-all"
                          >
                            <img src={viewIcon} alt="" className="w-4 h-4 object-contain" />
                            Create Proposal
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {/* Pagination bar - same as TrackerTD */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-end mt-4 -mb-2 pt-0 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap bg-[#EEEEEE] rounded-xl px-4 py-1">
              <span className="text-[#666666] text-sm font-medium font-gantari">Showing:</span>
              <button
                type="button"
                onClick={goPrevWindow}
                disabled={!canPrevWindow}
                className="flex items-center gap-1 text-[#666666] text-sm font-medium font-gantari hover:text-[#353535] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                Prev
              </button>
              {visiblePageRanges.map((pr) => {
                const pageNum = Math.floor((pr.start - rangeStart) / PER_PAGE) + 1;
                const isActive = pageNum === activePage;
                return (
                  <button
                    key={pr.label}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium font-gantari transition-colors ${isActive ? 'bg-[#DD4342] text-white' : 'text-[#666666] hover:text-[#353535] hover:bg-gray-200'}`}
                  >
                    {pr.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={goNextWindow}
                disabled={!canNextWindow}
                className="flex items-center gap-1 text-[#666666] text-sm font-medium font-gantari hover:text-[#353535] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
