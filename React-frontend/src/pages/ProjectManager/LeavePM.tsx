import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api';

interface LeaveType {
  id: number;
  leave_type?: string;
  balance?: number;
}

interface LeaveApp {
  id: number;
  leave_type?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export default function LeavePM() {
  const [searchParams] = useSearchParams();
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [applications, setApplications] = useState<LeaveApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ leave_types?: LeaveType[] }>('/api/leave/types').then((r) => r.data.leave_types ?? []),
      api.get<{ applications?: LeaveApp[] }>('/api/leave/applications').then((r) => r.data.applications ?? []),
    ])
      .then(([t, a]) => {
        setTypes(t);
        setApplications(a);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Manage Leave</h2>
      {types.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-medium text-slate-700 mb-3">Leave balance</h3>
          <div className="flex flex-wrap gap-4">
            {types.map((t) => (
              <div key={t.id} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700">
                {t.leave_type}: {t.balance ?? 0}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <h3 className="font-medium text-slate-700 p-4 border-b border-slate-200">My applications</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Start</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">End</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(() => {
                const searchQuery = searchParams.get("q")?.toLowerCase() || "";
                const filtered = applications.filter(a => {
                  if (!searchQuery) return true;
                  return [
                    a.leave_type,
                    a.status
                  ].some(f => (f || "").toLowerCase().includes(searchQuery));
                });
                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        {searchQuery ? "No applications match your search." : "No leave applications."}
                      </td>
                    </tr>
                  );
                }
                return filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-800">{a.leave_type ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.start_date ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.end_date ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                        {a.status ?? '-'}
                      </span>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
