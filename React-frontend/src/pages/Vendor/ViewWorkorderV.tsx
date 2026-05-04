import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import api from "../../lib/api";

interface WorkOrder {
  id: number;
  proposal_id?: number;
  project_name: string;
  vendor_name: string;
  bid_amount: string;
  currency?: string;
  amount_aed?: number;
  timeline: string;
  status: string;
  vendor_address?: string;
  po_date?: string;
  po_number?: string;
  project_location?: string;
  work_description?: string;
  scope_of_work?: string;
  project_involves?: string;
  deliverables?: string;
  terms_and_conditions?: string;
  payment_terms?: string;
  additional_terms?: string;
  exclusions?: string;
  company_sign_name?: string;
  company_sign_designation?: string;
  company_sign_date?: string;
  company_signature?: string;
  vendor_sign_name?: string;
  vendor_sign_designation?: string;
  vendor_sign_date?: string;
  vendor_signature?: string;
}

export default function ViewWorkorderV() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as { selectedWO?: WorkOrder | null };
  const initialWO: WorkOrder | null = state.selectedWO || null;
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(initialWO);

  const renderRichText = (html?: string) => {
    if (!html) return null;
    return (
      <div
        className="prose prose-sm max-w-none text-[#353535] [&_table]:w-full [&_table]:border-collapse [&_table]:text-[14px] [&_th]:border [&_td]:border [&_th]:border-[#AEACAC52] [&_td]:border-[#AEACAC52] [&_th]:bg-white [&_th]:font-semibold [&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const mapApiToWorkOrder = (r: Record<string, unknown>): WorkOrder => {
    const asStr = (v: unknown) => (v == null ? "" : String(v));
    const asNum = (v: unknown) => (typeof v === "number" ? v : Number(v || 0));
    return {
      id: asNum(r.id),
      proposal_id: r.proposal_id == null ? undefined : asNum(r.proposal_id),
      project_name: asStr(r.project_name),
      vendor_name: asStr(r.vendor_name),
      bid_amount: `${asStr(r.currency) || "AED"} ${asStr(r.amount_aed) || "0"}`,
      currency: asStr(r.currency) || "AED",
      amount_aed: asNum(r.amount_aed),
      timeline: asStr(r.duration) || "TBD",
      status: asStr(r.status) || "Created",
      vendor_address: asStr(r.vendor_address) || undefined,
      po_date: asStr(r.po_date) || undefined,
      po_number: asStr(r.po_number) || undefined,
      project_location: asStr(r.project_location) || undefined,
      work_description: asStr(r.work_description) || undefined,
      scope_of_work: asStr(r.scope_of_work) || undefined,
      project_involves: asStr(r.project_involves) || undefined,
      deliverables: asStr(r.deliverables) || undefined,
      terms_and_conditions: asStr(r.terms_and_conditions) || undefined,
      payment_terms: asStr(r.payment_terms) || undefined,
      additional_terms: asStr(r.additional_terms) || undefined,
      exclusions: asStr(r.exclusions) || undefined,
      company_sign_name: asStr(r.company_sign_name) || undefined,
      company_sign_designation: asStr(r.company_sign_designation) || undefined,
      company_sign_date: asStr(r.company_sign_date) || undefined,
      company_signature: asStr(r.company_signature) || undefined,
      vendor_sign_name: asStr(r.vendor_sign_name) || undefined,
      vendor_sign_designation: asStr(r.vendor_sign_designation) || undefined,
      vendor_sign_date: asStr(r.vendor_sign_date) || undefined,
      vendor_signature: asStr(r.vendor_signature) || undefined,
    };
  };

  useEffect(() => {
    const id = Number(initialWO?.id || 0);
    if (!id) return;
    api
      .get<{ success?: boolean; work_order?: Record<string, unknown> }>(
        `/api/workorders/${id}`,
      )
      .then((res) => {
        if (res.data?.work_order) {
          setSelectedWO(mapApiToWorkOrder(res.data.work_order));
        }
      })
      .catch((err) => {
        console.error("Failed to load work order details", err);
      });
  }, [initialWO?.id]);

  const handleStatusChange = (newStatus: string) => {
    if (!selectedWO) return;
    const parsedAmount = Number((selectedWO.bid_amount || "").replace(/[^\d.]/g, ""));
    const amountRaw = selectedWO.amount_aed ?? (Number.isFinite(parsedAmount) ? parsedAmount : 0);
    const payload = {
      proposalId: selectedWO.proposal_id ?? null,
      projectName: selectedWO.project_name || "",
      vendorName: selectedWO.vendor_name || "",
      vendorAddress: selectedWO.vendor_address || "",
      poDate: selectedWO.po_date || null,
      poNumber: selectedWO.po_number || "",
      projectLocation: selectedWO.project_location || "",
      workDescription: selectedWO.work_description || "",
      scopeOfWork: selectedWO.scope_of_work || "",
      projectInvolves: selectedWO.project_involves || "",
      deliverables: selectedWO.deliverables || "",
      currency: selectedWO.currency || "AED",
      amountAED: amountRaw,
      duration: selectedWO.timeline === "TBD" ? "" : selectedWO.timeline || "",
      termsAndConditions: selectedWO.terms_and_conditions || "",
      paymentTerms: selectedWO.payment_terms || "",
      additionalTerms: selectedWO.additional_terms || "",
      status: newStatus,
    };
    try {
      api
        .put(`/api/workorders/${selectedWO.id}`, payload)
        .then(() => {
          setSelectedWO((prev) => (prev ? { ...prev, status: newStatus } : prev));
          alert(`Work Order has been ${newStatus}!`);
          navigate("/v/workorder");
        })
        .catch((error) => {
          console.error("Failed to update status", error);
          alert("Failed to update work order status.");
        });
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  if (!selectedWO) {
    return (
      <div className="flex-1 space-y-10 px-2 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-shrink-0 px-5 pt-2">
          <div className="group relative inline-flex shrink-0">
            <button
              onClick={() => navigate("/v/workorder")}
              className="p-2 rounded-md bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer hover:opacity-90 shrink-0"
            >
              <img src={backIcon} alt="Back" className="w-5 h-5" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                  Go Back
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="py-20 text-center text-[#616161] font-gantari">
          <p className="text-lg font-semibold mb-1 text-[#353535]">
            No work order found
          </p>
          <p className="text-sm">The work order details could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col min-h-full bg-white font-gantari overflow-y-auto w-full pb-10 px-5 py-2">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0 mt-4">
        <div className="group relative inline-flex shrink-0">
          <button
            type="button"
            onClick={() => navigate("/v/workorder")}
            className="p-2 rounded-md bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer hover:opacity-90 shrink-0"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
            <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
            <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
              <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                Go Back
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-[24px] font-semibold text-[#000000]">
            Work Order Details
          </h1>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          {selectedWO.status === "Created" ? (
            <>
              <button
                onClick={() => handleStatusChange("Accepted")}
                className="px-6 py-2 rounded-md font-semibold text-white bg-[#22C55E] hover:bg-[#1CA84E] transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => handleStatusChange("Rejected")}
                className="px-6 py-2 rounded-md font-semibold text-[#DD4342] bg-white border border-[#DD4342] hover:bg-[#FFF5F5] transition-colors"
              >
                Reject
              </button>
            </>
          ) : (
            <span className={`px-4 py-1.5 rounded-lg text-[14px] font-semibold ${
              selectedWO.status === "Accepted" ? "bg-[#E6F4EA] text-[#1E8E3E]" : "bg-[#FCE8E6] text-[#D93025]"
            }`}>
              {selectedWO.status}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 px-2 min-w-0 space-y-8 mx-auto w-full pt-4">
        {/* Header Info Banner */}
        <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md py-4 sm:py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-y-4">
          <div className="px-4 sm:px-6 sm:border-r border-[#AEACAC52]">
            <p className="text-base sm:text-[18px] font-bold text-[#020202] mb-1 tracking-wider text-center">
              Project
            </p>
            <p className="text-[#616161] text-sm sm:text-[16px] truncate text-center uppercase tracking-wide">
              {selectedWO.project_name || "—"}
            </p>
          </div>
          <div className="px-4 sm:px-6 sm:border-r border-[#AEACAC52]">
            <p className="text-base sm:text-[18px] font-bold text-[#020202] mb-1 tracking-wider text-center">
              Vendor
            </p>
            <p className="text-[#616161] text-sm sm:text-[16px] truncate text-center uppercase tracking-wide">
              {selectedWO.vendor_name || "—"}
            </p>
          </div>
          <div className="px-4 sm:px-6 lg:border-r border-[#AEACAC52]">
            <p className="text-base sm:text-[18px] font-bold text-[#020202] mb-1 tracking-wider text-center">
              PO Number
            </p>
            <p className="text-[#616161] text-sm sm:text-[16px] truncate text-center">
              {selectedWO.po_number || "—"}
            </p>
          </div>
          <div className="px-4 sm:px-6 sm:border-r border-[#AEACAC52] last:border-r-0">
            <p className="text-base sm:text-[18px] font-bold text-[#020202] mb-1 tracking-wider text-center">
              PO Date
            </p>
            <p className="text-[#616161] text-sm sm:text-[16px] text-center tracking-wide">
              {selectedWO.po_date || "—"}
            </p>
          </div>
          <div className="px-4 sm:px-6 last:border-r-0">
            <p className="text-base sm:text-[18px] font-bold text-[#020202] mb-1 tracking-wider text-center">
              Amount
            </p>
            <p className="text-[#616161] text-sm sm:text-[16px] text-center">
              {selectedWO.bid_amount || "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-md border border-[#AEACAC52] p-6">
          <div>
            <p className="text-[12px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Project Location</p>
            <p className="text-[15px] font-medium text-[#353535]">{selectedWO.project_location || "—"}</p>
          </div>
          <div>
            <p className="text-[12px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Timeline</p>
            <div className="text-[15px] font-medium text-[#353535]">
              {selectedWO.timeline?.includes("<")
                ? renderRichText(selectedWO.timeline)
                : (selectedWO.timeline || "—")}
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="text-[12px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Vendor Address</p>
            <p className="text-[14px] whitespace-pre-wrap text-[#353535] leading-relaxed bg-[#F2F2F2] p-3 rounded-md">{selectedWO.vendor_address || "—"}</p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6">
          {selectedWO.work_description && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Work Description
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                {renderRichText(selectedWO.work_description)}
              </div>
            </div>
          )}

          {selectedWO.scope_of_work && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Scope of Work
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                {renderRichText(selectedWO.scope_of_work)}
              </div>
            </div>
          )}

          {selectedWO.project_involves && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Project Involves
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                {renderRichText(selectedWO.project_involves)}
              </div>
            </div>
          )}

          {selectedWO.deliverables && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Deliverables
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                {renderRichText(selectedWO.deliverables)}
              </div>
            </div>
          )}

          {selectedWO.terms_and_conditions && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Terms & Conditions
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                {renderRichText(selectedWO.terms_and_conditions)}
              </div>
            </div>
          )}

          {selectedWO.payment_terms && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Payment Terms
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                {renderRichText(selectedWO.payment_terms)}
              </div>
            </div>
          )}

          {selectedWO.additional_terms && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Additional Terms
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                {renderRichText(selectedWO.additional_terms)}
              </div>
            </div>
          )}

          {selectedWO.exclusions && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Exclusions
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                {renderRichText(selectedWO.exclusions)}
              </div>
            </div>
          )}

          {/* Signatures Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-[#AEACAC52]">
            {/* Company Signature */}
            <div className="space-y-4">
              <h3 className="font-bold text-[14px] uppercase tracking-wide text-[#000000]">
                Company
              </h3>
              <div className="h-32 border border-[#AEACAC52] rounded-md bg-[#F2F2F2] flex items-center justify-center overflow-hidden p-2">
                {selectedWO.company_signature ? (
                  <img
                    src={selectedWO.company_signature}
                    alt="Company Signature"
                    className="h-full object-contain"
                  />
                ) : (
                  <span className="text-gray-400 italic text-sm">No signature</span>
                )}
              </div>
              <div className="space-y-1 text-sm font-gantari">
                <div className="flex border-b border-gray-200 py-1">
                  <span className="w-24 text-gray-500">Name:</span>
                  <span className="font-semibold">{selectedWO.company_sign_name || "—"}</span>
                </div>
                <div className="flex border-b border-gray-200 py-1">
                  <span className="w-24 text-gray-500">Designation:</span>
                  <span className="font-semibold">{selectedWO.company_sign_designation || "—"}</span>
                </div>
                <div className="flex border-b border-gray-200 py-1">
                  <span className="w-24 text-gray-500">Date:</span>
                  <span className="font-semibold">{selectedWO.company_sign_date || "—"}</span>
                </div>
              </div>
            </div>

            {/* Vendor Signature */}
            <div className="space-y-4">
              <h3 className="font-bold text-[14px] uppercase tracking-wide text-[#000000]">
                Vendor
              </h3>
              <div className="h-32 border border-[#AEACAC52] rounded-md bg-[#F2F2F2] flex items-center justify-center overflow-hidden p-2">
                {selectedWO.vendor_signature ? (
                  <img
                    src={selectedWO.vendor_signature}
                    alt="Vendor Signature"
                    className="h-full object-contain"
                  />
                ) : (
                  <span className="text-gray-400 italic text-sm">No signature</span>
                )}
              </div>
              <div className="space-y-1 text-sm font-gantari">
                <div className="flex border-b border-gray-200 py-1">
                  <span className="w-24 text-gray-500">Name:</span>
                  <span className="font-semibold">{selectedWO.vendor_sign_name || "—"}</span>
                </div>
                <div className="flex border-b border-gray-200 py-1">
                  <span className="w-24 text-gray-500">Designation:</span>
                  <span className="font-semibold">{selectedWO.vendor_sign_designation || "—"}</span>
                </div>
                <div className="flex border-b border-gray-200 py-1">
                  <span className="w-24 text-gray-500">Date:</span>
                  <span className="font-semibold">{selectedWO.vendor_sign_date || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
