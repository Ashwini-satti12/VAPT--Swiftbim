import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// @ts-ignore
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import api from "../../lib/api";

export default function CreateProposalTD() {
  const navigate = useNavigate();
  const location = useLocation();
  const state: any = (location && (location as any).state) || {};
  const bid = state?.bid || null;

  // Pre-filled from bid
  const [serviceId] = useState(bid?.opportunity_id ? `OPP-${bid.opportunity_id}` : "");
  const [projectName] = useState(bid?.project_name || "");
  const [vendorName] = useState(bid?.vendor_name || "");
  const [bidAmount] = useState(bid?.bid_amount || "");
  const [bidTimeline] = useState(bid?.timeline || "");

  // Form fields
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [aboutUs, setAboutUs] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationWebsite, setLocationWebsite] = useState("");
  const [locationEmail, setLocationEmail] = useState(bid?.vendor_email || "");
  const [scopeDescription, setScopeDescription] = useState("");
  const [techRows, setTechRows] = useState([{ module: "" }]);
  const [deliverablesIntro, setDeliverablesIntro] = useState("");
  const [exclusionsContent, setExclusionsContent] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  // Commercial Offer Table State
  const [commercialRows, setCommercialRows] = useState([
    { milestone: "", duration: "", resources: "", resourceUnit: "Person/Month", totalPrice: "" },
  ]);

  // Payment Terms Table State
  const [paymentRows, setPaymentRows] = useState([{ basis: "", terms: "", timeline: "" }]);

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ visible: boolean; message: string; error?: boolean }>({
    visible: false,
    message: "",
  });

  // Handlers for Technology Table
  const handleAddTechRow = () => setTechRows([...techRows, { module: "" }]);
  const handleTechRowChange = (index: number, value: string) => {
    const updated = [...techRows];
    updated[index].module = value;
    setTechRows(updated);
  };
  const handleRemoveTechRow = (index: number) => {
    if (techRows.length > 1) setTechRows(techRows.filter((_, i) => i !== index));
  };

  // Handlers for Commercial Table
  const handleAddCommercialRow = () => {
    setCommercialRows([
      ...commercialRows,
      { milestone: "", duration: "", resources: "", resourceUnit: "Person/Month", totalPrice: "" },
    ]);
  };
  const handleCommercialChange = (index: number, field: string, value: string) => {
    const updated = [...commercialRows];
    updated[index] = { ...updated[index], [field]: value };
    setCommercialRows(updated);
  };
  const handleRemoveCommercialRow = (index: number) => {
    if (commercialRows.length > 1) setCommercialRows(commercialRows.filter((_, i) => i !== index));
  };

  // Handlers for Payment Table
  const handleAddPaymentRow = () => {
    setPaymentRows([...paymentRows, { basis: "", terms: "", timeline: "" }]);
  };
  const handlePaymentChange = (index: number, field: string, value: string) => {
    const updated = [...paymentRows];
    if (field === "terms") {
      const isAllowed = /^(\d{0,3})%?$/.test(value);
      if (!isAllowed) return;
    }
    updated[index] = { ...updated[index], [field]: value };
    setPaymentRows(updated);
  };
  const handlePaymentBlur = (index: number) => {
    const updated = [...paymentRows];
    const raw = String(updated[index]?.terms || "");
    const digitsOnly = raw.replace(/[^\d]/g, "");
    if (digitsOnly === "") {
      updated[index] = { ...updated[index], terms: "" };
    } else {
      let num = Math.min(100, Number(digitsOnly.slice(0, 3)));
      updated[index] = { ...updated[index], terms: `${num}%` };
    }
    setPaymentRows(updated);
  };
  const handleRemovePaymentRow = (index: number) => {
    if (paymentRows.length > 1) setPaymentRows(paymentRows.filter((_, i) => i !== index));
  };

  const handleDiscard = () => navigate("/td/proposals");

  const handleCreate = async () => {
    if (!executiveSummary || !aboutUs || !scopeDescription || !deliverablesIntro || !exclusionsContent) {
      setNotification({ visible: true, message: "Please fill in all required fields (*)", error: true });
      setTimeout(() => setNotification({ visible: false, message: "" }), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        executive_summary: executiveSummary,
        aboutus: aboutUs,
        address: locationAddress,
        website_url: locationWebsite,
        email_address: locationEmail,
        selected_currency: selectedCurrency,
        scope_of_work: scopeDescription,
        technologies_used: techRows.filter(r => r.module.trim()).map(r => r.module),
        deliverables: deliverablesIntro,
        exclusions: exclusionsContent,
        commercial_offer: commercialRows,
        payment_terms: paymentRows,
        // IDs for linking
        bid_id: bid?.id,
        opportunity_id: bid?.opportunity_id,
        vendor_employee_id: bid?.vendor_id,
        project_name: projectName,
        vendor_name: vendorName
      };

      const { data } = await api.post<{ success: boolean; message?: string }>("/api/vendors/proposals/td-create", payload);
      if (data.success) {
        setNotification({ visible: true, message: "Proposal created successfully!" });
        setTimeout(() => {
          setNotification({ visible: false, message: "" });
          navigate("/td/proposals", { state: { created: true } });
        }, 1600);
      } else {
        setNotification({ visible: true, message: data.message || "Failed to create proposal.", error: true });
        setTimeout(() => setNotification({ visible: false, message: "" }), 3000);
      }
    } catch (err: any) {
      setNotification({ visible: true, message: "Error creating proposal. Please try again.", error: true });
      setTimeout(() => setNotification({ visible: false, message: "" }), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
  };

  const inputCls = "w-full px-4 py-3 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-base placeholder:text-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2]";

  return (
    <div className="px-1 pt-1 pb-10 space-y-8 flex flex-col min-h-full bg-white font-gantari overflow-y-auto">
      {/* Toast */}
      {notification.visible && (
        <div className="fixed top-6 right-6 z-[9999] animate-fade-in">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl font-gantari text-sm font-medium min-w-[280px] ${notification.error ? "bg-red-600 text-white" : "bg-[#1A8A47] text-white"}`}
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
          >
            {notification.error ? (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between px-2 ">
        <button
          onClick={() => navigate("/td/proposals")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
          title="Back to proposals"
        >
          <svg className="w-6 h-6 text-[#353535]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-2xl font-semibold text-[#000000]">Create Proposal</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 space-y-8 px-2">
        {/* Pre-filled Bid Summary Banner */}
        {bid && (
          <div className="bg-[#F8FAFC] border border-[#AEACAC52] rounded-2xl p-6 flex flex-wrap gap-10 shadow-sm">
            <div>
              <p className="text-xs text-[#616161] font-medium mb-1 uppercase tracking-wider">Project</p>
              <p className="font-bold text-[#353535] text-lg">{projectName}</p>
            </div>
            <div>
              <p className="text-xs text-[#616161] font-medium mb-1 uppercase tracking-wider">Vendor</p>
              <p className="font-bold text-[#353535] text-lg">{vendorName}</p>
            </div>
            <div>
              <p className="text-xs text-[#616161] font-medium mb-1 uppercase tracking-wider">Accepted Bid</p>
              <p className="font-bold text-[#DD4342] text-lg">
                {bidAmount ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(bidAmount)) : "—"}
              </p>
            </div>
            {bidTimeline && (
              <div>
                <p className="text-xs text-[#616161] font-medium mb-1 uppercase tracking-wider">Timeline</p>
                <p className="font-bold text-[#353535] text-lg">{bidTimeline}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-10">
          {/* Section: Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block font-bold text-[#353535]">Service ID</label>
              <input type="text" value={serviceId} readOnly className={`${inputCls} cursor-not-allowed opacity-80`} />
            </div>
          </div>

          {/* 1. EXECUTIVE SUMMARY */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-[#020202]">1. Executive Summary <span className="text-red-500">*</span></h2>
            <textarea
              rows={4}
              value={executiveSummary}
              onChange={e => setExecutiveSummary(e.target.value)}
              placeholder="Provide a high-level summary..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* 2. ABOUT US */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-[#020202]">2. About Us <span className="text-red-500">*</span></h2>
            <textarea
              rows={4}
              value={aboutUs}
              onChange={e => setAboutUs(e.target.value)}
              placeholder="Describe your expertise..."
              className={`${inputCls} resize-none`}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#616161]">📍 Address</p>
                <input type="text" value={locationAddress} onChange={e => setLocationAddress(e.target.value)} placeholder="Office address..." className={inputCls} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#616161]">🌐 Website</p>
                <input type="text" value={locationWebsite} onChange={e => setLocationWebsite(e.target.value)} placeholder="www.example.com" className={inputCls} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#616161]">✉️ Email</p>
                <input type="text" value={locationEmail} onChange={e => setLocationEmail(e.target.value)} placeholder="contact@example.com" className={inputCls} />
              </div>
            </div>
          </div>

          {/* 3. SCOPE OF WORK */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-[#020202]">3. Scope of Work <span className="text-red-500">*</span></h2>
            <div className="bg-[#F9FAFB] rounded-xl overflow-hidden border border-gray-100 min-h-[250px]">
              <ReactQuill
                theme="snow"
                value={scopeDescription}
                onChange={setScopeDescription}
                modules={quillModules}
                placeholder="Detail the project scope..."
                className="h-full bg-white"
              />
            </div>

            <div className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="font-bold text-[#353535]">Technology to be Used:</label>
                <button onClick={handleAddTechRow} className="text-sm bg-[#DD4342] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#c23b3a] transition-all">+ Add Software</button>
              </div>
              <div className="rounded-xl border border-[#AEACAC52] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8FAFC]">
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 w-20 text-center text-sm font-bold text-[#616161]">S.No</th>
                      <th className="px-6 py-3 text-sm font-bold text-[#616161]">Software / Module</th>
                      <th className="px-6 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {techRows.map((row, index) => (
                      <tr key={index} className="border-b border-gray-50 bg-white">
                        <td className="px-6 py-3 text-center text-sm text-[#353535]">{index + 1}</td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={row.module}
                            onChange={e => handleTechRowChange(index, e.target.value)}
                            placeholder="e.g. Revit 2024, Navisworks..."
                            className="w-full bg-transparent border-none outline-none text-[#353535] font-medium"
                          />
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button onClick={() => handleRemoveTechRow(index)} className="text-[#AEACAC] hover:text-[#DD4342] text-xl">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4. DELIVERABLES */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-[#020202]">4. Deliverables <span className="text-red-500">*</span></h2>
            <div className="bg-[#F9FAFB] rounded-xl overflow-hidden border border-gray-100 min-h-[200px]">
              <ReactQuill
                theme="snow"
                value={deliverablesIntro}
                onChange={setDeliverablesIntro}
                modules={quillModules}
                placeholder="List the expected outcomes..."
                className="h-full bg-white"
              />
            </div>
          </div>

          {/* 5. EXCLUSIONS */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-[#020202]">5. Exclusions <span className="text-red-500">*</span></h2>
            <div className="bg-[#F9FAFB] rounded-xl overflow-hidden border border-gray-100 min-h-[200px]">
              <ReactQuill
                theme="snow"
                value={exclusionsContent}
                onChange={setExclusionsContent}
                modules={quillModules}
                placeholder="Define what is NOT included..."
                className="h-full bg-white"
              />
            </div>
          </div>

          {/* 6. COMMERCIAL OFFER */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-[#020202]">6. Commercial Offer</h2>
              <button onClick={handleAddCommercialRow} className="text-sm bg-[#DD4342] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#c23b3a] transition-all">+ Add Milestone</button>
            </div>
            <div className="rounded-xl border border-[#AEACAC52] overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead className="bg-[#F8FAFC]">
                  <tr className="border-b border-gray-100 whitespace-nowrap">
                    <th className="px-4 py-3 w-16 text-center text-sm font-bold text-[#616161]">S.No</th>
                    <th className="px-4 py-3 text-sm font-bold text-[#616161]">Milestone</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-[#616161]">Duration</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-[#616161]">Resources</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-[#616161]">
                      <div className="flex items-center justify-center gap-2">
                        <span>Total Price</span>
                        <select
                          value={selectedCurrency}
                          onChange={e => setSelectedCurrency(e.target.value)}
                          className="bg-white border rounded px-1 py-0.5 text-[10px] font-bold outline-none"
                        >
                          {["USD", "AED", "INR", "SAR", "QAR"].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {commercialRows.map((row, index) => (
                    <tr key={index} className={`border-b border-gray-50 ${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                      <td className="px-4 py-3 text-center text-sm">{index + 1}</td>
                      <td className="px-4 py-3">
                        <textarea
                          rows={1}
                          value={row.milestone}
                          onChange={e => handleCommercialChange(index, "milestone", e.target.value)}
                          placeholder="Task desc..."
                          className="w-full bg-transparent outline-none text-[#353535] text-sm resize-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={row.duration} onChange={e => handleCommercialChange(index, "duration", e.target.value)} placeholder="e.g. 4 Weeks" className="w-full text-center bg-transparent outline-none text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={row.resources} onChange={e => handleCommercialChange(index, "resources", e.target.value)} placeholder="e.g. 3 Team" className="w-full text-center bg-transparent outline-none text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={row.totalPrice} onChange={e => handleCommercialChange(index, "totalPrice", e.target.value)} placeholder="Amount" className="w-full text-center bg-transparent outline-none text-sm font-bold" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemoveCommercialRow(index)} className="text-[#AEACAC] text-lg">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6.1 PAYMENT TERMS */}
          <div className="space-y-4 pb-10">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-[#020202]">6.1 Payment Terms</h2>
              <button onClick={handleAddPaymentRow} className="text-sm bg-[#DD4342] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#c23b3a] transition-all">+ Add Term</button>
            </div>
            <div className="rounded-xl border border-[#AEACAC52] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8FAFC]">
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 w-20 text-center text-sm font-bold text-[#616161]">S.No</th>
                    <th className="px-6 py-3 text-sm font-bold text-[#616161]">Payment Basis</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-[#616161]">Terms (%)</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-[#616161]">Timeline (Weeks)</th>
                    <th className="px-6 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((row, index) => (
                    <tr key={index} className={`border-b border-gray-50 ${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                      <td className="px-6 py-3 text-center text-sm">{index + 1}</td>
                      <td className="px-6 py-4">
                        <input type="text" value={row.basis} onChange={e => handlePaymentChange(index, "basis", e.target.value)} placeholder="e.g. Advance" className="w-full bg-transparent outline-none text-sm" />
                      </td>
                      <td className="px-6 py-4">
                        <input type="text" value={row.terms} onChange={e => handlePaymentChange(index, "terms", e.target.value)} onBlur={() => handlePaymentBlur(index)} placeholder="10%" className="w-full text-center bg-transparent outline-none text-sm" />
                      </td>
                      <td className="px-6 py-4">
                        <input type="text" value={row.timeline} onChange={e => handlePaymentChange(index, "timeline", e.target.value)} placeholder="2" className="w-full text-center bg-transparent outline-none text-sm" />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button onClick={() => handleRemovePaymentRow(index)} className="text-[#AEACAC] text-xl">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm border-t border-[#AEACAC52] py-6 flex items-center justify-center gap-6 z-20">
          <button
            onClick={handleDiscard}
            disabled={submitting}
            className="px-8 py-3 rounded-xl border border-[#AEACAC52] text-[#616161] font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Discard Changes
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="px-10 py-3 rounded-xl bg-[#DD4342] text-white font-bold hover:bg-[#c23b3a] shadow-lg shadow-red-100 transition-all disabled:opacity-50 flex items-center gap-3"
          >
            {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {submitting ? "Sending..." : "Send Proposal"}
          </button>
        </div>
      </div>

      <style>{`
        .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f3f4f6 !important; padding: 12px 16px !important; }
        .ql-container.ql-snow { border: none !important; font-family: 'Gantari', sans-serif !important; }
        .ql-editor { font-size: 15px !important; color: #353535 !important; line-height: 1.6 !important; }
        .ql-editor.ql-blank::before { color: #8B8B8B !important; font-style: normal !important; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
