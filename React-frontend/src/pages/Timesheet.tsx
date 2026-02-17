import { useState } from 'react';
import api from '../lib/api';

interface TimesheetEntry {
  task_name?: string;
  completed_at?: string;
  assignee_name?: string;
}

export default function Timesheet() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [list, setList] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setLoading(true);
    api
      .post<{ completed_tasks?: TimesheetEntry[] }>('/api/timesheet/completed-tasks', {
        startDate,
        endDate,
      })
      .then(({ data }) => setList(data.completed_tasks ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Team Report</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4 p-4 bg-white rounded-xl border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get Report'}
        </button>
      </form>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Assignee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    Select date range and click Get Report.
                  </td>
                </tr>
              ) : (
                list.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-800">{row.task_name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.assignee_name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.completed_at ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
