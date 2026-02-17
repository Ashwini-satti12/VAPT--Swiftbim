import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

interface Client {
  id: number;
  fullName?: string;
  client_name?: string;
  email?: string;
  company_name?: string;
  projectName?: string;
  phoneNumber?: string;
  address?: string;
  budget?: string;
  status?: string;
  projectBudget?: string;
  projectStartDate?: string;
  projectEndDate?: string;
  totalHours?: string;
  companyGstNumber?: string;
  resourceInvolved?: string;
}

export default function Clients() {
  const { user } = useAuth();
  const [list, setList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    projectName: '',
    projectBudget: '',
    projectStartDate: '',
    projectEndDate: '',
    totalHours: '',
    companyGstNumber: '',
    resourceInvolved: ''
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    projectName: '',
    budget: '',
    projectBudget: '',
    projectStartDate: '',
    projectEndDate: '',
    totalHours: '',
    companyGstNumber: '',
    resourceInvolved: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const canAdd = user?.panel_type === 1;

  useEffect(() => {
    api.get<{ clients?: Client[] }>('/api/clients')
      .then(({ data }) => setList(data.clients ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const editParam = searchParams.get('edit');
  useEffect(() => {
    if (!editParam || !list.length) return;
    const id = parseInt(editParam, 10);
    if (!id || !list.some((x) => x.id === id)) return;
    setEditId(id);
    api.get<Client & { address?: string; budget?: string }>(`/api/clients/${id}`).then(({ data }) => setEditForm({
      fullName: data.fullName ?? '',
      email: data.email ?? '',
      phoneNumber: data.phoneNumber ?? '',
      address: data.address ?? '',
      projectName: data.projectName ?? '',
      budget: data.budget ?? '',
      projectBudget: data.projectBudget ?? '',
      projectStartDate: data.projectStartDate ?? '',
      projectEndDate: data.projectEndDate ?? '',
      totalHours: data.totalHours ?? '',
      companyGstNumber: data.companyGstNumber ?? '',
      resourceInvolved: data.resourceInvolved ?? ''
    })).catch(() => { });
  }, [editParam, list.length]);

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    if (!form.fullName.trim()) {
      setAddError('Client name is required.');
      return;
    }
    setAddSubmitting(true);
    api
      .post<{ success: boolean; id?: number; message?: string }>('/api/clients', {
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        address: form.address.trim() || undefined,
      })
      .then(({ data }) => {
        if (data.success) {
          setShowAddModal(false);
          setForm({
            fullName: '',
            email: '',
            phoneNumber: '',
            address: '',
            projectName: '',
            projectBudget: '',
            projectStartDate: '',
            projectEndDate: '',
            totalHours: '',
            companyGstNumber: '',
            resourceInvolved: ''
          });
          setList((prev) => [...prev, { id: data.id!, fullName: form.fullName, email: form.email, phoneNumber: form.phoneNumber }]);
        } else {
          setAddError(data.message || 'Failed to add client.');
        }
      })
      .catch((err) => setAddError(err.response?.data?.message || 'Failed to add client.'))
      .finally(() => setAddSubmitting(false));
  }

  const displayName = (c: Client) => c.fullName ?? c.client_name ?? '-';
  const displayLocation = (c: Client) => c.address ?? 'Not specified';

  function openEdit(id: number) {
    setEditId(id);
    api.get<Client>(`/api/clients/${id}`).then(({ data }) => setEditForm({
      fullName: data.fullName ?? '',
      email: data.email ?? '',
      phoneNumber: data.phoneNumber ?? '',
      address: data.address ?? '',
      projectName: data.projectName ?? '',
      projectBudget: data.projectBudget ?? '',
      projectStartDate: data.projectStartDate ?? '',
      projectEndDate: data.projectEndDate ?? '',
      totalHours: data.totalHours ?? '',
      companyGstNumber: data.companyGstNumber ?? '',
      resourceInvolved: data.resourceInvolved ?? '',
      budget: data.budget ?? ''
    })).catch(() => { });
  }

  function openView(id: number) {
    const client = list.find(c => c.id === id);
    if (client) {
      setViewClient(client);
      setViewId(id);
    }
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditSubmitting(true);
    api.patch(`/api/clients/${editId}`, {
      fullName: editForm.fullName,
      email: editForm.email,
      phoneNumber: editForm.phoneNumber || undefined,
      address: editForm.address || undefined,
      projectName: editForm.projectName || undefined,
      budget: editForm.budget || undefined,
      projectBudget: editForm.projectBudget || undefined,
      projectStartDate: editForm.projectStartDate || undefined,
      projectEndDate: editForm.projectEndDate || undefined,
      totalHours: editForm.totalHours || undefined,
      companyGstNumber: editForm.companyGstNumber || undefined,
      resourceInvolved: editForm.resourceInvolved || undefined
    }).then(() => { setList((prev) => prev.map((c) => (c.id === editId ? { ...c, ...editForm } : c))); setEditId(null); setSearchParams({}); }).catch(() => { }).finally(() => setEditSubmitting(false));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E14B4B]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-2xl font-bold text-slate-800">Clients</h2>
        {canAdd && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#E14B4B] text-white font-semibold hover:bg-[#c93d3d] transition shadow-md shadow-red-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </button>
        )}
      </div>

      <div className="flex-1 mt-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {list.length === 0 ? (
            <div className="col-span-full bg-white/50 backdrop-blur-sm rounded-[20px] p-12 text-center text-slate-500 border border-white/40">
              No clients found.
            </div>
          ) : (
            list.map((c, idx) => (
              <div key={c.id} className="bg-white rounded-[20px] shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col group">
                {/* Card Cover */}
                <div className="relative h-32 w-full overflow-hidden">
                  <div className="absolute inset-0 bg-[#1a1a1a]">
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-600 via-slate-800 to-black" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30" />
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${idx % 3 === 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${idx % 3 === 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                      {idx % 3 === 0 ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="relative pt-12 pb-6 px-6 flex-1 flex flex-col items-center">
                  {/* Profile Image Overlay */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName(c))}&background=random&size=128`}
                      alt={displayName(c)}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{displayName(c)}</h3>
                    <p className="text-sm text-slate-500 flex items-center justify-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {displayLocation(c)}
                    </p>
                  </div>

                  {/* Quick Actions (Mail, Message, Call) */}
                  <div className="flex gap-4 mb-8">
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-[#3d3399] hover:text-white transition shadow-sm border border-slate-100" title="Mail">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-[#3d3399] hover:text-white transition shadow-sm border border-slate-100" title="Message">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-[#3d3399] hover:text-white transition shadow-sm border border-slate-100" title="Call">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>
                  </div>

                  {/* Bottom Actions */}
                  <div className="w-full flex gap-3 mt-auto">
                    <button
                      type="button"
                      onClick={() => openView(c.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[#E14B4B] text-white font-bold text-sm hover:bg-[#c93d3d] transition shadow-sm shadow-red-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(c.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition border border-slate-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.242 3.758a2.121 2.121 0 013.03 3.03L9 16.5 4.5 17.5l1-4.5 10.742-10.742z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-2xl w-full transition-all animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="relative p-6 border-b border-slate-100">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setAddError(''); }}
                className="absolute left-6 top-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
              >
                ×
              </button>
              <h3 className="text-center text-lg font-bold text-slate-800">Add New Client</h3>
            </div>

            <div className="p-8">
              <form onSubmit={handleAddSubmit} className="space-y-5">
                {addError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{addError}</p>}

                {/* Row 1: Client Name & Phone Number */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Client Name*</label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Client name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Phone Number*</label>
                    <input
                      type="tel"
                      value={form.phoneNumber}
                      onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Email Address & Company GST Number */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Email Address*</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Phone Number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Company GST Number*</label>
                    <input
                      type="text"
                      value={form.companyGstNumber}
                      onChange={(e) => setForm((f) => ({ ...f, companyGstNumber: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter GST Number"
                      required
                    />
                  </div>
                </div>

                {/* Row 3: Project Name & Project Budget */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Project Name*</label>
                    <input
                      type="text"
                      value={form.projectName}
                      onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Project Name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Project Budget*</label>
                    <input
                      type="text"
                      value={form.projectBudget}
                      onChange={(e) => setForm((f) => ({ ...f, projectBudget: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Budget"
                      required
                    />
                  </div>
                </div>

                {/* Row 4: Project Start Date & Project End Date */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Project Start Date*</label>
                    <input
                      type="text"
                      value={form.projectStartDate}
                      onChange={(e) => setForm((f) => ({ ...f, projectStartDate: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="DD/MM/YYYY"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Project End Date*</label>
                    <input
                      type="text"
                      value={form.projectEndDate}
                      onChange={(e) => setForm((f) => ({ ...f, projectEndDate: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="DD/MM/YYYY"
                      required
                    />
                  </div>
                </div>

                {/* Row 5: Total Hours & Resource Involved */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Total Hours*</label>
                    <input
                      type="text"
                      value={form.totalHours}
                      onChange={(e) => setForm((f) => ({ ...f, totalHours: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Total Hours"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Resource Involved*</label>
                    <input
                      type="text"
                      value={form.resourceInvolved}
                      onChange={(e) => setForm((f) => ({ ...f, resourceInvolved: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Number of resources involved"
                      required
                    />
                  </div>
                </div>

                {/* Row 6: Company Address (Full Width) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Company Address*</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                    placeholder="Enter Company Address...."
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-end pt-6">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setAddError(''); }}
                    className="px-8 py-3 rounded-lg font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition text-sm"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={addSubmitting}
                    className="px-8 py-3 rounded-lg font-semibold text-white bg-blue-500 hover:bg-blue-600 transition disabled:opacity-50 text-sm"
                  >
                    {addSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-2xl w-full transition-all animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="relative p-6 border-b border-slate-100">
              <button
                type="button"
                onClick={() => { setEditId(null); setSearchParams({}); }}
                className="absolute left-6 top-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
              >
                ×
              </button>
              <h3 className="text-center text-lg font-bold text-slate-800">Edit Client Details</h3>
            </div>

            <div className="p-8">
              <form onSubmit={handleEditSubmit} className="space-y-5">
                {/* Row 1: Client Name & Phone Number */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Client Name*</label>
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Client name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Phone Number*</label>
                    <input
                      type="tel"
                      value={editForm.phoneNumber}
                      onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Email Address & Company GST Number */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Email Address*</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Email Id"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Company GST Number*</label>
                    <input
                      type="text"
                      value={editForm.companyGstNumber}
                      onChange={(e) => setEditForm((f) => ({ ...f, companyGstNumber: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter GST Number"
                      required
                    />
                  </div>
                </div>

                {/* Row 3: Project Name & Project Budget */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Project Name*</label>
                    <input
                      type="text"
                      value={editForm.projectName}
                      onChange={(e) => setEditForm((f) => ({ ...f, projectName: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Project Name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Project Budget*</label>
                    <input
                      type="text"
                      value={editForm.projectBudget}
                      onChange={(e) => setEditForm((f) => ({ ...f, projectBudget: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Budget"
                      required
                    />
                  </div>
                </div>

                {/* Row 4: Project Start Date & Project End Date */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Project Start Date*</label>
                    <input
                      type="text"
                      value={editForm.projectStartDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, projectStartDate: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="DD/MM/YYYY"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Project End Date*</label>
                    <input
                      type="text"
                      value={editForm.projectEndDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, projectEndDate: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="DD/MM/YYYY"
                      required
                    />
                  </div>
                </div>

                {/* Row 5: Total Hours & Resource Involved */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Total Hours*</label>
                    <input
                      type="text"
                      value={editForm.totalHours}
                      onChange={(e) => setEditForm((f) => ({ ...f, totalHours: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Total Hours"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Resource Involved*</label>
                    <input
                      type="text"
                      value={editForm.resourceInvolved}
                      onChange={(e) => setEditForm((f) => ({ ...f, resourceInvolved: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                      placeholder="Enter Number of Resources Involved"
                      required
                    />
                  </div>
                </div>

                {/* Row 6: Company Address (Full Width) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Company Address*</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition outline-none text-sm"
                    placeholder="Enter Company Address...."
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-end pt-6">
                  <button
                    type="button"
                    onClick={() => { setEditId(null); setSearchParams({}); }}
                    className="px-8 py-3 rounded-lg font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition text-sm"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-8 py-3 rounded-lg font-semibold text-white bg-blue-500 hover:bg-blue-600 transition disabled:opacity-50 text-sm"
                  >
                    {editSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewId !== null && viewClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-lg w-full transition-all animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="relative p-6 border-b border-slate-100">
              <button
                type="button"
                onClick={() => { setViewId(null); setViewClient(null); }}
                className="absolute left-6 top-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
              >
                ×
              </button>
              <h3 className="text-center text-lg font-bold text-slate-800">View Client Details</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Project Progress</span>
                  <span className="text-sm font-medium text-slate-700">66%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-300" style={{ width: '66%', backgroundColor: '#FF9861' }}></div>
                </div>
              </div>

              {/* Client Details - Label : Value Format */}
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Client Name</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.fullName || '-'}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Phone Number</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.phoneNumber || '-'}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Email ID</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.email || '-'}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Company Address</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.address || '-'}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Company GST Number</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.companyGstNumber || '-'}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Project Name</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.projectName || '-'}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Project Budget</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.projectBudget ? `${viewClient.projectBudget} $` : '-'}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Received Amount</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">-</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Pending Amount</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">-</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Project Start Date</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.projectStartDate || 'dd/mm/yyyy'}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Project End Date</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.projectEndDate || 'dd/mm/yyyy'}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Total Hours</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.totalHours ? `${viewClient.totalHours}hrs` : '0000hrs'}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-700 w-48 flex-shrink-0">Resources Involved</span>
                  <span className="text-sm text-slate-600 mx-3">:</span>
                  <span className="text-sm text-slate-800 flex-1">{viewClient.resourceInvolved || '0000'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
