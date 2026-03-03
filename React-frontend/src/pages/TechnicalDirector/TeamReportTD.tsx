import { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../lib/api';

interface TimesheetEntry {
    id: number;
    project_name?: string;
    task_name?: string;
    start_date?: string; // Format: DD/MM/YYYY
    end_date?: string;   // Format: DD/MM/YYYY
    duration?: string;
    assignee_name?: string;
    team?: string;
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

    // Format date from ISO string to DD/MM/YYYY
    const formatDateDisplay = (date: Date | null): string => {
        if (!date) return '-';
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
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
        if (startDate) payload.startDate = startDate;
        if (endDate) payload.endDate = endDate;

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

    const fetchTasks = (payload: any) => {
        api
            .post<{ completed_tasks?: any[] }>('/api/timesheet/completed-tasks', payload)
            .then(({ data }) => {
                const tasks = data.completed_tasks ?? [];
                const mapped: TimesheetEntry[] = tasks.map((t) => {
                    const start = t.start_time ? new Date(t.start_time) : null;
                    const end = t.end_time ? new Date(t.end_time) : null;
                    const startDisplay = formatDateDisplay(start);
                    const endDisplay = formatDateDisplay(end || start);
                    const duration = formatDuration(start, end);

                    return {
                        id: t.id,
                        project_name: t.project_name || 'Others',
                        task_name: t.task_name || '-',
                        start_date: startDisplay,
                        end_date: endDisplay,
                        duration,
                        assignee_name: t.assigned_name || '',
                        team: t.teamname || undefined,
                    };
                });
                setList(mapped);
            })
            .catch(() => {
                setList([]);
            })
            .finally(() => setLoading(false));
    };

    const filteredList = useMemo(() => {
        return list.filter(item => {
            // Date Range Filter Logic
            if (startDate || endDate) {
                const [d, m, y] = (item.start_date || '').split('/');
                const itemDate = new Date(`${y}-${m}-${d}`);

                if (startDate) {
                    const start = new Date(startDate);
                    if (itemDate < start) return false;
                }
                if (endDate) {
                    const end = new Date(endDate);
                    if (itemDate > end) return false;
                }
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
    }, [list, startDate, endDate, employee, team]);

    const handleDownload = () => {
        if (filteredList.length === 0) return;

        const headers = ['Sl.No', 'Project Name', 'Task', 'Start Date', 'End Date', 'Task Duration'];
        const csvData = filteredList.map((row, index) => {
            const slNo = (index + 1).toString().padStart(2, '0');
            return [
                slNo,
                row.project_name || '-',
                row.task_name || '-',
                row.start_date || '-',
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
        <div className="p-1 space-y-8 flex flex-col h-full bg-white">
            {/* Header Section */}
            <div className="flex items-center justify-between flex-shrink-0 px-2">
                <h2 className="text-2xl font-semibold text-[#000000]">Time-Sheet</h2>
                <button
                    onClick={handleDownload}
                    disabled={filteredList.length === 0}
                    className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold hover:bg-[#c43a39] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15V3M12 15L8 11M12 15L16 11M5 20H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[16px]">Download</span>
                </button>
            </div>

            {/* Filter Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
                <h3 className="text-xl font-semibold text-[#000000]">Month Report</h3>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Start Date */}
                    <div
                        className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer group min-w-[130px]"
                        onClick={() => { startDateRef.current?.showPicker?.(); startDateRef.current?.focus(); }}
                    >
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
                        <input
                            ref={startDateRef}
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            style={{ colorScheme: 'light' }}
                        />
                    </div>

                    {/* End Date */}
                    <div
                        className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer group min-w-[130px]"
                        onClick={() => { endDateRef.current?.showPicker?.(); endDateRef.current?.focus(); }}
                    >
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
                        <input
                            ref={endDateRef}
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
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
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer"
                        >
                            <span className={`text-sm font-medium ${employee !== 'All' ? 'text-[#353535]' : 'text-[#616161]'}`}>
                                {employee === 'All' ? 'Employee' : employee}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: employeeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {employeeOpen && (
                            <div
                                className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[160px] py-1 overflow-y-auto custom-scrollbar"
                                style={{ maxHeight: '160px' }}
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
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${employee === opt ? 'text-[#353535] bg-gray-50' : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'}`}
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
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer"
                        >
                            <span className={`text-sm font-medium ${team !== 'All' ? 'text-[#353535]' : 'text-[#616161]'}`}>
                                {team === 'All' ? 'Team' : team}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: teamOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {teamOpen && (
                            <div
                                className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[130px] py-1 overflow-y-auto custom-scrollbar"
                                style={{ maxHeight: '160px' }}
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
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${team === opt ? 'text-[#353535] bg-gray-50' : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'}`}
                                    >
                                        {opt === 'All' ? 'Team' : opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 pr-1" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                    <table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-white">
                            <tr className="border-b border-gray-100 bg-white">
                                <th className="px-3 py-4 text-center text-base font-bold text-gray-700 bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-gray-700 bg-white font-gantari whitespace-nowrap">Project Name</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-gray-700 bg-white font-gantari whitespace-nowrap">Task</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-gray-700 bg-white font-gantari whitespace-nowrap">Start Date</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-gray-700 bg-white font-gantari whitespace-nowrap">End Date</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-gray-700 bg-white font-gantari whitespace-nowrap">Task Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-12 text-center text-gray-400 font-medium font-gantari">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                filteredList.map((row, index) => {
                                    const slNo = (index + 1).toString().padStart(2, '0');
                                    return (
                                        <tr key={row.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}>
                                            <td className="px-3 py-3 text-center text-sm text-gray-500 font-medium font-gantari">{slNo}</td>
                                            <td className="px-3 py-3 text-center text-sm text-gray-800 font-semibold font-gantari">{row.project_name ?? '-'}</td>
                                            <td className="px-3 py-3 text-center text-sm text-gray-600 font-gantari">{row.task_name ?? '-'}</td>
                                            <td className="px-3 py-3 text-center text-sm text-gray-600 font-gantari">{row.start_date ?? '-'}</td>
                                            <td className="px-3 py-3 text-center text-sm text-gray-600 font-gantari">{row.end_date ?? '-'}</td>
                                            <td className="px-3 py-3 text-center text-sm text-gray-600 font-medium font-gantari">{row.duration ?? 'hh:mm:ss'}</td>
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
