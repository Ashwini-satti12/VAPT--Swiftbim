import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { FormDropdown } from "../TechnicalDirector/MytaskTD";

function stripHtml(html: string): string {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent?.trim() || "";
  } catch {
    return html;
  }
}
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import closeIcon from "../../assets/ProductNavbarIcons/close button.svg";

export type ModalOpportunity = {
  id: number;
  project_name: string;
  description?: string;
  scope_of_work?: string | null;
  technologies_used?: string | null;
  software_to_be_used?: string | null;
  bid_deadline: string;
  project_location?: string | null;
  project_due_date?: string | null;
  project_priority?: string | null;
  currency?: string;
  budget_ceiling?: number | string;
  outsource_budget?: number | string;
  /** Optional — shown in summary bar when present on the opportunity payload */
  vendor_name?: string | null;
  vendor_email?: string | null;
  received_on?: string | null;
  project_sector?: string | null;
  bim_services_required?: string | null;
};

export type BidFormState = {
  bid_amount: string;
  currency: string;
  notes: string;
  timeline: string;
  team_size: string;
};

type CurrencyRow = { code: string; label: string };

export type BiddingSubmitModalProps = {
  variant?: "modal" | "page";
  selectedOpp: ModalOpportunity;
  bidForm: BidFormState;
  setBidForm: Dispatch<SetStateAction<BidFormState>>;
  currencyDropdownOpen: boolean;
  setCurrencyDropdownOpen: (open: boolean) => void;
  bidAmountError: string | null;
  setBidAmountError: (v: string | null) => void;
  setBidError: (v: string | null) => void;
  bidError: string | null;
  bidSubmitting: boolean;
  closeSubmitBidModal: () => void;
  handleBidSubmit: () => void;
  currencies: CurrencyRow[];
  submitModalMaxBid: number | null;
  submitModalMaxBidInEntered: number | null;
  submitEnteredCurrency: string;
  submitBidOverMax: boolean;
  formatBudget: (amount: number, currencyCode?: string) => string;
  parseBidAmountInput: (raw: string) => number | null;
  maxBidAmountForOpportunity: (opp: ModalOpportunity) => number | null;
  bidTooHighMessage: (maxVal: number, currency?: string) => string;
};

export function BiddingSubmitModal({
  variant = "modal",
  selectedOpp,
  bidForm,
  setBidForm,
  currencyDropdownOpen,
  setCurrencyDropdownOpen,
  bidAmountError,
  setBidAmountError,
  setBidError,
  bidError,
  bidSubmitting,
  closeSubmitBidModal,
  handleBidSubmit,
  currencies,
  submitModalMaxBid,
  submitModalMaxBidInEntered,
  submitEnteredCurrency,
  submitBidOverMax,
  formatBudget,
  parseBidAmountInput,
  maxBidAmountForOpportunity,
  bidTooHighMessage,
}: BiddingSubmitModalProps) {
  /** UI-only draft fields (not sent with POST /bid — keeps parent + API integration unchanged). */
  const [proposalDraft, setProposalDraft] = useState({
    executive_summary: "",
    scope_of_work: "",
    technologies: ["", ""],
    deliverables: "",
    exclusions: "",
  });

  const parseTechnologies = (
    technologiesUsed?: string | null,
    softwareToBeUsed?: string | null,
  ): string[] => {
    const raw = String(technologiesUsed || softwareToBeUsed || "").trim();
    if (!raw) return ["", ""];

    const toSoftwareLabel = (row: unknown): string => {
      if (row && typeof row === "object") {
        const r = row as Record<string, unknown>;
        return String(
          r.software ?? r.module ?? r.name ?? r.value ?? "",
        ).trim();
      }
      return String(row ?? "").trim();
    };

    // Backend may return JSON from proposals.technologies_used.
    // Sometimes it arrives double-encoded, so parse up to 2 times.
    const tryParseJson = (text: string): unknown => {
      let parsed: unknown = text;
      for (let i = 0; i < 2; i++) {
        if (typeof parsed !== "string") break;
        const s = parsed.trim();
        if (!(s.startsWith("[") || s.startsWith("{") || s.startsWith("\""))) break;
        try {
          parsed = JSON.parse(s);
        } catch {
          break;
        }
      }
      return parsed;
    };

    if (raw.startsWith("[") || raw.startsWith("{") || raw.startsWith("\"")) {
      try {
        const parsed = tryParseJson(raw);
        if (Array.isArray(parsed)) {
          const out = parsed
            .map((row) => toSoftwareLabel(row))
            .filter(Boolean);
          if (out.length) return out;
        }
        if (parsed && typeof parsed === "object") {
          const single = toSoftwareLabel(parsed);
          if (single) return [single];
        }
      } catch {
        // Fallback to plain-text parsing.
      }
    }

    const textList = raw
      .split(/\r?\n|,|;|\|/)
      .map((s) => s.trim())
      .filter(Boolean);
    return textList.length ? textList : ["", ""];
  };

  useEffect(() => {
    setProposalDraft({
      executive_summary: "",
      // Scope from backend can contain rich HTML; show readable plain text in textarea.
      scope_of_work: stripHtml(String(selectedOpp.scope_of_work || "")).trim(),
      technologies: parseTechnologies(
        selectedOpp.technologies_used,
        selectedOpp.software_to_be_used,
      ),
      deliverables: "",
      exclusions: "",
    });
  }, [selectedOpp.id, selectedOpp.scope_of_work, selectedOpp.technologies_used, selectedOpp.software_to_be_used]);

  const currencyTriggerRef = useRef<HTMLElement | null>(null);
  const currencyMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!currencyDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      const inside =
        (currencyTriggerRef.current?.contains(t) ?? false) ||
        (currencyMenuRef.current?.contains(t) ?? false);
      if (!inside) setCurrencyDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currencyDropdownOpen]);

  const emDash = "—";
  const bidDeadlineMeta =
    selectedOpp.bid_deadline && String(selectedOpp.bid_deadline).trim()
      ? new Date(selectedOpp.bid_deadline).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : emDash;
  const locationMeta =
    (selectedOpp.project_location && String(selectedOpp.project_location).trim()) ||
    emDash;
  const dueMeta =
    (selectedOpp.project_due_date && String(selectedOpp.project_due_date).trim()) ||
    emDash;
  const priorityMeta =
    (selectedOpp.project_priority && String(selectedOpp.project_priority).trim()) ||
    emDash;

  /** Summary bar: project name, bid deadline, project due date, bid amount (px-5 py-2). */
  const opportunitySummaryBanner = (
    <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md px-5 py-2 flex flex-wrap items-stretch w-full">
      <div className="flex-1 min-w-[100px] px-2 py-0.5 border-r border-[#AEACAC52] text-center">
        <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
          Project Name
        </p>
        <p
          className="text-[#616161] text-[13px] sm:text-[14px] font-gantari truncate"
          title={selectedOpp.project_name || undefined}
        >
          {selectedOpp.project_name || emDash}
        </p>
      </div>
      <div className="flex-1 min-w-[100px] px-2 py-0.5 border-r border-[#AEACAC52] text-center">
        <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
          Bid deadline
        </p>
        <p className="text-[#616161] text-[13px] sm:text-[14px] font-gantari">
          {bidDeadlineMeta}
        </p>
      </div>
      <div className="flex-1 min-w-[100px] px-2 py-0.5 border-r border-[#AEACAC52] text-center">
        <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
          Project due date
        </p>
        <p className="text-[#616161] text-[13px] sm:text-[14px] font-gantari">
          {dueMeta}
        </p>
      </div>
      <div className="flex-1 min-w-[100px] px-2 py-0.5 text-center sm:last:border-r-0">
        <p className="text-[14px] sm:text-[15px] font-semibold text-[#020202] mb-1 font-gantari">
          Bid amount
        </p>
        <p
          className="text-[#616161] text-[13px] sm:text-[14px] font-gantari truncate"
          title={
            selectedOpp.budget_ceiling || selectedOpp.outsource_budget 
              ? String(selectedOpp.budget_ceiling || selectedOpp.outsource_budget) 
              : undefined
          }
        >
          {formatBudget(
            Number(selectedOpp.budget_ceiling) || Number(selectedOpp.outsource_budget) || 0, 
            selectedOpp.currency
          )}
        </p>
      </div>
    </div>
  );

  /** AddTaskTD-style shells: transparent border, focus ring as border, px-4 placeholders. */
  const tdLikeControlShell =
    "w-full rounded-[5px] bg-[#F2F3F4] border border-transparent px-4 py-2 text-left text-[14px] font-gantari outline-none transition-all focus:border-[#AEACAC52] focus:ring-0";

  const textareaBoxClass =
    `${tdLikeControlShell} min-h-[88px] text-[#353535] placeholder:font-normal placeholder:text-[14px] placeholder:text-[#8B8B8B] resize-y leading-relaxed`;

  const readOnlyOpportunityFieldClass =
    `${tdLikeControlShell} cursor-default text-[#353535]`;

  const descriptionReadOnlyBoxClass =
    `${tdLikeControlShell} min-h-[88px] text-[#8B8B8B] whitespace-pre-wrap overflow-y-auto custom-scrollbar leading-relaxed`;

  const bidFormInputShell =
    `${tdLikeControlShell} text-[#353535] placeholder:font-normal placeholder:text-[14px] placeholder:text-[#8B8B8B]`;

  const proposalDetailFields = (
    <div className="flex flex-col gap-10 mb-8">
     <div className="space-y-4">
        <h2 className="font-bold text-[16px] text-[#020202] font-gantari">
          Scope of Work
        </h2>
        {(selectedOpp.project_sector || selectedOpp.bim_services_required) && (
          <div className="bg-[#F9F9F9] border border-[#AEACAC52] rounded-md p-6 space-y-4">
            {selectedOpp.project_sector && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                <div className="font-bold text-[#353535] w-[220px] flex justify-between flex-shrink-0 font-gantari text-[14px]">
                  <span>Project Sector</span>
                  <span>:</span>
                </div>
                <span className="text-[#616161] font-normal font-gantari text-[14px]">
                  {selectedOpp.project_sector}
                </span>
              </div>
            )}
            {selectedOpp.bim_services_required && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                <div className="font-bold text-[#353535] w-[220px] flex justify-between flex-shrink-0 font-gantari text-[14px]">
                  <span>BIM Services Required</span>
                  <span>:</span>
                </div>
                <span className="text-[#616161] font-normal font-gantari text-[14px]">
                  {selectedOpp.bim_services_required}
                </span>
              </div>
            )}
          </div>
        )}
        <textarea
          value={proposalDraft.scope_of_work}
          onChange={(e) =>
            setProposalDraft((d) => ({ ...d, scope_of_work: e.target.value }))
          }
          rows={5}
          className={textareaBoxClass}
          placeholder="Scope of Work"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-[16px] text-[#020202] font-gantari">
            Technology to be Used
          </h2>
        </div>
        <div className="bg-[#F2F2F2] rounded-md overflow-hidden border border-[#AEACAC52]">
          <table className="w-full">
            <thead className="bg-[#F2F2F2]">
              <tr>
                <th className="px-4 py-3 text-left w-16 font-gantari font-bold text-gray-700 text-sm border-b border-[#AEACAC52]">
                  Sl.No
                </th>
                <th className="px-4 py-3 text-left font-gantari font-bold text-gray-700 text-sm border-b border-[#AEACAC52]">
                  Software
                </th>
              </tr>
            </thead>
            <tbody>
              {proposalDraft.technologies.map((row, i) => (
                <tr
                  key={i}
                  className={`${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"} border-t border-gray-100`}
                >
                  <td className="px-4 py-2 align-middle">
                    <span className="font-gantari text-[#020202] text-[14px]">
                      {i + 1}.
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row}
                      onChange={(e) => {
                        const v = e.target.value;
                        setProposalDraft((d) => ({
                          ...d,
                          technologies: d.technologies.map((t, j) =>
                            j === i ? v : t,
                          ),
                        }));
                      }}
                      className="w-full bg-transparent border-0 px-2 py-1.5 text-[14px] text-[#353535] font-gantari placeholder:text-[#8B8B8B] focus:ring-0 outline-none"
                      placeholder={`Software ${i + 1}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div>
          <label className="block text-[16px] font-medium text-[#353535] mb-2 font-gantari">
            Location
          </label>
          <input
            type="text"
            readOnly
            tabIndex={-1}
            value={locationMeta}
            className={readOnlyOpportunityFieldClass}
            aria-label="Project location from opportunity"
          />
        </div>
        <div>
          <label className="block text-[16px] font-medium text-[#353535] mb-2 font-gantari">
            Priority
          </label>
          <input
            type="text"
            readOnly
            tabIndex={-1}
            value={priorityMeta}
            className={readOnlyOpportunityFieldClass}
            aria-label="Project priority from opportunity"
          />
        </div>
      </div>
    </div>
  );

  const projectSummaryModal = (
    <div className="mb-6 space-y-4">
      <div className="space-y-4">
        {opportunitySummaryBanner}
      </div>
      <div className="text-sm font-medium text-[#353535] bg-[#F8F8F8] p-4 rounded-xl border border-gray-100 space-y-2 max-h-[min(40vh,320px)] overflow-y-auto custom-scrollbar">
        {/* Description section removed */}
      </div>
    </div>
  );

  /** Same project facts as the modal, inlined into the page flow (no extra card/section). */
  const projectSummaryPage = (
    <div className="mb-8 space-y-6">
      <div className="space-y-4">
        {opportunitySummaryBanner}
      </div>
      {/* Description section removed */}
    </div>
  );

  const formFields = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
        <div>
          <label className="block text-[16px] font-medium text-[#353535] mb-2 font-gantari">
            Currency <span className="text-[#DE3D3A]">*</span>
          </label>
          <FormDropdown
            label="Select currency"
            options={currencies.map((c) => ({
              value: c.code,
              label: `${c.label} (${c.code})`,
            }))}
            value={bidForm.currency}
            onChange={(v) => setBidForm((f) => ({ ...f, currency: v }))}
            isOpen={currencyDropdownOpen}
            onToggle={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
            onClose={() => setCurrencyDropdownOpen(false)}
            triggerRef={currencyTriggerRef}
            dropdownRef={currencyMenuRef}
            searchable
            maxVisibleRows={4}
            bgClass="bg-[#F2F3F4]"
            fontClass="font-normal"
          />
        </div>
        <div>
          <label className="block text-[16px] font-medium text-[#353535] mb-2 font-gantari">
            Enter your Bid Amount <span className="text-[#DE3D3A]">*</span>
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={bidForm.bid_amount}
            onChange={(e) => {
              const v = e.target.value;
              setBidForm((f) => ({ ...f, bid_amount: v }));
              setBidError(null);
              const max = maxBidAmountForOpportunity(selectedOpp);
              const n = parseBidAmountInput(v);
              if (max != null && n != null && n > max) {
                setBidAmountError(bidTooHighMessage(max, bidForm.currency));
              } else {
                setBidAmountError(null);
              }
            }}
            className={`${bidFormInputShell} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              bidAmountError
                ? "border-[#DE3D3A] bg-[#FFF8F8] focus:border-[#DE3D3A]"
                : ""
            }`}
            placeholder="0.00"
            min={0}
            step="0.01"
            aria-invalid={bidAmountError ? true : undefined}
            aria-describedby={
              bidAmountError ? "bid-amount-error" : undefined
            }
          />
        </div>
      </div>
      {bidAmountError && (
        <p
          id="bid-amount-error"
          className="mt-2 text-sm font-semibold text-[#DE3D3A] leading-snug"
        >
          {bidAmountError}
        </p>
      )}
      {!bidAmountError && submitModalMaxBid != null && (
        <p className="mt-1.5 text-[14px] font-gantari text-[#666666]">
          Maximum bid for this opportunity:{" "}
          {formatBudget(
            submitModalMaxBidInEntered ?? submitModalMaxBid,
            submitEnteredCurrency,
          )}
        </p>
      )}

      <div className="grid grid-cols-2 gap-8">
        <div>
          <label className="block text-[16px] font-medium text-[#353535] mb-2 font-gantari">
            Timeline
          </label>
          <input
            type="text"
            value={bidForm.timeline}
            onChange={(e) =>
              setBidForm((f) => ({ ...f, timeline: e.target.value }))
            }
            className={bidFormInputShell}
            placeholder="e.g. 2 months"
          />
        </div>
        <div>
          <label className="block text-[16px] font-medium text-[#353535] mb-2 font-gantari">
            Team Size
          </label>
          <input
            type="number"
            value={bidForm.team_size}
            onChange={(e) =>
              setBidForm((f) => ({ ...f, team_size: e.target.value }))
            }
            className={`${bidFormInputShell} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <label className="block text-[16px] font-medium text-[#353535] mb-2 font-gantari">
          Additional Notes
        </label>
        <textarea
          value={bidForm.notes}
          onChange={(e) =>
            setBidForm((f) => ({ ...f, notes: e.target.value }))
          }
          rows={3}
          className={`${bidFormInputShell} resize-none`}
          placeholder="Add context for your proposal..."
        />
      </div>
      {bidError && (
        <div className="p-3 bg-[#FFE5E5] rounded-lg text-xs text-[#DE3D3A] font-bold">
          {bidError}
        </div>
      )}
    </div>
  );

  const actions = (
    <div className="mt-8 flex justify-center gap-3">
      <button
        type="button"
        onClick={closeSubmitBidModal}
        className="px-6 py-2 bg-[#F2F2F2] text-[#353535] rounded-md font-medium transition-all"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleBidSubmit}
        disabled={bidSubmitting || submitBidOverMax}
        className="px-6 py-2 bg-[#DE3D3A] text-white rounded-md font-medium transition-all disabled:opacity-50"
      >
        {bidSubmitting ? "Processing..." : "Submit Bid"}
      </button>
    </div>
  );

  const modalHeader = (
    <div className="relative flex items-center justify-center mb-8">
      <div className="absolute left-0 group">
        <button
          type="button"
          onClick={closeSubmitBidModal}
          className="p-2 bg-[#F2F2F2] rounded-md transition-colors cursor-pointer flex items-center justify-center"
        >
          <img src={closeIcon} alt="close" className="w-5 h-5" />
        </button>
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
          <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
          <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-5 py-0.5 relative z-10">
            <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
              Close
            </span>
          </div>
        </div>
      </div>
      <h3 className="text-[24px] font-gantari font-medium text-[#000000]">
        Submit Bid
      </h3>
    </div>
  );

  if (variant === "page") {
    return (
      <div className="h-full flex flex-col font-gantari animate-in fade-in duration-300 px-5 py-2">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="relative group">
            <button
              type="button"
              onClick={closeSubmitBidModal}
              className="p-2 border-none bg-[#F2F2F2] rounded-md transition-opacity cursor-pointer flex items-center justify-center font-gantari"
            >
              <img src={backIcon} alt="back" className="w-5 h-5" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10">
                <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                  Go Back
                </span>
              </div>
            </div>
          </div>
          <h2 className="flex-1 text-center text-[24px] font-medium text-[#000000] font-gantari">
          Project Details & Bid
          </h2>
          <div className="w-10" />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6">
          <div className="w-full">
            {projectSummaryPage}
            {proposalDetailFields}
            {formFields}
            {actions}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-md p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        {modalHeader}
        {projectSummaryModal}
        {proposalDetailFields}
        {formFields}
        {actions}
      </div>
    </div>
  );
}
