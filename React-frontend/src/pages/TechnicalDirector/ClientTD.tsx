import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import cardBg from '../../assets/cardbg.jpg';
import viewIcon from '../../assets/ProjectManager/Client/whiteviewicon.svg';
import callIcon from '../../assets/ProjectManager/Client/callicon.svg';
import messageIcon from '../../assets/ProjectManager/Client/message.svg';
import mailIcon from '../../assets/ProjectManager/Client/mailicon.svg';
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

export default function ClientTD() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [list, setList] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
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
        const editId = parseInt(editParam, 10);
        if (!editId || !list.some((x) => x.id === editId)) return;
        navigate(`/td/clients/${editId}/edit`, { replace: true });
        setSearchParams({});
    }, [editParam, list.length, navigate, setSearchParams]);

    const displayName = (c: Client) => c.fullName ?? c.client_name ?? '-';
    const displayLocation = (c: Client) => c.address ?? 'Not specified';

    const searchQuery = searchParams.get('q')?.toLowerCase() || "";
    const filteredList = list.filter((c) => {
        if (!searchQuery) return true;
        return (
            (c.fullName || "").toLowerCase().includes(searchQuery) ||
            (c.client_name || "").toLowerCase().includes(searchQuery) ||
            (c.email || "").toLowerCase().includes(searchQuery) ||
            (c.company_name || "").toLowerCase().includes(searchQuery) ||
            (c.projectName || "").toLowerCase().includes(searchQuery) ||
            (c.phoneNumber || "").toLowerCase().includes(searchQuery) ||
            (c.address || "").toLowerCase().includes(searchQuery) ||
            (c.status || "").toLowerCase().includes(searchQuery) ||
            (c.companyGstNumber || "").toLowerCase().includes(searchQuery)
        );
    });

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
                <h2 className="text-[24px] font-semibold text-slate-800 font-Gantari">Clients</h2>
                {canAdd && (
                    <button
                        type="button"
                        onClick={() => navigate('/td/clients/add')}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-[#DD4342] text-white font-semibold transition shadow-md shadow-red-100"
                    >
                        <img src={plusIcon} alt="Add" className="w-5 h-5 object-contain" />
                        Add Client
                    </button>
                )}
            </div>

            <div className="flex-1 mt-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredList.length === 0 ? (
                        <div className="col-span-full bg-white/50 backdrop-blur-sm rounded-[20px] p-12 text-center text-slate-500 border border-white/40">
                            No clients found.
                        </div>
                    ) : (
                        filteredList.map((c,) => (
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
                                            onClick={() => navigate(`/td/clients/${c.id}/view`)}
                                            className="flex items-center justify-center gap-2 py-3.5 rounded-md bg-[#DD4342] text-[#F2F2F2] font-gantari text-sm transition shadow-sm"
                                        >
                                            <img src={viewIcon} alt="View" className="w-5 h-5 object-contain" />
                                            View
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/td/clients/${c.id}/edit`)}
                                            className="flex items-center justify-center gap-2 py-3.5 rounded-md bg-[#F2F2F2] text-[#353535] font-gantari text-sm transition border border-transparent"
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
        </div>
    );
}
