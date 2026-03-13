import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';

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

export default function ClientViewTD() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const clientId = id ? parseInt(id, 10) : NaN;
        if (!clientId || !Number.isFinite(clientId)) {
            setLoading(false);
            return;
        }
        api
            .get<Client>(`/api/clients/${clientId}`)
            .then(({ data }) => setClient({ ...data, id: clientId }))
            .catch(() => setError('Failed to load client.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E14B4B]" />
            </div>
        );
    }

    if (error || !client) {
        return (
            <div className="flex-1 overflow-y-auto p-2 bg-white">
                <div className="mx-auto">
                    <p className="text-red-600 font-gantari py-4">{error || 'Client not found.'}</p>
                    <button
                        type="button"
                        onClick={() => navigate('/td/clients')}
                        className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A]"
                    >
                        Back to Clients
                    </button>
                </div>
            </div>
        );
    }

    const viewClient = client;

    const detailRows = [
        { label: 'Client Name', value: viewClient.fullName ?? viewClient.client_name },
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
    ];
    const mid = Math.ceil(detailRows.length / 2);
    const leftCol = detailRows.slice(0, mid);
    const rightCol = detailRows.slice(mid);

    return (
        <div className="flex-1 overflow-y-auto py-2 px-0 bg-white">
            <div className="w-full max-w-[750px] mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 relative">
                    <button
                        type="button"
                        onClick={() => navigate('/td/clients')}
                        className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all"
                        title="Back"
                    >
                        <img src={backIcon} alt="Back" className="w-5 h-5" />
                    </button>
                    <h3 className="text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">View Client Details</h3>
                    <div className="w-10" />
                </div>

                <div className="px-0 pb-6 space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[14px] font-Gantari text-[#020202]">Project Progress</span>
                            <span className="text-[14px] font-Gantari text-[#616161]">66%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-300 shadow-sm"
                                style={{
                                    width: '66%',
                                    background: 'linear-gradient(90deg, #FF9861 0%, #FFB68D 100%)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Client Details — two equal columns, no side padding */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-x-8 md:gap-x-12 gap-y-4">
                        <div className="space-y-3 min-w-0">
                            {leftCol.map((row, idx) => (
                                <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[minmax(0,140px)_1ch_minmax(0,1fr)] text-[14px] gap-x-2 gap-y-0.5 font-Gantari">
                                    <span className="text-[#020202] shrink-0">{row.label}</span>
                                    <span className="hidden sm:inline text-[#020202] text-center">:</span>
                                    <span className="text-[#616161] break-words min-w-0">{row.value || '-'}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3 min-w-0">
                            {rightCol.map((row, idx) => (
                                <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[minmax(0,140px)_1ch_minmax(0,1fr)] text-[14px] gap-x-2 gap-y-0.5 font-Gantari">
                                    <span className="text-[#020202] shrink-0">{row.label}</span>
                                    <span className="hidden sm:inline text-[#020202] text-center">:</span>
                                    <span className="text-[#616161] break-words min-w-0">{row.value || '-'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
