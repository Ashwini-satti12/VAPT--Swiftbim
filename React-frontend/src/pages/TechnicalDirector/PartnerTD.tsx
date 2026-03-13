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
                                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col"
                            >
                                <div className="p-6 flex-1 flex flex-col pt-7">
                                    {/* Company Name + Status */}
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-[17px] font-bold text-slate-800 font-sora line-clamp-2 flex-1 pr-2">
                                            {displayName(partner)}
                                        </h3>
                                        {/* <span className={`shrink-0 text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border ${STATUS_BADGE[partner.status] ?? 'bg-[#F2F2F2] text-[#717171] border-transparent'}`}>
                                            {partner.status}
                                        </span> */}
                                    </div>

                                    <div className="mt-1 flex flex-col gap-1.5 flex-1">
                                        {partner.contact_name && (
                                            <p className="text-[14px] text-slate-600 font-medium font-gantari">
                                                👤 {partner.contact_name}
                                                {partner.contact_designation && <span className="text-[#717171]"> · {partner.contact_designation}</span>}
                                            </p>
                                        )}
                                        {partner.city && (
                                            <p className="text-[13px] text-slate-500 font-gantari">
                                                📍 {[partner.city, partner.state, partner.country].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                        {partner.contact_email && (
                                            <p className="text-[13px] text-slate-500 font-gantari truncate">
                                                ✉️ {partner.contact_email}
                                            </p>
                                        )}
                                        {partner.num_employees && (
                                            <p className="text-[13px] text-slate-500 font-gantari">
                                                🏢 {partner.num_employees} employees
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-6 border-t border-gray-100/80 pt-5">
                                        <Link
                                            to={`/td/partner/${partner.id}`}
                                            className="flex items-center justify-center w-full py-2.5 rounded-lg bg-[#DD4342] text-white font-medium text-[14px] hover:bg-[#c93d3d] transition-colors font-gantari"
                                        >
                                            View Details
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
