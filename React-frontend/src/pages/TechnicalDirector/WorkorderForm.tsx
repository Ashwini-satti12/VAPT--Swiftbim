import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";

export default function WorkorderForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const state: any = location.state || {};

  const [form, setForm] = useState({
    proposalId: state?.proposal?.id || null,
    vendorName: state?.proposal?.vendor_name || "",
    vendorAddress: state?.proposal?.address || "",
    poDate: new Date().toISOString().split('T')[0],
    poNumber: "",
    projectName: state?.proposal?.project_name || "",
    projectLocation: "",
    workDescription: "",
    scopeOfWork: "",
    projectInvolves: "",
    deliverables: "",
    amountAED: state?.proposal?.bid_amount?.toString() || "",
    duration: "",
    termsAndConditions: "",
    paymentTerms: "",
    additionalTerms: "",
  });

  const fieldClass =
    "w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-white border border-[#E0E0E0] rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] focus:ring-1 focus:ring-[#AEACAC52]";
  const labelClass =
    "block text-[16px] font-Gantari font-semibold text-[#000000] mb-2";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would send data to a backend API
    // For now, we'll navigate back to the Workorder list with the new data
    navigate('/td/workorder', { state: { newWorkOrder: form } });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-white font-Gantari">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => navigate('/td/workorder')}
            className="p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer hover:opacity-80"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
          <h3 className="text-[24px] font-semibold text-[#020202]">
            Create Work Order
          </h3>
          <div className="w-10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Vendor & PO Details */}
          <div className="bg-[#F9F9F9] p-6 rounded-lg shadow-sm border border-[#AEACAC52]">
            <h4 className="text-[18px] font-bold mb-4 text-[#1A1A1A] border-b pb-2">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelClass}>Vendor Name</label>
                <input
                  type="text"
                  value={form.vendorName}
                  onChange={(e) =>
                    setForm({ ...form, vendorName: e.target.value })
                  }
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>PO Number</label>
                <input
                  type="text"
                  value={form.poNumber}
                  onChange={(e) =>
                    setForm({ ...form, poNumber: e.target.value })
                  }
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>PO Date</label>
                <input
                  type="text"
                  value={form.poDate}
                  onChange={(e) => setForm({ ...form, poDate: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Project Name</label>
                <input
                  type="text"
                  value={form.projectName}
                  onChange={(e) =>
                    setForm({ ...form, projectName: e.target.value })
                  }
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Project Location</label>
                <input
                  type="text"
                  value={form.projectLocation}
                  onChange={(e) =>
                    setForm({ ...form, projectLocation: e.target.value })
                  }
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className={labelClass}>Vendor Address</label>
                <textarea
                  value={form.vendorAddress}
                  onChange={(e) =>
                    setForm({ ...form, vendorAddress: e.target.value })
                  }
                  className={`${fieldClass} min-h-[80px]`}
                />
              </div>
            </div>
          </div>

          {/* Work Description & Scope */}
          <div className="bg-[#F9F9F9] p-6 rounded-lg shadow-sm border border-[#AEACAC52]">
            <h4 className="text-[18px] font-bold mb-4 text-[#1A1A1A] border-b pb-2">
              Work Scope & Description
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={labelClass}>Work Description</label>
                <textarea
                  value={form.workDescription}
                  onChange={(e) =>
                    setForm({ ...form, workDescription: e.target.value })
                  }
                  className={`${fieldClass} min-h-[100px]`}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Scope of Work</label>
                <textarea
                  value={form.scopeOfWork}
                  onChange={(e) =>
                    setForm({ ...form, scopeOfWork: e.target.value })
                  }
                  className={`${fieldClass} min-h-[100px]`}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Project Involves</label>
                <textarea
                  value={form.projectInvolves}
                  onChange={(e) =>
                    setForm({ ...form, projectInvolves: e.target.value })
                  }
                  className={`${fieldClass} min-h-[150px]`}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Deliverables</label>
                <textarea
                  value={form.deliverables}
                  onChange={(e) =>
                    setForm({ ...form, deliverables: e.target.value })
                  }
                  className={`${fieldClass} min-h-[150px]`}
                />
              </div>
            </div>
          </div>

          {/* Financials & Timeline */}
          <div className="bg-[#F9F9F9] p-6 rounded-lg shadow-sm border border-[#AEACAC52]">
            <h4 className="text-[18px] font-bold mb-4 text-[#1A1A1A] border-b pb-2">
              Financials & Timeline
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelClass}>Total Amount (AED)</label>
                <input
                  type="text"
                  placeholder="Enter amount in AED"
                  value={form.amountAED}
                  onChange={(e) =>
                    setForm({ ...form, amountAED: e.target.value })
                  }
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className={labelClass}>Duration</label>
                <textarea
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                  className={`${fieldClass} min-h-[100px]`}
                />
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="bg-[#F9F9F9] p-6 rounded-lg shadow-sm border border-[#AEACAC52]">
            <h4 className="text-[18px] font-bold mb-4 text-[#1A1A1A] border-b pb-2">
              Terms & Conditions
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={labelClass}>
                  General Terms and Conditions
                </label>
                <textarea
                  value={form.termsAndConditions}
                  onChange={(e) =>
                    setForm({ ...form, termsAndConditions: e.target.value })
                  }
                  className={`${fieldClass} min-h-[120px]`}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Payment Terms</label>
                <textarea
                  value={form.paymentTerms}
                  onChange={(e) =>
                    setForm({ ...form, paymentTerms: e.target.value })
                  }
                  className={`${fieldClass} min-h-[150px]`}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>
                  Additional Terms & Conditions (Annexure 1)
                </label>
                <textarea
                  value={form.additionalTerms}
                  onChange={(e) =>
                    setForm({ ...form, additionalTerms: e.target.value })
                  }
                  className={`${fieldClass} min-h-[150px]`}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 pb-10">
            <button
              type="button"
              onClick={() => navigate('/td/workorder')}
              className="px-8 py-2 border border-[#E0E0E0] rounded-[5px] text-[#353535] font-semibold hover:bg-gray-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2 bg-[#DD4342] text-white rounded-[5px] font-semibold transition-all cursor-pointer"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}