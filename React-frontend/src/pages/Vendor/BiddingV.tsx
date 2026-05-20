import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import { BiddingSubmitModal } from "./BiddingSubmitModal";

type Opportunity = {
  id: number;
  project_id?: number;
  service_id?: number;
  project_name: string;
  outsource_budget?: number | string;
  budget_ceiling?: number | string;
  bid_deadline: string;
  status: string;
  description?: string;
  scope_of_work?: string | null;
  technical_requirements?: string;
  software_to_be_used?: string | null;
  technologies_used?: string | null;
  project_location?: string | null;
  project_due_date?: string | null;
  project_priority?: string | null;
  bids_count?: number;
  host_name?: string;
  currency?: string;
  already_bid?: boolean;
  project_sector?: string | null;
  bim_services_required?: string | null;
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
  // outsource_budget?: number;
  bid_deadline?: string;
  currency?: string;
  project_due_date?: string | null;
  outsource_budget?: number | string;
};

type BidFormState = {
  bid_amount: string;
  currency: string;
  notes: string;
  timeline: string;
  team_size: string;
};

const EMPTY_BID_FORM: BidFormState = {
  bid_amount: "",
  currency: "AED",
  notes: "",
  timeline: "",
  team_size: "",
};

type ModuleTab = "opportunities" | "my-bids";
type OppTab = "all" | "active" | "bid" | "closed";
type ViewMode =
  | "list"
  | "opportunity-detail"
  | "bid-detail"
  | "submit-bid";
type SubmitBidReturnView = "list" | "opportunity-detail";

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

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "AED", symbol: "DH", label: "UAE Dirham" },
  { code: "SAR", symbol: "SR", label: "Saudi Riyal" },
  { code: "QAR", symbol: "QR", label: "Qatari Riyal" },
  { code: "OMR", symbol: "RO", label: "Omani Rial" },
  { code: "BHD", symbol: "BD", label: "Bahraini Dinar" },
  { code: "KWD", symbol: "KD", label: "Kuwaiti Dinar" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "CNY", symbol: "¥", label: "Chinese Yuan" },
  { code: "MYR", symbol: "RM", label: "Malaysian Ringgit" },
  { code: "THB", symbol: "฿", label: "Thai Baht" },
  { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah" },
];

const FX_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 83,
  EUR: 90,
  GBP: 105,
  AED: 22.6,
  SAR: 22.1,
  QAR: 22.8,
  OMR: 215,
  BHD: 220,
  KWD: 270,
  SGD: 61.5,
  AUD: 54,
  CAD: 60,
  JPY: 0.56,
  CNY: 11.5,
  MYR: 17.8,
  THB: 2.3,
  IDR: 0.0052,
};

function normalizeCurrency(code?: string): string {
  const c = String(code || "AED").trim().toUpperCase();
  return FX_TO_INR[c] ? c : "AED";
}

function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): number {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  const inInr = amount * FX_TO_INR[from];
  return Number((inInr / FX_TO_INR[to]).toFixed(2));
}

function formatBudget(amount: number, currencyCode: string = "AED") {
  if (!amount) return "—";

  if (currencyCode === "INR") {
    if (amount >= 10000000) {
      const val = amount / 10000000;
      return `${val % 1 === 0 ? val : val.toFixed(1)} Cr INR`;
    }
    if (amount >= 100000) {
      const val = amount / 100000;
      return `${val % 1 === 0 ? val : val.toFixed(1)} L INR`;
    }
    return `${amount.toLocaleString("en-IN")} INR`;
  }

  const code = currencyCode;

  if (amount >= 1000000) {
    const val = amount / 1000000;
    return `${val % 1 === 0 ? val : val.toFixed(1)}M ${code}`;
  }
  if (amount >= 10000) {
    const val = amount / 1000;
    return `${val % 1 === 0 ? val : val.toFixed(1)}K ${code}`;
  }

  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${code}`;
}

/** Budget from API (number or string with commas / ₹). */
function parseBudgetNumeric(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  const s = String(raw)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseBidAmountInput(raw: string): number | null {
  const s = String(raw)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Max bid: minimum of positive outsource_budget and budget_ceiling (matches backend). */
function maxBidAmountForOpportunity(opp: Opportunity): number | null {
  const caps: number[] = [];
  const c = parseBudgetNumeric(opp.budget_ceiling);
  const o = parseBudgetNumeric(opp.outsource_budget);
  if (c != null) caps.push(c);
  if (o != null) caps.push(o);
  if (!caps.length) return null;
  return Math.min(...caps);
}

function bidTooHighMessage(maxVal: number, currency: string = "AED"): string {
  return `Your bid amount is too high. It cannot exceed ${formatBudget(maxVal, currency)} for this opportunity.`;
}

function extractApiErrorMessage(err: unknown): string | null {
  const res =
    err && typeof err === "object" && "response" in err
      ? (err as { response?: { status?: number; data?: unknown } }).response
      : undefined;
  const data = res?.data;
  if (
    data &&
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof (data as { message: unknown }).message === "string"
  ) {
    return (data as { message: string }).message;
  }
  return null;
}

function isBidAmountFieldError(message: string, status?: number): boolean {
  const m = message.toLowerCase();
  if (status === 400 && m.includes("invalid bid")) return true;
  if (status === 400 && (m.includes("bid") || m.includes("exceed")))
    return true;
  return (
    m.includes("too high") || m.includes("exceed") || m.includes("maximum")
  );
}

const daysUntil = (dateStr: string) => {
  if (!dateStr) return 0;
  const deadline = new Date(dateStr);
  return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const SCROLLBAR_STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #979797;
    border-radius: 10px;
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #979797 transparent;
  }
  .hide-scrollbar-x::-webkit-scrollbar:horizontal {
    display: none;
  }
  .hide-scrollbar-x {
    -ms-overflow-style: none;
  }
`;

export default function BiddingV() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || "";
  const [mainTab, setMainTab] = useState<ModuleTab>("opportunities");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [submitBidReturnView, setSubmitBidReturnView] =
    useState<SubmitBidReturnView>("list");
  const [loading, setLoading] = useState(true);

  // Opportunities State
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppTab, setOppTab] = useState<OppTab>("all");
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidAmountError, setBidAmountError] = useState<string | null>(null);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidForm, setBidForm] = useState<BidFormState>({ ...EMPTY_BID_FORM });

  // My Bids State
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidStatusFilter, setBidStatusFilter] = useState<string>("all");
  const [detailBid, setDetailBid] = useState<Bid | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [showEntries, setShowEntries] = useState("show");
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  const knownOppIdsRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => { document.head.removeChild(styleTag); };
  }, []);

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

  /** Refresh opportunities in the background so new listings can surface + toast. */
  useEffect(() => {
    const intervalMs = 120_000;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const { data } = await api.get<{ opportunities: Opportunity[] }>(
            "/api/vendors/opportunities",
          );
          setOpportunities(data.opportunities ?? []);
        } catch {
          /* ignore */
        }
      })();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;
    const list = opportunities;
    if (list.length === 0) {
      knownOppIdsRef.current = new Set();
      return;
    }
    const nextIds = new Set(list.map((o) => o.id));
    if (knownOppIdsRef.current === null) {
      knownOppIdsRef.current = nextIds;
      return;
    }
    const prev = knownOppIdsRef.current;
    const newlyAdded = list.filter((o) => !prev.has(o.id));
    knownOppIdsRef.current = nextIds;
    if (newlyAdded.length === 0) return;
    newlyAdded.sort((a, b) => b.id - a.id);
    const label =
      newlyAdded.length === 1
        ? newlyAdded[0].project_name || "New opportunity"
        : `${newlyAdded.length} new opportunities`;
    toast.success(`New bidding opportunity: ${label}`, { duration: 5500 });
  }, [opportunities, loading]);

  useEffect(() => {
    const tab = (searchParams.get("tab") || "").toLowerCase();
    const oppStatus = (searchParams.get("oppStatus") || "").toLowerCase();
    const bidStatus = (searchParams.get("bidStatus") || "").toLowerCase();

    if (tab === "my-bids" || tab === "mybids") setMainTab("my-bids");
    else setMainTab("opportunities");

    if (
      oppStatus === "active" ||
      oppStatus === "all" ||
      oppStatus === "bid" ||
      oppStatus === "closed"
    ) {
      setOppTab(oppStatus as OppTab);
    } else {
      setOppTab("all");
    }

    setBidStatusFilter(
      bidStatus &&
        ["submitted", "shortlisted", "won", "lost", "removed"].includes(
          bidStatus,
        )
        ? bidStatus
        : "all",
    );
  }, [searchParams]);

  const enrichOpportunityById = async (id: number) => {
    try {
      const { data } = await api.get<{ opportunity: Opportunity }>(
        `/api/vendors/opportunities/${id}`,
      );
      const full = data.opportunity;
      if (!full) return;
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...full } : o)),
      );
      setDetailOpp((d) => (d && d.id === id ? { ...d, ...full } : d));
      setSelectedOpp((s) => (s && s.id === id ? { ...s, ...full } : s));
    } catch (err) {
      console.error("Failed to load opportunity details", err);
    }
  };

  const closeSubmitBidModal = () => {
    setBidSubmitting(false);
    setBidError(null);
    setBidAmountError(null);
    setBidForm({ ...EMPTY_BID_FORM });
    setCurrencyDropdownOpen(false);
    setViewMode((vm) =>
      vm === "submit-bid" ? submitBidReturnView : vm,
    );
    setSelectedOpp(null);
  };

  const openSubmitBidModal = (
    opp: Opportunity,
    returnTo: SubmitBidReturnView,
  ) => {
    setSubmitBidReturnView(returnTo);
    setBidError(null);
    setBidAmountError(null);
    setBidForm({
      ...EMPTY_BID_FORM,
      currency: opp.currency || "AED",
      bid_amount: ""
    });
    setSelectedOpp(opp);
    void enrichOpportunityById(opp.id);
    setViewMode("submit-bid");
  };

  const handleBidSubmit = async () => {
    if (!selectedOpp) return;
    if (!String(bidForm.bid_amount).trim()) {
      setBidError(null);
      setBidAmountError("Bid amount is required.");
      return;
    }
    const amount = parseBidAmountInput(bidForm.bid_amount);
    if (amount == null || amount <= 0) {
      setBidError(null);
      setBidAmountError("Enter a valid bid amount greater than zero.");
      return;
    }
    const maxBid = maxBidAmountForOpportunity(selectedOpp);
    const oppCurrency = normalizeCurrency(selectedOpp.currency || "AED");
    const enteredCurrency = normalizeCurrency(bidForm.currency);
    const enteredInOppCurrency = convertCurrency(
      amount,
      enteredCurrency,
      oppCurrency,
    );
    if (maxBid != null && enteredInOppCurrency > maxBid) {
      setBidError(null);
      const maxInEntered = convertCurrency(maxBid, oppCurrency, enteredCurrency);
      setBidAmountError(bidTooHighMessage(maxInEntered, enteredCurrency));
      return;
    }
    setBidSubmitting(true);
    setBidError(null);
    setBidAmountError(null);
    try {
      await api.post(`/api/vendors/opportunities/${selectedOpp.id}/bid`, {
        bid_amount: amount,
        selected_currency: bidForm.currency,
        notes: bidForm.notes,
        timeline: bidForm.timeline,
        team_size: Number(bidForm.team_size) || 0,
      });
      toast.success("Your bid has been submitted successfully!");
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === selectedOpp.id ? { ...o, already_bid: true } : o,
        ),
      );
      setDetailOpp((d) =>
        d && d.id === selectedOpp.id ? { ...d, already_bid: true } : d,
      );

      // Refresh bids list
      const { data } = await api.get<{ bids: Bid[] }>("/api/vendors/mybids");
      setBids(data.bids ?? []);

      closeSubmitBidModal();
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response
          : undefined;
      const apiMessage = extractApiErrorMessage(err);
      const fallback = "Failed to submit bid. Please try again.";
      if (apiMessage && isBidAmountFieldError(apiMessage, res?.status)) {
        setBidAmountError(apiMessage);
        setBidError(null);
      } else {
        setBidAmountError(null);
        setBidError(apiMessage || fallback);
      }
    } finally {
      setBidSubmitting(false);
    }
  };

  // Filtering logic — newest opportunities first (higher id), same API data
  const filteredOpps = opportunities
    .filter((opp) => {
      if (searchQuery) {
        if (!(
          (opp.project_name || "").toLowerCase().includes(searchQuery) ||
          (opp.host_name || "").toLowerCase().includes(searchQuery) ||
          (opp.project_location || "").toLowerCase().includes(searchQuery) ||
          (opp.status || "").toLowerCase().includes(searchQuery)
        )) {
          return false;
        }
      }
      if (oppTab === "active" && opp.status !== "active") return false;
      if (oppTab === "bid" && !opp.already_bid) return false;
      if (oppTab === "closed" && opp.status === "active") return false;
      return true;
    })
    .sort((a, b) => b.id - a.id);

  const filteredBids = (() => {
    let out = bids;
    if (searchQuery) {
      out = out.filter(b =>
        (b.project_name || "").toLowerCase().includes(searchQuery) ||
        (b.status || "").toLowerCase().includes(searchQuery)
      );
    }
    if (bidStatusFilter !== "all") {
      out = out.filter(
        (b) => (b.status || "").toLowerCase() === bidStatusFilter,
      );
    }
    return out;
  })();

  const effectiveShowEntries = showEntries === "show" ? "1-50" : showEntries;
  const selectedShowRange =
    effectiveShowEntries === "all"
      ? { start: 0, end: filteredBids.length }
      : (() => {
        const [start, end] = effectiveShowEntries.split("-").map(Number);
        return {
          start: Math.max(0, (start || 1) - 1),
          end: Math.max(0, end || filteredBids.length),
        };
      })();
  const rangeEnd = Math.min(selectedShowRange.end, filteredBids.length);
  const listInRange = filteredBids.slice(selectedShowRange.start, rangeEnd);
  const tableRowsPerPage = 5;
  const tableTotalPages = Math.max(
    1,
    Math.ceil(listInRange.length / tableRowsPerPage),
  );
  const safeTableCurrentPage = Math.min(tableCurrentPage, tableTotalPages);
  const tablePageStartIndex = (safeTableCurrentPage - 1) * tableRowsPerPage;
  const displayBids = listInRange.slice(
    tablePageStartIndex,
    tablePageStartIndex + tableRowsPerPage,
  );
  const tablePageRangeStart =
    listInRange.length === 0
      ? 0
      : selectedShowRange.start + tablePageStartIndex + 1;
  const tablePageRangeEnd =
    listInRange.length === 0
      ? 0
      : Math.min(
        selectedShowRange.start + tablePageStartIndex + tableRowsPerPage,
        rangeEnd,
      );
  const tablePageRangeLabel =
    listInRange.length === 0 ? "0-0" : `${tablePageRangeStart}-${tablePageRangeEnd}`;

  const submitModalMaxBid =
    selectedOpp != null ? maxBidAmountForOpportunity(selectedOpp) : null;
  const submitBidParsed = parseBidAmountInput(bidForm.bid_amount);
  const submitOppCurrency = normalizeCurrency(selectedOpp?.currency || "AED");
  const submitEnteredCurrency = normalizeCurrency(bidForm.currency);
  const submitBidParsedInOpp =
    submitBidParsed != null
      ? convertCurrency(submitBidParsed, submitEnteredCurrency, submitOppCurrency)
      : null;
  const submitModalMaxBidInEntered =
    submitModalMaxBid != null
      ? convertCurrency(submitModalMaxBid, submitOppCurrency, submitEnteredCurrency)
      : null;
  const submitBidOverMax =
    submitModalMaxBid != null &&
    submitBidParsedInOpp != null &&
    submitBidParsedInOpp > submitModalMaxBid;

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
    void enrichOpportunityById(opp.id);
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

  if (viewMode === "submit-bid" && selectedOpp) {
    return (
      <BiddingSubmitModal
        variant="page"
        selectedOpp={selectedOpp}
        bidForm={bidForm}
        setBidForm={setBidForm}
        currencyDropdownOpen={currencyDropdownOpen}
        setCurrencyDropdownOpen={setCurrencyDropdownOpen}
        bidAmountError={bidAmountError}
        setBidAmountError={setBidAmountError}
        setBidError={setBidError}
        bidError={bidError}
        bidSubmitting={bidSubmitting}
        closeSubmitBidModal={closeSubmitBidModal}
        handleBidSubmit={handleBidSubmit}
        currencies={CURRENCIES.map(({ code, label }) => ({ code, label }))}
        submitModalMaxBid={submitModalMaxBid}
        submitModalMaxBidInEntered={submitModalMaxBidInEntered}
        submitEnteredCurrency={submitEnteredCurrency}
        submitBidOverMax={submitBidOverMax}
        formatBudget={formatBudget}
        parseBidAmountInput={parseBidAmountInput}
        maxBidAmountForOpportunity={(opp) =>
          maxBidAmountForOpportunity(opp as Opportunity)
        }
        bidTooHighMessage={bidTooHighMessage}
      />
    );
  }

  if (viewMode === "opportunity-detail" && detailOpp) {
    const linkedBidForOpp = bids.find((b) => b.opportunity_id === detailOpp.id);
    const detailDays = daysUntil(detailOpp.bid_deadline);
    return (
      <div className="h-full flex flex-col font-gantari animate-in fade-in duration-300 px-6">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="relative group">
            <button
              onClick={closeDetail}
              className="p-2 border-none bg-[#F2F2F2] rounded-md transition-opacity cursor-pointer flex items-center justify-center font-gantari"
            >
              <img src={backIcon} alt="back" className="w-5 h-5" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10">
                <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                  Go Back
                </span>
              </div>
            </div>
          </div>
          <h2 className="flex-1 text-center text-[24px] font-medium text-[#000000] font-gantari">
            Project Details
          </h2>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10">
          {/* Summary Banner */}
          <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md px-5 py-2 flex flex-wrap items-stretch w-full mb-8">
            <div className="flex-1 min-w-[100px] px-2 py-0.5 border-r border-[#AEACAC52] text-center">
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
                Project Name
              </p>
              <p className="text-[#616161] text-[13px] sm:text-[14px] font-gantari truncate" title={detailOpp.project_name}>
                {detailOpp.project_name || "—"}
              </p>
            </div>
            <div className="flex-1 min-w-[100px] px-2 py-0.5 border-r border-[#AEACAC52] text-center">
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
                Bid deadline
              </p>
              <p className="text-[#616161] text-[13px] sm:text-[14px] font-gantari">
                {detailOpp.bid_deadline
                  ? new Date(detailOpp.bid_deadline).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                  : "—"}
              </p>
            </div>
            <div className="flex-1 min-w-[100px] px-2 py-0.5 border-r border-[#AEACAC52] text-center">
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
                Project due date
              </p>
              <p className="text-[#616161] text-[13px] sm:text-[14px] font-gantari">
                {detailOpp.project_due_date || "—"}
              </p>
            </div>
            <div className="flex-1 min-w-[100px] px-2 py-0.5 text-center">
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
                Bid amount
              </p>
              <p className="text-[#616161] text-[13px] sm:text-[14px] font-gantari truncate">
                {formatBudget(
                  parseBudgetNumeric(detailOpp.budget_ceiling) ??
                  parseBudgetNumeric(detailOpp.outsource_budget) ??
                  0,
                  detailOpp.currency
                )}
              </p>
            </div>
          </div>
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
                        parseBudgetNumeric(detailOpp.budget_ceiling) ??
                        parseBudgetNumeric(detailOpp.outsource_budget) ??
                        0,
                        detailOpp.currency,
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
                  {detailOpp.project_location ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari">
                        Location
                      </span>
                      <span className="text-[14px] font-medium text-[#353535] font-gantari">
                        {detailOpp.project_location}
                      </span>
                    </div>
                  ) : null}
                  {detailOpp.project_due_date ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari">
                        Project Due Date
                      </span>
                      <span className="text-[14px] font-medium text-[#353535] font-gantari">
                        {detailOpp.project_due_date}
                      </span>
                    </div>
                  ) : null}
                  {detailOpp.project_priority ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari">
                        Priority
                      </span>
                      <span className="text-[14px] font-medium text-[#353535] font-gantari">
                        {detailOpp.project_priority}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Description Section removed as per request */}

              {/* Scope of Work Section */}
              {(detailOpp.scope_of_work || detailOpp.technical_requirements || detailOpp.project_sector || detailOpp.bim_services_required) && (
                <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-2 font-gantari">
                    Scope of Work
                  </h3>
                  {(detailOpp.scope_of_work || detailOpp.technical_requirements) && (
                    <div className="text-[#8B8B8B] leading-relaxed whitespace-pre-wrap text-[14px] font-gantari mb-4">
                      {detailOpp.scope_of_work || detailOpp.technical_requirements}
                    </div>
                  )}
                  {(detailOpp.project_sector || detailOpp.bim_services_required) && (
                    <div className="bg-[#F9F9F9] border border-[#AEACAC52] rounded-md p-6 space-y-4">
                      {detailOpp.project_sector && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                          <div className="font-bold text-[#353535] w-[220px] flex justify-between flex-shrink-0 font-gantari text-[14px]">
                            <span>Project Sector</span>
                            <span>:</span>
                          </div>
                          <span className="text-[#616161] font-normal font-gantari text-[14px]">
                            {detailOpp.project_sector}
                          </span>
                        </div>
                      )}
                      {detailOpp.bim_services_required && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                          <div className="font-bold text-[#353535] w-[220px] flex justify-between flex-shrink-0 font-gantari text-[14px]">
                            <span>BIM Services Required</span>
                            <span>:</span>
                          </div>
                          <span className="text-[#616161] font-normal font-gantari text-[14px]">
                            {detailOpp.bim_services_required}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Technical Requirements Section */}
              {(detailOpp.technologies_used || detailOpp.software_to_be_used) && (
                <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-2 font-gantari">
                    Technical Requirements
                  </h3>
                  <div className="text-[#8B8B8B] leading-relaxed whitespace-pre-wrap text-[14px] font-gantari">
                    {detailOpp.technologies_used || detailOpp.software_to_be_used}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
              {/* Submission Status Card */}
              <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[20px] font-medium text-[#353535] mb-4 border-b-[1.5px] border-[#F2F2F2] pb-2 font-gantari">
                  Submission Status
                </h3>
                {detailOpp.already_bid ? (
                  <div className="space-y-6">
                    <div className="bg-[#EAFDF5] border border-[#16A34A]/20 rounded-xl p-4 text-[#16A34A]">
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
                        Your proposal is currently under review by the host organization.
                      </p>
                    </div>

                    {linkedBidForOpp && (
                      <div className="border-t border-[#F2F2F2] pt-4 space-y-4">
                        <h4 className="text-[16px] font-bold text-[#353535] font-gantari">Your Proposal Details</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[#8B8B8B] text-[12px] font-medium font-gantari uppercase">Bid Amount</span>
                            <span className="text-[18px] font-bold text-[#DE3D3A] font-gantari">
                              {formatBudget(linkedBidForOpp.bid_amount, linkedBidForOpp.currency)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[#8B8B8B] text-[12px] font-medium font-gantari uppercase">Timeline</span>
                            <span className="text-[14px] font-medium text-[#353535] font-gantari">
                              {linkedBidForOpp.timeline || "Not specified"}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[#8B8B8B] text-[12px] font-medium font-gantari uppercase">Team Size</span>
                            <span className="text-[14px] font-medium text-[#353535] font-gantari">
                              {linkedBidForOpp.team_size ? `${linkedBidForOpp.team_size} Members` : "N/A"}
                            </span>
                          </div>
                          {linkedBidForOpp.notes && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[#8B8B8B] text-[12px] font-medium font-gantari uppercase">Additional Notes</span>
                              <p className="text-[13px] text-[#616161] font-gantari bg-[#F9F9F9] p-3 rounded-lg border border-[#F0F0F0] whitespace-pre-wrap">
                                {linkedBidForOpp.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : detailOpp.status === "active" ? (
                  <div className="space-y-4">
                    <p className="text-[14px] text-[#8B8B8B] font-gantari">
                      {detailDays <= 0
                        ? "Bidding for this opportunity has ended."
                        : "Submit your technical proposal and commercial bid to participate in this opportunity."}
                    </p>
                    <button
                      type="button"
                      disabled={detailDays <= 0}
                      onClick={() =>
                        openSubmitBidModal(detailOpp, "opportunity-detail")
                      }
                      className={`w-full py-3 text-white rounded-md font-medium transition-all font-gantari text-[14px] ${detailDays <= 0
                          ? "bg-gray-400 cursor-not-allowed opacity-60"
                          : "bg-[#DD4342] hover:bg-[#c93d3d]"
                        }`}
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "bid-detail" && detailBid) {
    return (
      <div className="h-full flex flex-col font-gantari animate-in fade-in duration-300 px-6">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="relative group">
            <button
              onClick={closeDetail}
              className="p-2 border-none bg-[#F2F2F2] rounded-md transition-opacity cursor-pointer flex items-center justify-center font-gantari"
            >
              <img src={backIcon} alt="back" className="w-5 h-5" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10">
                <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                  Go Back
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 text-center">
            <h2 className="text-[24px] font-medium text-[#000000] font-gantari">
              {detailBid.project_name || `Bid Submission #${detailBid.id}`}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span
                className={`px-2.5 py-1 rounded-full text-[12px] font-medium font-gantari ${getStatusBadge(detailBid.status)}`}
              >
                {getStatusLabel(detailBid.status)}
              </span>
              {/* <span className="text-[#AEACAC] text-[13px] font-medium font-gantari">Opportunity ID: #{detailBid.opportunity_id}</span> */}
            </div>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10">
          {/* Summary Banner */}
          <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md px-5 py-2 flex flex-wrap items-stretch w-full mb-8">
            <div className="flex-1 min-w-[100px] px-2 py-0.5 border-r border-[#AEACAC52] text-center">
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
                Project Name
              </p>
              <p className="text-[#616161] text-[13px] sm:text-[14px] font-gantari truncate" title={detailBid.project_name}>
                {detailBid.project_name || "—"}
              </p>
            </div>
            <div className="flex-1 min-w-[100px] px-2 py-0.5 border-r border-[#AEACAC52] text-center">
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
                Bid deadline
              </p>
              <p className="text-[#616161] text-[13px] sm:text-[14px] font-gantari">
                {detailBid.bid_deadline
                  ? new Date(detailBid.bid_deadline).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                  : "—"}
              </p>
            </div>
            <div className="flex-1 min-w-[100px] px-2 py-0.5 border-r border-[#AEACAC52] text-center">
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
                Project due date
              </p>
              <p className="text-[#616161] text-[13px] sm:text-[14px] font-gantari">
                {detailBid.project_due_date || "—"}
              </p>
            </div>
            <div className="flex-1 min-w-[100px] px-2 py-0.5 text-center">
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
                Bid amount
              </p>
              <p className="text-[#616161] text-[13px] sm:text-[14px] font-gantari truncate">
                {formatBudget(detailBid.bid_amount, detailBid.currency)}
              </p>
            </div>
          </div>

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
                    <span className="text-[24px] font-medium text-[#353535] font-gantari">
                      {formatBudget(detailBid.bid_amount, detailBid.currency)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-4 border-[1.5px] border-[#F2F2F2] rounded-md">
                    <span className="text-[#8B8B8B] text-[14px] font-medium font-gantari uppercase tracking-wider">
                      Project Budget Ceiling
                    </span>
                    <span className="text-[24px] font-bold text-[#353535] font-gantari">
                      {formatBudget(
                        Number(detailBid.outsource_budget || 0),
                        detailBid.currency,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submission Details */}
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

                {/* Additional Sections from Modal */}
                <div className="space-y-6 pt-6 border-t border-[#F2F2F2]">
                  <div>
                    <h4 className="text-[16px] font-bold text-[#353535] mb-2 font-gantari">Additional Notes / Approach</h4>
                    <div className="text-[#353535] leading-relaxed whitespace-pre-wrap bg-[#F9F9F9] p-4 rounded-md border border-[#F0F0F0] text-[14px] font-gantari">
                      {detailBid.notes || "No accompanying notes provided with this bid."}
                    </div>
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
    <div className="h-full flex flex-col font-gantari bg-white px-4 overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-[24px] font-medium text-[#000000] flex-1">
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
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-[#E5E5E5] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-20 py-0 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    {[
                      { key: "all" as const, label: "All Opportunities" },
                      { key: "active" as const, label: "Active" },
                      { key: "bid" as const, label: "Bid Submitted" },
                      { key: "closed" as const, label: "Closed" },
                    ].map((tab) => {
                      const isChosen = oppTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => {
                            setOppTab(tab.key);
                            setStatusDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-[14px] transition-all font-gantari ${isChosen
                              ? "text-[#353535] bg-[#F2F2F2] font-medium"
                              : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2] font-medium"
                            }`}
                        >
                          <span>{tab.label}</span>
                          {isChosen && (
                            <svg
                              className="w-4 h-4 shrink-0 text-[#353535]"
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
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {mainTab === "my-bids" && (
            <div className="relative w-[160px]">
              <button
                onClick={() => setShowDropdownOpen(!showDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-medium transition-all cursor-pointer border-0 font-gantari"
              >
                {showEntries === "show" ? (
                  <span className="text-sm font-medium text-[#616161] truncate">
                    Show Entries
                  </span>
                ) : (
                  <span className="text-sm font-medium text-[#353535] truncate">
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
                  <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-full py-0 max-h-[160px] overflow-y-auto custom-scrollbar">
                    <div className="bg-[#F2F2F2] text-[#353535] font-semibold px-4 py-2 sticky top-0 z-10 font-gantari text-sm">
                      Show Entries
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
                          setTableCurrentPage(1);
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
                if (viewMode === "submit-bid") {
                  setBidSubmitting(false);
                  setBidError(null);
                  setBidAmountError(null);
                  setBidForm({ ...EMPTY_BID_FORM });
                  setCurrencyDropdownOpen(false);
                  setSelectedOpp(null);
                }
                setMainTab("opportunities");
                setViewMode("list");
                setTableCurrentPage(1);
              }}
              className={`px-4 py-1 rounded-md text-[14px] font-medium transition-all ${mainTab === "opportunities" ? "bg-white text-[#DE3D3A] shadow-sm" : "text-[#717171] hover:text-[#353535]"}`}
            >
              Opportunities
            </button>
            <button
              onClick={() => {
                if (viewMode === "submit-bid") {
                  setBidSubmitting(false);
                  setBidError(null);
                  setBidAmountError(null);
                  setBidForm({ ...EMPTY_BID_FORM });
                  setCurrencyDropdownOpen(false);
                  setSelectedOpp(null);
                }
                setMainTab("my-bids");
                setViewMode("list");
                setTableCurrentPage(1);
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
                  const name = opp.project_name || "Unnamed Project";
                  const avatarBg = getAvatarColor(name);
                  const initials = getInitials(name);
                  const alreadyBid = opp.already_bid;

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

                      <div className="flex items-center text-[14px] text-[#717171] mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <svg
                            className="w-3.5 h-3.5 shrink-0"
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
                          <span className="truncate">
                            {opp.bid_deadline
                              ? `${new Date(opp.bid_deadline).toLocaleDateString("en-GB")} · ${days > 0 ? `${days}d left` : "Ended"}`
                              : "No deadline"}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1" />

                      <div className="border-t border-[#F0F0F0] pt-3 mb-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[18px] font-bold text-[#353535]">
                            {formatBudget(
                              parseBudgetNumeric(opp.budget_ceiling) ??
                              parseBudgetNumeric(opp.outsource_budget) ??
                              0,
                              opp.currency,
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
                              type="button"
                              disabled={days <= 0}
                              onClick={() => openSubmitBidModal(opp, "list")}
                              className={`text-[14px] font-medium text-white px-5 py-2 rounded-md transition-colors shadow-sm ${days <= 0
                                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                                  : "bg-[#DD4342] hover:bg-[#c93d3d]"
                                }`}
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
                          className="text-[14px] font-medium text-[#717171] hover:text-[#353535] flex items-center gap-1.5 transition-colors group/btn"
                        >
                          Details
                          <svg
                            className="w-3.5 h-3.5 transition-transform"
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
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="overflow-auto custom-scrollbar smooth-scroll h-[calc(100%+17px)] pr-1 pb-[17px]">
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
                      {displayBids.map((bid, idx) => (
                        <tr
                          key={bid.id}
                          className={`${(tablePageStartIndex + idx) % 2 === 1 ? "bg-[#F2F2F2]" : "bg-white"}`}
                        >
                          <td className="px-4 py-6 text-center text-[14px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                            {tablePageStartIndex + idx + 1}
                          </td>
                          <td className="px-4 py-6 text-center">
                            <p className="text-[14px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                              {bid.project_name ||
                                `Opportunity #${bid.opportunity_id}`}
                            </p>
                          </td>
                          <td className="px-4 py-6 text-center text-[14px] font-medium text-[#DE3D3A] font-gantari whitespace-nowrap">
                            {formatBudget(bid.bid_amount, bid.currency)}
                          </td>
                          <td className="px-4 py-6 text-center text-[14px] font-medium text-[#353535] font-gantari whitespace-nowrap">
                            {formatBudget(
                              Number(bid.outsource_budget || 0),
                              bid.currency,
                            )}
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
                              <div className="relative group">
                                <button
                                  onClick={() => openBidDetail(bid)}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#DD4342] text-white rounded-md transition-all font-medium font-gantari text-[14px] whitespace-nowrap cursor-pointer"
                                >
                                  <img
                                    src={viewIcon}
                                    alt="view"
                                    className="w-4 h-4 brightness-0 invert"
                                  />
                                  View
                                </button>
                              </div>
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
          {filteredBids.length > 0 && listInRange.length > 0 && (
            <div className="w-full flex items-center justify-end mt-2 mb-[-6px] py-2">
              <div className="flex items-center gap-4 bg-[#E8E8E8] rounded-md px-5 py-2">
                <span className="text-[#353535] text-[16px] font-medium font-gantari leading-none">
                  Showing:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTableCurrentPage((p) => {
                      const cur = Math.min(Math.max(1, p), tableTotalPages);
                      return Math.max(1, cur - 1);
                    })
                  }
                  disabled={safeTableCurrentPage === 1}
                  className={`inline-flex items-center gap-1 text-[15px] font-medium font-gantari leading-none cursor-pointer ${safeTableCurrentPage === 1
                      ? "text-[#9CA3AF] opacity-50 cursor-not-allowed"
                      : "text-[#353535]"
                    }`}
                  aria-label="Previous page"
                >
                  <span className="relative -top-[2px] inline-flex items-center justify-center text-[24px] leading-none">
                    &#8249;
                  </span>
                  <span className="inline-flex items-center">Prev</span>
                </button>
                <button
                  type="button"
                  className="px-4 py-1 rounded-md bg-[#DD4342] text-[#FFFFFF] text-[14px] font-semibold font-gantari leading-none cursor-default"
                  aria-current="page"
                >
                  {tablePageRangeLabel}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTableCurrentPage((p) => {
                      const cur = Math.min(Math.max(1, p), tableTotalPages);
                      return Math.min(tableTotalPages, cur + 1);
                    })
                  }
                  disabled={safeTableCurrentPage >= tableTotalPages}
                  className={`inline-flex items-center gap-1 text-[15px] font-medium font-gantari leading-none cursor-pointer ${safeTableCurrentPage >= tableTotalPages
                      ? "text-[#9CA3AF] opacity-40 cursor-not-allowed"
                      : "text-[#353535]"
                    }`}
                  aria-label="Next page"
                >
                  <span className="inline-flex items-center">Next</span>
                  <span className="relative -top-[2px] inline-flex items-center justify-center text-[24px] leading-none">
                    &#8250;
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
