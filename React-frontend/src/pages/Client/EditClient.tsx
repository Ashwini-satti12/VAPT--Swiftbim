import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';

export default function EditClient() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [error, setError] = useState('');
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

  useEffect(() => {
    const clientId = id ? parseInt(id, 10) : NaN;
    if (!clientId || !Number.isFinite(clientId)) {
      setLoading(false);
      return;
    }
    api
      .get<Record<string, unknown>>(`/api/clients/${clientId}`)
      .then(({ data }) => {
        setEditForm({
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
          resourceInvolved: (data.resourceInvolved as string) ?? ''
        });
      })
      .catch(() => setError('Failed to load client.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientId = id ? parseInt(id, 10) : NaN;
    if (!clientId || !Number.isFinite(clientId)) return;
    setEditSubmitting(true);
    api
      .patch(`/api/clients/${clientId}`, {
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
      })
      .then(() => navigate('/clients'))
      .catch(() => {})
      .finally(() => setEditSubmitting(false));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E14B4B]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-2 bg-white">
        <div className="mx-auto max-w-[1174px]">
          <p className="text-red-600 font-Gantari py-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A]"
          >
            Back to Clients
          </button>
        </div>
      </div>
    );
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
            Edit Client Details
          </h3>
          <div className="w-10" />
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            <div className="space-y-5">
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Client Name <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Enter Client name"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Phone Number <span className="text-[#DD4342]">*</span></label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Email Address <span className="text-[#DD4342]">*</span></label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Enter Email Id"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Company GST Number <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={editForm.companyGstNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, companyGstNumber: e.target.value }))}
                  placeholder="Enter GST Number"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Project Name <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={editForm.projectName}
                  onChange={(e) => setEditForm((f) => ({ ...f, projectName: e.target.value }))}
                  placeholder="Enter Project Name"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Project Budget <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={editForm.projectBudget}
                  onChange={(e) => setEditForm((f) => ({ ...f, projectBudget: e.target.value }))}
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
                  value={editForm.projectStartDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, projectStartDate: e.target.value }))}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Project End Date <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={editForm.projectEndDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, projectEndDate: e.target.value }))}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Total Hours <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={editForm.totalHours}
                  onChange={(e) => setEditForm((f) => ({ ...f, totalHours: e.target.value }))}
                  placeholder="Enter Total Hours"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Resource Involved <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  value={editForm.resourceInvolved}
                  onChange={(e) => setEditForm((f) => ({ ...f, resourceInvolved: e.target.value }))}
                  placeholder="Enter Number of Resources Involved"
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-2">
            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Company Address <span className="text-[#DD4342]">*</span></label>
            <textarea
              value={editForm.address}
              onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
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
              disabled={editSubmitting}
              className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] disabled:opacity-50 transition-all font-Gantari min-w-[160px]"
            >
              {editSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
