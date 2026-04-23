import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';

interface Milestone {
  id: number;
  milestone_name?: string;
  milestone_amount?: number;
  due_date?: string;
  status?: string;
  notes?: string;
}

export default function ClientMilestones() {
  const { id } = useParams<{ id: string }>();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get<{ name?: string }>(`/api/client/projects/${id}`).then(({ data }) => setProjectName((data as { project_name?: string }).project_name ?? '')).catch(() => { });
    api
      .get<{ milestones: Milestone[] }>(`/api/client/projects/${id}/milestones`)
      .then(({ data }) => setMilestones(data.milestones ?? []))
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');
  const total = milestones.reduce((s, m) => s + Number(m.milestone_amount || 0), 0);
  const paid = milestones.filter((m) => (m.status || '').trim() === 'Paid').reduce((s, m) => s + Number(m.milestone_amount || 0), 0);

  return (
    <div className="space-y-4">
      <Link to="/client/dashboard" className="text-[#3d3399] hover:underline text-sm font-medium">&larr; Back to Dashboard</Link>
      {id && <Link to={`/client/projects/${id}`} className="ml-4 text-slate-600 hover:underline text-sm">Project detail</Link>}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Payment Milestones</h2>
        {projectName && <p className="text-sm text-slate-500 mb-4">{projectName}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div><p className="text-sm text-slate-500">Total</p><p className="text-lg font-bold text-slate-800">{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</p></div>
          <div><p className="text-sm text-slate-500">Paid</p><p className="text-lg font-bold text-emerald-600">{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</p></div>
        </div>
        {milestones.length === 0 ? (
          <p className="text-slate-500">No milestones for this project.</p>
        ) : (
          <ul className="space-y-3">
            {milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="font-medium text-slate-800">{m.milestone_name ?? 'Milestone'}</p>
                  {m.due_date && <p className="text-xs text-slate-500">Due: {formatDate(m.due_date)}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800">{Number(m.milestone_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${(m.status || '').trim() === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {m.status || 'Pending'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
