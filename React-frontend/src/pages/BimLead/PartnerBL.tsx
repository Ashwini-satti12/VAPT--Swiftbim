import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import type { Vendor } from '../TechnicalDirector/PartnerView/types';

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
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-2xl font-bold text-slate-800">Partner</h2>
            </div>

            <div className="flex-1 mt-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {list.length === 0 ? (
                        <div className="col-span-full bg-white/50 backdrop-blur-sm rounded-[20px] p-12 text-center text-slate-500 border border-white/40">
                            No partners found.
                        </div>
                    ) : (
                        list.map((partner) => (
                            <div
                                key={partner.id}
                                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col"
                            >
                                <div className="p-6 flex-1 flex flex-col pt-7">
                                    <h3 className="text-[17px] font-bold text-slate-800 font-sora line-clamp-2">
                                        {displayName(partner)}
                                    </h3>

                                    <div className="mt-4 flex flex-col gap-1.5 flex-1">
                                        {partner.contact_name && (
                                            <p className="text-[14px] text-slate-600 font-medium">
                                                Contact: {partner.contact_name}
                                            </p>
                                        )}
                                        {partner.city && (
                                            <p className="text-[13px] text-slate-500">
                                                {[partner.city, partner.state, partner.country].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-6 border-t border-gray-100/80 pt-5">
                                        <Link
                                            to={`/bl/partner/${partner.id}`}
                                            className="flex items-center justify-center w-full py-2.5 rounded-lg bg-[#DD4342] text-white font-medium text-[14px] hover:bg-[#c93d3d] transition-colors"
                                        >
                                            View details
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
