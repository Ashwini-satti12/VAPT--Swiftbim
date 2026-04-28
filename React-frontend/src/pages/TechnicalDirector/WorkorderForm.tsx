import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import api from "../../lib/api";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

type PaymentTermRow = {
  basis: string;
  terms: string;
  amount: string;
  timeline: string;
};

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

  const stripHtmlText = (html: string): string => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  };

  const parsePaymentTermsRows = (value: unknown): PaymentTermRow[] => {
    if (!value) return [];
    let parsed: unknown = value;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t: any) => ({
      basis: String(t?.basis ?? t?.label ?? ""),
      // UI requirement: user must fill these manually (start blank)
      terms: "",
      amount: "",
      timeline: "",
    }));
  };

  const formatPaymentTermsToHtml = (terms: any): string => {
    if (!terms) return "";
    let parsed = terms;
    if (typeof terms === "string") {
      try {
        parsed = JSON.parse(terms);
      } catch {
        return terms;
      }
    }
    if (Array.isArray(parsed)) {
      return `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #AEACAC;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #AEACAC; padding: 8px; text-align: left;">Sl.No</th>
              <th style="border: 1px solid #AEACAC; padding: 8px; text-align: left;">Payment Basis</th>
              <th style="border: 1px solid #AEACAC; padding: 8px; text-align: center;">Terms (%)</th>
              <th style="border: 1px solid #AEACAC; padding: 8px; text-align: center;">Amount</th>
              <th style="border: 1px solid #AEACAC; padding: 8px; text-align: center;">Timeline</th>
            </tr>
          </thead>
          <tbody>
            ${parsed
              .map(
                (t, i) => `
              <tr>
                <td style="border: 1px solid #AEACAC; padding: 8px;">${i + 1}</td>
                <td style="border: 1px solid #AEACAC; padding: 8px;">${
                  t.basis || t.label || ""
                }</td>
                <td style="border: 1px solid #AEACAC; padding: 8px; text-align: center;">${
                  t.terms || t.value || ""
                }</td>
                <td style="border: 1px solid #AEACAC; padding: 8px; text-align: center;">${
                  t.amount || ""
                }</td>
                <td style="border: 1px solid #AEACAC; padding: 8px; text-align: center;">${
                  t.timeline || ""
                }</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `;
    }
    return String(terms);
  };

  const [form, setForm] = useState({
    proposalId: state?.proposal?.id || null,
    vendorName: state?.proposal?.vendor_name || "",
    vendorAddress: state?.proposal?.address || "",
    poDate: new Date().toISOString().split("T")[0],
    poNumber: "",
    projectName: state?.proposal?.project_name || "",
    projectLocation: state?.proposal?.project_location || "",
    workDescription: "",
    scopeOfWork: state?.proposal?.scope_of_work || "",
    projectInvolves: "",
    deliverables:
      state?.proposal?.deliverables ||
      state?.proposal?.deliverables_intro ||
      state?.proposal?.deliverables_list ||
      "",
    exclusions:
      state?.proposal?.exclusions || state?.proposal?.exclusions_list || "",
    currency: (
      state?.proposal?.selected_currency ||
      state?.proposal?.bid_currency ||
      ""
    ).toUpperCase(),
    amountAED: state?.proposal?.bid_amount?.toString() || "",
    duration: state?.proposal?.timeline || "",
    termsAndConditions: "",
    paymentTerms: formatPaymentTermsToHtml(
      state?.proposal?.payment_terms || "",
    ),
    additionalTerms: "",
  });

  const [paymentRows, setPaymentRows] = useState<PaymentTermRow[]>(
    parsePaymentTermsRows(state?.proposal?.payment_terms || ""),
  );

  useEffect(() => {
    if (
      state?.proposal?.opportunity_id &&
      (!form.projectLocation || form.projectLocation === "Loading...")
    ) {
      api
        .get(`/api/vendors/bidding`)
        .then((res) => {
          const bids = res.data?.bidding || [];
          const matched = bids.find(
            (b: any) => b.id === state.proposal.opportunity_id,
          );
          if (matched) {
            const loc = matched.project_location || matched.location || "";
            if (loc) {
              setForm((prev) => ({ ...prev, projectLocation: loc }));
            }
          }
        })
        .catch(() => {});
    }
  }, [state?.proposal?.opportunity_id, form.projectLocation]);

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "clean"],
    ],
  };

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
    amountAED:
      wo?.amount_aed != null ? String(wo.amount_aed) : wo?.amountAED || "",
    duration: wo?.duration || "",
    termsAndConditions:
      wo?.terms_and_conditions || wo?.termsAndConditions || "",
    paymentTerms: wo?.payment_terms || wo?.paymentTerms || "",
    additionalTerms: wo?.additional_terms || wo?.additionalTerms || "",
    exclusions: wo?.exclusions || "",
  });

  useEffect(() => {
    if (!editId) return;
    api
      .get<{ success?: boolean; work_order?: any }>(`/api/workorders/${editId}`)
      .then((res) => {
        const wo = res.data?.work_order;
        if (wo) {
          setForm(mapWorkOrderToForm(wo));
          setPaymentRows(
            parsePaymentTermsRows(wo?.payment_terms || wo?.paymentTerms || ""),
          );
        }
      })
      .catch((err) => {
        console.error("Failed to fetch work order", err);
        toast.error("Failed to load work order details.");
      });
  }, [editId]);

  const fieldClass =
    "w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F3F3F3] border border-[#E6E6E6] rounded-[4px] font-Gantari transition-all outline-none focus:bg-white focus:border-[#AEACAC52] focus:ring-1 focus:ring-[#AEACAC52]";
  const labelClass =
    "block text-[14px] font-Gantari font-semibold text-[#000000] mb-2";
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const currencyWrapRef = useRef<HTMLDivElement>(null);
  const selectedCurrencyLabel =
    CURRENCY_OPTIONS.find((c) => c.code === form.currency)?.label || "";

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
    const requiredText = [
      { key: "Vendor Name", value: form.vendorName },
      { key: "PO Number", value: form.poNumber },
      { key: "PO Date", value: form.poDate },
      { key: "Project Name", value: form.projectName },
      { key: "Project Location", value: form.projectLocation },
      { key: "Vendor Address", value: form.vendorAddress },
      { key: "Currency", value: form.currency },
      { key: "Bid Amount", value: form.amountAED },
      { key: "Duration", value: form.duration },
    ];

    const requiredHtml = [
      { key: "Description", value: form.workDescription },
      { key: "Scope of Work", value: form.scopeOfWork },
      { key: "Project Involves", value: form.projectInvolves },
      { key: "Deliverables", value: form.deliverables },
      { key: "General Terms and Conditions", value: form.termsAndConditions },
      { key: "Additional Terms & Conditions (Annexure 1)", value: form.additionalTerms },
      { key: "Exclusions", value: form.exclusions },
    ];

    for (const f of requiredText) {
      if (!String(f.value || "").trim()) {
        toast.error(`${f.key} is required.`);
        return;
      }
    }

    for (const f of requiredHtml) {
      if (!stripHtmlText(String(f.value || ""))) {
        toast.error(`${f.key} is required.`);
        return;
      }
    }

    if (!paymentRows.length) {
      toast.error("Payment Terms is required. Please add at least one row.");
      return;
    }

    for (let i = 0; i < paymentRows.length; i++) {
      const row = paymentRows[i];
      const prefix = `Payment Terms row ${i + 1}`;
      if (!String(row.basis || "").trim()) {
        toast.error(`${prefix}: Payment Basis is required.`);
        return;
      }
      if (!String(row.terms || "").trim()) {
        toast.error(`${prefix}: Terms (%) is required.`);
        return;
      }
      if (!String(row.amount || "").trim()) {
        toast.error(`${prefix}: Amount is required.`);
        return;
      }
      if (!String(row.timeline || "").trim()) {
        toast.error(`${prefix}: Timeline is required.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...form,
        paymentTerms: formatPaymentTermsToHtml(paymentRows),
      };
      if (editId) {
        await api.put(`/api/workorders/${editId}`, payload);
        toast.success("Work order updated successfully.");
      } else {
        await api.post("/api/workorders", payload);
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
      <div className="mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => navigate("/td/workorder")}
            className="p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer hover:opacity-80"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
          <h3 className="text-[24px] font-semibold text-[#020202]">
            {editWO ? "Edit Work Order" : "Create Work Order"}
          </h3>
          <div className="w-10" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white overflow-hidden">
            {/* Basic Information */}
            <div className="p-0 mb-8">
              <h4 className="text-[16px] font-bold mb-3 text-[#1A1A1A]">
                1. Basic Information <span className="text-[#DD4342]">*</span>
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
                    onChange={(e) =>
                      setForm({ ...form, poDate: e.target.value })
                    }
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
                    placeholder="Enter vendor address"
                    className={`${fieldClass} min-h-[80px]`}
                  />
                </div>
              </div>
            </div>

            {/* Work Scope & Description */}
            <div className="p-0 mb-8">
              <h4 className="text-[16px] font-bold mb-3 text-[#1A1A1A]">
                2. Work Scope & Description{" "}
                <span className="text-[#DD4342]">*</span>
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className={labelClass}>Description</label>
                  <ReactQuill
                    theme="snow"
                    placeholder="Enter description..."
                    value={form.workDescription}
                    onChange={(val) =>
                      setForm({ ...form, workDescription: val })
                    }
                    modules={quillModules}
                    className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Scope of Work</label>
                  <ReactQuill
                    theme="snow"
                    placeholder="Enter scope of work..."
                    value={form.scopeOfWork}
                    onChange={(val) => setForm({ ...form, scopeOfWork: val })}
                    modules={quillModules}
                    className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Project Involves</label>
                  <ReactQuill
                    theme="snow"
                    placeholder="Enter project involves..."
                    value={form.projectInvolves}
                    onChange={(val) =>
                      setForm({ ...form, projectInvolves: val })
                    }
                    modules={quillModules}
                    className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[150px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Deliverables</label>
                  <ReactQuill
                    theme="snow"
                    placeholder="Enter deliverables..."
                    value={form.deliverables}
                    onChange={(val) => setForm({ ...form, deliverables: val })}
                    modules={quillModules}
                    className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[150px]"
                  />
                </div>
              </div>
            </div>

            {/* Financials & Timeline */}
            <div className="p-0 mb-8">
              <h4 className="text-[16px] font-bold mb-3 text-[#1A1A1A]">
                3. Financials & Timeline <span className="text-[#DD4342]">*</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelClass}>
                    Currency <span className="text-[#DD4342]">*</span>
                  </label>
                  <div ref={currencyWrapRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCurrencyOpen((p) => !p)}
                      className={`${fieldClass} flex items-center justify-between text-left cursor-pointer`}
                    >
                      <span
                        className={
                          form.currency ? "text-[#353535]" : "text-[#8B8B8B]"
                        }
                      >
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
                                setForm((prev) => ({
                                  ...prev,
                                  currency: c.code,
                                }));
                                setIsCurrencyOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left text-[14px] hover:bg-[#F5F5F5] ${
                                form.currency === c.code
                                  ? "bg-[#F2F2F2] text-[#353535]"
                                  : "text-[#575757]"
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
                  <label className={labelClass}>
                    Bid Amount <span className="text-[#DD4342]">*</span>
                  </label>
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
            <div className="p-0 mb-8">
              <h4 className="text-[16px] font-bold mb-3 text-[#1A1A1A]">
                4. Terms & Conditions <span className="text-[#DD4342]">*</span>
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className={labelClass}>
                    General Terms and Conditions
                  </label>
                  <ReactQuill
                    theme="snow"
                    placeholder="Enter general terms and conditions..."
                    value={form.termsAndConditions}
                    onChange={(val) =>
                      setForm({ ...form, termsAndConditions: val })
                    }
                    modules={quillModules}
                    className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Payment Terms</label>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentRows((prev) => [
                          ...prev,
                          {
                            basis: "",
                            terms: "",
                            amount: "",
                            timeline: "",
                          },
                        ])
                      }
                      className="h-9 px-4 rounded-[4px] bg-[#DD4342] text-white text-[13px] font-semibold hover:opacity-90 transition-all"
                    >
                      + Add Row
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-[6px] border border-[#E6E6E6] bg-white">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#F2F2F2] text-[13px] text-[#1A1A1A]">
                          <th className="px-4 py-3 text-left font-semibold w-[90px]">
                            Sl.No
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            Payment Basis
                          </th>
                          <th className="px-4 py-3 text-left font-semibold w-[180px]">
                            Terms (%)
                          </th>
                          <th className="px-4 py-3 text-left font-semibold w-[180px]">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left font-semibold w-[220px]">
                            Timeline
                          </th>
                          <th className="px-3 py-3 w-[50px]" />
                        </tr>
                      </thead>
                      <tbody className="text-[13px]">
                        {(paymentRows.length
                          ? paymentRows
                          : [
                              {
                                basis: "",
                                terms: "",
                                amount: "",
                                timeline: "",
                              },
                            ]
                        ).map((row, idx) => {
                          const isProtected =
                            (row.basis || "").trim().toLowerCase() ===
                              "advance (on signing)" ||
                            (row.basis || "").trim().toLowerCase() ===
                              "final payment";
                          const canDelete = paymentRows.length > 0 && !isProtected;
                          return (
                            <tr key={idx} className="border-t border-[#EFEFEF]">
                              <td className="px-4 py-3 text-[#1A1A1A]">
                                {idx + 1}.
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  value={row.basis}
                                  onChange={(e) =>
                                    setPaymentRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx
                                          ? { ...r, basis: e.target.value }
                                          : r,
                                      ),
                                    )
                                  }
                                  placeholder="Advance (on signing)"
                                  className="w-full bg-transparent outline-none placeholder-[#9B9B9B]"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  value={row.terms}
                                  onChange={(e) =>
                                    setPaymentRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx
                                          ? { ...r, terms: e.target.value }
                                          : r,
                                      ),
                                    )
                                  }
                                  placeholder="eg. 10%"
                                  className="w-full bg-transparent outline-none placeholder-[#9B9B9B]"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  value={row.amount}
                                  onChange={(e) =>
                                    setPaymentRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx
                                          ? { ...r, amount: e.target.value }
                                          : r,
                                      ),
                                    )
                                  }
                                  placeholder="Enter amount"
                                  className="w-full bg-transparent outline-none placeholder-[#9B9B9B]"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  value={row.timeline}
                                  onChange={(e) =>
                                    setPaymentRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx
                                          ? { ...r, timeline: e.target.value }
                                          : r,
                                      ),
                                    )
                                  }
                                  placeholder="eg. 2 weeks"
                                  className="w-full bg-transparent outline-none placeholder-[#9B9B9B]"
                                />
                              </td>
                              <td className="px-3 py-3 text-right">
                                {canDelete ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPaymentRows((prev) =>
                                        prev.filter((_, i) => i !== idx),
                                      )
                                    }
                                    className="text-[#DD4342] font-semibold"
                                    aria-label="Remove row"
                                    title="Remove"
                                  >
                                    ×
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>
                    Additional Terms & Conditions (Annexure 1)
                  </label>
                  <ReactQuill
                    theme="snow"
                    placeholder="Enter additional terms & conditions..."
                    value={form.additionalTerms}
                    onChange={(val) =>
                      setForm({ ...form, additionalTerms: val })
                    }
                    modules={quillModules}
                    className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[150px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Exclusions</label>
                  <ReactQuill
                    theme="snow"
                    placeholder="Enter exclusions..."
                    value={form.exclusions}
                    onChange={(val) => setForm({ ...form, exclusions: val })}
                    modules={quillModules}
                    className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[150px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 py-6 pb-10">
              <button
                type="button"
                onClick={() => navigate("/td/workorder")}
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
          </div>
        </form>
      </div>
    </div>
  );
}

const QUILL_STYLES = `
  .ql-toolbar.ql-snow { border: 1px solid #AEACAC52; border-top-left-radius: 5px; border-top-right-radius: 5px; }
  .ql-container.ql-snow { border: 1px solid #AEACAC52; border-bottom-left-radius: 5px; border-bottom-right-radius: 5px; font-family: 'Gantari', sans-serif !important; }
  .ql-editor { font-size: 14px !important; color: #353535 !important; line-height: 1.6 !important; min-height: 120px; }
  .ql-editor.ql-blank::before { color: #8B8B8B !important; font-style: normal !important; }
`;

if (typeof document !== "undefined") {
  const styleTag = document.createElement("style");
  styleTag.innerHTML = QUILL_STYLES;
  document.head.appendChild(styleTag);
}
