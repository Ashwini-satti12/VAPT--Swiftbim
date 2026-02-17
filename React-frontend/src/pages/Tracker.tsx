import { useEffect, useState } from 'react';
import api from '../lib/api';

interface LocationEntry {
  id: number;
  full_name?: string;
  latitude?: number;
  longitude?: number;
  updated_at?: string;
}

export default function Tracker() {
  const [list, setList] = useState<LocationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ locations?: LocationEntry[] }>('/api/location/employees')
      .then(({ data }) => setList(data.locations ?? []))
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
      <h2 className="text-xl font-semibold text-slate-800">Employee Tracker</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Latitude</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Longitude</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No location data found.
                  </td>
                </tr>
              ) : (
                list.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{loc.full_name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{loc.latitude ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{loc.longitude ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{loc.updated_at ?? '-'}</td>
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
