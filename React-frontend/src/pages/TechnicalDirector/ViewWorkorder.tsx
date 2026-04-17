import { useLocation, useNavigate } from "react-router-dom";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";

interface WorkOrder {
  id: number;
  proposal_id?: number;
  project_name: string;
  vendor_name: string;
  bid_amount: string;
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
}

export default function ViewWorkorder() {
  const location = useLocation();
  const navigate = useNavigate();
  const state: any = location.state || {};
  const selectedWO: WorkOrder | null = state.selectedWO || null;

  if (!selectedWO) {
    return (
      <div className="flex-1 space-y-10 px-2 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-shrink-0 px-5 pt-2">
          <div className="group relative inline-flex shrink-0">
            <button
              onClick={() => navigate("/td/workorder")}
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
            onClick={() => navigate("/td/workorder")}
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

        <div className="flex-1 flex items-center justify-center gap-4">
          <h1 className="text-[24px] font-semibold text-[#000000]">
            Work Order Details
          </h1>
        </div>
        <div className="shrink-0 min-w-[50px]"></div>
      </div>

      <div className="flex-1 px-2 min-w-0 space-y-8 max-w-4xl mx-auto w-full pt-4">
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
            <p className="text-[15px] font-medium text-[#353535]">{selectedWO.timeline || "—"}</p>
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
                <p className="text-[14px] whitespace-pre-wrap text-[#353535] font-gantari leading-relaxed">{selectedWO.work_description}</p>
              </div>
            </div>
          )}

          {selectedWO.scope_of_work && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Scope of Work
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                <p className="text-[14px] whitespace-pre-wrap text-[#353535] font-gantari leading-relaxed">{selectedWO.scope_of_work}</p>
              </div>
            </div>
          )}

          {selectedWO.project_involves && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Project Involves
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                <p className="text-[14px] whitespace-pre-wrap text-[#353535] font-gantari leading-relaxed">{selectedWO.project_involves}</p>
              </div>
            </div>
          )}

          {selectedWO.deliverables && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Deliverables
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                <p className="text-[14px] whitespace-pre-wrap text-[#353535] font-gantari leading-relaxed">{selectedWO.deliverables}</p>
              </div>
            </div>
          )}

          {selectedWO.terms_and_conditions && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Terms & Conditions
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                <p className="text-[14px] whitespace-pre-wrap text-[#353535] font-gantari leading-relaxed">{selectedWO.terms_and_conditions}</p>
              </div>
            </div>
          )}

          {selectedWO.payment_terms && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Payment Terms
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                <p className="text-[14px] whitespace-pre-wrap text-[#353535] font-gantari leading-relaxed">{selectedWO.payment_terms}</p>
              </div>
            </div>
          )}

          {selectedWO.additional_terms && (
            <div className="space-y-4">
              <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                Additional Terms
              </h2>
              <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-[#AEACAC52]">
                <p className="text-[14px] whitespace-pre-wrap text-[#353535] font-gantari leading-relaxed">{selectedWO.additional_terms}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
