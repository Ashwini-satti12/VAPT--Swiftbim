import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
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
}

export default function WorkorderV() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    api
      .get<{ success?: boolean; work_orders?: any[] }>("/api/workorders")
      .then((res) => {
        const rows = res.data?.work_orders || [];
        const mapped: WorkOrder[] = rows.map((r) => ({
          id: Number(r.id),
          proposal_id: r.proposal_id ?? undefined,
          project_name: r.project_name || "",
          vendor_name: r.vendor_name || "",
          bid_amount: `${r.currency || "AED"} ${r.amount_aed ?? 0}`,
          currency: r.currency || "AED",
          amount_aed: Number(r.amount_aed ?? 0),
          timeline: r.duration || "TBD",
          status: r.status || "Created",
          vendor_address: r.vendor_address,
          po_date: r.po_date,
          po_number: r.po_number,
          project_location: r.project_location,
          work_description: r.work_description,
          scope_of_work: r.scope_of_work,
          project_involves: r.project_involves,
          deliverables: r.deliverables,
          terms_and_conditions: r.terms_and_conditions,
          payment_terms: r.payment_terms,
          additional_terms: r.additional_terms,
        }));
        setWorkOrders(mapped);
      })
      .catch((err) => {
        console.error("Failed to load work orders", err);
        setWorkOrders([]);
      });
  }, []);

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
