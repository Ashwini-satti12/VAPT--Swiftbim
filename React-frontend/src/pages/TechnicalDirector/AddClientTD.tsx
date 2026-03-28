import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';

export default function AddClientTD() {
  const navigate = useNavigate();
  const [addError, setAddError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
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
    resourceInvolved: '',
  });

  const fieldClass =
    'w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]';
  const labelClass = 'block text-[16px] font-Gantari font-semibold text-[#000000] mb-2';

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
          navigate('/td/clients');
        } else {
          setAddError(data.message || 'Failed to add client.');
        }
      })
      .catch((err) => setAddError(err.response?.data?.message || 'Failed to add client.'))
      .finally(() => setAddSubmitting(false));
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 bg-white">
      <div className=" mx-auto">
        <div className="flex items-center justify-between mb-8 relative">
          <button
            type="button"
            onClick={() => navigate('/td/clients')}
            className="p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
            title="Back"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
          <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
            Add New Client
          </h3>
          <div className="w-10" />
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-4">
          {addError && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">
                !
              </div>
              <div className="flex-1">
                <p className="mt-0.5 text-[13px] leading-snug">{addError}</p>
              </div>
            </div>
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
                placeholder="Enter Number of resources involved"
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

          <div className="flex gap-6 justify-center pt-6 ">
            <button
              type="button"
              onClick={() => navigate('/td/clients')}
              className="w-32 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={addSubmitting}
              className="w-32 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] transition-all disabled:opacity-50 cursor-pointer"
            >
              {addSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
