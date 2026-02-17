import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';

interface Project { id: number; project_name?: string; progress?: number; due_date?: string; priority?: string; }
interface TaskRow { id: number; task_name?: string; status?: string; due_date?: string; }

export default function ClientProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<Project>(`/api/client/projects/${id}`),
      api.get<{ tasks: TaskRow[] }>(`/api/client/projects/${id}/tasks`),
    ]).then(([proj, tasksRes]) => { setProject(proj.data); setTasks(tasksRes.data.tasks ?? []); }).catch(() => setProject(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;
  if (!project) return <div className="text-center py-12 text-slate-500">Project not found. <Link to="/client/dashboard" className="text-[#3d3399] hover:underline">Back to Dashboard</Link></div>;

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');

  return (
    <div className="space-y-4">
      <Link to="/client/dashboard" className="text-[#3d3399] hover:underline text-sm font-medium">&larr; Back to Dashboard</Link>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap justify-between gap-4 mb-4">
          <div><h2 className="text-xl font-semibold text-slate-800">{project.project_name ?? 'Project'}</h2>{project.priority && <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700">{project.priority}</span>}</div>
          <div className="text-right"><p className="text-sm text-slate-500">Progress</p><p className="text-2xl font-bold text-[#3d3399]">{project.progress ?? 0}%</p></div>
        </div>
        {project.due_date && <p className="text-sm text-slate-600">Due: {formatDate(project.due_date)}</p>}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-2">Tasks</h3>
          {tasks.length === 0 ? <p className="text-slate-500 text-sm">No tasks listed.</p> : (
            <ul className="space-y-2">
              {tasks.map((t) => <li key={t.id} className="flex justify-between py-2 border-b border-slate-50 last:border-0"><span className="text-slate-800">{t.task_name ?? 'Task'}</span><span className="text-sm text-slate-500">{t.status ?? '-'} · {formatDate(t.due_date)}</span></li>)}
            </ul>
          )}
        </div>
        <div className="mt-6">
          <Link to={`/client/projects/${id}/milestones`} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700">Payment Milestones</Link>
        </div>
      </div>
    </div>
  );
}
