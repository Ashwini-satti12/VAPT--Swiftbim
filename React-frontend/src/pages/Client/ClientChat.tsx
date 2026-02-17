import { useAuth } from '../../contexts/AuthContext';

export default function ClientChat() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Chat</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <p>Chat with your project team will be available here.</p>
        <p className="text-sm mt-2">Logged in as: {user?.email}</p>
      </div>
    </div>
  );
}
