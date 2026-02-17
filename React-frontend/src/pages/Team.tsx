import { useEffect, useState } from 'react';
import api from '../lib/api';

interface Team {
  id: number;
  team_name?: string;
  leader_name?: string;
}

export default function Team() {
  const [list, setList] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ teams?: Team[] }>('/api/teams')
      .then(({ data }) => setList(data.teams ?? []))
      .catch(() => setList([]))
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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Create Team</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Team</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Leader</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                    No teams found.
                  </td>
                </tr>
              ) : (
                list.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{t.team_name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.leader_name ?? '-'}</td>
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
