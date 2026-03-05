import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';

interface AttendanceEntry {
  id: number;
  employee_id?: string;
  full_name?: string;
  date?: string; // DD-MM-YYYY format
  date_iso?: string; // YYYY-MM-DD format
  time_in?: string; // HH:MM:SS format
  time_out?: string | null; // HH:MM:SS format or null
  total_hours?: string | null; // hours as string or null
  status?: string; // "Online" or "Offline"
}

export default function TrackerBC() {
    const [list, setList] = useState<AttendanceEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [statusOpen, setStatusOpen] = useState(false);
    const statusOptions = ['', 'Online', 'Offline'];
    const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
        { value: '0-100', label: '0-100', start: 0, end: 100 },
        { value: '101-200', label: '101-200', start: 100, end: 200 },
        { value: '201-300', label: '201-300', start: 200, end: 300 },
        { value: '301-400', label: '301-400', start: 300, end: 400 },
        { value: 'all', label: 'All', start: 0, end: null },
    ];
    const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const PER_PAGE = 10;
    const PAGINATION_VISIBLE = 4;
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationWindowStart, setPaginationWindowStart] = useState(1);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Select Date';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    // Determine status from attendance data
    const getStatus = (entry: AttendanceEntry): 'Online' | 'Offline' => {
        const statusStr = String(entry.status || '').trim();
        if (statusStr.toLowerCase() === 'online') return 'Online';
        if (statusStr.toLowerCase() === 'offline') return 'Offline';
        // If status is not set, determine from time_out
        if (!entry.time_out || entry.time_out.trim() === '' || entry.time_out === 'null') {
            return 'Online';
        }
        return 'Offline';
    };

    // Extract pure time (HH:MM:SS) from a time or datetime string
    const extractTime = (value: string): string => {
        const trimmed = value.trim();
        if (!trimmed) return trimmed;
        // Match the first occurrence of H:MM:SS or HH:MM:SS
        const match = trimmed.match(/(\d{1,2}:\d{2}:\d{2})/);
        return match ? match[1] : trimmed;
    };

    // Format time to HH:MM:SS (24‑hour) for display
    const formatTime = (timeStr: string | null | undefined): string => {
        if (!timeStr || timeStr.trim() === '') return 'N/A';
        try {
            const pure = extractTime(timeStr);
            const [hours, minutes, seconds = '00'] = pure.split(':');
            const h = hours.padStart(2, '0');
            const m = minutes.padStart(2, '0');
            const s = seconds.padStart(2, '0');
            return `${h}:${m}:${s}`;
        } catch {
            return timeStr;
        }
    };

    // Format total hours
    const formatTotalHours = (hours: string | null | undefined, timeIn?: string, timeOut?: string | null): string => {
        if (hours && hours.trim() !== '') {
            const numHours = parseFloat(hours);
            if (!isNaN(numHours)) {
                const h = Math.floor(numHours);
                const m = Math.round((numHours - h) * 60);
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
            }
        }
        // If no total_hours, try to calculate from time_in and time_out
        if (timeIn && timeOut) {
            try {
                const [h1, m1, s1] = timeIn.split(':').map(Number);
                const [h2, m2, s2] = timeOut.split(':').map(Number);
                const totalSeconds = (h2 * 3600 + m2 * 60 + s2) - (h1 * 3600 + m1 * 60 + s1);
                if (totalSeconds > 0) {
                    const h = Math.floor(totalSeconds / 3600);
                    const m = Math.floor((totalSeconds % 3600) / 60);
                    const s = totalSeconds % 60;
                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                }
            } catch {
                // Ignore calculation errors
            }
        }
        return 'N/A';
    };

    // Handle click outside for dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setStatusOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch attendance data when date changes
    useEffect(() => {
        setLoading(true);
        const params: { date?: string } = {};
        if (selectedDate) {
            params.date = selectedDate; // API expects YYYY-MM-DD format
        }

        api
            .get<{ records?: AttendanceEntry[] }>('/api/attendance/tracker', { params })
            .then(({ data }) => {
                const records = data.records || [];
                setList(records);
            })
            .catch((error) => {
                console.error('Error fetching attendance data:', error);
                setList([]);
            })
            .finally(() => setLoading(false));
    }, [selectedDate]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) setStatusOpen(false);
            if (showEntriesDropdownRef.current && !showEntriesDropdownRef.current.contains(event.target as Node)) setShowEntriesOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setCurrentPage(1);
        setPaginationWindowStart(1);
    }, [selectedShowEntries, selectedStatus]);

    const filteredList = list.filter((item) => {
        let matchesStatus = true;

        // Date filtering is handled by API, so we don't need to filter by date here
        // But we can still filter by status on the client side
        if (selectedStatus) {
            const itemStatus = getStatus(item);
            matchesStatus = itemStatus === selectedStatus;
        }

        return matchesStatus;
    });

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
    const visiblePageRanges = pageRanges.slice(paginationWindowStart - 1, paginationWindowStart - 1 + PAGINATION_VISIBLE);
    const canPrevWindow = paginationWindowStart > 1;
    const canNextWindow = paginationWindowStart <= totalPages - PAGINATION_VISIBLE;
    const goPrevWindow = () => setPaginationWindowStart((s) => Math.max(1, s - PAGINATION_VISIBLE));
    const goNextWindow = () => setPaginationWindowStart((s) => Math.min(s + PAGINATION_VISIBLE, maxWindowStart));

    const handleDownload = () => {
        if (filteredList.length === 0) return;

        const headers = ['Sl.No', 'Date', 'Employee Name', 'Time In', 'Time Out', 'Total Hours', 'Status'];
        const csvData = filteredList.map((entry, index) => {
            const slNo = (index + 1).toString().padStart(2, '0');
            // Format date from DD-MM-YYYY to DD/MM/YYYY
            const formattedDate = entry.date ? entry.date.replace(/-/g, '/') : 'N/A';
            const timeIn = formatTime(entry.time_in);
            const timeOut = formatTime(entry.time_out);
            const totalHours = formatTotalHours(entry.total_hours, entry.time_in, entry.time_out);
            const status = getStatus(entry);

            return [
                slNo,
                formattedDate,
                entry.full_name || 'N/A',
                timeIn,
                timeOut,
                totalHours,
                status
            ].map(val => `"${val}"`).join(',');
        });

        const csvContent = [headers.join(','), ...csvData].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
        link.setAttribute('href', url);
        link.setAttribute('download', `tracking-report-${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="p-1 md:p-6 space-y-8 flex flex-col h-full bg-white">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="text-2xl font-bold text-gray-900">Employee Tracking</h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Select Date Filter */}
                    <div className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-md transition-all cursor-pointer group min-w-[130px]">
                        <span className={`text-sm font-medium ${selectedDate ? 'text-[#353535]' : 'text-[#616161]'}`}>
                            {formatDate(selectedDate)}
                        </span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                            <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
                        </svg>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            style={{ colorScheme: 'light' }}
                        />
                    </div>

                    {/* Status Custom Dropdown */}
                    <div className="relative min-w-[120px]" ref={statusDropdownRef}>
                        <button type="button" onClick={() => setStatusOpen(o => !o)}
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#EAEAEA] rounded-md transition-all cursor-pointer">
                            <span className={`text-sm font-medium ${selectedStatus ? 'text-[#353535]' : 'text-[#616161]'}`}>
                                {selectedStatus || 'Status'}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: statusOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {statusOpen && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[130px] py-1">
                                {statusOptions.map(opt => (
                                    <button key={opt} type="button" onClick={() => { setSelectedStatus(opt); setStatusOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${selectedStatus === opt ? 'text-[#353535]' : 'text-[#616161] hover:text-[#353535]'}`}>
                                        {opt === '' ? 'Status' : opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Show entries dropdown - same design as TrackerTD */}
                    <div className="relative" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowEntriesOpen((o) => !o); }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer border-0"
                        >
                            <span className="text-sm font-medium text-[#353535] font-gantari">Show:</span>
                            <span className="text-sm font-medium text-[#353535] font-gantari">{selectedRange.label}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#353535" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: showEntriesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {showEntriesOpen && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1" onMouseDown={(e) => e.preventDefault()}>
                                {showEntriesOptions.map((opt) => (
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

                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        disabled={filteredList.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 15V3M12 15L8 11M12 15L16 11M5 20H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[16px]">Download</span>
                    </button>
                </div>
            </div>

            {/* Table Section - scrollable when many rows */}
            <div className="bg-white rounded-2xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-280px)] pr-1 pb-0">
                    <table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-white">
                            <tr className="border-b border-gray-100 bg-white">
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Date</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Employee Name</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Time In</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Time Out</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Total Hours</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {displayedList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-12 text-center text-gray-400 font-medium font-gantari bg-white">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                displayedList.map((entry, index) => {
                                    const baseIndex = rangeStart + (safePage - 1) * PER_PAGE + index;
                                    const slNo = (baseIndex + 1).toString().padStart(2, '0');
                                    const formattedDate = entry.date ? entry.date.replace(/-/g, '/') : 'N/A';
                                    const timeIn = formatTime(entry.time_in);
                                    const timeOut = formatTime(entry.time_out);
                                    const totalHours = formatTotalHours(entry.total_hours, entry.time_in, entry.time_out);
                                    const status = getStatus(entry);
                                    return (
                                        <tr key={entry.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{formattedDate}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-semibold font-gantari whitespace-nowrap align-middle">{entry.full_name ?? 'N/A'}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{timeIn}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{timeOut}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{totalHours}</td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari ${status === 'Online' ? 'bg-[#E6F4EA] text-[#1E7E34]' : 'bg-[#FCE8E8] text-[#D93025]'}`}>
                                                    {status}
                                                </span>
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
            <div className="flex flex-wrap items-center justify-end mt-auto -mb-8 pt-0 pb-2 flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap bg-[#EEEEEE] rounded-xl px-4 py-1">
                    <span className="text-[#666666] text-sm font-medium font-gantari">Showing:</span>
                    <button type="button" onClick={goPrevWindow} disabled={!canPrevWindow} className="flex items-center gap-1 text-[#666666] text-sm font-medium font-gantari hover:text-[#353535] disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                        Prev
                    </button>
                    {visiblePageRanges.map((pr) => {
                        const pageNum = Math.floor((pr.start - rangeStart) / PER_PAGE) + 1;
                        const isActive = pageNum === activePage;
                        return (
                            <button key={pr.label} type="button" onClick={() => setCurrentPage(pageNum)} className={`px-3 py-1.5 rounded-md text-sm font-medium font-gantari transition-colors ${isActive ? 'bg-[#DD4342] text-white' : 'text-[#666666] hover:text-[#353535] hover:bg-gray-200'}`}>
                                {pr.label}
                            </button>
                        );
                    })}
                    <button type="button" onClick={goNextWindow} disabled={!canNextWindow} className="flex items-center gap-1 text-[#666666] text-sm font-medium font-gantari hover:text-[#353535] disabled:opacity-50 disabled:cursor-not-allowed">
                        Next
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                </div>
            </div>

            <style>{`
        .smooth-scroll {
          scroll-behavior: smooth;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #8c8c8c #f3f3f3;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f3f3;
          border-radius: 20px;
          margin: 10px 0;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #8c8c8c;
          border-radius: 20px;
          border: 2px solid #f3f3f3;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #666666;
        }
      `}</style>
        </div>
    );
}


