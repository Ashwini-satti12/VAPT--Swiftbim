import { useState, useMemo } from 'react';

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

const DUMMY_DATA: TimesheetEntry[] = [
  { id: 1, project_name: 'Binghatti', task_name: 'task 01', start_date: '20/02/2026', end_date: '20/02/2026', duration: '08:00:00', assignee_name: 'John Doe', team: 'Team A' },
  { id: 2, project_name: 'Suo01', task_name: 'task 02', start_date: '21/02/2026', end_date: '21/02/2026', duration: '07:30:00', assignee_name: 'Jane Smith', team: 'Team B' },
  { id: 3, project_name: 'Disu so', task_name: 'task 03', start_date: '22/02/2026', end_date: '22/02/2026', duration: '06:45:00', assignee_name: 'John Doe', team: 'Team A' },
  { id: 4, project_name: 'Tshingin', task_name: 'task 04', start_date: '23/02/2026', end_date: '23/02/2026', duration: '08:15:00', assignee_name: 'Alice Brown', team: 'Team C' },
  { id: 5, project_name: 'Project Alpha', task_name: 'task 05', start_date: '24/02/2026', end_date: '24/02/2026', duration: '05:00:00', assignee_name: 'Jane Smith', team: 'Team B' },
  { id: 6, project_name: 'Project Beta', task_name: 'task 06', start_date: '25/02/2026', end_date: '25/02/2026', duration: '09:00:00', assignee_name: 'Bob Wilson', team: 'Team A' },
];

export default function TimesheetPM() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employee, setEmployee] = useState('All');
  const [team, setTeam] = useState('All');
  const [list] = useState<TimesheetEntry[]>(DUMMY_DATA);

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

  return (
    <div className="p-1 md:p-6 space-y-8 flex flex-col h-full bg-white">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-shrink-0 px-2">
        <h2 className="text-2xl font-bold text-gray-900">Time-Sheet</h2>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
        <h3 className="text-xl font-bold text-gray-800">Month Report</h3>

        <div className="flex flex-wrap items-center gap-3">
          {/* Start Date */}
          <div className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-xl hover:bg-gray-200 transition-all cursor-pointer group min-w-[130px]">
            <span className="text-[#616161] text-sm font-medium">
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
          <div className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-xl hover:bg-gray-200 transition-all cursor-pointer group min-w-[130px]">
            <span className="text-[#616161] text-sm font-medium">
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

          {/* Employee Dropdown */}
          <div className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-xl hover:bg-gray-200 transition-all cursor-pointer min-w-[130px]">
            <select
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              className="bg-transparent border-none outline-none text-[#616161] text-sm font-medium cursor-pointer appearance-none w-full pr-6"
            >
              <option value="All">Employee</option>
              <option value="John Doe">John Doe</option>
              <option value="Jane Smith">Jane Smith</option>
              <option value="Alice Brown">Alice Brown</option>
              <option value="Bob Wilson">Bob Wilson</option>
            </select>
            <div className="absolute right-3 pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Team Dropdown */}
          <div className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-xl hover:bg-gray-200 transition-all cursor-pointer min-w-[100px]">
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="bg-transparent border-none outline-none text-[#616161] text-sm font-medium cursor-pointer appearance-none w-full pr-6"
            >
              <option value="All">Team</option>
              <option value="Team A">Team A</option>
              <option value="Team B">Team B</option>
              <option value="Team C">Team C</option>
            </select>
            <div className="absolute right-3 pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={filteredList.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-lg font-gantari font-semibold hover:bg-[#c43a39] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V3M12 15L8 11M12 15L16 11M5 20H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[16px]">Download</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
        <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 pr-1" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100 bg-white">
                <th className="px-6 py-6 text-center text-sm font-bold text-gray-700 bg-white">Sl.No</th>
                <th className="px-6 py-6 text-left text-sm font-bold text-gray-700 bg-white">Project Name</th>
                <th className="px-6 py-6 text-center text-sm font-bold text-gray-700 bg-white">Task</th>
                <th className="px-6 py-6 text-center text-sm font-bold text-gray-700 bg-white">Start Date</th>
                <th className="px-6 py-6 text-center text-sm font-bold text-gray-700 bg-white">End Date</th>
                <th className="px-6 py-6 text-center text-sm font-bold text-gray-700 bg-white">Task Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredList.map((row, index) => {
                  const slNo = (index + 1).toString().padStart(2, '0');
                  return (
                    <tr key={row.id} className={`${index % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                      <td className="px-6 py-5 text-center text-sm text-gray-500 font-medium">{slNo}</td>
                      <td className="px-6 py-5 text-left text-sm text-gray-800 font-semibold">{row.project_name ?? '-'}</td>
                      <td className="px-6 py-5 text-center text-sm text-gray-600">{row.task_name ?? '-'}</td>
                      <td className="px-6 py-5 text-center text-sm text-gray-600">{row.start_date ?? '-'}</td>
                      <td className="px-6 py-5 text-center text-sm text-gray-600">{row.end_date ?? '-'}</td>
                      <td className="px-6 py-5 text-center text-sm text-gray-600 font-medium">{row.duration ?? 'hh:mm:ss'}</td>
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
