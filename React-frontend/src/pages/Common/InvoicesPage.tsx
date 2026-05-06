import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../lib/api";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import downloadIcon from "../../assets/TechnicalDirector/download icon.svg";

type Scope = {
  project_id: number;
  project_name: string;
  contract_id?: number | null;
  proposal_id?: number | null;
  is_outsource?: boolean;
};
type PaymentRow = { approval_status?: string; payment_mode?: string; transaction_id?: string };
type Invoice = {
  id: number;
  invoice_number: string;
  invoice_total: number;
  side: "client" | "vendor";
  status?: string;
  latest_payment?: PaymentRow | null;
};

const paymentModes = ["UPI", "Bank Transfer", "Cheque", "RTGS/NEFT", "Card", "Cash"];

function displayStatus(inv: Invoice) {
  const pay = String(inv.latest_payment?.approval_status || "").toLowerCase();
  const st = String(inv.status || "").toLowerCase();
  if (pay === "approved" || st === "paid") return "Approved";
  if (pay === "rejected" || st === "rejected") return "Rejected";
  if (pay || st === "pending approval") return "Pending Approval";
  return "Not Submitted";
}

const toCamelCase = (str: string): string => {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
`;

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
  className = "",
  styleType = "form",
  menuMaxHeightClass = "max-h-[220px]",
  direction = "down",
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
  styleType?: "form" | "header" | "table";
  menuMaxHeightClass?: string;
  direction?: "up" | "down";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, bottom: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideTrigger = dropdownRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);
      if (!isInsideTrigger && !isInsideMenu) setIsOpen(false);
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

  const isPlaceholder = !value || value === placeholder;

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] overflow-hidden rounded-md border border-[#E0E0E0] bg-[#FFFFFF] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]"
      style={{
        width: coords.width,
        left: coords.left,
        ...(direction === "up"
          ? { bottom: coords.bottom + 4 }
          : { top: coords.top + 4 }),
      }}
    >
      <div className={`${menuMaxHeightClass} custom-scrollbar overflow-y-auto`}>
        {(styleType === "header" || styleType === "form") && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className={`w-full cursor-pointer px-4 py-2 text-left font-gantari text-[14px] transition-colors hover:bg-[#F2F2F2] hover:text-[#353535] ${
              isPlaceholder
                ? "bg-[#F2F2F2] text-[#353535]"
                : "bg-[#FFFFFF] text-[#8B8B8B]"
            }`}
          >
            {`All ${placeholder}`}
          </button>
        )}
        {options.map((option) => {
          const isChosen = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2 text-left font-gantari text-[14px] font-normal transition-colors ${
                isChosen
                  ? "bg-[#F2F2F2] text-[#353535]"
                  : "bg-transparent text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535]"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{option}</span>
              {isChosen ? (
                <svg
                  className="h-4 w-4 shrink-0 text-[#353535]"
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
      <input
        type="text"
        value={value && value !== placeholder ? value : ""}
        required
        className="pointer-events-none absolute opacity-0"
        tabIndex={-1}
        readOnly
      />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-[36px] min-h-[36px] w-full min-w-0 items-center justify-between gap-2 font-gantari outline-none transition-all ${
          styleType === "header"
            ? "rounded-md bg-[#E8E8E8] px-3 py-2 text-[12px] font-semibold sm:text-[14px]"
            : `rounded-md border border-transparent bg-[#F2F3F4] px-4 py-2 text-[12px] sm:text-[14px] focus:border-[#AEACAC52] focus:outline-none ${isOpen ? "!border-[#AEACAC52]" : ""}`
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate overflow-hidden text-left ${
            styleType === "header" || styleType === "form"
              ? isPlaceholder
                ? "text-[#8B8B8B]"
                : "text-[#353535]"
              : ""
          }`}
        >
          {styleType === "header" && value && !isPlaceholder ? (
            <span className="font-semibold">{toCamelCase(value)}</span>
          ) : (
            placeholder
          )}
        </span>
        <img
          src={ArrowDown}
          alt=""
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isPlaceholder ? "opacity-60 grayscale" : "opacity-90"}`}
          aria-hidden
        />
      </button>
      {isOpen && createPortal(menuContent, document.body)}
    </div>
  );
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

async function downloadAuthedPdf(path: string, filename: string) {
  try {
    const token = localStorage.getItem("token");
    const base = (api.defaults.baseURL || "").replace(/\/$/, "");
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (!res.ok) {
      let msg = "Download failed";
      try {
        const j = (await res.json()) as { error?: string; message?: string };
        if (j?.error) msg = j.error;
        else if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      toast.error(msg);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Download failed");
  }
}

export default function InvoicesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCommercial = location.pathname.startsWith("/td");
  const isVendor = location.pathname.startsWith("/v");
  const [searchParams, setSearchParams] = useSearchParams();
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [scopeId, setScopeId] = useState<number | null>(null);
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPay, setOpenPay] = useState<number | null>(null);
  const [form, setForm] = useState({
    payment_mode: "UPI",
    transaction_id: "",
    payment_date: "",
    remarks: "",
    payment_proof: null as File | null,
  });
  const [error, setError] = useState("");
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVendor) return;
    const styleTag = document.createElement("style");
    styleTag.setAttribute("data-invoices-vendor-scrollbar", "1");
    styleTag.textContent = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, [isVendor]);

  useEffect(() => {
    if (!isVendor || !showEntriesOpen) return;
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
  }, [isVendor, showEntriesOpen]);

  useEffect(() => {
    if (showEntriesOpen && showEntriesDropdownContentRef.current) {
      showEntriesDropdownContentRef.current.scrollTop = 0;
    }
  }, [showEntriesOpen]);

  useEffect(() => {
    api
      .get<Scope[]>("/api/payment-milestones/new-swiftbim/scopes")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setScopes(list);
        const q = Number(searchParams.get("project_id") || 0);
        const s = q ? list.find((x) => x.project_id === q) : null;
        setScopeId(s?.project_id || null);
      })
      .catch(() => setScopes([]));
  }, [searchParams]);

  const loadInvoices = () => {
    if (!scopeId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const currentScope = scopes.find((s) => s.project_id === scopeId) || null;
    const qs = new URLSearchParams({ project_id: String(scopeId) });
    if (currentScope?.proposal_id != null) qs.set("proposal_id", String(currentScope.proposal_id));
    if (currentScope?.contract_id != null) qs.set("contract_id", String(currentScope.contract_id));
    if (currentScope?.project_name) qs.set("project_name", currentScope.project_name);
    api
      .get<Invoice[]>(`/api/payment-milestones/new-swiftbim/invoices?${qs.toString()}`)
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoices();
  }, [scopeId]);

  const onScopeChange = (pid: number) => {
    setScopeId(pid);
    const next = new URLSearchParams(searchParams);
    next.set("project_id", String(pid));
    setSearchParams(next, { replace: true });
  };

  const submitPayment = async (e: FormEvent, invoiceId: number) => {
    e.preventDefault();
    setError("");
    const isCash = form.payment_mode.toLowerCase() === "cash";
    const fd = new FormData();
    fd.append("payment_mode", form.payment_mode);
    fd.append("transaction_id", form.transaction_id);
    fd.append("payment_date", form.payment_date);
    fd.append("remarks", form.remarks);
    if (form.payment_proof) fd.append("payment_proof", form.payment_proof.name);
    if (!isCash && !form.payment_proof) {
      setError("Attachment is required for non-cash payments");
      return;
    }
    try {
      await api.post(`/api/payment-milestones/new-swiftbim/invoices/${invoiceId}/pay`, fd);
      setOpenPay(null);
      loadInvoices();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Payment submission failed");
    }
  };

  const approvePayment = async (invoiceId: number) => {
    try {
      await api.post(`/api/payment-milestones/new-swiftbim/invoices/${invoiceId}/approve-payment`);
      loadInvoices();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Approval failed");
    }
  };

  const clientInvoices = useMemo(() => rows.filter((r) => r.side === "client"), [rows]);
  const vendorInvoices = useMemo(() => rows.filter((r) => r.side === "vendor"), [rows]);

  const projectNameOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of scopes) {
      const n = String(s.project_name || "").trim();
      if (n && !seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
    return out.sort();
  }, [scopes]);

  const selectedProjectName =
    scopes.find((s) => s.project_id === scopeId)?.project_name?.trim() || "";

  const effectiveShowEntryValue =
    selectedShowEntries || showEntriesOptions[0].value;
  const selectedEntriesRange =
    showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ??
    showEntriesOptions[0];

  const vendorInvoicesWindow = useMemo(() => {
    if (!isVendor) return vendorInvoices;
    const eff =
      selectedShowEntries || showEntriesOptions[0].value;
    const range =
      showEntriesOptions.find((o) => o.value === eff) ?? showEntriesOptions[0];
    const filtered = vendorInvoices;
    const rangeEnd =
      range.end === null ? filtered.length : Math.min(range.end, filtered.length);
    return filtered.slice(range.start, rangeEnd);
  }, [isVendor, vendorInvoices, selectedShowEntries]);

  const renderList = (list: Invoice[], sideTitle: string) => (
    <div>
      <h3 className="font-semibold text-[18px] mb-3">{sideTitle}</h3>
      {!list.length ? (
        <div className="flex flex-col items-center justify-center py-40">
          <p className="text-[#616161] text-[16px] font-Gantari">
            No invoices generated yet.
          </p>
        </div>
      ) : (
        <div
          className={
            isVendor && !isCommercial
              ? "grid grid-cols-1 md:grid-cols-2 gap-4"
              : "space-y-4"
          }
        >
          {list.map((inv) => {
            const st = displayStatus(inv);
            const canVendorPay = isCommercial && inv.side === "vendor" && st === "Not Submitted";
            const canApprove =
              st === "Pending Approval" &&
              ((isCommercial && inv.side === "client") || (isVendor && inv.side === "vendor"));
            const isCash = form.payment_mode.toLowerCase() === "cash";
            return (
              <div key={inv.id} className="border border-[rgb(89,89,89)]/20 rounded-lg p-5 bg-[#F9F9F9]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid gap-y-1 grid-cols-[auto_12px_1fr] items-start text-sm">
                    <span className="font-gantari text-[#353535]">Invoice number</span>
                    <span className="font-gantari text-[#353535] text-center">:</span>
                    <span className="font-gantari text-[#616161] break-all">{inv.invoice_number}</span>

                    <span className="font-gantari text-[#353535]">Status</span>
                    <span className="font-gantari text-[#353535] text-center">:</span>
                    <span className="text-[#616161] font-normal break-words">{st}</span>

                    <span className="text-[#353535] font-normal">Amount paid</span>
                    <span className="text-[#353535] font-normal text-center">:</span>
                    <span className="text-[#616161] font-normal break-words">
                      {Number(inv.invoice_total || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="h-[35px] px-4 bg-[#DD4342] text-white rounded-md text-sm"
                      onClick={() => {
                        if (!scopeId) return;
                        const base = isCommercial ? "/td/invoices" : "/v/invoices";
                        navigate(`${base}/${inv.id}?project_id=${scopeId}`, {
                          state: { returnTo: `${location.pathname}${location.search}` },
                        });
                      }}
                    >
                      View
                    </button>
                    <div className="group relative">
                      <button
                        type="button"
                        className={
                          isVendor && !isCommercial
                            ? "h-[35px] w-[35px] flex items-center justify-center bg-[#E8E8E8] text-[#353535] rounded-md cursor-pointer"
                            : "h-[35px] px-4 bg-[#E8E8E8] text-[#353535] rounded-md text-sm cursor-pointer"
                        }
                        aria-label="Download"
                        onClick={() => {
                          const safe = String(inv.invoice_number || `invoice-${inv.id}`).replace(/[^\w-]+/g, "_");
                          const qs = new URLSearchParams();
                          if (scopeId) qs.set("project_id", String(scopeId));
                          void downloadAuthedPdf(
                            `/api/payment-milestones/new-swiftbim/invoices/${inv.id}/pdf?${qs.toString()}`,
                            `${safe}.pdf`,
                          );
                        }}
                      >
                        {isVendor && !isCommercial ? (
                          <img
                            src={downloadIcon}
                            alt=""
                            className="w-4 h-4"
                            aria-hidden
                          />
                        ) : (
                          "Download"
                        )}
                      </button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                        <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                        <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-2 py-0.5 relative z-10 shadow-sm">
                          <span className="font-gantari text-[12px] font-semibold text-[#353535] whitespace-nowrap">Download</span>
                        </div>
                      </div>
                    </div>
                    {canVendorPay ? (
                      <button
                        type="button"
                        className="h-[35px] px-4 bg-[#DD4342] text-white rounded-md text-sm"
                        onClick={() => setOpenPay(openPay === inv.id ? null : inv.id)}
                      >
                        Make Payment
                      </button>
                    ) : null}
                    {canApprove ? (
                      <button
                        type="button"
                        className="h-[35px] px-4 bg-[#008F22] text-white rounded-md text-sm"
                        onClick={() => approvePayment(inv.id)}
                      >
                        Approve
                      </button>
                    ) : null}
                  </div>
                </div>
                {openPay === inv.id && canVendorPay ? (
                  <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e) => submitPayment(e, inv.id)}>
                    <select
                      className="bg-[#F2F3F4] rounded-lg px-4 py-2.5"
                      value={form.payment_mode}
                      onChange={(e) => setForm((f) => ({ ...f, payment_mode: e.target.value }))}
                    >
                      {paymentModes.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      className="bg-[#F2F3F4] rounded-lg px-4 py-2.5"
                      placeholder={isCash ? "Transaction ID (optional)" : "Transaction ID"}
                      required={!isCash}
                      value={form.transaction_id}
                      onChange={(e) => setForm((f) => ({ ...f, transaction_id: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="bg-[#F2F3F4] rounded-lg px-4 py-2.5"
                      required
                      value={form.payment_date}
                      onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
                    />
                    <input
                      className="bg-[#F2F3F4] rounded-lg px-4 py-2.5"
                      placeholder="Reason / remarks"
                      value={form.remarks}
                      onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    />
                    <input
                      type="file"
                      className="bg-[#F2F3F4] rounded-lg px-4 py-2.5 md:col-span-2"
                      required={!isCash}
                      onChange={(e) => setForm((f) => ({ ...f, payment_proof: e.target.files?.[0] || null }))}
                    />
                    <button type="submit" className="px-6 py-2 bg-[#DD4342] text-white rounded-lg text-sm w-fit">
                      Submit Payment
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex flex-shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[24px] font-semibold">Invoices</h1>
        {isVendor ? (
          <div className="flex items-center gap-3">
            <CustomDropdown
              options={projectNameOptions}
              value={selectedProjectName}
              onChange={(name) => {
                if (!name) {
                  setScopeId(null);
                  const next = new URLSearchParams(searchParams);
                  next.delete("project_id");
                  setSearchParams(next, { replace: true });
                  return;
                }
                const s = scopes.find((x) => x.project_name === name);
                if (s) onScopeChange(s.project_id);
              }}
              placeholder="Project Name"
              styleType="header"
              className="w-[180px] sm:w-[200px]"
            />
            <div className="relative w-[150px] sm:w-[170px]" ref={showEntriesDropdownRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEntriesOpen((o) => !o);
                }}
                className="flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border-0 bg-[#E8E8E8] px-3 py-2 font-gantari text-[14px] font-semibold outline-none transition-all"
              >
                <span
                  className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedShowEntries === "" ? "text-[#8B8B8B]" : "text-[#353535]"}`}
                >
                  {selectedShowEntries === "" ? (
                    SHOW_ENTRIES_PLACEHOLDER
                  ) : (
                    <>
                      <span className="text-[14px]">{SHOW_ENTRIES_SELECTED_PREFIX}</span>{" "}
                      <span className="font-semibold">{selectedEntriesRange.label}</span>
                    </>
                  )}
                </span>
                <img
                  src={ArrowDown}
                  alt=""
                  className={`h-3 w-3 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""} ${selectedShowEntries === "" ? "opacity-60 grayscale" : "opacity-90"}`}
                  aria-hidden
                />
              </button>
              {showEntriesOpen ? (
                <div className="absolute left-0 right-auto top-full z-[200] mt-1 w-full overflow-hidden rounded-md border border-[#E0E0E0] bg-[#FFFFFF] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]">
                  <div
                    ref={showEntriesDropdownContentRef}
                    className="custom-scrollbar max-h-[168px] overflow-y-auto"
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedShowEntries("");
                        setShowEntriesOpen(false);
                      }}
                      className="w-full cursor-pointer bg-[#FFFFFF] px-4 py-2 text-left font-gantari text-[14px] text-[#8B8B8B] transition-colors hover:bg-[#F2F2F2] hover:text-[#353535]"
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
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2 text-left font-gantari text-[14px] font-normal transition-colors ${
                            isChosen
                              ? "bg-[#F2F2F2] text-[#353535]"
                              : "bg-transparent text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535]"
                          }`}
                        >
                          <span className="min-w-0 truncate">{opt.label}</span>
                          {isChosen ? (
                            <svg
                              className="h-4 w-4 shrink-0 text-[#353535]"
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
              ) : null}
            </div>
          </div>
        ) : (
          <select
            className="min-w-[280px] rounded-lg bg-[#E8E8E8] px-4 py-2 text-sm"
            value={scopeId || ""}
            onChange={(e) => onScopeChange(Number(e.target.value))}
          >
            {!scopes.length ? <option value="">No projects</option> : null}
            {scopes.map((s) => (
              <option key={s.project_id} value={s.project_id}>
                {s.project_name}
              </option>
            ))}
          </select>
        )}
      </div>
      {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
      {loading ? (
        <p className="text-[#666]">Loading invoices...</p>
      ) : isCommercial ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {renderList(clientInvoices, "Client Side (Receivables)")}
          {renderList(vendorInvoices, "Vendor Side (Payables)")}
        </div>
      ) : (
        renderList(vendorInvoicesWindow, "Vendor Side (Payables)")
      )}
    </div>
  );
}
