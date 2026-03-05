import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import viewIcon from '../../assets/BIMModeler/ManageLeave/view icon.svg';

interface LeaveEntry {
    id: number;
    slNo: number;
    employeeName: string;
    leaveType: string;
    appliedOn: string;
    currentStatus: string;
}

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave'];

const DUMMY_LEAVES: LeaveEntry[] = [
    { id: 1, slNo: 1, employeeName: 'John Doe', leaveType: 'Sick Leave', appliedOn: '01/03/2026', currentStatus: 'Approved' },
    { id: 2, slNo: 2, employeeName: 'Jane Smith', leaveType: 'Casual Leave', appliedOn: '28/02/2026', currentStatus: 'Pending' },
    { id: 3, slNo: 3, employeeName: 'Mike Johnson', leaveType: 'Earned Leave', appliedOn: '25/02/2026', currentStatus: 'Approved' },
    { id: 4, slNo: 4, employeeName: 'Sarah Williams', leaveType: 'Sick Leave', appliedOn: '20/02/2026', currentStatus: 'Rejected' },
    { id: 5, slNo: 5, employeeName: 'David Brown', leaveType: 'Casual Leave', appliedOn: '15/02/2026', currentStatus: 'Approved' },
    { id: 6, slNo: 6, employeeName: 'Emma Wilson', leaveType: 'Sick Leave', appliedOn: '12/02/2026', currentStatus: 'Approved' },
    { id: 7, slNo: 7, employeeName: 'James Davis', leaveType: 'Earned Leave', appliedOn: '10/02/2026', currentStatus: 'Pending' },
    { id: 8, slNo: 8, employeeName: 'Olivia Martinez', leaveType: 'Casual Leave', appliedOn: '08/02/2026', currentStatus: 'Approved' },
    { id: 9, slNo: 9, employeeName: 'William Taylor', leaveType: 'Sick Leave', appliedOn: '05/02/2026', currentStatus: 'Rejected' },
    { id: 10, slNo: 10, employeeName: 'Sophia Anderson', leaveType: 'Maternity Leave', appliedOn: '01/02/2026', currentStatus: 'Approved' },
];

const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
    { value: '0-100', label: '0-100', start: 0, end: 100 },
    { value: '101-200', label: '101-200', start: 100, end: 200 },
    { value: '201-300', label: '201-300', start: 200, end: 300 },
    { value: '301-400', label: '301-400', start: 300, end: 400 },
    { value: 'all', label: 'All', start: 0, end: null },
];

const PER_PAGE = 10;
const PAGINATION_VISIBLE = 4;

export default function ManageLeave() {
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null);
    const [leaveType, setLeaveType] = useState('');
    const [leaveFrom, setLeaveFrom] = useState('');
    const [leaveTo, setLeaveTo] = useState('');
    const [reason, setReason] = useState('');

    const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
    const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
    const leaveTypeDropdownRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationWindowStart, setPaginationWindowStart] = useState(1);

    const [leaves] = useState<LeaveEntry[]>(DUMMY_LEAVES);

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

    const handleSubmitApply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!leaveType) return;
        const trimmedReason = reason.trim();
        if (!trimmedReason) return;
        // TODO: API submit
        setLeaveType('');
        setLeaveFrom('');
        setLeaveTo('');
        setReason('');
        setApplyModalOpen(false);
    };

    const handleCloseModal = () => {
        setApplyModalOpen(false);
        setLeaveType('');
        setLeaveFrom('');
        setLeaveTo('');
        setReason('');
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
                                <th className="px-4 py-4 text-center text-base font-bold">Leave Type</th>
                                <th className="px-4 py-4 text-center text-base font-bold">Applied On</th>
                                <th className="px-4 py-4 text-center text-base font-bold">Status</th>
                                <th className="px-4 py-4 text-center text-base font-bold rounded-tr-2xl">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayedList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
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
                                            <td className="px-4 py-3 text-center text-sm text-gray-600 font-medium">{slNo}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-800 font-semibold">{row.employeeName}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-600">{row.leaveType}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-600">{row.appliedOn}</td>
                                            <td className="px-4 py-3 text-center text-sm font-medium">
<span className={`px-2 py-0.5 rounded ${row.currentStatus === 'Approved' ? 'bg-[#E1F6EB] text-[#008F22]' : row.currentStatus === 'Rejected' ? 'bg-[#FFD9D9] text-[#E00100]' : 'bg-amber-100 text-amber-700'}`}>
                                                {row.currentStatus}
                                            </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => handleView(row)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#DD4342] text-white rounded-md font-medium shadow-sm transition-opacity"
                                                >
                                                    <img src={viewIcon} alt="" className="w-[18px] h-[18px] shrink-0 [filter:brightness(0)_invert(1)]" />
                                                    View
                                                </button>
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
                                                setLeaveTypeOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors ${!leaveType ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'}`}
                                        >
                                            Nothing selected
                                        </button>
                                        {LEAVE_TYPES.map((type) => {
                                            const isSelected = leaveType === type;
                                            return (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaveType(type);
                                                        setLeaveTypeOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors ${isSelected ? 'text-black bg-[#F0F2F7]' : 'text-gray-500 hover:text-black hover:bg-[#F0F2F7] active:text-black active:bg-[#F0F2F7]'}`}
                                                >
                                                    {type}
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
                                    <span className="w-[140px] shrink-0 font-semibold text-black">Sl.No</span>
                                    <span className="shrink-0 text-black">:</span>
                                    <span className="text-[#8B8B8B]">{selectedLeave.slNo}</span>
                                </div>
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
