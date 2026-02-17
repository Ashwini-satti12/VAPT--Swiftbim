import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api';

interface ClientDetailType {
  id: number;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  projectName?: string;
  budget?: string;
  startDate?: string;
  endDate?: string;
  GSTNumber?: string;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<ClientDetailType>(`/api/clients/${id}`)
      .then(({ data }) => setClient(data))
      .catch(() => setClient(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12 text-slate-500">
        Client not found. <Link to="/clients" className="text-[#3d3399] hover:underline">Back to Clients</Link>
      </div>
    );
  }

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');

  return (
    <div className="space-y-4">
      <Link to="/clients" className="text-[#3d3399] hover:underline text-sm font-medium inline-flex items-center gap-1">
        &larr; Back to Clients
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#3d3399]/20 flex items-center justify-center text-xl font-semibold text-[#3d3399]">
              {(client.fullName || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{client.fullName ?? 'Client'}</h2>
              <p className="text-slate-500">{client.email ?? '-'}</p>
            </div>
          </div>
          <Link to={`/clients?edit=${client.id}`} className="px-4 py-2 rounded-lg border border-[#3d3399] text-[#3d3399] font-medium hover:bg-[#3d3399]/10">Edit</Link>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-800">{client.phoneNumber ?? '-'}</dd></div>
          <div><dt className="text-slate-500">Project</dt><dd className="font-medium text-slate-800">{client.projectName ?? '-'}</dd></div>
          <div><dt className="text-slate-500">Budget</dt><dd className="font-medium text-slate-800">{client.budget ?? '-'}</dd></div>
          <div><dt className="text-slate-500">GST Number</dt><dd className="font-medium text-slate-800">{client.GSTNumber ?? '-'}</dd></div>
          <div><dt className="text-slate-500">Start Date</dt><dd className="font-medium text-slate-800">{formatDate(client.startDate)}</dd></div>
          <div><dt className="text-slate-500">End Date</dt><dd className="font-medium text-slate-800">{formatDate(client.endDate)}</dd></div>
          {client.address && <div className="sm:col-span-2"><dt className="text-slate-500">Address</dt><dd className="font-medium text-slate-800">{client.address}</dd></div>}
        </dl>
      </div>
    </div>
  );
}
