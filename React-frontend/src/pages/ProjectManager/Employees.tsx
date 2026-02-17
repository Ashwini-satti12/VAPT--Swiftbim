import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

interface Employee {
  id: number;
  full_name: string;
  email: string;
  user_role?: string;
  active?: string;
  empid?: string;
  phone_number?: string;
  department?: string;
  address?: string;
}

const ROLE_OPTIONS = [
  'Consultant',
  'BIM Coordinator',
  'BIM Lead',
  'Project Manager',
  'Technical Director',
  'CEO',
  'CTO',
];

export default function Employees() {
  const { user } = useAuth();
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    user_role: 'Consultant',
    department: '',
    address: '',
  });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [inactiveIds, setInactiveIds] = useState<number[]>([]);
  const [inactiveSubmitting, setInactiveSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone_number: '', user_role: 'Consultant', department: '', address: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const canAdd = user?.panel_type === 1;

  useEffect(() => {
    api.get<{ employees?: Employee[] }>('/api/employees').then(({ data }) => setList(data.employees ?? [])).catch(() => setList([])).finally(() => setLoading(false));
  }, []);

  const editParam = searchParams.get('edit');
  useEffect(() => {
    if (editParam && list.length) {
      const id = parseInt(editParam, 10);
      const emp = list.find((e) => e.id === id);
      if (emp) {
        setEditId(id);
        setEditForm({ full_name: emp.full_name, email: emp.email, phone_number: emp.phone_number || '', user_role: emp.user_role || 'Consultant', department: emp.department || '', address: emp.address || '' });
      }
    }
  }, [editParam, list]);

  function exportCsv() {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Phone', 'Department'];
    const rows = list.map((e) => [e.full_name, e.email, e.user_role || '', e.active || '', e.phone_number || '', e.department || ''].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'consultants.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const emails = inviteEmails.replace(/,/g, ' ').split(/\s+/).filter((e) => e.trim());
    if (!emails.length) return;
    setInviteSubmitting(true);
    api.post('/api/employees/invite', { emails }).then(() => { setShowInviteModal(false); setInviteEmails(''); }).catch(() => { }).finally(() => setInviteSubmitting(false));
  }

  function handleInactive() {
    if (!inactiveIds.length) return;
    setInactiveSubmitting(true);
    api.post('/api/employees/bulk-status', { ids: inactiveIds, action: 'inactive' }).then(() => { setList((prev) => prev.map((e) => (inactiveIds.includes(e.id) ? { ...e, active: 'inactive' } : e))); setShowInactiveModal(false); setInactiveIds([]); }).catch(() => { }).finally(() => setInactiveSubmitting(false));
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditSubmitting(true);
    api.patch(`/api/employees/${editId}`, { full_name: editForm.full_name, email: editForm.email, phone_number: editForm.phone_number || undefined, user_role: editForm.user_role, department: editForm.department || undefined, address: editForm.address || undefined }).then(() => { setList((prev) => prev.map((e) => (e.id === editId ? { ...e, ...editForm } : e))); setEditId(null); setSearchParams({}); }).catch(() => { }).finally(() => setEditSubmitting(false));
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setAddError('Name, email and password are required.');
      return;
    }
    setAddSubmitting(true);
    api
      .post<{ success: boolean; id?: number; message?: string }>('/api/employees', {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone_number: form.phone_number.trim() || undefined,
        user_role: form.user_role,
        department: form.department.trim() || undefined,
        address: form.address.trim() || undefined,
      })
      .then(({ data }) => {
        if (data.success) {
          setShowAddModal(false);
          setForm({ full_name: '', email: '', password: '', phone_number: '', user_role: 'Consultant', department: '', address: '' });
          setList((prev) => [...prev, { id: data.id!, full_name: form.full_name, email: form.email, user_role: form.user_role, active: 'active' }]);
        } else {
          setAddError(data.message || 'Failed to add consultant.');
        }
      })
      .catch((err) => setAddError(err.response?.data?.message || 'Failed to add consultant.'))
      .finally(() => setAddSubmitting(false));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Consultants</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 text-sm ${viewMode === 'card' ? 'bg-[#3d3399] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm ${viewMode === 'table' ? 'bg-[#3d3399] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Table
            </button>
          </div>
          {canAdd && (
            <>
              <button type="button" onClick={() => setShowInviteModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">
                Invite
              </button>
              <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">
                Export to CSV
              </button>
              <button type="button" onClick={() => setShowInactiveModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">
                Inactive
              </button>
              <button type="button" onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3d3399] text-white font-medium hover:bg-[#2d2389] transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8v8m0-8H4" /></svg>
                Add Consultant
              </button>
            </>
          )}
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              No consultants found.
            </div>
          ) : (
            list.map((emp) => (
              <div key={emp.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#3d3399]/20 flex items-center justify-center text-lg font-semibold text-[#3d3399] shrink-0">{(emp.full_name || '?').charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800 truncate">{emp.full_name}</h3>
                    <p className="text-sm text-slate-500 truncate">{emp.email}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{emp.user_role || '-'}</p>
                    <span className={`inline-flex mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${emp.active === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{emp.active || 'inactive'}</span>
                    <div className="flex gap-2 mt-2">
                      <Link to={`/employees/${emp.id}`} className="text-sm font-medium text-[#3d3399] hover:underline">View</Link>
                      {canAdd && <button type="button" onClick={() => { setEditId(emp.id); setEditForm({ full_name: emp.full_name, email: emp.email, phone_number: emp.phone_number || '', user_role: emp.user_role || 'Consultant', department: emp.department || '', address: emp.address || '' }); }} className="text-sm font-medium text-[#bc2d75] hover:underline">Edit</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No consultants found.
                    </td>
                  </tr>
                ) : (
                  list.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800">{emp.full_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{emp.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{emp.user_role || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${emp.active === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{emp.active || 'inactive'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/employees/${emp.id}`} className="text-sm font-medium text-[#3d3399] hover:underline mr-2">View</Link>
                        {canAdd && <button type="button" onClick={() => { setEditId(emp.id); setEditForm({ full_name: emp.full_name, email: emp.email, phone_number: emp.phone_number || '', user_role: emp.user_role || 'Consultant', department: emp.department || '', address: emp.address || '' }); }} className="text-sm font-medium text-[#bc2d75] hover:underline">Edit</button>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Add Consultant</h3>
              <button type="button" onClick={() => { setShowAddModal(false); setAddError(''); }} className="p-1 rounded hover:bg-slate-100 text-slate-500">×</button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {addError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{addError}</p>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input type="text" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399] focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399] focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399] focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input type="text" value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={form.user_role} onChange={(e) => setForm((f) => ({ ...f, user_role: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399] focus:border-transparent">
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input type="text" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399] focus:border-transparent" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addSubmitting} className="px-4 py-2 rounded-lg bg-[#3d3399] text-white font-medium hover:bg-[#2d2389] disabled:opacity-50">{addSubmitting ? 'Adding...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-slate-800">Invite Consultant</h3><button type="button" onClick={() => setShowInviteModal(false)} className="p-1 rounded hover:bg-slate-100">×</button></div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email addresses (comma or space separated)</label>
                <textarea value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399]" placeholder="email1@example.com, email2@example.com" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700">Cancel</button>
                <button type="submit" disabled={inviteSubmitting} className="px-4 py-2 rounded-lg bg-[#3d3399] text-white font-medium disabled:opacity-50">{inviteSubmitting ? 'Sending...' : 'Send Invite'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInactiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-slate-800">Mark as Inactive</h3><button type="button" onClick={() => { setShowInactiveModal(false); setInactiveIds([]); }} className="p-1 rounded hover:bg-slate-100">×</button></div>
            <p className="text-sm text-slate-600 mb-4">Select consultants to mark as inactive.</p>
            <div className="space-y-2 mb-4">
              {list.filter((e) => e.active !== 'inactive').map((emp) => (
                <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={inactiveIds.includes(emp.id)} onChange={(e) => setInactiveIds((prev) => (e.target.checked ? [...prev, emp.id] : prev.filter((id) => id !== emp.id)))} />
                  <span className="text-sm">{emp.full_name} ({emp.email})</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowInactiveModal(false); setInactiveIds([]); }} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700">Cancel</button>
              <button type="button" onClick={handleInactive} disabled={!inactiveIds.length || inactiveSubmitting} className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50">Mark Inactive</button>
            </div>
          </div>
        </div>
      )}

      {editId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-slate-800">Edit Consultant</h3><button type="button" onClick={() => { setEditId(null); setSearchParams({}); }} className="p-1 rounded hover:bg-slate-100">×</button></div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input type="text" value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399]" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Email *</label><input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399]" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="text" value={editForm.phone_number} onChange={(e) => setEditForm((f) => ({ ...f, phone_number: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399]" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Role</label><select value={editForm.user_role} onChange={(e) => setEditForm((f) => ({ ...f, user_role: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399]">{ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Department</label><input type="text" value={editForm.department} onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399]" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Address</label><input type="text" value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399]" /></div>
              <div className="flex gap-2 justify-end pt-2"><button type="button" onClick={() => { setEditId(null); setSearchParams({}); }} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700">Cancel</button><button type="submit" disabled={editSubmitting} className="px-4 py-2 rounded-lg bg-[#3d3399] text-white font-medium disabled:opacity-50">{editSubmitting ? 'Saving...' : 'Save'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
