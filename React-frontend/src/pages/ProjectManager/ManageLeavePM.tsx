import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import viewIcon from '../../assets/BIMModeler/ManageLeave/view icon.svg';

interface LeaveEntry {
    id: number;
    employeeId?: number;
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

// Dummy data previously used for layout/testing; kept here commented for reference only.
// const DUMMY_LEAVES: LeaveEntry[] = [
//     { id: 1, slNo: 1, employeeName: 'John Doe', role: 'BIM Modeler', leaveType: 'Sick Leave', appliedOn: '01/03/2026', appliedTo: 'BIM Lead', currentStatus: 'Approved', fromDate: '02/03/2026', toDate: '03/03/2026', description: 'Medical appointment' },
//     { id: 2, slNo: 2, employeeName: 'Jane Smith', role: 'BIM Modeler', leaveType: 'Casual Leave', appliedOn: '28/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Pending', fromDate: '05/03/2026', toDate: '06/03/2026', description: 'Family event' },
//     { id: 3, slNo: 3, employeeName: 'Mike Johnson', role: 'BIM Lead', leaveType: 'Earned Leave', appliedOn: '25/02/2026', appliedTo: 'Project Manager', currentStatus: 'Approved', fromDate: '10/03/2026', toDate: '12/03/2026', description: 'Personal' },
//     { id: 4, slNo: 4, employeeName: 'Sarah Williams', role: 'BIM Modeler', leaveType: 'Sick Leave', appliedOn: '20/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Rejected', fromDate: '21/02/2026', toDate: '22/02/2026', description: 'Fever' },
//     { id: 5, slNo: 5, employeeName: 'David Brown', role: 'BIM Modeler', leaveType: 'Casual Leave', appliedOn: '15/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Approved', fromDate: '18/02/2026', toDate: '19/02/2026', description: 'Travel' },
//     { id: 6, slNo: 6, employeeName: 'Emma Wilson', role: 'BIM Modeler', leaveType: 'Sick Leave', appliedOn: '12/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Approved', fromDate: '13/02/2026', toDate: '14/02/2026', description: 'Recovery' },
//     { id: 7, slNo: 7, employeeName: 'James Davis', role: 'BIM Modeler', leaveType: 'Earned Leave', appliedOn: '10/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Pending', fromDate: '20/03/2026', toDate: '22/03/2026', description: 'Vacation' },
//     { id: 8, slNo: 8, employeeName: 'Olivia Martinez', role: 'BIM Modeler', leaveType: 'Casual Leave', appliedOn: '08/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Approved', fromDate: '09/02/2026', toDate: '10/02/2026', description: 'Personal work' },
//     { id: 9, slNo: 9, employeeName: 'William Taylor', role: 'BIM Modeler', leaveType: 'Sick Leave', appliedOn: '05/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Rejected', fromDate: '06/02/2026', toDate: '07/02/2026', description: 'Doctor visit' },
//     { id: 10, slNo: 10, employeeName: 'Sophia Anderson', role: 'BIM Modeler', leaveType: 'Maternity Leave', appliedOn: '01/02/2026', appliedTo: 'BIM Lead', currentStatus: 'Approved', fromDate: '15/02/2026', toDate: '15/05/2026', description: 'Maternity' },
// ];

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave'];

function normalizeNameAndReason(value: string): string {
    const allowed = value.replace(/[^\w\s.,\-'()\/&@!#?;:'"]/g, '');
    return allowed.replace(/\s+/g, ' ');
}

function toInputDate(d: string | undefined): string {
    if (!d) return '';
    const s = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parts = s.split('/');
    if (parts.length === 3) {
        const [dd, mm, yy] = parts;
        return `${yy}-${mm}-${dd}`;
    }
    const dash = s.split('-');
    if (dash.length === 3 && dash[0].length === 2) {
        const [dd, mm, yy] = dash;
        return `${yy}-${mm}-${dd}`;
    }
    return '';
}

const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
    { value: '0-100', label: '0-100', start: 0, end: 100 },
    { value: '101-200', label: '101-200', start: 100, end: 200 },
    { value: '201-300', label: '201-300', start: 200, end: 300 },
    { value: '301-400', label: '301-400', start: 300, end: 400 },
    { value: 'all', label: 'All', start: 0, end: null },
];

const PER_PAGE = 10;
const PAGINATION_VISIBLE = 4;

const getTodayInputDate = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

export default function ManageLeavePM() {
    const { user } = useAuth();
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null);
    const [leaves, setLeaves] = useState<LeaveEntry[]>([]);

    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingLeave, setEditingLeave] = useState<LeaveEntry | null>(null);
    const [leaveType, setLeaveType] = useState('');
    const [leaveTypeId, setLeaveTypeId] = useState<number | null>(null);
    const [leaveFrom, setLeaveFrom] = useState('');
    const [leaveTo, setLeaveTo] = useState('');
    const [reason, setReason] = useState('');
    const [applyFormErrors, setApplyFormErrors] = useState<Record<string, string>>({});
    const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
    const [leaveTypeOpenEdit, setLeaveTypeOpenEdit] = useState(false);
    const leaveTypeDropdownRef = useRef<HTMLDivElement>(null);
    const leaveTypeDropdownEditRef = useRef<HTMLDivElement>(null);

    const [selectedEmployee, setSelectedEmployee] = useState<string>('All');
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const employeeDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationWindowStart, setPaginationWindowStart] = useState(1);
    const todayInputDate = getTodayInputDate();
    const [leaveTypeOptions, setLeaveTypeOptions] = useState<Array<{ id: number; title: string }>>([]);
    const leaveTypeDropdownItems: Array<{ id: number | null; title: string }> = [
        ...LEAVE_TYPES.map((title) => {
            const match = leaveTypeOptions.find((opt) => opt.title === title);
            return { title, id: match ? match.id : null };
        }),
        ...leaveTypeOptions
            .filter((opt) => !LEAVE_TYPES.includes(opt.title))
            .map((opt) => ({ title: opt.title, id: opt.id })),
    ];

    const employeeOptions = ['All', ...Array.from(new Set(leaves.map((l) => l.employeeName)))];

  // Format ISO or YYYY-MM-DD from API to DD/MM/YYYY for display
  const formatApiDate = (value: string | undefined | null): string => {
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
  };

  // Load only current user's leave applications from backend (tblleaves)
  useEffect(() => {
      const fetchLeaves = async () => {
          if (!user?.id) {
              setLeaves([]);
              return;
          }
          try {
              const { data } = await api.get<{ applications?: any[] }>('/api/leave/applications');
              const apps = (data.applications || []).filter((app) => app.employee_id === user.id);
              const mapped: LeaveEntry[] = apps.map((app, index) => ({
                  id: app.lid,
                  employeeId: app.employee_id,
                  slNo: index + 1,
                  employeeName: app.full_name || 'Unknown',
                  role: app.role || undefined,
                  leaveType: app.title || app.leave_type || 'Others',
                  leaveTypeId:
                      app.leave_type !== undefined && app.leave_type !== null
                          ? Number(app.leave_type)
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
              console.error('Failed to load leaves from backend', err);
              setLeaves([]);
          }
      };

      fetchLeaves();
  }, [user?.id]);

  // Load leave types to map selected title <-> holiday id (leave_type).
  useEffect(() => {
      api
          .get<{ leave_types?: Array<{ id?: number; title?: string }> }>('/api/leave/types')
          .then(({ data }) => {
              const options =
                  (data.leave_types || [])
                      .map((t) => ({ id: Number(t.id), title: String(t.title || '') }))
                      .filter((t) => Number.isFinite(t.id) && !!t.title);
              setLeaveTypeOptions(options);
          })
          .catch(() => {
              setLeaveTypeOptions([]);
          });
  }, []);

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
            if (leaveTypeDropdownRef.current && !leaveTypeDropdownRef.current.contains(event.target as Node)) setLeaveTypeOpen(false);
        };
        if (leaveTypeOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [leaveTypeOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (leaveTypeDropdownEditRef.current && !leaveTypeDropdownEditRef.current.contains(event.target as Node)) setLeaveTypeOpenEdit(false);
        };
        if (leaveTypeOpenEdit) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [leaveTypeOpenEdit]);

    useEffect(() => {
        setCurrentPage(1);
        setPaginationWindowStart(1);
    }, [selectedShowEntries, selectedEmployee]);

    const validateApplyForm = (): boolean => {
        const err: Record<string, string> = {};
        if (!user?.full_name) err.employeeName = 'Employee name is required';
        if (!leaveType) err.leaveType = 'Leave type is required';
        if (!leaveFrom) err.leaveFrom = 'Leave from date is required';
        if (!leaveTo) err.leaveTo = 'Leave to date is required';
        if (!reason.trim()) err.reason = 'Reason is required';
        if (leaveFrom && leaveFrom < todayInputDate) err.leaveFrom = 'Leave from date cannot be in the past';
        if (leaveTo && leaveTo < todayInputDate) err.leaveTo = 'Leave to date cannot be in the past';
        if (leaveFrom && leaveTo && leaveFrom > leaveTo) err.leaveTo = 'Leave to must be on or after leave from';
        setApplyFormErrors(err);
        return Object.keys(err).length === 0;
    };

    // Apply leave: persist to tblleaves via backend and then reload current user's leaves
    const handleSubmitApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateApplyForm()) return;

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

            const { data } = await api.post<{ success: boolean; id?: number; message?: string }>('/api/leave/applications', payload);
            if (data.success === false) {
                alert(data.message || 'Failed to apply leave.');
                return;
            }

            // Reload only this user's leaves
            try {
                const resp = await api.get<{ applications?: any[] }>('/api/leave/applications');
                const apps = (resp.data.applications || []).filter((app) => app.employee_id === user?.id);
                const mapped: LeaveEntry[] = apps.map((app, index) => ({
                    id: app.lid,
                    employeeId: app.employee_id,
                    slNo: index + 1,
                    employeeName: app.full_name || 'Unknown',
                    role: app.role || undefined,
                    leaveType: app.title || app.leave_type || 'Others',
                    leaveTypeId:
                        app.leave_type !== undefined && app.leave_type !== null
                            ? Number(app.leave_type)
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
                console.error('Failed to refresh leaves after apply.', err);
            }

            setLeaveType('');
            setLeaveTypeId(null);
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
        setLeaveType(''); setLeaveTypeId(null); setLeaveFrom(''); setLeaveTo(''); setReason(''); setApplyFormErrors({});
    };

    const handleEdit = (row: LeaveEntry) => {
        setEditingLeave(row);
        setLeaveType(row.leaveType);
        const matchingType = leaveTypeOptions.find((t) => t.title === row.leaveType);
        setLeaveTypeId(matchingType ? matchingType.id : row.leaveTypeId ?? null);
        setLeaveFrom(toInputDate(row.fromDate));
        setLeaveTo(toInputDate(row.toDate));
        setReason(row.description ?? '');
        setApplyFormErrors({});
        setEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setEditingLeave(null);
        setLeaveType(''); setLeaveTypeId(null); setLeaveFrom(''); setLeaveTo(''); setReason(''); setApplyFormErrors({});
    };

    // Edit leave: persist changes to tblleaves (only own pending leaves allowed by backend)
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
                payload
            );

            if (data.success === false) {
                alert(data.message || 'Failed to update leave.');
                return;
            }

            // Reload only this user's leaves
            try {
                const resp = await api.get<{ applications?: any[] }>('/api/leave/applications');
                const apps = (resp.data.applications || []).filter((app) => app.employee_id === user?.id);
                const mapped: LeaveEntry[] = apps.map((app, index) => ({
                    id: app.lid,
                    employeeId: app.employee_id,
                    slNo: index + 1,
                    employeeName: app.full_name || 'Unknown',
                    role: app.role || undefined,
                    leaveType: app.title || app.leave_type || 'Others',
                    leaveTypeId:
                        app.leave_type !== undefined && app.leave_type !== null
                            ? Number(app.leave_type)
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
                console.error('Failed to refresh leaves after edit.', err);
            }

            handleCloseEditModal();
        } catch (err: any) {
            console.error('Update leave failed', err);
            alert(err?.response?.data?.message || 'Failed to update leave. Please try again.');
        }
    };

    const handleDelete = async (row: LeaveEntry) => {
        if (!window.confirm(`Delete leave for ${row.employeeName} (${row.leaveType}, ${row.fromDate} - ${row.toDate})?`)) return;
        try {
            await api.delete(`/api/leave/applications/${row.id}`);
            const resp = await api.get<{ applications?: any[] }>('/api/leave/applications');
            const apps = (resp.data.applications || []).filter((app) => app.employee_id === user?.id);
            const mapped: LeaveEntry[] = apps.map((app, index) => ({
                id: app.lid,
                employeeId: app.employee_id,
                slNo: index + 1,
                employeeName: app.full_name || 'Unknown',
                role: app.role || undefined,
                leaveType: app.title || app.leave_type || 'Others',
                leaveTypeId:
                    app.leave_type !== undefined && app.leave_type !== null
                        ? Number(app.leave_type)
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
        } catch (err: any) {
            console.error('Delete leave failed', err);
            alert(err?.response?.data?.message || 'Delete failed. Please try again.');
        }
    };

    // For Project Manager view we no longer approve/reject here, so no status mutations from this screen.

    // filtered list is always current user's leaves; dropdown still allows filter by name if desired
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
    // const activePage = safePage;
    // const maxWindowStart = Math.max(1, totalPages - PAGINATION_VISIBLE + 1);
    // const effectiveWindowStart = Math.min(paginationWindowStart, maxWindowStart);
    // const visiblePageRanges = pageRanges.slice(effectiveWindowStart - 1, effectiveWindowStart - 1 + PAGINATION_VISIBLE);
    // const canPrevWindow = paginationWindowStart > 1;
    // const canNextWindow = paginationWindowStart <= totalPages - PAGINATION_VISIBLE;
    // const goPrevWindow = () => setPaginationWindowStart((s) => Math.max(1, s - PAGINATION_VISIBLE));
    // const goNextWindow = () => setPaginationWindowStart((s) => Math.min(s + PAGINATION_VISIBLE, maxWindowStart));
    // void [activePage, visiblePageRanges, canPrevWindow, canNextWindow, goPrevWindow, goNextWindow];

    const handleView = (row: LeaveEntry) => {
        setSelectedLeave(row);
        setViewModalOpen(true);
    };

    return (
        <div className=" flex flex-col h-full font-gantari overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div
                className="flex flex-col flex-1 min-h-0"
                style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }}
            >
            {/* Page header: heading left; Employee + Show entries right */}
            <div className="flex-shrink-0 mb-6 flex flex-row items-center justify-between gap-4 flex-wrap">
                <h1 className="text-[30px] font-gantari font-semibold">Manage Leave</h1>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => {
                            if (!user?.full_name) {
                                alert('User information not available.');
                                return;
                            }
                            setApplyModalOpen(true);
                        }}
                        className="px-4 py-2 bg-[#DD4346] text-white rounded-lg text-[16px] font-gantari font-medium hover:bg-[#c43a39] transition-colors"
                    >
                        Apply Leave
                    </button>
                    <div className="relative" ref={employeeDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeDropdownOpen((o) => !o);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-lg border border-[#E5E5E5] transition-all cursor-pointer font-medium text-sm min-w-[140px] justify-between ${employeeDropdownOpen ? 'text-[#353535]' : 'text-[#616161]'}`}
                        >
                            <span className="text-[16px]">Employee:</span>
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
                                <span className="text-[16px]">Show:</span>
                                <span className="text-[16px]">{selectedRange.label}</span>
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
                </div>
            </div>

            {/* Table Section - same design as TrackerTD; no min-height so card fits content and no extra padding below */}
            <div className="bg-white rounded-2xl border border-[#AEACAC52] overflow-hidden flex flex-col relative">
                <div className="overflow-auto custom-scrollbar smooth-scroll pb-0">
                    <table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-[#FFFFFF] after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                            
                            <tr className="border-b border-gray-100 bg-[#FFFFFF]">
                                <th className="px-3 py-6 text-center text-[20px] font-semibold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Sl.No</th>
                                <th className="px-3 py-6 text-center text-[20px] font-semibold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Employee Name</th>
                                <th className="px-3 py-6 text-center text-[20px] font-semibold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Role</th>
                                <th className="px-3 py-6 text-center text-[20px] font-semibold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Leave Type</th>
                                <th className="px-3 py-6 text-center text-[20px] font-semibold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">From Date</th>
                                <th className="px-3 py-6 text-center text-[20px] font-semibold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">To Date</th>
                                <th className="px-3 py-6 text-center text-[20px] font-bold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {displayedList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-12 text-center text-[18px] text-gray-400 font-medium font-gantari bg-white">
                                        No leave records found
                                    </td>
                                </tr>
                            ) : (
                                displayedList.map((row, index) => {
                                    const baseIndex = rangeStart + (safePage - 1) * PER_PAGE + index;
                                    const slNo = baseIndex + 1;
                                    return (
                                        <tr
                                            key={row.id}
                                            className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}
                                        >
                                            <td className="px-3 py-8 text-center text-[17px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{String(slNo).padStart(2, '0')}</td>
                                            <td className="px-3 py-8 text-center text-[17px] text-[#353535] font-gantari whitespace-nowrap align-middle">{row.employeeName}</td>
                                            <td className="px-3 py-8 text-center text-[17px] text-[#353535] font-gantari whitespace-nowrap align-middle">{row.role ?? '–'}</td>
                                            <td className="px-3 py-8 text-center text-[17px] text-[#353535] font-gantari whitespace-nowrap align-middle">{row.leaveType}</td>
                                            <td className="px-3 py-8 text-center text-[17px] text-[#353535] font-gantari whitespace-nowrap align-middle">{row.fromDate ?? '–'}</td>
                                            <td className="px-3 py-8 text-center text-[17px] text-[#353535] font-gantari whitespace-nowrap align-middle">{row.toDate ?? '–'}</td>
                                            <td className="px-3 py-8 text-center text-[17px] whitespace-nowrap align-middle">
                                                <div className="flex items-center justify-center gap-2 flex-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleView(row)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DD4346] text-white rounded-lg font-medium text-xs hover:bg-[#c43a39] active:scale-[0.98] transition-all shrink-0"
                                                    >
                                                        <img src={viewIcon} alt="" className="w-3.5 h-3.5 shrink-0 [filter:brightness(0)_invert(1)]" />
                                                        View
                                                    </button>
                                                    {row.currentStatus === 'Pending' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(row)}
                                                                className="inline-flex items-center justify-center p-1.5 border border-[#E5E5E5] rounded-lg text-[#353535] hover:bg-[#F0F2F7] transition-colors shrink-0"
                                                                title="Edit"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(row)}
                                                                className="inline-flex items-center justify-center p-1.5 border border-[#E5E5E5] rounded-lg text-[#C62828] hover:bg-[#FFE5E5] transition-colors shrink-0"
                                                                title="Delete"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

            {/* Apply Leave Modal */}
            {applyModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-[#E5E5E5]" onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex items-center justify-center px-6 py-5 border-b border-[#EEEEEE] bg-[#FAFAFA]">
                            {/* <button type="button" onClick={handleCloseModal} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-[#EEEEEE] transition-colors text-[#353535]" aria-label="Close">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button> */}
                            <h3 className="text-[24px] font-semibold text-[#353535]">Apply Leave</h3>
                        </div>
                        <form onSubmit={handleSubmitApply} className="px-6 py-6 space-y-4">
                            <div>
                                <label className="block text-16px font-semibold text-[#000000] mb-2">Employee Name<span className="text-[#DD4342]">*</span></label>
                                <input
                                    type="text"
                                    value={user ? `${user.full_name}${user.user_role ? ` - ${user.user_role}` : ''}` : ''}
                                    readOnly
                                    disabled
                                    className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none bg-[#F2F3F4] disabled:opacity-70 disabled:cursor-not-allowed ${applyFormErrors.employeeName ? 'border border-[#DD4342]' : 'border-0'}`}
                                    placeholder="Employee name - Role"
                                />
                                {applyFormErrors.employeeName && <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.employeeName}</p>}
                            </div>
                            <div className="relative" ref={leaveTypeDropdownRef}>
                                <label className="block text-base font-semibold text-[#000000] mb-2">Leave Type <span className="text-[#DD4342]">*</span></label>
                                <button type="button" onClick={() => setLeaveTypeOpen((o) => !o)} className={`w-full px-4 py-2.5 rounded-lg text-left text-sm flex items-center justify-between min-h-[40px] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors ${leaveTypeOpen ? 'ring-1 ring-[#D2D2D2]' : applyFormErrors.leaveType ? 'border border-[#DD4342]' : 'border-0'} bg-[#F2F3F4]`}>
                                    <span className={leaveType ? 'text-[#353535] font-medium' : 'text-[#8B8B8B]'}>{leaveType || 'Select leave type'}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${leaveTypeOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                                </button>
                                {leaveTypeOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-lg border border-[#E5E5E5] shadow-lg py-1.5" onMouseDown={(e) => e.preventDefault()}>
                                        <button type="button" onClick={() => { setLeaveType(''); setLeaveTypeId(null); setLeaveTypeOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium ${!leaveType ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}>Nothing selected</button>
                                        {leaveTypeDropdownItems.map((opt) => (
                                            <button key={`${opt.title}-${opt.id ?? 'none'}`} type="button" onClick={() => { setLeaveType(opt.title); setLeaveTypeId(opt.id); setLeaveTypeOpen(false); if (applyFormErrors.leaveType) setApplyFormErrors((p) => ({ ...p, leaveType: '' })); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium ${leaveType === opt.title ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}>{opt.title}</button>
                                        ))}
                                    </div>
                                )}
                                {applyFormErrors.leaveType && <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveType}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-base font-semibold text-[#000000] mb-2">Leave From <span className="text-[#DD4342]">*</span></label>
                                    <div className="relative">
                                        <input type="date" min={todayInputDate} value={leaveFrom} onChange={(e) => { setLeaveFrom(e.target.value); if (leaveTo && e.target.value > leaveTo) setLeaveTo(''); if (applyFormErrors.leaveFrom) setApplyFormErrors((p) => ({ ...p, leaveFrom: '' })); if (applyFormErrors.leaveTo && leaveTo && e.target.value <= leaveTo) setApplyFormErrors((p) => ({ ...p, leaveTo: '' })); }} className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveFrom ? 'border border-[#DD4342]' : 'border-0'} bg-[#F2F3F4]`} style={{ colorScheme: 'light' }} />
                                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" /><line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" /><line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" /><line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" /></svg>
                                    </div>
                                    {applyFormErrors.leaveFrom && <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveFrom}</p>}
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-[#000000] mb-2">Leave To <span className="text-[#DD4342]">*</span></label>
                                    <div className="relative">
                                        <input type="date" min={todayInputDate} value={leaveTo} onChange={(e) => { setLeaveTo(e.target.value); if (applyFormErrors.leaveTo) setApplyFormErrors((p) => ({ ...p, leaveTo: '' })); }} className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveTo ? 'border border-[#DD4342]' : 'border-0'} bg-[#F2F3F4]`} style={{ colorScheme: 'light' }} />
                                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" /><line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" /><line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" /><line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" /></svg>
                                    </div>
                                    {applyFormErrors.leaveTo && <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveTo}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">Describe Your Reason <span className="text-[#DD4342]">*</span></label>
                                <textarea value={reason} onChange={(e) => { setReason(normalizeNameAndReason(e.target.value)); if (applyFormErrors.reason) setApplyFormErrors((p) => ({ ...p, reason: '' })); }} rows={3} placeholder="Enter your reason for leave..." className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] resize-none ${applyFormErrors.reason ? 'border border-[#DD4342]' : 'border-0'} bg-[#F2F3F4]`} />
                                {applyFormErrors.reason && <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.reason}</p>}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-[#616161] bg-[#F2F2F2] hover:bg-[#E5E5E5] transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#DD4342] text-white rounded-lg font-semibold hover:bg-[#c43a39] active:scale-[0.98] transition-all shadow-sm">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Leave Modal */}
            {editModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseEditModal}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-[#E5E5E5]" onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex items-center justify-center px-6 py-5 border-b border-[#EEEEEE] bg-[#FAFAFA]">
                            <button type="button" onClick={handleCloseEditModal} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-[#EEEEEE] transition-colors text-[#353535]" aria-label="Close">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                            <h3 className="text-xl font-bold text-[#353535]">Edit Leave</h3>
                        </div>
                        <form onSubmit={handleSubmitEdit} className="px-6 py-6 space-y-4">
                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">Employee Name <span className="text-[#DD4342]">*</span></label>
                                <input
                                    type="text"
                                    value={editingLeave ? `${editingLeave.employeeName}${editingLeave.role ? ` - ${editingLeave.role}` : ''}` : ''}
                                    readOnly
                                    disabled
                                    className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none bg-[#F2F3F4] disabled:opacity-70 disabled:cursor-not-allowed ${applyFormErrors.employeeName ? 'border border-[#DD4342]' : 'border-0'}`}
                                    placeholder="Employee name - Role"
                                />
                                {applyFormErrors.employeeName && <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.employeeName}</p>}
                            </div>
                            <div className="relative" ref={leaveTypeDropdownEditRef}>
                                <label className="block text-base font-semibold text-[#000000] mb-2">Leave Type <span className="text-[#DD4342]">*</span></label>
                                <button type="button" onClick={() => setLeaveTypeOpenEdit((o) => !o)} className={`w-full px-4 py-2.5 rounded-lg text-left text-sm flex items-center justify-between min-h-[40px] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] transition-colors ${leaveTypeOpenEdit ? 'ring-1 ring-[#D2D2D2]' : applyFormErrors.leaveType ? 'border border-[#DD4342]' : 'border-0'} bg-[#F2F3F4]`}>
                                    <span className={leaveType ? 'text-[#353535] font-medium' : 'text-[#8B8B8B]'}>{leaveType || 'Select leave type'}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${leaveTypeOpenEdit ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                                </button>
                                {leaveTypeOpenEdit && (
                                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-lg border border-[#E5E5E5] shadow-lg py-1.5" onMouseDown={(e) => e.preventDefault()}>
                                        <button type="button" onClick={() => { setLeaveType(''); setLeaveTypeId(null); setLeaveTypeOpenEdit(false); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium ${!leaveType ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}>Nothing selected</button>
                                        {leaveTypeDropdownItems.map((opt) => (
                                            <button key={`${opt.title}-${opt.id ?? 'none'}-edit`} type="button" onClick={() => { setLeaveType(opt.title); setLeaveTypeId(opt.id); setLeaveTypeOpenEdit(false); if (applyFormErrors.leaveType) setApplyFormErrors((p) => ({ ...p, leaveType: '' })); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium ${leaveType === opt.title ? 'text-[#353535] bg-[#F0F2F7]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]'}`}>{opt.title}</button>
                                        ))}
                                    </div>
                                )}
                                {applyFormErrors.leaveType && <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveType}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-base font-semibold text-[#000000] mb-2">Leave From <span className="text-[#DD4342]">*</span></label>
                                    <div className="relative">
                                        <input type="date" min={todayInputDate} value={leaveFrom} onChange={(e) => { setLeaveFrom(e.target.value); if (leaveTo && e.target.value > leaveTo) setLeaveTo(''); if (applyFormErrors.leaveFrom) setApplyFormErrors((p) => ({ ...p, leaveFrom: '' })); if (applyFormErrors.leaveTo && leaveTo && e.target.value <= leaveTo) setApplyFormErrors((p) => ({ ...p, leaveTo: '' })); }} className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveFrom ? 'border border-[#DD4342]' : 'border-0'} bg-[#F2F3F4]`} style={{ colorScheme: 'light' }} />
                                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" /><line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" /><line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" /><line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" /></svg>
                                    </div>
                                    {applyFormErrors.leaveFrom && <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveFrom}</p>}
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-[#000000] mb-2">Leave To <span className="text-[#DD4342]">*</span></label>
                                    <div className="relative">
                                        <input type="date" min={todayInputDate} value={leaveTo} onChange={(e) => { setLeaveTo(e.target.value); if (applyFormErrors.leaveTo) setApplyFormErrors((p) => ({ ...p, leaveTo: '' })); }} className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${applyFormErrors.leaveTo ? 'border border-[#DD4342]' : 'border-0'} bg-[#F2F3F4]`} style={{ colorScheme: 'light' }} />
                                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" /><line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" /><line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" /><line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" /></svg>
                                    </div>
                                    {applyFormErrors.leaveTo && <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.leaveTo}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-base font-semibold text-[#000000] mb-2">Describe Your Reason <span className="text-[#DD4342]">*</span></label>
                                <textarea value={reason} onChange={(e) => { setReason(normalizeNameAndReason(e.target.value)); if (applyFormErrors.reason) setApplyFormErrors((p) => ({ ...p, reason: '' })); }} rows={3} placeholder="Enter your reason for leave..." className={`w-full px-4 py-2.5 rounded-lg text-sm text-[#353535] placeholder-[#8B8B8B] focus:outline-none focus:ring-1 focus:ring-[#D2D2D2] resize-none ${applyFormErrors.reason ? 'border border-[#DD4342]' : 'border-0'} bg-[#F2F3F4]`} />
                                {applyFormErrors.reason && <p className="mt-1.5 text-sm text-[#DD4342]">{applyFormErrors.reason}</p>}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={handleCloseEditModal} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-[#616161] bg-[#F2F2F2] hover:bg-[#E5E5E5] transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#DD4342] text-white rounded-lg font-semibold hover:bg-[#c43a39] active:scale-[0.98] transition-all shadow-sm">Update</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
