import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

// TipTap rich text editor with toolbar
function TiptapEditor({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] px-4 py-3 font-gantari text-[#353535] text-base focus:outline-none prose prose-sm max-w-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && (value === "" || value === "<p></p>") && current !== "<p></p>") {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={`rounded-md border border-[rgb(89,89,89)]/20 overflow-hidden bg-[#F9FAFB] ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-[rgb(89,89,89)]/20 bg-white px-2 py-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded px-2 py-1 text-sm font-semibold ${editor.isActive("bold") ? "bg-gray-200" : "hover:bg-gray-100"}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded px-2 py-1 text-sm italic ${editor.isActive("italic") ? "bg-gray-200" : "hover:bg-gray-100"}`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded px-2 py-1 text-sm ${editor.isActive("bulletList") ? "bg-gray-200" : "hover:bg-gray-100"}`}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded px-2 py-1 text-sm ${editor.isActive("orderedList") ? "bg-gray-200" : "hover:bg-gray-100"}`}
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded px-2 py-1 text-sm ${editor.isActive("heading", { level: 2 }) ? "bg-gray-200" : "hover:bg-gray-100"}`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`rounded px-2 py-1 text-sm font-mono ${editor.isActive("codeBlock") ? "bg-gray-200" : "hover:bg-gray-100"}`}
        >
          {"</>"}
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export default function NewProposalForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState: any = (location && (location as any).state) || {};

  // Show notification when redirected here after create/update actions
  useEffect(() => {
    const state: any = (location && (location as any).state) || {};
    if (state?.createdServiceId || state?.created) {
      setNotification({ visible: true, message: "Proposal created successfully" });
      const t = setTimeout(() => {
        setNotification({ visible: false, message: "" });
        // clear location state so notification doesn't reappear
        navigate(location.pathname, { replace: true, state: {} });
      }, 1400);
      return () => clearTimeout(t);
    }

    if (state?.updated || state?.updatedServiceId || state?.updateSuccess) {
      setNotification({ visible: true, message: "Proposal updated successfully" });
      const t = setTimeout(() => {
        setNotification({ visible: false, message: "" });
        navigate(location.pathname, { replace: true, state: {} });
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  // Section States
  const [serviceId, setServiceId] = useState(navState?.serviceId || "");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [aboutUs, setAboutUs] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationWebsite, setLocationWebsite] = useState("");
  const [locationEmail, setLocationEmail] = useState("");
  const [scopeDescription, setScopeDescription] = useState("");

  // Technology Table State
  const [techRows, setTechRows] = useState([{ module: "" }]);

  // Deliverables & Exclusions
  const [deliverablesIntro, setDeliverablesIntro] = useState("");

  const [exclusionsContent, setExclusionsContent] = useState("");

  // Notification state for success/failure toasts
  const [notification, setNotification] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  // Handlers for Technology Table
  const handleAddTechRow = () => {
    setTechRows([...techRows, { module: "" }]);
  };
  const handleTechRowChange = (index: number, value: string) => {
    const updated = [...techRows];
    updated[index].module = value;
    setTechRows(updated);
  };
  const handleRemoveTechRow = (index: number) => {
    if (techRows.length > 1) {
      setTechRows(techRows.filter((_, i) => i !== index));
    }
  };

  const handleDiscard = () => {
    navigate("/td/create-proposal");
  };

  const handleCreate = () => {
    setNotification({ visible: true, message: "Proposal created successfully!" });
    setTimeout(() => {
      setNotification({ visible: false, message: "" });
      navigate("/td/manage-proposal", {
        state: {
          createdServiceId: serviceId,
          createdServiceNumeric: String(serviceId).replace(/\D/g, ""),
          toast: "Proposal created successfully!",
        },
      });
    }, 1600);
  };

  return (
    <div className="min-h-screen">
      {/* Toast notification */}
      {notification.visible && (
        <div className="fixed top-6 right-6 z-[9999] animate-fade-in">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl font-gantari text-sm font-medium min-w-[280px] ${notification.message.startsWith("Error")
                ? "bg-red-600 text-white"
                : "bg-[#1A8A47] text-white"
              }`}
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
          >
            {notification.message.startsWith("Error") ? (
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
      {/* Content only — sidebar and navbar from AppLayout */}
      <div className="w-full">
          {/* <div className="bg-white border border-[rgb(89,89,89)]/20 rounded-xl shadow-sm p-8 w-full"> */}
            {/* Page Header */}
            <div className="flex items-center justify-center mb-6">
              <h1 className="font-gantari font-semibold text-xl text-[#020202]">
                Create Proposal
              </h1>
            </div>

            {/* Service ID Field */}
            <div className="mb-8">
              <label className="block font-gantari font-bold text-lg text-[#020202] mb-2 ">
                Service ID
              </label>
              <input
                type="text"
                value={serviceId}
                onChange={(e) => {
                  if (navState?.serviceId) return;
                  setServiceId(e.target.value);
                }}
                placeholder="Service ID..."
                disabled={!!navState?.serviceId}
                className={`w-full px-4 py-3 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-base placeholder:text-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] ${navState?.serviceId ? "cursor-not-allowed opacity-90" : ""}`}
              />
            </div>

            {/* 1. EXECUTIVE SUMMARY */}
            <div className="mb-8">
              <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                1. Executive Summary <span className="text-red-500">*</span>
              </h2>
              <textarea
                rows={5}
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
                placeholder="Enter Executive Summary..."
                className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-base placeholder:text-[#8B8B8B] resize-none focus:outline-none focus:ring-1 focus:ring-[#D2D2D2]"
              />
            </div>

            {/* 2. ABOUT US */}
            <div className="mb-8">
              <h2 className="font-gantari font-bold text-lg text-[#020202] mb-0">
                2. About Us <span className="text-red-500">*</span>
              </h2>
              <textarea
                rows={5}
                value={aboutUs}
                onChange={(e) => setAboutUs(e.target.value)}
                placeholder="Enter About Us content..."
                className="w-full px-4 py-3 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-base placeholder:text-[#8B8B8B] resize-none focus:outline-none focus:ring-1 focus:ring-[#D2D2D2]"
              />
              <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-200">
                <h3 className="font-gantari font-semibold text-[#020202]">
                  Our location:
                </h3>
                <div className="flex items-start gap-3">
                  <div className="mt-1 min-w-[20px] text-center">📍</div>
                  <textarea
                    rows={2}
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="Address..."
                    className="w-full px-3 py-2 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-base placeholder:text-[#8B8B8B] resize-none focus:outline-none focus:ring-1 focus:ring-[#D2D2D2]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="min-w-[20px] text-center">🌐</div>
                  <input
                    type="text"
                    value={locationWebsite}
                    onChange={(e) => setLocationWebsite(e.target.value)}
                    placeholder="Website URL..."
                    className="w-full px-3 py-2 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-base placeholder:text-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="min-w-[20px] text-center">✉️</div>
                  <input
                    type="text"
                    value={locationEmail}
                    onChange={(e) => setLocationEmail(e.target.value)}
                    placeholder="Email Address..."
                    className="w-full px-3 py-2 rounded-md bg-[#F2F2F2] font-gantari text-[#353535] text-base placeholder:text-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2]"
                  />
                </div>
              </div>
            </div>

            {/* 3. SCOPE OF WORK */}
            <div className="mb-8">
              <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                3. Scope of Work <span className="text-red-500">*</span>
              </h2>

              <div className="mb-6">
                <TiptapEditor
                  value={scopeDescription}
                  onChange={setScopeDescription}
                  placeholder="General Scope Description..."
                />
              </div>


              <div className="flex items-center justify-between mb-2 mt-4">
                <label className="block font-gantari font-bold text-[#020202] text-lg mb-0">
                  Technology to be Used:
                </label>
                <div>
                  <button
                    onClick={handleAddTechRow}
                    className="text-base bg-[#DD4342] text-[#FFFFFF] px-3 py-2 rounded transition-colors"
                  >
                    + Add Row
                  </button>
                </div>
              </div>
              <div className="bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                <div className="bg-white">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="px-4 py-3 text-left w-16 font-gantari font-bold text-gray-700">
                          S.No
                        </th>
                        <th className="px-4 py-3 text-left font-gantari font-bold text-gray-700">
                          Software
                        </th>
                        <th className="px-4 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {techRows.map((row, index) => (
                        <tr key={index} className="border-t border-gray-100">
                          <td className="px-4 py-3">
                            <span className="font-gantari text-[#020202]">
                              {index + 1}.
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.module}
                              onChange={(e) =>
                                handleTechRowChange(index, e.target.value)
                              }
                              placeholder="Enter Technology Name..."
                              className="w-full px-2 py-1 rounded bg-transparent focus:bg-[#F2F2F2] outline-none font-gantari text-[#353535] text-base"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemoveTechRow(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 4. DELIVERABLES */}
            <div className="mb-8">
              <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3 ">
                4. Deliverables <span className="text-red-500">*</span>
              </h2>
              <div className="mb-4">
                <TiptapEditor
                  value={deliverablesIntro}
                  onChange={setDeliverablesIntro}
                  placeholder="Deliverables introduction..."
                />
              </div>
            </div>

            {/* 5.1 EXCLUSIONS */}
            <div className="mb-8">
              <h2 className="font-gantari font-bold text-lg text-[#020202] mb-3">
                5.1 Exclusions <span className="text-red-500">*</span>
              </h2>
              <div className="mb-12">
                <TiptapEditor
                  value={exclusionsContent}
                  onChange={setExclusionsContent}
                  placeholder="Exclusions details..."
                />
              </div>
            </div>

            {/* 6. COMMERCIAL OFFER */}
            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleDiscard}
                className="bg-[#F2F2F2] hover:bg-[#DBE9FE] text-[#616161] hover:text-[#101827] font-gantari font-medium px-6 py-2 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-[#D2D2D2]"
              >
                Discard
              </button>
              <button
                onClick={handleCreate}
                className="bg-[#F2F2F2] hover:bg-[#DBE9FE] text-[#616161] hover:text-[#101827] font-gantari font-medium px-6 py-2 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-[#D2D2D2]"
              >
                Create
              </button>
            </div>
          {/* </div> */}
      </div>
    </div>
  );
}
