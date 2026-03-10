import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';

interface LocationEntry {
    id: number;
    full_name?: string;
    /** Original attendance date string (d-m-Y or Y-m-d) */
    date?: string | null;
    /** Normalised ISO date from backend (YYYY-MM-DD) */
    date_iso?: string | null;
    /** Time in from attendance table (HH:MM:SS or datetime format) */
    time_in?: string | null;
    /** Time out from attendance table, if available (HH:MM:SS or datetime format) */
    time_out?: string | null;
    /** Calculated total hours (HH:MM:SS format), if available */
    total_hours?: string | null;
    /** Derived status (Online / Offline) */
    status?: 'Online' | 'Offline' | string | null;
}

export default function TrackerTD() {
    const [list, setList] = useState<LocationEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [statusOpen, setStatusOpen] = useState(false);
    const statusOptions = ['', 'Available', 'Busy'];
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
        { value: '0-100', label: '0-100', start: 0, end: 100 },
        { value: '101-200', label: '101-200', start: 100, end: 200 },
        { value: '201-300', label: '201-300', start: 200, end: 300 },
        { value: '301-400', label: '301-400', start: 300, end: 400 },
        { value: 'all', label: 'All', start: 0, end: null },
    ];
    const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);

    const PER_PAGE = 10;
    const PAGINATION_VISIBLE = 4; // show 4 page buttons at a time
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationWindowStart, setPaginationWindowStart] = useState(1); // 1-based start of visible 4 buttons
    const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Select Date';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    // Convert a date string into YYYY-MM-DD for filtering.
    // Prefer ISO date from backend (date_iso); fall back to parsing the raw date string.
    const toLocalDateKey = (date_iso?: string | null, rawDate?: string | null): string => {
        if (date_iso) return date_iso;
        const value = rawDate || '';
        if (!value) return '';
        // Try d-m-Y then Y-m-d
        const partsDash = value.split('-');
        if (partsDash.length === 3) {
            if (partsDash[0].length === 2) {
                // d-m-Y -> Y-m-d
                const [d, m, y] = partsDash;
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            if (partsDash[0].length === 4) {
                // already Y-m-d
                const [y, m, d] = partsDash;
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
        }
        return '';
    };

    // Extract only the time portion from a time or datetime string.
    // Examples:
    //  - "2026-03-03 17:25:41" -> "17:25:41"
    //  - "17:25:41" -> "17:25:41"
    const pickTime = (value?: string | null): string | null => {
        if (!value) return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        const parts = trimmed.split(' ');
        const timePart = parts[parts.length - 1];
        return timePart;
    };

    // Format total hours:
    // - If `hours` is a decimal number (e.g. "8.5"), convert to HH:MM:SS.
    // - Otherwise, if we have both timeIn and timeOut, calculate the difference.
    // - Fallback to "N/A" when not available.
    const formatTotalHours = (
        hours: string | null | undefined,
        timeIn?: string | null,
        timeOut?: string | null
    ): string => {
        if (hours && hours.trim() !== '') {
            const numHours = parseFloat(hours);
            if (!isNaN(numHours)) {
                const h = Math.floor(numHours);
                const m = Math.round((numHours - h) * 60);
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
            }
        }

        const tIn = timeIn ? pickTime(timeIn) : null;
        const tOut = timeOut ? pickTime(timeOut) : null;
        if (tIn && tOut) {
            try {
                const [h1, m1, s1] = tIn.split(':').map(Number);
                const [h2, m2, s2] = tOut.split(':').map(Number);
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
        return '-';
    };

    useEffect(() => {
        api
            .get<{ records?: LocationEntry[] }>('/api/attendance/tracker')
            .then(({ data }) => {
                const records = (data.records ?? []).map((item) => ({
                    ...item,
                }));
                setList(records);
            })
            .catch(() => {
                setList([]);
            })
            .finally(() => setLoading(false));
    }, []);

    // Fetch tasks for selected date to determine Availability / Busy
    useEffect(() => {
        const fetchTasksForDate = async () => {
            if (!selectedDate) {
                setBusyMap({});
                return;
            }
            try {
                const params: { condition: string } = { condition: '1' }; // management/team view
                const { data } = await api.get<{ tasks?: any[] }>('/api/tasks', { params });
                const tasks = data.tasks || [];
                const targetDate = selectedDate; // YYYY-MM-DD
                const busy: Record<string, boolean> = {};

                tasks.forEach((t) => {
                    const status = String(t.status || '').toLowerCase();
                    if (status === 'completed') return;

                    const rawDate: string =
                        t.start_time ||
                        t.Actual_start_time ||
                        t.due_date ||
                        '';
                    if (!rawDate) return;

                    const isoPart = String(rawDate).split('T')[0].split(' ')[0];
                    if (!isoPart || isoPart !== targetDate) return;

                    const name = (t.assigned_full_name || '').trim();
                    if (name) busy[name] = true;
                });

                setBusyMap(busy);
            } catch (err) {
                console.error('Error fetching tasks for TrackerTD:', err);
                setBusyMap({});
            }
        };

        fetchTasksForDate();
    }, [selectedDate]);

    // Close status dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setStatusOpen(false);
            }
        };
        if (statusOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [statusOpen]);

    // Close show entries dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showEntriesDropdownRef.current && !showEntriesDropdownRef.current.contains(event.target as Node)) {
                setShowEntriesOpen(false);
            }
        };
        if (showEntriesOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEntriesOpen]);

    // Reset to page 1 and window when show entries range changes
    useEffect(() => {
        setCurrentPage(1);
        setPaginationWindowStart(1);
    }, [selectedShowEntries]);

    const filteredList = list.filter((item) => {
        let matchesDate = true;
        let matchesStatus = true;

        if (selectedDate) {
            // selectedDate is already in YYYY-MM-DD format from the date input
            const itemDate = toLocalDateKey(item.date_iso, item.date ?? null);
            // Compare date strings directly
            matchesDate = itemDate === selectedDate;
        }

        if (selectedStatus) {
            const name = (item.full_name || '').trim();
            const status = name && busyMap[name] ? 'Busy' : 'Available';
            matchesStatus = status === selectedStatus;
        }

        return matchesDate && matchesStatus;
    });

    const selectedRange = showEntriesOptions.find(o => o.value === selectedShowEntries) ?? showEntriesOptions[0];
    const rangeStart = selectedRange.start;
    const rangeEnd = selectedRange.end === null ? filteredList.length : Math.min(selectedRange.end, filteredList.length);
    const listInRange = filteredList.slice(rangeStart, rangeEnd);
    const totalInRange = listInRange.length;
    const totalPages = Math.max(1, Math.ceil(totalInRange / PER_PAGE));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const displayedList = listInRange.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

    // Page ranges for pagination bar: 0-10, 11-20, 21-30, ... (no overlapping numbers)
    const pageRanges: { start: number; end: number; label: string }[] = [];
    for (let p = 1; p <= totalPages; p++) {
        const s = rangeStart + (p - 1) * PER_PAGE;
        const e = Math.min(rangeStart + p * PER_PAGE, rangeEnd);
        const label = s === 0 ? `0-${e}` : `${s + 1}-${e}`;
        pageRanges.push({ start: s, end: e, label });
    }
    const activePage = safePage;
    // Visible window of 4 page buttons: from paginationWindowStart (1-based)
    const maxWindowStart = Math.max(1, totalPages - PAGINATION_VISIBLE + 1);
    const visiblePageRanges = pageRanges.slice(paginationWindowStart - 1, paginationWindowStart - 1 + PAGINATION_VISIBLE);
    const canPrevWindow = paginationWindowStart > 1;
    const canNextWindow = paginationWindowStart <= totalPages - PAGINATION_VISIBLE;
    const goPrevWindow = () => setPaginationWindowStart((s) => Math.max(1, s - PAGINATION_VISIBLE));
    const goNextWindow = () => setPaginationWindowStart((s) => Math.min(s + PAGINATION_VISIBLE, maxWindowStart));

    const handleDownload = () => {
        if (filteredList.length === 0) return;

        const headers = ['Sl.No', 'Date', 'Employee Name', 'Time In', 'Time Out', 'Total Hours', 'Status'];
        const csvData = filteredList.map((loc, index) => {
            const slNo = (index + 1).toString().padStart(2, '0');
            const dateKey = toLocalDateKey(loc.date_iso, loc.date ?? null);
            const [y, m, d] = dateKey ? dateKey.split('-') : ['', '', ''];
            const formattedDate = dateKey ? `${d}/${m}/${y}` : '';

            const rawTimeIn = pickTime(loc.time_in) || '';
            const rawTimeOut = pickTime(loc.time_out) || '';
            const totalHours = formatTotalHours(loc.total_hours, rawTimeIn, rawTimeOut);

            const name = (loc.full_name || '').trim();
            const statusLabel = name && busyMap[name] ? 'Busy' : 'Available';

            return [
                slNo,
                formattedDate,
                loc.full_name || '-',
                rawTimeIn,
                rawTimeOut,
                totalHours,
                statusLabel
            ].map(val => `"${val || ''}"`).join(',');
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
        <div className="px-1 pt-1 pb-0 space-y-8 flex flex-col h-full bg-white">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="text-2xl font-semibold text-[#000000]">Employee Tracking</h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Select Date Filter */}
                    <div
                        className="relative flex items-center justify-between gap-2 px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all group min-w-[130px] cursor-pointer"
                        onClick={() => { dateInputRef.current?.showPicker?.(); dateInputRef.current?.focus(); }}
                    >
                        <span className={`text-sm font-medium flex-1 ${selectedDate ? 'text-[#353535]' : 'text-[#616161]'}`}>
                            {formatDate(selectedDate)}
                        </span>
                        {selectedDate && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate('');
                                }}
                                className="text-[#616161] hover:text-[#353535] transition-colors"
                                title="Clear date filter"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        )}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                            <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
                        </svg>
                        <input
                            ref={dateInputRef}
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            style={{ colorScheme: 'light' }}
                        />
                    </div>

                    {/* Status Custom Dropdown */}
                    <div className="relative min-w-[120px]" ref={statusDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setStatusOpen(o => !o);
                            }}
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer"
                        >
                            <span className={`text-sm font-medium ${selectedStatus ? 'text-[#353535]' : 'text-[#616161]'}`}>
                                {selectedStatus || 'Status'}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: statusOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {statusOpen && (
                            <div
                                className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[130px] py-1"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {statusOptions.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedStatus(opt);
                                            setStatusOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${selectedStatus === opt ? 'text-[#353535] bg-gray-50' : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'}`}
                                    >
                                        {opt === '' ? 'All Status' : opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Show entries dropdown - pill design: "Show:" + value + chevron */}
                    <div className="relative" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowEntriesOpen(o => !o);
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
                                className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {showEntriesOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedShowEntries(opt.value);
                                            setShowEntriesOpen(false);
                                        }}
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
                        className="flex items-center gap-2 px-4 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                                displayedList.map((loc, index) => {
                                    const baseIndex = rangeStart + (safePage - 1) * PER_PAGE + index;
                                    const slNo = (baseIndex + 1).toString().padStart(2, '0');
                                    const dateKey = toLocalDateKey(loc.date_iso, loc.date ?? null);
                                    const [y, m, d] = dateKey ? dateKey.split('-') : ['', '', ''];
                                    const formattedDate = dateKey ? `${d}/${m}/${y}` : '-';

                                    const timeIn = pickTime(loc.time_in) || '-';
                                    const timeOut = pickTime(loc.time_out) || '-';
                                    const totalHours = formatTotalHours(loc.total_hours, timeIn, timeOut);

                                    return (
                                        <tr key={loc.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{formattedDate}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-semibold font-gantari whitespace-nowrap align-middle">{loc.full_name ?? '-'}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{timeIn}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{timeOut}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{totalHours}</td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                                                {(() => {
                                                    const name = (loc.full_name || '').trim();
                                                    const statusLabel = name && busyMap[name] ? 'Busy' : 'Available';
                                                    const colorClass =
                                                        statusLabel === 'Busy'
                                                            ? 'bg-[#FCE8E8] text-[#D93025]'
                                                            : 'bg-[#E6F4EA] text-[#1E7E34]';
                                                    return (
                                                        <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari ${colorClass}`}>
                                                            {statusLabel}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination bar - pinned to bottom; right-aligned */}
            <div className="flex flex-wrap items-center justify-end mt-4 -mb-2 pt-0 pb-2 flex-shrink-0">
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


