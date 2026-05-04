import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";
import api from "../../lib/api";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";

type Scope = {
  project_id: number;
  project_name: string;
  contract_id?: number | null;
  proposal_id?: number | null;
  is_outsource?: boolean;
};

type VendorProject = {
  id: number;
  main_project_id?: number;
  project_name?: string;
  department?: string;
};

type Milestone = {
  id: number;
  contract_id?: number | null;
  proposal_id?: number | null;
  side: "client" | "vendor";
  title?: string;
  terms?: string;
  timeline?: string;
  amount?: number;
  status?: string;
  invoice_number?: string | null;
  milestone_name?: string;
  milestone_amount?: number;
  timeline_raw?: string;
  notes?: string;
};

type Invoice = {
  milestone_id?: number | null;
  side?: string;
  invoice_number?: string;
  latest_payment?: { approval_status?: string } | null;
  status?: string;
};

function milestoneStatus(inv?: Invoice): string {
  if (!inv) return "Pending";
  const pay = String(inv.latest_payment?.approval_status || "").trim().toLowerCase();
  const st = String(inv.status || "").trim().toLowerCase();
  if (pay === "approved" || st === "paid") return "Approved";
  if (pay === "rejected" || st === "rejected") return "Rejected";
  if (pay === "pending approval" || pay === "pending" || st === "pending approval") return "Approve Payment";
  if (inv.invoice_number) return "Invoice Generated";
  return "Pending";
}

const VENDOR_PROJECT_SCROLLBAR_STYLE = `
  .milestone-vendor-dd-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .milestone-vendor-dd-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .milestone-vendor-dd-scrollbar::-webkit-scrollbar-thumb {
    background: #979797;
    border-radius: 10px;
  }
  .milestone-vendor-dd-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #979797 transparent;
  }
`;

const VENDOR_PROJECT_PLACEHOLDER = "Select project";
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

/** BiddingTD-style portal dropdown for vendor milestone project filter. */
function VendorProjectPickerDropdown({
  scopes,
  value,
  onChange,
  className = "",
}: {
  scopes: Scope[];
  value: number | "all";
  onChange: (v: number | "all") => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, bottom: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inTrigger = dropdownRef.current?.contains(target);
      const inMenu = menuRef.current?.contains(target);
      if (!inTrigger && !inMenu) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;
    const updatePosition = () => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top,
      });
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const selected =
    value === "all" ? null : scopes.find((s) => s.project_id === value);
  const displayName = selected?.project_name?.trim() || "";
  const isPlaceholder = value === "all";

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] overflow-hidden"
      style={{
        width: coords.width,
        left: coords.left,
        top: coords.top + 4,
      }}
    >
      <div className="max-h-[220px] overflow-y-auto milestone-vendor-dd-scrollbar">
        <button
          type="button"
          onClick={() => {
            onChange("all");
            setIsOpen(false);
          }}
          className={`w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${
            isPlaceholder
              ? "text-[#353535] bg-[#F2F2F2]"
              : "text-[#8B8B8B] bg-[#FFFFFF]"
          }`}
        >
          All projects
        </button>
        {scopes.map((s) => {
          const isChosen = value === s.project_id;
          return (
            <button
              key={s.project_id}
              type="button"
              onClick={() => {
                onChange(s.project_id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${
                isChosen
                  ? "text-[#353535] bg-[#F2F2F2]"
                  : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"
              }`}
            >
              <span className="truncate min-w-0">{s.project_name}</span>
              {isChosen ? (
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
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[36px] min-h-[36px] flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[12px] sm:text-[14px] font-semibold transition-all outline-none font-gantari min-w-0 cursor-pointer border-0"
      >
        <span
          className={`min-w-0 flex-1 truncate overflow-hidden text-left ${
            isPlaceholder ? "text-[#8B8B8B]" : "text-[#353535]"
          }`}
        >
          {isPlaceholder ? (
            VENDOR_PROJECT_PLACEHOLDER
          ) : (
            <span className="font-semibold">{displayName}</span>
          )}
        </span>
        <img
          src={ArrowDown}
          alt=""
          className={`w-3 h-3 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""} ${isPlaceholder ? "opacity-60 grayscale" : "opacity-90"}`}
          aria-hidden
        />
      </button>
      {isOpen && createPortal(menuContent, document.body)}
    </div>
  );
}

type PaymentMilestonesPageProps = {
  /** Vendor milestones: project picker + filtered cards (TD page omits this prop). */
  showProjectSelector?: boolean;
};

export default function PaymentMilestonesPage({
  showProjectSelector = false,
}: PaymentMilestonesPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCommercial = location.pathname.startsWith("/td");

  const [scopes, setScopes] = useState<Scope[]>([]);
  const [projectPickerId, setProjectPickerId] = useState<number | "all">("all");
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [rows, setRows] = useState<Milestone[]>([]);
  const [invoiceMap, setInvoiceMap] = useState<Record<number, Invoice>>({});
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [showProjectCards, setShowProjectCards] = useState<boolean>(
    !Number(searchParams.get("project_id") || 0),
  );

  useEffect(() => {
    if (!showProjectSelector) return;
    const styleTag = document.createElement("style");
    styleTag.setAttribute("data-payment-milestones-vendor-dd", "1");
    styleTag.textContent = VENDOR_PROJECT_SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, [showProjectSelector]);

  useEffect(() => {
    if (!showProjectSelector || !showEntriesOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowEntriesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProjectSelector, showEntriesOpen]);

  useEffect(() => {
    if (showEntriesOpen && showEntriesDropdownContentRef.current) {
      showEntriesDropdownContentRef.current.scrollTop = 0;
    }
  }, [showEntriesOpen]);

  useEffect(() => {
    let dead = false;
    const loadScopes = async () => {
      try {
        const { data } = await api.get<Scope[]>("/api/payment-milestones/new-swiftbim/scopes");
        if (dead) return;
        let list = Array.isArray(data) ? data : [];

        // Vendor fallback: mirror project list from vendor projects page when scopes are empty.
        if (!isCommercial && list.length === 0) {
          try {
            const vpRes = await api.get<{ projects?: VendorProject[] } | VendorProject[]>(
              "/api/vendors/vendor-projects",
            );
            const raw: VendorProject[] = Array.isArray(vpRes.data)
              ? vpRes.data
              : Array.isArray((vpRes.data as any)?.projects)
                ? (vpRes.data as any).projects
                : [];
            const mapped: Scope[] = raw
              .map((p) => ({
                project_id: Number(p?.main_project_id || p?.id || 0),
                project_name: String(p?.project_name || "").trim(),
                is_outsource: true,
              }))
              .filter((p) => Number.isFinite(p.project_id) && p.project_id > 0 && !!p.project_name);
            const uniq = new Map<number, Scope>();
            for (const item of mapped) {
              if (!uniq.has(item.project_id)) uniq.set(item.project_id, item);
            }
            list = Array.from(uniq.values());
          } catch {
            // ignore fallback failure
          }
        }

        setScopes(list);
        const wanted = Number(searchParams.get("project_id") || 0);
        const next = list.find((x) => x.project_id === wanted) || list[0] || null;
        setScope(next);
      } catch {
        if (!dead) setScopes([]);
      }
    };

    void loadScopes();
    return () => {
      dead = true;
    };
  }, [searchParams, isCommercial]);

  useEffect(() => {
    if (!scope) {
      setRows([]);
      setInvoiceMap({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const side = isCommercial
      ? (scope.is_outsource ? "all" : "client")
      : "vendor";
    const qs = new URLSearchParams({
      project_id: String(scope.project_id),
      side,
    });
    if (scope.proposal_id != null) qs.set("proposal_id", String(scope.proposal_id));
    if (scope.contract_id != null) qs.set("contract_id", String(scope.contract_id));
    if (scope.project_name) qs.set("project_name", scope.project_name);
    Promise.all([
      api.get<{ milestones: Milestone[] }>(
        `/api/payment-milestones/new-swiftbim?${qs.toString()}`,
      ),
      api.get<Invoice[]>(
        `/api/payment-milestones/new-swiftbim/invoices?${qs.toString()}`,
      ),
    ])
      .then(([mRes, iRes]) => {
        const milestones = Array.isArray(mRes.data?.milestones) ? mRes.data.milestones : [];
        setRows(
          milestones.map((m) => ({
            ...m,
            title: m.title || m.milestone_name,
            terms: m.terms ?? m.notes ?? "",
            timeline: m.timeline ?? m.timeline_raw ?? "",
            amount:
              m.amount != null
                ? Number(m.amount)
                : m.milestone_amount != null
                  ? Number(m.milestone_amount)
                  : 0,
          })),
        );
        const invs = Array.isArray(iRes.data) ? iRes.data : [];
        const map: Record<number, Invoice> = {};
        for (const inv of invs) {
          if (inv.milestone_id != null && map[Number(inv.milestone_id)] == null) {
            map[Number(inv.milestone_id)] = inv;
          }
        }
        setInvoiceMap(map);
      })
      .catch(() => {
        setRows([]);
        setInvoiceMap({});
      })
      .finally(() => setLoading(false));
  }, [scope, isCommercial]);

  const onScopeChange = (projectId: number) => {
    const next = scopes.find((s) => s.project_id === projectId) || null;
    setScope(next);
    const params = new URLSearchParams(searchParams);
    params.set("project_id", String(projectId));
    setSearchParams(params, { replace: true });
  };

  const openProjectDetails = (projectId: number) => {
    onScopeChange(projectId);
    setShowProjectCards(false);
  };

  const backToProjects = () => {
    setShowProjectCards(true);
  };

  const createInvoice = async (m: Milestone) => {
    try {
      setCreatingId(m.id);
      setError("");
      await api.post("/api/payment-milestones/new-swiftbim/invoices", {
        milestone_id: m.id,
        side: m.side,
        invoice_total: Number(m.amount || 0),
      });
      navigate(`${isCommercial ? "/td/invoices" : "/v/invoices"}?project_id=${scope?.project_id || ""}`);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to generate invoice.");
    } finally {
      setCreatingId(null);
    }
  };

  const clientRows = useMemo(() => rows.filter((r) => r.side === "client"), [rows]);
  const vendorRows = useMemo(() => rows.filter((r) => r.side === "vendor"), [rows]);

  const renderRows = (
    title: string,
    list: Milestone[],
    opts?: { innerGridClassName?: string },
  ) => (
    <div className="border border-[#AEACAC52] rounded-xl p-4 bg-white">
      <h3 className="font-semibold text-[18px] text-[#000000] mb-3">{title}</h3>
      {list.length === 0 ? (
        <p className="text-[14px] text-[#666]">No milestones available.</p>
      ) : (
        <div className={opts?.innerGridClassName ?? "grid grid-cols-1 gap-3"}>
          {list.map((m) => {
            const inv = invoiceMap[m.id];
            const st = milestoneStatus(inv);
            const invLabel = inv?.invoice_number;
            const canGenerate =
              (isCommercial && m.side === "client") || (!isCommercial && m.side === "vendor");
            const isCommercialVendor = isCommercial && m.side === "vendor";
            return (
              <div key={m.id} className="border border-[#AEACAC52] rounded-lg px-4 py-4 bg-[#F9FAFB]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[#353535] text-[15px]">{m.title || "Milestone"}</h4>
                  <span
                    className={`text-[12px] px-2.5 py-1 rounded-md font-semibold ${
                      st === "Approved"
                        ? "bg-[#E1F6EB] text-[#008F22]"
                        : st === "Rejected"
                          ? "bg-[#FFE9E9] text-[#DD4342]"
                          : st === "Approve Payment"
                            ? "bg-[#FFF4E5] text-[#B86B00]"
                            : st === "Invoice Generated"
                              ? "bg-[#E8F0FF] text-[#2D60FF]"
                              : "bg-[#FFEAD6] text-[#EB7200]"
                    }`}
                  >
                    {st}
                  </span>
                </div>
                {isVendorDetailView ? (
                  <div className="flex items-start justify-between gap-6 text-sm">
                    <div className="grid gap-y-1" style={{ gridTemplateColumns: 'auto auto 1fr' }}>
                      <span className="text-[#353535] font-normal pr-1">Terms</span>
                      <span className="text-[#353535] font-normal pr-2">:</span>
                      <span className="text-[#616161] font-normal">{m.terms || "—"}</span>
                      <span className="text-[#353535] font-normal pr-1">Timeline</span>
                      <span className="text-[#353535] font-normal pr-2">:</span>
                      <span className="text-[#616161] font-normal">{m.timeline || "—"}</span>
                      <span className="text-[#353535] font-normal pr-1">Amount</span>
                      <span className="text-[#353535] font-normal pr-2">:</span>
                      <span className="text-[#616161] font-normal">{Number(m.amount || 0).toFixed(2)}</span>
                    </div>

                    <div className="shrink-0 flex justify-end self-end">
                      {invLabel ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `${isCommercial ? "/td/invoices" : "/v/invoices"}?project_id=${scope?.project_id || ""}${isCommercialVendor ? "&side=vendor" : ""}`,
                            )
                          }
                          className="bg-[#DD4342] text-white px-5 py-2 rounded-md text-sm font-medium"
                        >
                          {isCommercialVendor ? "Make Payment" : invLabel}
                        </button>
                      ) : canGenerate ? (
                        <button
                          type="button"
                          onClick={() => createInvoice(m)}
                          className="bg-[#DD4342] text-white px-5 py-2 rounded-md text-sm font-medium"
                        >
                          {creatingId === m.id
                            ? "Generating..."
                            : "Generate Invoice"}
                        </button>
                      ) : (
                        <span className="text-xs italic text-[#999]">
                          Awaiting invoice generation
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm grid gap-y-1" style={{ gridTemplateColumns: 'auto auto 1fr' }}>
                    <span className="text-[#353535] font-normal pr-1">Terms</span>
                    <span className="text-[#353535] font-normal pr-2">:</span>
                    <span className="text-[#616161] font-normal">{m.terms || "—"}</span>
                    <span className="text-[#353535] font-normal pr-1">Timeline</span>
                    <span className="text-[#353535] font-normal pr-2">:</span>
                    <span className="text-[#616161] font-normal">{m.timeline || "—"}</span>
                    <span className="text-[#353535] font-bold pr-1">Amount</span>
                    <span className="text-[#353535] font-bold pr-2">:</span>
                    <span className="text-[#616161] font-bold">{Number(m.amount || 0).toFixed(2)}</span>
                  </div>
                )}
                {!isVendorDetailView ? (
                  <div className="flex justify-end mt-3">
                    {invLabel ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `${isCommercial ? "/td/invoices" : "/v/invoices"}?project_id=${scope?.project_id || ""}${isCommercialVendor ? "&side=vendor" : ""}`,
                          )
                        }
                        className="bg-[#DD4342] text-white px-5 py-2 rounded-md text-sm font-medium"
                      >
                        {isCommercialVendor ? "Make Payment" : invLabel}
                      </button>
                    ) : canGenerate ? (
                      <button
                        type="button"
                        onClick={() => createInvoice(m)}
                        className="bg-[#DD4342] text-white px-5 py-2 rounded-md text-sm font-medium"
                      >
                        {creatingId === m.id
                          ? "Generating..."
                          : "Generate Invoice"}
                      </button>
                    ) : (
                      <span className="text-xs italic text-[#999]">
                        Awaiting invoice generation
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const isVendorMilestones = showProjectSelector;
  const isVendorDetailView = showProjectSelector && !isCommercial && !showProjectCards;

  return (
    <div
      className={`h-full min-h-0 flex flex-col ${showProjectSelector ? "px-5" : ""}`}
    >
      {isVendorMilestones && !showProjectCards ? (
        <div className="mb-4 flex flex-shrink-0 items-center justify-between relative">
          <button
            type="button"
            onClick={backToProjects}
            className="group relative cursor-pointer rounded-md bg-[#F2F2F2] p-2 text-[#1A1A1A] transition-all"
            aria-label="Back"
          >
            <img src={backIcon} alt="Back" className="h-5 w-5" />
            <div className="pointer-events-none absolute top-full left-1/2 z-[100] mt-1 flex -translate-x-1/2 flex-col items-center opacity-0 transition-opacity group-hover:opacity-100">
              <div className="relative z-20 -mb-[5.5px] h-2.5 w-2.5 rotate-45 border-t border-l border-[#C1C1C1] bg-[#FFFFFF]" />
              <div className="relative z-10 rounded-md border border-[#C1C1C1] bg-[#FFFFFF] px-2 py-0.5 shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)]">
                <span className="block whitespace-nowrap text-center font-Gantari text-[14px] font-semibold text-[#353535]">
                  Go Back
                </span>
              </div>
            </div>
          </button>
          <h1 className="flex-1 text-center font-Gantari text-[20px] font-semibold text-[#020202] sm:text-[24px]">
            Payment Milestone Details
          </h1>
          <div className="w-10 shrink-0" aria-hidden />
        </div>
      ) : (
        <div className="mb-4 flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="min-w-0 truncate text-[24px] font-semibold">
              Payment Milestones
            </h1>
          </div>
          {showProjectCards ? (
            <div className="flex items-center gap-3 sm:justify-end">
              {showProjectSelector && scopes.length > 0 ? (
                <VendorProjectPickerDropdown
                  scopes={scopes}
                  value={projectPickerId}
                  onChange={setProjectPickerId}
                  className="w-[180px] sm:w-[200px]"
                />
              ) : null}
              {showProjectSelector ? (
                <div
                  className="relative w-[150px] sm:w-[170px]"
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
                          <span className="font-semibold">
                            {
                              (showEntriesOptions.find(
                                (o) =>
                                  o.value ===
                                  (selectedShowEntries ||
                                    showEntriesOptions[0].value),
                              ) ?? showEntriesOptions[0]).label
                            }
                          </span>
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
                        className="max-h-[168px] overflow-y-auto milestone-vendor-dd-scrollbar"
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
              ) : null}
              {!showProjectSelector ? (
                <div className="text-sm whitespace-nowrap text-[#666]">
                  {scopes.length} Projects
                </div>
              ) : null}
            </div>
          ) : !isVendorMilestones ? (
            <div className="group relative sm:ml-auto">
              <button
                type="button"
                onClick={backToProjects}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#E8E8E8] text-[#353535] transition-colors hover:bg-[#DFDFDF]"
                aria-label="Back to projects"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="pointer-events-none absolute top-full right-0 mt-1 whitespace-nowrap rounded bg-[#353535] px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                Back to projects
              </div>
            </div>
          ) : null}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
        {loading ? (
          <p className="text-[#666]">Loading milestones...</p>
        ) : showProjectCards ? (
          (() => {
            const searchQueryParam = searchParams.get('q')?.toLowerCase() || "";
            const filteredScopes = scopes.filter((s) => {
              if (
                showProjectSelector &&
                projectPickerId !== "all" &&
                s.project_id !== projectPickerId
              ) {
                return false;
              }
              return (
                !searchQueryParam ||
                (s.project_name || "").toLowerCase().includes(searchQueryParam)
              );
            });
            const effectiveShowEntryValue =
              selectedShowEntries || showEntriesOptions[0].value;
            const selectedRange =
              showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ??
              showEntriesOptions[0];
            const rangeEnd =
              selectedRange.end === null
                ? filteredScopes.length
                : Math.min(selectedRange.end, filteredScopes.length);
            const filteredScopesInRange = showProjectSelector
              ? filteredScopes.slice(selectedRange.start, rangeEnd)
              : filteredScopes;
            return filteredScopesInRange.length === 0 ? (
            <p className="text-[#666]">No projects available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredScopesInRange.map((s) => {
                return (
                  <div
                    key={s.project_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openProjectDetails(s.project_id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openProjectDetails(s.project_id);
                      }
                    }}
                    className="text-left border border-[#AEACAC52] rounded-xl p-5 bg-white hover:shadow-sm transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEACAC52]"
                  >
                    <h3 className="text-[18px] font-medium text-[#353535] break-words line-clamp-2 min-h-[56px]">
                      {s.project_name}
                    </h3>
                    <div className="mt-4 pt-4 border-t border-[#AEACAC52] flex items-center justify-between gap-2">
                      <span className="inline-flex items-center bg-[#FFEAD6] text-[#D08A3A] rounded-md px-3 py-1 text-[14px] font-semibold">
                        View Milestones
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          openProjectDetails(s.project_id);
                        }}
                        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[14px] font-medium text-[#8B8B8B] transition-colors hover:text-[#353535]"
                      >
                        Details
                        <FiArrowUpRight
                          className="h-3.5 w-3.5 shrink-0 transition-colors"
                          aria-hidden
                        />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
          })()
        ) : isCommercial && scope?.is_outsource ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {renderRows("Client Side (Receivables)", clientRows)}
            {renderRows("Vendor Side (Payables)", vendorRows)}
          </div>
        ) : (
          renderRows(
            isCommercial ? "Client Side (Receivables)" : "Vendor Side (Payables)",
            isCommercial ? clientRows : vendorRows,
            showProjectSelector && !isCommercial
              ? { innerGridClassName: "grid grid-cols-1 gap-3 md:grid-cols-2" }
              : undefined,
          )
        )}
      </div>
    </div>
  );
}
