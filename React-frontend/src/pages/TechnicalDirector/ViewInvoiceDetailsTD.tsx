import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { IoClose } from "react-icons/io5";
import api from "../../lib/api";

type PaymentRow = {
  id: number;
  payment_mode: string;
  transaction_id?: string;
  amount_paid: number;
  payment_date: string;
  remarks?: string;
  payment_proof?: string;
  approval_status: string;
};

type InvoiceViewDetail = {
  id: number;
  invoice_number: string;
  date_str: string;
  due_str: string;
  client_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  project_name?: string;
  project_id?: string | null;
  milestone_name?: string;
  line_description?: string;
  qty?: number;
  unit_price?: number;
  line_amount?: number;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  gst_percent?: number;
  payment_method_label?: string;
  upi_id?: string;
  bank_name?: string;
  account_no?: string;
  ifsc?: string;
  status_pending?: boolean;
  status_paid?: boolean;
  note_due_days?: string;
  status?: string;
  side?: string;
  contract_id?: number | null;
  proposal_id?: number | null;
  milestone_id?: number | null;
  created_at?: string | null;
  payments?: PaymentRow[];
};

function formatRs(n: unknown) {
  const v = typeof n === "number" ? n : parseFloat(String(n ?? 0));
  const x = Number.isFinite(v) ? v : 0;
  return `Rs. ${x.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      let msg = "PDF is not available for this invoice yet.";
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
    toast.error("Could not download file. Check your connection.");
  }
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-3 gap-y-0.5 text-[14px] font-Gantari py-1.5">
      <span className="text-[#666666] font-medium shrink-0">{label}</span>
      <span className="text-[#353535] break-words">{value || "—"}</span>
    </div>
  );
}

type ApiInvoiceResponse = {
  success?: boolean;
  message?: string;
  view?: InvoiceViewDetail;
};

export default function ViewInvoiceDetailsTD() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const projectId = searchParams.get("project_id") || "";
  const [detail, setDetail] = useState<InvoiceViewDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const idNum = invoiceId ? parseInt(invoiceId, 10) : NaN;

  useEffect(() => {
    if (!Number.isFinite(idNum) || !projectId) {
      setLoading(false);
      setDetail(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<ApiInvoiceResponse>(
          `/api/payment-milestones/new-swiftbim/invoices/${idNum}`,
          { params: { project_id: projectId } },
        );
        if (cancelled) return;
        if (!data.success || !data.view) {
          toast.error(data.message || "Could not load invoice");
          setDetail(null);
          return;
        }
        setDetail(data.view);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            err &&
            typeof err === "object" &&
            "response" in err &&
            err.response &&
            typeof err.response === "object" &&
            "data" in err.response &&
            err.response.data &&
            typeof err.response.data === "object" &&
            "message" in err.response.data
              ? String((err.response.data as { message?: string }).message)
              : "Could not load invoice";
          toast.error(msg);
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [idNum, projectId]);

  const backToProjects = () => {
    const st = location.state as { returnTo?: string } | null;
    navigate(st?.returnTo || "/td/projects");
  };

  const downloadInvoicePdf = () => {
    if (!detail) return;
    const safe = String(detail.invoice_number).replace(/[^\w-]+/g, "_");
    void downloadAuthedPdf(
      `/api/payment-milestones/new-swiftbim/invoices/${detail.id}/pdf?project_id=${projectId}`,
      `${safe}.pdf`,
    );
  };

  const downloadPaymentPdf = (pay: PaymentRow) => {
    if (!detail) return;
    const safe = `${detail.invoice_number}-payment-${pay.id}`.replace(
      /[^\w-]+/g,
      "_",
    );
    void downloadAuthedPdf(
      `/api/invoices/${detail.id}/payments/${pay.id}/pdf`,
      `${safe}.pdf`,
    );
  };

  const d = detail;
  const gst = d?.gst_percent ?? 18;
  const pays = d?.payments ?? [];

  if (!projectId && !loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate("/td/projects")}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-[#353535] bg-[#F2F2F2] shrink-0"
            aria-label="Back"
          >
            <IoClose className="text-2xl" aria-hidden />
          </button>
          <h1 className="font-Gantari font-semibold text-[20px] text-[#000000]">
            View Invoice details
          </h1>
        </div>
        <p className="font-Gantari text-[14px] text-[#666666]">
          Missing project context. Open this page from{" "}
          <span className="font-semibold">Projects → Payment Milestones → View Invoice</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
        <div className="max-w-5xl mx-auto w-full pb-8">
          <div className="mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 sm:gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={backToProjects}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-sm sm:text-[14px] text-[#353535] transition-colors bg-[#F2F2F2] shrink-0"
              aria-label="Close"
            >
              <IoClose className="text-2xl" aria-hidden />
            </button>
            <h1 className="font-Gantari font-semibold text-[22px] sm:text-[24px] text-[#000000] text-center leading-snug min-w-0 px-1">
              View Invoice details
            </h1>
            <div className="justify-self-end shrink-0">
              {d ? (
                <button
                  type="button"
                  onClick={() => downloadInvoicePdf()}
                  className="border border-slate-300 text-[#353535] px-3 sm:px-4 py-1.5 rounded-md text-[14px] font-Gantari hover:bg-slate-50 whitespace-nowrap"
                >
                  Download invoice (PDF)
                </button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DD4342]" />
            </div>
          ) : !Number.isFinite(idNum) || !d ? (
            <p className="font-Gantari text-[14px] text-[#999999]">Invoice not found.</p>
          ) : (
            <div className="text-[14px] font-Gantari text-[#353535] space-y-4">
              <header className="rounded-lg bg-[#F2F2F2] px-4 py-3">
                <p className="font-Gantari font-bold text-[14px] text-[#000000]">SWIFTERZ</p>
                <p className="text-[14px] text-[#666666] font-Gantari">
                  Smart Construction & BIM Solutions
                </p>
              </header>

              <section className="rounded-lg bg-[#F2F2F2] px-4 py-3">
                <p className="font-Gantari font-semibold text-[#353535] text-[16px] mb-2">Invoice</p>
                <DetailLine label="Invoice no." value={d.invoice_number} />
                <DetailLine label="Date" value={d.date_str} />
                <DetailLine label="Due date" value={d.due_str} />
                <DetailLine label="Record status" value={d.status ?? ""} />
                <DetailLine label="Side" value={d.side ?? ""} />
                {d.milestone_name ? (
                  <DetailLine label="Milestone" value={d.milestone_name} />
                ) : null}
                {d.project_name ? (
                  <DetailLine label="Project" value={d.project_name} />
                ) : null}
                {d.created_at ? <DetailLine label="Created" value={String(d.created_at)} /> : null}
              </section>

              <div className="rounded-lg bg-[#F2F2F2] px-4 py-3">
                <p className="font-Gantari font-semibold text-[#353535] text-[16px] mb-2">Bill to</p>
                <DetailLine label="Client name" value={d.client_name ?? ""} />
                <DetailLine label="Company" value={d.company_name ?? ""} />
                <DetailLine label="Email" value={d.email ?? ""} />
                <DetailLine label="Phone" value={d.phone ?? ""} />
                <DetailLine label="Address" value={d.address ?? ""} />
              </div>

              <div className="rounded-lg bg-[#F2F2F2] px-4 py-3">
                <p className="font-Gantari font-semibold text-[#353535] text-[16px] mb-2">Line items</p>
                <div className="rounded-lg border border-slate-200 overflow-x-auto font-Gantari bg-white">
                  <table className="w-full min-w-[640px] table-fixed border-collapse text-center">
                    <colgroup>
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "20%" }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100">
                        <th className="px-5 py-4 align-middle text-center text-[16px] font-semibold text-[#353535]">
                          Sl.No
                        </th>
                        <th className="px-5 py-4 align-middle text-center text-[16px] font-semibold text-[#353535]">
                          Description
                        </th>
                        <th className="px-5 py-4 align-middle text-center text-[16px] font-semibold text-[#353535]">
                          Qty
                        </th>
                        <th className="px-5 py-4 align-middle text-center text-[16px] font-semibold text-[#353535]">
                          Unit
                        </th>
                        <th className="px-5 py-4 align-middle text-center text-[16px] font-semibold text-[#353535]">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white">
                        <td className="px-5 py-4 align-middle text-center text-[14px] text-[#353535] tabular-nums">
                          1
                        </td>
                        <td className="px-5 py-4 align-middle text-center text-[14px] text-[#353535] break-words">
                          {d.line_description || "—"}
                        </td>
                        <td className="px-5 py-4 align-middle text-center text-[14px] text-[#353535]">
                          {String(d.qty ?? 1)}
                        </td>
                        <td className="px-5 py-4 align-middle text-center text-[14px] text-[#353535] whitespace-nowrap">
                          {formatRs(d.unit_price)}
                        </td>
                        <td className="px-5 py-4 align-middle text-center text-[14px] font-medium text-[#353535] whitespace-nowrap">
                          {formatRs(d.line_amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg bg-[#F2F2F2] px-4 py-3">
                <p className="font-Gantari font-semibold text-[#353535] text-[16px] mb-2">Summary</p>
                <div className="space-y-1 text-[14px] font-Gantari">
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Subtotal</span>
                    <span className="text-[#353535] font-medium">{formatRs(d.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Tax (GST {gst}%)</span>
                    <span className="text-[#353535] font-medium">{formatRs(d.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-[#353535] font-semibold">Total</span>
                    <span className="text-[#353535] font-bold">{formatRs(d.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* <div className="rounded-lg bg-[#F2F2F2] px-4 py-3">
                <p className="font-Gantari font-semibold text-[#353535] text-[16px] mb-2">
                  Payment details (Swifterz)
                </p>
                <DetailLine label="Methods" value={d.payment_method_label ?? ""} />
                <DetailLine label="UPI ID" value={d.upi_id ?? ""} />
                <DetailLine label="Bank name" value={d.bank_name ?? ""} />
                <DetailLine label="Account no." value={d.account_no ?? ""} />
                <DetailLine label="IFSC" value={d.ifsc ?? ""} />
              </div> */}

              <div className="rounded-lg bg-[#F2F2F2] px-4 py-3">
                <p className="font-Gantari font-semibold text-[#353535] text-[16px] mb-2">
                  Payment status (invoice)
                </p>
                <p className="text-[14px] font-Gantari text-[#353535]">
                  {d.status_paid ? "Paid" : d.status_pending ? "Pending" : "—"}
                </p>
              </div>

             

              {pays.length > 0 ? (
                <div className="rounded-lg bg-[#F2F2F2] px-4 py-3">
                  <p className="font-Gantari font-semibold text-[#353535] text-[16px] mb-2">
                    Payment records
                  </p>
                  <div className="space-y-3">
                    {pays.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border border-slate-200 p-3 text-[14px] font-Gantari bg-white"
                      >
                        <DetailLine label="Record ID" value={String(p.id)} />
                        <DetailLine label="Mode" value={p.payment_mode} />
                        <DetailLine label="Transaction ID" value={p.transaction_id ?? ""} />
                        <DetailLine label="Amount" value={formatRs(p.amount_paid)} />
                        <DetailLine
                          label="Payment date"
                          value={p.payment_date != null ? String(p.payment_date) : ""}
                        />
                        <DetailLine label="Remarks" value={p.remarks ?? ""} />
                        <DetailLine label="Approval" value={p.approval_status} />
                        <div className="pt-2 mt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => void downloadPaymentPdf(p)}
                            className="text-[#DD4342] font-medium underline text-[14px]"
                          >
                            Download payment receipt (PDF)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
                <div className="rounded-lg bg-[#F2F2F2] px-4 py-3">
                <p className="font-Gantari font-semibold text-[#353535] text-[16px] mb-2">Notes</p>
                <ul className="list-disc list-inside text-[14px] text-[#666666] font-Gantari space-y-1">
                  <li>Payment is due within {d.note_due_days ?? "30"} days of the invoice date.</li>
                  <li>Late payments may incur additional charges.</li>
                  <li>This invoice is system-generated.</li>
                </ul>
              </div>
              <div className="rounded-lg bg-[#F2F2F2] px-4 py-3">
                <p className="text-[14px] text-[#888888] font-Gantari">
                  Authorized by: Swifterz Team
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
