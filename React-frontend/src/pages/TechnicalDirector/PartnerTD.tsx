import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import type { Vendor } from './PartnerView/types';




export default function PartnerTD() {
    const [allList, setAllList] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch all vendors (no status filter) so we can switch tabs without refetching
        api.get<{ vendors?: Vendor[] } | Vendor[]>('/api/vendors')
            .then(({ data }) => {
                const vendors = Array.isArray(data) ? data : (data as { vendors?: Vendor[] }).vendors ?? [];
                setAllList(vendors);
            })
            .catch(() => setAllList([]))
            .finally(() => setLoading(false));
    }, []);

    const displayName = (v: Vendor) => v.company_name || v.partner_name || '-';

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E14B4B]" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-6">
                <div>
                    <h2 className="text-[24px] font-semibold text-slate-800 font-Gantari">Partners</h2>
                    {/* <p className="text-sm text-slate-500 mt-1 font-gantari">View and manage approved vendor profiles — only Technical Director has bidding access</p> */}
                </div>
            </div>

            {/* Search + Filter Tabs */}
            {/* <div className="flex flex-col sm:flex-row gap-4 shrink-0 mb-6">
                
                <div className="relative flex-1 max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEACAC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, city, country…"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#AEACAC52] bg-white text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/20 shadow-sm"
                    />
                </div>

               
                <div className="flex items-center gap-1 bg-[#F2F2F2] rounded-xl p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold font-gantari transition-all ${statusFilter === tab.value
                                ? 'bg-[#DD4342] text-white shadow-sm'
                                : 'text-[#717171] hover:text-[#353535]'
                                }`}
                        >
                            {tab.label}
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-[#AEACAC]/20 text-[#717171]'}`}>
                                {countBy(tab.value)}
                            </span>
                        </button>
                    ))}
                </div>
            </div> */}

            {/* Grid */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {allList.length === 0 ? (
                        <div className="col-span-full bg-white/50 backdrop-blur-sm rounded-[20px] p-12 text-center text-slate-500 border border-white/40">
                            No partners found.
                        </div>
                    ) : (
                        allList.map((partner) => (
                            <div
                                key={partner.id}
                                className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#E8E8E8] overflow-hidden flex flex-col hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300"
                            >
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-[18px] md:text-[20px] font-bold text-[#000000] font-Gantari leading-tight line-clamp-2 mb-4">
                                        {displayName(partner)}
                                    </h3>

                                    <p className="text-[13px] font-Gantari font-medium text-[#9E9E9E] mb-1">
                                        Director Name
                                    </p>
                                    <p className="text-[16px] font-bold text-[#000000] font-Gantari leading-snug">
                                        {partner.contact_name || '—'}
                                    </p>
                                    <p className="text-[14px] text-[#353535] font-Gantari mt-2 truncate" title={partner.contact_email || undefined}>
                                        {partner.contact_email || '—'}
                                    </p>

                                    <div className="my-5 border-t border-[#E5E5E5]" />

                                    <div className="flex items-center justify-between gap-3 mt-auto">
                                        <span className="text-[14px] font-Gantari font-medium text-[#757575]">
                                            {partner.num_employees
                                                ? `${partner.num_employees}+ Employees`
                                                : '—'}
                                        </span>
                                        <Link
                                            to={`/td/partner/${partner.id}`}
                                            className="inline-flex items-center gap-1.5 text-[14px] font-Gantari font-medium text-[#757575] hover:text-[#353535] transition-colors shrink-0"
                                        >
                                            Details
                                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </Link>
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
