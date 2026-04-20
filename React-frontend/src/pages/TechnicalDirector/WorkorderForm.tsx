import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import api from "../../lib/api";

const CURRENCY_OPTIONS = [
  { code: "INR", label: "Indian Rupee (INR)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "AED", label: "UAE Dirham (AED)" },
  { code: "SAR", label: "Saudi Riyal (SAR)" },
  { code: "QAR", label: "Qatari Riyal (QAR)" },
  { code: "OMR", label: "Omani Rial (OMR)" },
  { code: "BHD", label: "Bahraini Dinar (BHD)" },
  { code: "KWD", label: "Kuwaiti Dinar (KWD)" },
  { code: "SGD", label: "Singapore Dollar (SGD)" },
  { code: "AUD", label: "Australian Dollar (AUD)" },
  { code: "CAD", label: "Canadian Dollar (CAD)" },
  { code: "JPY", label: "Japanese Yen (JPY)" },
  { code: "CNY", label: "Chinese Yuan (CNY)" },
];

export default function WorkorderForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const state: any = location.state || {};

  const editWO = state?.editWO;
  const editId = editWO?.id ? Number(editWO.id) : null;

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
    currency: "",
    amountAED: state?.proposal?.bid_amount?.toString() || "",
    duration: "",
    termsAndConditions: "",
    paymentTerms: "",
    additionalTerms: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mapWorkOrderToForm = (wo: any) => ({
    proposalId: wo?.proposal_id ?? wo?.proposalId ?? null,
    vendorName: wo?.vendor_name || wo?.vendorName || "",
    vendorAddress: wo?.vendor_address || wo?.vendorAddress || "",
    poDate: wo?.po_date || wo?.poDate || new Date().toISOString().split("T")[0],
    poNumber: wo?.po_number || wo?.poNumber || "",
    projectName: wo?.project_name || wo?.projectName || "",
    projectLocation: wo?.project_location || wo?.projectLocation || "",
    workDescription: wo?.work_description || wo?.workDescription || "",
    scopeOfWork: wo?.scope_of_work || wo?.scopeOfWork || "",
    projectInvolves: wo?.project_involves || wo?.projectInvolves || "",
    deliverables: wo?.deliverables || "",
    currency: (wo?.currency || "").toUpperCase(),
    amountAED: wo?.amount_aed != null ? String(wo.amount_aed) : wo?.amountAED || "",
    duration: wo?.duration || "",
    termsAndConditions: wo?.terms_and_conditions || wo?.termsAndConditions || "",
    paymentTerms: wo?.payment_terms || wo?.paymentTerms || "",
    additionalTerms: wo?.additional_terms || wo?.additionalTerms || "",
  });

  useEffect(() => {
    if (!editId) return;
    api
      .get<{ success?: boolean; work_order?: any }>(`/api/workorders/${editId}`)
      .then((res) => {
        const wo = res.data?.work_order;
        if (wo) {
          setForm(mapWorkOrderToForm(wo));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch work order", err);
        toast.error("Failed to load work order details.");
      });
  }, [editId]);

  const fieldClass =
    "w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-white border border-[#E0E0E0] rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] focus:ring-1 focus:ring-[#AEACAC52]";
  const labelClass =
    "block text-[16px] font-Gantari font-semibold text-[#000000] mb-2";
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const currencyWrapRef = useRef<HTMLDivElement>(null);
  const selectedCurrencyLabel =
    CURRENCY_OPTIONS.find((c) => c.code === form.currency)?.label || "";

  // Auto-fill vendor address from vendor_employee table by vendor name.
  // We keep it best-effort and avoid interrupting manual edits.
  useEffect(() => {
    const name = (form.vendorName || "").trim();
    if (!name) {
      return;
    }
    const t = setTimeout(() => {
      api
        .get<{ success?: boolean; address?: string; vendor_name?: string }>(
          "/api/workorders/vendor-address",
          { params: { vendor_name: name } },
        )
        .then((res) => {
          const address = (res.data?.address || "").trim();
          if (address) {
            setForm((prev) => ({ ...prev, vendorAddress: address }));
          }
        })
        .catch(() => {
          // keep current value when lookup fails
        });
    }, 250);
    return () => clearTimeout(t);
  }, [form.vendorName]);

  useEffect(() => {
    if (!isCurrencyOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (
        currencyWrapRef.current &&
        !currencyWrapRef.current.contains(e.target as Node)
      ) {
        setIsCurrencyOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [isCurrencyOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(form.currency || "").trim()) {
      alert("Please select currency.");
      return;
    }
    try {
      setIsSubmitting(true);
      if (editId) {
        await api.put(`/api/workorders/${editId}`, form);
        toast.success("Work order updated successfully.");
      } else {
        await api.post("/api/workorders", form);
        toast.success("Work order created successfully.");
      }
      navigate("/td/workorder");
    } catch (err) {
      console.error("Failed to save work order", err);
      toast.error("Failed to save work order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
            {editWO ? "Edit Work Order" : "Create Work Order"}
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
                <label className={labelClass}>Currency <span className="text-[#DD4342]">*</span></label>
                <div ref={currencyWrapRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCurrencyOpen((p) => !p)}
                    className={`${fieldClass} flex items-center justify-between text-left cursor-pointer`}
                  >
                    <span className={form.currency ? "text-[#353535]" : "text-[#8B8B8B]"}>
                      {selectedCurrencyLabel || "Select currency"}
                    </span>
                    <span
                      className={`text-[#666] transition-transform ${
                        isCurrencyOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5 8L10 13L15 8"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {isCurrencyOpen && (
                    <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[8px] border border-[#E0E0E0] bg-white shadow-sm">
                      <div className="max-h-48 overflow-y-auto">
                        {CURRENCY_OPTIONS.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, currency: c.code }));
                              setIsCurrencyOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-[14px] hover:bg-[#F5F5F5] ${
                              form.currency === c.code ? "bg-[#F2F2F2] text-[#353535]" : "text-[#575757]"
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Bid Amount <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.amountAED}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d*$/.test(value)) {
                      setForm({ ...form, amountAED: value });
                    }
                  }}
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
              disabled={isSubmitting}
              className="px-8 py-2 bg-[#DD4342] text-white rounded-[5px] font-semibold transition-all cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}