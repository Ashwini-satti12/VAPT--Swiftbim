import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../lib/api";

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

  useEffect(() => {
    api
      .get<Scope[]>("/api/payment-milestones/new-swiftbim/scopes")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setScopes(list);
        const q = Number(searchParams.get("project_id") || 0);
        const s = list.find((x) => x.project_id === q) || list[0];
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

  const renderList = (list: Invoice[], sideTitle: string) => (
    <div>
      <h3 className="font-semibold text-[18px] mb-3">{sideTitle}</h3>
      {!list.length ? (
        <p className="text-[#999]">No invoices generated yet.</p>
      ) : (
        <div className="space-y-4">
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
                  <div className="space-y-1">
                    <p className="font-bold">Invoice number : {inv.invoice_number}</p>
                    <p>Status : {st}</p>
                    <p>Amount paid : {Number(inv.invoice_total || 0).toFixed(2)}</p>
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
                    <button
                      type="button"
                      className="h-[35px] px-4 bg-[#E8E8E8] text-[#353535] rounded-md text-sm"
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
                      Download
                    </button>
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[24px] font-semibold">Invoices</h1>
        <select
          className="bg-[#E8E8E8] rounded-lg px-4 py-2 text-sm min-w-[280px]"
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
        renderList(vendorInvoices, "Vendor Side (Payables)")
      )}
    </div>
  );
}
