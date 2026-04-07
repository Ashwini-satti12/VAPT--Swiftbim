import { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import viewIcon from '../../assets/ProjectManager/project/viewIcon.svg';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';
import closeIcon from '../../assets/ProductNavbarIcons/close button.svg';
import editIcon from '../../assets/ProjectManager/project/editIcon.svg';
import deleteIcon from '../../assets/ProjectManager/project/deleteIcon.svg';

const SHOW_ENTRIES_PLACEHOLDER = 'Show Entries';
const SHOW_ENTRIES_SELECTED_PREFIX = 'Show:';
const EMPLOYEE_FILTER_PLACEHOLDER = 'Employee';

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
  currentStatus: string;
  fromDate?: string;
  toDate?: string;
  description?: string;
}

// Local dummy list removed; data now comes from backend /api/leave/applications

const showEntriesOptions: {
  value: string;
  label: string;
  start: number;
  end: number | null;
}[] = [
  { value: '1-50', label: '1-50', start: 0, end: 50 },
  { value: '51-100', label: '51-100', start: 50, end: 100 },
  { value: '101-150', label: '101-150', start: 100, end: 150 },
  { value: '151-200', label: '151-200', start: 150, end: 200 },
  { value: '201-250', label: '201-250', start: 200, end: 250 },
  { value: '251-300', label: '251-300', start: 250, end: 300 },
  { value: 'all', label: 'All', start: 0, end: null },
];

const LEAVE_TYPES = [
  "Sick Leave",
  "Casual Leave",
  "Earned Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Unpaid Leave",
];

function toInputDate(d: string | undefined): string {
  if (!d) return "";
  const s = String(d).trim();

  // Already in input-friendly format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY -> YYYY-MM-DD
  const slashParts = s.split("/");
  if (slashParts.length === 3) {
    const [dd, mm, yy] = slashParts;
    if (dd && mm && yy) return `${yy}-${mm}-${dd}`;
  }

  // DD-MM-YYYY -> YYYY-MM-DD
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

  // Avoid timezone shifting for plain YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yy, mm, dd] = s.split("-");
    return `${dd}/${mm}/${yy}`;
  }

  // Already display format
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

function useShowEntriesDropdownState() {
  const [selectedShowEntries, setSelectedShowEntries] = useState('');
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
  return {
    selectedShowEntries,
    setSelectedShowEntries,
    showEntriesOpen,
    setShowEntriesOpen,
    showEntriesDropdownRef,
    showEntriesDropdownContentRef,
  };
}

export default function ManageLeave() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format

    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null);
    const [editingLeave, setEditingLeave] = useState<LeaveEntry | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [leaveType, setLeaveType] = useState('');
    const [leaveTypeId, setLeaveTypeId] = useState<number | null>(null);
    const [leaveFrom, setLeaveFrom] = useState('');
    const [leaveTo, setLeaveTo] = useState('');
    const [reason, setReason] = useState('');
    const [leaves, setLeaves] = useState<LeaveEntry[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<{ id: number | null; title: string }[]>([]);
    const [othersValue, setOthersValue] = useState<string>('Others');
    const [deleteLeave, setDeleteLeave] = useState<LeaveEntry | null>(null);

    const {
        selectedShowEntries,
        setSelectedShowEntries,
        showEntriesOpen,
        setShowEntriesOpen,
        showEntriesDropdownRef,
        showEntriesDropdownContentRef,
    } = useShowEntriesDropdownState();
    const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
    const leaveTypeDropdownRef = useRef<HTMLDivElement>(null);

    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const employeeDropdownRef = useRef<HTMLDivElement>(null);
    const employeeDropdownContentRef = useRef<HTMLDivElement>(null);

    const employeeOptions = [
        'All',
        ...Array.from(new Set(leaves.map((l) => l.employeeName))),
    ];

    // Load available leave types from backend (holiday table)
    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const { data } = await api.get<{ leave_types?: any[]; others_value?: string }>('/api/leave/types');
                const types = (data.leave_types || []).map((t) => ({
                    id: t.id ?? null,
                    title: t.title || 'Untitled',
                }));
                setLeaveTypes(types);
                if (data.others_value) setOthersValue(data.others_value);
            } catch (err) {
                console.error('Failed to load leave types for BIM Modeler', err);
                setLeaveTypes([]);
            }
        };
        fetchTypes();
    }, []);

    // Load leaves only for logged-in BIM Modeler (current user)
    useEffect(() => {
        const fetchLeaves = async () => {
            if (!user?.id) {
                setLeaves([]);
                return;
            }
            try {
                const { data } = await api.get<{ applications?: any[] }>('/api/leave/applications');
                const apps = (data.applications || []).filter(
                    (app) => app.employee_id === user.id
                );
                const mapped: LeaveEntry[] = apps.map((app, index) => ({
                    id: app.lid,
                    slNo: index + 1,
                    employeeId: app.employee_id,
                    employeeName: app.full_name || (user.full_name || 'Unknown'),
                    role: app.role || user.user_role || undefined,
                    email: app.email || user.email || undefined,
                    leaveType: app.type_name || app.title || othersValue,
                    leaveTypeId:
                        app.leave_type !== undefined && app.leave_type !== null
                            ? (() => {
                                  const parsed = Number(app.leave_type);
                                  return Number.isFinite(parsed) ? parsed : null;
                              })()
                            : null,
                    appliedOn: formatApiDate(app.posting_date),
                    fromDate: formatApiDate(app.from_date),
                    toDate: formatApiDate(app.to_date),
                    description: app.description || '',
                    currentStatus:
                        app.status === 1
                            ? 'Approved'
                            : app.status === 2
                            ? 'Rejected'
                            : 'Pending',
                }));
                setLeaves(mapped);
            } catch (err) {
                console.error('Failed to load BIM Modeler leaves', err);
                setLeaves([]);
            }
        };

        fetchLeaves();
    }, [user?.id]);

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
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
            if (leaveTypeDropdownRef.current && !leaveTypeDropdownRef.current.contains(event.target as Node)) {
                setLeaveTypeOpen(false);
            }
        };
        if (leaveTypeOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [leaveTypeOpen]);


    const employeeFilterShowsAll =
        selectedEmployee === '' || selectedEmployee === 'All';

    const filteredList = useMemo(() => {
        const q = searchParams.get('q')?.toLowerCase() || '';
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
            ].some((f) => (f || '').toLowerCase().includes(q));
        });
    }, [leaves, selectedEmployee, employeeFilterShowsAll, searchParams]);
    const effectiveShowEntryValue =
      selectedShowEntries || showEntriesOptions[0].value;
    const selectedRange =
      showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ??
      showEntriesOptions[0];
    const rangeStart = selectedRange.start;
    const rangeEnd = selectedRange.end === null ? filteredList.length : Math.min(selectedRange.end, filteredList.length);
    const displayedList = filteredList.slice(rangeStart, rangeEnd);


  const handleView = (row: LeaveEntry) => {
    setSelectedLeave(row);
    setViewModalOpen(true);
  };

  const handleSubmitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    // allow "Others" (leaveTypeId can be 0)
    if (!leaveType || !leaveFrom || !leaveTo || !reason.trim()) return;

    if (leaveFrom < todayStr) {
      toast.error("Leave From date cannot be in the past.");
      return;
    }
    if (leaveTo < leaveFrom) {
      toast.error("Leave To date must be after or on Leave From date.");
      return;
    }

    try {
      const payload: any = {
        // Store the selected leave type text (frontend value) in DB.
        // Backend will show it back via `tblleaves.leave_type` when holiday join doesn't match.
        leave_type: leaveType,
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

      const { data } = await api.post<{
        success: boolean;
        id?: number;
        message?: string;
      }>("/api/leave/applications", payload);
      if (data.success === false) {
        toast.error(data.message || "Failed to apply leave.");
        return;
      }

      // Reload only this user's leaves
      try {
        const resp = await api.get<{ applications?: any[] }>(
          "/api/leave/applications",
        );
        const apps = (resp.data.applications || []).filter(
          (app) => app.employee_id === user?.id,
        );
        const mapped: LeaveEntry[] = apps.map((app, index) => ({
          id: app.lid,
          slNo: index + 1,
          employeeId: app.employee_id,
          employeeName: app.full_name || user?.full_name || "Unknown",
          role: app.role || user?.user_role || undefined,
          email: app.email || user?.email || undefined,
          leaveType: app.type_name || app.title || othersValue,
          leaveTypeId:
            app.leave_type !== undefined && app.leave_type !== null
              ? (() => {
                  const parsed = Number(app.leave_type);
                  return Number.isFinite(parsed) ? parsed : null;
                })()
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
        console.error("Failed to refresh leaves after apply", err);
      }

      toast.success("Applied successfully");
      setLeaveType("");
      setLeaveTypeId(null);
      setLeaveFrom("");
      setLeaveTo("");
      setReason("");
      setApplyModalOpen(false);
    } catch (err: any) {
      console.error("Apply leave failed", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to apply leave. Please try again.",
      );
    }
  };

  const handleCloseModal = () => {
    setApplyModalOpen(false);
    setLeaveType("");
    setLeaveTypeId(null);
    setLeaveFrom("");
    setLeaveTo("");
    setReason("");
  };

  const handleEdit = (row: LeaveEntry) => {
    setEditingLeave(row);
    setLeaveType(row.leaveType);
    setLeaveTypeId(row.leaveTypeId ?? null);
    setLeaveFrom(toInputDate(row.fromDate));
    setLeaveTo(toInputDate(row.toDate));
    setReason(row.description || "");
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingLeave(null);
    setLeaveType("");
    setLeaveTypeId(null);
    setLeaveFrom("");
    setLeaveTo("");
    setReason("");
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave || !leaveType || !leaveFrom || !leaveTo || !reason.trim())
      return;

    if (leaveFrom < todayStr) {
      toast.error("Leave From date cannot be in the past.");
      return;
    }
    if (leaveTo < leaveFrom) {
      toast.error("Leave To date must be after or on Leave From date.");
      return;
    }

    try {
      const payload: any = {
        leavetype: leaveType,
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
        toast.error(data.message || "Failed to update leave.");
        return;
      }

      try {
        const resp = await api.get<{ applications?: any[] }>(
          "/api/leave/applications",
        );
        const apps = (resp.data.applications || []).filter(
          (app) => app.employee_id === user?.id,
        );
        const mapped: LeaveEntry[] = apps.map((app, index) => ({
          id: app.lid,
          slNo: index + 1,
          employeeId: app.employee_id,
          employeeName: app.full_name || user?.full_name || "Unknown",
          role: app.role || user?.user_role || undefined,
          email: app.email || user?.email || undefined,
          leaveType: app.type_name || app.title || "Others",
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
        console.error("Failed to refresh leaves after edit", err);
      }

      toast.success("Updated successfully");
      handleCloseEditModal();
    } catch (err: any) {
      console.error("Update leave failed", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to update leave. Please try again.",
      );
    }
  };

  const handleDelete = (row: LeaveEntry) => {
    setDeleteLeave(row);
  };

  const confirmDeleteLeave = async () => {
    if (!deleteLeave) return;
    try {
      await api.delete(`/api/leave/applications/${deleteLeave.id}`);

      // Reload only this user's leaves so SL.No and list stay correct after refresh
      if (user?.id) {
        const resp = await api.get<{ applications?: any[] }>(
          "/api/leave/applications",
        );
        const apps = (resp.data.applications || []).filter(
          (app) => app.employee_id === user.id,
        );
        const mapped: LeaveEntry[] = apps.map((app, index) => ({
          id: app.lid,
          slNo: index + 1,
          employeeId: app.employee_id,
          employeeName: app.full_name || user.full_name || "Unknown",
          role: app.role || user.user_role || undefined,
          email: app.email || user.email || undefined,
          leaveType: app.type_name || app.title || othersValue,
          leaveTypeId:
            app.leave_type !== undefined && app.leave_type !== null
              ? (() => {
                  const parsed = Number(app.leave_type);
                  return Number.isFinite(parsed) ? parsed : null;
                })()
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
      }
      toast.success("Deleted successfully");
      setDeleteLeave(null);
    } catch (err) {
      console.error("Failed to delete leave (BIM Modeler):", err);
      toast.error("Delete failed. Please try again.");
    }
  };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] font-gantari overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex-shrink-0 mb-6 flex flex-row items-center justify-between gap-4 flex-wrap">
                        <h1 className="text-[24px] font-gantari font-semibold text-[#000000]">
                            Manage Leaves
                        </h1>
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setApplyModalOpen(true)}
                                className="px-4 py-2 bg-[#DD4342] text-white rounded-md text-[14px] font-gantari font-medium transition-colors cursor-pointer"
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
                                            selectedEmployee === ''
                                                ? 'text-[#8B8B8B]'
                                                : 'text-[#353535]'
                                        }`}
                                    >
                                        {selectedEmployee === '' ? (
                                            EMPLOYEE_FILTER_PLACEHOLDER
                                        ) : selectedEmployee === 'All' ? (
                                            <>
                                                <span className="text-[14px]">
                                                    {EMPLOYEE_FILTER_PLACEHOLDER}:
                                                </span>{' '}
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
                                            employeeDropdownOpen ? 'rotate-180' : ''
                                        } ${
                                            selectedEmployee === ''
                                                ? 'opacity-60 grayscale'
                                                : 'opacity-90'
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
                                                    setSelectedEmployee('');
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
                                                            ? 'text-[#353535] bg-[#F2F2F2]'
                                                            : 'text-[#8B8B8B] bg-transparent'
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
                                            selectedShowEntries === ''
                                                ? 'text-[#8B8B8B]'
                                                : 'text-[#353535]'
                                        }`}
                                    >
                                        {selectedShowEntries === '' ? (
                                            SHOW_ENTRIES_PLACEHOLDER
                                        ) : (
                                            <>
                                                <span className="text-[14px]">
                                                    {SHOW_ENTRIES_SELECTED_PREFIX}
                                                </span>{' '}
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
                                            showEntriesOpen ? 'rotate-180' : ''
                                        } ${
                                            selectedShowEntries === ''
                                                ? 'opacity-60 grayscale'
                                                : 'opacity-90'
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
                                                    setSelectedShowEntries('');
                                                    setShowEntriesOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
                                            >
                                                {SHOW_ENTRIES_PLACEHOLDER}
                                            </button>
                                            {showEntriesOptions.map((opt) => {
                                                const isChosen =
                                                    selectedShowEntries === opt.value;
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
                                                                ? 'text-[#353535] bg-[#F2F2F2]'
                                                                : 'text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]'
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
                                            Applied On
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
                                                colSpan={7}
                                                className="px-3 py-12 text-center text-gray-400 font-medium font-gantari bg-white"
                                            >
                                                No leave records found
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedList.map((row, index) => {
                                            const slNo = rangeStart + index + 1;
                                            const slNoDisplay = String(slNo).padStart(2, '0');
                                            const isPending = row.currentStatus === 'Pending';
                                            return (
                                                <tr
                                                    key={row.id}
                                                    className={`${
                                                        index % 2 === 1
                                                            ? 'bg-[#F2F2F2] '
                                                            : 'bg-[#FFFFFF]'
                                                    } transition-colors`}
                                                >
                                                    <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">
                                                        {slNoDisplay}
                                                    </td>
                                                    <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                        {row.employeeName}
                                                    </td>
                                                    <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                        {row.role ?? '–'}
                                                    </td>
                                                    <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                        {row.leaveType}
                                                    </td>
                                                    <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                                                        {row.appliedOn}
                                                    </td>
                                                    <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                                                        <span
                                                            className={`inline-flex px-3 py-1 rounded-md text-[12px] font-semibold font-gantari ${
                                                                row.currentStatus === 'Approved'
                                                                    ? 'bg-[#E1F6EB] text-[#008F22]'
                                                                    : row.currentStatus === 'Rejected'
                                                                      ? 'bg-[#FFE5E5] text-[#C62828]'
                                                                      : 'bg-[#FFEAD6] text-[#EB7200]'
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
                                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#DD4242] text-white rounded-md font-medium text-[12px] cursor-pointer"
                                                            >
                                                                <img
                                                                    src={viewIcon}
                                                                    alt=""
                                                                    className="w-3.5 h-3.5 shrink-0 [filter:brightness(0)_invert(1)]"
                                                                />
                                                                View
                                                            </button>
                                                            {isPending && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEdit(row)}
                                                                        className={`inline-flex items-center justify-center p-2 rounded-md cursor-pointer ${
                                                                            index % 2 === 0
                                                                                ? 'bg-[#F2F2F2]'
                                                                                : 'bg-[#FFFFFF]'
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
                                                                        onClick={() => handleDelete(row)}
                                                                        className={`inline-flex items-center justify-center p-2 rounded-md text-[#353535] transition-colors shrink-0 cursor-pointer ${
                                                                            index % 2 === 0
                                                                                ? 'bg-[#F2F2F2]'
                                                                                : 'bg-[#FFFFFF]'
                                                                        }`}
                                                                        title="Delete"
                                                                    >
                                                                        <img
                                                                            src={deleteIcon}
                                                                            alt=""
                                                                            className="w-4 h-4 "
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

            {/* Apply Leave Modal — layout aligned with ManageLeaveBC */}
            {applyModalOpen && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-white rounded-md shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-[#E5E5E5]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative flex items-center justify-center px-6 py-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="cursor-pointer absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-md bg-[#F2F2F2] transition-colors"
                                aria-label="Close"
                            >
                                <img src={closeIcon} alt="" className="w-5 h-5 object-contain" />
                            </button>
                            <h3 className="text-[24px] font-medium text-[#000000]">Apply Leave</h3>
                        </div>

                        <form
                            onSubmit={handleSubmitApply}
                            className="flex flex-col flex-1 overflow-y-auto px-6 py-4 space-y-2 custom-scrollbar"
                        >
                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Employee Name
                                </label>
                                <input
                                    type="text"
                                    value={
                                        user
                                            ? `${user.full_name}${user.user_role ? ` - ${user.user_role}` : ''}`
                                            : ''
                                    }
                                    readOnly
                                    disabled
                                    className="w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] focus:outline-none bg-[#F2F3F4] border-0 disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div ref={leaveTypeDropdownRef} className="relative">
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Leave Type <span className="text-[#DD4342]">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setLeaveTypeOpen((o) => !o)}
                                    className={`cursor-pointer w-full px-4 py-2.5 rounded-lg text-left text-sm flex items-center justify-between min-h-[40px] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors border-0 bg-[#F2F3F4] ${leaveTypeOpen ? 'ring-1 ring-[#D2D2D2]' : ''}`}
                                >
                                    <span
                                        className={
                                            leaveType
                                                ? 'text-[#353535] font-medium'
                                                : 'text-[#8B8B8B]'
                                        }
                                    >
                                        {leaveType || 'Nothing selected'}
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
                                        className={`transition-transform duration-200 ${leaveTypeOpen ? 'rotate-180' : ''}`}
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
                                                setLeaveType('');
                                                setLeaveTypeId(null);
                                                setLeaveTypeOpen(false);
                                            }}
                                            className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${!leaveType ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}
                                        >
                                            Nothing selected
                                        </button>
                                        {LEAVE_TYPES.map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLeaveType(t);
                                                    setLeaveTypeId(null);
                                                    setLeaveTypeOpen(false);
                                                }}
                                                className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${leaveType === t ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                        {leaveTypes
                                            .filter((x) => x.title && !LEAVE_TYPES.includes(x.title))
                                            .map((type) => (
                                                <button
                                                    key={type.id ?? type.title}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaveType(type.title);
                                                        setLeaveTypeId(type.id);
                                                        setLeaveTypeOpen(false);
                                                    }}
                                                    className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${
                                                        leaveType === type.title
                                                            ? 'text-[#353535] bg-[#F0F2F7]'
                                                            : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'
                                                    }`}
                                                >
                                                    {type.title}
                                                </button>
                                            ))}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLeaveType(othersValue);
                                                setLeaveTypeId(0);
                                                setLeaveTypeOpen(false);
                                            }}
                                            className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${
                                                leaveTypeId === 0
                                                    ? 'text-[#353535] bg-[#F0F2F7]'
                                                    : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'
                                            }`}
                                        >
                                            {othersValue}
                                        </button>
                                    </div>
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
                                            required
                                            min={todayStr}
                                            value={leaveFrom}
                                            onChange={(e) => setLeaveFrom(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] border-0 bg-[#F2F3F4] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                            style={{ colorScheme: 'light' }}
                                        />
                                        <svg
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-[#000000] mb-2">
                                        Leave To <span className="text-[#DD4342]">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            required
                                            min={leaveFrom || todayStr}
                                            value={leaveTo}
                                            onChange={(e) => setLeaveTo(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] border-0 bg-[#F2F3F4] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                            style={{ colorScheme: 'light' }}
                                        />
                                        <svg
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Describe Your Reason{' '}
                                    <span className="text-[#DD4342]">*</span>
                                </label>
                                <textarea
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={6}
                                    placeholder="Enter your reason for leave..."
                                    className="w-full min-h-[140px] px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] resize-y border-0 bg-[#F2F3F4] break-words"
                                />
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
                document.body
            )}

            {/* Edit Leave Modal — same shell as Apply (ManageLeaveBC) */}
            {editModalOpen && editingLeave && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-black/60 backdrop-blur-sm"
                    onClick={handleCloseEditModal}
                >
                    <div
                        className="bg-white rounded-md shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-[#E5E5E5]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative flex items-center justify-center px-6 py-2 flex-shrink-0">
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

                        <form
                            onSubmit={handleSubmitEdit}
                            className="flex flex-col flex-1 overflow-y-auto px-6 py-6 space-y-2 custom-scrollbar"
                        >
                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Employee Name
                                </label>
                                <input
                                    type="text"
                                    value={
                                        editingLeave
                                            ? `${editingLeave.employeeName}${
                                                  editingLeave.role ? ` - ${editingLeave.role}` : ''
                                              }`
                                            : ''
                                    }
                                    readOnly
                                    disabled
                                    className="w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] focus:outline-none bg-[#F2F3F4] border-0 disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div ref={leaveTypeDropdownRef} className="relative">
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Leave Type <span className="text-[#DD4342]">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setLeaveTypeOpen((o) => !o)}
                                    className={`cursor-pointer w-full px-4 py-2.5 rounded-lg text-left text-sm flex items-center justify-between min-h-[40px] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors border-0 bg-[#F2F3F4] ${leaveTypeOpen ? 'ring-1 ring-[#D2D2D2]' : ''}`}
                                >
                                    <span
                                        className={
                                            leaveType
                                                ? 'text-[#353535] font-medium'
                                                : 'text-[#8B8B8B]'
                                        }
                                    >
                                        {leaveType || 'Nothing selected'}
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
                                        className={`transition-transform duration-200 ${leaveTypeOpen ? 'rotate-180' : ''}`}
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
                                                setLeaveType('');
                                                setLeaveTypeId(null);
                                                setLeaveTypeOpen(false);
                                            }}
                                            className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${!leaveType ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}
                                        >
                                            Nothing selected
                                        </button>
                                        {LEAVE_TYPES.map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLeaveType(t);
                                                    setLeaveTypeId(null);
                                                    setLeaveTypeOpen(false);
                                                }}
                                                className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${leaveType === t ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                        {leaveTypes
                                            .filter((x) => x.title && !LEAVE_TYPES.includes(x.title))
                                            .map((type) => (
                                                <button
                                                    key={type.id ?? type.title}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaveType(type.title);
                                                        setLeaveTypeId(type.id);
                                                        setLeaveTypeOpen(false);
                                                    }}
                                                    className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${
                                                        leaveType === type.title
                                                            ? 'text-[#353535] bg-[#F0F2F7]'
                                                            : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'
                                                    }`}
                                                >
                                                    {type.title}
                                                </button>
                                            ))}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLeaveType(othersValue);
                                                setLeaveTypeId(0);
                                                setLeaveTypeOpen(false);
                                            }}
                                            className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm font-medium ${
                                                leaveTypeId === 0
                                                    ? 'text-[#353535] bg-[#F0F2F7]'
                                                    : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'
                                            }`}
                                        >
                                            {othersValue}
                                        </button>
                                    </div>
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
                                            required
                                            min={todayStr}
                                            value={leaveFrom}
                                            onChange={(e) => setLeaveFrom(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] border-0 bg-[#F2F3F4] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                            style={{ colorScheme: 'light' }}
                                        />
                                        <svg
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-[#000000] mb-2">
                                        Leave To <span className="text-[#DD4342]">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            required
                                            min={leaveFrom || todayStr}
                                            value={leaveTo}
                                            onChange={(e) => setLeaveTo(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] border-0 bg-[#F2F3F4] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                            style={{ colorScheme: 'light' }}
                                        />
                                        <svg
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Describe Your Reason{' '}
                                    <span className="text-[#DD4342]">*</span>
                                </label>
                                <textarea
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={6}
                                    placeholder="Enter your reason for leave..."
                                    className="w-full min-h-[140px] px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] resize-y border-0 bg-[#F2F3F4] break-words"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseEditModal}
                                    className="cursor-pointer flex-1 px-4 py-2.5 rounded-md font-medium text-[#616161] bg-[#F2F2F2] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="cursor-pointer flex-1 px-4 py-2.5 bg-[#DD4342] text-white rounded-md font-semibold active:scale-[0.98] transition-all shadow-sm"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* View Leave Modal - strictly like View Client Details: colons vertically aligned, label : value, no lines */}
            {viewModalOpen && selectedLeave && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => { setViewModalOpen(false); setSelectedLeave(null); }}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-[#E5E5E5]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative flex items-center justify-center px-6 py-5">
                            <button
                                type="button"
                                onClick={() => { setViewModalOpen(false); setSelectedLeave(null); }}
                                className="cursor-pointer absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-md bg-[#F2F2F2] hover:bg-[#E8E8E8] transition-colors"
                                aria-label="Close"
                            >
                                <img src={closeIcon} alt="" className="w-5 h-5 object-contain" />
                            </button>
                            <h3 className="text-[24px] font-medium text-[#000000]">Leave Details</h3>
                        </div>
                        <div className="px-6 pb-6 pt-6 overflow-x-hidden min-w-0">
                            {/* Rows with fixed label width so colons align vertically (like second image) */}
                            <div className="space-y-5 text-[14px] font-gantari min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Employee Name</span>
                                    <span className="shrink-0 text-black">:</span>
                                    <span className="text-[#8B8B8B]">{selectedLeave.employeeName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Leave Type</span>
                                    <span className="shrink-0 text-black">:</span>
                                    <span className="text-[#8B8B8B]">{selectedLeave.leaveType}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Applied On</span>
                                    <span className="shrink-0 text-black">:</span>
                                    <span className="text-[#8B8B8B]">{selectedLeave.appliedOn}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Leave From</span>
                                    <span className="shrink-0 text-black">:</span>
                                    <span className="text-[#8B8B8B]">{selectedLeave.fromDate ?? '-'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Leave To</span>
                                    <span className="shrink-0 text-black">:</span>
                                    <span className="text-[#8B8B8B]">{selectedLeave.toDate ?? '-'}</span>
                                </div>
                                <div className="flex items-start gap-1">
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Reason</span>
                                    <span className="shrink-0 text-black leading-[1.5]">:</span>
                                    <span className="text-[#8B8B8B] min-w-0 flex-1 break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
                                        {selectedLeave.description ?? '-'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Current Status</span>
                                    <span className="shrink-0 text-black">:</span>
                                    <span className={`inline-flex px-3 py-1 rounded-md text-[12px] font-semibold font-gantari ${selectedLeave.currentStatus === 'Approved' ? 'bg-[#E1F6EB] text-[#008F22]' : selectedLeave.currentStatus === 'Rejected' ? 'bg-[#FFE5E5] text-[#C62828]' : 'bg-[#FFEAD6] text-[#EB7200]'}`}>
                                        {selectedLeave.currentStatus}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Delete Leave Confirmation Modal */}
            {deleteLeave && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteLeave(null)}>
                    <div
                        className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setDeleteLeave(null)}
                            className="absolute left-4 top-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
                            title="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h3 className="text-[18px] font-gantari font-semibold text-[#020202] mt-[12px] mb-3">
                            Delete Leave
                        </h3>
                        <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center px-4">
                            Are you sure, you want to Delete this Leave Application?
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
                </div>,
                document.body
            )}
        </div>
    );
}
