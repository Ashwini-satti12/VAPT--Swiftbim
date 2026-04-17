import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../lib/api";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
// import editIcon from '../../assets/ProjectManager/project/editIcon.svg';
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";

interface VendorProposalRow {
  id: number;
  bid_id: number;
  opportunity_id: number;
  vendor_id: number;
  project_name?: string;
  vendor_name?: string;
  vendor_email?: string;
  bid_amount?: number;
  timeline?: string;
  status: string;
  reason?: string;
  created_at: string;
}

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

export default function ProposalTD() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<VendorProposalRow[]>([]);
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
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
    const state =
      (location && (location.state as { responded?: boolean; msg?: string })) ||
      {};
    if (state?.responded) toast.success(state.msg || "Proposal updated.");
    // Clean up state so toast doesn't re-appear on refresh
    if (location.state) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    api
      .get<{ success?: boolean; proposals?: VendorProposalRow[] }>(
        "/api/vendors/td/proposals",
      )
      .then(({ data }) => setProposals(data.proposals ?? []))
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount: number | string | undefined) => {
    if (!amount) return "—";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusLabel = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "accepted") return "Accepted";
    if (s === "pending") return "Pending";
    if (s === "clarification_requested") return "Clarification requested";
    return status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "accepted") return "bg-[#E1F6EB] text-[#008F22]";
    if (s === "pending" || s === "active") return "bg-[#EAF0FB] text-[#1967D2]";
    if (s === "rejected") return "bg-[#FFD9D9] text-[#E00100]";
    return "bg-[#F2F2F2] text-[#616161]";
  };

  const searchQuery = searchParams.get("q")?.toLowerCase() || "";
  const filtered = proposals.filter((p) => {
    if (!searchQuery) return true;
    return (
      (p.project_name || "").toLowerCase().includes(searchQuery) ||
      (p.vendor_name || "").toLowerCase().includes(searchQuery) ||
      (p.vendor_email || "").toLowerCase().includes(searchQuery) ||
      (p.status || "").toLowerCase().includes(searchQuery) ||
      (p.timeline || "").toLowerCase().includes(searchQuery)
    );
  });

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

  const effectiveShowEntryValue =
    selectedShowEntries || showEntriesOptions[0].value;
  const selectedRange =
    showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ??
    showEntriesOptions[0];
  const rangeEnd =
    selectedRange.end === null
      ? filtered.length
      : Math.min(selectedRange.end, filtered.length);
  const listInRange = filtered.slice(selectedRange.start, rangeEnd);
  const displayList = listInRange;

  return (
    <div className="px-1 pt-1 pb-0 space-y-8 flex flex-col h-full bg-white">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0 px-4 py-2">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#000000]">
            Proposals
          </h2>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Show entries dropdown */}
          <div
            className="relative w-full sm:w-[150px]"
            ref={showEntriesDropdownRef}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEntriesOpen((o) => !o);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
            >
              <span
                className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedShowEntries === "" ? "text-[#8B8B8B]" : "text-[#353535]"}`}
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
                className={`w-3 h-3 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""} ${selectedShowEntries === "" ? "opacity-60 grayscale" : "opacity-90"}`}
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
                        className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen ? "text-[#353535] bg-[#F2F2F2]" : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"}`}
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

      {/* Table/Card Card */}
      <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative mx-2 mb-2 sm:mx-0 sm:mb-0">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-250px)] sm:max-h-[calc(100vh-220px)]">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-[#616161] font-gantari px-4">
              <svg
                className="w-14 h-14 mx-auto mb-4 text-[#AEACAC]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-semibold mb-1 text-[#353535]">
                No vendor proposals yet
              </p>
              <p className="text-sm">
                Vendor proposals will appear here once submitted.
              </p>
            </div>
          ) : (
            <>
              {/* Simplified Table View (Always Visible, scrollable) */}
              <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-white after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                    <tr className="bg-white">
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
                    {displayList.map((p, index) => {
                      const slNo = (selectedRange.start + index + 1).toString().padStart(2, '0');
                      const displayStatus = p.status;
                      const statusNorm = String(displayStatus || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
                      const isTerminal = statusNorm === "accepted" || statusNorm === "rejected";
                      return (
                        <tr key={p.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{slNo}</td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{p.project_name || "—"}</td>
                          <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                            <div className="text-[14px] text-[#353535] font-gantari">{p.vendor_name || "—"}</div>
                          </td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {formatCurrency(p.bid_amount as any)}
                          </td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{p.timeline || "—"}</td>
                          <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                            <span className={`inline-flex px-4 py-1.5 rounded-lg text-[14px] font-gantari ${getStatusBadge(displayStatus)}`}>
                              {getStatusLabel(displayStatus)}
                            </span>
                          </td>
                          <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  navigate(`/td/view-proposal?proposalId=${p.id}&source=vendor_submitted`, {
                                    state: { proposalId: p.id, bid: p, source: "vendor_submitted" },
                                  })
                                }
                                title="View Proposal"
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[14px] font-gantari transition-all bg-[#DD4342] text-white shadow-sm shadow-red-100 cursor-pointer"
                              >
                                <img src={viewIcon} alt="" className="w-4 h-4 object-contain brightness-0 invert" />
                                View
                              </button>

                              <div className="relative group">
                                <button
                                  onClick={() => !isTerminal && void respond(p.id, "accept")}
                                  disabled={isTerminal}
                                  className={`h-10 w-10 rounded-full flex items-center justify-center text-[18px] font-gantari transition-all bg-[#E1F6EB] text-[#008F22] shadow-sm ${isTerminal ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                  aria-label="Accept"
                                  type="button"
                                >
                                  ✓
                                </button>
                                <div className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-[300]">
                                  <div className="rounded-md bg-[#353535] text-white text-[12px] font-semibold px-2 py-1 whitespace-nowrap shadow-lg">
                                    Accept
                                  </div>
                                </div>
                              </div>

                              <div className="relative group">
                                <button
                                  onClick={() => !isTerminal && void respond(p.id, "reject")}
                                  disabled={isTerminal}
                                  className={`h-10 w-10 rounded-full flex items-center justify-center text-[18px] font-gantari transition-all bg-[#FFF1F2] text-[#BE123C] shadow-sm ${isTerminal ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                  aria-label="Reject"
                                  type="button"
                                >
                                  ✕
                                </button>
                                <div className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-[300]">
                                  <div className="rounded-md bg-[#353535] text-white text-[12px] font-semibold px-2 py-1 whitespace-nowrap shadow-lg">
                                    Reject
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
