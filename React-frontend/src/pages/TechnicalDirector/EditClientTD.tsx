import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';

export default function EditClientTD() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [form, setForm] = useState({
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
    resourceInvolved: '',
  });

  const fieldClass =
    'w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]';
  const labelClass = 'block text-[16px] font-Gantari font-semibold text-[#000000] mb-2';

  useEffect(() => {
    const clientId = id ? parseInt(id, 10) : NaN;
    if (!clientId || !Number.isFinite(clientId)) {
      setLoading(false);
      return;
    }
    api
      .get<Record<string, unknown>>(`/api/clients/${clientId}`)
      .then(({ data }) => {
        setForm({
          fullName: (data.fullName as string) ?? '',
          email: (data.email as string) ?? '',
          phoneNumber: (data.phoneNumber as string) ?? '',
          address: (data.address as string) ?? '',
          projectName: (data.projectName as string) ?? '',
          budget: (data.budget as string) ?? '',
          projectBudget: (data.projectBudget as string) ?? '',
          projectStartDate: (data.projectStartDate as string) ?? '',
          projectEndDate: (data.projectEndDate as string) ?? '',
          totalHours: (data.totalHours as string) ?? '',
          companyGstNumber: (data.companyGstNumber as string) ?? '',
          resourceInvolved: (data.resourceInvolved as string) ?? '',
        });
      })
      .catch(() => setEditError('Failed to load client.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientId = id ? parseInt(id, 10) : NaN;
    if (!clientId || !Number.isFinite(clientId)) return;
    setEditError('');
    setEditSubmitting(true);
    api
      .patch(`/api/clients/${clientId}`, {
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber || undefined,
        address: form.address || undefined,
        projectName: form.projectName || undefined,
        budget: form.budget || undefined,
        projectBudget: form.projectBudget || undefined,
        projectStartDate: form.projectStartDate || undefined,
        projectEndDate: form.projectEndDate || undefined,
        totalHours: form.totalHours || undefined,
        companyGstNumber: form.companyGstNumber || undefined,
        resourceInvolved: form.resourceInvolved || undefined,
      })
      .then(() => navigate('/td/clients'))
      .catch((err) => setEditError(err.response?.data?.message || 'Failed to update client.'))
      .finally(() => setEditSubmitting(false));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E14B4B]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 bg-white">
      <div className=" mx-auto">
        <div className="flex items-center justify-between mb-8 relative">
          <button
            type="button"
            onClick={() => navigate('/td/clients')}
            className="p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all"
            title="Back"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
          <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
            Edit Client Details
          </h3>
          <div className="w-10" />
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{editError}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            <div className="space-y-2">
              <label className={labelClass}>Client Name <span className="text-[#DD4342]">*</span></label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className={fieldClass}
                placeholder="Enter Client name"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Phone Number <span className="text-[#DD4342]">*</span></label>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                className={fieldClass}
                placeholder="Enter phone number"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Email Address <span className="text-[#DD4342]">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={fieldClass}
                placeholder="Enter Email Id"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Company GST Number <span className="text-[#DD4342]">*</span></label>
              <input
                type="text"
                value={form.companyGstNumber}
                onChange={(e) => setForm((f) => ({ ...f, companyGstNumber: e.target.value }))}
                className={fieldClass}
                placeholder="Enter GST Number"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Project Name <span className="text-[#DD4342]">*</span></label>
              <input
                type="text"
                value={form.projectName}
                onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
                className={fieldClass}
                placeholder="Enter Project Name"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Project Budget <span className="text-[#DD4342]">*</span></label>
              <input
                type="text"
                value={form.projectBudget}
                onChange={(e) => setForm((f) => ({ ...f, projectBudget: e.target.value }))}
                className={fieldClass}
                placeholder="Enter Budget"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Project Start Date <span className="text-[#DD4342]">*</span></label>
              <input
                type="text"
                value={form.projectStartDate}
                onChange={(e) => setForm((f) => ({ ...f, projectStartDate: e.target.value }))}
                className={fieldClass}
                placeholder="DD/MM/YYYY"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Project End Date <span className="text-[#DD4342]">*</span></label>
              <input
                type="text"
                value={form.projectEndDate}
                onChange={(e) => setForm((f) => ({ ...f, projectEndDate: e.target.value }))}
                className={fieldClass}
                placeholder="DD/MM/YYYY"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Total Hours <span className="text-[#DD4342]">*</span></label>
              <input
                type="text"
                value={form.totalHours}
                onChange={(e) => setForm((f) => ({ ...f, totalHours: e.target.value }))}
                className={fieldClass}
                placeholder="Enter Total Hours"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Resource Involved <span className="text-[#DD4342]">*</span></label>
              <input
                type="text"
                value={form.resourceInvolved}
                onChange={(e) => setForm((f) => ({ ...f, resourceInvolved: e.target.value }))}
                className={fieldClass}
                placeholder="Enter Number of Resources Involved"
                required
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className={labelClass}>Company Address <span className="text-[#DD4342]">*</span></label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className={`${fieldClass} min-h-[80px] resize-none`}
                placeholder="Enter Company Address...."
                required
              />
            </div>
          </div>

          <div className="flex gap-6 justify-center pt-6 border-t border-[#F0F0F0]">
            <button
              type="button"
              onClick={() => navigate('/td/clients')}
              className="w-32 py-2.5 rounded-[5px] font-Gantari font-semibold text-[16px] text-[#353535] bg-[#F2F2F2] hover:bg-gray-200 transition"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="w-32 py-2.5 rounded-[5px] font-Gantari font-semibold text-[16px] text-[#000000] bg-[#D5E6FF] hover:bg-[#c4deff] transition disabled:opacity-50"
            >
              {editSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
