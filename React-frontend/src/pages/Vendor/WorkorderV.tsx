import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";

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

export default function WorkorderV() {
  const navigate = useNavigate();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => {
    try {
      const saved = sessionStorage.getItem("mockWorkOrders");
      if (saved && saved !== "undefined" && saved !== "null") {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to parse mock work orders", error);
    }
    return [
      {
        id: 1,
        project_name: "The Oasis Retail Centre",
        vendor_name: "LetzBIM",
        bid_amount: "AED 23,456",
        timeline: "2 months",
        status: "Created",
        vendor_address: "Plot no 52, nr. SHIVE MANDIR,\nIngole Layout, Nagpur, Maharashtra, India",
        po_date: "17/04/2026",
        po_number: "PO-SW-LB-123/26",
        project_location: "Dubai, UAE",
        work_description: "Updating Revit model up to LOD 400 & LOD 500...",
        scope_of_work: "LetzBIM Scope of work: includes Performing all activities...",
        project_involves: "1. Preparation of coordinated LOD 400 BIM Model...",
        deliverables: "• RVT-LOD 400 Model\n• DWG – Shop Drawings (Civil)...",
        terms_and_conditions: "• LetzBIM staff will work as per the client's approved drawing...",
        payment_terms: "• Upon receiving the PO, 10% Advance...",
        additional_terms: "1. Non-Contact with Client\n2. Non-Solicitation...",
      },
    ];
  });

  return (
    <div className="px-1 pt-1 pb-0 space-y-8 flex flex-col h-full bg-white font-Gantari relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0 px-4 py-2">
        <h2 className="text-xl sm:text-2xl font-semibold text-[#000000]">
          Work Orders
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden mx-2 mb-2 sm:mx-0 sm:mb-0">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-white border-b border-[#AEACAC52]">
              <tr>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Sl.No
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Project Name
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Vendor Name
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Amount
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Timeline
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Status
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workOrders.length > 0 ? (
                workOrders.map((wo, index) => (
                  <tr
                    key={wo.id}
                    className={index % 2 === 1 ? "bg-[#F2F2F2]" : "bg-white"}
                  >
                    <td className="px-3 py-6 text-center text-[14px] text-[#353535]">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-6 text-center text-[14px] text-[#353535]">
                      {wo.project_name}
                    </td>
                    <td className="px-3 py-6 text-center text-[14px] text-[#353535]">
                      {wo.vendor_name}
                    </td>
                    <td className="px-3 py-6 text-center text-[14px] text-[#353535]">
                      {wo.bid_amount}
                    </td>
                    <td className="px-3 py-6 text-center text-[14px] text-[#353535]">
                      {wo.timeline}
                    </td>
                    <td className="px-3 py-6 text-center">
                      <span className={`inline-flex px-4 py-1.5 rounded-lg text-[14px] font-semibold ${
                        wo.status === "Accepted" ? "bg-[#E6F4EA] text-[#1E8E3E]" :
                        wo.status === "Rejected" ? "bg-[#FCE8E6] text-[#D93025]" :
                        "bg-[#EAF0FB] text-[#1967D2]"
                      }`}>
                        {wo.status}
                      </span>
                    </td>
                    <td className="px-3 py-6 text-center">
                      <button 
                        onClick={() => navigate("/v/view-workorder", { state: { selectedWO: wo } })}
                        className="flex items-center justify-center gap-2 px-4 py-2 mx-auto rounded-md text-[14px] bg-[#DD4342] text-white cursor-pointer hover:opacity-90"
                      >
                        <img
                          src={viewIcon}
                          alt=""
                          className="w-4 h-4 brightness-0 invert"
                        />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[#616161]">
                    No Work Orders available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
