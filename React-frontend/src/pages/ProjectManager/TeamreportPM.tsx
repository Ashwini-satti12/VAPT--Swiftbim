import { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../lib/api';

interface TimesheetEntry {
  id: number;
  project_name?: string;
  task_name?: string;
  start_time?: string; // ISO format datetime
  end_time?: string;   // ISO format datetime
  due_date?: string;   // ISO format datetime
  Actual_start_time?: string; // ISO format datetime
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

export default function TimesheetPM() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employee, setEmployee] = useState('All');
  const [team, setTeam] = useState('All');
  const [list, setList] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [showSizeOpen, setShowSizeOpen] = useState(false);
  const pageSizeOptions = [10, 20, 50, 100];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Refs for click outside detection
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const showSizeDropdownRef = useRef<HTMLDivElement>(null);

  const employeeOptions = useMemo(() => ['All', ...employees.map(e => e.full_name)], [employees]);
  const teamOptions = useMemo(() => ['All', ...teams.map(t => t.teamname || `Team ${t.team_id}`)], [teams]);

  // Format date from ISO to DD/MM/YYYY
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Calculate task duration from start_time, end_time, Pause, and restart
  const calculateDuration = (entry: TimesheetEntry): string => {
    if (!entry.start_time || !entry.end_time) return '00:00:00';
    
    try {
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      let totalSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
      
      // Subtract pause time and add restart time
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
    // Fetch employees
    api.get<{ employees?: Employee[] }>('/api/employees')
      .then(({ data }) => {
        const empList = data.employees || [];
        setEmployees(empList);
      })
      .catch((error) => {
        console.error('Error fetching employees:', error);
      });

    // Fetch teams
    api.get<{ teams?: Team[] }>('/api/teams')
      .then(({ data }) => {
        const teamList = data.teams || [];
        setTeams(teamList);
      })
      .catch((error) => {
        console.error('Error fetching teams:', error);
      });
  }, []);

  // Fetch timesheet data when filters change
  useEffect(() => {
    setLoading(true);
    const payload: {
      startDate?: string;
      endDate?: string;
      selectmembers?: string;
      selectteam?: string;
    } = {};

    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;
    
    if (employee !== 'All') {
      const selectedEmp = employees.find(e => e.full_name === employee);
      if (selectedEmp) {
        payload.selectmembers = String(selectedEmp.id);
      }
    }
    
    if (team !== 'All') {
      const selectedTeam = teams.find(t => (t.teamname || `Team ${t.team_id}`) === team);
      if (selectedTeam) {
        payload.selectteam = String(selectedTeam.team_id);
      }
    }

    api.post<{ completed_tasks?: TimesheetEntry[] }>('/api/timesheet/completed-tasks', payload)
      .then(({ data }) => {
        const tasks = data.completed_tasks || [];
        setList(tasks);
      })
      .catch((error) => {
        console.error('Error fetching timesheet data:', error);
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate, employee, team, employees, teams]);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setEmployeeOpen(false);
      }
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
        setTeamOpen(false);
      }
      if (showSizeDropdownRef.current && !showSizeDropdownRef.current.contains(event.target as Node)) {
        setShowSizeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [startDate, endDate, employee, team]);

  const filteredList = list; // API already filters, so we use list directly

  const totalPages = Math.ceil(filteredList.length / pageSize);
  const paginatedList = filteredList.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
    setShowSizeOpen(false);
  };

  const handleDownload = () => {
    if (filteredList.length === 0) return;

    const headers = ['Sl.No', 'Project Name', 'Task', 'Start Date', 'End Date', 'Task Duration'];
    const csvData = filteredList.map((row, index) => {
      const slNo = (index + 1).toString().padStart(2, '0');
      const startDate = formatDate(row.start_time || row.Actual_start_time);
      const endDate = formatDate(row.end_time || row.due_date);
      const duration = calculateDuration(row);
      
      return [
        slNo,
        row.project_name || '-',
        row.task_name || '-',
        startDate,
        endDate,
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
    <div className="p-1 md:p-6 space-y-8 flex flex-col h-full bg-white">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-shrink-0 px-2">
        <h2 className="text-2xl font-bold text-gray-900">Time-Sheet</h2>
        {/* Download Button - moved above filters */}
        <button
          onClick={handleDownload}
          disabled={filteredList.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15V3M12 15L8 11M12 15L16 11M5 20H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm">Download</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
        <h3 className="text-xl font-bold text-gray-800">Month Report</h3>

        <div className="flex flex-wrap items-center gap-3">
          {/* Start Date */}
          <div className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer group min-w-[130px]">
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
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              style={{ colorScheme: 'light' }}
            />
          </div>

          {/* End Date */}
          <div className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer group min-w-[130px]">
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
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[160px] py-1 max-h-[300px] overflow-y-auto">
                {employeeOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmployee(opt);
                      setEmployeeOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${employee === opt
                      ? 'text-[#353535] bg-gray-50'
                      : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'
                      }`}
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
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[130px] py-1 max-h-[300px] overflow-y-auto">
                {teamOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTeam(opt);
                      setTeamOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${team === opt
                      ? 'text-[#353535] bg-gray-50'
                      : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'
                      }`}
                  >
                    {opt === 'All' ? 'Team' : opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Show Entries */}
          <div className="relative flex items-center gap-2" ref={showSizeDropdownRef}>
            <span className="text-sm text-[#616161] font-medium">Show:</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSizeOpen(o => !o);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer"
            >
              <span className="text-sm font-medium text-[#353535]">{pageSize}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showSizeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showSizeOpen && (
              <div className="absolute top-full left-8 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[80px]">
                {pageSizeOptions.map(size => (
                  <button 
                    key={size} 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePageSizeChange(size);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${pageSize === size 
                      ? 'text-[#353535] bg-gray-50' 
                      : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'
                    }`}>
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 pr-1" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Sl.No</th>
                  <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Project Name</th>
                  <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Task</th>
                  <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Start Date</th>
                  <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">End Date</th>
                  <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Task Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((row, index) => {
                    const slNo = (currentPage * pageSize + index + 1).toString().padStart(2, '0');
                    const startDate = formatDate(row.start_time || row.Actual_start_time);
                    const endDate = formatDate(row.end_time || row.due_date);
                    const duration = calculateDuration(row);
                    
                    return (
                      <tr key={row.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}>
                        <td className="px-6 py-6 text-center text-sm text-gray-500 font-medium">{slNo}</td>
                        <td className="px-6 py-6 text-center text-sm text-gray-800 font-semibold">{row.project_name ?? '-'}</td>
                        <td className="px-6 py-6 text-center text-sm text-gray-600">{row.task_name ?? '-'}</td>
                        <td className="px-6 py-6 text-center text-sm text-gray-600">{startDate}</td>
                        <td className="px-6 py-6 text-center text-sm text-gray-600">{endDate}</td>
                        <td className="px-6 py-6 text-center text-sm text-gray-600 font-medium">{duration}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 0 && (
          <div className="flex items-center justify-end gap-1 px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-[#616161] font-medium mr-1">Showing:</span>
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-1 px-2 py-1 text-sm text-[#616161] hover:text-[#353535] disabled:opacity-40 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => {
              const start = i * pageSize + 1;
              const end = Math.min((i + 1) * pageSize, filteredList.length);
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentPage === i
                    ? 'bg-[#DD4342] text-white'
                    : 'text-[#616161] hover:text-[#353535]'
                    }`}
                >
                  {start}-{end}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="flex items-center gap-1 px-2 py-1 text-sm text-[#616161] hover:text-[#353535] disabled:opacity-40 transition-colors"
            >
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        )}
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
