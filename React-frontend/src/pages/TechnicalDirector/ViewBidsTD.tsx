import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import type { BiddingEntry } from "./BiddingTD";
import viewIcon from "../../assets/ProjectManager/Client/whiteviewicon.svg";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";

interface VendorBid {
  id: number;
  vendor_id: number;
  opportunity_id: number;
  bid_amount: number;
  notes: string;
  timeline: string;
  team_size: number;
  status: string;
  created_at: string;
  vendor_name: string;
  vendor_email: string;
  vendor_phone: string;
  company_name: string;
  rank: number;
  is_top4: boolean;
}

interface ViewBidsTDProps {
  project: BiddingEntry;
  onBack: () => void;
}

const showEntriesOptions: {
  value: string;
  label: string;
  start: number;
  end: number | null;
}[] = [
    { value: "show", label: "Show", start: 0, end: 50 },
    { value: "1-50", label: "1-50", start: 0, end: 50 },
    { value: "51-100", label: "51-100", start: 50, end: 100 },
    { value: "101-150", label: "101-150", start: 100, end: 150 },
    { value: "151-200", label: "151-200", start: 150, end: 200 },
    { value: "201-250", label: "201-250", start: 200, end: 250 },
    { value: "all", label: "All", start: 0, end: null },
  ];

/** Recomputes ranks: rejected bids go to bottom, rest renumber 1,2,3… */
function rerank(bids: VendorBid[]): VendorBid[] {
  const active = bids
    .filter((b) => b.status !== "lost")
    .sort((a, b) => a.bid_amount - b.bid_amount);
  const rejected = bids.filter((b) => b.status === "lost");
  const ranked = [
    ...active.map((b, i) => ({ ...b, rank: i + 1 })),
    ...rejected.map((b, i) => ({ ...b, rank: active.length + i + 1 })),
  ];
  return ranked;
}

const rankLabel = (rank: number) => {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
};

export default function ViewBidsTD({ project, onBack }: ViewBidsTDProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState<VendorBid[]>([]);
  const [opportunity, setOpportunity] =
    useState<Partial<BiddingEntry>>(project);

  // Scope of work (fetched from phase-one proposal/enquiry in new_swiftbim)
  const [scopeLoading, setScopeLoading] = useState(false);
  const [projectSector, setProjectSector] = useState("");
  const [bimServices, setBimServices] = useState("");
  const [scopeOfWorkHtml, setScopeOfWorkHtml] = useState<string>("");

  // Per-bid action states
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>(
    {},
  );
  const [viewLoading, setViewLoading] = useState<Record<number, boolean>>({});
  const [actionToast, setActionToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const [selectedShowEntries, setSelectedShowEntries] = useState(
    showEntriesOptions[0].value,
  );
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ opportunity: BiddingEntry; bids: VendorBid[] }>(
        `/api/vendors/bidding/${project.id}/bids`,
      )
      .then(({ data }) => {
        setBids(rerank(data.bids ?? []));
        if (data.opportunity) setOpportunity(data.opportunity);
      })
      .catch(() => setBids([]))
      .finally(() => setLoading(false));
  }, [project.id]);

  useEffect(() => {
    if (!project?.id) return;

    setScopeLoading(true);
    setProjectSector("");
    setBimServices("");
    setScopeOfWorkHtml("");

    api
      .get<{ proposal?: any }>("/api/vendors/proposals/phase-one", {
        params: { opportunity_id: project.id },
      })
      .then(({ data }) => {
        const base = data?.proposal;
        if (!base) return;

        if (base.project_type_sector) {
          try {
            const parsed = JSON.parse(base.project_type_sector);
            const sectors = Object.entries(parsed)
              .map(([key, val]) => {
                if (Array.isArray(val) && val.length > 0)
                  return `${key}: ${val.join(" / ")}`;
                return key;
              })
              .join(", ");
            setProjectSector(sectors);
          } catch {
            setProjectSector(base.project_type_sector);
          }
        }

        if (base.bim_services_required) {
          try {
            const parsed = JSON.parse(base.bim_services_required);
            const services = Object.values(parsed).flat().join(" & ");
            setBimServices(services);
          } catch {
            setBimServices(base.bim_services_required);
          }
        }

        if (base.scope_of_work) {
          setScopeOfWorkHtml(base.scope_of_work);
        }
      })
      .catch(() => {
        // If scope cannot be fetched, keep empty (UI hides the section)
      })
      .finally(() => setScopeLoading(false));
  }, [project?.id]);

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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setActionToast({ msg, type });
    setTimeout(() => setActionToast(null), 3500);
  };

  // ── View Vendor → redirect to /td/partner/:id ──
  const handleViewVendor = async (bid: VendorBid) => {
    setViewLoading((prev) => ({ ...prev, [bid.id]: true }));
    try {
      const { data } = await api.get<{ vendor: { id: number } | null }>(
        `/api/vendors/by-email?email=${encodeURIComponent(bid.vendor_email)}`,
      );
      if (data.vendor?.id) {
        navigate(`/td/partner/${data.vendor.id}`);
      } else {
        showToast("Vendor onboarding profile not found.", "error");
      }
    } catch {
      showToast("Failed to load vendor profile.", "error");
    } finally {
      setViewLoading((prev) => ({ ...prev, [bid.id]: false }));
    }
  };

  // ── Accept ──
  const handleAccept = async (bid: VendorBid) => {
    setActionLoading((prev) => ({ ...prev, [bid.id]: true }));
    try {
      const { data } = await api.post<{ success: boolean; bid: VendorBid }>(
        `/api/vendors/bidding/${project.id}/bids/${bid.id}/accept`,
      );
      if (data.success) {
        setBids((prev) =>
          rerank(
            prev.map((b) =>
              b.id === bid.id ? { ...b, status: "shortlisted" } : b,
            ),
          ),
        );
        showToast(
          `${bid.vendor_name} accepted — redirecting to Proposals...`,
          "success",
        );
        setTimeout(() => {
          navigate("/td/proposals", {
            state: {
              acceptedBid: data.bid || bid,
              projectName: opportunity.project_name,
              opportunityId: project.id,
            },
          });
        }, 1400);
      } else {
        showToast("Failed to accept bid.", "error");
      }
    } catch {
      showToast("Error accepting bid.", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [bid.id]: false }));
    }
  };

  // ── Reject → move to bottom, increment other ranks ──
  const handleReject = async (bid: VendorBid) => {
    setActionLoading((prev) => ({ ...prev, [bid.id]: true }));
    try {
      const { data } = await api.post<{ success: boolean }>(
        `/api/vendors/bidding/${project.id}/bids/${bid.id}/reject`,
      );
      if (data.success) {
        // Rerank: rejected → bottom, others reordered
        setBids((prev) =>
          rerank(
            prev.map((b) => (b.id === bid.id ? { ...b, status: "lost" } : b)),
          ),
        );
        showToast(
          `${bid.vendor_name}'s bid rejected and moved to bottom.`,
          "success",
        );
      } else {
        showToast("Failed to reject bid.", "error");
      }
    } catch {
      showToast("Error rejecting bid.", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [bid.id]: false }));
    }
  };

  const getRankBg = (rank: number, status: string) => {
    if (status === "lost") return "bg-[#FCE8E8] text-[#D93025]";
    if (status === "shortlisted") return "bg-[#E6F4EA] text-[#1E7E34]";
    if (rank === 1) return "bg-[#E6F4EA] text-[#1E7E34]";
    if (rank === 2) return "bg-[#EAF0FB] text-[#1967D2]";
    if (rank === 3) return "bg-[#FFF3E0] text-[#E65100]";
    return "bg-[#F2F2F2] text-[#353535]";
  };

  const computedStatus = (
    opportunity.computed_status ||
    opportunity.status ||
    "active"
  ).toLowerCase();
  const oppStatusLabel =
    computedStatus === "active"
      ? "Open"
      : computedStatus === "awarded"
        ? "Awarded"
        : "Closed";
  const oppStatusCls =
    computedStatus === "active"
      ? "bg-blue-50 text-blue-600 border-blue-100"
      : computedStatus === "awarded"
        ? "bg-green-50 text-green-600 border-green-100"
        : "bg-gray-50 text-gray-500 border-gray-100";

  return (
    <div className="h-full flex flex-col px-2 pt-1 pb-0 font-gantari bg-white">
      {/* Toast */}
      {actionToast && (
        <div
          className={`fixed top-5 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl font-gantari text-sm font-medium min-w-[280px] transition-all ${actionToast.type === "success" ? "bg-[#1A8A47] text-white" : "bg-[#D93025] text-white"}`}
        >
          {actionToast.type === "success" ? (
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
          <span>{actionToast.msg}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 mb-6">
        <div className="flex items-center justify-between w-full md:w-auto">
          <button
            onClick={onBack}
            className="p-2 rounded-md bg-[#F2F2F2] hover:bg-gray-200 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Back to Bidding"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5 object-contain" />
          </button>
          
          <h2 className="md:hidden text-xl font-gantari font-semibold text-[#000000] truncate px-2">
            Bid Details
          </h2>

          <div className="md:hidden flex items-center gap-2 shrink-0">
            <span
              className={`px-3 py-1 rounded-md text-xs font-bold border ${oppStatusCls}`}
            >
              {oppStatusLabel}
            </span>
          </div>
        </div>

        <h2 className="hidden md:block text-2xl font-gantari font-semibold text-[#000000]">
          Bid Details
        </h2>

        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none relative" ref={showEntriesDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEntriesOpen((o) => !o);
              }}
              className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer border-0"
            >
              {selectedShowEntries === "show" ? (
                <span className="text-sm font-medium text-[#616161] font-gantari">
                  Show
                </span>
              ) : (
                <div className="flex items-center gap-1 overflow-hidden">
                  <span className="text-sm font-medium text-[#353535] font-gantari shrink-0">
                    Show:
                  </span>
                  <span className="text-sm font-medium text-[#353535] font-gantari truncate">
                    {
                      showEntriesOptions.find(
                        (o) => o.value === selectedShowEntries,
                      )?.label
                    }
                  </span>
                </div>
              )}
              <img
                src={ArrowDown}
                alt="arrow"
                className={`ml-2 w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""}`}
              />
            </button>
            {showEntriesOpen && (
              <div
                className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1 max-h-[160px] overflow-y-auto custom-scrollbar"
                onMouseDown={(e) => e.preventDefault()}
              >
                {showEntriesOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShowEntries(opt.value);
                      setShowEntriesOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium cursor-pointer font-gantari transition-colors ${selectedShowEntries === opt.value ? "text-[#353535] bg-gray-100" : "text-[#616161] hover:text-[#353535] hover:bg-gray-50"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span
            className={`hidden md:block px-3 py-1 rounded-md text-xs font-bold border ${oppStatusCls} shrink-0`}
          >
            {oppStatusLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 space-y-6 flex flex-col min-h-0">
        {/* ── Project Summary ── */}
        <div className="space-y-4 flex-shrink-0">
          <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md py-4 sm:py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4">
            <div className="px-4 sm:px-8 sm:border-r border-[#AEACAC52] lg:last:border-r-0">
              <p className="text-base sm:text-lg font-bold text-[#353535] mb-1 tracking-wider font-gantari text-center whitespace-nowrap">
                Project Name
              </p>
              <p className="font-semibold text-[#616161] text-sm sm:text-base font-gantari truncate text-center">
                {opportunity.project_name || "—"}
              </p>
            </div>
            <div className="px-4 sm:px-8 lg:border-r border-[#AEACAC52] last:border-r-0">
              <p className="text-base sm:text-lg font-bold text-[#353535] mb-1 tracking-wider font-gantari text-center whitespace-nowrap">
                Outsourcing Budget
              </p>
              <p className="font-semibold text-[#616161] text-sm sm:text-base font-gantari text-center">
                {formatCurrency(
                  opportunity.budget_ceiling ||
                  opportunity.outsource_budget ||
                  0,
                )}
              </p>
            </div>
            <div className="px-4 sm:px-8 sm:border-r border-[#AEACAC52] last:border-r-0">
              <p className="text-base sm:text-lg font-bold text-[#353535] mb-1 tracking-wider font-gantari text-center whitespace-nowrap">
                Bidding End Date
              </p>
              <p className="font-semibold text-[#616161] text-sm sm:text-base font-gantari text-center">
                {opportunity.bid_deadline
                  ? formatDate(opportunity.bid_deadline)
                  : "—"}
              </p>
            </div>
            <div className="px-4 sm:px-8 last:border-r-0">
              <p className="text-base sm:text-lg font-bold text-[#353535] mb-1 tracking-wider font-gantari text-center whitespace-nowrap">
                Total Bids
              </p>
              <p className="font-semibold text-[#353535] text-2xl sm:text-3xl font-gantari text-center leading-none">
                {bids.length}
              </p>
            </div>
          </div>

          {(opportunity.description ||
            scopeLoading ||
            projectSector ||
            bimServices ||
            scopeOfWorkHtml) && (
              <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md px-8 py-4">
                <p className="text-lg font-bold text-[#353535] mb-1 font-gantari">
                  Project Description
                </p>
                {!scopeOfWorkHtml && (
                  <p className="font-semibold text-[#616161] text-base font-gantari">
                    {opportunity.description}
                  </p>
                )}

                {(scopeLoading ||
                  projectSector ||
                  bimServices ||
                  scopeOfWorkHtml) && (
                    <div className="mt-4 space-y-3">
                      {(projectSector || bimServices) && (
                        <div className="bg-[#F9F9F9] border border-[#AEACAC52] rounded-md p-6 space-y-4">
                          {projectSector && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                              <span className="font-bold text-[#353535] min-w-0 sm:min-w-[220px]">
                                Project Sector:
                              </span>
                              <span className="text-[#616161] font-medium">
                                {projectSector}
                              </span>
                            </div>
                          )}
                          {bimServices && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                              <span className="font-bold text-[#353535] min-w-0 sm:min-w-[220px]">
                                BIM Services Required:
                              </span>
                              <span className="text-[#616161] font-medium">
                                {bimServices}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {scopeOfWorkHtml && (
                        <div
                          className="bg-[#F9FAFB] rounded-md px-5 py-4 text-[15px] text-[#353535] font-gantari leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                          dangerouslySetInnerHTML={{ __html: scopeOfWorkHtml }}
                        />
                      )}

                      {scopeLoading &&
                        !scopeOfWorkHtml &&
                        !(projectSector || bimServices) && (
                          <div className="py-6 text-sm text-[#616161] font-gantari">
                            Loading scope...
                          </div>
                        )}
                    </div>
                  )}
              </div>
            )}
        </div>

        {/* ── Vendor Bids Table ── */}
        <div className="bg-white rounded-md border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px] relative">
          {/* Table header bar */}
          {/* <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                        <h3 className="text-base font-bold text-[#353535] font-gantari">
                            Vendor Bids
                            <span className="ml-2 text-sm font-semibold text-[#616161]">({bids.length})</span>
                        </h3>
                        <span className="text-xs text-[#616161] font-gantari">Ranked by lowest bid amount · rejected bids move to bottom</span>
                    </div> */}

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
            </div>
          ) : bids.length === 0 ? (
            <div className="py-20 text-center text-[#616161] font-gantari">
              <svg
                className="w-14 h-14 mx-auto mb-4 text-[#E2E8F0]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-lg font-semibold mb-1 text-[#353535]">
                No bids received yet
              </p>
              <p className="text-sm">
                Vendors will appear here once they submit bids.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar smooth-scroll flex-1">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-white after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                  <tr className=" bg-white">
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Sl.No
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Vendor Name
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Contact Email
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Bid Amount
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Timeline
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Team Size
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Bid Date
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Rank
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      View Vendor
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bids
                    .slice(
                      showEntriesOptions.find(
                        (o) => o.value === selectedShowEntries,
                      )?.start ?? 0,
                      showEntriesOptions.find(
                        (o) => o.value === selectedShowEntries,
                      )?.end === null
                        ? bids.length
                        : Math.min(
                          showEntriesOptions.find(
                            (o) => o.value === selectedShowEntries,
                          )?.end ?? bids.length,
                          bids.length,
                        ),
                    )
                    .map((bid, index) => {
                      const isRejected = bid.status === "lost";
                      const busy = !!actionLoading[bid.id];
                      const viewBusy = !!viewLoading[bid.id];
                      const slNo = (index + 1).toString().padStart(2, "0");

                      return (
                        <tr
                          key={bid.id}
                          className={`${isRejected ? "opacity-60" : ""} ${index % 2 === 1 ? "bg-[#F2F2F2]" : "bg-white"}`}
                        >
                          {/* Sl.No */}
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">
                            {slNo}
                          </td>

                          {/* Vendor Name */}
                          <td className="px-3 py-6 text-center text-[14px] font-semibold text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {bid.vendor_name}
                          </td>

                          {/* Email */}
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {bid.vendor_email || "—"}
                          </td>

                          {/* Bid Amount */}
                          <td className="px-3 py-6 text-center text-[14px] font-bold text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {formatCurrency(bid.bid_amount)}
                          </td>

                          {/* Timeline */}
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {bid.timeline || "—"}
                          </td>

                          {/* Team Size */}
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {bid.team_size > 0 ? bid.team_size : "—"}
                          </td>

                          {/* Bid Date */}
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {formatDate(bid.created_at)}
                          </td>

                          {/* Rank */}
                          <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                            <span
                              className={`inline-flex px-3 py-2 rounded-md text-[14px] font-bold font-gantari ${getRankBg(bid.rank, bid.status)}`}
                            >
                              {isRejected ? "Rejected" : rankLabel(bid.rank)}
                            </span>
                          </td>

                          {/* View Vendor → redirects to /td/partner/:id */}
                          <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                            <button
                              onClick={() => handleViewVendor(bid)}
                              disabled={viewBusy}
                              className="flex items-center justify-center gap-1.5 mx-auto px-4 py-2 rounded-md text-[14px] font-bold bg-[#DD4342] text-white shadow-sm shadow-red-100 transition-all font-gantari disabled:opacity-60 cursor-pointer"
                              title="View vendor profile"
                            >
                              {viewBusy ? (
                                <span className="animate-spin w-2 h-2 border-b-2 border-white rounded-full inline-block" />
                              ) : (
                                <img
                                  src={viewIcon}
                                  alt=""
                                  className="w-4 h-4 object-contain"
                                />
                              )}
                              View
                            </button>
                          </td>

                          {/* Action */}
                          <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                            {bid.status === "shortlisted" ? (
                              <span className="inline-flex px-4 py-2 rounded-md text-[14px] font-bold font-gantari bg-[#E6F4EA] text-[#1E7E34]">
                                Accepted
                              </span>
                            ) : bid.status === "lost" ? (
                              <span className="inline-flex px-4 py-2 rounded-md text-[14px] font-bold font-gantari bg-[#FCE8E8] text-[#D93025]">
                                Rejected
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                {/* Accept — icon only circle */}
                                <button
                                  disabled={busy}
                                  onClick={() => handleAccept(bid)}
                                  title="Accept bid"
                                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[#E6F4EA] text-[#1E7E34] transition-colors disabled:opacity-60 cursor-pointer"
                                >
                                  {busy ? (
                                    <span className="animate-spin w-3 h-3 border-b-2 border-current rounded-full inline-block" />
                                  ) : (
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
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
                                {/* Reject — icon only circle */}
                                <button
                                  disabled={busy}
                                  onClick={() => handleReject(bid)}
                                  title="Reject bid"
                                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FCE8E8] text-[#D93025] transition-colors disabled:opacity-60 cursor-pointer"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
