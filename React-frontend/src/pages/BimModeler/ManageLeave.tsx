import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import viewIcon from '../../assets/BIMModeler/ManageLeave/view icon.svg';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';
import closeIcon from '../../assets/ProductNavbarIcons/close button.svg';
import editIcon from '../../assets/ProjectManager/project/editIcon.svg';
import deleteIcon from '../../assets/ProjectManager/project/deleteIcon.svg';

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

const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
    { value: 'show', label: 'Show', start: 0, end: 50 },
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
  const [selectedShowEntries, setSelectedShowEntries] = useState(
    showEntriesOptions[0].value,
  );
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
    // Pagination state removed

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
            if (showEntriesDropdownRef.current && !showEntriesDropdownRef.current.contains(event.target as Node)) {
                setShowEntriesOpen(false);
            }
        };
        if (showEntriesOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEntriesOpen]);

    useEffect(() => {
        if (showEntriesOpen && showEntriesDropdownContentRef.current) {
            showEntriesDropdownContentRef.current.scrollTop = 0;
        }
    }, [showEntriesOpen]);

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

    useEffect(() => {
        // Pagination reset removed
    }, [selectedShowEntries]);

    const filteredList = leaves;
    const selectedRange = showEntriesOptions.find((o) => o.value === selectedShowEntries) ?? showEntriesOptions[0];
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
      alert("Leave From date cannot be in the past.");
      return;
    }
    if (leaveTo < leaveFrom) {
      alert("Leave To date must be after or on Leave From date.");
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
        alert(data.message || "Failed to apply leave.");
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

      setLeaveType("");
      setLeaveTypeId(null);
      setLeaveFrom("");
      setLeaveTo("");
      setReason("");
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
      alert("Leave From date cannot be in the past.");
      return;
    }
    if (leaveTo < leaveFrom) {
      alert("Leave To date must be after or on Leave From date.");
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
        alert(data.message || "Failed to update leave.");
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

      handleCloseEditModal();
    } catch (err: any) {
      console.error("Update leave failed", err);
      alert(
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
      setDeleteLeave(null);
    } catch (err) {
      console.error("Failed to delete leave (BIM Modeler):", err);
      alert("Delete failed. Please try again.");
    }
  };

    return (
        <div className="p-1 space-y-6 flex flex-col h-full bg-white">
            {/* Header: Title + Show entries + Apply button */}
            <div className="flex items-center justify-between flex-shrink-0 px-2 pb-4 gap-4 flex-wrap">
                <h2 className="text-[24px] font-semibold text-[#000000]">Manage Leaves</h2>
                <div className="flex items-center gap-3">
                    <div className="relative" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowEntriesOpen((o) => !o);
                            }}
                            className="flex items-center justify-between gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer border-0 w-[120px]"
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                {selectedShowEntries === 'show' ? (
                                    <span className="text-[14px] font-medium text-[#616161] font-gantari">Show</span>
                                ) : (
                                    <>
                                        <span className="text-[14px] font-medium text-[#353535] font-gantari whitespace-nowrap">Show:</span>
                                        <span className="text-[14px] font-medium text-[#353535] font-gantari">{selectedRange.label}</span>
                                    </>
                                )}
                            </div>
                            <img
                                src={ArrowDown}
                                alt=""
                                className={`w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${showEntriesOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {showEntriesOpen && (
                            <div
                                ref={showEntriesDropdownContentRef}
                                className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-full py-1 max-h-[160px] overflow-y-auto custom-scrollbar"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {showEntriesOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedShowEntries(opt.value);
                                            setShowEntriesOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium font-gantari transition-colors cursor-pointer ${selectedShowEntries === opt.value ? 'text-[#8B8B8B]' : 'text-[#8B8B8B]'} hover:bg-[#F2F2F2] hover:text-[#353535]`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setApplyModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold transition-all shadow-sm cursor-pointer"
                    >
                        Apply Leave
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-auto flex-1" >
                    <table className="min-w-full border-collapse">
                        <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                            <tr className="bg-[#FFFFFFF] text-[#353535]">
                                <th className="px-4 py-4 text-center text-[16px] font-semibold rounded-tl-2xl font-gantari">Sl.No</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold font-gantari">Employee Name</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold font-gantari">Role</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold font-gantari">Leave Type</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold font-gantari">Applied On</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold font-gantari">Status</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold rounded-tr-2xl font-gantari">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayedList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-[14px] text-gray-400 font-medium">
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
                                            className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}
                                        >
                                            <td className="px-4 py-6 text-center text-[14px] text-[#353535] font-gantari">{slNoDisplay}</td>
                                            <td className="px-4 py-6 text-center text-[14px] text-[#353535] font-gantari">{row.employeeName}</td>
                                            <td className="px-4 py-6 text-center text-[14px] text-[#353535] font-gantari">{row.role ?? '-'}</td>
                                            <td className="px-4 py-6 text-center text-[14px] text-[#353535] font-gantari">{row.leaveType}</td>
                                            <td className="px-4 py-6 text-center text-[14px] text-[#353535] font-gantari">{row.appliedOn}</td>
                                            <td className="px-4 py-6 text-center text-[14px] font-medium font-gantari">
<span className={`px-2 py-0.5 rounded text-[14px] ${row.currentStatus === 'Approved' ? 'bg-[#E1F6EB] text-[#008F22]' : row.currentStatus === 'Rejected' ? 'bg-[#FFD9D9] text-[#E00100]' : 'bg-[#FFEAD6] text-[#EB7200]'}`}>
                                                {row.currentStatus}
                                            </span>
                                            </td>
                                            <td className="px-4 py-6 text-center text-[14px] font-gantari">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleView(row)}
                                                        className="inline-flex items-center gap-2 px-3 py-2 bg-[#DD4342] text-white rounded-md text-[14px] font-medium shadow-sm transition-opacity cursor-pointer"
                                                    >
                                                        <img src={viewIcon} alt="" className="w-[16px] h-[16px] shrink-0 [filter:brightness(0)_invert(1)]" />
                                                        View
                                                    </button>
                                                    {isPending && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(row)}
                                                                className="inline-flex items-center justify-center py-2 px-2 rounded-md bg-[#E8E8E8] text-[#353535] transition-colors cursor-pointer"
                                                                aria-label="Edit"
                                                                title="Edit"
                                                            >
                                                                <img
                                                                    src={editIcon}
                                                                    alt=""
                                                                    className="w-5 h-5 object-contain [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)]"
                                                                />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(row)}
                                                                className="inline-flex items-center justify-center p-2 rounded-md bg-[#E8E8E8] text-[#353535] transition-colors cursor-pointer"
                                                                aria-label="Delete"
                                                                title="Delete"
                                                            >
                                                                <img
                                                                    src={deleteIcon}
                                                                    alt=""
                                                                    className="w-5 h-5 object-contain [filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
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
            {/* Pagination bar removed */}

            {/* Apply Leave Modal - rendered via portal so it appears above layout */}
            {applyModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={handleCloseModal}>
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header - close left, title centered */}
                        <div className="relative flex items-center justify-center px-6 py-4 flex-shrink-0">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded bg-[#F2F2F2] transition-colors text-[#353535] cursor-pointer"
                                aria-label="Close"
                            >
                                <img src={closeIcon} alt="" className="w-5 h-5 object-contain" />
                            </button>
                            <h3 className="text-[24px] font-medium text-[#353535] text-center">Apply Leave</h3>
                        </div>

                        {/* Modal body */}
                        <form onSubmit={handleSubmitApply} className="flex flex-col flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Employee Name with Role (auto, disabled) */}
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">
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
                                    className="w-full px-4 py-2.5 bg-[#E5E5E5] rounded-md text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Leave Type - custom dropdown (second image style) */}
                            <div ref={leaveTypeDropdownRef} className="relative">
                                <label className="block text-base font-medium text-gray-700 mb-1">
                                    Leave Type <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setLeaveTypeOpen((o) => !o)}
                                    className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-md border text-left flex items-center justify-between focus:outline-none focus:ring-0 min-h-[42px] text-sm text-[#353535] transition-colors cursor-pointer ${leaveTypeOpen ? 'border-[#D2D2D2]' : 'border-gray-200'} focus:border-[#D2D2D2]`}
                                >
                                    <span className={`text-sm ${leaveType ? 'text-[#353535] font-medium' : 'text-[#8B8B8B]'}`}>
                                        {leaveType || 'Nothing selected'}
                                    </span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        style={{ transform: leaveTypeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </button>
                                {leaveTypeOpen && (
                                    <div
                                        className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-md shadow-md py-1"
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
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors cursor-pointer ${!leaveType ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'}`}
                                        >
                                            Nothing selected
                                        </button>
                                        {LEAVE_TYPES.map((t) => {
                                            const isSelected = leaveType === t;
                                            return (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaveType(t);
                                                        setLeaveTypeId(null);
                                                        setLeaveTypeOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors cursor-pointer ${
                                                        isSelected ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'
                                                    }`}
                                                >
                                                    {t}
                                                </button>
                                            );
                                        })}
                                        {leaveTypes
                                            .filter((x) => x.title && !LEAVE_TYPES.includes(x.title))
                                            .map((type) => {
                                                const isSelected = leaveType === type.title;
                                                return (
                                                    <button
                                                        key={type.id ?? type.title}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setLeaveType(type.title);
                                                            setLeaveTypeId(type.id);
                                                            setLeaveTypeOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors cursor-pointer ${
                                                            isSelected
                                                                ? 'text-black bg-[#F0F2F7]'
                                                                : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'
                                                        }`}
                                                    >
                                                        {type.title}
                                                    </button>
                                                );
                                            })}
                                        {/* "Others" option (not necessarily present in holiday table) */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLeaveType(othersValue);
                                                // Use 0 as a safe "unknown" leave_type id; backend will not join holiday -> title becomes "Others".
                                                setLeaveTypeId(0);
                                                setLeaveTypeOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors cursor-pointer ${
                                                leaveTypeId === 0 ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'
                                            }`}
                                        >
                                            {othersValue}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Leave From */}
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">
                                    Leave From <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        required
                                        min={todayStr}
                                        value={leaveFrom}
                                        onChange={(e) => setLeaveFrom(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#F2F3F4] border border-gray-200 rounded-md text-sm text-[#353535] placeholder-[#8B8B8B] placeholder:text-sm focus:outline-none focus:ring-0 focus:border-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer appearance-none"
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                    </svg>
                                </div>
                            </div>

                            {/* Leave To */}
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">
                                    Leave To <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        required
                                        min={leaveFrom || todayStr}
                                        value={leaveTo}
                                        onChange={(e) => setLeaveTo(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#F2F3F4] border border-gray-200 rounded-md text-sm text-[#353535] placeholder-[#8B8B8B] placeholder:text-sm focus:outline-none focus:ring-0 focus:border-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer appearance-none"
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                    </svg>
                                </div>
                            </div>

                            {/* Describe Your Reason */}
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">
                                    Describe Your Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={5}
                                    placeholder="Enter your reason for leave..."
                                    className="w-full px-4 py-2.5 bg-[#F2F3F4] border border-gray-200 rounded-md text-sm text-[#353535] placeholder-[#8B8B8B] placeholder:text-sm focus:outline-none focus:ring-0 focus:border-[#D2D2D2] transition-colors resize-y min-h-[120px]"
                                />
                            </div>

                            {/* Submit */}
                            <div className="pt-4 flex justify-center">
                                <button
                                    type="submit"
                                    className="px-8 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-medium transition-all shadow-sm cursor-pointer"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Leave Modal */}
            {editModalOpen && editingLeave && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={handleCloseEditModal}>
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative flex items-center justify-center px-6 py-4 flex-shrink-0">
                            <button
                                type="button"
                                onClick={handleCloseEditModal}
                                className="absolute left-6 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors text-[#353535] cursor-pointer"
                                aria-label="Close"
                            >
                                <img src={closeIcon} alt="" className="w-5 h-5 object-contain" />
                            </button>
                            <h3 className="text-[24px] font-bold text-[#353535] text-center">Edit Leave</h3>
                        </div>

                        <form onSubmit={handleSubmitEdit} className="flex flex-col flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Employee Name + Email (auto, disabled) */}
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">
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
                                    className="w-full px-4 py-2.5 bg-[#E5E5E5] rounded-md text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Leave Type */}
                            <div ref={leaveTypeDropdownRef} className="relative">
                                <label className="block text-base font-medium text-gray-700 mb-1">
                                    Leave Type <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setLeaveTypeOpen((o) => !o)}
                                    className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-md border text-left flex items-center justify-between focus:outline-none focus:ring-0 min-h-[42px] text-sm text-[#353535] transition-colors ${leaveTypeOpen ? 'border-[#D2D2D2]' : 'border-gray-200'} focus:border-[#D2D2D2]`}
                                >
                                    <span className={`text-sm ${leaveType ? 'text-[#353535] font-medium' : 'text-[#8B8B8B]'}`}>
                                        {leaveType || 'Nothing selected'}
                                    </span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        style={{ transform: leaveTypeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </button>
                                {leaveTypeOpen && (
                                    <div
                                        className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-md shadow-md py-1"
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
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors ${!leaveType ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'}`}
                                        >
                                            Nothing selected
                                        </button>
                                        {LEAVE_TYPES.map((t) => {
                                            const isSelected = leaveType === t;
                                            return (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaveType(t);
                                                        setLeaveTypeId(null);
                                                        setLeaveTypeOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors ${
                                                        isSelected ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'
                                                    }`}
                                                >
                                                    {t}
                                                </button>
                                            );
                                        })}
                                        {leaveTypes
                                            .filter((x) => x.title && !LEAVE_TYPES.includes(x.title))
                                            .map((type) => {
                                                const isSelected = leaveType === type.title;
                                                return (
                                                    <button
                                                        key={type.id ?? type.title}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setLeaveType(type.title);
                                                            setLeaveTypeId(type.id);
                                                            setLeaveTypeOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors ${
                                                            isSelected
                                                                ? 'text-black bg-[#F0F2F7]'
                                                                : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'
                                                        }`}
                                                    >
                                                        {type.title}
                                                    </button>
                                                );
                                            })}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLeaveType(othersValue);
                                                setLeaveTypeId(0);
                                                setLeaveTypeOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors ${
                                                leaveTypeId === 0 ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'
                                            }`}
                                        >
                                            {othersValue}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Leave From */}
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">
                                    Leave From <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        required
                                        min={todayStr}
                                        value={leaveFrom}
                                        onChange={(e) => setLeaveFrom(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#F2F3F4] border border-gray-200 rounded-md text-sm text-[#353535] placeholder-[#8B8B8B] placeholder:text-sm focus:outline-none focus:ring-0 focus:border-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer appearance-none"
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                    </svg>
                                </div>
                            </div>

                            {/* Leave To */}
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">
                                    Leave To <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        required
                                        min={leaveFrom || todayStr}
                                        value={leaveTo}
                                        onChange={(e) => setLeaveTo(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#F2F3F4] border border-gray-200 rounded-md text-sm text-[#353535] placeholder-[#8B8B8B] placeholder:text-sm focus:outline-none focus:ring-0 focus:border-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer appearance-none"
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                    </svg>
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">
                                    Describe Your Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={5}
                                    placeholder="Enter your reason for leave..."
                                    className="w-full px-4 py-2.5 bg-[#F2F3F4] border border-gray-200 rounded-md text-sm text-[#353535] placeholder-[#8B8B8B] placeholder:text-sm focus:outline-none focus:ring-0 focus:border-[#D2D2D2] transition-colors resize-y min-h-[120px]"
                                />
                            </div>

                            <div className="pt-4 flex justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseEditModal}
                                    className="px-6 py-2.5 rounded-md bg-[#F2F2F2] text-[#353535] text-sm font-medium hover:bg-[#E0E0E0] transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-[#DD4342] text-white rounded-md font-gantari font-medium transition-all shadow-sm cursor-pointer"
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
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
                    onClick={() => { setViewModalOpen(false); setSelectedLeave(null); }}
                >
                    <div
                        className="bg-white rounded-lg shadow-sm w-full max-w-md overflow-hidden border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative flex items-center justify-center px-6 pt-6 pb-2">
                            <button
                                type="button"
                                onClick={() => { setViewModalOpen(false); setSelectedLeave(null); }}
                                className="absolute left-4 top-6 p-1.5 rounded bg-[#F2F2F2] transition-colors text-black cursor-pointer"
                                aria-label="Close"
                            >
                                <img src={closeIcon} alt="" className="w-5 h-5 object-contain" />
                            </button>
                            <h3 className="text-[24px] font-medium text-black">Leave Details</h3>
                        </div>
                        <div className="px-6 pb-6 pt-6">
                            {/* Rows with fixed label width so colons align vertically (like second image) */}
                            <div className="space-y-5 text-[14px] font-gantari">
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
                                <div className="flex items-center gap-1">
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Reason</span>
                                    <span className="shrink-0 text-black">:</span>
                                    <span className="text-[#8B8B8B]">{selectedLeave.description ?? '-'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Current Status</span>
                                    <span className="shrink-0 text-black">:</span>
                                    <span className={`inline-block font-medium px-2 py-0.5 rounded text-[14px] ${selectedLeave.currentStatus === 'Approved' ? 'bg-[#E1F6EB] text-[#008F22]' : selectedLeave.currentStatus === 'Rejected' ? 'bg-[#FFD9D9] text-[#E00100]' : 'bg-[#FFEAD6] text-[#EB7200]'}`}>
                                        {selectedLeave.currentStatus}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
