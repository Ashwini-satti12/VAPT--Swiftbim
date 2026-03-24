import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../lib/api';

interface TimesheetEntry {
    id: number;
    project_name?: string;
    task_name?: string;
    start_time?: string; // ISO datetime
    end_time?: string;   // ISO datetime
    due_date?: string;   // ISO datetime
    Actual_start_time?: string; // ISO datetime
    assigned_name?: string;
    teamname?: string;
    Pause?: number; // seconds paused
    restart?: number; // seconds restarted
}

interface Employee {
    id: number;
    full_name: string;
    email?: string;
}

interface Team {
    team_id: number;
    teamname: string;
    employee?: string; // comma-separated employee IDs
}

export default function TeamReportBL() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [employee, setEmployee] = useState('All');
    const [team, setTeam] = useState('All');
    const [list, setList] = useState<TimesheetEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [employeeOpen, setEmployeeOpen] = useState(false);
    const [teamOpen, setTeamOpen] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);

    const employeeDropdownRef = useRef<HTMLDivElement>(null);
    const teamDropdownRef = useRef<HTMLDivElement>(null);

    // Show entries state and refs removed
    // Pagination state removed

    const employeeOptions = useMemo(
        () => ['All', ...employees.map(e => e.full_name)],
        [employees]
    );
    const teamOptions = useMemo(
        () => ['All', ...teams.map(t => t.teamname || `Team ${t.team_id}`)],
        [teams]
    );

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

    // Format date (avoid timezone shifts by not using `new Date(...)` for ISO strings)
    const formatDate = (dateStr: string | undefined): string => {
        if (!dateStr) return '-';
        const ymd = toYmd(dateStr);
        if (ymd) {
            const [yyyy, mm, dd] = ymd.split('-');
            return `${dd}/${mm}/${yyyy}`;
        }
        return String(dateStr);
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

    // Calculate duration from start_time / end_time and pause / restart
    const calculateDuration = (entry: TimesheetEntry): string => {
        if (!entry.start_time || !entry.end_time) return '-';

        try {
            const start = new Date(entry.start_time);
            const end = new Date(entry.end_time);
            let totalSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);

            const pauseSeconds = entry.Pause || 0;
            const restartSeconds = entry.restart || 0;
            totalSeconds = totalSeconds - pauseSeconds + restartSeconds;

            if (totalSeconds < 0) totalSeconds = 0;

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } catch {
            return '00:00:00';
        }
    };

    // Fetch employees and teams on mount
    useEffect(() => {
        api.get<{ employees?: Employee[] }>('/api/employees')
            .then(({ data }) => setEmployees(data.employees || []))
            .catch((error) => {
                console.error('Error fetching employees:', error);
            });

        api.get<{ teams?: Team[] }>('/api/teams')
            .then(({ data }) => setTeams(data.teams || []))
            .catch((error) => {
                console.error('Error fetching teams:', error);
            });
    }, []);

    // Fetch completed tasks (timesheet) from backend whenever filters change
    useEffect(() => {
        setLoading(true);
        const payload: {
            startDate?: string;
            endDate?: string;
            selectmembers?: string;
            selectteam?: string;
        } = {};

        // If user picks only one side of the range, treat it as a single-day filter.
        // Also fix accidental reversed ranges (start > end).
        let effectiveStart = startDate || endDate;
        let effectiveEnd = endDate || startDate;
        if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
            [effectiveStart, effectiveEnd] = [effectiveEnd, effectiveStart];
        }
        // Expand by +/- 1 day to avoid timezone/date-format boundary mismatches.
        // Then we do exact filtering client-side below.
        if (effectiveStart) payload.startDate = shiftYmd(effectiveStart, -1);
        if (effectiveEnd) payload.endDate = shiftYmd(effectiveEnd, 1);

        if (employee !== 'All') {
            const selectedEmp = employees.find(e => e.full_name === employee);
            if (selectedEmp) payload.selectmembers = String(selectedEmp.id);
        }

        if (team !== 'All') {
            const selectedTeam = teams.find(t => (t.teamname || `Team ${t.team_id}`) === team);
            if (selectedTeam) payload.selectteam = String(selectedTeam.team_id);
        }

        api.post<{ completed_tasks?: TimesheetEntry[] }>('/api/timesheet/completed-tasks', payload)
            .then(({ data }) => {
                setList(data.completed_tasks || []);
            })
            .catch((error) => {
                console.error('Error fetching timesheet data:', error);
                setList([]);
            })
            .finally(() => setLoading(false));
    }, [startDate, endDate, employee, team, employees, teams]);

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

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Show entries effects removed

    useEffect(() => {
        // CurrentPage reset removed
    }, []);

    const getTaskDateYmd = (entry: TimesheetEntry): string => {
        const src = entry.start_time || entry.Actual_start_time || entry.due_date;
        return toYmd(src);
    };

    // Exact filter on YYYY-MM-DD (client-side) to make "today" always match.
    const filteredList = useMemo(() => {
        const effectiveStart = startDate || endDate;
        const effectiveEnd = endDate || startDate;
        if (!effectiveStart || !effectiveEnd) return list;

        let s = effectiveStart;
        let e = effectiveEnd;
        if (s > e) [s, e] = [e, s];

        return list.filter((row) => {
            const ymd = getTaskDateYmd(row);
            if (!ymd) return false;
            return ymd >= s && ymd <= e;
        });
    }, [list, startDate, endDate]);

    // Pagination logic removed

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    const handleDownload = () => {
        if (filteredList.length === 0) return;

        const headers = ['Sl.No', 'Project Name', 'Task', 'Start Date', 'End Date', 'Task Duration'];
        const csvData = filteredList.map((row, index) => {
            const slNo = (index + 1).toString().padStart(2, '0');
            const start = formatDate(row.start_time || row.Actual_start_time);
            const end = formatDate(row.end_time || row.due_date);
            const duration = calculateDuration(row);

            return [
                slNo,
                row.project_name && row.project_name.trim() !== '' ? row.project_name : '-',
                row.task_name && row.task_name.trim() !== '' ? row.task_name : '-',
                start,
                end,
                duration
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

    return (
        <div className="px-0 pt-2 pb-6 space-y-8 flex flex-col h-full bg-white">
            {/* Header Section */}
            <div className="flex items-center justify-between flex-shrink-0 px-2">
                <h2 className="text-[24px] font-semibold text-[#000000]">Time-Sheet</h2>
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

            {/* Filter Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 flex-shrink-0 px-2">
                {/* <h3 className="text-xl font-bold text-gray-800">Month Report</h3> */}

                <div className="flex flex-wrap items-center gap-3">
                    {/* Start Date */}
                    <div className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-md transition-all cursor-pointer group min-w-[130px]">
                        <span className={`text-sm font-medium ${startDate ? 'text-[#353535]' : 'text-[#616161]'}`}>
                            {startDate ? startDate.split('-').reverse().join('/') : 'Start Date'}
                        </span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                            <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
                        </svg>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" style={{ colorScheme: 'light' }} />
                    </div>

                    {/* End Date */}
                    <div className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-md transition-all cursor-pointer group min-w-[130px]">
                        <span className={`text-sm font-medium ${endDate ? 'text-[#353535]' : 'text-[#616161]'}`}>
                            {endDate ? endDate.split('-').reverse().join('/') : 'End Date'}
                        </span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                            <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
                        </svg>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" style={{ colorScheme: 'light' }} />
                    </div>

                    {/* Employee Custom Dropdown */}
                    <div className="relative min-w-[130px]" ref={employeeDropdownRef}>
                        <button type="button" onClick={() => { setEmployeeOpen(o => !o); setTeamOpen(false); }}
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#EAEAEA] rounded-md transition-all cursor-pointer">
                            <span className={`text-sm font-medium ${employee !== 'All' ? 'text-[#353535]' : 'text-[#616161]'}`}>
                                {employee === 'All' ? 'Employee' : employee}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: employeeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {employeeOpen && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[160px] py-1">
                                {employeeOptions.map(opt => (
                                    <button key={opt} type="button" onClick={() => { setEmployee(opt); setEmployeeOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${employee === opt ? 'text-[#353535]' : 'text-[#616161] hover:text-[#353535]'}`}>
                                        {opt === 'All' ? 'Employee' : opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Team Custom Dropdown */}
                    <div className="relative min-w-[100px]" ref={teamDropdownRef}>
                        <button type="button" onClick={() => { setTeamOpen(o => !o); setEmployeeOpen(false); }}
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#EAEAEA] rounded-md transition-all cursor-pointer">
                            <span className={`text-sm font-medium ${team !== 'All' ? 'text-[#353535]' : 'text-[#616161]'}`}>
                                {team === 'All' ? 'Team' : team}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: teamOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {teamOpen && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[130px] py-1">
                                {teamOptions.map(opt => (
                                    <button key={opt} type="button" onClick={() => { setTeam(opt); setTeamOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${team === opt ? 'text-[#353535]' : 'text-[#616161] hover:text-[#353535]'}`}>
                                        {opt === 'All' ? 'Team' : opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Show entries removed */}
                </div>
            </div>

            {/* Table Section - same scroll/layout as TeamReportTD */}
            <div className="bg-white rounded-2xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-260px)] pr-1 pb-18">
                    <table className="min-w-full border-collapse table-fixed">
                        <colgroup>
                            <col style={{ width: '16.66%' }} />
                            <col style={{ width: '16.66%' }} />
                            <col style={{ width: '16.66%' }} />
                            <col style={{ width: '16.66%' }} />
                            <col style={{ width: '16.66%' }} />
                            <col style={{ width: '16.66%' }} />
                        </colgroup>
                        <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                            <tr className="bg-white">
                                <th className="px-4 py-4 text-center text-[16px] font-semibold text-gray-700 bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold text-gray-700 bg-white font-gantari whitespace-nowrap">Project Name</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold text-gray-700 bg-white font-gantari whitespace-nowrap">Task</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold text-gray-700 bg-white font-gantari whitespace-nowrap">Start Date</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold text-gray-700 bg-white font-gantari whitespace-nowrap">End Date</th>
                                <th className="px-4 py-4 text-center text-[16px] font-semibold text-gray-700 bg-white font-gantari whitespace-nowrap">Task Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 font-medium font-gantari">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                filteredList.map((row, index) => {
                                    const slNo = (index + 1).toString().padStart(2, '0');
                                    const start = formatDate(row.start_time || row.Actual_start_time);
                                    const end = formatDate(row.end_time || row.due_date);
                                    const duration = calculateDuration(row);
                                    return (
                                        <tr key={row.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}>
                                            <td className="px-4 py-6 text-center text-[14px] text-gray-600 font-medium font-gantari align-middle">{slNo}</td>
                                            <td className="px-4 py-6 text-center text-[14px] text-gray-800 font-semibold font-gantari align-middle">{row.project_name && row.project_name.trim() !== '' ? row.project_name : '-'}</td>
                                            <td className="px-4 py-6 text-center text-[14px] text-gray-600 font-gantari align-middle">{row.task_name && row.task_name.trim() !== '' ? row.task_name : '-'}</td>
                                            <td className="px-4 py-6 text-center text-[14px] text-gray-600 font-gantari align-middle">{start}</td>
                                            <td className="px-4 py-6 text-center text-[14px] text-gray-600 font-gantari align-middle">{end}</td>
                                            <td className="px-4 py-6 text-center text-[14px] text-gray-600 font-medium font-gantari align-middle">{duration}</td>
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
