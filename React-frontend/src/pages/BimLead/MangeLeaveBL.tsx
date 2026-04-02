import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import closeIcon from "../../assets/ProductNavbarIcons/close button.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";

const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";
const SHOW_ENTRIES_SELECTED_PREFIX = "Show:";
const EMPLOYEE_FILTER_PLACEHOLDER = "Employee";

interface LeaveEntry {
  id: number;
  slNo: number;
  employeeName: string;
  role?: string;
  leaveType: string;
  leaveTypeId?: number | null;
  appliedOn: string;
  appliedTo?: string;
  currentStatus: string;
  fromDate?: string;
  toDate?: string;
  description?: string;
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

/** Allow only letters, numbers, symbols; collapse multiple spaces to one (for Employee Name and Reason). */
function normalizeNameAndReason(value: string): string {
  const allowed = value.replace(/[^\w\s.,\-'()\/&@!#?;:'"]/g, "");
  return allowed.replace(/\s+/g, " ");
}

/** Convert DD/MM/YYYY to YYYY-MM-DD for date input. */
function toInputDate(d: string | undefined): string {
  if (!d) return "";
  const s = String(d).trim();

  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY -> YYYY-MM-DD
  const slashParts = s.split('/');
  if (slashParts.length === 3) {
    const [dd, mm, yy] = slashParts;
    if (dd && mm && yy) return `${yy}-${mm}-${dd}`;
  }

  // DD-MM-YYYY -> YYYY-MM-DD
  const dashParts = s.split('-');
  if (dashParts.length === 3) {
    const [dd, mm, yy] = dashParts;
    if (dd && mm && yy) return `${yy}-${mm}-${dd}`;
  }

  return '';
}
/** Convert YYYY-MM-DD to DD/MM/YYYY for storage. */
// function toStoredDate(d: string): string {
//   if (!d) return "";
//   const [y, m, day] = d.split("-");
//   return `${day}/${m}/${y}`;
// }

/** Format ISO date (or plain YYYY-MM-DD) to DD/MM/YYYY for table display. */
function formatApiDate(value: string | undefined | null): string {
  if (!value) return "";
  const s = String(value);
  // Avoid timezone shift for plain YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yy, mm, dd] = s.split('-');
    return `${dd}/${mm}/${yy}`;
  }
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

function getTodayInputDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ManageLeave() {
  const { user } = useAuth();
  const todayInputDate = getTodayInputDate();

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState<number | null>(null);
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [reason, setReason] = useState("");
  const [applyFormErrors, setApplyFormErrors] = useState<
    Record<string, string>
  >({});
  const [leaves, setLeaves] = useState<LeaveEntry[]>(DUMMY_LEAVES);

  const [leaveTypeOptions, setLeaveTypeOptions] = useState<
    Array<{ id: number; title: string }>
  >([]);
  // Always show frontend leave options; attach backend id when title matches.
  const leaveTypeDropdownItems: Array<{ id: number | null; title: string }> = [
    ...LEAVE_TYPES.map((title) => {
      const match = leaveTypeOptions.find((opt) => opt.title === title);
      return { title, id: match ? match.id : null };
    }),
    ...leaveTypeOptions
      .filter((opt) => !LEAVE_TYPES.includes(opt.title))
      .map((opt) => ({ title: opt.title, id: opt.id })),
  ];

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveEntry | null>(null);
  const [deleteLeave, setDeleteLeave] = useState<LeaveEntry | null>(null);
  const [leaveTypeOpenEdit, setLeaveTypeOpenEdit] = useState(false);
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
  const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
  const leaveTypeDropdownRef = useRef<HTMLDivElement>(null);

  const employeeOptions = [
    "All",
    ...Array.from(new Set(leaves.map((l) => l.employeeName))),
  ];

  // Load leave applications from backend (tblleaves) for this company
  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const { data } = await api.get<{ applications?: any[] }>(
          "/api/leave/applications",
        );
        const apps = data.applications || [];
        // BIM Lead should see:
        // - All BIM Modeler / BIM Coordinator leaves
        // - Plus their own applications (any role)
        const allowedRoles = new Set(["bim modeler", "bim coordinator"]);
        const filteredApps = apps.filter((app) => {
          const role = String(app.role || "").toLowerCase();
          const isAllowedRole = allowedRoles.has(role);
          const isOwn = user && app.employee_id === user.id;
          return isAllowedRole || isOwn;
        });
        const mapped: LeaveEntry[] = filteredApps.map((app, index) => ({
          id: app.lid,
          slNo: index + 1,
          employeeName: app.full_name || "Unknown",
          role: app.role || undefined,
          leaveType: app.title || app.leave_type || "Others",
          leaveTypeId:
            app.leave_type !== undefined && app.leave_type !== null
              ? Number(app.leave_type)
              : null,
          appliedOn: formatApiDate(app.posting_date),
          fromDate: formatApiDate(app.from_date),
          toDate: formatApiDate(app.to_date),
          description: app.description || "",
          currentStatus:
            app.status === 1
              ? "Approved"
              : app.status === 2
                ? "Rejected"
                : "Pending",
        }));
        setLeaves(mapped);
      } catch (err) {
        console.error(
          "Failed to load leaves from backend, using fallback data.",
          err,
        );
        // keep existing dummy data as fallback
      }
    };

    fetchLeaves();
  }, [user?.id]);

  // Load leave types (holiday table) so we can store the correct leave_type id in tblleaves.
  useEffect(() => {
    api
      .get<{ leave_types?: Array<{ id?: number; title?: string }>; others_value?: string }>("/api/leave/types")
      .then(({ data }) => {
        const types =
          (data.leave_types || [])
            .map((t) => ({
              id: typeof t.id === "number" ? t.id : Number(t.id),
              title: String(t.title || ""),
            }))
            .filter((t) => Number.isFinite(t.id) && t.title);
        setLeaveTypeOptions(types);
      })
      .catch(() => {
        setLeaveTypeOptions([]);
      });
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
      ) {
        setLeaveTypeOpen(false);
      }
    };
    if (leaveTypeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [leaveTypeOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        leaveTypeDropdownEditRef.current &&
        !leaveTypeDropdownEditRef.current.contains(event.target as Node)
      ) {
        setLeaveTypeOpenEdit(false);
      }
    };
    if (leaveTypeOpenEdit) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [leaveTypeOpenEdit]);

  useEffect(() => {
    setCurrentPage(1);
    setPaginationWindowStart(1);
  }, [selectedShowEntries, selectedEmployee]);

  const employeeFilterShowsAll =
    selectedEmployee === "" || selectedEmployee === "All";
  const filteredList = employeeFilterShowsAll
    ? leaves
    : leaves.filter((l) => l.employeeName === selectedEmployee);
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

  const validateApplyForm = (): boolean => {
    const err: Record<string, string> = {};
    const trimmedName = employeeName.trim();
    const trimmedReason = reason.trim();
    const today = getTodayInputDate();
    if (!trimmedName) err.employeeName = "Employee name is required";
    if (!leaveType) err.leaveType = "Leave type is required";
    if (!leaveFrom) err.leaveFrom = "Leave from date is required";
    if (!leaveTo) err.leaveTo = "Leave to date is required";
    if (!trimmedReason) err.reason = "Reason is required";
    if (leaveFrom && leaveFrom < today) err.leaveFrom = "Leave from date cannot be in the past";
    if (leaveTo && leaveTo < today) err.leaveTo = "Leave to date cannot be in the past";
    if (leaveFrom && leaveTo && leaveFrom > leaveTo)
      err.leaveTo = "Leave to must be on or after leave from";
    setApplyFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateApplyForm()) return;

    try {
      const payload: any = {
        // Send backend id when available; otherwise send selected text.
        leavetype: leaveTypeId && leaveTypeId > 0 ? leaveTypeId : leaveType,
        description: reason.trim(),
        from_date: leaveFrom,
        to_date: leaveTo,
      };

      // Optional: send days_count if both dates are present
      if (leaveFrom && leaveTo) {
        const from = new Date(leaveFrom);
        const to = new Date(leaveTo);
        const diffMs = to.getTime() - from.getTime();
        if (!Number.isNaN(diffMs) && diffMs >= 0) {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
          payload.days_count = days;
        }
      }

      const { data } = await api.post<{
        success: boolean;
        id?: number;
        message?: string;
      }>("/api/leave/applications", payload);
      if (data.success === false) {
        alert(data.message || "Failed to apply leave.");
        return;
      }

      // Reload latest leaves from backend so list reflects the new application
      try {
        const resp = await api.get<{ applications?: any[] }>(
          "/api/leave/applications",
        );
        const apps = resp.data.applications || [];
        const allowedRoles = new Set(["bim modeler", "bim coordinator"]);
        const filteredApps = apps.filter((app) => {
          const role = String(app.role || "").toLowerCase();
          const isAllowedRole = allowedRoles.has(role);
          const isOwn = user && app.employee_id === user.id;
          return isAllowedRole || isOwn;
        });
        const mapped: LeaveEntry[] = filteredApps.map((app, index) => ({
          id: app.lid,
          slNo: index + 1,
          employeeName: app.full_name || "Unknown",
          role: app.role || undefined,
          leaveType: app.title || app.leave_type || "Others",
          leaveTypeId:
            app.leave_type !== undefined && app.leave_type !== null
              ? Number(app.leave_type)
              : null,
          appliedOn: formatApiDate(app.posting_date),
          fromDate: formatApiDate(app.from_date),
          toDate: formatApiDate(app.to_date),
          description: app.description || "",
          currentStatus:
            app.status === 1
              ? "Approved"
              : app.status === 2
                ? "Rejected"
                : "Pending",
        }));
        setLeaves(mapped);
      } catch (err) {
        console.error("Failed to refresh leaves after apply.", err);
      }

      setLeaveType("");
      setLeaveTypeId(null);
      setLeaveFrom("");
      setLeaveTo("");
      setReason("");
      setApplyFormErrors({});
      setApplyModalOpen(false);
    } catch (err: any) {
      console.error("Apply leave failed", err);
      alert(
        err?.response?.data?.message ||
          "Failed to apply leave. Please try again.",
      );
    }
  };

  const handleCloseModal = () => {
    setApplyModalOpen(false);
    setEmployeeName("");
    setLeaveType("");
    setLeaveTypeId(null);
    setLeaveFrom("");
    setLeaveTo("");
    setReason("");
    setApplyFormErrors({});
  };

  const handleEdit = (row: LeaveEntry) => {
    setEditingLeave(row);
    // Show employee name with role for display in the edit modal
    setEmployeeName(
      row.role ? `${row.employeeName} - ${row.role}` : row.employeeName,
    );
    setLeaveType(row.leaveType);
    const matchingType = leaveTypeOptions.find((t) => t.title === row.leaveType);
    setLeaveTypeId(matchingType ? matchingType.id : row.leaveTypeId ?? null);
    setLeaveFrom(toInputDate(row.fromDate));
    setLeaveTo(toInputDate(row.toDate));
    setReason(row.description ?? "");
    setApplyFormErrors({});
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingLeave(null);
    setEmployeeName("");
    setLeaveType("");
    setLeaveTypeId(null);
    setLeaveFrom("");
    setLeaveTo("");
    setReason("");
    setApplyFormErrors({});
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave || !validateApplyForm()) return;

    try {
      const payload: any = {
        leavetype: leaveTypeId && leaveTypeId > 0 ? leaveTypeId : leaveType,
        description: reason.trim(),
        from_date: leaveFrom,
        to_date: leaveTo,
      };

      if (leaveFrom && leaveTo) {
        const from = new Date(leaveFrom);
        const to = new Date(leaveTo);
        const diffMs = to.getTime() - from.getTime();
        if (!Number.isNaN(diffMs) && diffMs >= 0) {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
          payload.days_count = days;
        }
      }

      const { data } = await api.patch<{ success: boolean; message?: string }>(
        `/api/leave/applications/${editingLeave.id}`,
        payload,
      );

      if (data.success === false) {
        alert(data.message || "Failed to update leave.");
        return;
      }

      // Refresh leaves from backend so table reflects latest values
      try {
        const resp = await api.get<{ applications?: any[] }>(
          "/api/leave/applications",
        );
        const apps = resp.data.applications || [];
        const allowedRoles = new Set(["bim modeler", "bim coordinator"]);
        const filteredApps = apps.filter((app) => {
          const role = String(app.role || "").toLowerCase();
          const isAllowedRole = allowedRoles.has(role);
          const isOwn = user && app.employee_id === user.id;
          return isAllowedRole || isOwn;
        });
        const mapped: LeaveEntry[] = filteredApps.map((app, index) => ({
          id: app.lid,
          slNo: index + 1,
          employeeName: app.full_name || "Unknown",
          role: app.role || undefined,
          leaveType: app.title || app.leave_type || "Others",
          leaveTypeId:
            app.leave_type !== undefined && app.leave_type !== null
              ? Number(app.leave_type)
              : null,
          appliedOn: formatApiDate(app.posting_date),
          fromDate: formatApiDate(app.from_date),
          toDate: formatApiDate(app.to_date),
          description: app.description || "",
          currentStatus:
            app.status === 1
              ? "Approved"
              : app.status === 2
                ? "Rejected"
                : "Pending",
        }));
        setLeaves(mapped);
      } catch (err) {
        console.error("Failed to refresh leaves after edit.", err);
      }

      handleCloseEditModal();
    } catch (err: any) {
      console.error("Update leave failed", err);
      alert(
        err?.response?.data?.message ||
          "Failed to update leave. Please try again.",
      );
    }
  };

  const openDeleteLeave = (row: LeaveEntry) => {
    setDeleteLeave(row);
  };

  const confirmDeleteLeave = async () => {
    if (deleteLeave === null) return;
    const row = deleteLeave;
    try {
      await api.delete(`/api/leave/applications/${row.id}`);

      const resp = await api.get<{ applications?: any[] }>(
        "/api/leave/applications",
      );
      const apps = resp.data.applications || [];
      const allowedRoles = new Set(["bim modeler", "bim coordinator"]);
      const filteredApps = apps.filter((app) => {
        const role = String(app.role || "").toLowerCase();
        const isAllowedRole = allowedRoles.has(role);
        const isOwn = user && app.employee_id === user.id;
        return isAllowedRole || isOwn;
      });

      const mapped: LeaveEntry[] = filteredApps.map((app, index) => ({
        id: app.lid,
        slNo: index + 1,
        employeeName: app.full_name || "Unknown",
        role: app.role || undefined,
        leaveType: app.title || app.leave_type || "Others",
        leaveTypeId:
          app.leave_type !== undefined && app.leave_type !== null
            ? Number(app.leave_type)
            : null,
        appliedOn: formatApiDate(app.posting_date),
        fromDate: formatApiDate(app.from_date),
        toDate: formatApiDate(app.to_date),
        description: app.description || "",
        currentStatus:
          app.status === 1 ? "Approved" : app.status === 2 ? "Rejected" : "Pending",
      }));
      setLeaves(mapped);
      setDeleteLeave(null);
    } catch (err) {
      console.error("Failed to delete leave", err);
      alert("Delete failed. Please try again.");
    }
  };

  const updateLeaveStatus = (
    id: number,
    statusLabel: "Approved" | "Rejected",
  ) => {
    setLeaves((prev) =>
      prev.map((l) => (l.id === id ? { ...l, currentStatus: statusLabel } : l)),
    );
  };

  const handleApproveBackend = async (row: LeaveEntry) => {
    try {
      await api.post(`/api/leave/applications/${row.id}/approve`);
      updateLeaveStatus(row.id, "Approved");
    } catch (err) {
      console.error("Failed to approve leave", err);
      alert("Failed to approve leave. Please try again.");
    }
  };

  const handleRejectBackend = async (row: LeaveEntry) => {
    try {
      await api.post(`/api/leave/applications/${row.id}/reject`);
      updateLeaveStatus(row.id, "Rejected");
    } catch (err) {
      console.error("Failed to reject leave", err);
      alert("Failed to reject leave. Please try again.");
    }
  };

  // Only allow BIM Lead to approve/reject leaves for BIM Modeler / BIM Coordinator,
  // and never for their own applications.
  const canActOnLeave = (row: LeaveEntry): boolean => {
    const currentName = (user?.full_name || "").trim();
    const role = (row.role || "").toLowerCase();
    if (!currentName) return false;

    // Do not act on own leave applications
    if (row.employeeName.trim() === currentName) return false;

    return role === "bim modeler" || role === "bim coordinator";
  };

  // Only the person who applied the leave can edit/delete their own application,
  // and only while it is still Pending.
  const canEditLeave = (row: LeaveEntry): boolean => {
    const currentName = (user?.full_name || "").trim();
    if (!currentName) return false;
    return (
      row.employeeName.trim() === currentName && row.currentStatus === "Pending"
    );
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
                  const displayName = user
                    ? `${user.full_name}${user.user_role ? ` - ${user.user_role}` : ""}`
                    : "";
                  setEmployeeName(displayName);
                  setApplyModalOpen(true);
                }}
                className="px-4 py-2 bg-[#DD4346] text-white rounded-md text-[14px] font-gantari font-medium hover:bg-[#c43a39] transition-colors cursor-pointer"
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
                className="relative min-w-[140px] max-w-[200px] w-[160px]"
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
            <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 pr-1 pb-0">
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
                      const baseIndex =
                        rangeStart + (safePage - 1) * PER_PAGE + index;
                      const slNo = baseIndex + 1;
                      const isLastRow = index === displayedList.length - 1;
                      return (
                        <tr
                          key={row.id}
                          className={`${index % 2 === 1 ? "bg-[#F2F2F2] " : "bg-[#FFFFFF]"} transition-colors`}
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
                          <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                            <span
                              className={`inline-flex px-3 py-1 rounded-md text-[12px] font-semibold font-gantari ${row.currentStatus === "Approved" ? "bg-[#E1F6EB] text-[#008F22]" : row.currentStatus === "Rejected" ? "bg-[#FFE5E5] text-[#C62828]" : "bg-[#FFEAD6] text-[#EB7200]"}`}
                            >
                              {row.currentStatus}
                            </span>
                          </td>
                          <td className="px-3 py-6 text-center text-[14px] whitespace-nowrap align-middle">
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
                              {row.currentStatus === "Pending" &&
                                canActOnLeave(row) && (
                                  <>
                                    <div className="relative group inline-flex shrink-0">
                                      <button
                                        type="button"
                                        aria-label="Approve"
                                        onClick={() =>
                                          handleApproveBackend(row)
                                        }
                                        className="inline-flex items-center justify-center p-2 bg-[#008F22] text-white rounded-md font-medium active:scale-[0.98] transition-transform cursor-pointer"
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
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 flex flex-col items-center">
                                          <div className="bg-gray-100 border border-[#C1C1C1]/50 rounded-lg shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0.18)] px-4 py-2">
                                            <span className="font-gantari text-xs font-medium text-[#008F22] text-center block">
                                              Approve
                                            </span>
                                          </div>
                                          <div className="relative z-10 -mt-[1px]">
                                            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-gray-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"></div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 flex flex-col items-center">
                                          <div className="relative z-10">
                                            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-300 drop-shadow-[0_-2px_4px_rgba(0,0,0,0.15)]"></div>
                                          </div>
                                          <div className="bg-gray-100 border border-[#C1C1C1]/50 rounded-lg shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0.18)] px-4 py-2 -mt-[1px]">
                                            <span className="font-gantari text-xs font-medium text-[#008F22] text-center block">
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
                                        onClick={() =>
                                          handleRejectBackend(row)
                                        }
                                        className="inline-flex items-center justify-center p-2 bg-[#C62828] text-white rounded-md font-medium active:scale-[0.98] transition-transform cursor-pointer"
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
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 flex flex-col items-center">
                                          <div className="bg-gray-100 border border-[#C1C1C1]/50 rounded-lg shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0.18)] px-4 py-2">
                                            <span className="font-gantari text-xs font-medium text-[#E00100] text-center block">
                                              Reject
                                            </span>
                                          </div>
                                          <div className="relative z-10 -mt-[1px]">
                                            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-gray-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"></div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 flex flex-col items-center">
                                          <div className="relative z-10">
                                            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-300 drop-shadow-[0_-2px_4px_rgba(0,0,0,0.15)]"></div>
                                          </div>
                                          <div className="bg-gray-100 border border-[#C1C1C1]/50 rounded-lg shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0.18)] px-4 py-2 -mt-[1px]">
                                            <span className="font-gantari text-xs font-medium text-[#E00100] text-center block">
                                              Reject
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              {canEditLeave(row) && (
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
                                    <img
                                      src={editIcon}
                                      alt=""
                                      className="w-4 h-4"
                                    />
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
                                    <img
                                      src={deleteIcon}
                                      alt=""
                                      className="w-4 h-4"
                                    />
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

      {/* Apply Leave Modal */}
      {applyModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#E5E5E5]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center justify-center px-6 py-5 flex-shrink-0 border-b border-[#EEEEEE] bg-[#FAFAFA]">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-md bg-[#F2F2F2] hover:bg-[#E8E8E8] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <img
                    src={closeIcon}
                    alt=""
                    className="w-5 h-5 object-contain"
                  />
                </button>
                <h3 className="text-xl font-medium text-[#000000] text-center">
                  Apply Leave
                </h3>
              </div>

              <form
                onSubmit={handleSubmitApply}
                className="flex flex-col flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar"
              >
                <div>
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Employee Name <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    value={
                      employeeName ||
                      (user
                        ? `${user.full_name}${user.user_role ? ` - ${user.user_role}` : ""}`
                        : "")
                    }
                    readOnly
                    disabled
                    placeholder="Employee name"
                    className={`w-full px-4 py-2.5 bg-[#E5E5E5] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed ${
                      applyFormErrors.employeeName
                        ? "border border-[#DD4342]"
                        : "border-0"
                    }`}
                  />
                  {applyFormErrors.employeeName && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.employeeName}
                    </p>
                  )}
                </div>

                <div ref={leaveTypeDropdownRef} className="relative">
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Leave Type <span className="text-[#DD4342]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setLeaveTypeOpen((o) => !o)}
                    className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] min-h-[40px] text-sm transition-colors cursor-pointer ${leaveTypeOpen ? "ring-1 ring-[#D2D2D2]" : applyFormErrors.leaveType ? "border border-[#DD4342]" : "border-0"}`}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeaveType("");
                          setLeaveTypeId(null);
                          setLeaveTypeOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${!leaveType ? "text-[#353535] bg-[#F0F2F7]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]"}`}
                      >
                        Nothing selected
                      </button>
                      {leaveTypeDropdownItems.map((opt) => {
                        const { id, title } = opt;
                        const isSelected = leaveType === title;
                        return (
                          <button
                            key={id ?? title}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeaveType(title);
                              setLeaveTypeId(id);
                              setLeaveTypeOpen(false);
                              if (applyFormErrors.leaveType)
                                setApplyFormErrors((prev) => ({
                                  ...prev,
                                  leaveType: "",
                                }));
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${isSelected ? "text-[#353535] bg-[#F0F2F7]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]"}`}
                          >
                            {title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {applyFormErrors.leaveType && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.leaveType}
                    </p>
                  )}
                </div>

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
                        if (applyFormErrors.leaveFrom)
                          setApplyFormErrors((prev) => ({
                            ...prev,
                            leaveFrom: "",
                          }));
                        if (
                          applyFormErrors.leaveTo &&
                          leaveTo &&
                          e.target.value <= leaveTo
                        )
                          setApplyFormErrors((prev) => ({
                            ...prev,
                            leaveTo: "",
                          }));
                      }}
                      className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveFrom ? "border border-[#DD4342]" : "border-0"}`}
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
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
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
                          setApplyFormErrors((prev) => ({
                            ...prev,
                            leaveTo: "",
                          }));
                      }}
                      className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveTo ? "border border-[#DD4342]" : "border-0"}`}
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
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                    </svg>
                  </div>
                  {applyFormErrors.leaveTo && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.leaveTo}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Describe Your Reason{" "}
                    <span className="text-[#DD4342]">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => {
                      const next = normalizeNameAndReason(e.target.value);
                      setReason(next);
                      if (applyFormErrors.reason)
                        setApplyFormErrors((prev) => ({ ...prev, reason: "" }));
                    }}
                    rows={5}
                    placeholder="Enter your reason for leave..."
                    className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors resize-y min-h-[120px] ${applyFormErrors.reason ? "border border-[#DD4342]" : "border-0"}`}
                  />
                  {applyFormErrors.reason && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.reason}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 rounded-md font-medium text-[#616161] bg-[#F2F2F2] hover:bg-[#E5E5E5] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-[#DD4342] text-white rounded-md font-medium  active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Edit Leave Modal */}
      {editModalOpen &&
        editingLeave &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#E5E5E5]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center justify-center px-6 py-5 flex-shrink-0 border-b border-[#EEEEEE] bg-[#FAFAFA]">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-md bg-[#F2F2F2] hover:bg-[#E8E8E8] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <img
                    src={closeIcon}
                    alt=""
                    className="w-5 h-5 object-contain"
                  />
                </button>
                <h3 className="text-xl font-medium text-[#000000] text-center">
                  Edit Leave
                </h3>
              </div>

              <form
                onSubmit={handleSubmitEdit}
                className="flex flex-col flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar"
              >
                <div>
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Employee Name <span className="text-[#DD4342]">*</span>
                  </label>
                  <input
                    type="text"
                    value={
                      employeeName ||
                      (editingLeave
                        ? `${editingLeave.employeeName}${editingLeave.role ? ` - ${editingLeave.role}` : ""}`
                        : "")
                    }
                    readOnly
                    disabled
                    placeholder="Employee name"
                    className={`w-full px-4 py-2.5 bg-[#E5E5E5] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed ${
                      applyFormErrors.employeeName
                        ? "border border-[#DD4342]"
                        : "border-0"
                    }`}
                  />
                  {applyFormErrors.employeeName && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.employeeName}
                    </p>
                  )}
                </div>

                <div ref={leaveTypeDropdownEditRef} className="relative">
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Leave Type <span className="text-[#DD4342]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setLeaveTypeOpenEdit((o) => !o)}
                    className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] min-h-[40px] text-sm transition-colors cursor-pointer ${leaveTypeOpenEdit ? "ring-1 ring-[#D2D2D2]" : applyFormErrors.leaveType ? "border border-[#DD4342]" : "border-0"}`}
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
                      className={`transition-transform duration-200 ${leaveTypeOpenEdit ? "rotate-180" : ""}`}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeaveType("");
                          setLeaveTypeId(null);
                          setLeaveTypeOpenEdit(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${!leaveType ? "text-[#353535] bg-[#F0F2F7]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]"}`}
                      >
                        Nothing selected
                      </button>
                      {leaveTypeDropdownItems.map((opt) => {
                        const { id, title } = opt;
                        const isSelected = leaveType === title;
                        return (
                          <button
                            key={id ?? title}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeaveType(title);
                              setLeaveTypeId(id);
                              setLeaveTypeOpenEdit(false);
                              if (applyFormErrors.leaveType)
                                setApplyFormErrors((prev) => ({
                                  ...prev,
                                  leaveType: "",
                                }));
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${isSelected ? "text-[#353535] bg-[#F0F2F7]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]"}`}
                          >
                            {title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {applyFormErrors.leaveType && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.leaveType}
                    </p>
                  )}
                </div>

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
                        if (applyFormErrors.leaveFrom)
                          setApplyFormErrors((prev) => ({
                            ...prev,
                            leaveFrom: "",
                          }));
                        if (
                          applyFormErrors.leaveTo &&
                          leaveTo &&
                          e.target.value <= leaveTo
                        )
                          setApplyFormErrors((prev) => ({
                            ...prev,
                            leaveTo: "",
                          }));
                      }}
                      className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveFrom ? "border border-[#DD4342]" : "border-0"}`}
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
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
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
                          setApplyFormErrors((prev) => ({
                            ...prev,
                            leaveTo: "",
                          }));
                      }}
                      className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveTo ? "border border-[#DD4342]" : "border-0"}`}
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
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                    </svg>
                  </div>
                  {applyFormErrors.leaveTo && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.leaveTo}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-base font-semibold text-[#000000] mb-2">
                    Describe Your Reason{" "}
                    <span className="text-[#DD4342]">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => {
                      const next = normalizeNameAndReason(e.target.value);
                      setReason(next);
                      if (applyFormErrors.reason)
                        setApplyFormErrors((prev) => ({ ...prev, reason: "" }));
                    }}
                    rows={5}
                    placeholder="Enter your reason for leave..."
                    className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors resize-y min-h-[120px] ${applyFormErrors.reason ? "border border-[#DD4342]" : "border-0"}`}
                  />
                  {applyFormErrors.reason && (
                    <p className="mt-1.5 text-sm text-[#DD4342]">
                      {applyFormErrors.reason}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-6 py-2.5 rounded-md font-medium text-[#616161] bg-[#F2F2F2]  transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-[#DD4342] text-white rounded-md font-medium  active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* View Leave Modal */}
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
              <div className="relative flex items-center justify-center px-6 py-5">
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
                    <span className="w-[140px] shrink-0 text-sm font-gantari text-[#353535] pt-0.5">
                      Employee Name
                    </span>
                    <span className="shrink-0 text-[#616161]">:</span>
                    <span className="text-sm text-[#616161]">
                      {selectedLeave.employeeName}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-[140px] shrink-0 text-sm font-gantari text-[#353535] pt-0.5">
                      Role
                    </span>
                    <span className="shrink-0 text-[#616161]">:</span>
                    <span className="text-sm text-[#616161]">
                      {selectedLeave.role ?? "–"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-[140px] shrink-0 text-sm font-gantari text-[#353535] pt-0.5">
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
                      className={`inline-flex px-3 py-1 rounded-md text-[12px] font-semibold font-gantari ${selectedLeave.currentStatus === "Approved" ? "bg-[#E1F6EB] text-[#008F22]" : selectedLeave.currentStatus === "Rejected" ? "bg-[#FFE5E5] text-[#C62828]" : "bg-[#FFEAD6] text-[#EB7200]"}`}
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
    </div>
  );
}
