import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

type Project = { id: number; project_name?: string; progress?: number; task_count?: number; completed_count?: number; total_tasks?: number; completed_tasks?: number; priority?: string };
type Stats = { total_projects: number; total_tasks: number; completed_tasks: number; total_budget: number; total_paid: number; total_pending: number; payment_progress: number };

export default function ClientDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ stats: Stats; projects: Project[] }>('/api/client/dashboard').then((r) => { setStats(r.data.stats); setProjects(r.data.projects || []); }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;
  const s = stats || { total_projects: 0, total_tasks: 0, completed_tasks: 0, total_budget: 0, total_paid: 0, total_pending: 0, payment_progress: 0 };

  return (
    <div className="space-y-6 ">
      <h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-slate-500">Projects</p><p className="text-2xl font-bold text-[#3d3399]">{s.total_projects}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-slate-500">Tasks</p><p className="text-2xl font-bold">{s.total_tasks}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-slate-500">Completed</p><p className="text-2xl font-bold text-emerald-600">{s.completed_tasks}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-slate-500">Payment</p><p className="text-2xl font-bold">{s.payment_progress}%</p></div>
      </div>
      {s.total_budget > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4"><p className="text-sm text-slate-500">Budget</p><p className="font-bold">{s.total_budget.toLocaleString()} INR</p></div>
          <div className="bg-white rounded-xl border p-4"><p className="text-sm text-slate-500">Paid</p><p className="font-bold text-emerald-600">{s.total_paid.toLocaleString()} INR</p></div>
          <div className="bg-white rounded-xl border p-4"><p className="text-sm text-slate-500">Pending</p><p className="font-bold text-amber-600">{s.total_pending.toLocaleString()} INR</p></div>
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Projects</h3>
        {projects.length === 0 ? <div className="bg-white rounded-xl border p-8 text-center text-slate-500">No projects assigned.</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border p-4">
                <h4 className="font-semibold text-slate-800">{p.project_name || 'Project'}</h4>
                <p className="text-sm text-slate-500 mt-1">Progress: {p.progress ?? 0}%</p>
                <div className="flex gap-2 mt-3">
                  <Link to={`/client/projects/${p.id}`} className="flex-1 text-center px-3 py-2 rounded-lg bg-[#3d3399] text-white text-sm font-medium">View More</Link>
                  <Link to={`/client/projects/${p.id}/milestones`} className="flex-1 text-center px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">Payment</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
