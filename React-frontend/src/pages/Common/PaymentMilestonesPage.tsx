import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import Arrow from "../../assets/ProjectManager/MyTask/arrow.svg";

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

export default function PaymentMilestonesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCommercial = location.pathname.startsWith("/td");

  const [scopes, setScopes] = useState<Scope[]>([]);
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

  const renderRows = (title: string, list: Milestone[]) => (
    <div className="border border-[#AEACAC52] rounded-xl p-4 bg-white">
      <h3 className="font-semibold text-[18px] text-[#000000] mb-3">{title}</h3>
      {list.length === 0 ? (
        <p className="text-[14px] text-[#666]">No milestones available.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
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
                <div className="text-sm text-[#353535] space-y-1">
                  <p>Terms : {m.terms || "—"}</p>
                  <p>Timeline : {m.timeline || "—"}</p>
                  <p className="font-bold">Amount : {Number(m.amount || 0).toFixed(2)}</p>
                </div>
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
                      {creatingId === m.id ? "Generating..." : "Generate Invoice"}
                    </button>
                  ) : (
                    <span className="text-xs italic text-[#999]">Awaiting invoice generation</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h1 className="text-[24px] font-semibold">Payment Milestones</h1>
        {showProjectCards ? (
          <div className="text-sm text-[#666]">{scopes.length} Projects</div>
        ) : (
          <div className="relative group">
            <button
              type="button"
              onClick={backToProjects}
              className="h-10 w-10 inline-flex items-center justify-center rounded-md bg-[#E8E8E8] text-[#353535] hover:bg-[#DFDFDF] transition-colors"
              aria-label="Back to projects"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="pointer-events-none absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-[#353535] px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              Back to projects
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
        {loading ? (
          <p className="text-[#666]">Loading milestones...</p>
        ) : showProjectCards ? (
          (() => {
            const searchQueryParam = searchParams.get('q')?.toLowerCase() || "";
            const filteredScopes = scopes.filter(s => !searchQueryParam || (s.project_name || "").toLowerCase().includes(searchQueryParam));
            return filteredScopes.length === 0 ? (
            <p className="text-[#666]">No projects available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredScopes.map((s) => {
                const isActive = scope?.project_id === s.project_id;
                return (
                  <button
                    key={s.project_id}
                    type="button"
                    onClick={() => openProjectDetails(s.project_id)}
                    className={`text-left border rounded-xl p-5 bg-white hover:shadow-sm transition-all ${
                      isActive ? "border-[#DD4342]" : "border-[#AEACAC52]"
                    }`}
                  >
                    <h3 className="text-[18px] font-medium text-[#353535] break-words line-clamp-2 min-h-[56px]">
                      {s.project_name}
                    </h3>
                    <div className="mt-4 pt-4 border-t border-[#AEACAC52] flex items-center justify-between">
                      <span className="inline-flex items-center bg-[#FFEAD6] text-[#D08A3A] rounded-md px-3 py-1 text-[14px] font-semibold">
                        View Milestones
                      </span>
                      <span className="group inline-flex items-center text-[#8B8B8B] text-[14px] font-medium gap-2">
                        Details
                        <img
                          src={Arrow}
                          alt="arrow"
                          className="w-2.5 h-2.5 transition-all duration-200 group-hover:brightness-0 group-hover:invert-[20%]"
                        />
                      </span>
                    </div>
                  </button>
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
          renderRows(isCommercial ? "Client Side (Receivables)" : "Vendor Side (Payables)", isCommercial ? clientRows : vendorRows)
        )}
      </div>
    </div>
  );
}
