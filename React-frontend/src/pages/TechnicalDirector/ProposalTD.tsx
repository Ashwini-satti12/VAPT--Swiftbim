import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import api from "../../lib/api";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
// import editIcon from '../../assets/ProjectManager/project/editIcon.svg';
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";

const toCamelCase = (str: string): string => {
  if (!str) return str;
  return str.toLowerCase().split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const SCROLLBAR_STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #979797;
    border-radius: 10px;
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #979797 transparent;
  }
  .hide-scrollbar-x::-webkit-scrollbar:horizontal {
    display: none;
  }
  .hide-scrollbar-x {
    -ms-overflow-style: none;
  }
`;

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
  className = "",
  styleType = "form",
  menuMaxHeightClass = "max-h-[220px]",
  direction = "down",
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
  styleType?: "form" | "header" | "table";
  /** Max height for header/form menu list (scroll when content exceeds), e.g. ~4 rows */
  menuMaxHeightClass?: string;
  /** Direction to open the dropdown menu */
  direction?: "up" | "down";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, bottom: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideTrigger = dropdownRef.current && dropdownRef.current.contains(target);
      const isInsideMenu = menuRef.current && menuRef.current.contains(target);

      if (!isInsideTrigger && !isInsideMenu) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const updatePosition = () => {
        if (dropdownRef.current) {
          const rect = dropdownRef.current.getBoundingClientRect();
          setCoords({
            top: rect.bottom,
            left: rect.left,
            width: rect.width,
            bottom: window.innerHeight - rect.top,
          });
        }
      };

      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  // Determine if we should show placeholder color or prefix
  const isPlaceholder = !value || value === placeholder;

  const menuContent = (
    <div
      ref={menuRef}
      className={`fixed z-[9999] bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] overflow-hidden`}
      style={{
        width: coords.width,
        left: coords.left,
        ...(direction === "up"
          ? { bottom: coords.bottom + 4 }
          : { top: coords.top + 4 }
        ),
      }}
    >
      <div className={`${menuMaxHeightClass} overflow-y-auto custom-scrollbar`}>
        {(styleType === "header" || styleType === "form") && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className={`w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${isPlaceholder
              ? "text-[#353535] bg-[#F2F2F2]"
              : "text-[#8B8B8B] bg-[#FFFFFF]"
              }`}
          >
            {`All ${placeholder}`}
          </button>
        )}
        {options.map((option) => {
          const isChosen = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen
                ? 'text-[#353535] bg-[#F2F2F2]'
                : 'text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]'
                }`}
            >
              <span className="truncate min-w-0">{option}</span>
              {isChosen && (
                <svg
                  className="w-4 h-4 shrink-0 text-[#353535]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <input
        type="text"
        value={value && value !== placeholder ? value : ""}
        required
        className="absolute opacity-0 pointer-events-none"
        tabIndex={-1}
        readOnly
      />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[36px] min-h-[36px] flex items-center justify-between gap-2 transition-all outline-none font-gantari min-w-0 ${styleType === "header"
          ? "px-3 py-2 bg-[#E8E8E8] rounded-md text-[12px] sm:text-[14px] font-semibold"
          : `px-4 py-2 bg-[#F2F3F4] rounded-md text-[12px] sm:text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
          }`}
      >
        <span className={`min-w-0 flex-1 truncate overflow-hidden text-left ${styleType === "header" || styleType === "form"
          ? (isPlaceholder ? "text-[#8B8B8B]" : "text-[#353535]")
          : ""
          }`}>
          {styleType === "header" && value && !isPlaceholder ? (
            <span className="font-semibold">{toCamelCase(value)}</span>
          ) : (
            placeholder
          )}
        </span>
        <img
          src={ArrowDown}
          alt=""
          className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isPlaceholder ? "opacity-60 grayscale" : "opacity-90"}`}
          aria-hidden
        />
      </button>
      {isOpen && createPortal(menuContent, document.body)}
    </div>
  );
}

interface VendorProposalRow {
  id: number;
  bid_id: number;
  opportunity_id: number;
  vendor_id: number;
  project_name?: string;
  vendor_name?: string;
  vendor_email?: string;
  bid_amount?: number;
  bid_currency?: string;
  opportunity_currency?: string;
  timeline?: string;
  status: string;
  reason?: string;
  created_at: string;
}

const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";
const SHOW_ENTRIES_SELECTED_PREFIX = "Show:";
const showEntriesOptions: {
  value: string;
  label: string;
  start: number;
  end: number | null;
}[] = [
  { value: "1-50", label: "1-50", start: 0, end: 50 },
  { value: "51-100", label: "51-100", start: 50, end: 100 },
  { value: "101-150", label: "101-150", start: 100, end: 150 },
  { value: "151-200", label: "151-200", start: 150, end: 200 },
  { value: "201-250", label: "201-250", start: 200, end: 250 },
  { value: "251-300", label: "251-300", start: 250, end: 300 },
  { value: "all", label: "All", start: 0, end: null },
];

export default function ProposalTD() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<VendorProposalRow[]>([]);
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (showEntriesOpen && showEntriesDropdownContentRef.current) {
      showEntriesDropdownContentRef.current.scrollTop = 0;
    }
  }, [showEntriesOpen]);

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  useEffect(() => {
    const state =
      (location && (location.state as { responded?: boolean; msg?: string })) ||
      {};
    if (state?.responded) toast.success(state.msg || "Proposal updated.");
    // Clean up state so toast doesn't re-appear on refresh
    if (location.state) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    api
      .get<{ success?: boolean; proposals?: VendorProposalRow[] }>(
        "/api/vendors/td/proposals",
      )
      .then(({ data }) => setProposals(data.proposals ?? []))
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount: number | string | undefined, currencyCode?: string) => {
    if (!amount) return "—";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    const currency = (currencyCode || "AED").toUpperCase();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusLabel = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "accepted") return "Accepted";
    if (s === "pending") return "Pending";
    if (s === "clarification_requested") return "Clarification requested";
    return status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "accepted") return "bg-[#E1F6EB] text-[#008F22]";
    if (s === "pending" || s === "active") return "bg-[#EAF0FB] text-[#1967D2]";
    if (s === "rejected") return "bg-[#FFD9D9] text-[#E00100]";
    return "bg-[#F2F2F2] text-[#616161]";
  };

  const searchQuery = searchParams.get("q")?.toLowerCase() || "";
  const filtered = proposals.filter((p) => {
    // Dropdown filters
    if (projectFilter && p.project_name !== projectFilter) return false;
    if (vendorFilter && p.vendor_name !== vendorFilter) return false;

    // Search query
    if (!searchQuery) return true;
    return (
      (p.project_name || "").toLowerCase().includes(searchQuery) ||
      (p.vendor_name || "").toLowerCase().includes(searchQuery) ||
      (p.vendor_email || "").toLowerCase().includes(searchQuery) ||
      (p.status || "").toLowerCase().includes(searchQuery) ||
      (p.timeline || "").toLowerCase().includes(searchQuery)
    );
  });

  const projectNames = Array.from(new Set(proposals.map(p => p.project_name || "").filter(Boolean))).sort();
  const vendorNames = Array.from(new Set(proposals.map(p => p.vendor_name || "").filter(Boolean))).sort();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowEntriesOpen(false);
      }
    };
    if (showEntriesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEntriesOpen]);

  const effectiveShowEntryValue =
    selectedShowEntries || showEntriesOptions[0].value;
  const selectedRange =
    showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ??
    showEntriesOptions[0];
  const rangeEnd =
    selectedRange.end === null
      ? filtered.length
      : Math.min(selectedRange.end, filtered.length);
  const listInRange = filtered.slice(selectedRange.start, rangeEnd);
  const tableRowsPerPage = 5;
  const tableTotalPages = Math.max(
    1,
    Math.ceil(listInRange.length / tableRowsPerPage),
  );
  const safeTableCurrentPage = Math.min(tableCurrentPage, tableTotalPages);
  const tablePageStartIndex = (safeTableCurrentPage - 1) * tableRowsPerPage;
  const displayList = listInRange.slice(
    tablePageStartIndex,
    tablePageStartIndex + tableRowsPerPage,
  );
  const tablePageRangeStart =
    listInRange.length === 0 ? 0 : selectedRange.start + tablePageStartIndex + 1;
  const tablePageRangeEnd =
    listInRange.length === 0
      ? 0
      : Math.min(
          selectedRange.start + tablePageStartIndex + tableRowsPerPage,
          rangeEnd,
        );
  const tablePageRangeLabel =
    listInRange.length === 0 ? "0-0" : `${tablePageRangeStart}-${tablePageRangeEnd}`;

  useEffect(() => {
    setTableCurrentPage(1);
  }, [selectedShowEntries, searchQuery, projectFilter, vendorFilter]);

  return (
    <div className="px-4 pt-1 pb-0 space-y-8 flex flex-col h-full bg-white relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#000000]">
            Proposals
          </h2>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Project Name Filter */}
          <CustomDropdown
            options={projectNames}
            value={projectFilter}
            onChange={setProjectFilter}
            placeholder="Project Name"
            styleType="header"
            className="w-full sm:w-[180px]"
          />

          {/* Vendor Name Filter */}
          <CustomDropdown
            options={vendorNames}
            value={vendorFilter}
            onChange={setVendorFilter}
            placeholder="Vendor Name"
            styleType="header"
            className="w-full sm:w-[180px]"
          />

          {/* Show entries dropdown */}
          <div
            className="relative w-full sm:w-[150px]"
            ref={showEntriesDropdownRef}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEntriesOpen((o) => !o);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
            >
              <span
                className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedShowEntries === "" ? "text-[#8B8B8B]" : "text-[#353535]"}`}
              >
                {selectedShowEntries === "" ? (
                  SHOW_ENTRIES_PLACEHOLDER
                ) : (
                  <>
                    <span className="text-[14px]">
                      {SHOW_ENTRIES_SELECTED_PREFIX}
                    </span>{" "}
                    <span className="font-semibold">{selectedRange.label}</span>
                  </>
                )}
              </span>
              <img
                src={ArrowDown}
                alt=""
                className={`w-3 h-3 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""} ${selectedShowEntries === "" ? "opacity-60 grayscale" : "opacity-90"}`}
                aria-hidden
              />
            </button>
            {showEntriesOpen && (
              <div className="absolute top-full right-0 left-auto mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                <div
                  ref={showEntriesDropdownContentRef}
                  className="max-h-[168px] overflow-y-auto custom-scrollbar"
                >
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedShowEntries("");
                      setShowEntriesOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
                  >
                    {SHOW_ENTRIES_PLACEHOLDER}
                  </button>
                  {showEntriesOptions.map((opt) => {
                    const isChosen = selectedShowEntries === opt.value;
                    return (
                      <button
                        key={`${opt.value}-${opt.start}-${String(opt.end)}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedShowEntries(opt.value);
                          setShowEntriesOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen ? "text-[#353535] bg-[#F2F2F2]" : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"}`}
                      >
                        <span className="truncate min-w-0">{opt.label}</span>
                        {isChosen && (
                          <svg
                            className="w-4 h-4 shrink-0 text-[#353535]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table/Card Card */}
      <div className="bg-white rounded-md border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative mx-0 mb-2 mb-[-2px]">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-[#616161] font-gantari px-4">
              <svg
                className="w-14 h-14 mx-auto mb-4 text-[#AEACAC]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-semibold mb-1 text-[#353535]">
                No vendor proposals yet
              </p>
              <p className="text-sm">
                Vendor proposals will appear here once submitted.
              </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-20 bg-white after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                <tr className="bg-white">
                  <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">Sl.No</th>
                  <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">Project Name</th>
                  <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">Vendor Name</th>
                  <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">Bid Amount</th>
                  <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">Timeline</th>
                  <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">Status</th>
                  <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                    {displayList.map((p, index) => {
                      const slNo = (
                        selectedRange.start +
                        tablePageStartIndex +
                        index +
                        1
                      )
                        .toString()
                        .padStart(2, "0");
                      const displayStatus = p.status;
                      return (
                        <tr key={p.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-Gantari whitespace-nowrap align-middle border-b border-[#F0F0F0]">{slNo}</td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-Gantari whitespace-nowrap align-middle border-b border-[#F0F0F0]">{p.project_name || "—"}</td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-Gantari whitespace-nowrap align-middle border-b border-[#F0F0F0]">{p.vendor_name || "—"}</td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-Gantari whitespace-nowrap align-middle border-b border-[#F0F0F0]">
                            {formatCurrency(p.bid_amount, p.bid_currency || p.opportunity_currency)}
                          </td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-Gantari whitespace-nowrap align-middle border-b border-[#F0F0F0]">{p.timeline || "—"}</td>
                          <td className="px-3 py-6 text-center whitespace-nowrap align-middle border-b border-[#F0F0F0]">
                            <span className={`inline-flex px-4 py-1.5 rounded-md text-[14px] font-Gantari ${getStatusBadge(displayStatus)}`}>
                              {getStatusLabel(displayStatus)}
                            </span>
                          </td>
                          <td className="px-3 py-6 text-center whitespace-nowrap align-middle border-b border-[#F0F0F0]">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  navigate(`/td/view-proposal?proposalId=${p.id}&source=vendor_submitted`, {
                                    state: { proposalId: p.id, bid: p, source: "vendor_submitted" },
                                  })
                                }
                                title="View Proposal"
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[14px] font-gantari transition-all bg-[#DD4342] text-white shadow-sm shadow-red-100 cursor-pointer"
                              >
                                <img src={viewIcon} alt="" className="w-4 h-4 object-contain brightness-0 invert" />
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
        )}
      </div>
      {!loading && filtered.length > 0 && listInRange.length > 0 && (
        <div className="w-full flex items-center justify-end mt-2 mb-[-12px] py-2 mx-2 sm:mx-0">
          <div className="flex items-center gap-4 bg-[#E8E8E8] rounded-md px-5 py-2">
            <span className="text-[#353535] text-[16px] font-medium font-gantari leading-none">
              Showing:
            </span>
            <button
              type="button"
              onClick={() =>
                setTableCurrentPage((p) => {
                  const cur = Math.min(Math.max(1, p), tableTotalPages);
                  return Math.max(1, cur - 1);
                })
              }
              disabled={safeTableCurrentPage === 1}
              className={`inline-flex items-center gap-1 text-[15px] font-medium font-gantari leading-none cursor-pointer ${
                safeTableCurrentPage === 1
                  ? "text-[#9CA3AF] opacity-50 cursor-not-allowed"
                  : "text-[#353535]"
              }`}
              aria-label="Previous page"
            >
              <span className="relative -top-[2px] inline-flex items-center justify-center text-[24px] leading-none">
                &#8249;
              </span>
              <span className="inline-flex items-center">Prev</span>
            </button>
            <button
              type="button"
              className="px-4 py-1 rounded-md bg-[#DD4342] text-[#FFFFFF] text-[14px] font-semibold font-gantari leading-none cursor-default"
              aria-current="page"
            >
              {tablePageRangeLabel}
            </button>
            <button
              type="button"
              onClick={() =>
                setTableCurrentPage((p) => {
                  const cur = Math.min(Math.max(1, p), tableTotalPages);
                  return Math.min(tableTotalPages, cur + 1);
                })
              }
              disabled={safeTableCurrentPage >= tableTotalPages}
              className={`inline-flex items-center gap-1 text-[15px] font-medium font-gantari leading-none cursor-pointer ${
                safeTableCurrentPage >= tableTotalPages
                  ? "text-[#9CA3AF] opacity-40 cursor-not-allowed"
                  : "text-[#353535]"
              }`}
              aria-label="Next page"
            >
              <span className="inline-flex items-center">Next</span>
              <span className="relative -top-[2px] inline-flex items-center justify-center text-[24px] leading-none">
                &#8250;
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
