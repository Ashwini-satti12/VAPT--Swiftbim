import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import type { Vendor } from './PartnerView/types';
import upArrow from '../../assets/TechnicalDirector/upArrow.svg';




export default function PartnerTD() {
    const [allList, setAllList] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();

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
        <div className="flex-1 flex flex-col min-h-0 h-full lg:overflow-hidden overflow-visible">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-6">
                <div>
                    <h2 className="text-[20px] md:text-[24px] font-semibold text-[#12141D] font-Gantari">Partners</h2>
                </div>
            </div>

            {/* Grid — fills remaining height; scrolling happens inside the flex container */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-4">
                    {(() => {
                        const searchQuery = searchParams.get('q')?.toLowerCase() || "";
                        const filteredList = allList.filter(v => {
                            if (!searchQuery) return true;
                            return (v.company_name || "").toLowerCase().includes(searchQuery) ||
                                (v.partner_name || "").toLowerCase().includes(searchQuery) ||
                                (v.contact_name || "").toLowerCase().includes(searchQuery) ||
                                (v.contact_email || "").toLowerCase().includes(searchQuery);
                        });

                        if (filteredList.length === 0) {
                            return (
                                <div className="col-span-full bg-slate-50/50 backdrop-blur-sm rounded-[20px] p-12 text-center text-slate-500 border border-slate-100">
                                    No partners found.
                                </div>
                            );
                        }

                        return filteredList.map((partner) => (
                            <div
                                key={partner.id}
                                className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#E8E8E8] overflow-hidden flex flex-col hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300"
                            >
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-[18px] md:text-[20px] font-bold text-[#000000] font-Gantari leading-tight line-clamp-2 mb-4">
                                        {displayName(partner)}
                                    </h3>

                                    <p className="text-[13px] font-Gantari font-medium text-[#9E9E9E] mb-1">
                                        Vendor Name
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
                                            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B8B8B] hover:text-[#353535] transition-colors shrink-0 pr-2"
                                        >
                                            Details
                                            <img 
                                                src={upArrow} 
                                                alt="Up" 
                                                className="w-5 h-5 object-contain transition-all duration-200 brightness-0 invert-[54%] group-hover:invert-[21%]" 
                                            />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            </div>
        </div>
    );
}
