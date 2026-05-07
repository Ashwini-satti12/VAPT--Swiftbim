import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import closeIcon from "../../assets/ProductNavbarIcons/close button.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";

const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";
const EMPLOYEE_FILTER_PLACEHOLDER = "Select Employee";

interface LeaveEntry {
  id: number;
  slNo: number;
  employeeId?: number;
  employeeName: string;
  role?: string;
  leaveType: string;
  appliedOn: string;
  appliedTo?: string;
  currentStatus: string;
  statusCode?: number;
  fromDate?: string;
  toDate?: string;
  description?: string;
}

function isBimLeadRole(role: string | undefined): boolean {
  const r = (role || "").trim().toLowerCase();
  return r === "bim lead" || r.includes("bim lead");
}

function isProjectManagerRole(role: string | undefined): boolean {
  const r = (role || "").trim().toLowerCase();
  return r === "project manager" || r.includes("project manager");
}

function mapLeaveStatusFromApi(
  status: unknown,
  applicantRole: string | undefined,
): string {
  const s = Number(status);
  if (s === 1) return "Approved";
  if (s === 2) return "Rejected";
  if (s === 5) return "Pending";
  if (s === 0 && isBimLeadRole(applicantRole)) return "Pending";
  if (s === 0 && isProjectManagerRole(applicantRole)) return "Pending";
  return "Pending";
}

const DUMMY_LEAVES: LeaveEntry[] = [
  {
    id: 1,
    slNo: 1,
    employeeName: "John Doe",
    role: "BIM Modeler",
    leaveType: "Sick Leave",
    appliedOn: "01/03/2026",
    appliedTo: "BIM Lead",
    currentStatus: "Approved",
    fromDate: "02/03/2026",
    toDate: "03/03/2026",
    description: "Medical appointment",
  },
  {
    id: 2,
    slNo: 2,
    employeeName: "Jane Smith",
    role: "BIM Modeler",
    leaveType: "Casual Leave",
    appliedOn: "28/02/2026",
    appliedTo: "BIM Lead",
    currentStatus: "Pending",
    fromDate: "05/03/2026",
    toDate: "06/03/2026",
    description: "Family event",
  },
  {
    id: 3,
    slNo: 3,
    employeeName: "Mike Johnson",
    role: "BIM Lead",
    leaveType: "Earned Leave",
    appliedOn: "25/02/2026",
    appliedTo: "Project Manager",
    currentStatus: "Approved",
    fromDate: "10/03/2026",
    toDate: "12/03/2026",
    description: "Personal",
  },
  {
    id: 4,
    slNo: 4,
    employeeName: "Sarah Williams",
    role: "BIM Modeler",
    leaveType: "Sick Leave",
    appliedOn: "20/02/2026",
    appliedTo: "BIM Lead",
    currentStatus: "Rejected",
    fromDate: "21/02/2026",
    toDate: "22/02/2026",
    description: "Fever",
  },
  {
    id: 5,
    slNo: 5,
    employeeName: "David Brown",
    role: "BIM Modeler",
    leaveType: "Casual Leave",
    appliedOn: "15/02/2026",
    appliedTo: "BIM Lead",
    currentStatus: "Approved",
    fromDate: "18/02/2026",
    toDate: "19/02/2026",
    description: "Travel",
  },
  {
    id: 6,
    slNo: 6,
    employeeName: "Emma Wilson",
    role: "BIM Modeler",
    leaveType: "Sick Leave",
    appliedOn: "12/02/2026",
    appliedTo: "BIM Lead",
    currentStatus: "Approved",
    fromDate: "13/02/2026",
    toDate: "14/02/2026",
    description: "Recovery",
  },
  {
    id: 7,
    slNo: 7,
    employeeName: "James Davis",
    role: "BIM Modeler",
    leaveType: "Earned Leave",
    appliedOn: "10/02/2026",
    appliedTo: "BIM Lead",
    currentStatus: "Pending",
    fromDate: "20/03/2026",
    toDate: "22/03/2026",
    description: "Vacation",
  },
  {
    id: 8,
    slNo: 8,
    employeeName: "Olivia Martinez",
    role: "BIM Modeler",
    leaveType: "Casual Leave",
    appliedOn: "08/02/2026",
    appliedTo: "BIM Lead",
    currentStatus: "Approved",
    fromDate: "09/02/2026",
    toDate: "10/02/2026",
    description: "Personal work",
  },
  {
    id: 9,
    slNo: 9,
    employeeName: "William Taylor",
    role: "BIM Modeler",
    leaveType: "Sick Leave",
    appliedOn: "05/02/2026",
    appliedTo: "BIM Lead",
    currentStatus: "Rejected",
    fromDate: "06/02/2026",
    toDate: "07/02/2026",
    description: "Doctor visit",
  },
  {
    id: 10,
    slNo: 10,
    employeeName: "Sophia Anderson",
    role: "BIM Modeler",
    leaveType: "Maternity Leave",
    appliedOn: "01/02/2026",
    appliedTo: "BIM Lead",
    currentStatus: "Approved",
    fromDate: "15/02/2026",
    toDate: "15/05/2026",
    description: "Maternity",
  },
];

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

/** Format ISO date (or plain YYYY-MM-DD) to DD/MM/YYYY for table display. */
function formatApiDate(value: string | undefined | null): string {
  if (!value) return "";
  const s = String(value);
  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return s;
  }
}

export default function ManageLeave() {
  const { user } = useAuth();
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null);
  const [approveLeave, setApproveLeave] = useState<LeaveEntry | null>(null);
  const [rejectLeave, setRejectLeave] = useState<LeaveEntry | null>(null);
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);

  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const employeeDropdownContentRef = useRef<HTMLDivElement>(null);
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
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
    if (employeeDropdownOpen && employeeDropdownContentRef.current) {
      employeeDropdownContentRef.current.scrollTop = 0;
    }
  }, [employeeDropdownOpen]);

  const employeeOptions = Array.from(new Set(leaves.map((l) => l.employeeName)));

  // Load leave applications: TD sees
  //  - BIM Lead leaves at status 5 (PM approved → TD is final approver)
  //  - BIM Lead leaves with final status 1/2 (history/visibility)
  //  - Project Manager leaves at status 0 (TD is first approver for PM)
  //  - Project Manager leaves with final status 1/2 (history/visibility)
  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const { data } = await api.get<{ applications?: any[] }>(
          "/api/leave/applications",
        );
        const apps = (data.applications || []).filter((app) => {
          const statusNum = Number(app.status);
          // BIM Lead: TD approves at status 5 (after PM forwarded)
          const isBLPendingTD = isBimLeadRole(app.role) && statusNum === 5;
          // BIM Lead history
          const isBLHistorical = isBimLeadRole(app.role) && (statusNum === 1 || statusNum === 2);
          // Project Manager: TD is first approver (status 0), or already processed
          const isPMApp = isProjectManagerRole(app.role);
          return isBLPendingTD || isBLHistorical || isPMApp;
        });
        const mapped: LeaveEntry[] = apps.map((app, index) => ({
          id: app.lid,
          slNo: index + 1,
          employeeId: app.employee_id,
          employeeName: app.full_name || "Unknown",
          role: app.role || undefined,
          leaveType: app.title || "Others",
          appliedOn: formatApiDate(app.posting_date),
          fromDate: formatApiDate(app.from_date),
          toDate: formatApiDate(app.to_date),
          description: app.description || "",
          statusCode: Number(app.status),
          currentStatus: mapLeaveStatusFromApi(app.status, app.role),
        }));
        setLeaves(mapped);
      } catch (err) {
        console.error("Failed to load leaves from backend", err);
        setLeaves([]);
      }
    };

    fetchLeaves();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (
        employeeDropdownOpen &&
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(t)
      ) {
        setEmployeeDropdownOpen(false);
      }
      if (
        showEntriesOpen &&
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(t)
      ) {
        setShowEntriesOpen(false);
      }
    };
    if (employeeDropdownOpen || showEntriesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [employeeDropdownOpen, showEntriesOpen]);

  const searchQuery = searchParams.get("q")?.toLowerCase() || "";
  const filteredList = leaves.filter((l) => {
    const matchesEmployee =
      selectedEmployee === "" || l.employeeName === selectedEmployee;
    const matchesSearch =
      !searchQuery ||
      (l.employeeName || "").toLowerCase().includes(searchQuery) ||
      (l.role || "").toLowerCase().includes(searchQuery) ||
      (l.leaveType || "").toLowerCase().includes(searchQuery) ||
      (l.fromDate || "").toLowerCase().includes(searchQuery) ||
      (l.toDate || "").toLowerCase().includes(searchQuery) ||
      (l.currentStatus || "").toLowerCase().includes(searchQuery);
    return matchesEmployee && matchesSearch;
  });
  const effectiveShowEntryValue =
    selectedShowEntries || showEntriesOptions[0].value;
  const selectedRange =
    showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ??
    showEntriesOptions[0];
  const rangeStart = selectedRange.start;
  const rangeEnd =
    selectedRange.end === null
      ? filteredList.length
      : Math.min(selectedRange.end, filteredList.length);
  const listInRange = filteredList.slice(rangeStart, rangeEnd);
  const tableRowsPerPage = 5;
  const tableTotalPages = Math.max(1, Math.ceil(listInRange.length / tableRowsPerPage));
  const safeTableCurrentPage = Math.min(tableCurrentPage, tableTotalPages);
  const tablePageStartIndex = (safeTableCurrentPage - 1) * tableRowsPerPage;
  const displayedList = listInRange.slice(tablePageStartIndex, tablePageStartIndex + tableRowsPerPage);
  const tablePageRangeStart = listInRange.length === 0 ? 0 : rangeStart + tablePageStartIndex + 1;
  const tablePageRangeEnd = listInRange.length === 0
    ? 0
    : Math.min(rangeStart + tablePageStartIndex + tableRowsPerPage, rangeEnd);
  const tablePageRangeLabel = listInRange.length === 0 ? "0-0" : `${tablePageRangeStart}-${tablePageRangeEnd}`;

  useEffect(() => {
    setTableCurrentPage(1);
  }, [selectedShowEntries, selectedEmployee, searchQuery]);

  const handleView = (row: LeaveEntry) => {
    setSelectedLeave(row);
    setViewModalOpen(true);
  };

  const updateLeaveStatus = (
    id: number,
    statusLabel: "Approved" | "Rejected",
  ) => {
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
            ...l,
            currentStatus: statusLabel,
            statusCode: statusLabel === "Approved" ? 1 : 2,
          }
          : l,
      ),
    );
  };

  const handleApproveBackend = async (row: LeaveEntry) => {
    try {
      await api.post(`/api/leave/applications/${row.id}/approve`);
      toast.success("Leave application approved successfully");
      updateLeaveStatus(row.id, "Approved");
    } catch (err) {
      toast.error("Failed to approve leave application");
    }
  };

  const handleRejectBackend = async (row: LeaveEntry) => {
    try {
      await api.post(`/api/leave/applications/${row.id}/reject`);
      toast.success("Leave application rejected successfully");
      updateLeaveStatus(row.id, "Rejected");
    } catch (err) {
      toast.error("Failed to reject leave application");
    }
  };

  // TD approve/reject logic:
  //  - BIM Lead: TD is 2nd approver → show buttons when statusCode === 5
  //  - Project Manager: TD is 1st approver → show buttons when statusCode === 0
  //  - Never act on own leave
  const canActOnLeave = (row: LeaveEntry): boolean => {
    // Exclude own applications (use ID if available, fall back to name)
    if (row.employeeId !== undefined && row.employeeId === user?.id) return false;
    if (row.employeeId === undefined) {
      const currentName = (user?.full_name || "").trim();
      if (currentName && row.employeeName.trim() === currentName) return false;
    }
    // BIM Lead: TD is final approver after PM forwards (status 5)
    if (isBimLeadRole(row.role)) {
      return row.statusCode === 5;
    }
    // Project Manager: TD is first approver (status 0)
    if (isProjectManagerRole(row.role)) {
      return row.statusCode === 0;
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full font-gantari overflow-hidden px-2">
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 mb-6 flex flex-row items-center justify-between gap-4 flex-wrap">
            <h1 className="text-[24px] font-gantari font-semibold">
              Manage Leave
            </h1>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div
                className="relative w-1/2 sm:w-[180px]"
                ref={employeeDropdownRef}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEmployeeDropdownOpen((o) => !o);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
                >
                  <span
                    className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedEmployee === ""
                      ? "text-[#8B8B8B]"
                      : "text-[#353535]"
                      }`}
                  >
                    {selectedEmployee === "" ? (
                      EMPLOYEE_FILTER_PLACEHOLDER
                    ) : (
                      <span className="font-semibold truncate">
                        {selectedEmployee}
                      </span>
                    )}
                  </span>
                  <img
                    src={ArrowDown}
                    alt=""
                    className={`w-3 h-3 shrink-0 transition-transform duration-200 ${employeeDropdownOpen ? "rotate-180" : ""
                      } ${selectedEmployee === ""
                        ? "opacity-60 grayscale"
                        : "opacity-90"
                      }`}
                    aria-hidden
                  />
                </button>
                {employeeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                    <div
                      ref={employeeDropdownContentRef}
                      className="max-h-[168px] overflow-y-auto custom-scrollbar [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#979797] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#7F7F7F] [scrollbar-width:thin] [scrollbar-color:#979797_transparent] [&::-webkit-scrollbar-button]:block [&::-webkit-scrollbar-button]:h-2 [&::-webkit-scrollbar-button:vertical:decrement]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 2L1 8h8z\' fill=\'%23979797\'/></svg>')] [&::-webkit-scrollbar-button:vertical:increment]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 8L1 2h8z\' fill=\'%23979797\'/></svg>')] pr-1"
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedEmployee("");
                          setEmployeeDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
                      >
                        {EMPLOYEE_FILTER_PLACEHOLDER}
                      </button>
                      {employeeOptions.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedEmployee(name);
                            setEmployeeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-[14px] font-gantari font-normal transition-colors cursor-pointer truncate hover:text-[#353535] hover:bg-[#F2F2F2] ${selectedEmployee === name
                            ? "text-[#353535] bg-[#F2F2F2]"
                            : "text-[#8B8B8B] bg-transparent"
                            }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div
                className="relative w-1/2 sm:w-[160px]"
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
                    className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedShowEntries === ""
                      ? "text-[#8B8B8B]"
                      : "text-[#353535]"
                      }`}
                  >
                    {selectedShowEntries === "" ? (
                      SHOW_ENTRIES_PLACEHOLDER
                    ) : (
                      <>
                        <span className="text-[14px]">
                          {SHOW_ENTRIES_SELECTED_PREFIX}
                        </span>{" "}
                        <span className="font-semibold">
                          {selectedRange.label}
                        </span>
                      </>
                    )}
                  </span>
                  <img
                    src={ArrowDown}
                    alt=""
                    className={`w-3 h-3 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""
                      } ${selectedShowEntries === ""
                        ? "opacity-60 grayscale"
                        : "opacity-90"
                      }`}
                    aria-hidden
                  />
                </button>
                {showEntriesOpen && (
                  <div className="absolute top-full right-0 left-auto mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                    <div
                      ref={showEntriesDropdownContentRef}
                      className="max-h-[168px] overflow-y-auto custom-scrollbar [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#979797] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#7F7F7F] [scrollbar-width:thin] [scrollbar-color:#979797_transparent] [&::-webkit-scrollbar-button]:block [&::-webkit-scrollbar-button]:h-2 [&::-webkit-scrollbar-button:vertical:decrement]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 2L1 8h8z\' fill=\'%23979797\'/></svg>')] [&::-webkit-scrollbar-button:vertical:increment]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 8L1 2h8z\' fill=\'%23979797\'/></svg>')] pr-1"
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
                            key={`${opt.value}-${opt.start}-${opt.end}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedShowEntries(opt.value);
                              setShowEntriesOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen
                              ? "text-[#353535] bg-[#F2F2F2]"
                              : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"
                              }`}
                          >
                            <span className="truncate min-w-0">
                              {opt.label}
                            </span>
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

          <div className="bg-white rounded-md border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative w-full mb-3">
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto overflow-x-hidden custom-scrollbar smooth-scroll h-full pr-1 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#979797] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#7F7F7F] [scrollbar-width:thin] [scrollbar-color:#979797_transparent] [&::-webkit-scrollbar-button]:block [&::-webkit-scrollbar-button]:h-2 [&::-webkit-scrollbar-button:vertical:decrement]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 2L1 8h8z\' fill=\'%23979797\'/></svg>')] [&::-webkit-scrollbar-button:vertical:increment]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 8L1 2h8z\' fill=\'%23979797\'/></svg>')]">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-[#FFFFFF] after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                  <tr className=" bg-white">
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap align-middle">
                      Sl.No
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap align-middle">
                      Employee Name
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap align-middle">
                      Role
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap align-middle">
                      Leave Type
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap align-middle">
                      From Date
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap align-middle">
                      To Date
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap align-middle">
                      Status
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap align-middle">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-12 text-center text-gray-400 font-medium font-gantari bg-white"
                      >
                        No leave records found
                      </td>
                    </tr>
                  ) : (
                    displayedList.map((row, index) => {
                      const slNo = rangeStart + tablePageStartIndex + index + 1;
                      const isLastRow = index === displayedList.length - 1;
                      return (
                        <tr
                          key={row.id}
                          className={`${index % 2 === 1 ? "bg-[#F2F2F2] hover:bg-gray-100" : "bg-[#FFFFFF]"} transition-colors`}
                        >
                          <td className="px-3 py-5 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">
                            {String(slNo).padStart(2, "0")}
                          </td>
                          <td className="px-3 py-5 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {row.employeeName}
                          </td>
                          <td className="px-3 py-5 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {row.role ?? "–"}
                          </td>
                          <td className="px-3 py-5 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {row.leaveType}
                          </td>
                          <td className="px-3 py-5 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {row.fromDate ?? "–"}
                          </td>
                          <td className="px-3 py-5 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {row.toDate ?? "–"}
                          </td>
                          <td className="px-3 py-5 text-center text-[14px] whitespace-nowrap align-middle">
                            <span
                              className={`inline-flex px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-[12px] font-semibold font-gantari ${row.currentStatus === "Approved" ? "bg-[#E1F6EB] text-[#008F22]" : row.currentStatus === "Rejected" ? "bg-[#FFE5E5] text-[#C62828]" : "bg-[#FFEAD6] text-[#EB7200]"}`}
                            >
                              {row.currentStatus}
                            </span>
                          </td>
                          <td className="px-3 py-5 text-center text-[14px] whitespace-nowrap align-middle">
                            <div className="flex items-center justify-center gap-2 flex-nowrap">
                              <button
                                type="button"
                                onClick={() => handleView(row)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#DD4242] text-white rounded-md font-medium text-[12px] cursor-pointer"
                              >
                                <img
                                  src={viewIcon}
                                  alt=""
                                  className="w-3.5 h-3.5 shrink-0 [filter:brightness(0)_invert(1)]"
                                />
                                View
                              </button>
                              {canActOnLeave(row) ? (
                                <>
                                  <div className="relative group inline-flex shrink-0">
                                    <button
                                      type="button"
                                      aria-label="Approve"
                                      onClick={() => setApproveLeave(row)}
                                      className="inline-flex items-center justify-center p-2 bg-[#E6F4EA] text-[#008F22] rounded-full font-medium active:scale-[0.98] transition-transform cursor-pointer"
                                    >
                                      <svg
                                        className="w-4 h-4 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    {isLastRow ? (
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                        <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10 shadow-sm">
                                          <span className="font-gantari text-[12px] font-semibold text-[#008F22] text-center block whitespace-nowrap">
                                            Approve
                                          </span>
                                        </div>
                                        <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-b border-r border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                                      </div>
                                    ) : (
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                        <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10 shadow-sm">
                                          <span className="font-gantari text-[12px] font-semibold text-[#008F22] text-center block whitespace-nowrap">
                                            Approve
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="relative group inline-flex shrink-0">
                                    <button
                                      type="button"
                                      aria-label="Reject"
                                      onClick={() => setRejectLeave(row)}
                                      className="inline-flex items-center justify-center p-2 bg-[#FFD9D9] text-[#E00100] rounded-full font-medium active:scale-[0.98] transition-transform cursor-pointer"
                                    >
                                      <svg
                                        className="w-4 h-4 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M18 6L6 18M6 6l12 12" />
                                      </svg>
                                    </button>
                                    {isLastRow ? (
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                        <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10 shadow-sm">
                                          <span className="font-gantari text-[12px] font-semibold text-[#E00100] text-center block whitespace-nowrap">
                                            Reject
                                          </span>
                                        </div>
                                        <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-b border-r border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                                      </div>
                                    ) : (
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                        <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10 shadow-sm">
                                          <span className="font-gantari text-[12px] font-semibold text-[#E00100] text-center block whitespace-nowrap">
                                            Reject
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
          {listInRange.length > 0 && (
            <div className="w-full flex items-center justify-end mt-4">
              <div className="flex items-center gap-4 bg-[#E8E8E8] rounded-md px-5 py-2">
                <span className="text-[#353535] text-[16px] font-medium font-gantari leading-none">Showing:</span>
                <button
                  type="button"
                  onClick={() => setTableCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeTableCurrentPage === 1}
                  className={`inline-flex items-center gap-1 text-[15px] font-medium font-gantari leading-none cursor-pointer ${safeTableCurrentPage === 1
                    ? "text-[#9CA3AF] opacity-50 cursor-not-allowed"
                    : "text-[#353535]"
                    }`}
                  aria-label="Previous page"
                >
                  <span className="relative -top-[2px] inline-flex items-center justify-center text-[24px] leading-none">&#8249;</span>
                  <span className="inline-flex items-center">Prev</span>
                </button>
                <button
                  type="button"
                  className="px-4 py-1 rounded-[10px] bg-[#DD4342] text-[#FFFFFF] text-[14px] font-semibold font-gantari leading-none cursor-default"
                  aria-current="page"
                >
                  {tablePageRangeLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setTableCurrentPage((p) => Math.min(tableTotalPages, p + 1))}
                  disabled={safeTableCurrentPage >= tableTotalPages}
                  className={`inline-flex items-center gap-1 text-[15px] font-medium font-gantari leading-none cursor-pointer ${safeTableCurrentPage >= tableTotalPages
                    ? "text-[#9CA3AF] opacity-40 cursor-not-allowed"
                    : "text-[#353535]"
                    }`}
                  aria-label="Next page"
                >
                  <span className="inline-flex items-center">Next</span>
                  <span className="relative -top-[2px] inline-flex items-center justify-center text-[24px] leading-none">&#8250;</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Leave Modal */}
      {
        viewModalOpen &&
        selectedLeave &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setViewModalOpen(false);
              setSelectedLeave(null);
            }}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-[#E5E5E5]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center justify-center p-5 w-full">
                <div className="group absolute left-5 top-1/2 -translate-y-1/2 z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setViewModalOpen(false);
                      setSelectedLeave(null);
                    }}
                    className="cursor-pointer p-2 rounded-md bg-[#F2F2F2] transition-colors"
                  >
                    <img
                      src={closeIcon}
                      alt=""
                      className="w-5 h-5 object-contain"
                    />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                    <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                      <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                        Close
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className="text-[24px] font-semibold text-[#000000]">
                  Leave Details
                </h3>
              </div>
              <div className="px-6 py-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">
                      Employee Name
                    </span>
                    <span className="shrink-0 text-[#616161]">:</span>
                    <span className="text-sm text-[#616161]">
                      {selectedLeave.employeeName}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">
                      Role
                    </span>
                    <span className="shrink-0 text-[#616161]">:</span>
                    <span className="text-sm text-[#616161]">
                      {selectedLeave.role ?? "–"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">
                      Leave Type
                    </span>
                    <span className="shrink-0 text-[#616161]">:</span>
                    <span className="text-sm text-[#616161]">
                      {selectedLeave.leaveType}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">
                      From Date
                    </span>
                    <span className="shrink-0 text-[#616161]">:</span>
                    <span className="text-sm text-[#616161]">
                      {selectedLeave.fromDate ?? "–"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">
                      To Date
                    </span>
                    <span className="shrink-0 text-[#616161]">:</span>
                    <span className="text-sm text-[#616161]">
                      {selectedLeave.toDate ?? "–"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">
                      Applied On
                    </span>
                    <span className="shrink-0 text-[#616161]">:</span>
                    <span className="text-sm text-[#616161]">
                      {selectedLeave.appliedOn}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">
                      Reason
                    </span>
                    <span className="shrink-0 text-[#616161]">:</span>
                    <span className="text-sm text-[#616161]">
                      {selectedLeave.description ?? "–"}
                    </span>
                  </div>
                  {(() => {
                    const getBadge = (statusText: string) => {
                      if (statusText === 'Approved') return <span className="inline-flex px-3 py-1 rounded-md text-xs font-semibold bg-[#E1F6EB] text-[#008F22]">Approved</span>;
                      if (statusText === 'Rejected') return <span className="inline-flex px-3 py-1 rounded-md text-xs font-semibold bg-[#FFE5E5] text-[#C62828]">Rejected</span>;
                      if (statusText === 'Pending') return <span className="inline-flex px-3 py-1 rounded-md text-xs font-semibold bg-[#FFEAD6] text-[#EB7200]">Pending</span>;
                      return <span className="text-[#8B8B8B]">-</span>;
                    };
                    const r = (selectedLeave.role || '').toLowerCase();
                    const sc = selectedLeave.statusCode ?? 0;
                    const st = selectedLeave.currentStatus;
                    let statuses = [];
                    if (sc === 2) {
                      statuses.push({ label: 'Current Status', text: 'Rejected' });
                    } else {
                      if (r.includes('bim modeler')) {
                        statuses.push({ label: 'BIM Coordinator', text: sc === 1 || sc >= 3 ? 'Approved' : 'Pending' });
                        statuses.push({ label: 'BIM Lead', text: sc === 1 ? 'Approved' : 'Pending' });
                      } else if (r.includes('bim coordinator')) {
                        statuses.push({ label: 'BIM Lead', text: sc === 1 || sc >= 4 ? 'Approved' : 'Pending' });
                        statuses.push({ label: 'Project Manager', text: sc === 1 ? 'Approved' : 'Pending' });
                      } else if (r.includes('bim lead')) {
                        statuses.push({ label: 'Project Manager', text: sc === 1 || sc >= 5 ? 'Approved' : 'Pending' });
                        statuses.push({ label: 'Technical Director', text: sc === 1 ? 'Approved' : 'Pending' });
                      } else if (r.includes('project manager')) {
                        statuses.push({ label: 'Technical Director', text: sc === 1 ? 'Approved' : 'Pending' });
                      } else {
                        statuses.push({ label: 'Current Status', text: st });
                      }
                    }
                    return statuses.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">{item.label}</span>
                        <span className="shrink-0 text-[#616161]">:</span>
                        {getBadge(item.text)}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      }
      {/* Approval confirmation modal - match MytaskTD style */}
      {
        approveLeave !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
              {/* Close */}
              <div className="relative flex items-center justify-center p-4 w-full">
                <div className="group absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <button
                    type="button"
                    onClick={() => setApproveLeave(null)}
                    className="p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                    <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                      <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                        Close
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className="text-[18px] font-gantari font-semibold text-[#020202]">
                  Approve Leave
                </h3>
              </div>
              <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center">
                Are you sure, you want to Approve this?
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto mb-6">
                <button
                  type="button"
                  onClick={() => setApproveLeave(null)}
                  className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (approveLeave) handleApproveBackend(approveLeave);
                    setApproveLeave(null);
                  }}
                  className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#D9FFE1] text-[#008F22] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
                >
                  Yes, Approve
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Reject confirmation modal */}
      {rejectLeave !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            <div className="relative flex items-center justify-center p-4 w-full">
              <div className="group absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <button
                  type="button"
                  onClick={() => setRejectLeave(null)}
                  className="p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-[18px] font-gantari font-semibold text-[#020202]">
                Reject Leave
              </h3>
            </div>
            <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center">
              Are you sure, you want to Reject this?
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto mb-6">
              <button
                type="button"
                onClick={() => setRejectLeave(null)}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => {
                  if (rejectLeave) handleRejectBackend(rejectLeave);
                  setRejectLeave(null);
                }}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Yes, Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
