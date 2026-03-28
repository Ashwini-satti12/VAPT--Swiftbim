import { useEffect, useState } from "react";
import api from "../../lib/api";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";

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

type Bid = {
  id: number;
  opportunity_id: number;
  bid_amount: number;
  status: string;
  notes?: string;
  timeline?: string;
  team_size?: number;
  created_at: string;
  project_name?: string;
  outsource_budget?: number;
  bid_deadline?: string;
  currency?: string;
};

type BidFormState = {
  bid_amount: string;
  notes: string;
  timeline: string;
  team_size: string;
};

type ModuleTab = "opportunities" | "my-bids";
type OppTab = "all" | "active" | "bid" | "closed";
type ViewMode = "list" | "opportunity-detail" | "bid-detail";

// Helpers
function getTags(opp: Opportunity): string[] {
  const raw = (opp.technical_requirements || opp.description || "").replace(
    /<[^>]*>/g,
    " ",
  );
  const words = raw
    .split(/[\s,;/|]+/)
    .filter((w) => w.length >= 2 && w.length <= 20);
  return words.slice(0, 4);
}

const AVATAR_COLORS = [
  "#DE3D3A",
  "#3B82F6",
  "#E47E00",
  "#00882E",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F59E0B",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??"
  );
}

function formatBudget(amount: number) {
  if (!amount) return "—";
  if (amount >= 10000000) return `₹ ${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(1)} L`;
  if (amount >= 1000) return `₹ ${(amount / 1000).toFixed(0)}K`;
  return `₹ ${amount}`;
}

const daysUntil = (dateStr: string) => {
  if (!dateStr) return 0;
  const deadline = new Date(dateStr);
  return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

export default function BiddingV() {
  const [mainTab, setMainTab] = useState<ModuleTab>("opportunities");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(true);

  // Opportunities State
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppTab, setOppTab] = useState<OppTab>("all");
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);
  const [bidSuccess, setBidSuccess] = useState<number | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidForm, setBidForm] = useState<BidFormState>({
    bid_amount: "",
    notes: "",
    timeline: "",
    team_size: "",
  });

  // My Bids State
  const [bids, setBids] = useState<Bid[]>([]);
  const [detailBid, setDetailBid] = useState<Bid | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [showEntries, setShowEntries] = useState("show");
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [oppsRes, bidsRes] = await Promise.all([
          api.get<{ opportunities: Opportunity[] }>(
            "/api/vendors/opportunities",
          ),
          api.get<{ bids: Bid[] }>("/api/vendors/mybids"),
        ]);
        setOpportunities(oppsRes.data.opportunities ?? []);
        setBids(bidsRes.data.bids ?? []);
      } catch (err) {
        console.error("Failed to fetch bidding data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBidSubmit = async () => {
    if (!selectedOpp || !bidForm.bid_amount) {
      setBidError("Bid amount is required.");
      return;
    }
    setBidSubmitting(true);
    setBidError(null);
    try {
      await api.post(`/api/vendors/opportunities/${selectedOpp.id}/bid`, {
        bid_amount: Number(bidForm.bid_amount),
        notes: bidForm.notes,
        timeline: bidForm.timeline,
        team_size: Number(bidForm.team_size) || 0,
      });
      setBidSuccess(selectedOpp.id);
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === selectedOpp.id ? { ...o, already_bid: true } : o,
        ),
      );

      // Refresh bids list
      const { data } = await api.get<{ bids: Bid[] }>("/api/vendors/mybids");
      setBids(data.bids ?? []);

      setSelectedOpp(null);
      setViewMode("list");
      setBidForm({ bid_amount: "", notes: "", timeline: "", team_size: "" });
    } catch {
      setBidError("Failed to submit bid. Please try again.");
    } finally {
      setBidSubmitting(false);
    }
  };

  // Filtering logic
  const filteredOpps = opportunities.filter((opp) => {
    if (oppTab === "active" && opp.status !== "active") return false;
    if (oppTab === "bid" && !opp.already_bid) return false;
    if (oppTab === "closed" && opp.status === "active") return false;
    return true;
  });

  const filteredBids = (() => {
    if (showEntries === "show" || showEntries === "all") return bids;
    const [start, end] = showEntries.split("-").map(Number);
    return bids.slice(start - 1, end);
  })();

  // Stats
  const totalOpps = opportunities.length;
  const activeOpps = opportunities.filter((o) => o.status === "active").length;
  const bidSubmittedOpps = opportunities.filter((o) => o.already_bid).length;
  const closedOpps = opportunities.filter((o) => o.status !== "active").length;

  const kpiCards = [
    { label: "Total Opportunities", value: totalOpps, pct: 100 },
    {
      label: "Active Opportunities",
      value: activeOpps,
      pct: totalOpps ? Math.round((activeOpps / totalOpps) * 100) : 0,
    },
    {
      label: "Bids Submitted",
      value: bidSubmittedOpps,
      pct: totalOpps ? Math.round((bidSubmittedOpps / totalOpps) * 100) : 0,
    },
    {
      label: "Closed",
      value: closedOpps,
      pct: totalOpps ? Math.round((closedOpps / totalOpps) * 100) : 0,
    },
  ];

  const getStatusLabel = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "submitted") return "Submitted";
    if (s === "shortlisted") return "Shortlisted";
    if (s === "won") return "Won";
    if (s === "lost") return "Lost";
    if (s === "removed") return "Removed";
    return status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "submitted") return "bg-[#EAF0FB] text-[#1967D2]";
    if (s === "shortlisted") return "bg-[#E6F4EA] text-[#1E7E34]";
    if (s === "won") return "bg-[#E6F4EA] text-[#1E7E34]";
    if (s === "lost" || s === "removed") return "bg-[#FFF1F2] text-[#BE123C]";
    return "bg-[#F2F2F2] text-[#616161]";
  };

  const openOppDetail = (opp: Opportunity) => {
    setDetailOpp(opp);
    setViewMode("opportunity-detail");
    window.scrollTo(0, 0);
  };

  const openBidDetail = (bid: Bid) => {
    setDetailBid(bid);
    setViewMode("bid-detail");
    window.scrollTo(0, 0);
  };

  const closeDetail = () => {
    setDetailOpp(null);
    setDetailBid(null);
    setViewMode("list");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DE3D3A]" />
      </div>
    );
  }

  if (viewMode === "opportunity-detail" && detailOpp) {
    return (
      <div className="h-full flex flex-col font-gantari animate-in fade-in duration-300">
        <div className="flex items-center gap-4 mb-8 shrink-0">
          <button
            onClick={closeDetail}
            className="p-2 border-none bg-[#F2F2F2] rounded-md transition-opacity"
          >
            <img src={backIcon} alt="back" className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-[24px] font-medium text-[#000000] font-gantari">
              {detailOpp.project_name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2.5 py-1 rounded-md text-[12px] font-medium font-gantari ${detailOpp.status === "active" ? "bg-[#E8F9E8] text-[#16A34A]" : "bg-[#FFE5E5] text-[#DE3D3A]"}`}
              >
                {detailOpp.status === "active"
                  ? "● Open for Bidding"
                  : "● Closed"}
              </span>
              {/* <span className="text-[#AEACAC] text-[13px] font-medium font-gantari">Project ID: #{detailOpp.id}</span> */}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Highlights Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Overview Card */}
              <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-2 font-gantari">
                  Project Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari">
                      Bidding Budget
                    </span>
                    <span className="text-[18px] font-bold text-[#DE3D3A] font-gantari">
                      {formatBudget(
                        detailOpp.budget_ceiling || detailOpp.outsource_budget,
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari">
                      Submission Deadline
                    </span>
                    <span className="text-[14px] font-medium text-[#353535] font-gantari">
                      {detailOpp.bid_deadline
                        ? new Date(detailOpp.bid_deadline).toLocaleDateString(
                            "en-GB",
                            { day: "2-digit", month: "long", year: "numeric" },
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari">
                      Competition Level
                    </span>
                    <span className="text-[14px] font-medium text-[#353535] font-gantari">
                      {detailOpp.bids_count ?? 0} Bids Submitted
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-2 font-gantari">
                  Description
                </h3>
                <div className="text-[#8B8B8B] leading-relaxed whitespace-pre-wrap text-[14px] font-gantari">
                  {detailOpp.description ||
                    "No detailed description available for this project."}
                </div>
              </div>

              {/* Technical Requirements Section */}
              <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-2 font-gantari">
                  Technical Requirements
                </h3>
                <div className="text-[#8B8B8B] leading-relaxed whitespace-pre-wrap text-[14px] font-gantari">
                  {detailOpp.technical_requirements ||
                    "Technical requirements have not been specified yet."}
                </div>
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
              {/* Submission Status Card */}
              <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-2 font-gantari">
                  Submission Status
                </h3>
                {detailOpp.already_bid || bidSuccess === detailOpp.id ? (
                  <div className="bg-[#EAFDF5] border border-[#16A34A]/20 rounded-xl p-4 mb-4 text-[#16A34A]">
                    <div className="flex items-center gap-2 font-bold text-[14px] mb-1 font-gantari">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Bid Submitted
                    </div>
                    <p className="text-[12px] text-[#16A34A]/80 italic font-gantari">
                      Your proposal is currently under review by the host
                      organization.
                    </p>
                  </div>
                ) : detailOpp.status === "active" ? (
                  <div className="space-y-4">
                    <p className="text-[14px] text-[#8B8B8B] font-gantari">
                      Submit your technical proposal and commercial bid to
                      participate in this opportunity.
                    </p>
                    <button
                      onClick={() => setSelectedOpp(detailOpp)}
                      className="w-full py-3 bg-[#DD4342] text-white rounded-md font-medium transition-all font-gantari text-[14px]"
                    >
                      Submit Your Bid
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#F9F9F9] border border-[#EBEBEB] rounded-xl p-4 text-center">
                    <p className="text-[12px] font-bold text-[#AEACAC] uppercase tracking-widest font-gantari">
                      Bidding Closed
                    </p>
                  </div>
                )}
              </div>

              {/* Tags Card */}
              <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-2 font-gantari">
                  Area of Expertise
                </h3>
                <div className="flex flex-wrap gap-2">
                  {getTags(detailOpp).map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-[#F2F2F2] text-[#353535] text-[14px] font-bold rounded-lg uppercase tracking-wide font-gantari"
                    >
                      {tag}
                    </span>
                  ))}
                  {getTags(detailOpp).length === 0 && (
                    <span className="text-[#8B8B8B] text-[14px] font-gantari">
                      No specific tags identified.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "bid-detail" && detailBid) {
    return (
      <div className="h-full flex flex-col font-gantari animate-in fade-in duration-300">
        <div className="flex items-center gap-4 mb-8 shrink-0">
          <button
            onClick={closeDetail}
            className="p-2 border-none bg-[#F2F2F2] rounded-md transition-opacity"
          >
            <img src={backIcon} alt="back" className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-[24px] font-medium text-[#000000] font-gantari">
              {detailBid.project_name || `Bid Submission #${detailBid.id}`}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2.5 py-1 rounded-full text-[12px] font-medium font-gantari ${getStatusBadge(detailBid.status)}`}
              >
                {getStatusLabel(detailBid.status)}
              </span>
              {/* <span className="text-[#AEACAC] text-[13px] font-medium font-gantari">Opportunity ID: #{detailBid.opportunity_id}</span> */}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Comparison Data */}
              <div className="bg-white border border-[#EBEBEB] rounded-md p-6 shadow-sm">
                <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-3 font-gantari">
                  Financial Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1 p-4 bg-[#F8F8F8] rounded-md">
                    <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari uppercase tracking-wider">
                      Your Submitted Bid
                    </span>
                    <span className="text-[24px] font-bold text-[#DE3D3A] font-gantari">
                      {formatBudget(detailBid.bid_amount)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-4 border-[1.5px] border-[#F2F2F2] rounded-md">
                    <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari uppercase tracking-wider">
                      Project Budget Ceiling
                    </span>
                    <span className="text-[24px] font-bold text-[#353535] font-gantari">
                      {formatBudget(detailBid.outsource_budget || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Proposal Details */}
              <div className="bg-white border border-[#EBEBEB] rounded-md p-6 shadow-sm">
                <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-3 font-gantari">
                  Submission Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari">
                      Proposed Timeline
                    </span>
                    <span className="text-[14px] font-medium text-[#353535] font-gantari">
                      {detailBid.timeline || "Not specified"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari">
                      Allocated Team Size
                    </span>
                    <span className="text-[14px] font-medium text-[#353535] font-gantari">
                      {detailBid.team_size
                        ? `${detailBid.team_size} Members`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari">
                      Original Bid Deadline
                    </span>
                    <span className="text-[14px] font-medium text-[#353535] font-gantari">
                      {detailBid.bid_deadline
                        ? new Date(detailBid.bid_deadline).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari">
                      Submission Timestamp
                    </span>
                    <span className="text-[14px] font-medium text-[#353535] font-gantari">
                      {detailBid.created_at
                        ? new Date(detailBid.created_at).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari uppercase tracking-wider">
                    Proposal Notes / Approach
                  </span>
                  <div className="text-[#353535] leading-relaxed whitespace-pre-wrap bg-[#F9F9F9] p-4 rounded-md border border-[#F0F0F0] text-[14px] font-gantari">
                    {detailBid.notes ||
                      "No accompanying notes provided with this bid."}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Sidebar */}
            <div className="space-y-6">
              <div className="bg-white border border-[#EBEBEB] rounded-md p-6 shadow-sm">
                <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-3 font-gantari">
                  Decision Status
                </h3>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${getStatusBadge(detailBid.status)}`}
                  >
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-[20px] font-bold text-[#353535] font-gantari">
                    {getStatusLabel(detailBid.status)}
                  </h4>
                  <p className="text-[14px] text-[#8B8B8B] mt-2 leading-relaxed font-gantari">
                    {detailBid.status === "won"
                      ? "Congratulations! Your bid was accepted. Await project kickoff instructions."
                      : detailBid.status === "lost"
                        ? "Thank you for participating. Better luck next time."
                        : "Your proposal is still under consideration. You will receive an update shortly."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-gantari bg-white p-2 overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0 px-2">
        <h2 className="text-[24px] font-medium text-[#000000]">
          {mainTab === "opportunities" ? "Bidding Console" : "My Submissions"}
        </h2>

        <div className="flex items-center gap-3">
          {/* Bid Status Filter moved to right side */}
          {mainTab === "opportunities" && (
            <div className="relative">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className={`flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-medium transition-colors ${oppTab !== "all" ? "text-[#353535]" : "text-[#8B8B8B]"}`}
              >
                <span>
                  Bid Status{oppTab !== "all" ? `: ` : ""}
                  <span className="font-semibold">
                    {oppTab !== "all"
                      ? oppTab === "active"
                        ? "Active"
                        : oppTab === "bid"
                          ? "Bid Submitted"
                          : "Closed"
                      : ""}
                  </span>
                </span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {statusDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setStatusDropdownOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-[#E5E5E5] rounded-xl shadow-xl z-20 py-0 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    {[
                      { key: "all" as const, label: "All Opportunities" },
                      { key: "active" as const, label: "Active" },
                      { key: "bid" as const, label: "Bid Submitted" },
                      { key: "closed" as const, label: "Closed" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setOppTab(tab.key);
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-[14px] transition-all font-gantari text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535] ${oppTab === tab.key ? "font-bold" : "font-medium"}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {mainTab === "my-bids" && (
            <div className="relative">
              <button
                onClick={() => setShowDropdownOpen(!showDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-medium transition-all cursor-pointer border-0 font-gantari"
              >
                {showEntries === "show" ? (
                  <span className="text-sm font-medium text-[#616161]">
                    Show
                  </span>
                ) : (
                  <span className="text-sm font-medium text-[#353535]">
                    Show: {showEntries === "1-500" ? "All" : showEntries}
                  </span>
                )}
                <img
                  src={ArrowDown}
                  alt="arrow"
                  className={`ml-2 w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${showDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {showDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDropdownOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-0 max-h-[160px] overflow-y-auto custom-scrollbar">
                    <div className="bg-[#F2F2F2] text-[#353535] font-semibold px-4 py-2 sticky top-0 z-10 font-gantari text-sm">
                      Show
                    </div>
                    {[
                      { label: "1-50", val: "1-50" },
                      { label: "51-100", val: "51-100" },
                      { label: "101-150", val: "101-150" },
                      { label: "151-200", val: "151-200" },
                      { label: "201-250", val: "201-250" },
                      { label: "All", val: "all" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        onClick={() => {
                          setShowEntries(opt.val);
                          setShowDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-medium font-gantari transition-colors cursor-pointer text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2] bg-transparent"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex bg-[#E8E8E8] p-1 rounded-md">
            <button
              onClick={() => {
                setMainTab("opportunities");
                setViewMode("list");
              }}
              className={`px-4 py-1 rounded-md text-[14px] font-medium transition-all ${mainTab === "opportunities" ? "bg-white text-[#DE3D3A] shadow-sm" : "text-[#717171] hover:text-[#353535]"}`}
            >
              Opportunities
            </button>
            <button
              onClick={() => {
                setMainTab("my-bids");
                setViewMode("list");
              }}
              className={`px-4 py-1 rounded-md text-[14px] font-medium transition-all ${mainTab === "my-bids" ? "bg-white text-[#DE3D3A] shadow-sm" : "text-[#717171] hover:text-[#353535]"}`}
            >
              My Submissions
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards (Visible only for Opportunities) ── */}
      {mainTab === "opportunities" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 shrink-0">
          {kpiCards.map((card, i) => (
            <div
              key={i}
              className="bg-[#F2F2F2] group hover:bg-[#DD4342] rounded-md border border-[#AEACAC52] px-4 py-4 shadow-sm flex items-center justify-between min-h-0 transition-colors"
            >
              <h3 className="text-[18px] text-[#353535] group-hover:text-[#F2F2F2] font-medium font-gantari">
                {card.label}
              </h3>
              <p className="text-[20px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {mainTab === "opportunities" ? (
        /* OPPORTUNITIES VIEW */
        <div className="flex-1 flex flex-col min-h-0">
          {bidSuccess !== null && (
            <div className="mb-4 p-4 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl flex items-center gap-3 shrink-0">
              <span className="text-xl">✅</span>
              <p className="font-medium text-[#14532D] text-sm">
                Your bid has been submitted successfully!
              </p>
              <button
                onClick={() => setBidSuccess(null)}
                className="ml-auto text-[#14532D] hover:text-[#166534]"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {filteredOpps.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center text-slate-500 border border-[#EBEBEB]">
                <p className="text-lg font-semibold mb-2">
                  No opportunities found
                </p>
                <p className="text-sm">
                  New bidding opportunities will appear here when available.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                {filteredOpps.map((opp) => {
                  const days = daysUntil(opp.bid_deadline);
                  const isActive = opp.status === "active";
                  const tags = getTags(opp);
                  const name = opp.project_name || "Unnamed Project";
                  const avatarBg = getAvatarColor(name);
                  const initials = getInitials(name);
                  const alreadyBid = opp.already_bid || bidSuccess === opp.id;

                  return (
                    <div
                      key={opp.id}
                      className="bg-white border border-[#EBEBEB] rounded-xl p-5 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-3 min-h-[50px]">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-[15px] font-bold shrink-0 bg-[#F2F2F2]"
                          style={{ color: avatarBg }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[18px] font-medium text-[#353535] truncate leading-tight">
                            {name}
                          </p>
                          {opp.host_name && (
                            <p className="text-[12px] text-[#717171] truncate">
                              {opp.host_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[14px] text-[#717171] mb-2">
                        <div className="flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {opp.bid_deadline
                            ? `${new Date(opp.bid_deadline).toLocaleDateString("en-GB")} · ${days > 0 ? `${days}d left` : "Ended"}`
                            : "No deadline"}
                        </div>
                        <span
                          className={`shrink-0 text-[14px] font-medium px-2 py-0.5 rounded-md ${isActive ? "bg-[#E8F9E8] text-[#16A34A]" : "bg-[#FFE5E5] text-[#DE3D3A]"}`}
                        >
                          ● {isActive ? "Reg. Open" : "Reg. Closed"}
                        </span>
                      </div>

                      <div className="flex-1" />

                      <div className="border-t border-[#F0F0F0] pt-3 mb-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[18px] font-bold text-[#353535]">
                            {formatBudget(
                              opp.budget_ceiling || opp.outsource_budget,
                            )}
                          </p>
                          {opp.bids_count !== undefined && (
                            <span className="text-[11px] text-[#AEACAC]">
                              {opp.bids_count} bids
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {alreadyBid ? (
                            <span className="text-[14px] text-[#16A34A] font-medium flex items-center gap-1.5">
                              <svg
                                className="w-3.5 h-3.5"
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
                              </svg>{" "}
                              Bid Submitted
                            </span>
                          ) : isActive ? (
                            <button
                              onClick={() => setSelectedOpp(opp)}
                              className="text-[14px] font-medium text-white bg-[#DE3D3A] px-5 py-2 rounded-lg hover:bg-[#c93d3d] transition-colors shadow-sm"
                            >
                              Submit Bid
                            </button>
                          ) : (
                            <span className="text-[14px] text-[#DE3D3A] font-medium">
                              Closed
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => openOppDetail(opp)}
                          className="text-[14px] font-medium text-[#717171] hover:text-[#353535] flex items-center gap-1.5 transition-colors group"
                        >
                          Details
                          <svg
                            className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M7 17L17 7M17 7H9M17 7V15"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MY BIDS VIEW */
        <div className="flex-1 flex flex-col min-h-0 font-gantari pt-2">
          <div className="bg-white rounded-md border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-[300px]">
            <div className="overflow-x-hidden overflow-y-auto custom-scrollbar flex-1">
              {filteredBids.length === 0 ? (
                <div className="py-20 text-center text-[#616161]">
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
                    No bids submitted yet
                  </p>
                  <p className="text-sm">
                    Visit the Opportunities tab to find projects.
                  </p>
                </div>
              ) : (
                <table className="min-w-full border-collapse font-gantari">
                  <thead className="sticky top-0 z-10 bg-white after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1.5px] after:bg-[rgb(89,89,89)]/10">
                    <tr className="">
                      <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                        Sl.No
                      </th>
                      <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                        Project Name
                      </th>
                      <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                        Bid Amount
                      </th>
                      <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                        Outsource Budget
                      </th>
                      <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                        Submitted On
                      </th>
                      <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-4 py-4 text-center text-[16px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredBids.map((bid, idx) => (
                      <tr
                        key={bid.id}
                        className={`${idx % 2 === 1 ? "bg-[#F2F2F2]" : "bg-white"}`}
                      >
                        <td className="px-4 py-6 text-center text-[14px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-6 text-center">
                          <p className="text-[14px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                            {bid.project_name ||
                              `Opportunity #${bid.opportunity_id}`}
                          </p>
                        </td>
                        <td className="px-4 py-6 text-center text-[14px] font-medium text-[#DE3D3A] font-gantari whitespace-nowrap">
                          {formatBudget(bid.bid_amount)}
                        </td>
                        <td className="px-4 py-6 text-center text-[14px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                          {formatBudget(bid.outsource_budget || 0)}
                        </td>
                        <td className="px-4 py-6 text-center text-[14px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                          {bid.created_at
                            ? new Date(bid.created_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-6 text-center">
                          <span
                            className={`px-3 py-1 rounded-lg text-[14px] font-medium font-gantari ${getStatusBadge(bid.status)} whitespace-nowrap`}
                          >
                            {getStatusLabel(bid.status)}
                          </span>
                        </td>
                        <td className="px-4 py-6 text-center">
                          <div className="flex justify-center">
                            <button
                              onClick={() => openBidDetail(bid)}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#DE3D3A] text-white rounded-md hover:bg-[#c93d3d] transition-all font-medium font-gantari text-[14px] whitespace-nowrap"
                            >
                              <img
                                src={viewIcon}
                                alt="view"
                                className="w-4 h-4 brightness-0 invert"
                              />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SUBMISSION MODAL (Always needs a modal for UX) ── */}
      {selectedOpp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#12141D]">Submit Bid</h3>
              <button
                onClick={() => setSelectedOpp(null)}
                className="text-slate-500 hover:text-[#DE3D3A] text-2xl"
              >
                &times;
              </button>
            </div>
            <p className="text-sm font-medium text-[#353535] mb-6 bg-[#F8F8F8] p-4 rounded-xl border border-gray-100">
              Project:{" "}
              <span className="font-bold">{selectedOpp.project_name}</span>
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-[#353535] mb-1">
                  Bid Amount (INR) <span className="text-[#DE3D3A]">*</span>
                </label>
                <input
                  type="number"
                  value={bidForm.bid_amount}
                  onChange={(e) =>
                    setBidForm((f) => ({ ...f, bid_amount: e.target.value }))
                  }
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#DE3D3A]/20 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#353535] mb-1">
                    Timeline
                  </label>
                  <input
                    type="text"
                    value={bidForm.timeline}
                    onChange={(e) =>
                      setBidForm((f) => ({ ...f, timeline: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#DE3D3A]/20 outline-none"
                    placeholder="e.g. 2 months"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#353535] mb-1">
                    Team Size
                  </label>
                  <input
                    type="number"
                    value={bidForm.team_size}
                    onChange={(e) =>
                      setBidForm((f) => ({ ...f, team_size: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#DE3D3A]/20 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#353535] mb-1">
                  Proposal Notes
                </label>
                <textarea
                  value={bidForm.notes}
                  onChange={(e) =>
                    setBidForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#DE3D3A]/20 outline-none resize-none"
                  placeholder="Highlight your expertise..."
                />
              </div>
              {bidError && (
                <div className="p-3 bg-[#FFE5E5] rounded-lg text-xs text-[#DE3D3A] font-bold">
                  {bidError}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setSelectedOpp(null)}
                className="flex-1 py-3 bg-[#F2F2F2] text-[#353535] rounded-lg font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBidSubmit}
                disabled={bidSubmitting}
                className="flex-1 py-3 bg-[#DE3D3A] text-white rounded-lg font-bold hover:bg-[#c93d3d] transition-all disabled:opacity-50"
              >
                {bidSubmitting ? "Processing..." : "Submit Bid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
