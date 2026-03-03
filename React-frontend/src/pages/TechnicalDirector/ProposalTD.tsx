import { useState } from "react";
import { useNavigate } from "react-router-dom";
import backIcon from "../../assets/back_icon.png";
import swifterzLogo from "../../assets/ProductNavbarIcons/swifterzlogo.png";

export default function ViewProposal() {
  const navigate = useNavigate();

  // Editable form state
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [salutation, setSalutation] = useState("");
  const [subject, setSubject] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [aboutUs, setAboutUs] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationWebsite, setLocationWebsite] = useState("");
  const [locationEmail, setLocationEmail] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [technologies, setTechnologies] = useState([{ module: "" }]);
  const [deliverables, setDeliverables] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [otherTerms, setOtherTerms] = useState("");
  const [bestRegardsName, setBestRegardsName] = useState("");
  const [bestRegardsAddress, setBestRegardsAddress] = useState("");
  const [refNumber, setRefNumber] = useState("SCS/BLR001-11/24");

  // Technology row helpers
  const addTechnologyRow = () => {
    setTechnologies([...technologies, { module: "" }]);
  };

  const removeTechnologyRow = (index: number) => {
    if (technologies.length > 1) {
      setTechnologies(technologies.filter((_, i) => i !== index));
    }
  };

  const updateTechnology = (index: number, value: string) => {
    const updated = [...technologies];
    updated[index] = { module: value };
    setTechnologies(updated);
  };

  return (
    <div className="min-h-screen">
      <div className="flex py-8 gap-6 max-w-[1600px] mx-auto">
        <div className="flex-1 mr-4 mt-[-32px] overflow-hidden">
          {/* Main Content Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 w-full min-h-[800px]">
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-8 pb-4 relative">
              <button
                onClick={() => navigate("/technicalteam/create-proposal")}
                className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors group absolute left-0"
                title="Back"
              >
                <div className="p-2 rounded-full group-hover:bg-gray-100 transition-colors">
                  <img src={backIcon} alt="Back" className="w-5 h-5" />
                </div>
              </button>

              <h1 className="font-gantari font-semibold text-xl text-[#000000] w-full text-center">
                Proposal Details
              </h1>
            </div>

            {/* Document Content */}
            <div className="max-w-4xl mx-auto space-y-10">

              <div className="mb-8">
                {/* Logo Section - Top Right */}
                <div className="flex justify-end mb-4">
                  <img src={swifterzLogo} alt="Swifterz" className="h-12 object-contain" />
                </div>

                {/* Grey Bar with Date & Ref */}
                <div className="flex flex-col items-end mb-6">
                  <div className="bg-[#D8D8D8] rounded-md w-full px-8 py-4 mb-4 flex flex-col justify-center items-end shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-gantari text-[#000000] font-bold">
                      <span className="text-right">Date:</span>
                      <span>{new Date().toLocaleDateString("en-GB")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-gantari text-[#000000] font-bold mt-1">
                      <span className="text-right">Ref:</span>
                      <input
                        type="text"
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        className="bg-transparent border-b border-[#000000] outline-none text-sm font-bold text-[#000000] w-[180px] text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Client Details & Salutation */}
                <div className="mb-6 font-gantari text-[#353535] text-sm space-y-2">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-base">Mr./Ms.</span>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Client Name"
                      className="font-bold text-base text-[#353535] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent flex-1 py-1"
                    />
                  </div>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company Name"
                    className="font-bold text-base text-[#353535] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent w-full py-1"
                  />
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Client Address Line"
                    className="text-sm text-[#353535] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent w-full py-1"
                  />
                </div>

                <div className="mb-6 font-gantari text-[#353535] text-sm flex items-center gap-1">
                  <span>Dear</span>
                  <input
                    type="text"
                    value={salutation}
                    onChange={(e) => setSalutation(e.target.value)}
                    placeholder="Sir/Madam"
                    className="text-sm text-[#353535] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent flex-1 py-1"
                  />
                </div>

                {/* Subject */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-1 font-gantari font-bold text-[#020202] text-sm">
                    <span>Sub: Proposal for the</span>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Project"
                      className="font-bold text-sm text-[#020202] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent w-[200px] text-center py-1"
                    />
                  </div>
                </div>
              </div>

              {/* 1. EXECUTIVE SUMMARY */}
              <section className="mb-12">
                <h2 className="font-gantari font-bold text-xl text-[#020202] pb-2 mb-2">
                  1. Executive Summary
                </h2>
                <div className="w-full px-4 border border-gray-300 py-3 rounded-md bg-[#F2F2F2] min-h-[120px]">
                  <textarea
                    value={executiveSummary}
                    onChange={(e) => setExecutiveSummary(e.target.value)}
                    placeholder="Enter Executive Summary..."
                    className="font-gantari text-sm leading-relaxed text-justify text-[#353535] placeholder-[#8B8B8B] bg-transparent outline-none resize-none w-full min-h-[120px]"
                  />
                </div>
              </section>

              {/* 2. ABOUT US */}
              <section className="mb-12">
                <h2 className="font-gantari font-bold text-xl text-[#020202] pb-2 mb-2">
                  2. About Us
                </h2>
                <div className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] min-h-[120px] mb-6">
                  <textarea
                    value={aboutUs}
                    onChange={(e) => setAboutUs(e.target.value)}
                    placeholder="Enter About Us content..."
                    className="font-gantari text-sm leading-relaxed text-justify text-[#353535] placeholder-[#8B8B8B] bg-transparent outline-none resize-none w-full min-h-[120px]"
                  />
                </div>

                {/* Location Info */}
                <div className="space-y-3 pl-2">
                  <h3 className="font-gantari font-bold text-[#020202] text-sm">Our location:</h3>
                  <div className="flex items-start gap-3 text-sm text-[#353535] font-gantari">
                    <span className="mt-2">📍</span>
                    <input
                      type="text"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      placeholder="Enter address"
                      className="text-sm text-[#353535] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent flex-1 py-1"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#353535] font-gantari">
                    <span>🌐</span>
                    <input
                      type="text"
                      value={locationWebsite}
                      onChange={(e) => setLocationWebsite(e.target.value)}
                      placeholder="Enter website"
                      className="text-sm text-[#353535] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent flex-1 py-1"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#353535] font-gantari">
                    <span>✉️</span>
                    <input
                      type="email"
                      value={locationEmail}
                      onChange={(e) => setLocationEmail(e.target.value)}
                      placeholder="Enter email"
                      className="text-sm text-[#353535] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent flex-1 py-1"
                    />
                  </div>
                </div>
              </section>

              {/* 3. SCOPE OF WORK */}
              <section className="mb-12">
                <h2 className="font-gantari font-bold text-xl text-[#020202] pb-2 mb-2">
                  3. Scope of Work
                </h2>

                {/* Scope Description */}
                <div className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] min-h-[120px] mb-6">
                  <textarea
                    value={scopeOfWork}
                    onChange={(e) => setScopeOfWork(e.target.value)}
                    placeholder="Enter Scope Description..."
                    className="font-gantari text-sm leading-relaxed text-justify text-[#353535] placeholder-[#8B8B8B] bg-transparent outline-none resize-none w-full min-h-[120px]"
                  />
                </div>

                {/* Technology Table */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-gantari font-bold text-[#020202] text-sm">Technology to be Used:</h3>
                    <button
                      onClick={addTechnologyRow}
                      className="text-xs font-gantari font-semibold text-white bg-[#353535] hover:bg-[#222] px-3 py-1.5 rounded-md transition-colors"
                    >
                      + Add Row
                    </button>
                  </div>
                  <div className="bg-[#F2F2F2] rounded-md overflow-hidden">
                    <table className="w-full text-sm font-gantari border-collapse">
                      <thead className="bg-[#EAEAEA]">
                        <tr>
                          <th className="text-left py-2 px-4 font-bold text-[#353535] w-24">S.No</th>
                          <th className="text-left py-2 px-4 font-bold text-[#353535]">Software</th>
                          <th className="py-2 px-4 font-bold text-[#353535] w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {technologies.map((t, idx) => (
                          <tr key={idx} className="border-t border-gray-200">
                            <td className="py-2 px-4 text-[#353535] font-medium">{idx + 1}.</td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={t.module}
                                onChange={(e) => updateTechnology(idx, e.target.value)}
                                placeholder="Software Name"
                                className="text-sm text-[#353535] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent w-full py-1"
                              />
                            </td>
                            <td className="py-2 px-4 text-center">
                              {technologies.length > 1 && (
                                <button
                                  onClick={() => removeTechnologyRow(idx)}
                                  className="text-red-400 hover:text-red-600 text-xs font-semibold transition-colors"
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* 4. DELIVERABLES */}
              <section className="mb-12">
                <h2 className="font-gantari font-bold text-xl text-[#020202] pb-2 mb-2">
                  4. Deliverables
                </h2>
                <div className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] min-h-[120px] mb-4">
                  <textarea
                    value={deliverables}
                    onChange={(e) => setDeliverables(e.target.value)}
                    placeholder="Enter Deliverables Introduction..."
                    className="font-gantari text-sm leading-relaxed text-justify text-[#353535] placeholder-[#8B8B8B] bg-transparent outline-none resize-none w-full min-h-[120px]"
                  />
                </div>
              </section>

              {/* 5. EXCLUSIONS */}
              <section className="mb-12">
                <h2 className="font-gantari font-bold text-xl text-[#020202] pb-2 mb-2">
                  5. Exclusions
                </h2>
                <div className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] min-h-[120px] mb-6">
                  <textarea
                    value={exclusions}
                    onChange={(e) => setExclusions(e.target.value)}
                    placeholder="Enter Exclusions details..."
                    className="font-gantari text-sm leading-relaxed text-justify text-[#353535] placeholder-[#8B8B8B] bg-transparent outline-none resize-none w-full min-h-[120px]"
                  />
                </div>
              </section>

              {/* Other Terms & Conditions */}
              <section className="mt-12 mb-8">
                <h2 className="text-center font-gantari font-bold text-lg text-[#000000] mb-6">
                  Other Terms & Conditions
                </h2>
                <div className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] min-h-[160px]">
                  <textarea
                    value={otherTerms}
                    onChange={(e) => setOtherTerms(e.target.value)}
                    placeholder="Enter other terms and conditions..."
                    className="font-gantari text-sm leading-relaxed text-justify text-[#353535] placeholder-[#8B8B8B] bg-transparent outline-none resize-none w-full min-h-[160px]"
                  />
                </div>

                <div className="mt-8 font-gantari text-[#353535] text-sm">
                  <p className="font-bold text-base mb-4 text-[#353535]">Best Regards:</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={bestRegardsName}
                      onChange={(e) => setBestRegardsName(e.target.value)}
                      placeholder="Name / Company"
                      className="text-sm text-[#353535] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent w-full py-1"
                    />
                    <input
                      type="text"
                      value={bestRegardsAddress}
                      onChange={(e) => setBestRegardsAddress(e.target.value)}
                      placeholder="Address"
                      className="text-sm text-[#353535] placeholder-[#8B8B8B] border-b border-gray-300 focus:border-[#353535] outline-none bg-transparent w-full py-1"
                    />
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
