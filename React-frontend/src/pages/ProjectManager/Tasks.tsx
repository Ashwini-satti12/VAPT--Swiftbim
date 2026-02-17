import { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import api from '../../lib/api';

interface Task {
  id: number;
  task_name?: string;
  status?: string;
  due_date?: string;
  project_name?: string;
}

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const isTeam = searchParams.get('condition') === '1' || pathname.endsWith('/team');
  const statusFilter = searchParams.get('status') || searchParams.get('taskstatus');
  const [list, setList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (isTeam) params.condition = '1';
    api
      .get<{ tasks?: Task[] }>('/api/tasks', { params })
      .then(({ data }) => setList(data.tasks ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [isTeam, statusFilter]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">{isTeam ? 'Team Task' : 'My Task'}</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No tasks found.
                  </td>
                </tr>
              ) : (
                list.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{t.task_name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.project_name ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                        {t.status ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.due_date ?? '-'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/tasks/${t.id}`} className="text-sm font-medium text-[#3d3399] hover:underline">
                        View
                      </Link>
                    </td>
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
