import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import viewIcon from '../../assets/BIMModeler/ManageLeave/view icon.svg';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';

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

const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
    { value: 'show', label: 'Show', start: 0, end: 50 },
    { value: '0-50', label: '0-50', start: 0, end: 50 },
    { value: '50-100', label: '50-100', start: 50, end: 100 },
    { value: '100-150', label: '100-150', start: 100, end: 150 },
    { value: '150-200', label: '150-200', start: 150, end: 200 },
    { value: '200-250', label: '200-250', start: 200, end: 250 },
    { value: '250-300', label: '250-300', start: 250, end: 300 },
    { value: 'all', label: 'All', start: 0, end: null },
];



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
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null);
    const [leaves, setLeaves] = useState<LeaveEntry[]>([]);

    const [selectedEmployee, setSelectedEmployee] = useState<string>('All');
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const employeeDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
    const dropdownContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showEntriesOpen && dropdownContentRef.current) {
            dropdownContentRef.current.scrollTop = 0;
        }
    }, [showEntriesOpen]);


    const employeeOptions = ['All', ...Array.from(new Set(leaves.map((l) => l.employeeName)))];

    // Load leave applications from backend
    useEffect(() => {
        const fetchLeaves = async () => {
            try {
                const { data } = await api.get<{ applications?: any[] }>('/api/leave/applications');
                const apps = data.applications || [];
                const mapped: LeaveEntry[] = apps.map((app, index) => ({
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
                setLeaves(mapped);
            } catch (err) {
                console.error('Failed to load leaves from backend', err);
                setLeaves(DUMMY_LEAVES);
            }
        };

        fetchLeaves();
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



    const filteredList = leaves.filter((l) => selectedEmployee === 'All' || l.employeeName === selectedEmployee);
    const selectedRange = showEntriesOptions.find((o) => o.value === selectedShowEntries) ?? showEntriesOptions[0];
    const rangeStart = selectedRange.start;
    const rangeEnd = selectedRange.end === null ? filteredList.length : Math.min(selectedRange.end, filteredList.length);
    const listInRange = filteredList.slice(rangeStart, rangeEnd);
    const displayedList = listInRange;

    const handleView = (row: LeaveEntry) => {
        setSelectedLeave(row);
        setViewModalOpen(true);
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

    // Technical Director can approve/reject all leaves except their own
    const canActOnLeave = (row: LeaveEntry): boolean => {
        const currentName = (user?.full_name || '').trim();
        if (!currentName) return false;
        // Do not act on own leave applications
        return row.employeeName.trim() !== currentName;
    };

    return (
        <div className="px-1 pt-1 pb-0 space-y-8 flex flex-col h-full bg-white font-gantari">
            <div className="flex-1 min-h-0 flex flex-col">
            {/* Page header: heading left; Employee + Show entries right */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2 mb-8">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="text-2xl font-semibold text-[#000000]">Manage Leaves</h2>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative" ref={employeeDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeDropdownOpen((o) => !o);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer border-0"
                        >
                            <span className="text-sm font-medium text-[#353535] font-gantari">Employee:</span>
                            <span className="text-sm font-medium text-[#353535] font-gantari truncate max-w-[100px]">{selectedEmployee}</span>
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className={`ml-2 w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${employeeDropdownOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {employeeDropdownOpen && (
                            <div
                                className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-xl min-w-[160px] max-h-[240px] overflow-y-auto py-1 custom-scrollbar"
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
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors truncate ${isSelected ? 'text-[#353535] bg-gray-100' : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'}`}
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
                            onClick={(e) => { e.stopPropagation(); setShowEntriesOpen(o => !o); }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer border-0"
                        >
                            {selectedShowEntries === 'show' ? (
                                <span className="text-sm font-medium text-[#616161] font-gantari">Show</span>
                            ) : (
                                <>
                                    <span className="text-sm font-medium text-[#353535] font-gantari">Show:</span>
                                    <span className="text-sm font-medium text-[#353535] font-gantari">{selectedRange.label}</span>
                                </>
                            )}
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className={`ml-2 w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {showEntriesOpen && (
                            <div
                                ref={dropdownContentRef}
                                className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1 max-h-[160px] overflow-y-auto custom-scrollbar"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {showEntriesOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setSelectedShowEntries(opt.value); setShowEntriesOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium font-gantari transition-colors ${selectedShowEntries === opt.value ? 'text-[#353535] bg-gray-100' : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Section - standardized rounded-xl container */}
            <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col relative">
                <div className="overflow-auto custom-scrollbar smooth-scroll pb-0">
                    <table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-[#FFFFFF] after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                            <tr className="border-b border-gray-100 bg-[#FFFFFF]">
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Sl.No</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Employee Name</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Role</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Leave Type</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">From Date</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">To Date</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Status</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-[#FFFFFF] font-gantari whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {displayedList.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-3 py-12 text-center text-gray-400 font-medium font-gantari bg-white">
                                        No leave records found
                                    </td>
                                </tr>
                            ) : (
                                displayedList.map((row, index) => {
                                    const slNo = rangeStart + index + 1;
                                    return (
                                        <tr
                                            key={row.id}
                                            className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}
                                        >
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{String(slNo).padStart(2, '0')}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-semibold font-gantari whitespace-nowrap align-middle">{row.employeeName}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{row.role ?? '–'}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{row.leaveType}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{row.fromDate ?? '–'}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{row.toDate ?? '–'}</td>
                                            <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                                                <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari ${row.currentStatus === 'Approved' ? 'bg-[#E1F6EB] text-[#008F22]' : row.currentStatus === 'Rejected' ? 'bg-[#FFE5E5] text-[#C62828]' : 'bg-[#FFF8E1] text-[#F57C00]'}`}>
                                                    {row.currentStatus}
                                                </span>
                                            </td>
                                            <td className="px-3 py-6 text-center whitespace-nowrap align-middle">
                                                <div className="flex items-center justify-center gap-4 flex-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleView(row)}
                                                        className="inline-flex items-center gap-2 mx-auto px-4 py-3 rounded-md text-xs font-bold font-gantari transition-all bg-[#DD4342] text-white shadow-sm shadow-red-100 shrink-0"
                                                    >
                                                        <img src={viewIcon} alt="" className="w-4 h-4 object-contain [filter:brightness(0)_invert(1)]" />
                                                        View
                                                    </button>
                                                    {row.currentStatus === 'Pending' && canActOnLeave(row) ? (
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



            {/* View Leave Modal */}
            {viewModalOpen && selectedLeave && (
                createPortal(
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
                )
            )}
            </div>
        </div>
    );
}
