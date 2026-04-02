import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';

/** Open native date picker — same pattern as TeamreportPM. */
function openNativeDatePicker(input: HTMLInputElement | null) {
    if (!input) return;
    try {
        if (typeof input.showPicker === 'function') {
            input.showPicker();
            return;
        }
    } catch {
        // showPicker can throw if not allowed; fall through
    }
    input.focus();
    input.click();
}

interface TimesheetEntry {
    id: number;
    project_name?: string;
    task_name?: string;
    start_date?: string; // Format: DD/MM/YYYY
    end_date?: string;   // Format: DD/MM/YYYY
    task_date_ymd?: string; // Internal stable YYYY-MM-DD for date filtering
    duration?: string;
    assignee_name?: string;
    team?: string;
    start_time?: string;
    end_time?: string;
    Actual_start_time?: string;
    due_date?: string;
    perferstart_time?: string;
    perferend_time?: string;
    Pause?: number;
    restart?: number;
}


export default function TeamReportTD() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [employee, setEmployee] = useState('All');
    const [team, setTeam] = useState('All');
    const [list, setList] = useState<TimesheetEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [employeeOpen, setEmployeeOpen] = useState(false);
    const [teamOpen, setTeamOpen] = useState(false);
    const [employeeOptions, setEmployeeOptions] = useState<string[]>(['All']);
    const [teamOptions, setTeamOptions] = useState<string[]>(['All']);
    const employeeDropdownRef = useRef<HTMLDivElement>(null);
    const teamDropdownRef = useRef<HTMLDivElement>(null);
    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

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
    const [selectedShowEntries, setSelectedShowEntries] = useState('');
    const [showEntriesOpen, setShowEntriesOpen] = useState(false);
    const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
    const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (showEntriesOpen && showEntriesDropdownContentRef.current) {
            showEntriesDropdownContentRef.current.scrollTop = 0;
        }
    }, [showEntriesOpen]);


    // Load employee full_name list from backend (employee table) for Employee filter dropdown
    useEffect(() => {
        api
            .get<{ employees?: { full_name?: string | null }[] }>('/api/employees')
            .then(({ data }) => {
                const names = Array.from(
                    new Set(
                        (data.employees ?? [])
                            .map((e) => (e.full_name || '').trim())
                            .filter((name) => name.length > 0),
                    ),
                );
                if (names.length) {
                    setEmployeeOptions(['All', ...names]);
                }
            })
            .catch(() => {
                // On error keep existing default options
            });
    }, []);

    // Load team names from backend (team table) for Team filter dropdown
    useEffect(() => {
        api
            .get<{ teams?: { team_name?: string | null; name?: string | null; teamname?: string | null }[] }>('/api/teams')
            .then(({ data }) => {
                const teamNames = Array.from(
                    new Set(
                        (data.teams ?? [])
                            .map((t) => {
                                // Try multiple possible field names for team name
                                return (t.teamname || t.name || t.teamname || '').trim();
                            })
                            .filter((name) => name.length > 0),
                    ),
                );
                if (teamNames.length) {
                    setTeamOptions(['All', ...teamNames]);
                }
            })
            .catch(() => {
                // On error keep existing default options
            });
    }, []);

    const toYmd = (v: string | undefined): string => {
        if (!v) return '';
        const s = String(v).trim();
        if (!s) return '';
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0].split(' ')[0];
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
            const [dd, mm, yyyy] = s.split('/');
            return `${yyyy}-${mm}-${dd}`;
        }
        return '';
    };

    const shiftYmd = (ymd: string, deltaDays: number): string => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
        const [yy, mm, dd] = ymd.split('-').map((x) => Number(x));
        const dt = new Date(Date.UTC(yy, mm - 1, dd));
        dt.setUTCDate(dt.getUTCDate() + deltaDays);
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const parseDateLike = (value: any): Date | null => {
        if (!value) return null;
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
        const s = String(value).trim();
        if (!s) return null;

        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [yy, mm, dd] = s.split('-').map(Number);
            const d = new Date(yy, mm - 1, dd);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        // DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
            const [dd, mm, yy] = s.split('/').map(Number);
            const d = new Date(yy, mm - 1, dd);
            return Number.isNaN(d.getTime()) ? null : d;
        }

        const parsed = new Date(s);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const parseTimeOnDate = (timeValue: any, baseDate: Date | null): Date | null => {
        if (!timeValue || !baseDate) return null;
        const s = String(timeValue).trim();
        const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (!m) return null;
        const hh = Number(m[1]);
        const mm = Number(m[2]);
        const ss = Number(m[3] || 0);
        if (hh > 23 || mm > 59 || ss > 59) return null;
        const d = new Date(baseDate);
        d.setHours(hh, mm, ss, 0);
        return d;
    };

    // Format date from Date/string to DD/MM/YYYY
    const formatDateDisplay = (date: Date | string | null | undefined): string => {
        const dObj = parseDateLike(date);
        if (!dObj) return '-';
        const dateObj = dObj;
        const d = dateObj.getDate().toString().padStart(2, '0');
        const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const y = dateObj.getFullYear();
        return `${d}/${m}/${y}`;
    };

    // Calculate duration between start and end times
    const formatDuration = (start: Date | null, end: Date | null): string => {
        if (!start || !end) return 'hh:mm:ss';
        const diffMs = end.getTime() - start.getTime();
        if (diffMs < 0) return 'hh:mm:ss';
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Load completed tasks from backend when dates, employee, or team filter changes
    useEffect(() => {
        setLoading(true);
        const payload: any = {};

        // If user picks only one side of the range, treat it as a single-day filter.
        // Also fix accidental reversed ranges (start > end).
        let effectiveStart = startDate || endDate;
        let effectiveEnd = endDate || startDate;
        if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
            [effectiveStart, effectiveEnd] = [effectiveEnd, effectiveStart];
        }
        // Expand backend query by +/- 1 day to avoid timezone edge misses.
        if (effectiveStart) payload.startDate = shiftYmd(effectiveStart, -1);
        if (effectiveEnd) payload.endDate = shiftYmd(effectiveEnd, 1);

        const loadFilters = async () => {
            try {
                // If team filter is set, find team_id by name
                if (team !== 'All') {
                    const { data: teamData } = await api.get<{ teams?: { team_id?: number; team_name?: string; name?: string; teamname?: string }[] }>('/api/teams');
                    const foundTeam = (teamData.teams ?? []).find(t => {
                        const tName = (t.teamname || t.name || t.teamname || '').trim();
                        return tName === team;
                    });
                    if (foundTeam && foundTeam.team_id) {
                        payload.selectteam = foundTeam.team_id;
                    }
                }

                // If employee filter is set, find employee ID by name
                if (employee !== 'All') {
                    const { data: empData } = await api.get<{ employees?: { id: number; full_name?: string }[] }>('/api/employees');
                    const emp = (empData.employees ?? []).find(e => e.full_name === employee);
                    if (emp) payload.selectmembers = emp.id;
                }

                fetchTasks(payload);
            } catch {
                // If lookup fails, still fetch all tasks and filter client-side
                fetchTasks(payload);
            }
        };

        loadFilters();
    }, [startDate, endDate, employee, team]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
                setEmployeeOpen(false);
            }
            if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
                setTeamOpen(false);
            }
        };
        if (employeeOpen || teamOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [employeeOpen, teamOpen]);

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



    const fetchTasks = (payload: any) => {
        api
            .post<{ completed_tasks?: any[] }>('/api/timesheet/completed-tasks', payload)
            .then(({ data }) => {
                const tasks = data.completed_tasks ?? [];
                const mapped: TimesheetEntry[] = tasks.map((t) => {
                    const baseDate =
                        parseDateLike(t.due_date) ||
                        parseDateLike(t.start_time) ||
                        parseDateLike(t.Actual_start_time) ||
                        parseDateLike(t.start_date) ||
                        parseDateLike(t.date);
                    const start =
                        parseDateLike(t.start_time) ||
                        parseDateLike(t.Actual_start_time) ||
                        parseTimeOnDate(t.perferstart_time, baseDate) ||
                        baseDate;
                    const end =
                        parseDateLike(t.end_time) ||
                        parseTimeOnDate(t.perferend_time, baseDate) ||
                        parseDateLike(t.end_date) ||
                        parseDateLike(t.due_date) ||
                        start;

                    let duration = formatDuration(start, end);
                    if (duration !== 'hh:mm:ss') {
                        // Keep parity with other team report pages where Pause/restart are applied.
                        const pauseSeconds = Number(t.Pause || 0);
                        const restartSeconds = Number(t.restart || 0);
                        const [h, m, s] = duration.split(':').map(Number);
                        let total = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
                        total = total - pauseSeconds + restartSeconds;
                        if (total < 0) total = 0;
                        const hh = String(Math.floor(total / 3600)).padStart(2, '0');
                        const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
                        const ss = String(total % 60).padStart(2, '0');
                        duration = `${hh}:${mm}:${ss}`;
                    }

                    const startDisplay = formatDateDisplay(start || t.start_date || t.date || t.due_date);
                    const endDisplay = formatDateDisplay(end || t.end_date || t.due_date || t.start_date || t.date);
                    const taskDateYmd =
                        toYmd(t.start_date) ||
                        toYmd(t.end_date) ||
                        toYmd(t.date) ||
                        toYmd(t.start_time) ||
                        toYmd(t.end_time) ||
                        toYmd(t.Actual_start_time) ||
                        toYmd(t.due_date) ||
                        toYmd(startDisplay);

                    return {
                        id: t.id,
                        project_name: t.project_name || 'Others',
                        task_name: t.task_name || '-',
                        start_date: startDisplay,
                        end_date: endDisplay,
                        task_date_ymd: taskDateYmd,
                        duration,
                        assignee_name: t.assigned_name || '',
                        team: t.teamname || undefined,
                        start_time: t.start_time,
                        end_time: t.end_time,
                        Actual_start_time: t.Actual_start_time,
                        due_date: t.due_date,
                        perferstart_time: t.perferstart_time,
                        perferend_time: t.perferend_time,
                        Pause: Number(t.Pause || 0),
                        restart: Number(t.restart || 0),
                    };
                });
                setList(mapped);
            })
            .catch(() => {
                setList([]);
            })
            .finally(() => setLoading(false));
    };

    const searchQuery = searchParams.get('q')?.toLowerCase() || "";

    const filteredList = useMemo(() => {
        return list.filter(item => {
            // Search filter
            const matchesSearch = !searchQuery || 
                (item.project_name || "").toLowerCase().includes(searchQuery) ||
                (item.task_name || "").toLowerCase().includes(searchQuery) ||
                (item.assignee_name || "").toLowerCase().includes(searchQuery) ||
                (item.team || "").toLowerCase().includes(searchQuery) ||
                (item.start_date || "").toLowerCase().includes(searchQuery) ||
                (item.end_date || "").toLowerCase().includes(searchQuery);

            if (!matchesSearch) return false;

            // Date Range Filter Logic
            if (startDate || endDate) {
                // Use string comparisons in YYYY-MM-DD to avoid timezone issues
                let effectiveStart = startDate || endDate;
                let effectiveEnd = endDate || startDate;
                if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
                    [effectiveStart, effectiveEnd] = [effectiveEnd, effectiveStart];
                }

                const itemKey = item.task_date_ymd || toYmd(item.start_date);
                if (!itemKey) return false;
                if (effectiveStart && itemKey < effectiveStart) return false;
                if (effectiveEnd && itemKey > effectiveEnd) return false;
            }

            // Employee Filter
            if (employee !== 'All' && item.assignee_name !== employee) {
                return false;
            }

            // Team Filter
            if (team !== 'All' && item.team !== team) {
                return false;
            }

            return true;
        });
    }, [list, startDate, endDate, employee, team, searchQuery]);

    const effectiveShowEntryValue = selectedShowEntries || showEntriesOptions[0].value;
    const selectedRange = showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ?? showEntriesOptions[0];
    const rangeStart = selectedRange.start;
    const rangeEnd = selectedRange.end === null ? filteredList.length : Math.min(selectedRange.end, filteredList.length);
    const listInRange = filteredList.slice(rangeStart, rangeEnd);
    const displayedList = listInRange;

    const handleDownload = () => {
        if (filteredList.length === 0) return;

        const headers = ['Sl.No', 'Project Name', 'Task', 'Start Date', 'End Date', 'Task Duration'];
        const csvData = filteredList.map((row, index) => {
            const slNo = (index + 1).toString().padStart(2, '0');
            return [
                slNo,
                row.project_name && row.project_name.trim() !== '' ? row.project_name : '-',
                row.task_name && row.task_name.trim() !== '' ? row.task_name : '-',
                row.start_date && row.start_date.trim() !== '' ? row.start_date : '-',
                row.end_date || '-',
                row.duration || 'hh:mm:ss'
            ].map(val => `"${val}"`).join(',');
        });

        const csvContent = [headers.join(','), ...csvData].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
        link.setAttribute('href', url);
        link.setAttribute('download', `team-report-${dateStr}.csv`);
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


            {/* Header & Filter Section */}
            <div className="flex flex-col gap-4 flex-shrink-0 px-2">
                {/* Line 1: Heading and Download */}
                <div className="flex items-center justify-between">
                    <h3 className="text-[24px] font-semibold text-[#000000] font-gantari whitespace-nowrap">Monthly Report</h3>
                    <button
                        onClick={handleDownload}
                        disabled={filteredList.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold hover:bg-[#c43a39] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 15V3M12 15L8 11M12 15L16 11M5 20H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[14px]">Download</span>
                    </button>
                </div>

                {/* Line 2: Filters */}
                <div className="flex flex-wrap items-right justify-end gap-3">
                    {/* Start Date — calendar icon only opens native picker (TeamreportPM pattern) */}
                    <div className="relative flex min-w-[130px] items-center justify-between gap-3 rounded-md bg-[#EAEAEA] px-4 py-2 transition-all">
                        <span className={`select-none text-sm font-medium ${startDate ? 'text-[#353535]' : 'text-[#616161]'}`}>
                            {startDate ? startDate.split('-').reverse().join('/') : 'Start Date'}
                        </span>
                        <button
                            type="button"
                            aria-label="Open start date calendar"
                            onClick={() => openNativeDatePicker(startDateRef.current)}
                            className="shrink-0 cursor-pointer rounded p-0.5 outline-none transition-colors hover:bg-[#DCDCDC] focus-visible:ring-2 focus-visible:ring-[#DD4342]/40"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
                            </svg>
                        </button>
                        <input
                            ref={startDateRef}
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            tabIndex={-1}
                            className="pointer-events-none absolute inset-0 h-full min-h-[2.5rem] w-full opacity-0"
                            style={{ colorScheme: 'light' }}
                        />
                    </div>

                    {/* End Date — calendar icon only opens native picker */}
                    <div className="relative flex min-w-[130px] items-center justify-between gap-3 rounded-md bg-[#EAEAEA] px-4 py-2 transition-all">
                        <span className={`select-none text-sm font-medium ${endDate ? 'text-[#353535]' : 'text-[#616161]'}`}>
                            {endDate ? endDate.split('-').reverse().join('/') : 'End Date'}
                        </span>
                        <button
                            type="button"
                            aria-label="Open end date calendar"
                            onClick={() => openNativeDatePicker(endDateRef.current)}
                            className="shrink-0 cursor-pointer rounded p-0.5 outline-none transition-colors hover:bg-[#DCDCDC] focus-visible:ring-2 focus-visible:ring-[#DD4342]/40"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
                            </svg>
                        </button>
                        <input
                            ref={endDateRef}
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            tabIndex={-1}
                            className="pointer-events-none absolute inset-0 h-full min-h-[2.5rem] w-full opacity-0"
                            style={{ colorScheme: 'light' }}
                        />
                    </div>

                    {/* Employee Custom Dropdown */}
                    <div className="relative min-w-[130px]" ref={employeeDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeOpen(o => !o);
                                setTeamOpen(false);
                            }}
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer border-0 "
                        >
                            <span className={`text-[14px] font-medium font-gantari ${employee !== 'All' ? 'text-[#353535]' : 'text-[#616161]'}`}>
                                {employee === 'All' ? 'Employee' : employee}
                            </span>
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className={`ml-2 w-3 h-3 shrink-0 transition-transform duration-200 ${employeeOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {employeeOpen && (
                            <div
                                className="absolute top-full left-0 mt-1 z-50 bg-white rounded-md shadow-xl min-w-[160px] max-h-[160px] py-1 overflow-y-auto custom-scrollbar"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {employeeOptions.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEmployee(opt);
                                            setEmployeeOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-[14px] font-medium font-gantari transition-colors cursor-pointer ${employee === opt ? 'text-[#353535] bg-[#F2F2F2]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F2F2F2]'}`}
                                    >
                                        {opt === 'All' ? 'Employee' : opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Team Custom Dropdown */}
                    <div className="relative min-w-[100px]" ref={teamDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setTeamOpen(o => !o);
                                setEmployeeOpen(false);
                            }}
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer border-0"
                        >
                            <span className={`text-sm font-medium font-gantari ${team !== 'All' ? 'text-[#353535]' : 'text-[#616161]'}`}>
                                {team === 'All' ? 'Team' : team}
                            </span>
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className={`ml-2 w-3 h-3 shrink-0 transition-transform duration-200 ${teamOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {teamOpen && (
                            <div
                                className="absolute top-full left-0 mt-1 z-50 bg-white rounded-md shadow-xl min-w-[130px] py-1 max-h-[160px] overflow-y-auto custom-scrollbar"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {teamOptions.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTeam(opt);
                                            setTeamOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-[14px] font-medium font-gantari transition-colors cursor-pointer ${team === opt ? 'text-[#353535] bg-[#F2F2F2]' : 'text-[#616161] hover:text-[#353535] hover:bg-[#F2F2F2]'}`}
                                    >
                                        {opt === 'All' ? 'Team' : opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative min-w-[140px] max-w-[200px] w-[150px]" ref={showEntriesDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowEntriesOpen(o => !o); setEmployeeOpen(false); setTeamOpen(false); }}
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
                                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${showEntriesOpen ? 'rotate-180' : ''} ${selectedShowEntries === '' ? 'opacity-60 grayscale' : 'opacity-90'}`}
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
            </div>

            {/* Table Section - same scroll as TrackerTD */}
            <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                <div className="overflow-x-auto overflow-y-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-220px)]">
                    <table className="min-w-full border-collapse">
                        <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                            <tr className="border-b border-gray-100 bg-white">
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Project Name</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari">Task Name</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Start Date</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">End Date</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Task Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {displayedList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-20 text-center text-[#616161] font-medium font-gantari bg-white">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                displayedList.map((row, index) => {
                                    const baseIndex = rangeStart + index;
                                    const slNo = (baseIndex + 1).toString().padStart(2, '0');
                                    return (
                                        <tr key={row.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{slNo}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-semibold font-gantari whitespace-nowrap align-middle">{row.project_name && row.project_name.trim() !== '' ? row.project_name : '-'}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari align-middle">
                                                <div className="mx-auto max-w-[250px] line-clamp-2 break-words text-center">
                                                    {row.task_name && row.task_name.trim() !== '' ? row.task_name : '-'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{row.start_date && row.start_date.trim() !== '' ? row.start_date : '-'}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-gantari whitespace-nowrap align-middle">{row.end_date ?? '-'}</td>
                                            <td className="px-3 py-6 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">{row.duration ?? 'hh:mm:ss'}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>



        </div>
    );
}
