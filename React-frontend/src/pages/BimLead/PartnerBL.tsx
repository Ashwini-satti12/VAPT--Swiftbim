import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import type { Vendor } from '../TechnicalDirector/PartnerView/types';
import upArrow from '../../assets/TechnicalDirector/upArrow.svg';

export default function PartnerBL() {
    const [list, setList] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<{ vendors?: Vendor[] } | Vendor[]>('/api/vendors?status=approved')
            .then(({ data }) => {
                const vendors = Array.isArray(data) ? data : (data as { vendors?: Vendor[] }).vendors ?? [];
                setList(vendors);
            })
            .catch(() => setList([]))
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
        <div className="h-full min-h-0 flex flex-col flex-1 -mb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-4">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#12141D] font-Gantari">Partners</h2>
                </div>
            </div>

            {/* Grid — fills remaining height; no extra bottom padding */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-0">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-0">
                    {list.length === 0 ? (
                        <div className="col-span-full bg-white/50 backdrop-blur-sm rounded-[20px] p-12 text-center text-slate-500 border border-white/40">
                            No partners found.
                        </div>
                    ) : (
                        list.map((partner) => (
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
                                            to={`/bl/partner/${partner.id}`}
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B8B8B] hover:text-[#353535] transition-colors shrink-0 pr-2 cursor-pointer"
                                        >
                                            Details
                                            <img src={upArrow} alt="Up" className="w-5 h-5 object-contain" />
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
