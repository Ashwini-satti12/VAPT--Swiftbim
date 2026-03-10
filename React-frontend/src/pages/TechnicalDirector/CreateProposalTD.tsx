import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// @ts-ignore
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import api from "../../lib/api";
import addressIcon from "../../assets/TechnicalDirector/Vector.svg";
import websiteIcon from "../../assets/TechnicalDirector/world-wide-web 1.svg";
import emailIcon from "../../assets/TechnicalDirector/mail icon.svg";


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
        scope_of_work: scopeDescription,
        technologies_used: techRows.filter(r => r.module.trim()).map(r => r.module),
        deliverables: deliverablesIntro,
        exclusions: exclusionsContent,
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
    <div className="px-1 pt-1 space-y-8 flex flex-col min-h-full bg-white font-gantari overflow-y-auto">
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
          <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md py-6 flex flex-wrap items-center">
            <div className="flex-1 min-w-[140px] px-8 border-r border-[#AEACAC52] last:border-r-0">
              <p className="text-lg font-bold text-[#353535] mb-1 tracking-wider font-gantari text-center">Project</p>
              <p className="font-semibold text-[#616161] text-base font-gantari truncate text-center">{projectName}</p>
            </div>
            <div className="flex-1 min-w-[140px] px-8 border-r border-[#AEACAC52] last:border-r-0">
              <p className="text-lg font-bold text-[#353535] mb-1 tracking-wider font-gantari text-center">Vendor</p>
              <p className="font-semibold text-[#616161] text-base font-gantari truncate text-center">{vendorName}</p>
            </div>
            <div className="flex-1 min-w-[140px] px-8 border-r border-[#AEACAC52] last:border-r-0">
              <p className="text-lg font-bold text-[#353535] mb-1 tracking-wider font-gantari text-center">Accepted Bid</p>
              <p className="font-semibold text-[#DD4342] text-base font-gantari text-center">
                {bidAmount ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(bidAmount)) : "—"}
              </p>
            </div>
            {bidTimeline && (
              <div className="flex-1 min-w-[140px] px-8 border-r border-[#AEACAC52] last:border-r-0">
                <p className="text-lg font-bold text-[#353535] mb-1 tracking-wider text-center font-gantari">Timeline</p>
                <p className="font-semibold text-[#616161] text-base text-center font-gantari">{bidTimeline}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-10">
          {/* Section: Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block font-bold text-lg text-[#353535]">Service ID</label>
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
            <div className="space-y-4 pt-4 max-w-5xl">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 min-w-[140px] shrink-0">
                  <img src={addressIcon} alt="" className="w-5 h-5" />
                  <div className="flex-1 flex justify-between text-sm font-semibold text-[#020202]">
                    <span>Address</span>
                    <span>:</span>
                  </div>
                </div>

                <input type="text" value={locationAddress} onChange={e => setLocationAddress(e.target.value)} placeholder="Office address..." className={inputCls} />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 min-w-[140px] shrink-0">
                  <img src={websiteIcon} alt="" className="w-5 h-5" />
                  <div className="flex-1 flex justify-between text-sm font-semibold text-[#020202]">
                    <span>Website</span>
                    <span>:</span>
                  </div>
                </div>

                <input type="text" value={locationWebsite} onChange={e => setLocationWebsite(e.target.value)} placeholder="www.example.com" className={inputCls} />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 min-w-[140px] shrink-0">
                  <img src={emailIcon} alt="" className="w-5 h-5" />
                  <div className="flex-1 flex justify-between text-sm font-semibold text-[#020202]">
                    <span>Email</span>
                    <span>:</span>
                  </div>
                </div>

                <input type="text" value={locationEmail} onChange={e => setLocationEmail(e.target.value)} placeholder="contact@example.com" className={inputCls} />
              </div>
            </div>
          </div>

          {/* 3. SCOPE OF WORK */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-[#020202]">3. Scope of Work <span className="text-red-500">*</span></h2>
            <div className="bg-[#F2F2F2] rounded-md overflow-hidden border border-transparent focus-within:border-[#AEACAC52] focus-within:ring-1 focus-within:ring-[#D2D2D2] min-h-[250px] transition-all [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-[#AEACAC52] [&_.ql-container]:border-t [&_.ql-container]:border-[#AEACAC52] [&_.ql-editor]:pt-10 [&_.ql-editor]:px-6">
              <ReactQuill
                theme="snow"
                value={scopeDescription}
                onChange={setScopeDescription}
                modules={quillModules}
                placeholder="Detail the project scope..."
                className="h-full bg-transparent"
              />
            </div>

            <div className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="font-bold text-[#353535]">Technology to be Used:</label>
                <button onClick={handleAddTechRow} className="text-sm bg-[#DD4342] text-white px-4 py-2 rounded-lg font-semibold transition-all"> Add Software</button>
              </div>
              <div className="rounded-xl border border-[#AEACAC52] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 w-20 text-center text-base font-bold text-[#353535]">Sl.No</th>
                      <th className="px-6 py-3 text-base font-bold text-[#353535]">Software / Module</th>
                      <th className="px-6 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {techRows.map((row, index) => (
                      <tr key={index} className={`border-b border-gray-50 ${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
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
            <div className="bg-[#F2F2F2] rounded-md overflow-hidden border border-transparent focus-within:border-[#AEACAC52] focus-within:ring-1 focus-within:ring-[#D2D2D2] min-h-[200px] transition-all [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-[#AEACAC52] [&_.ql-container]:border-t [&_.ql-container]:border-[#AEACAC52] [&_.ql-editor]:pt-10 [&_.ql-editor]:px-6">
              <ReactQuill
                theme="snow"
                value={deliverablesIntro}
                onChange={setDeliverablesIntro}
                modules={quillModules}
                placeholder="List the expected outcomes..."
                className="h-full bg-transparent"
              />
            </div>
          </div>

          {/* 5. EXCLUSIONS */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-[#020202]">5. Exclusions <span className="text-red-500">*</span></h2>
            <div className="bg-[#F2F2F2] rounded-md overflow-hidden border border-transparent focus-within:border-[#AEACAC52] focus-within:ring-1 focus-within:ring-[#D2D2D2] min-h-[200px] transition-all [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-[#AEACAC52] [&_.ql-container]:border-t [&_.ql-container]:border-[#AEACAC52] [&_.ql-editor]:pt-10 [&_.ql-editor]:px-6">
              <ReactQuill
                theme="snow"
                value={exclusionsContent}
                onChange={setExclusionsContent}
                modules={quillModules}
                placeholder="Define what is NOT included..."
                className="h-full bg-transparent"
              />
            </div>
          </div>

          {/* 6. PAYMENT TERMS */}
          <div className="space-y-4 pb-10">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-[#020202]">6. Payment Terms</h2>
              <button onClick={handleAddPaymentRow} className="text-sm bg-[#DD4342] text-white px-4 py-2 rounded-lg font-semibold transition-all"> Add Term</button>
            </div>
            <div className="rounded-xl border border-[#AEACAC52] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 w-20 text-center text-base font-bold text-[#353535]">Sl.No</th>
                    <th className="px-6 py-3 text-base font-bold text-[#353535]">Payment Basis</th>
                    <th className="px-6 py-3 text-center text-base font-bold text-[#353535]">Terms (%)</th>
                    <th className="px-6 py-3 text-center text-base font-bold text-[#353535]">Timeline (Weeks)</th>
                    <th className="px-6 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((row, index) => (
                    <tr key={index} className={`border-b border-gray-50 ${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                      <td className="px-6 py-3 text-center text-sm text-[#353535]">{index + 1}</td>
                      <td className="px-6 py-4">
                        <input type="text" value={row.basis} onChange={e => handlePaymentChange(index, "basis", e.target.value)} placeholder="e.g. Advance" className="w-full bg-transparent outline-none text-sm text-[#353535]" />
                      </td>
                      <td className="px-6 py-4">
                        <input type="text" value={row.terms} onChange={e => handlePaymentChange(index, "terms", e.target.value)} onBlur={() => handlePaymentBlur(index)} placeholder="10%" className="w-full text-center bg-transparent outline-none text-sm text-[#353535]" />
                      </td>
                      <td className="px-3 py-4">
                        <input type="text" value={row.timeline} onChange={e => handlePaymentChange(index, "timeline", e.target.value)} placeholder="2" className="w-full text-center bg-transparent outline-none text-sm text-[#353535]" />
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
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handleDiscard}
            disabled={submitting}
            className="px-12 py-2 rounded-md bg-[#E8E8E8] text-[#616161] transition-all disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="px-6 py-2 rounded-md bg-[#DD4342] text-white shadow-lg shadow-red-100 transition-all disabled:opacity-50 flex items-center gap-3"
          >
            {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {submitting ? "Sending..." : "Send Proposal"}
          </button>
        </div>
      </div>

      <style>{`
        .ql-toolbar.ql-snow { border: 1px solid #AEACAC52; padding: 12px 16px !important; }
        .ql-container.ql-snow { border: none !important; font-family: 'Gantari', sans-serif !important; }
        .ql-editor { font-size: 15px !important; color: #353535 !important; line-height: 1.6 !important; }
        .ql-editor.ql-blank::before { color: #8B8B8B !important; font-style: normal !important; left: 24px !important; top: 40px !important; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
