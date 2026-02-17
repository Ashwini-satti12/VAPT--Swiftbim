import { useEffect, useState } from 'react';
import api from '../../lib/api';

interface Message {
  id: number;
  message?: string;
  sender_name?: string;
  created_at?: string;
}

export default function Chat() {
  const [list, setList] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ messages?: Message[] }>('/api/messages')
      .then(({ data }) => setList(data.messages ?? []))
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
      <h2 className="text-xl font-semibold text-slate-800">Chat</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {list.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No messages yet.</p>
        ) : (
          <ul className="space-y-3">
            {list.map((m) => (
              <li key={m.id} className="border-b border-slate-100 pb-3 last:border-0">
                <p className="text-sm font-medium text-slate-700">{m.sender_name ?? 'Unknown'}</p>
                <p className="text-slate-600">{m.message ?? '-'}</p>
                <p className="text-xs text-slate-400 mt-1">{m.created_at}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
