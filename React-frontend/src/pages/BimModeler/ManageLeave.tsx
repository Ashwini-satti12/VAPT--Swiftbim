import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import viewIcon from '../../assets/BIMModeler/ManageLeave/view icon.svg';

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
    { value: '0-100', label: '0-100', start: 0, end: 100 },
    { value: '101-200', label: '101-200', start: 100, end: 200 },
    { value: '201-300', label: '201-300', start: 200, end: 300 },
    { value: '301-400', label: '301-400', start: 300, end: 400 },
    { value: 'all', label: 'All', start: 0, end: null },
];

const PER_PAGE = 10;
const PAGINATION_VISIBLE = 4;

// Convert DD/MM/YYYY to YYYY-MM-DD for date input.
function toInputDate(d: string | undefined): string {
    if (!d) return '';
    const parts = d.split('/');
    if (parts.length !== 3) return '';
    const [dd, mm, yy] = parts;
    return `${yy}-${mm}-${dd}`;
}

// Format ISO or YYYY-MM-DD date to DD/MM/YYYY for display.
function formatApiDate(value: string | undefined | null): string {
    if (!value) return '';
    const s = String(value);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    try {
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return s;
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return s;
    }
}

export default function ManageLeave() {
    const { user } = useAuth();

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

    const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
    const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
    const leaveTypeDropdownRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationWindowStart, setPaginationWindowStart] = useState(1);

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
                    leaveType: app.title || othersValue,
                    leaveTypeId: typeof app.leave_type === 'number' ? app.leave_type : null,
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
        setCurrentPage(1);
        setPaginationWindowStart(1);
    }, [selectedShowEntries]);

    const filteredList = leaves;
    const selectedRange = showEntriesOptions.find((o) => o.value === selectedShowEntries) ?? showEntriesOptions[0];
    const rangeStart = selectedRange.start;
    const rangeEnd = selectedRange.end === null ? filteredList.length : Math.min(selectedRange.end, filteredList.length);
    const listInRange = filteredList.slice(rangeStart, rangeEnd);
    const totalInRange = listInRange.length;
    const totalPages = Math.max(1, Math.ceil(totalInRange / PER_PAGE));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const displayedList = listInRange.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

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
    const visiblePageRanges = pageRanges.slice(effectiveWindowStart - 1, effectiveWindowStart - 1 + PAGINATION_VISIBLE);
    const canPrevWindow = paginationWindowStart > 1;
    const canNextWindow = paginationWindowStart <= totalPages - PAGINATION_VISIBLE;
    const goPrevWindow = () => setPaginationWindowStart((s) => Math.max(1, s - PAGINATION_VISIBLE));
    const goNextWindow = () => setPaginationWindowStart((s) => Math.min(s + PAGINATION_VISIBLE, maxWindowStart));

    const handleView = (row: LeaveEntry) => {
        setSelectedLeave(row);
        setViewModalOpen(true);
    };

    const handleSubmitApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leaveTypeId || !leaveFrom || !leaveTo || !reason.trim()) return;

        try {
            const payload: any = {
                leavetype: leaveTypeId ?? 0,
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

            const { data } = await api.post<{ success: boolean; id?: number; message?: string }>(
                '/api/leave/applications',
                payload
            );
            if (data.success === false) {
                alert(data.message || 'Failed to apply leave.');
                return;
            }

            // Reload only this user's leaves
            try {
                const resp = await api.get<{ applications?: any[] }>('/api/leave/applications');
                const apps = (resp.data.applications || []).filter(
                    (app) => app.employee_id === user?.id
                );
                const mapped: LeaveEntry[] = apps.map((app, index) => ({
                    id: app.lid,
                    slNo: index + 1,
                    employeeId: app.employee_id,
                    employeeName: app.full_name || (user?.full_name || 'Unknown'),
                    role: app.role || user?.user_role || undefined,
                    email: app.email || user?.email || undefined,
                    leaveType: app.title || othersValue,
                    leaveTypeId: typeof app.leave_type === 'number' ? app.leave_type : null,
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
                console.error('Failed to refresh leaves after apply', err);
            }

            setLeaveType('');
            setLeaveFrom('');
            setLeaveTo('');
            setReason('');
            setApplyModalOpen(false);
        } catch (err: any) {
            console.error('Apply leave failed', err);
            alert(err?.response?.data?.message || 'Failed to apply leave. Please try again.');
        }
    };

    const handleCloseModal = () => {
        setApplyModalOpen(false);
        setLeaveType('');
        setLeaveFrom('');
        setLeaveTo('');
        setReason('');
    };

    const handleEdit = (row: LeaveEntry) => {
        setEditingLeave(row);
        setLeaveType(row.leaveType);
        setLeaveTypeId(row.leaveTypeId ?? null);
        setLeaveFrom(toInputDate(row.fromDate));
        setLeaveTo(toInputDate(row.toDate));
        setReason(row.description || '');
        setEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setEditingLeave(null);
        setLeaveType('');
        setLeaveTypeId(null);
        setLeaveFrom('');
        setLeaveTo('');
        setReason('');
    };

    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLeave || !leaveTypeId || !leaveFrom || !leaveTo || !reason.trim()) return;

        try {
            const payload: any = {
                leavetype: leaveTypeId ?? 0,
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
                payload
            );

            if (data.success === false) {
                alert(data.message || 'Failed to update leave.');
                return;
            }

            try {
                const resp = await api.get<{ applications?: any[] }>('/api/leave/applications');
                const apps = (resp.data.applications || []).filter(
                    (app) => app.employee_id === user?.id
                );
                const mapped: LeaveEntry[] = apps.map((app, index) => ({
                    id: app.lid,
                    slNo: index + 1,
                    employeeId: app.employee_id,
                    employeeName: app.full_name || (user?.full_name || 'Unknown'),
                    role: app.role || user?.user_role || undefined,
                    email: app.email || user?.email || undefined,
                    leaveType: app.title || 'Others',
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
                console.error('Failed to refresh leaves after edit', err);
            }

            handleCloseEditModal();
        } catch (err: any) {
            console.error('Update leave failed', err);
            alert(err?.response?.data?.message || 'Failed to update leave. Please try again.');
        }
    };

    const handleDelete = (row: LeaveEntry) => {
        if (!window.confirm(`Delete leave (${row.leaveType}, ${row.fromDate} - ${row.toDate})?`)) return;
        // No delete endpoint yet; perform local delete so user no longer sees it
        setLeaves((prev) => prev.filter((l) => l.id !== row.id));
    };

    return (
        <div className="p-1 md:p-6 space-y-6 flex flex-col h-full bg-white">
            {/* Header: Title + Show entries + Apply button */}
            <div className="flex items-center justify-between flex-shrink-0 px-2 pb-4 gap-4 flex-wrap">
                <h2 className="text-2xl font-bold text-gray-900">Manage Leaves</h2>
                <div className="flex items-center gap-3">
                    <div className="relative" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowEntriesOpen((o) => !o);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md hover:bg-[#DDDDDD] transition-all cursor-pointer border-0"
                        >
                            <span className="text-sm font-medium text-[#353535] font-gantari">Show:</span>
                            <span className="text-sm font-medium text-[#353535] font-gantari">{selectedRange.label}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#353535" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: showEntriesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {showEntriesOpen && (
                            <div
                                className="absolute top-full left-0 mt-1 z-50 bg-white rounded-md shadow-md min-w-[120px] py-1"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {showEntriesOptions.map((opt) => {
                                    const isSelected = selectedShowEntries === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedShowEntries(opt.value);
                                                setShowEntriesOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm font-medium font-gantari transition-colors ${isSelected ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setApplyModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold transition-all shadow-sm"
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
                                <th className="px-4 py-4 text-center text-base font-bold rounded-tl-2xl">Sl.No</th>
                                <th className="px-4 py-4 text-center text-base font-bold">Employee Name</th>
                                <th className="px-4 py-4 text-center text-base font-bold">Role</th>
                                <th className="px-4 py-4 text-center text-base font-bold">Leave Type</th>
                                <th className="px-4 py-4 text-center text-base font-bold">Applied On</th>
                                <th className="px-4 py-4 text-center text-base font-bold">Status</th>
                                <th className="px-4 py-4 text-center text-base font-bold rounded-tr-2xl">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayedList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">
                                        No leave records found
                                    </td>
                                </tr>
                            ) : (
                                displayedList.map((row, index) => {
                                const baseIndex = rangeStart + (safePage - 1) * PER_PAGE + index;
                                const slNo = baseIndex + 1;
                                const isPending = row.currentStatus === 'Pending';
                                    return (
                                        <tr
                                            key={row.id}
                                            className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}
                                        >
                                            <td className="px-4 py-3 text-center text-sm text-gray-600 font-medium">{slNo}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-800 font-semibold">{row.employeeName}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-600">{row.role ?? '-'}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-600">{row.leaveType}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-600">{row.appliedOn}</td>
                                            <td className="px-4 py-3 text-center text-sm font-medium">
<span className={`px-2 py-0.5 rounded ${row.currentStatus === 'Approved' ? 'bg-[#E1F6EB] text-[#008F22]' : row.currentStatus === 'Rejected' ? 'bg-[#FFD9D9] text-[#E00100]' : 'bg-amber-100 text-amber-700'}`}>
                                                {row.currentStatus}
                                            </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleView(row)}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#DD4342] text-white rounded-md font-medium shadow-sm transition-opacity"
                                                    >
                                                        <img src={viewIcon} alt="" className="w-[16px] h-[16px] shrink-0 [filter:brightness(0)_invert(1)]" />
                                                        View
                                                    </button>
                                                    {isPending && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(row)}
                                                                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-[#E8E8E8] text-[#353535] hover:bg-[#D2D2D2] transition-colors"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(row)}
                                                                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-[#C62828] text-white hover:bg-[#B71C1C] transition-colors"
                                                            >
                                                                Delete
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

            {/* Pagination bar - same design as TrackerTD */}
            {totalInRange > 0 && (
                <div className="flex flex-wrap items-center justify-end mt-4 -mb-8 pt-0 pb-2 flex-shrink-0">
                    <div className="flex items-center gap-2 flex-wrap bg-[#EEEEEE] rounded-xl px-4 py-1">
                        <span className="text-[#666666] text-sm font-medium font-gantari">Showing:</span>
                        <button
                            type="button"
                            onClick={goPrevWindow}
                            disabled={!canPrevWindow}
                            className="flex items-center gap-1 text-[#666666] text-sm font-medium font-gantari hover:text-[#353535] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                            Prev
                        </button>
                        {visiblePageRanges.map((pr) => {
                            const pageNum = Math.floor((pr.start - rangeStart) / PER_PAGE) + 1;
                            const isActive = pageNum === activePage;
                            return (
                                <button
                                    key={pr.label}
                                    type="button"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium font-gantari transition-colors ${isActive ? 'bg-[#DD4342] text-white' : 'text-[#666666] hover:text-[#353535] hover:bg-gray-200'}`}
                                >
                                    {pr.label}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={goNextWindow}
                            disabled={!canNextWindow}
                            className="flex items-center gap-1 text-[#666666] text-sm font-medium font-gantari hover:text-[#353535] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Apply Leave Modal - rendered via portal so it appears above layout */}
            {applyModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={handleCloseModal}>
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header - title centered */}
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4 flex-shrink-0">
                            <div />
                            <h3 className="text-lg font-bold text-[#353535] text-center">Apply Leave</h3>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="p-1 rounded hover:bg-gray-100 transition-colors text-[#353535]"
                                    aria-label="Close"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
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
                                        {leaveTypes.map((type) => {
                                            const isSelected = leaveTypeId === type.id;
                                            return (
                                                <button
                                                    key={type.id ?? 'others'}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaveType(type.title);
                                                        setLeaveTypeId(type.id);
                                                        setLeaveTypeOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors ${isSelected ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'}`}
                                                >
                                                    {type.title}
                                                </button>
                                            );
                                        })}
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
                                    className="px-8 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-medium transition-all shadow-sm"
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
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4 flex-shrink-0">
                            <div />
                            <h3 className="text-lg font-bold text-[#353535] text-center">Edit Leave</h3>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleCloseEditModal}
                                    className="p-1 rounded hover:bg-gray-100 transition-colors text-[#353535]"
                                    aria-label="Close"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitEdit} className="flex flex-col flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Employee Name + Email (auto, disabled) */}
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">
                                    Employee Name &amp; Email
                                </label>
                                <input
                                    type="text"
                                    value={
                                        editingLeave
                                            ? `${editingLeave.employeeName}${
                                                  editingLeave.email ? ` - ${editingLeave.email}` : ''
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
                                        {leaveTypes.map((type) => {
                                            const isSelected = leaveTypeId === type.id;
                                            return (
                                                <button
                                                    key={type.id ?? 'others'}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaveType(type.title);
                                                        setLeaveTypeId(type.id);
                                                        setLeaveTypeOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors ${isSelected ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'}`}
                                                >
                                                    {type.title}
                                                </button>
                                            );
                                        })}
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
                                    className="px-6 py-2.5 rounded-md bg-[#F2F2F2] text-[#353535] text-sm font-medium hover:bg-[#E0E0E0] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-[#DD4342] text-white rounded-md font-gantari font-medium transition-all shadow-sm"
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
                                className="absolute left-4 top-6 p-1.5 rounded bg-[#E0E0E0] hover:bg-gray-300 transition-colors text-black"
                                aria-label="Close"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                            <h3 className="text-lg font-bold text-black">Leave Details</h3>
                        </div>
                        <div className="px-6 pb-6 pt-4">
                            {/* Rows with fixed label width so colons align vertically (like second image) */}
                            <div className="space-y-3 text-sm">
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
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Current Status</span>
                                    <span className="shrink-0 text-black">:</span>
                                    <span className={`inline-block font-medium px-2 py-0.5 rounded ${selectedLeave.currentStatus === 'Approved' ? 'bg-[#E1F6EB] text-[#008F22]' : selectedLeave.currentStatus === 'Rejected' ? 'bg-[#FFD9D9] text-[#E00100]' : 'bg-amber-100 text-amber-700'}`}>
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
