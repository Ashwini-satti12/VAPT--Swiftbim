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
    leaveType: string;
    appliedOn: string;
    appliedTo?: string;
    currentStatus: string;
    fromDate?: string;
    toDate?: string;
    description?: string;
}

const DUMMY_LEAVES: LeaveEntry[] = [
    { id: 1, slNo: 1, employeeName: 'John Doe', role: 'BIM Modeler', leaveType: 'Sick Leave', appliedOn: '01/03/2026', appliedTo: 'BIM Lead', currentStatus: 'Approved', fromDate: '02/03/2026', toDate: '03/03/2026', description: 'Medical appointment' },
    { id: 2, slNo: 2, employeeName: 'Jane Smith', role: 'BIM Modeler', leaveType: 'Casual Leave', appliedOn: '28/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Pending', fromDate: '05/03/2026', toDate: '06/03/2026', description: 'Family event' },
    { id: 3, slNo: 3, employeeName: 'Mike Johnson', role: 'BIM Lead', leaveType: 'Earned Leave', appliedOn: '25/02/2026', appliedTo: 'Project Manager', currentStatus: 'Approved', fromDate: '10/03/2026', toDate: '12/03/2026', description: 'Personal' },
    { id: 4, slNo: 4, employeeName: 'Sarah Williams', role: 'BIM Modeler', leaveType: 'Sick Leave', appliedOn: '20/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Rejected', fromDate: '21/02/2026', toDate: '22/02/2026', description: 'Fever' },
    { id: 5, slNo: 5, employeeName: 'David Brown', role: 'BIM Modeler', leaveType: 'Casual Leave', appliedOn: '15/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Approved', fromDate: '18/02/2026', toDate: '19/02/2026', description: 'Travel' },
    { id: 6, slNo: 6, employeeName: 'Emma Wilson', role: 'BIM Modeler', leaveType: 'Sick Leave', appliedOn: '12/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Approved', fromDate: '13/02/2026', toDate: '14/02/2026', description: 'Recovery' },
    { id: 7, slNo: 7, employeeName: 'James Davis', role: 'BIM Modeler', leaveType: 'Earned Leave', appliedOn: '10/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Pending', fromDate: '20/03/2026', toDate: '22/03/2026', description: 'Vacation' },
    { id: 8, slNo: 8, employeeName: 'Olivia Martinez', role: 'BIM Modeler', leaveType: 'Casual Leave', appliedOn: '08/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Approved', fromDate: '09/02/2026', toDate: '10/02/2026', description: 'Personal work' },
    { id: 9, slNo: 9, employeeName: 'William Taylor', role: 'BIM Modeler', leaveType: 'Sick Leave', appliedOn: '05/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Rejected', fromDate: '06/02/2026', toDate: '07/02/2026', description: 'Doctor visit' },
    { id: 10, slNo: 10, employeeName: 'Sophia Anderson', role: 'BIM Modeler', leaveType: 'Maternity Leave', appliedOn: '01/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Approved', fromDate: '15/02/2026', toDate: '15/05/2026', description: 'Maternity' },
];

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave'];

const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
    { value: '0-100', label: '0-100', start: 0, end: 100 },
    { value: '101-200', label: '101-200', start: 100, end: 200 },
    { value: '201-300', label: '201-300', start: 200, end: 300 },
    { value: '301-400', label: '301-400', start: 300, end: 400 },
    { value: 'all', label: 'All', start: 0, end: null },
];

const PER_PAGE = 10;
const PAGINATION_VISIBLE = 4;

/** Allow only letters, numbers, symbols; collapse multiple spaces to one (for Employee Name and Reason). */
function normalizeNameAndReason(value: string): string {
    const allowed = value.replace(/[^\w\s.,\-'()\/&@!#?;:'"]/g, '');
    return allowed.replace(/\s+/g, ' ');
}

/** Convert DD/MM/YYYY to YYYY-MM-DD for date input. */
function toInputDate(d: string | undefined): string {
    if (!d) return '';
    const parts = d.split('/');
    if (parts.length !== 3) return '';
    const [dd, mm, yy] = parts;
    return `${yy}-${mm}-${dd}`;
}
/** Convert YYYY-MM-DD to DD/MM/YYYY for storage. */
function toStoredDate(d: string): string {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
}

/** Format ISO date (or plain YYYY-MM-DD) to DD/MM/YYYY for table display. */
function formatApiDate(value: string | undefined | null): string {
    if (!value) return '';
    const s = String(value);
    // Already DD/MM/YYYY
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
    const [employeeName, setEmployeeName] = useState('');
    const [leaveType, setLeaveType] = useState('');
    const [leaveFrom, setLeaveFrom] = useState('');
    const [leaveTo, setLeaveTo] = useState('');
    const [reason, setReason] = useState('');
    const [applyFormErrors, setApplyFormErrors] = useState<Record<string, string>>({});
    const [leaves, setLeaves] = useState<LeaveEntry[]>(DUMMY_LEAVES);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingLeave, setEditingLeave] = useState<LeaveEntry | null>(null);
    const [leaveTypeOpenEdit, setLeaveTypeOpenEdit] = useState(false);
    const leaveTypeDropdownEditRef = useRef<HTMLDivElement>(null);

    const [selectedEmployee, setSelectedEmployee] = useState<string>('All');
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const employeeDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
    const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
    const leaveTypeDropdownRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationWindowStart, setPaginationWindowStart] = useState(1);

    const employeeOptions = ['All', ...Array.from(new Set(leaves.map((l) => l.employeeName)))];

    // Load leave applications from backend (tblleaves) for this company
    useEffect(() => {
        const fetchLeaves = async () => {
            try {
                const { data } = await api.get<{ applications?: any[] }>('/api/leave/applications');
                const apps = data.applications || [];
                // BIM Lead should see:
                // - All BIM Modeler / BIM Coordinator leaves
                // - Plus their own applications (any role)
                const allowedRoles = new Set(['bim modeler', 'bim coordinator']);
                const filteredApps = apps.filter((app) => {
                    const role = String(app.role || '').toLowerCase();
                    const isAllowedRole = allowedRoles.has(role);
                    const isOwn = user && app.employee_id === user.id;
                    return isAllowedRole || isOwn;
                });
                const mapped: LeaveEntry[] = filteredApps.map((app, index) => ({
                    id: app.lid,
                    slNo: index + 1,
                    employeeName: app.full_name || 'Unknown',
                    role: app.role || undefined,
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
                if (mapped.length) {
                    setLeaves(mapped);
                }
            } catch (err) {
                console.error('Failed to load leaves from backend, using fallback data.', err);
                // keep existing dummy data as fallback
            }
        };

        fetchLeaves();
    }, [user?.id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
                setEmployeeDropdownOpen(false);
            }
        };
        if (employeeDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [employeeDropdownOpen]);

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
        const handleClickOutside = (event: MouseEvent) => {
            if (leaveTypeDropdownEditRef.current && !leaveTypeDropdownEditRef.current.contains(event.target as Node)) {
                setLeaveTypeOpenEdit(false);
            }
        };
        if (leaveTypeOpenEdit) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [leaveTypeOpenEdit]);

    useEffect(() => {
        setCurrentPage(1);
        setPaginationWindowStart(1);
    }, [selectedShowEntries, selectedEmployee]);

    const filteredList = selectedEmployee === 'All' ? leaves : leaves.filter((l) => l.employeeName === selectedEmployee);
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

    const validateApplyForm = (): boolean => {
        const err: Record<string, string> = {};
        const trimmedName = employeeName.trim();
        const trimmedReason = reason.trim();
        if (!trimmedName) err.employeeName = 'Employee name is required';
        if (!leaveType) err.leaveType = 'Leave type is required';
        if (!leaveFrom) err.leaveFrom = 'Leave from date is required';
        if (!leaveTo) err.leaveTo = 'Leave to date is required';
        if (!trimmedReason) err.reason = 'Reason is required';
        if (leaveFrom && leaveTo && leaveFrom > leaveTo) err.leaveTo = 'Leave to must be on or after leave from';
        setApplyFormErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleSubmitApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateApplyForm()) return;

        try {
            const payload: any = {
                leavetype: leaveType,
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

            const { data } = await api.post<{ success: boolean; id?: number; message?: string }>('/api/leave/applications', payload);
            if (data.success === false) {
                alert(data.message || 'Failed to apply leave.');
                return;
            }

            // Reload latest leaves from backend so list reflects the new application
            try {
                const resp = await api.get<{ applications?: any[] }>('/api/leave/applications');
                const apps = resp.data.applications || [];
                const allowedRoles = new Set(['bim modeler', 'bim coordinator']);
                const filteredApps = apps.filter((app) => {
                    const role = String(app.role || '').toLowerCase();
                    const isAllowedRole = allowedRoles.has(role);
                    const isOwn = user && app.employee_id === user.id;
                    return isAllowedRole || isOwn;
                });
                const mapped: LeaveEntry[] = filteredApps.map((app, index) => ({
                    id: app.lid,
                    slNo: index + 1,
                    employeeName: app.full_name || 'Unknown',
                    role: app.role || undefined,
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
                if (mapped.length) {
                    setLeaves(mapped);
                }
            } catch (err) {
                console.error('Failed to refresh leaves after apply.', err);
            }

            setLeaveType('');
            setLeaveFrom('');
            setLeaveTo('');
            setReason('');
            setApplyFormErrors({});
            setApplyModalOpen(false);
        } catch (err: any) {
            console.error('Apply leave failed', err);
            alert(err?.response?.data?.message || 'Failed to apply leave. Please try again.');
        }
    };

    const handleCloseModal = () => {
        setApplyModalOpen(false);
        setEmployeeName('');
        setLeaveType('');
        setLeaveFrom('');
        setLeaveTo('');
        setReason('');
        setApplyFormErrors({});
    };

    const handleEdit = (row: LeaveEntry) => {
        setEditingLeave(row);
        // Show employee name with role for display in the edit modal
        setEmployeeName(row.role ? `${row.employeeName} - ${row.role}` : row.employeeName);
        setLeaveType(row.leaveType);
        setLeaveFrom(toInputDate(row.fromDate));
        setLeaveTo(toInputDate(row.toDate));
        setReason(row.description ?? '');
        setApplyFormErrors({});
        setEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setEditingLeave(null);
        setEmployeeName('');
        setLeaveType('');
        setLeaveFrom('');
        setLeaveTo('');
        setReason('');
        setApplyFormErrors({});
    };

    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLeave || !validateApplyForm()) return;

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
                payload
            );

            if (data.success === false) {
                alert(data.message || 'Failed to update leave.');
                return;
            }

            // Refresh leaves from backend so table reflects latest values
            try {
                const resp = await api.get<{ applications?: any[] }>('/api/leave/applications');
                const apps = resp.data.applications || [];
                const allowedRoles = new Set(['bim modeler', 'bim coordinator']);
                const filteredApps = apps.filter((app) => {
                    const role = String(app.role || '').toLowerCase();
                    const isAllowedRole = allowedRoles.has(role);
                    const isOwn = user && app.employee_id === user.id;
                    return isAllowedRole || isOwn;
                });
                const mapped: LeaveEntry[] = filteredApps.map((app, index) => ({
                    id: app.lid,
                    slNo: index + 1,
                    employeeName: app.full_name || 'Unknown',
                    role: app.role || undefined,
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
                if (mapped.length) {
                    setLeaves(mapped);
                }
            } catch (err) {
                console.error('Failed to refresh leaves after edit.', err);
            }

            handleCloseEditModal();
        } catch (err: any) {
            console.error('Update leave failed', err);
            alert(err?.response?.data?.message || 'Failed to update leave. Please try again.');
        }
    };

    const handleDelete = (row: LeaveEntry) => {
        if (!window.confirm(`Delete leave for ${row.employeeName} (${row.leaveType}, ${row.fromDate} - ${row.toDate})?`)) return;
        // Currently only local delete; no backend endpoint to delete leaves safely.
        setLeaves((prev) => prev.filter((l) => l.id !== row.id));
    };

    const updateLeaveStatus = (id: number, statusLabel: 'Approved' | 'Rejected') => {
        setLeaves(prev =>
            prev.map(l => (l.id === id ? { ...l, currentStatus: statusLabel } : l))
        );
    };

    const handleApproveBackend = async (row: LeaveEntry) => {
        try {
            await api.post(`/api/leave/applications/${row.id}/approve`);
            updateLeaveStatus(row.id, 'Approved');
        } catch (err) {
            console.error('Failed to approve leave', err);
            alert('Failed to approve leave. Please try again.');
        }
    };

    const handleRejectBackend = async (row: LeaveEntry) => {
        try {
            await api.post(`/api/leave/applications/${row.id}/reject`);
            updateLeaveStatus(row.id, 'Rejected');
        } catch (err) {
            console.error('Failed to reject leave', err);
            alert('Failed to reject leave. Please try again.');
        }
    };

    // Only allow BIM Lead to approve/reject leaves for BIM Modeler / BIM Coordinator,
    // and never for their own applications.
    const canActOnLeave = (row: LeaveEntry): boolean => {
        const currentName = (user?.full_name || '').trim();
        const role = (row.role || '').toLowerCase();
        if (!currentName) return false;

        // Do not act on own leave applications
        if (row.employeeName.trim() === currentName) return false;

        return role === 'bim modeler' || role === 'bim coordinator';
    };

    // Only the person who applied the leave can edit/delete their own application,
    // and only while it is still Pending.
    const canEditLeave = (row: LeaveEntry): boolean => {
        const currentName = (user?.full_name || '').trim();
        if (!currentName) return false;
        return row.employeeName.trim() === currentName && row.currentStatus === 'Pending';
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 flex flex-col h-full  font-gantari">
            {/* Page header: heading left; Employee + Show entries + Apply Leave right */}
            <div className="flex-shrink-0 mb-6 flex flex-row items-center justify-between gap-4 flex-wrap">
                <h1 className="text-2xl md:text-[28px] font-bold text-[#353535] tracking-tight">Manage Leaves</h1>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative" ref={employeeDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeDropdownOpen((o) => !o);
                            }}
                            className={`flex items-center gap-2 px-4 py-2.5 bg-[#E8E8E8] rounded-lg border border-[#E5E5E5] transition-all cursor-pointer font-medium text-sm min-w-[140px] justify-between ${employeeDropdownOpen ? 'text-[#353535]' : 'text-[#616161]'}`}
                        >
                            <span>Employee:</span>
                            <span className="truncate max-w-[100px]">{selectedEmployee}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                className={`shrink-0 transition-transform duration-200 ${employeeDropdownOpen ? 'rotate-180' : ''}`}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {employeeDropdownOpen && (
                            <div
                                className="absolute top-full left-0 mt-2 z-50 bg-white rounded-lg border border-[#E5E5E5] shadow-lg min-w-[160px] max-h-[240px] overflow-y-auto py-1.5 custom-scrollbar"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {employeeOptions.map((name) => {
                                    const isSelected = selectedEmployee === name;
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEmployee(name);
                                                setEmployeeDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors truncate ${isSelected ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}
                                        >
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="relative" ref={showEntriesDropdownRef}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEntriesOpen((o) => !o);
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 bg-[#E8E8E8] rounded-lg border border-[#E5E5E5] transition-all cursor-pointer font-medium text-sm ${showEntriesOpen ? 'text-[#353535]' : 'text-[#616161]'}`}
                            >
                                <span>Show:</span>
                                <span>{selectedRange.label}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                    className={`transition-transform duration-200 ${showEntriesOpen ? 'rotate-180' : ''}`}>
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </button>
                            {showEntriesOpen && (
                                <div
                                    className="absolute top-full left-0 mt-2 z-50 bg-white rounded-lg border border-[#E5E5E5] shadow-lg min-w-[140px] py-1.5"
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
                                                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${isSelected ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}
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
                        onClick={() => {
                            // Pre-fill with logged-in user's name and role for display
                            const displayName = user
                                ? `${user.full_name}${user.user_role ? ` - ${user.user_role}` : ''}`
                                : '';
                            setEmployeeName(displayName);
                            setApplyModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#DD4342] text-white rounded-lg font-semibold text-sm active:scale-[0.98] transition-all shadow-sm"
                    >
                        Apply Leave
                    </button>
                </div>
            </div>

            {/* Single table: all leave data with Role, Reason, and Approve/Reject for Pending */}
            <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-x-auto overflow-y-auto flex-1 ">
                    <table className="w-full min-w-[900px] border-collapse table-fixed">
                        <colgroup>
                            <col className="w-[6%]" />
                            <col className="w-[13.4%]" />
                            <col className="w-[13.4%]" />
                            <col className="w-[13.4%]" />
                            <col className="w-[13.4%]" />
                            <col className="w-[13.4%]" />
                            <col className="w-[13.4%]" />
                            <col className="w-[13.4%]" />
                        </colgroup>
                        <thead>
                            <tr className="bg-[#F8F9FA] border-b border-[#E5E5E5]">
                                <th className="pl-6 pr-8 py-4 text-center text-md font-bold tracking-wider text-[#353535] whitespace-nowrap">Sl.No</th>
                                <th className="pl-8 pr-8 py-4 text-center text-md font-bold tracking-wider text-[#353535] whitespace-nowrap">Employee Name</th>
                                <th className="pl-8 pr-6 py-4 text-center text-md font-bold tracking-wider text-[#353535] whitespace-nowrap">Role</th>
                                <th className="px-6 py-4 text-center text-md font-bold tracking-wider text-[#353535] whitespace-nowrap">Leave Type</th>
                                <th className="px-6 py-4 text-center text-md font-bold tracking-wider text-[#353535] whitespace-nowrap">From Date</th>
                                <th className="px-6 py-4 text-center text-md font-bold tracking-wider text-[#353535] whitespace-nowrap">To Date</th>
                                <th className="pl-6 pr-8 py-4 text-center text-md font-bold tracking-wider text-[#353535] whitespace-nowrap">Status</th>
                                <th className="pl-8 pr-6 py-4 text-center text-md font-bold tracking-wider text-[#353535] whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {displayedList.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-sm text-[#616161]">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg className="w-12 h-12 text-[#D2D2D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <p className="font-medium">No leave records found</p>
                                            <p className="text-sm">Leave entries will appear here when available.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                displayedList.map((row, index) => {
                                    const baseIndex = rangeStart + (safePage - 1) * PER_PAGE + index;
                                    const slNo = baseIndex + 1;
                                    return (
                                        <tr
                                            key={row.id}
                                            className={index % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}
                                        >
                                            <td className="pl-6 pr-8 py-3.5 text-center text-sm text-[#353535] font-medium align-middle">{slNo}</td>
                                            <td className="pl-8 pr-8 py-3.5 text-center text-sm text-[#353535] font-semibold align-middle">{row.employeeName}</td>
                                            <td className="pl-8 pr-6 py-3.5 text-center text-sm text-[#616161] align-middle">{row.role ?? '–'}</td>
                                            <td className="px-6 py-3.5 text-center text-sm text-[#616161] align-middle">{row.leaveType}</td>
                                            <td className="px-6 py-3.5 text-center text-sm text-[#616161] align-middle">{row.fromDate ?? '–'}</td>
                                            <td className="px-6 py-3.5 text-center text-sm text-[#616161] align-middle">{row.toDate ?? '–'}</td>
                                            <td className="pl-6 pr-8 py-3.5 text-center align-middle">
                                                <span className={`inline-flex px-3 py-1 rounded-md text-xs font-semibold ${row.currentStatus === 'Approved' ? 'bg-[#E1F6EB] text-[#008F22]' : row.currentStatus === 'Rejected' ? 'bg-[#FFE5E5] text-[#C62828]' : 'bg-[#FFF8E1] text-[#F57C00]'}`}>
                                                    {row.currentStatus}
                                                </span>
                                            </td>
                                            <td className="pl-8 pr-6 py-3.5 text-center whitespace-nowrap align-middle">
                                                <div className="flex items-center justify-center gap-4 flex-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleView(row)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DD4346] text-white rounded-lg font-medium text-xs hover:bg-[#c43a39] active:scale-[0.98] transition-all shrink-0"
                                                    >
                                                        <img src={viewIcon} alt="" className="w-3.5 h-3.5 shrink-0 [filter:brightness(0)_invert(1)]" />
                                                        View
                                                    </button>
                                                    {row.currentStatus === 'Pending' && canActOnLeave(row) && (
                                                        <>
                                                            <div className="relative group inline-flex shrink-0">
                                                                <button
                                                                    type="button"
                                                                    aria-label="Approve"
                                                                    onClick={() => handleApproveBackend(row)}
                                                                    className="inline-flex items-center justify-center p-2 bg-[#008F22] text-white rounded-lg font-medium active:scale-[0.98] transition-transform"
                                                                >
                                                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                                                                </button>
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 flex flex-col items-center">
                                                                    <div className="relative z-10">
                                                                        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-300 drop-shadow-[0_-2px_4px_rgba(0,0,0,0.15)]"></div>
                                                                    </div>
                                                                    <div className="bg-gray-100 border border-[#C1C1C1]/50 rounded-lg shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0.18)] px-4 py-2 -mt-[1px]">
                                                                        <span className="font-gantari text-xs font-medium text-[#008F22] text-center block">Approve</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="relative group inline-flex shrink-0">
                                                                <button
                                                                    type="button"
                                                                    aria-label="Reject"
                                                                    onClick={() => handleRejectBackend(row)}
                                                                    className="inline-flex items-center justify-center p-2 bg-[#C62828] text-white rounded-lg font-medium active:scale-[0.98] transition-transform"
                                                                >
                                                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                                </button>
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 flex flex-col items-center">
                                                                    <div className="relative z-10">
                                                                        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-300 drop-shadow-[0_-2px_4px_rgba(0,0,0,0.15)]"></div>
                                                                    </div>
                                                                    <div className="bg-gray-100 border border-[#C1C1C1]/50 rounded-lg shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0.18)] px-4 py-2 -mt-[1px]">
                                                                        <span className="font-gantari text-xs font-medium text-[#E00100] text-center block">Reject</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {canEditLeave(row) && (
                                                        <div className="relative group inline-flex shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(row)}
                                                                aria-label="Edit"
                                                                className="inline-flex items-center justify-center p-2 rounded-lg font-medium text-[#353535] bg-[#E8E8E8] hover:bg-[#D2D2D2] active:scale-[0.98] transition-all"
                                                            >
                                                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                            </button>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 flex flex-col items-center">
                                                                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-300 drop-shadow-[0_-2px_4px_rgba(0,0,0,0.15)]"></div>
                                                                <div className="bg-gray-100 border border-[#C1C1C1]/50 rounded-lg shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0.18)] px-4 py-2 -mt-[1px]">
                                                                    <span className="font-gantari text-xs font-medium text-[#353535] text-center block">Edit</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {canEditLeave(row) && (
                                                        <div className="relative group inline-flex shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(row)}
                                                                aria-label="Delete"
                                                                className="inline-flex items-center justify-center p-2 rounded-lg font-medium text-white bg-[#C62828] hover:bg-[#B71C1C] active:scale-[0.98] transition-all"
                                                            >
                                                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                                            </button>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 flex flex-col items-center">
                                                                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-300 drop-shadow-[0_-2px_4px_rgba(0,0,0,0.15)]"></div>
                                                                <div className="bg-gray-100 border border-[#C1C1C1]/50 rounded-lg shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0.18)] px-4 py-2 -mt-[1px]">
                                                                    <span className="font-gantari text-xs font-medium text-[#E00100] text-center block">Delete</span>
                                                                </div>
                                                            </div>
                                                        </div>
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

            {/* Pagination */}
            {totalInRange > 0 && (
                <div className="flex flex-wrap items-center justify-end mt-4 -mb-8 pt-2 flex-shrink-0">
                    <div className="flex items-center gap-2 flex-wrap bg-white border border-[#E5E5E5] rounded-xl px-4 py-2 shadow-sm">
                        <span className="text-[#666666] text-sm font-medium">Showing:</span>
                        <button
                            type="button"
                            onClick={goPrevWindow}
                            disabled={!canPrevWindow}
                            className="flex items-center gap-1 text-[#666666] text-sm font-medium hover:text-[#353535] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-[#DD4342] text-white shadow-sm' : 'text-[#666666] hover:text-[#353535] hover:bg-[#F2F2F2]'}`}
                                >
                                    {pr.label}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={goNextWindow}
                            disabled={!canNextWindow}
                            className="flex items-center gap-1 text-[#666666] text-sm font-medium hover:text-[#353535] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Apply Leave Modal */}
            {applyModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}>
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#E5E5E5]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4 flex-shrink-0 border-b border-[#EEEEEE] bg-[#FAFAFA]">
                            <div />
                            <h3 className="text-xl font-bold text-[#353535] text-center">Apply Leave</h3>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="p-2 rounded-lg hover:bg-[#EEEEEE] transition-colors text-[#353535]"
                                    aria-label="Close"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitApply} className="flex flex-col flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Employee Name <span className="text-[#DD4342]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={
                                        employeeName ||
                                        (user
                                            ? `${user.full_name}${user.user_role ? ` - ${user.user_role}` : ''}`
                                            : '')
                                    }
                                    readOnly
                                    disabled
                                    placeholder="Employee name"
                                    className={`w-full px-4 py-2.5 bg-[#E5E5E5] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed ${
                                        applyFormErrors.employeeName ? 'border border-[#DD4342]' : 'border-0'
                                    }`}
                                />
                                {applyFormErrors.employeeName && (
                                    <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.employeeName}</p>
                                )}
                            </div>

                            <div ref={leaveTypeDropdownRef} className="relative">
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Leave Type <span className="text-[#DD4342]">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setLeaveTypeOpen((o) => !o)}
                                    className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] min-h-[40px] text-sm transition-colors ${leaveTypeOpen ? 'ring-1 ring-[#D2D2D2]' : applyFormErrors.leaveType ? 'border border-[#DD4342]' : 'border-0'}`}
                                >
                                    <span className={leaveType ? 'text-[#353535] font-medium' : 'text-[#8B8B8B]'}>
                                        {leaveType || 'Select leave type'}
                                    </span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        className={`transition-transform duration-200 ${leaveTypeOpen ? 'rotate-180' : ''}`}>
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
                                                setLeaveTypeOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${!leaveType ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}
                                        >
                                            Nothing selected
                                        </button>
                                        {LEAVE_TYPES.map((type: string) => {
                                            const isSelected = leaveType === type;
                                            return (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaveType(type);
                                                        setLeaveTypeOpen(false);
                                                        if (applyFormErrors.leaveType) setApplyFormErrors((prev) => ({ ...prev, leaveType: '' }));
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${isSelected ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}
                                                >
                                                    {type}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {applyFormErrors.leaveType && (
                                    <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveType}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Leave From <span className="text-[#DD4342]">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={leaveFrom}
                                        onChange={(e) => {
                                            setLeaveFrom(e.target.value);
                                            if (applyFormErrors.leaveFrom) setApplyFormErrors((prev) => ({ ...prev, leaveFrom: '' }));
                                            if (applyFormErrors.leaveTo && leaveTo && e.target.value <= leaveTo) setApplyFormErrors((prev) => ({ ...prev, leaveTo: '' }));
                                        }}
                                        className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveFrom ? 'border border-[#DD4342]' : 'border-0'}`}
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                    </svg>
                                </div>
                                {applyFormErrors.leaveFrom && (
                                    <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveFrom}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Leave To <span className="text-[#DD4342]">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={leaveTo}
                                        onChange={(e) => {
                                            setLeaveTo(e.target.value);
                                            if (applyFormErrors.leaveTo) setApplyFormErrors((prev) => ({ ...prev, leaveTo: '' }));
                                        }}
                                        className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveTo ? 'border border-[#DD4342]' : 'border-0'}`}
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                    </svg>
                                </div>
                                {applyFormErrors.leaveTo && (
                                    <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveTo}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Describe Your Reason <span className="text-[#DD4342]">*</span>
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => {
                                        const next = normalizeNameAndReason(e.target.value);
                                        setReason(next);
                                        if (applyFormErrors.reason) setApplyFormErrors((prev) => ({ ...prev, reason: '' }));
                                    }}
                                    rows={5}
                                    placeholder="Enter your reason for leave..."
                                    className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors resize-y min-h-[120px] ${applyFormErrors.reason ? 'border border-[#DD4342]' : 'border-0'}`}
                                />
                                {applyFormErrors.reason && (
                                    <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.reason}</p>
                                )}
                            </div>

                            <div className="pt-2 flex justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2.5 rounded-lg font-medium text-[#616161] bg-[#F2F2F2] hover:bg-[#E5E5E5] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-[#DD4342] text-white rounded-lg font-semibold hover:bg-[#c43a39] active:scale-[0.98] transition-all shadow-sm"
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseEditModal}>
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#E5E5E5]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4 flex-shrink-0 border-b border-[#EEEEEE] bg-[#FAFAFA]">
                            <div />
                            <h3 className="text-xl font-bold text-[#353535] text-center">Edit Leave</h3>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleCloseEditModal}
                                    className="p-2 rounded-lg hover:bg-[#EEEEEE] transition-colors text-[#353535]"
                                    aria-label="Close"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitEdit} className="flex flex-col flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Employee Name <span className="text-[#DD4342]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={
                                        employeeName ||
                                        (editingLeave
                                            ? `${editingLeave.employeeName}${editingLeave.role ? ` - ${editingLeave.role}` : ''}`
                                            : '')
                                    }
                                    readOnly
                                    disabled
                                    placeholder="Employee name"
                                    className={`w-full px-4 py-2.5 bg-[#E5E5E5] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed ${
                                        applyFormErrors.employeeName ? 'border border-[#DD4342]' : 'border-0'
                                    }`}
                                />
                                {applyFormErrors.employeeName && (
                                    <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.employeeName}</p>
                                )}
                            </div>

                            <div ref={leaveTypeDropdownEditRef} className="relative">
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Leave Type <span className="text-[#DD4342]">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setLeaveTypeOpenEdit((o) => !o)}
                                    className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] min-h-[40px] text-sm transition-colors ${leaveTypeOpenEdit ? 'ring-1 ring-[#D2D2D2]' : applyFormErrors.leaveType ? 'border border-[#DD4342]' : 'border-0'}`}
                                >
                                    <span className={leaveType ? 'text-[#353535] font-medium' : 'text-[#8B8B8B]'}>
                                        {leaveType || 'Select leave type'}
                                    </span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        className={`transition-transform duration-200 ${leaveTypeOpenEdit ? 'rotate-180' : ''}`}>
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
                                                setLeaveType('');
                                                setLeaveTypeOpenEdit(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${!leaveType ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}
                                        >
                                            Nothing selected
                                        </button>
                                        {LEAVE_TYPES.map((type: string) => {
                                            const isSelected = leaveType === type;
                                            return (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaveType(type);
                                                        setLeaveTypeOpenEdit(false);
                                                        if (applyFormErrors.leaveType) setApplyFormErrors((prev) => ({ ...prev, leaveType: '' }));
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${isSelected ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}
                                                >
                                                    {type}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {applyFormErrors.leaveType && (
                                    <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveType}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Leave From <span className="text-[#DD4342]">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={leaveFrom}
                                        onChange={(e) => {
                                            setLeaveFrom(e.target.value);
                                            if (applyFormErrors.leaveFrom) setApplyFormErrors((prev) => ({ ...prev, leaveFrom: '' }));
                                            if (applyFormErrors.leaveTo && leaveTo && e.target.value <= leaveTo) setApplyFormErrors((prev) => ({ ...prev, leaveTo: '' }));
                                        }}
                                        className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveFrom ? 'border border-[#DD4342]' : 'border-0'}`}
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                    </svg>
                                </div>
                                {applyFormErrors.leaveFrom && (
                                    <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveFrom}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Leave To <span className="text-[#DD4342]">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={leaveTo}
                                        onChange={(e) => {
                                            setLeaveTo(e.target.value);
                                            if (applyFormErrors.leaveTo) setApplyFormErrors((prev) => ({ ...prev, leaveTo: '' }));
                                        }}
                                        className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveTo ? 'border border-[#DD4342]' : 'border-0'}`}
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                    </svg>
                                </div>
                                {applyFormErrors.leaveTo && (
                                    <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveTo}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">
                                    Describe Your Reason <span className="text-[#DD4342]">*</span>
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => {
                                        const next = normalizeNameAndReason(e.target.value);
                                        setReason(next);
                                        if (applyFormErrors.reason) setApplyFormErrors((prev) => ({ ...prev, reason: '' }));
                                    }}
                                    rows={5}
                                    placeholder="Enter your reason for leave..."
                                    className={`w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors resize-y min-h-[120px] ${applyFormErrors.reason ? 'border border-[#DD4342]' : 'border-0'}`}
                                />
                                {applyFormErrors.reason && (
                                    <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.reason}</p>
                                )}
                            </div>

                            <div className="pt-2 flex justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseEditModal}
                                    className="px-6 py-2.5 rounded-lg font-medium text-[#616161] bg-[#F2F2F2] hover:bg-[#E5E5E5] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-[#DD4342] text-white rounded-lg font-semibold hover:bg-[#c43a39] active:scale-[0.98] transition-all shadow-sm"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* View Leave Modal */}
            {viewModalOpen && selectedLeave && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => { setViewModalOpen(false); setSelectedLeave(null); }}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-[#E5E5E5]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative flex items-center justify-center px-6 py-5 border-b border-[#EEEEEE] bg-[#FAFAFA]">
                            <button
                                type="button"
                                onClick={() => { setViewModalOpen(false); setSelectedLeave(null); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#EEEEEE] hover:bg-[#E0E0E0] transition-colors text-[#353535]"
                                aria-label="Close"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                            <h3 className="text-xl font-bold text-[#353535]">Leave Details</h3>
                        </div>
                        <div className="px-6 py-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-2">
                                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">Employee Name</span>
                                    <span className="shrink-0 text-[#616161]">:</span>
                                    <span className="text-sm text-[#616161]">{selectedLeave.employeeName}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">Role</span>
                                    <span className="shrink-0 text-[#616161]">:</span>
                                    <span className="text-sm text-[#616161]">{selectedLeave.role ?? '–'}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">Leave Type</span>
                                    <span className="shrink-0 text-[#616161]">:</span>
                                    <span className="text-sm text-[#616161]">{selectedLeave.leaveType}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">From Date</span>
                                    <span className="shrink-0 text-[#616161]">:</span>
                                    <span className="text-sm text-[#616161]">{selectedLeave.fromDate ?? '–'}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">To Date</span>
                                    <span className="shrink-0 text-[#616161]">:</span>
                                    <span className="text-sm text-[#616161]">{selectedLeave.toDate ?? '–'}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">Applied On</span>
                                    <span className="shrink-0 text-[#616161]">:</span>
                                    <span className="text-sm text-[#616161]">{selectedLeave.appliedOn}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">Reason</span>
                                    <span className="shrink-0 text-[#616161]">:</span>
                                    <span className="text-sm text-[#616161]">{selectedLeave.description ?? '–'}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-[140px] shrink-0 text-sm font-semibold text-[#353535] pt-0.5">Current Status</span>
                                    <span className="shrink-0 text-[#616161]">:</span>
                                    <span className={`inline-flex px-3 py-1 rounded-md text-xs font-semibold ${selectedLeave.currentStatus === 'Approved' ? 'bg-[#E1F6EB] text-[#008F22]' : selectedLeave.currentStatus === 'Rejected' ? 'bg-[#FFE5E5] text-[#C62828]' : 'bg-[#FFF8E1] text-[#F57C00]'}`}>
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
