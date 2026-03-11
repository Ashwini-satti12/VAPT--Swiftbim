import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';

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
    // Selected time used to determine Busy/Available at that time (HH:MM, 24h)
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [statusOpen, setStatusOpen] = useState(false);
    const statusOptions = ['', 'Available', 'Busy'];
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const timeInputRef = useRef<HTMLInputElement>(null);

    const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
        { value: 'show', label: 'Show', start: 0, end: 100 },
        { value: '101-200', label: '101-200', start: 100, end: 200 },
        { value: '201-300', label: '201-300', start: 200, end: 300 },
        { value: '301-400', label: '301-400', start: 300, end: 400 },
        { value: 'all', label: 'All', start: 0, end: null },
    ];
    const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);


    const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});

    const todayIso = (() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    })();

    const ensureTodayAndDefaultTime = () => {
        // Default time to current time (HH:MM)
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setSelectedTime((t) => (t ? t : `${hh}:${mm}`));
    };

    const formatTime12 = (time24: string) => {
        if (!time24) return 'select time';
        const [hhStr, mmStr] = time24.split(':');
        const hh = Number(hhStr);
        const mm = Number(mmStr || '0');
        if (Number.isNaN(hh) || Number.isNaN(mm)) return 'select time';
        const ampm = hh >= 12 ? 'PM' : 'AM';
        const h12 = hh % 12 === 0 ? 12 : hh % 12;
        return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`;
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
        ensureTodayAndDefaultTime();
        api
            // Ask backend for today's attendance only (backend expects YYYY-MM-DD)
            .get<{ records?: LocationEntry[] }>('/api/attendance/tracker', { params: { date: todayIso } })
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
    }, [todayIso]);

    // Fetch tasks for selected date to determine Availability / Busy
    useEffect(() => {
        const fetchTasksForDate = async () => {
            // date is always today for this tracker
            const targetDate = todayIso;
            try {
                const params: { condition: string } = { condition: '1' }; // management/team view
                const { data } = await api.get<{ tasks?: any[] }>('/api/tasks', { params });
                const tasks = data.tasks || [];
                const targetTime = selectedTime; // HH:MM (24h)
                const busy: Record<string, boolean> = {};

                const parseDateTime = (raw: any): Date | null => {
                    if (!raw) return null;
                    const s = String(raw).trim();
                    if (!s) return null;
                    // Normalize "YYYY-MM-DD HH:MM:SS" to ISO-like "YYYY-MM-DDTHH:MM:SS"
                    const isoLike = s.includes('T') ? s : s.replace(' ', 'T');
                    const d = new Date(isoLike);
                    return Number.isNaN(d.getTime()) ? null : d;
                };

                const sameDay = (d: Date) => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${dd}` === targetDate;
                };

                // Build selected datetime for comparisons
                let selectedDt: Date | null = null;
                if (targetTime && /^\d{2}:\d{2}$/.test(targetTime)) {
                    selectedDt = new Date(`${targetDate}T${targetTime}:00`);
                }

                tasks.forEach((t) => {
                    const status = String(t.status || '').toLowerCase();
                    if (status === 'completed') return;

                    const name = (t.assigned_full_name || '').trim();
                    if (!name) return;

                    // Determine task window
                    const start =
                        parseDateTime(t.start_time) ||
                        parseDateTime(t.Actual_start_time) ||
                        parseDateTime(t.due_date);
                    const end = parseDateTime(t.end_time) || parseDateTime(t.endTime) || null;

                    if (!start) return;
                    if (!sameDay(start)) return;

                    // If no selected time, treat any task on today as busy
                    if (!selectedDt) {
                        busy[name] = true;
                        return;
                    }

                    // If end exists, check overlap; otherwise assume busy from start time onward for today
                    if (end && !Number.isNaN(end.getTime())) {
                        if (selectedDt >= start && selectedDt <= end) busy[name] = true;
                    } else {
                        // start-only: busy if selected time is after start (same day)
                        if (selectedDt >= start) busy[name] = true;
                    }
                });

                setBusyMap(busy);
            } catch (err) {
                console.error('Error fetching tasks for TrackerTD:', err);
                setBusyMap({});
            }
        };

        fetchTasksForDate();
    }, [todayIso, selectedTime]);

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



    const filteredList = list.filter((item) => {
        let matchesStatus = true;

        if (selectedStatus) {
            const name = (item.full_name || '').trim();
            const status = name && busyMap[name] ? 'Busy' : 'Available';
            matchesStatus = status === selectedStatus;
        }

        return matchesStatus;
    });

    const selectedRange = showEntriesOptions.find(o => o.value === selectedShowEntries) ?? showEntriesOptions[0];
    const rangeStart = selectedRange.start;
    const rangeEnd = selectedRange.end === null ? filteredList.length : Math.min(selectedRange.end, filteredList.length);
    const listInRange = filteredList.slice(rangeStart, rangeEnd);
    const displayedList = listInRange;

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
                    {/* Time picker (today only, date hidden) */}
                    <div
                        className="flex items-center gap-2 px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all group min-w-[180px]"
                    >
                        <span className="text-sm font-semibold text-[#353535] ml-2">
                            {formatTime12(selectedTime)}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                timeInputRef.current?.showPicker?.();
                                timeInputRef.current?.focus();
                            }}
                            className="ml-1 text-[#616161] hover:text-[#353535] transition-colors"
                            title="Select time"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="9"></circle>
                                <path d="M12 7v5l3 2"></path>
                            </svg>
                        </button>
                        <input
                            ref={timeInputRef}
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="absolute opacity-0 pointer-events-none"
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
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer border-0"
                        >
                            <span className={`text-sm font-medium font-gantari ${selectedStatus ? 'text-[#353535]' : 'text-[#616161]'}`}>
                                {selectedStatus || 'Status'}
                            </span>
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className={`ml-2 w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${statusOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {statusOpen && (
                            <div
                                className="absolute top-full left-0 mt-1 z-50 bg-white rounded-md shadow-xl min-w-[130px] py-1"
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
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors ${selectedStatus === opt ? 'text-[#353535] bg-gray-100' : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'}`}
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
                                className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-xl min-w-[120px] py-1 max-h-[160px] overflow-y-auto custom-scrollbar"
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
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium font-gantari transition-colors ${selectedShowEntries === opt.value ? 'text-[#353535] bg-gray-100' : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'}`}
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
            <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                <div className="overflow-x-auto overflow-y-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-220px)]">
                    <table className="min-w-full border-collapse">
                        <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
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
                                    <td colSpan={7} className="px-3 py-20 text-center text-[#616161] font-medium font-gantari bg-white">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                displayedList.map((loc, index) => {
                                    const baseIndex = rangeStart + index;
                                    const slNo = (baseIndex + 1).toString().padStart(2, '0');
                                    const dateKey = toLocalDateKey(loc.date_iso, loc.date ?? null);
                                    const [y, m, d] = dateKey ? dateKey.split('-') : ['', '', ''];
                                    const formattedDate = dateKey ? `${d}/${m}/${y}` : '-';

                                    const timeIn = pickTime(loc.time_in) || '-';
                                    const timeOut = pickTime(loc.time_out) || '-';
                                    const totalHours = formatTotalHours(loc.total_hours, timeIn, timeOut);

                                    return (
                                        <tr key={loc.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{formattedDate}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-semibold font-gantari whitespace-nowrap align-middle">{loc.full_name ?? '-'}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{timeIn}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{timeOut}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{totalHours}</td>
                                            <td className="px-3 py-6 text-center whitespace-nowrap align-middle">

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


