import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api';

interface AttendanceEntry {
    id: number;
    employee_id?: string;
    full_name?: string;
    date?: string; // DD-MM-YYYY format (from backend)
    date_iso?: string; // YYYY-MM-DD format (normalised)
    time_in?: string; // HH:MM:SS
    time_out?: string | null; // HH:MM:SS or null
    total_hours?: string | null; // hours as string or null
    status?: string; // Online / Offline or raw value
}

export default function TrackerBL() {
    const [list, setList] = useState<AttendanceEntry[]>([]);
    const [loading, setLoading] = useState(true);
    // Always focus on today's attendance; stored as YYYY-MM-DD
    const getTodayKey = () => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const [selectedDate] = useState(getTodayKey());
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [employeeOpen, setEmployeeOpen] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [statusOpen, setStatusOpen] = useState(false);
    const statusOptions = ['', 'Available', 'Busy'];
    // Show entries state and refs removed
    const [selectedTimeRange, setSelectedTimeRange] = useState('All Time');
    const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
    // Pagination state removed
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const employeeDropdownRef = useRef<HTMLDivElement>(null);
    const timeDropdownRef = useRef<HTMLDivElement>(null);
    const [searchParams] = useSearchParams();
    const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
    const employeeOptions = useMemo(
        () => Array.from(new Set(list.map((item) => (item.full_name || '').trim()).filter(Boolean))),
        [list],
    );
    const employeeOptionsFiltered = useMemo(
        () => employeeOptions.filter((name) => name.toLowerCase().includes(employeeSearch.toLowerCase())),
        [employeeOptions, employeeSearch],
    );
    const timeRangeOptions = ['All Time', '09:00 AM - 12:00 PM', '12:00 PM - 04:00 PM', '04:00 PM - 08:00 PM'];

    // Determine status from task assignments: if the employee has at least one
    // task on the selected date → Busy, otherwise Available.
    const getStatus = (entry: AttendanceEntry): 'Available' | 'Busy' => {
        const name = (entry.full_name || '').trim();
        if (name && busyMap[name]) return 'Busy';
        return 'Available';
    };

    // Extract pure time (HH:MM:SS) from a time or datetime string
    const extractTime = (value: string): string => {
        const trimmed = value.trim();
        if (!trimmed) return trimmed;
        const match = trimmed.match(/(\d{1,2}:\d{2}:\d{2})/);
        return match ? match[1] : trimmed;
    };

    // Format time to HH:MM:SS (24‑hour) for display
    const formatTime = (timeStr: string | null | undefined): string => {
        if (!timeStr || timeStr.trim() === '') return '-';
        try {
            const pure = extractTime(timeStr);
            if (!pure || pure.trim() === '') return '-';
            const [hours, minutes, seconds = '00'] = pure.split(':');
            const h = hours.padStart(2, '0');
            const m = minutes.padStart(2, '0');
            const s = seconds.padStart(2, '0');
            return `${h}:${m}:${s}`;
        } catch {
            return '-';
        }
    };

    // Format total hours similar to other trackers
    const formatTotalHours = (
        hours: string | null | undefined,
        timeIn?: string,
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
        return '-';
    };

    // Fetch attendance data for today's date (selectedDate is fixed to today)
    useEffect(() => {
        setLoading(true);
        const params: { date?: string; roles?: string } = {};
        if (selectedDate) {
            params.date = selectedDate; // YYYY-MM-DD expected by API
        }
        params.roles = 'BIM Coordinator,BIM Modeler,BIM Moduler';

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

    // Fetch tasks for the selected date and build a map of which employees are busy.
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
                console.error('Error fetching tasks for TrackerBL:', err);
                setBusyMap({});
            }
        };

        fetchTasksForDate();
    }, [selectedDate]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) setStatusOpen(false);
            if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) setEmployeeOpen(false);
            if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) setTimeDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // CurrentPage reset removed
    }, [selectedStatus, selectedTimeRange]);

    const filteredList = useMemo(() => {
        const q = searchParams.get("q")?.toLowerCase() || "";
        return list.filter((item) => {
            // Optional status filter: Available / Busy
            if (selectedStatus && getStatus(item) !== selectedStatus) {
                return false;
            }
            if (selectedEmployee && (item.full_name || '').trim() !== selectedEmployee) {
                return false;
            }

            // Optional time-of-day filter based on time_in
            if (selectedTimeRange !== "All Time" && item.time_in) {
                const [hRaw, mRaw] = item.time_in.split(":");
                const h = Number(hRaw);
                const m = Number(mRaw);
                const minutesFromMidnight = h * 60 + m;

                const rangeMap: Record<string, [number, number]> = {
                    "09:00 AM - 12:00 PM": [9 * 60, 12 * 60],
                    "12:00 PM - 04:00 PM": [12 * 60, 16 * 60],
                    "04:00 PM - 08:00 PM": [16 * 60, 20 * 60],
                };

                const range = rangeMap[selectedTimeRange];
                if (range) {
                    const [start, end] = range;
                    if (minutesFromMidnight < start || minutesFromMidnight >= end)
                        return false;
                }
            }

            // Search filter
            if (q) {
                const status = getStatus(item);
                const matches = [
                    item.full_name,
                    item.employee_id,
                    item.date,
                    item.time_in,
                    item.time_out,
                    status,
                ].some((f) => (f || "").toLowerCase().includes(q));
                if (!matches) return false;
            }

            return true;
        });
    }, [list, searchParams, selectedStatus, selectedTimeRange, selectedEmployee, busyMap]);

    // Pagination logic removed

    const handleDownload = () => {
        if (filteredList.length === 0) return;

        const headers = ['Sl.No', 'Date', 'Employee Name', 'Time In', 'Time Out', 'Total Hours', 'Status'];
        const csvData = filteredList.map((entry, index) => {
            const slNo = (index + 1).toString().padStart(2, '0');
            const formattedDate = entry.date ? entry.date.replace(/-/g, '/') : '-';
            const timeIn = formatTime(entry.time_in);
            const timeOut = formatTime(entry.time_out || null);
            const totalHours = formatTotalHours(entry.total_hours, entry.time_in, entry.time_out);
            const status = getStatus(entry);

            return [
                slNo,
                formattedDate,
                entry.full_name || '-',
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
        <div className="flex flex-col h-full bg-white p-4 sm:p-6 overflow-hidden">
            {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 font-gantari px-1 sm:px-0 sm:mt-0">
            <h2 className="text-[20px] sm:text-[24px] font-medium text-gray-900 whitespace-nowrap">Employee Tracking</h2>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:justify-end">
                <div className="grid grid-cols-2 gap-3 w-full sm:flex sm:items-center sm:min-w-0 sm:w-auto">
                    {/* Employee Filter */}
                    <div className="relative w-full sm:min-w-[190px] sm:w-auto" ref={employeeDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeOpen((o) => !o);
                            }}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md text-sm font-medium text-[#353535] border-0 cursor-pointer"
                        >
                            <span className={`${selectedEmployee ? 'text-[#353535]' : 'text-[#8B8B8B]'}`}>
                                {selectedEmployee || 'Select Employee'}
                            </span>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#616161"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ transform: employeeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
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

                    {/* Time Range Filter dropdown with AM/PM ranges */}
                    <div className="relative w-full sm:min-w-[170px] sm:w-auto" ref={timeDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setTimeDropdownOpen((o) => !o);
                            }}
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12" />
                                    <polyline points="12 12 16 14" />
                                </svg>
                                <span className="text-sm font-medium text-[#353535]">
                                    {selectedTimeRange}
                                </span>
                            </div>
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#616161"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ transform: timeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                            >
                            <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {timeDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg w-full sm:min-w-[170px] py-1">
                                {timeRangeOptions.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTimeRange(opt);
                                            setTimeDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                                            selectedTimeRange === opt ? 'text-[#353535] bg-[#F2F2F2]' : 'text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status Custom Dropdown */}
                    <div className="relative w-full sm:min-w-[120px] sm:w-auto" ref={statusDropdownRef}>
                        <button type="button" onClick={() => setStatusOpen(o => !o)}
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer">
                            <span className={`text-sm font-medium ${selectedStatus ? 'text-[#353535]' : 'text-[#8B8B8B]'}`}>
                                {selectedStatus || 'Status'}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: statusOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {statusOpen && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg w-full sm:min-w-[130px] py-1">
                                {statusOptions.map(opt => (
                                    <button key={opt} type="button" onClick={() => { setSelectedStatus(opt); setStatusOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${selectedStatus === opt ? 'text-[#353535] bg-[#F2F2F2]' : 'text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]'}`}>
                                        {opt === '' ? 'Status' : opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* Unified Download Button */}
                <button
                    onClick={handleDownload}
                    disabled={filteredList.length === 0}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15V3M12 15L8 11M12 15L16 11M5 20H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[14px]">Download</span>
                </button>
            </div>
        </div>

            {/* Table Section - scrollable when many rows */}
            <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-280px)]">
                    <table className="min-w-full border-collapse">

                        <thead className="sticky top-0 z-10 bg-white">
                            <tr className="border-b border-gray-100 bg-white">
                                <th className="px-2 sm:px-3 py-4 text-center text-[13px] sm:text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                <th className="px-2 sm:px-3 py-4 text-center text-[13px] sm:text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Date</th>
                                <th className="px-2 sm:px-3 py-4 text-center text-[13px] sm:text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Employee Name</th>
                                <th className="px-2 sm:px-3 py-4 text-center text-[13px] sm:text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Time In</th>
                                <th className="px-2 sm:px-3 py-4 text-center text-[13px] sm:text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Time Out</th>
                                <th className="px-2 sm:px-3 py-4 text-center text-[13px] sm:text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Total Hours</th>
                                <th className="px-2 sm:px-3 py-4 text-center text-[13px] sm:text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-12 text-center text-gray-400 font-medium font-gantari bg-white">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                filteredList.map((entry, index) => {
                                    const slNo = (index + 1).toString().padStart(2, '0');
                                    const formattedDate = entry.date ? entry.date.replace(/-/g, '/') : '-';
                                    const timeIn = formatTime(entry.time_in);
                                    const timeOut = formatTime(entry.time_out || null);
                                    const totalHours = formatTotalHours(entry.total_hours, entry.time_in, entry.time_out);
                                    const status = getStatus(entry);
                                    return (
                                        <tr key={entry.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}>
                                            <td className="px-2 sm:px-3 py-4 sm:py-6 text-center text-[12px] sm:text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-2 sm:px-3 py-4 sm:py-6 text-center text-[12px] sm:text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{formattedDate}</td>
                                            <td className="px-2 sm:px-3 py-4 sm:py-6 text-center text-[12px] sm:text-[14px] text-[#353535] font-semibold font-gantari whitespace-nowrap align-middle">{entry.full_name ?? '-'}</td>
                                            <td className="px-2 sm:px-3 py-4 sm:py-6 text-center text-[12px] sm:text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{timeIn}</td>
                                            <td className="px-2 sm:px-3 py-4 sm:py-6 text-center text-[12px] sm:text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">{timeOut}</td>
                                            <td className="px-2 sm:px-3 py-4 sm:py-6 text-center text-[12px] sm:text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{totalHours}</td>
                                            <td className="px-2 sm:px-3 py-4 sm:py-6 text-center whitespace-nowrap align-middle">
                                                <span
                                                    className={`inline-flex px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold font-gantari ${
                                                        status === 'Busy' ? 'bg-[#FCE8E8] text-[#D93025]' : 'bg-[#E6F4EA] text-[#1E7E34]'
                                                    }`}
                                                >
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

            {/* Pagination removed */}

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


