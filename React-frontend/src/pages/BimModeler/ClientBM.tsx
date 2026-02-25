import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import cardBg from '../../assets/cardbg.jpg';
import viewIcon from '../../assets/ProjectManager/Client/whiteviewicon.svg';
import callIcon from '../../assets/ProjectManager/Client/callicon.svg';
import messageIcon from '../../assets/ProjectManager/Client/message.svg';
import mailIcon from '../../assets/ProjectManager/Client/mailicon.svg';
import closeIcon from '../../assets/ProjectManager/Client/closebuttonicon.svg';
import colonIcon from '../../assets/ProjectManager/Client/colonicon.svg';
import editIcon from '../../assets/ProjectManager/Client/Editicon.svg';
import plusIcon from '../../assets/ProjectManager/Client/plusicon.svg';
import profileImg from '../../assets/ProjectManager/Chat/clientcardprofile image.png';

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

export default function ClientBM() {
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
                        <img src={plusIcon} alt="Add" className="w-5 h-5 object-contain" />
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
                        list.map((c,) => (
                            <div key={c.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col group">
                                {/* Header Background */}
                                <div className="relative h-44 w-full">
                                    <img src={cardBg} alt="banner" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20" />

                                    {/* Status Badge */}
                                    <div className="absolute top-4 right-4">
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F4EA]/90 backdrop-blur-sm text-[#1E7E34] border border-[#1E7E34]/20">
                                            <span className="w-2 h-2 rounded-full bg-[#1E7E34]" />
                                            Online
                                        </div>
                                    </div>

                                    {/* Profile info inside header */}
                                    <div className="absolute bottom-6 left-6 flex items-center gap-4 text-white">
                                        <div className="w-20 h-20 rounded-full border-4 border-white/30 shadow-lg overflow-hidden flex-shrink-0">
                                            <img
                                                src={profileImg}
                                                alt={displayName(c)}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-gantari leading-tight drop-shadow-md line-clamp-1">{displayName(c)}</h3>
                                            <p className="text-sm text-[#F2F2F2] font-gantari drop-shadow-sm">{displayLocation(c)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-6 space-y-6 flex-1 flex flex-col">
                                    {/* Quick Action Block Buttons */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <button className="flex items-center justify-center gap-2 py-3 rounded-lg bg-[#DBE9FE] hover:bg-[#c9deff] transition-colors" title="Mail">
                                            <img src={mailIcon} alt="Mail" className="w-5 h-5 object-contain" />
                                            <span className="text-sm font-bold text-[#12141D]">Mail</span>
                                        </button>
                                        <button className="flex items-center justify-center gap-2 py-3 rounded-lg bg-[#DBE9FE] hover:bg-[#c9deff] transition-colors" title="Message">
                                            <img src={messageIcon} alt="Message" className="w-5 h-5 object-contain" />
                                            <span className="text-sm font-bold text-[#12141D]">Message</span>
                                        </button>
                                        <button className="flex items-center justify-center gap-2 py-3 rounded-lg bg-[#DBE9FE] hover:bg-[#c9deff] transition-colors" title="Call">
                                            <img src={callIcon} alt="Call" className="w-5 h-5 object-contain" />
                                            <span className="text-sm font-bold text-[#12141D]">Call</span>
                                        </button>
                                    </div>

                                    <div className="h-px bg-gray-100" />

                                    {/* Primary Actions */}
                                    <div className="grid grid-cols-2 gap-3 mt-auto">
                                        <button
                                            type="button"
                                            onClick={() => openView(c.id)}
                                            className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#DD4342] text-[#F2F2F2] font-gantari text-sm transition shadow-sm"
                                        >
                                            <img src={viewIcon} alt="View" className="w-5 h-5 object-contain" />
                                            View
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openEdit(c.id)}
                                            className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#F2F2F2] text-[#353535] font-gantari text-sm hover:bg-gray-200 transition border border-transparent"
                                        >
                                            <img src={editIcon} alt="Edit" className="w-5 h-5 object-contain" />
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
                    <div className="bg-white rounded-[20px] shadow-2xl max-w-3xl w-full transition-all animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto hide-scrollbar">
                        {/* Header */}
                        <div className="relative p-5">
                            <button
                                type="button"
                                onClick={() => { setShowAddModal(false); setAddError(''); }}
                                className="absolute left-6 top-6 w-7 h-7 flex items-center justify-center transition hover:opacity-80"
                            >
                                <img src={closeIcon} alt="Close" className="w-full h-full object-contain" />
                            </button>
                            <h3 className="text-center text-xl font-gantari font-semibold text-[#020202]">Add New Client</h3>
                        </div>

                        <div className="px-10 pb-8 pt-0">
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                {addError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{addError}</p>}

                                {/* Row 1 to 5: Two Column Grid */}
                                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Client Name*</label>
                                        <input
                                            type="text"
                                            value={form.fullName}
                                            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Client name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Phone Number*</label>
                                        <input
                                            type="tel"
                                            value={form.phoneNumber}
                                            onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter phone number"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Email Address*</label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Email Id"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Company GST Number*</label>
                                        <input
                                            type="text"
                                            value={form.companyGstNumber}
                                            onChange={(e) => setForm((f) => ({ ...f, companyGstNumber: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter GST Number"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Project Name*</label>
                                        <input
                                            type="text"
                                            value={form.projectName}
                                            onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Project Name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Project Budget*</label>
                                        <input
                                            type="text"
                                            value={form.projectBudget}
                                            onChange={(e) => setForm((f) => ({ ...f, projectBudget: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Budget"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Project Start Date*</label>
                                        <input
                                            type="text"
                                            value={form.projectStartDate}
                                            onChange={(e) => setForm((f) => ({ ...f, projectStartDate: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="DD/MM/YYYY"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Project End Date*</label>
                                        <input
                                            type="text"
                                            value={form.projectEndDate}
                                            onChange={(e) => setForm((f) => ({ ...f, projectEndDate: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="DD/MM/YYYY"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Total Hours*</label>
                                        <input
                                            type="text"
                                            value={form.totalHours}
                                            onChange={(e) => setForm((f) => ({ ...f, totalHours: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Total Hours"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Resource Involved*</label>
                                        <input
                                            type="text"
                                            value={form.resourceInvolved}
                                            onChange={(e) => setForm((f) => ({ ...f, resourceInvolved: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Number of resources involved"
                                            required
                                        />
                                    </div>

                                    {/* Row 6: Company Address (Full Width) */}
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Company Address*</label>
                                        <textarea
                                            value={form.address}
                                            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari min-h-[80px] resize-none"
                                            placeholder="Enter Company Address...."
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-6 justify-center pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddModal(false); setAddError(''); }}
                                        className="w-32 py-2.5 rounded-[5px] font-gantari font-semibold text-[#353535] bg-[#F2F2F2] hover:bg-gray-200 transition text-[16px]"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addSubmitting}
                                        className="w-32 py-2.5 rounded-[5px] font-gantari font-semibold text-[#000000] bg-[#D5E6FF] hover:bg-[#c4deff] transition disabled:opacity-50 text-[16px]"
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
                    <div className="bg-white rounded-[20px] shadow-2xl max-w-3xl w-full transition-all animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto hide-scrollbar">
                        {/* Header */}
                        <div className="relative p-5">
                            <button
                                type="button"
                                onClick={() => { setEditId(null); setSearchParams({}); }}
                                className="absolute left-6 top-6 w-7 h-7 flex items-center justify-center transition hover:opacity-80"
                            >
                                <img src={closeIcon} alt="Close" className="w-full h-full object-contain" />
                            </button>
                            <h3 className="text-center text-xl font-gantari font-semibold text-[#020202]">Edit Client Details</h3>
                        </div>

                        <div className="px-10 pb-8 pt-0">
                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                {/* Row 1 to 5: Two Column Grid */}
                                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Client Name*</label>
                                        <input
                                            type="text"
                                            value={editForm.fullName}
                                            onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Client name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Phone Number*</label>
                                        <input
                                            type="tel"
                                            value={editForm.phoneNumber}
                                            onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter phone number"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Email Address*</label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Email Id"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Company GST Number*</label>
                                        <input
                                            type="text"
                                            value={editForm.companyGstNumber}
                                            onChange={(e) => setEditForm((f) => ({ ...f, companyGstNumber: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter GST Number"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Project Name*</label>
                                        <input
                                            type="text"
                                            value={editForm.projectName}
                                            onChange={(e) => setEditForm((f) => ({ ...f, projectName: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Project Name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Project Budget*</label>
                                        <input
                                            type="text"
                                            value={editForm.projectBudget}
                                            onChange={(e) => setEditForm((f) => ({ ...f, projectBudget: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Budget"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Project Start Date*</label>
                                        <input
                                            type="text"
                                            value={editForm.projectStartDate}
                                            onChange={(e) => setEditForm((f) => ({ ...f, projectStartDate: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="DD/MM/YYYY"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Project End Date*</label>
                                        <input
                                            type="text"
                                            value={editForm.projectEndDate}
                                            onChange={(e) => setEditForm((f) => ({ ...f, projectEndDate: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="DD/MM/YYYY"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Total Hours*</label>
                                        <input
                                            type="text"
                                            value={editForm.totalHours}
                                            onChange={(e) => setEditForm((f) => ({ ...f, totalHours: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Total Hours"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Resource Involved*</label>
                                        <input
                                            type="text"
                                            value={editForm.resourceInvolved}
                                            onChange={(e) => setEditForm((f) => ({ ...f, resourceInvolved: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari"
                                            placeholder="Enter Number of Resources Involved"
                                            required
                                        />
                                    </div>

                                    {/* Row 6: Company Address (Full Width) */}
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="block text-[14px] font-gantari font-bold text-[#000000]">Company Address*</label>
                                        <textarea
                                            value={editForm.address}
                                            onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F2F2F2] border-0 rounded-lg text-slate-800 placeholder:text-[#8B8B8B] focus:ring-1 focus:ring-blue-500/10 transition outline-none text-[14px] font-gantari min-h-[80px] resize-none"
                                            placeholder="Enter Company Address...."
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-6 justify-center pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setEditId(null); setSearchParams({}); }}
                                        className="w-32 py-2.5 rounded-[5px] font-gantari font-semibold text-[#353535] bg-[#F2F2F2] hover:bg-gray-200 transition text-[16px]"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editSubmitting}
                                        className="w-32 py-2.5 rounded-[5px] font-gantari font-semibold text-[#000000] bg-[#D5E6FF] hover:bg-[#c4deff] transition disabled:opacity-50 text-[16px]"
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
                    <div className="bg-white rounded-[20px] shadow-2xl max-w-xl w-full transition-all animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto hide-scrollbar">
                        {/* Header */}
                        <div className="relative p-6">
                            <button
                                type="button"
                                onClick={() => { setViewId(null); setViewClient(null); }}
                                className="absolute left-6 top-6 w-8 h-8 flex items-center justify-center transition hover:opacity-80"
                            >
                                <img src={closeIcon} alt="Close" className="w-full h-full object-contain" />
                            </button>
                            <h3 className="text-center text-xl font-gantari font-semibold text-[#020202]">View Client Details</h3>
                        </div>

                        <div className="px-10 pb-10 pt-2 space-y-8">
                            {/* Progress Bar */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[15px] font-gantari font-semibold text-[#000000]">Project Progress</span>
                                    <span className="text-[15px] font-gantari font-semibold text-slate-600">66%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-300 shadow-sm"
                                        style={{
                                            width: '66%',
                                            background: 'linear-gradient(90deg, #FF9861 0%, #FFB68D 100%)'
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Client Details */}
                            <div className="space-y-4 pt-2">
                                {[
                                    { label: 'Client Name', value: viewClient.fullName },
                                    { label: 'Phone Number', value: viewClient.phoneNumber },
                                    { label: 'Email ID', value: viewClient.email },
                                    { label: 'Company Address', value: viewClient.address },
                                    { label: 'Company GST Number', value: viewClient.companyGstNumber },
                                    { label: 'Project Name', value: viewClient.projectName },
                                    { label: 'Project Budget', value: viewClient.projectBudget ? `${viewClient.projectBudget} $` : '-' },
                                    { label: 'Received Amount', value: '800M $' },
                                    { label: 'Pending Amount', value: '400M $' },
                                    { label: 'Project Start Date', value: viewClient.projectStartDate || 'dd/mm/yyyy' },
                                    { label: 'Project End Date', value: viewClient.projectEndDate || 'dd/mm/yyyy' },
                                    { label: 'Total Hours', value: viewClient.totalHours ? `${viewClient.totalHours}hrs` : '0000hrs' },
                                    { label: 'Resources Involved', value: viewClient.resourceInvolved || '0000' }
                                ].map((row, idx) => (
                                    <div key={idx} className="flex items-center text-[15px] font-gantari">
                                        <span className="text-[#000000] font-semibold w-48 flex-shrink-0">{row.label}</span>
                                        <span className="mx-4 flex-shrink-0">
                                            <img src={colonIcon} alt=":" className="w-1.5 h-3.5 object-contain" />
                                        </span>
                                        <span className="text-slate-500 flex-1 truncate">{row.value || '-'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
