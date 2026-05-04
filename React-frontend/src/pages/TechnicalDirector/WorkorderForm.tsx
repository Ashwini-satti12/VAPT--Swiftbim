import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import api from "../../lib/api";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { FiUpload } from "react-icons/fi";

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
  const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "");
  const wo = state?.selectedWO;
  const [companySignature, setCompanySignature] = useState<string | null>(wo?.company_signature || null);
  const [vendorSignature, setVendorSignature] = useState<string | null>(wo?.vendor_signature || null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyFileInputRef = useRef<HTMLInputElement>(null);
  const [vendorDisplayName, setVendorDisplayName] = useState("");
  const [signatureForm, setSignatureForm] = useState({
    companySignName: wo?.company_sign_name || "",
    companySignDesignation: wo?.company_sign_designation || "",
    companySignDate: wo?.company_sign_date || "",
    vendorSignName: wo?.vendor_sign_name || "",
    vendorSignDesignation: wo?.vendor_sign_designation || "",
    vendorSignDate: wo?.vendor_sign_date || "",
  });

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setVendorSignature(String(reader.result || ""));
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCompanySignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCompanySignature(String(reader.result || ""));
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

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
    companySignName: wo?.company_sign_name || wo?.companySignName || "",
    companySignDesignation: wo?.company_sign_designation || wo?.companySignDesignation || "",
    companySignDate: wo?.company_sign_date || wo?.companySignDate || "",
    companySignature: wo?.company_signature || wo?.companySignature || null,
    vendorSignName: wo?.vendor_sign_name || wo?.vendorSignName || "",
    vendorSignDesignation: wo?.vendor_sign_designation || wo?.vendorSignDesignation || "",
    vendorSignDate: wo?.vendor_sign_date || wo?.vendorSignDate || "",
    vendorSignature: wo?.vendor_signature || wo?.vendorSignature || null,
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
          setSignatureForm({
            companySignName: wo.company_sign_name || "",
            companySignDesignation: wo.company_sign_designation || "",
            companySignDate: wo.company_sign_date || "",
            vendorSignName: wo.vendor_sign_name || "",
            vendorSignDesignation: wo.vendor_sign_designation || "",
            vendorSignDate: wo.vendor_sign_date || "",
          });
          setCompanySignature(wo.company_signature || null);
          setVendorSignature(wo.vendor_signature || null);
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
  const currencyCodeForDisplay =
    (selectedCurrencyLabel.match(/\(([^)]+)\)/)?.[1] ||
      form.currency ||
      "")?.toUpperCase() || "";

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
        ...signatureForm,
        companySignature,
        vendorSignature,
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
              <div className="overflow-x-auto rounded-[6px] border border-[#AEACAC] bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-[#AEACAC] px-3 py-2 text-left text-[16px] font-bold">
                        Description
                      </th>
                      <th className="border border-[#AEACAC] px-3 py-2 text-left text-[16px] font-bold w-[260px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>Amount</span>
                          <select
                            value={form.currency || ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                currency: e.target.value.toUpperCase(),
                              })
                            }
                            className="bg-[#F3F3F3] border border-[#E6E6E6] rounded-[4px] px-2 py-1 text-[13px] font-Gantari outline-none"
                          >
                            <option value="">Select currency</option>
                            {CURRENCY_OPTIONS.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[#AEACAC] p-3 align-top">
                        <div className="space-y-3">
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
                          <div>
                            <label className={labelClass}>
                              Scope of Work
                            </label>
                            <ReactQuill
                              theme="snow"
                              placeholder="Enter scope of work..."
                              value={form.scopeOfWork}
                              onChange={(val) =>
                                setForm({ ...form, scopeOfWork: val })
                              }
                              modules={quillModules}
                              className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[150px]"
                            />
                          </div>
                          <div>
                            <label className={labelClass}>
                              Project Involves
                            </label>
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
                          <div>
                            <label className={labelClass}>Deliverables</label>
                            <ReactQuill
                              theme="snow"
                              placeholder="Enter deliverables..."
                              value={form.deliverables}
                              onChange={(val) =>
                                setForm({ ...form, deliverables: val })
                              }
                              modules={quillModules}
                              className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[150px]"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="border border-[#AEACAC] p-3 ">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter amount"
                          value={form.amountAED}
                          onChange={(e) =>
                            setForm({ ...form, amountAED: e.target.value })
                          }
                          className={fieldClass}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-[#AEACAC] p-3 align-top">
                        <label className={labelClass}>Duration</label>
                        <ReactQuill
                          theme="snow"
                          placeholder="Enter duration..."
                          value={form.duration}
                          onChange={(val) =>
                            setForm({ ...form, duration: val })
                          }
                          modules={quillModules}
                          className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[120px]"
                        />
                      </td>
                      <td className="border border-[#AEACAC] p-3" />
                    </tr>
                    <tr>
                      <td className="border border-[#AEACAC] px-3 py-2 text-right text-[16px] font-bold">
                        Total Amount
                        {currencyCodeForDisplay
                          ? ` (${currencyCodeForDisplay})`
                          : ""}
                      </td>
                      <td className="border border-[#AEACAC] p-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter amount"
                          value={form.amountAED}
                          onChange={(e) =>
                            setForm({ ...form, amountAED: e.target.value })
                          }
                          className={fieldClass}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

           
            {/* Terms & Conditions */}
            <div className="p-0 mb-8">
              <h4 className="text-[16px] font-bold mb-3 text-[#1A1A1A]">
                3. Terms & Conditions <span className="text-[#DD4342]">*</span>
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  {/* <label className={labelClass}>
                    General Terms and Conditions
                  </label> */}
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
                          const canDelete =
                            paymentRows.length > 0 && !isProtected;
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
                  <div className="grid grid-cols-2 gap-4 mt-10">
                    <div>
                      <p className="text-[14px] text-[#000000]">For,</p>
                      <p className="mt-8 text-[14px] text-[#000000]">
                        Swifterz Creative Engineering Services LLC,
                      </p>
                    </div>
                    <div className="ml-8">
                      <p className="text-[14px] text-[#000000]">For,</p>
                      <input
                        type="text"
                        placeholder="Enter vendor name"
                        value={vendorDisplayName}
                        onChange={(e) => setVendorDisplayName(e.target.value)}
                        className="mt-8 text-[14px] text-[#000000] border-b border-gray-300 bg-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div className="mt-12 mb-8 border-gray-300 break-inside-avoid">
                    <h3 className="font-gantari font-bold text-[18px] mb-4 text-[#000000]">
                      Signatures
                    </h3>
                    <div className="grid grid-cols-2 gap-16">
                      <div className="space-y-4">
                        <p className="font-bold text-[14px] uppercase tracking-wide text-[#000000]">
                          Company
                        </p>

                        <div
                          className="h-28 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative overflow-hidden group bg-gray-50 transition-all cursor-pointer hover:border-[#DD4342]"
                          onClick={() => companyFileInputRef.current?.click()}
                        >
                          {companySignature ? (
                            <div className="relative h-full w-full flex items-center justify-center group/img">
                              <img
                                src={
                                  companySignature.startsWith("http") ||
                                  companySignature.startsWith("data:")
                                    ? companySignature
                                    : `${API_BASE}${companySignature}`
                                }
                                alt="Company Signature"
                                className="h-full object-contain"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCompanySignature(null);
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                title="Remove Signature"
                                type="button"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                  ></path>
                                </svg>
                              </button>
                            </div>
                          ) : uploadLoading ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#DD4342]"></div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-2">
                              <FiUpload className="w-6 h-6 text-gray-300 group-hover:text-[#DD4342] mb-1" />
                              <span className="text-[10px] text-gray-400 group-hover:text-[#DD4342]">
                                Click to upload company signature
                              </span>
                            </div>
                          )}
                          <input
                            type="file"
                            ref={companyFileInputRef}
                            onChange={handleCompanySignatureUpload}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>

                        <div className="space-y-2 text-[14px]">
                          <div className="flex items-center gap-2">
                            <span className="w-24 font-medium">Name:</span>
                            <input
                              type="text"
                              value={signatureForm.companySignName}
                              onChange={(e) =>
                                setSignatureForm((prev) => ({
                                  ...prev,
                                  companySignName: e.target.value,
                                }))
                              }
                              className="border-b border-gray-300 flex-1 text-gray-800 font-bold bg-transparent outline-none px-2"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-24 font-medium">
                              Designation:
                            </span>
                            <input
                              type="text"
                              value={signatureForm.companySignDesignation}
                              onChange={(e) =>
                                setSignatureForm((prev) => ({
                                  ...prev,
                                  companySignDesignation: e.target.value,
                                }))
                              }
                              className="border-b border-gray-300 flex-1 text-gray-800 font-bold bg-transparent outline-none px-2"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-24 font-medium">Date:</span>
                            <input
                              type="date"
                              value={signatureForm.companySignDate}
                              onChange={(e) =>
                                setSignatureForm((prev) => ({
                                  ...prev,
                                  companySignDate: e.target.value,
                                }))
                              }
                              className="border-b border-gray-300 flex-1 text-gray-800 font-bold bg-transparent outline-none px-2"
                            />
                          </div>
                        </div>
                      </div>

                      {/* vendor signature */}
                      <div className="space-y-4">
                        <p className="font-bold text-[14px] font-gantari uppercase tracking-wide text-[#000000]">
                          Vendor
                        </p>

                        <div
                          className="h-28 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative overflow-hidden bg-gray-50 transition-all cursor-pointer hover:border-[#DD4342] group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {vendorSignature ? (
                            <div className="relative h-full w-full flex items-center justify-center group/img">
                              <img
                                src={
                                  vendorSignature.startsWith("http") ||
                                  vendorSignature.startsWith("data:")
                                    ? vendorSignature
                                    : `${API_BASE}${vendorSignature}`
                                }
                                alt="Vendor Signature"
                                className="h-full object-contain"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVendorSignature(null);
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                title="Remove Signature"
                                type="button"
                                tabIndex={-1}
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                  ></path>
                                </svg>
                              </button>
                            </div>
                          ) : uploadLoading ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#DD4342]"></div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-2">
                              <FiUpload className="w-6 h-6 text-gray-300 group-hover:text-[#DD4342] mb-1" />
                              <span className="text-[10px] text-gray-400 group-hover:text-[#DD4342]">
                                Click to upload vendor signature
                              </span>
                            </div>
                          )}
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleSignatureUpload}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>

                        <div className="space-y-2 text-[14px] font-gantari">
                          <div className="flex items-center gap-2">
                            <span className="w-24 font-medium">Name:</span>
                            <input
                              type="text"
                              value={signatureForm.vendorSignName || ""}
                              onChange={(e) =>
                                setSignatureForm((prev) => ({
                                  ...prev,
                                  vendorSignName: e.target.value,
                                }))
                              }
                              placeholder="Vendor name"
                              className="border-b border-gray-300 flex-1 text-gray-800 text-[14px] font-gantari font-bold bg-transparent outline-none hover:border-black focus:border-[#DD4342] px-1"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="w-24 font-medium">Designation:</span>
                            <input
                              type="text"
                              value={signatureForm.vendorSignDesignation || ""}
                              onChange={(e) =>
                                setSignatureForm((prev) => ({
                                  ...prev,
                                  vendorSignDesignation: e.target.value,
                                }))
                              }
                              placeholder="Authorized Signatory"
                              className="border-b border-gray-300 flex-1 text-gray-800 text-[14px] font-gantari font-bold bg-transparent outline-none px-1"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="w-24 font-medium">Date:</span>
                            <input
                              type="date"
                              value={signatureForm.vendorSignDate || ""}
                              onChange={(e) =>
                                setSignatureForm((prev) => ({
                                  ...prev,
                                  vendorSignDate: e.target.value,
                                }))
                              }
                              className="border-b border-gray-300 flex-1 text-gray-800 text-[14px] font-gantari font-bold bg-transparent outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mt-20">
                  <div className="text-center">
                    <label className={labelClass}>
                      Annexure 1 – Additional Terms & Conditions
                    </label>
                  </div>

                  <ReactQuill
                    theme="snow"
                    placeholder="Enter additional terms & conditions..."
                    value={form.additionalTerms}
                    onChange={(val) =>
                      setForm({ ...form, additionalTerms: val })
                    }
                    modules={quillModules}
                    className="bg-white rounded-[4px] border border-[#E6E6E6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-b-[#E6E6E6] [&_.ql-container]:border-0 [&_.ql-container]:min-h-[150px] mt-10"
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
