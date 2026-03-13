import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';

export default function AddClient() {
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
    resourceInvolved: ''
  });

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
          navigate('/clients');
        } else {
          setAddError(data.message || 'Failed to add client.');
        }
      })
      .catch((err) => setAddError(err.response?.data?.message || 'Failed to add client.'))
      .finally(() => setAddSubmitting(false));
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 bg-white">
      <div className="max-w-[1174px] mx-auto">
        <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all"
            title="Back"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
          <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
            Add New Client
          </h3>
          <div className="w-10" />
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-6">
          {addError && (
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">!</div>
              <div className="flex-1">
                <p className="font-semibold leading-snug">Validation error</p>
                <p className="mt-0.5 text-[13px] leading-snug">{addError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            <div className="space-y-5">
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Client Name <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Enter Client name"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Phone Number <span className="text-[#DD4342]">*</span></label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Email Address <span className="text-[#DD4342]">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Enter Email Id"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Company GST Number <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={form.companyGstNumber}
                  onChange={(e) => setForm((f) => ({ ...f, companyGstNumber: e.target.value }))}
                  placeholder="Enter GST Number"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Project Name <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={form.projectName}
                  onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
                  placeholder="Enter Project Name"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Project Budget <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={form.projectBudget}
                  onChange={(e) => setForm((f) => ({ ...f, projectBudget: e.target.value }))}
                  placeholder="Enter Budget"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Project Start Date <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={form.projectStartDate}
                  onChange={(e) => setForm((f) => ({ ...f, projectStartDate: e.target.value }))}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Project End Date <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={form.projectEndDate}
                  onChange={(e) => setForm((f) => ({ ...f, projectEndDate: e.target.value }))}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Total Hours <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={form.totalHours}
                  onChange={(e) => setForm((f) => ({ ...f, totalHours: e.target.value }))}
                  placeholder="Enter Total Hours"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Resource Involved <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={form.resourceInvolved}
                  onChange={(e) => setForm((f) => ({ ...f, resourceInvolved: e.target.value }))}
                  placeholder="Enter Number of resources involved"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-2">
            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Company Address <span className="text-[#DD4342]">*</span></label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Enter Company Address...."
              rows={4}
              className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8">
            <button
              type="button"
              onClick={() => navigate('/clients')}
              className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all font-Gantari min-w-[160px]"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={addSubmitting}
              className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] disabled:opacity-50 transition-all font-Gantari min-w-[160px]"
            >
              {addSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
