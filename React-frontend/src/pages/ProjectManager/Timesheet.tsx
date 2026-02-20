import { useState, useMemo } from 'react';

interface TimesheetEntry {
  id: number;
  project_name?: string;
  task_name?: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  assignee_name?: string;
}

const DUMMY_DATA: TimesheetEntry[] = [
  { id: 1, project_name: 'Binghatti', task_name: 'task 01', start_date: 'dd/mm/yyyy', end_date: 'dd/mm/yyyy', duration: 'hh:mm:ss' },
  { id: 2, project_name: 'Suo01', task_name: 'task 02', start_date: 'dd/mm/yyyy', end_date: 'dd/mm/yyyy', duration: 'hh:mm:ss' },
  { id: 3, project_name: 'Disu so', task_name: 'task 03', start_date: 'dd/mm/yyyy', end_date: 'dd/mm/yyyy', duration: 'hh:mm:ss' },
  { id: 4, project_name: 'Tshingin', task_name: 'task 04', start_date: 'dd/mm/yyyy', end_date: 'dd/mm/yyyy', duration: 'hh:mm:ss' },
  { id: 5, project_name: 'Project Alpha', task_name: 'task 05', start_date: 'dd/mm/yyyy', end_date: 'dd/mm/yyyy', duration: 'hh:mm:ss' },
  { id: 6, project_name: 'Project Beta', task_name: 'task 06', start_date: 'dd/mm/yyyy', end_date: 'dd/mm/yyyy', duration: 'hh:mm:ss' },
];

export default function Timesheet() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employee, setEmployee] = useState('All');
  const [team, setTeam] = useState('All');
  const [list, setList] = useState<TimesheetEntry[]>([]);

  // Fetch data (using dummy as fallback)
  useMemo(() => {
    if (list.length === 0) {
      setList(DUMMY_DATA);
    }
  }, [list]);

  const handleDownload = () => {
    // Logic for download report
  };

  return (
    <div className="p-1 md:p-4 space-y-6 flex flex-col h-full">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Time-Sheet</h2>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-2 bg-[#DD4342] text-white rounded-lg font-medium hover:bg-[#c43a39] transition-all shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 11V17L11 15M9 17L7 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 10V15C22 19 20 21 16 21H8C4 21 2 19 2 15V9C2 5 4 3 8 3H11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 10H18C15 10 14 9 14 6V2L22 10Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-800">Month Report</h3>

        <div className="flex flex-wrap items-center gap-3">
          {/* Start Date */}
          <div className="relative flex items-center justify-between gap-8 px-5 py-2.5 bg-[#EAEAEA] rounded-2xl hover:bg-gray-200 transition-all cursor-pointer group min-w-[160px]">
            <span className="text-[#424242] text-sm font-semibold">
              {startDate ? startDate.split('-').reverse().join('/') : 'Start Date'}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
          <div className="relative flex items-center justify-between gap-8 px-5 py-2.5 bg-[#EAEAEA] rounded-2xl hover:bg-gray-200 transition-all cursor-pointer group min-w-[160px]">
            <span className="text-[#424242] text-sm font-semibold">
              {endDate ? endDate.split('-').reverse().join('/') : 'End Date'}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
          <div className="relative flex items-center justify-between gap-2 px-3 py-2 bg-[#F3F4F6] border border-transparent rounded-lg hover:bg-gray-200 transition-colors">
            <select
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              className="bg-transparent border-none outline-none text-[#616161] text-xs font-medium cursor-pointer appearance-none pr-4"
            >
              <option value="All">Employee</option>
              <option value="Binghatti">Binghatti</option>
              <option value="Suo01">Suo01</option>
            </select>
            <div className="absolute right-2 pointer-events-none">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Team Dropdown */}
          <div className="relative flex items-center justify-between gap-2 px-3 py-2 bg-[#F3F4F6] border border-transparent rounded-lg hover:bg-gray-200 transition-colors">
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="bg-transparent border-none outline-none text-[#616161] text-xs font-medium cursor-pointer appearance-none pr-4"
            >
              <option value="All">Team</option>
              <option value="A">Team A</option>
              <option value="B">Team B</option>
            </select>
            <div className="absolute right-2 pointer-events-none">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-auto custom-scrollbar flex-1" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100 bg-white">
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700">Sl.No</th>
                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700">Project Name</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700">Task</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700">Start Date</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700">End Date</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700">Task Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                    No report data available.
                  </td>
                </tr>
              ) : (
                list.map((row, index) => {
                  const slNo = (index + 1).toString().padStart(2, '0');
                  return (
                    <tr key={row.id} className={`${index % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                      <td className="px-6 py-5 text-center text-sm text-gray-600 font-medium">{slNo}</td>
                      <td className="px-6 py-5 text-left text-sm text-gray-900 font-semibold">{row.project_name ?? '-'}</td>
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}

