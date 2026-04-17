import { useState, useEffect, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import closeIcon from "../../assets/ProductNavbarIcons/close button.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";

const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";
/** Closed trigger label when a range is chosen (e.g. “Show: 1-50”). */
const SHOW_ENTRIES_SELECTED_PREFIX = "Show:";
const EMPLOYEE_FILTER_PLACEHOLDER = "Employee";

interface LeaveEntry {
  id: number;
  slNo: number;
  employeeName: string;
  role?: string;
  employeeId?: number;
  email?: string;
  leaveType: string;
  leaveTypeId?: number | null;
  appliedOn: string;
  appliedTo?: string;
  currentStatus: string;
  /** Raw tblleaves.status: 0 pending first approver, 3 pending BIM Lead, 1 approved, 2 rejected */
  statusCode?: number;
  fromDate?: string;
  toDate?: string;
  description?: string;
}

function isBimModelerRole(role: string | undefined): boolean {
  const r = (role || "").trim().toLowerCase();
  return r === "bim modeler" || r.includes("bim modeler");
}

function isBimCoordinatorRole(role: string | undefined): boolean {
  const r = (role || "").trim().toLowerCase();
  return r === "bim coordinator" || r.includes("bim coordinator");
}

function mapLeaveStatusFromApi(
  status: unknown,
  applicantRole: string | undefined,
): string {
  const s = Number(status);
  if (s === 1) return "Approved";
  if (s === 2) return "Rejected";
  if (s === 3) return "Pending (BIM Lead)";
  if (s === 4) return "Pending (Project Manager)";
  if (isBimModelerRole(applicantRole)) return "Pending (BIM Coordinator)";
  if (isBimCoordinatorRole(applicantRole)) return "Pending (BIM Lead)";
  return "Pending";
}

function normalizeNameAndReason(value: string): string {
  const allowed = value.replace(/[^\w\s.,\-'()\/&@!#?;:'"]/g, "");
  return allowed.replace(/\s+/g, " ");
}

function toInputDate(d: string | undefined): string {
  if (!d) return "";
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slashParts = s.split("/");
  if (slashParts.length === 3) {
    const [dd, mm, yy] = slashParts;
    if (dd && mm && yy) return `${yy}-${mm}-${dd}`;
  }
  const dashParts = s.split("-");
  if (dashParts.length === 3) {
    const [dd, mm, yy] = dashParts;
    if (dd && mm && yy) return `${yy}-${mm}-${dd}`;
  }
  return "";
}

function formatApiDate(value: string | undefined | null): string {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yy, mm, dd] = s.split("-");
    return `${dd}/${mm}/${yy}`;
  }
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

function getTodayInputDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const LEAVE_TYPES = [
  "Sick Leave",
  "Casual Leave",
  "Earned Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Unpaid Leave",
];

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

const PER_PAGE = 10;
const PAGINATION_VISIBLE = 4;

export default function ManageLeaveBC() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null);
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveEntry | null>(null);
  const [deleteLeave, setDeleteLeave] = useState<LeaveEntry | null>(null);
  const [approveLeave, setApproveLeave] = useState<LeaveEntry | null>(null);
  const [rejectLeave, setRejectLeave] = useState<LeaveEntry | null>(null);
  const [leaveType, setLeaveType] = useState("");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [reason, setReason] = useState("");
  const [applyFormErrors, setApplyFormErrors] = useState<Record<string, string>>({});
  const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
  const [leaveTypeOpenEdit, setLeaveTypeOpenEdit] = useState(false);
  const leaveTypeDropdownRef = useRef<HTMLDivElement>(null);
  const leaveTypeDropdownEditRef = useRef<HTMLDivElement>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const employeeDropdownContentRef = useRef<HTMLDivElement>(null);
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationWindowStart, setPaginationWindowStart] = useState(1);

  const todayInputDate = getTodayInputDate();

  const employeeOptions = ["All", ...Array.from(new Set(leaves.map((l) => l.employeeName)))];

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        leaveTypeDropdownRef.current &&
        !leaveTypeDropdownRef.current.contains(event.target as Node)
      )
        setLeaveTypeOpen(false);
    };
    if (leaveTypeOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [leaveTypeOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        leaveTypeDropdownEditRef.current &&
        !leaveTypeDropdownEditRef.current.contains(event.target as Node)
      )
        setLeaveTypeOpenEdit(false);
    };
    if (leaveTypeOpenEdit) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [leaveTypeOpenEdit]);

  useEffect(() => {
    setCurrentPage(1);
    setPaginationWindowStart(1);
  }, [selectedShowEntries, selectedEmployee]);

  const mapCompanyLeavesForCoordinator = (apps: any[]) => {
    if (!user?.id) return [];
    const seen = new Set<number>();
    const merged = apps.filter((app) => {
      const self = app.employee_id === user.id;
      const teamModeler = isBimModelerRole(app.role);
      if (!self && !teamModeler) return false;
      const lid = Number(app.lid);
      if (seen.has(lid)) return false;
      seen.add(lid);
      return true;
    });
    merged.sort((a, b) => Number(b.lid) - Number(a.lid));
    return merged.map((app, index) => ({
      id: app.lid,
      slNo: index + 1,
      employeeId: app.employee_id,
      employeeName: app.full_name || user.full_name || "Unknown",
      role: app.role || user.user_role || "BIM Coordinator",
      email: app.email || user.email || undefined,
      leaveType: app.type_name || app.title || "Others",
      appliedOn: formatApiDate(app.posting_date),
      fromDate: formatApiDate(app.from_date),
      toDate: formatApiDate(app.to_date),
      description: app.description || "",
      statusCode: Number(app.status),
      currentStatus: mapLeaveStatusFromApi(app.status, app.role),
    }));
  };

  useEffect(() => {
    const fetchExistingLeaves = async () => {
      if (!user?.id) return;
      try {
        const { data } = await api.get<{ applications?: any[] }>("/api/leave/applications");
        setLeaves(mapCompanyLeavesForCoordinator(data.applications || []));
      } catch (err) {
        console.error("Failed to load BIM Coordinator leaves", err);
      }
    };
    fetchExistingLeaves();
  }, [user?.id]);

  const validateApplyForm = (): boolean => {
    const err: Record<string, string> = {};
    if (!user?.full_name) err.employeeName = "Employee name is required";
    if (!leaveType) err.leaveType = "Leave type is required";
    if (!leaveFrom) err.leaveFrom = "Leave from date is required";
    if (!leaveTo) err.leaveTo = "Leave to date is required";
    if (!reason.trim()) err.reason = "Reason is required";
    if (leaveFrom && leaveFrom < todayInputDate)
      err.leaveFrom = "Leave from date cannot be in the past";
    if (leaveTo && leaveTo < todayInputDate)
      err.leaveTo = "Leave to date cannot be in the past";
    if (leaveFrom && leaveTo && leaveFrom > leaveTo)
      err.leaveTo = "Leave to must be on or after leave from";
    setApplyFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateApplyForm()) return;
    try {
      await api.post("/api/leave/applications", {
        leavetype: leaveType,
        description: reason.trim(),
        from_date: leaveFrom,
        to_date: leaveTo,
      });
      const { data } = await api.get<{ applications?: any[] }>("/api/leave/applications");
      setLeaves(mapCompanyLeavesForCoordinator(data.applications || []));
      toast.success("Applied successfully");
      handleCloseModal();
    } catch (err) {
      console.error("Failed to submit leave", err);
    }
  };

  const handleCloseModal = () => {
    setApplyModalOpen(false);
    setLeaveType("");
    setLeaveFrom("");
    setLeaveTo("");
    setReason("");
    setApplyFormErrors({});
  };

  const handleEdit = (row: LeaveEntry) => {
    setEditingLeave(row);
    setLeaveType(row.leaveType);
    setLeaveFrom(toInputDate(row.fromDate));
    setLeaveTo(toInputDate(row.toDate));
    setReason(row.description ?? "");
    setApplyFormErrors({});
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingLeave(null);
    setLeaveType("");
    setLeaveFrom("");
    setLeaveTo("");
    setReason("");
    setApplyFormErrors({});
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave || !validateApplyForm()) return;
    try {
      await api.patch(`/api/leave/applications/${editingLeave.id}`, {
        leavetype: leaveType,
        description: reason.trim(),
        from_date: leaveFrom,
        to_date: leaveTo,
      });
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === editingLeave.id
            ? {
                ...l,
                leaveType,
                fromDate: formatApiDate(leaveFrom),
                toDate: formatApiDate(leaveTo),
                description: reason.trim(),
              }
            : l
        )
      );
      toast.success("Updated successfully");
      handleCloseEditModal();
    } catch (err) {
      console.error("Failed to update leave", err);
    }
  };

  const openDeleteLeave = (row: LeaveEntry) => {
    setDeleteLeave(row);
  };

  const confirmDeleteLeave = async () => {
    if (deleteLeave === null) return;
    try {
      await api.delete(`/api/leave/applications/${deleteLeave.id}`);
      setLeaves((prev) => prev.filter((l) => l.id !== deleteLeave.id));
      toast.error("Deleted successfully");
      setDeleteLeave(null);
    } catch (err) {
      console.error("Failed to delete leave", err);
    }
  };

  const canEditOwnLeaveRow = (row: LeaveEntry) =>
    row.employeeId === user?.id && row.statusCode === 0;

  const canCoordinatorActOnTeamModeler = (row: LeaveEntry) =>
    row.employeeId !== user?.id &&
    isBimModelerRole(row.role) &&
    row.statusCode === 0;

  const confirmApproveLeave = async () => {
    if (approveLeave === null) return;
    try {
      const { data } = await api.post<{
        success?: boolean;
        stage?: string;
        message?: string;
      }>(`/api/leave/applications/${approveLeave.id}/approve`);
      if (data?.success === false) {
        toast.error(data.message || "Failed to approve leave.");
        return;
      }
      if (data?.stage === "pending_bim_lead") {
        toast.success("Forwarded to BIM Lead for final approval");
        setLeaves((prev) =>
          prev.map((l) =>
            l.id === approveLeave.id
              ? { ...l, currentStatus: "Pending (BIM Lead)", statusCode: 3 }
              : l,
          ),
        );
      } else {
        toast.success("Approved successfully");
        setLeaves((prev) =>
          prev.map((l) =>
            l.id === approveLeave.id
              ? { ...l, currentStatus: "Approved", statusCode: 1 }
              : l,
          ),
        );
      }
      setApproveLeave(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to approve leave.";
      toast.error(msg);
    }
  };

  const confirmRejectLeave = async () => {
    if (rejectLeave === null) return;
    try {
      const { data } = await api.post<{ success?: boolean; message?: string }>(
        `/api/leave/applications/${rejectLeave.id}/reject`,
      );
      if (data?.success === false) {
        toast.error(data.message || "Failed to reject leave.");
        return;
      }
      toast.success("Rejected successfully");
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === rejectLeave.id
            ? { ...l, currentStatus: "Rejected", statusCode: 2 }
            : l,
        ),
      );
      setRejectLeave(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to reject leave.";
      toast.error(msg);
    }
  };

  const employeeFilterShowsAll =
    selectedEmployee === "" || selectedEmployee === "All";
  
  const filteredList = useMemo(() => {
    const q = searchParams.get("q")?.toLowerCase() || "";
    let base = leaves;
    if (!employeeFilterShowsAll) {
      base = base.filter((l) => l.employeeName === selectedEmployee);
    }
    if (!q) return base;
    return base.filter((l) => {
      return [
        l.employeeName,
        l.leaveType,
        l.fromDate,
        l.toDate,
        l.description,
        l.currentStatus,
        l.role,
      ].some((f) => (f || "").toLowerCase().includes(q));
    });
  }, [leaves, selectedEmployee, employeeFilterShowsAll, searchParams]);

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
  const totalInRange = listInRange.length;
  const totalPages = Math.max(1, Math.ceil(totalInRange / PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const displayedList = listInRange.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE,
  );

  const pageRanges: { start: number; end: number; label: string }[] = [];
  for (let p = 1; p <= totalPages; p++) {
    const s = rangeStart + (p - 1) * PER_PAGE;
    const e = Math.min(rangeStart + p * PER_PAGE, rangeEnd);
    const label = s === 0 ? `0-${e}` : `${s + 1}-${e}`;
    pageRanges.push({ start: s, end: e, label });
  }
  const activePage = safePage;
  const maxWindowStart = Math.max(1, totalPages - PAGINATION_VISIBLE + 1);
  const effectiveWindowStart = Math.min(paginationWindowStart, maxWindowStart);
  const visiblePageRanges = pageRanges.slice(
    effectiveWindowStart - 1,
    effectiveWindowStart - 1 + PAGINATION_VISIBLE,
  );
  const canPrevWindow = paginationWindowStart > 1;
  const canNextWindow =
    paginationWindowStart <= totalPages - PAGINATION_VISIBLE;
  const goPrevWindow = () =>
    setPaginationWindowStart((s) => Math.max(1, s - PAGINATION_VISIBLE));
  const goNextWindow = () =>
    setPaginationWindowStart((s) =>
      Math.min(s + PAGINATION_VISIBLE, maxWindowStart),
    );
  void [
    activePage,
    visiblePageRanges,
    canPrevWindow,
    canNextWindow,
    goPrevWindow,
    goNextWindow,
  ];

  const handleView = (row: LeaveEntry) => {
    setSelectedLeave(row);
    setViewModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full font-gantari overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 mb-6 flex flex-row items-center justify-between gap-4 flex-wrap">
            <h1 className="text-[24px] font-gantari font-semibold">
              Manage Leave
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (!user?.full_name) {
                    toast.error("User information not available.");
                    return;
                  }
                  setApplyModalOpen(true);
                }}
                className="px-4 py-2 bg-[#DD4346] text-white rounded-md text-[14px] font-gantari font-medium transition-colors cursor-pointer"
              >
                Apply Leave
              </button>
              <div
                className="relative min-w-[180px] max-w-[240px] w-[180px]"
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
                    className={`min-w-0 flex-1 truncate overflow-hidden text-left ${
                      selectedEmployee === ""
                        ? "text-[#8B8B8B]"
                        : "text-[#353535]"
                    }`}
                  >
                    {selectedEmployee === "" ? (
                      EMPLOYEE_FILTER_PLACEHOLDER
                    ) : selectedEmployee === "All" ? (
                      <>
                        <span className="text-[14px]">
                          {EMPLOYEE_FILTER_PLACEHOLDER}:
                        </span>{" "}
                        <span className="font-semibold">All</span>
                      </>
                    ) : (
                      <span className="font-semibold truncate">
                        {selectedEmployee}
                      </span>
                    )}
                  </span>
                  <img
                    src={ArrowDown}
                    alt=""
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      employeeDropdownOpen ? "rotate-180" : ""
                    } ${
                      selectedEmployee === ""
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
                      className="max-h-[168px] overflow-y-auto custom-scrollbar"
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
                          className={`w-full text-left px-4 py-2 text-[14px] font-gantari font-normal transition-colors cursor-pointer truncate hover:text-[#353535] hover:bg-[#F2F2F2] ${
                            selectedEmployee === name
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
                className="relative min-w-[140px] max-w-[200px] w-[150px]"
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
                    className={`min-w-0 flex-1 truncate overflow-hidden text-left ${
                      selectedShowEntries === ""
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
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      showEntriesOpen ? "rotate-180" : ""
                    } ${
                      selectedShowEntries === ""
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
                            key={`${opt.value}-${opt.start}-${opt.end}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedShowEntries(opt.value);
                              setShowEntriesOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${
                              isChosen
                                ? "text-[#353535] bg-[#F2F2F2]"
                                : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"
                            }`}
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

          <div className="bg-white rounded-md border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
            <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-280px)] pr-1 pb-0">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-[#FFFFFF] after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                  <tr className="bg-white">
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Sl.No
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Employee Name
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Role
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Leave Type
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      From Date
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      To Date
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                      Current Status
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
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
                      const baseIndex =
                        rangeStart + (safePage - 1) * PER_PAGE + index;
                      const slNo = baseIndex + 1;
                      return (
                        <tr
                          key={row.id}
                          className={`${index % 2 === 1 ? "bg-[#F2F2F2] hover:bg-gray-100" : "bg-white"} transition-colors`}
                        >
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">
                            {String(slNo).padStart(2, "0")}
                        </td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">
                            {row.employeeName}
                          </td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {row.role ?? "–"}
                          </td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {row.leaveType}
                          </td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {row.fromDate ?? "–"}
                          </td>
                          <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                            {row.toDate ?? "–"}
                          </td>
                          <td className="px-3 py-6 text-center text-[14px] whitespace-nowrap align-middle">
                            <span
                              className={`inline-flex px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-[12px] font-semibold font-gantari ${
                                row.currentStatus === "Approved"
                                  ? "bg-[#E1F6EB] text-[#008F22]"
                                  : row.currentStatus === "Rejected"
                                    ? "bg-[#FFE5E5] text-[#C62828]"
                                    : "bg-[#FFEAD6] text-[#EB7200]"
                              }`}
                            >
                              {row.currentStatus}
                            </span>
                          </td>
                          <td className="px-3 py-6 text-center text-[14px] whitespace-nowrap align-middle">
                            <div className="flex items-center justify-center gap-2 flex-nowrap">
                              <button
                                type="button"
                                onClick={() => handleView(row)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#DD4242] text-white rounded-md font-medium text-[12px] "
                                title="View"
                              >
                                <img
                                  src={viewIcon}
                                  alt=""
                                  className="w-3.5 h-3.5 shrink-0 [filter:brightness(0)_invert(1)]"
                                />
                                View
                            </button>
                              {canCoordinatorActOnTeamModeler(row) && (
                                <>
                                  <button
                                    type="button"
                                    aria-label="Approve"
                                    onClick={() => setApproveLeave(row)}
                                    className="inline-flex items-center justify-center p-2 bg-[#008F22] text-white rounded-md font-medium active:scale-[0.98] transition-transform cursor-pointer"
                                    title="Approve (send to BIM Lead)"
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
                                  <button
                                    type="button"
                                    aria-label="Reject"
                                    onClick={() => setRejectLeave(row)}
                                    className="inline-flex items-center justify-center p-2 bg-[#C62828] text-white rounded-md font-medium active:scale-[0.98] transition-transform cursor-pointer"
                                    title="Reject"
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
                                </>
                              )}
                              {canEditOwnLeaveRow(row) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(row)}
                                    className={`inline-flex items-center justify-center p-2 rounded-md cursor-pointer ${
                                      index % 2 === 0
                                        ? "bg-[#F2F2F2]"
                                        : "bg-[#FFFFFF]"
                                    }`}
                                    title="Edit"
                                  >
                                    <img src={editIcon} alt="" className="w-4 h-4" />
                            </button>
                                  <button
                                    type="button"
                                    onClick={() => openDeleteLeave(row)}
                                    className={`inline-flex items-center justify-center p-2 rounded-md text-[#353535] transition-colors shrink-0 cursor-pointer ${
                                      index % 2 === 0
                                        ? "bg-[#F2F2F2]"
                                        : "bg-[#FFFFFF]"
                                    }`}
                                    title="Delete"
                                  >
                                    <img src={deleteIcon} alt="" className="w-4 h-4 " />
                                  </button>
                                </>
                              )}
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
      </div>

      {viewModalOpen &&
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
              <div className="relative flex items-center justify-center px-6 py-5 ">
                <button
                  type="button"
                  onClick={() => {
                    setViewModalOpen(false);
                    setSelectedLeave(null);
                  }}
                  className="cursor-pointer absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-md bg-[#F2F2F2] hover:bg-[#E8E8E8] transition-colors"
                  aria-label="Close"
                >
                  <img
                    src={closeIcon}
                    alt=""
                    className="w-5 h-5 object-contain"
                  />
              </button>
                <h3 className="text-[24px] font-medium text-[#000000]">
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
                  <div className="flex items-start gap-2">
                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">
                      Current Status
                    </span>
                    <span className="shrink-0 text-[#616161]">:</span>
                    <span
                      className={`inline-flex px-3 py-1 rounded-md text-xs font-semibold ${selectedLeave.currentStatus === "Approved" ? "bg-[#E1F6EB] text-[#008F22]" : selectedLeave.currentStatus === "Rejected" ? "bg-[#FFE5E5] text-[#C62828]" : "bg-[#FFF8E1] text-[#F57C00]"}`}
                    >
                      {selectedLeave.currentStatus}
                    </span>
                  </div>
                </div>
            </div>
          </div>
        </div>,
          document.body,
        )}

      {applyModalOpen &&
        createPortal(
          <div
            className="hover:cursor-pointer fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="hover:cursor-pointer bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden border border-[#E5E5E5]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center justify-center px-6 py-5 ">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="hover:cursor-pointer absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-md bg-[#F2F2F2] transition-colors"
                  aria-label="Close"
                >
                  <img src={closeIcon} alt="" className="w-5 h-5 object-contain" />
                </button>
                <h3 className="text-[24px] font-semibold text-[#000000]">
                  Apply Leave
                </h3>
            </div>
              <form
                onSubmit={handleSubmitApply}
                className="px-6 py-6 space-y-4"
              >
                <div>
                  <label className="block text-16px font-semibold text-[#000000] mb-2">
                    Employee Name<span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    value={
                      user
                        ? `${user.full_name}${user.user_role ? ` - ${user.user_role}` : ""}`
                        : ""
                    }
                    readOnly
                    disabled
                    className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none bg-[#F2F3F4] disabled:opacity-70 disabled:cursor-not-allowed ${applyFormErrors.employeeName ? "border border-[#DD4342]" : "border-0"}`}
                    placeholder="Employee name - Role"
                  />
                  {applyFormErrors.employeeName && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.employeeName}
                    </p>
                  )}
                </div>
               <div className="relative" ref={leaveTypeDropdownRef}>
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Leave Type <span className="text-[#DD4342]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setLeaveTypeOpen((o) => !o)}
                    className={`cursor-pointer w-full px-4 py-2.5 rounded-lg text-left text-sm flex items-center justify-between min-h-[40px] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors ${leaveTypeOpen ? "ring-1 ring-[#D2D2D2]" : applyFormErrors.leaveType ? "border border-[#DD4342]" : "border-0"} bg-[#F2F3F4]`}
                  >
                    <span
                      className={
                        leaveType
                          ? "text-[#353535] font-medium"
                          : "text-[#8B8B8B]"
                      }
                    >
                      {leaveType || "Select leave type"}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform duration-200 ${leaveTypeOpen ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                </button>
                {leaveTypeOpen && (
                    <div
                      className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-lg border border-[#E5E5E5] shadow-lg py-1.5"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setLeaveType("");
                          setLeaveTypeOpen(false);
                        }}
                        className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${!leaveType ? "text-[#353535] bg-[#F0F2F7]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]"}`}
                      >
                        Nothing selected
                      </button>
                      {LEAVE_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setLeaveType(t);
                            setLeaveTypeOpen(false);
                            if (applyFormErrors.leaveType)
                              setApplyFormErrors((p) => ({
                                ...p,
                                leaveType: "",
                              }));
                          }}
                          className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${leaveType === t ? "text-[#353535] bg-[#F0F2F7]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]"}`}
                        >
                          {t}
                        </button>
                    ))}
                  </div>
                )}
                  {applyFormErrors.leaveType && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.leaveType}
                    </p>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-base font-semibold text-[#000000] mb-2">
                      Leave From <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        min={todayInputDate}
                        value={leaveFrom}
                        onChange={(e) => {
                          setLeaveFrom(e.target.value);
                          if (leaveTo && e.target.value > leaveTo)
                            setLeaveTo("");
                          if (applyFormErrors.leaveFrom)
                            setApplyFormErrors((p) => ({
                              ...p,
                              leaveFrom: "",
                            }));
                          if (
                            applyFormErrors.leaveTo &&
                            leaveTo &&
                            e.target.value <= leaveTo
                          )
                            setApplyFormErrors((p) => ({ ...p, leaveTo: "" }));
                        }}
                        className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveFrom ? "border border-[#DD4342]" : "border-0"} bg-[#F2F3F4]`}
                        style={{ colorScheme: "light" }}
                      />
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                          strokeWidth="1.5"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                        <line
                          x1="3"
                          y1="10"
                          x2="21"
                          y2="10"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                    {applyFormErrors.leaveFrom && (
                      <p className="mt-1.5 text-sm text-[#DD4342]">
                        {applyFormErrors.leaveFrom}
                      </p>
                    )}
                </div>
                <div>
                    <label className="block text-base font-semibold text-[#000000] mb-2">
                      Leave To <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        min={todayInputDate}
                        value={leaveTo}
                        onChange={(e) => {
                          setLeaveTo(e.target.value);
                          if (applyFormErrors.leaveTo)
                            setApplyFormErrors((p) => ({ ...p, leaveTo: "" }));
                        }}
                        className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveTo ? "border border-[#DD4342]" : "border-0"} bg-[#F2F3F4]`}
                        style={{ colorScheme: "light" }}
                      />
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                          strokeWidth="1.5"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                        <line
                          x1="3"
                          y1="10"
                          x2="21"
                          y2="10"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                    {applyFormErrors.leaveTo && (
                      <p className="mt-1.5 text-sm text-[#DD4342]">
                        {applyFormErrors.leaveTo}
                      </p>
                    )}
                </div>
              </div>
              <div>
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Describe Your Reason{" "}
                    <span className="text-[#DD4342]">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => {
                      setReason(normalizeNameAndReason(e.target.value));
                      if (applyFormErrors.reason)
                        setApplyFormErrors((p) => ({ ...p, reason: "" }));
                    }}
                    rows={3}
                    placeholder="Enter your reason for leave..."
                    className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] resize-none ${applyFormErrors.reason ? "border border-[#DD4342]" : "border-0"} bg-[#F2F3F4]`}
                  />
                  {applyFormErrors.reason && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.reason}
                    </p>
                  )}
              </div>
              <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="cursor-pointer flex-1 px-4 py-2.5 rounded-lg font-medium text-[#616161] bg-[#F2F2F2] hover:bg-[#E5E5E5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer flex-1 px-4 py-2.5 bg-[#DD4342] text-white rounded-lg font-semibold hover:bg-[#c43a39] active:scale-[0.98] transition-all shadow-sm"
                  >
                    Submit
                  </button>
              </div>
            </form>
          </div>
        </div>,
          document.body,
        )}

      {editModalOpen &&
        editingLeave &&
        createPortal(
          <div
            className="hover:cursor-pointer fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="hover:cursor-pointer bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden border border-[#E5E5E5]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center justify-center px-6 py-5">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="cursor-pointer absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-md bg-[#F2F2F2] transition-colors"
                  aria-label="Close"
                >
                  <img src={closeIcon} alt="" className="w-5 h-5 object-contain" />
                </button>
                <h3 className="text-[24px] font-medium text-[#000000]">Edit Leave</h3>
            </div>
              <form onSubmit={handleSubmitEdit} className="px-6 py-6 space-y-4">
                <div>
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Employee Name <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    value={
                      editingLeave
                        ? `${editingLeave.employeeName}${editingLeave.role ? ` - ${editingLeave.role}` : ""}`
                        : ""
                    }
                    readOnly
                    disabled
                    className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none bg-[#F2F3F4] disabled:opacity-70 disabled:cursor-not-allowed ${applyFormErrors.employeeName ? "border border-[#DD4342]" : "border-0"}`}
                    placeholder="Employee name - Role"
                  />
                  {applyFormErrors.employeeName && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.employeeName}
                    </p>
                  )}
                </div>
               <div className="relative" ref={leaveTypeDropdownEditRef}>
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Leave Type <span className="text-[#DD4342]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setLeaveTypeOpenEdit((o) => !o)}
                    className={`cursor-pointer w-full px-4 py-2.5 rounded-lg text-left text-sm flex items-center justify-between min-h-[40px] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors ${leaveTypeOpenEdit ? "ring-1 ring-[#D2D2D2]" : applyFormErrors.leaveType ? "border border-[#DD4342]" : "border-0"} bg-[#F2F3F4]`}
                  >
                    <span
                      className={
                        leaveType
                          ? "text-[#353535] font-medium"
                          : "text-[#8B8B8B]"
                      }
                    >
                      {leaveType || "Select leave type"}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform duration-200 cursor-pointer ${leaveTypeOpenEdit ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                </button>
                {leaveTypeOpenEdit && (
                    <div
                      className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-lg border border-[#E5E5E5] shadow-lg py-1.5"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setLeaveType("");
                          setLeaveTypeOpenEdit(false);
                        }}
                        className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${!leaveType ? "text-[#353535] bg-[#F0F2F7]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]"}`}
                      >
                        Nothing selected
                      </button>
                      {LEAVE_TYPES.map((t) => (
                        <button
                          key={`${t}-edit`}
                          type="button"
                          onClick={() => {
                            setLeaveType(t);
                            setLeaveTypeOpenEdit(false);
                            if (applyFormErrors.leaveType)
                              setApplyFormErrors((p) => ({
                                ...p,
                                leaveType: "",
                              }));
                          }}
                          className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${leaveType === t ? "text-[#353535] bg-[#F0F2F7]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]"}`}
                        >
                          {t}
                        </button>
                    ))}
                  </div>
                )}
                  {applyFormErrors.leaveType && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.leaveType}
                    </p>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-base font-semibold text-[#000000] mb-2">
                      Leave From <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        min={todayInputDate}
                        value={leaveFrom}
                        onChange={(e) => {
                          setLeaveFrom(e.target.value);
                          if (leaveTo && e.target.value > leaveTo)
                            setLeaveTo("");
                          if (applyFormErrors.leaveFrom)
                            setApplyFormErrors((p) => ({
                              ...p,
                              leaveFrom: "",
                            }));
                          if (
                            applyFormErrors.leaveTo &&
                            leaveTo &&
                            e.target.value <= leaveTo
                          )
                            setApplyFormErrors((p) => ({ ...p, leaveTo: "" }));
                        }}
                        className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveFrom ? "border border-[#DD4342]" : "border-0"} bg-[#F2F3F4]`}
                        style={{ colorScheme: "light" }}
                      />
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                          strokeWidth="1.5"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                        <line
                          x1="3"
                          y1="10"
                          x2="21"
                          y2="10"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                    {applyFormErrors.leaveFrom && (
                      <p className="mt-1.5 text-sm text-[#DD4342]">
                        {applyFormErrors.leaveFrom}
                      </p>
                    )}
                </div>
                <div>
                    <label className="block text-base font-semibold text-[#000000] mb-2">
                      Leave To <span className="text-[#DD4342]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        min={todayInputDate}
                        value={leaveTo}
                        onChange={(e) => {
                          setLeaveTo(e.target.value);
                          if (applyFormErrors.leaveTo)
                            setApplyFormErrors((p) => ({ ...p, leaveTo: "" }));
                        }}
                        className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveTo ? "border border-[#DD4342]" : "border-0"} bg-[#F2F3F4]`}
                        style={{ colorScheme: "light" }}
                      />
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                          strokeWidth="1.5"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                        <line
                          x1="3"
                          y1="10"
                          x2="21"
                          y2="10"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                    {applyFormErrors.leaveTo && (
                      <p className="mt-1.5 text-sm text-[#DD4342]">
                        {applyFormErrors.leaveTo}
                      </p>
                    )}
                </div>
              </div>
              <div>
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Describe Your Reason{" "}
                    <span className="text-[#DD4342]">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => {
                      setReason(normalizeNameAndReason(e.target.value));
                      if (applyFormErrors.reason)
                        setApplyFormErrors((p) => ({ ...p, reason: "" }));
                    }}
                    rows={3}
                    placeholder="Enter your reason for leave..."
                    className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] resize-none ${applyFormErrors.reason ? "border border-[#DD4342]" : "border-0"} bg-[#F2F3F4]`}
                  />
                  {applyFormErrors.reason && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.reason}
                    </p>
                  )}
              </div>
              <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="cursor-pointer flex-1 px-4 py-2.5 rounded-lg font-medium text-[#616161] bg-[#F2F2F2] hover:bg-[#E5E5E5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="hover:cursor-pointer flex-1 px-4 py-2.5 bg-[#DD4342] text-white rounded-lg font-semibold hover:bg-[#c43a39] active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                  >
                    Update
                  </button>
              </div>
            </form>
          </div>
        </div>,
          document.body,
        )}

      {/* Delete leave confirmation modal — same pattern as MytaskBC */}
      {deleteLeave !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            <button
              type="button"
              onClick={() => setDeleteLeave(null)}
              className="absolute left-4 top-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
              title="Close"
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
            <h3 className="text-[18px] font-gantari font-semibold text-[#020202] mt-[12px] mb-3">
              Delete Leave
            </h3>
            <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center">
              Are you sure, you want to Delete this?
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto mb-6">
              <button
                type="button"
                onClick={() => setDeleteLeave(null)}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={confirmDeleteLeave}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {approveLeave !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            <div className="w-full flex items-center justify-between px-4 py-3 relative">
              <button
                type="button"
                onClick={() => setApproveLeave(null)}
                className="p-1 rounded-sm text-black hover:bg-[#E0E0E0] bg-[#F0F0F0] transition-colors cursor-pointer"
                aria-label="Close"
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
              <h3 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-gantari font-semibold text-[#020202] whitespace-nowrap">
                Approve leave
              </h3>
              <div className="w-8" />
            </div>
            <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-4 text-center px-4">
              Approve and send this BIM Modeler request to the BIM Lead for final approval?
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
                onClick={confirmApproveLeave}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#E1F6EB] text-[#008F22] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Yes, approve
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectLeave !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            <div className="w-full flex items-center justify-between px-4 py-3 relative">
              <button
                type="button"
                onClick={() => setRejectLeave(null)}
                className="p-1 rounded-sm text-black hover:bg-[#E0E0E0] bg-[#F0F0F0] transition-colors cursor-pointer"
                aria-label="Close"
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
              <h3 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-gantari font-semibold text-[#020202] whitespace-nowrap">
                Reject leave
              </h3>
              <div className="w-8" />
            </div>
            <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center px-4">
              Are you sure you want to reject this leave request?
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
                onClick={confirmRejectLeave}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Yes, reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
