import { useAuth } from '../../contexts/AuthContext';

export default function ProfilePM() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-slate-800">Profile</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-semibold">
            {(user?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-800">{user?.full_name ?? '-'}</h3>
            <p className="text-slate-600">{user?.email ?? '-'}</p>
            <p className="text-sm text-slate-500">{user?.user_role ?? 'Employee'}</p>
          </div>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Full Name</dt>
            <dd className="font-medium text-slate-800">{user?.full_name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-800">{user?.email ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium text-slate-800">{user?.user_role ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Company ID</dt>
            <dd className="font-medium text-slate-800">{user?.company_id ?? '-'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
