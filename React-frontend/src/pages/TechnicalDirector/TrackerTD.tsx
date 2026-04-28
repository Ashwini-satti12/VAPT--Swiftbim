
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';

interface LocationEntry {
    id: number;
    employee_db_id?: number | null;
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

    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [employeeOpen, setEmployeeOpen] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [statusOpen, setStatusOpen] = useState(false);
    const statusOptions = ['', 'Available', 'Busy'];
    const statusDropdownRef = useRef<HTMLDivElement>(null);


    const SHOW_ENTRIES_PLACEHOLDER = 'Show Entries';
    const SHOW_ENTRIES_SELECTED_PREFIX = 'Show:';
    const showEntriesOptions: { value: string; label: string; start: number; end: number | null }[] = [
        { value: '1-50', label: '1-50', start: 0, end: 50 },
        { value: '51-100', label: '51-100', start: 50, end: 100 },
        { value: '101-150', label: '101-150', start: 100, end: 150 },
        { value: '151-200', label: '151-200', start: 150, end: 200 },
        { value: '201-250', label: '201-250', start: 200, end: 250 },
        { value: '251-300', label: '251-300', start: 250, end: 300 },
        { value: 'all', label: 'All', start: 0, end: null },
    ];
    const [selectedShowEntries, setSelectedShowEntries] = useState('1-50');
    const [tableCurrentPage, setTableCurrentPage] = useState(1);
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
    const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
    const employeeDropdownRef = useRef<HTMLDivElement>(null);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (showEntriesOpen && showEntriesDropdownContentRef.current) {
            showEntriesDropdownContentRef.current.scrollTop = 0;
        }
    }, [showEntriesOpen]);


    const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
    const employeeOptions = Array.from(
        new Set(list.map((item) => (item.full_name || '').trim()).filter(Boolean)),
    );
    const employeeOptionsFiltered = employeeOptions.filter((name) =>
        name.toLowerCase().includes(employeeSearch.toLowerCase()),
    );

    const todayIso = (() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    })();




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
            // Ask backend for today's attendance only (backend expects YYYY-MM-DD)
            .get<{ records?: LocationEntry[] }>('/api/attendance/tracker', {
                params: { date: todayIso, roles: 'BIM Coordinator,BIM Modeler,BIM Moduler' },
            })
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
                const busy: Record<string, boolean> = {};

                // Calendar date of task (YYYY-MM-DD)
                const taskDateKey = (t: any): string | null => {
                    const rawDate: string =
                        t.start_time || t.Actual_start_time || t.due_date || '';
                    if (!rawDate) return null;
                    const isoPart = String(rawDate).split('T')[0].split(' ')[0];
                    return isoPart || null;
                };

                tasks.forEach((t) => {
                    const status = String(t.status || '').toLowerCase();
                    if (status === 'completed') return;

                    const assignedIdRaw = (t as any).assigned_to ?? (t as any).assignedTo ?? (t as any).assigned_to_id;
                    const assignedKey =
                        assignedIdRaw != null && String(assignedIdRaw).trim() !== ''
                            ? String(assignedIdRaw)
                            : '';
                    const name = (t.assigned_full_name || '').trim();
                    if (!assignedKey && !name) return;

                    const dateKey = taskDateKey(t);
                    if (!dateKey || dateKey !== targetDate) return;

                    if (assignedKey) busy[assignedKey] = true;
                    if (name) busy[name] = true;
                });

                setBusyMap(busy);
            } catch (err) {
                console.error('Error fetching tasks for TrackerTD:', err);
                setBusyMap({});
            }
        };

        fetchTasksForDate();
    }, [todayIso]);

    // Close status dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setStatusOpen(false);
            }
            if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
                setEmployeeOpen(false);
            }
        };
        if (statusOpen || employeeOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [statusOpen, employeeOpen]);

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



    const searchQuery = searchParams.get('q')?.toLowerCase() || "";

    const filteredList = list.filter((item) => {
        let matchesStatus = true;
        let matchesEmployee = true;

        if (selectedStatus) {
            const name = (item.full_name || '').trim();
            const entryKey = item.employee_db_id != null ? String(item.employee_db_id) : name;
            const status =
                (entryKey && busyMap[entryKey]) || (name && busyMap[name]) ? 'Busy' : 'Available';
            matchesStatus = status === selectedStatus;
        }
        if (selectedEmployee) {
            matchesEmployee = (item.full_name || '').trim() === selectedEmployee;
        }



        const matchesSearch = !searchQuery ||
            (item.full_name || "").toLowerCase().includes(searchQuery) ||
            (item.date || "").toLowerCase().includes(searchQuery) ||
            (item.date_iso || "").toLowerCase().includes(searchQuery) ||
            (item.time_in || "").toLowerCase().includes(searchQuery) ||
            (item.time_out || "").toLowerCase().includes(searchQuery);

        return matchesStatus && matchesEmployee && matchesSearch;
    });

    const effectiveShowEntryValue = selectedShowEntries || showEntriesOptions[0].value;
    const selectedRange = showEntriesOptions.find(o => o.value === effectiveShowEntryValue) ?? showEntriesOptions[0];
    const rangeStart = selectedRange.start;
    const rangeEnd = selectedRange.end === null ? filteredList.length : Math.min(selectedRange.end, filteredList.length);
    const listInRange = filteredList.slice(rangeStart, rangeEnd);
    const tableRowsPerPage = 5;
    const tableTotalPages = Math.max(1, Math.ceil(listInRange.length / tableRowsPerPage));
    const safeTableCurrentPage = Math.min(tableCurrentPage, tableTotalPages);
    const tablePageStartIndex = (safeTableCurrentPage - 1) * tableRowsPerPage;
    const displayedList = listInRange.slice(tablePageStartIndex, tablePageStartIndex + tableRowsPerPage);
    const tablePageRangeStart = listInRange.length === 0 ? 0 : rangeStart + tablePageStartIndex + 1;
    const tablePageRangeEnd = listInRange.length === 0 ? 0 : Math.min(rangeStart + tablePageStartIndex + tableRowsPerPage, rangeEnd);
    const tablePageRangeLabel = listInRange.length === 0 ? "0-0" : `${tablePageRangeStart}-${tablePageRangeEnd}`;

    useEffect(() => {
        setTableCurrentPage(1);
    }, [selectedShowEntries, selectedEmployee, selectedStatus, searchQuery]);

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
            const entryKey = loc.employee_db_id != null ? String(loc.employee_db_id) : name;
            const statusLabel =
                (entryKey && busyMap[entryKey]) || (name && busyMap[name]) ? 'Busy' : 'Available';

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
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 flex-shrink-0 px-2">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="text-2xl font-semibold text-[#000000]">Employee Tracking</h2>
                </div>

                <div className="flex flex-col items-stretch md:items-end gap-3 w-full md:w-auto">
                    <div className="order-2 flex flex-wrap items-center justify-end gap-3">
                    {/* Employee Filter */}
                    <div className="relative min-w-[190px]" ref={employeeDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeOpen((o) => !o);
                            }}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md text-sm font-semibold font-gantari text-[#353535] border-0 cursor-pointer"
                        >
                            <span className={`${selectedEmployee ? 'text-[#353535]' : 'text-[#8B8B8B]'}`}>
                                {selectedEmployee || 'Select Employee'}
                            </span>
                            <img
                                src={ArrowDown}
                                alt=""
                                className={`w-3 h-3 shrink-0 transition-transform duration-200 ${employeeOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {employeeOpen && (
                            <div className="absolute top-full left-0 mt-2 z-[220] bg-white border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)] w-full overflow-hidden">
                                <div className="p-2">
                                    <input
                                        type="text"
                                        value={employeeSearch}
                                        onChange={(e) => setEmployeeSearch(e.target.value)}
                                        placeholder="Search employee..."
                                        className="w-full px-3 py-2 bg-[#F2F2F2] rounded-md text-[14px] text-[#353535] outline-none"
                                    />
                                </div>
                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar pb-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedEmployee('');
                                            setEmployeeOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-[14px] text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                                    >
                                        Show All
                                    </button>
                                    {employeeOptionsFiltered.map((name) => (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => {
                                                setSelectedEmployee(name);
                                                setEmployeeOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-[14px] hover:bg-[#F2F2F2] cursor-pointer ${selectedEmployee === name ? 'text-[#353535] bg-[#F2F2F2]' : 'text-[#8B8B8B]'}`}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>



                    {/* Status Custom Dropdown */}
                    <div className="relative min-w-[120px]" ref={statusDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setStatusOpen(o => !o);
                            }}
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0"
                        >
                            <span className={`text-[14px] font-semibold ${selectedStatus ? 'text-[#353535]' : 'text-[#8B8B8B]'}`}>
                                {selectedStatus || 'Status'}
                            </span>
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className={`w-3 h-3 shrink-0 transition-transform duration-200 ${statusOpen ? 'rotate-180' : ''} ${selectedStatus === '' ? 'opacity-60 grayscale' : 'opacity-90'}`}
                            />
                        </button>
                        {statusOpen && (
                            <div
                                className="absolute top-full left-0 mt-1 z-[200] bg-white border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] min-w-[130px] overflow-hidden"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {statusOptions.map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedStatus(opt);
                                                setStatusOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-[14px] font-gantari transition-colors cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${selectedStatus === opt ? 'text-[#353535] bg-[#F2F2F2]' : 'text-[#8B8B8B] bg-transparent'}`}
                                        >
                                            {opt === '' ? 'Status' : opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative w-[140px]" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowEntriesOpen(o => !o); }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
                        >
                            <span className={`min-w-0 flex-1 truncate overflow-hidden text-left text-sm ${selectedShowEntries === '' ? 'text-[#8B8B8B]' : 'text-[#353535]'}`}>
                                {selectedShowEntries === '' ? (
                                    SHOW_ENTRIES_PLACEHOLDER
                                ) : (
                                    <>
                                        <span className="text-[14px]">{SHOW_ENTRIES_SELECTED_PREFIX}</span>{' '}
                                        <span className="font-semibold">{selectedRange.label}</span>
                                    </>
                                )}
                            </span>
                            <img
                                src={ArrowDown}
                                alt=""
                                className={`w-3 h-3 shrink-0 transition-transform duration-200 ${showEntriesOpen ? 'rotate-180' : ''} ${selectedShowEntries === '' ? 'opacity-60 grayscale' : 'opacity-90'}`}
                                aria-hidden
                            />
                        </button>
                        {showEntriesOpen && (
                            <div className="absolute top-full right-0 left-auto mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                                <div ref={showEntriesDropdownContentRef} className="max-h-[168px] overflow-y-auto custom-scrollbar">
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedShowEntries(''); setShowEntriesOpen(false); }}
                                        className="w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
                                    >
                                        {SHOW_ENTRIES_PLACEHOLDER}
                                    </button>
                                    {showEntriesOptions.map((opt) => {
                                        const isChosen = selectedShowEntries === opt.value;
                                        return (
                                            <button
                                                key={`${opt.value}-${opt.start}-${String(opt.end)}`}
                                                type="button"
                                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedShowEntries(opt.value); setShowEntriesOpen(false); }}
                                                className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen ? 'text-[#353535] bg-[#F2F2F2]' : 'text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]'}`}
                                            >
                                                <span className="truncate min-w-0">{opt.label}</span>
                                                {isChosen && (
                                                    <svg className="w-4 h-4 shrink-0 text-[#353535]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
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
                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        disabled={filteredList.length === 0}
                        className="order-1 self-end flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold hover:bg-[#c43a39] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                            <tr className=" bg-white">
                                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">Date</th>
                                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">Employee Name</th>
                                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">Time In</th>
                                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">Time Out</th>
                                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">Total Hours</th>
                                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">Status</th>
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
                                    const baseIndex = rangeStart + tablePageStartIndex + index;
                                    const slNo = (baseIndex + 1).toString().padStart(2, '0');
                                    const dateKey = toLocalDateKey(loc.date_iso, loc.date ?? null);
                                    const [y, m, d] = dateKey ? dateKey.split('-') : ['', '', ''];
                                    const formattedDate = dateKey ? `${d}/${m}/${y}` : '-';

                                    const timeIn = pickTime(loc.time_in) || '-';
                                    const timeOut = pickTime(loc.time_out) || '-';
                                    const totalHours = formatTotalHours(loc.total_hours, timeIn, timeOut);

                                    return (
                                        <tr key={loc.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                                            <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{formattedDate}</td>
                                            <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-semibold font-gantari whitespace-nowrap align-middle">{loc.full_name ?? '-'}</td>
                                            <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{timeIn}</td>
                                            <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{timeOut}</td>
                                            <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{totalHours}</td>
                                            <td className="px-3 py-6 text-center whitespace-nowrap align-middle">

                                                {(() => {
                                                    const name = (loc.full_name || '').trim();
                                                    const entryKey = loc.employee_db_id != null ? String(loc.employee_db_id) : name;
                                                    const statusLabel =
                                                        (entryKey && busyMap[entryKey]) || (name && busyMap[name]) ? 'Busy' : 'Available';
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
            {listInRange.length > 0 && (
                <div className="w-full flex items-center justify-end py-2 pr-4">
                    <div className="flex items-center gap-4 bg-[#E8E8E8] rounded-[20px] px-5 py-2">
                        <span className="text-[#353535] text-[16px] font-medium font-gantari leading-none">Showing:</span>
                        <button
                            type="button"
                            onClick={() => setTableCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safeTableCurrentPage === 1}
                            className={`inline-flex items-center gap-1 text-[15px] font-medium font-gantari leading-none cursor-pointer ${safeTableCurrentPage === 1
                                ? 'text-[#9CA3AF] opacity-50 cursor-not-allowed'
                                : 'text-[#353535]'
                                }`}
                            aria-label="Previous page"
                        >
                            <span className="relative -top-[2px] inline-flex items-center justify-center text-[24px] leading-none">&#8249;</span>
                            <span className="inline-flex items-center">Prev</span>
                        </button>
                        <button
                            type="button"
                            className="px-4 py-1 rounded-[10px] bg-[#DD4342] text-[#FFFFFF] text-[14px] font-semibold font-gantari leading-none cursor-default"
                            aria-current="page"
                        >
                            {tablePageRangeLabel}
                        </button>
                        <button
                            type="button"
                            onClick={() => setTableCurrentPage((p) => Math.min(tableTotalPages, p + 1))}
                            disabled={safeTableCurrentPage >= tableTotalPages}
                            className={`inline-flex items-center gap-1 text-[15px] font-medium font-gantari leading-none cursor-pointer ${safeTableCurrentPage >= tableTotalPages
                                ? 'text-[#9CA3AF] opacity-40 cursor-not-allowed'
                                : 'text-[#353535]'
                                }`}
                            aria-label="Next page"
                        >
                            <span className="inline-flex items-center">Next</span>
                            <span className="relative -top-[2px] inline-flex items-center justify-center text-[24px] leading-none">&#8250;</span>
                        </button>
                    </div>
                </div>
            )}




        </div>
    );
}


