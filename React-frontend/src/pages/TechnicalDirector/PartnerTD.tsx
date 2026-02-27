import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import type { Vendor } from './PartnerView/types';

export default function PartnerTD() {
    const [list, setList] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<{ vendors?: Vendor[] } | Vendor[]>('/api/vendors')
            .then(({ data }) => {
                const vendors = Array.isArray(data) ? data : (data as { vendors?: Vendor[] }).vendors ?? [];
                setList(vendors);
            })
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    }, []);

    const displayName = (v: Vendor) => v.company_name || v.partner_name || '-';
    const statusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-amber-100 text-amber-800';
        }
    };

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
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <h3 className="text-lg font-semibold text-slate-800 line-clamp-2">
                                            {displayName(partner)}
                                        </h3>
                                        <span
                                            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(partner.status)}`}
                                        >
                                            {partner.status || 'pending'}
                                        </span>
                                    </div>
                                    {partner.contact_name && (
                                        <p className="text-sm text-slate-600 mb-1">
                                            Contact: {partner.contact_name}
                                        </p>
                                    )}
                                    {partner.email && (
                                        <p className="text-sm text-slate-500 truncate" title={partner.email}>
                                            {partner.email}
                                        </p>
                                    )}
                                    {partner.city && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            {[partner.city, partner.state, partner.country].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <Link
                                            to={`/td/partner/${partner.id}`}
                                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#DD4342] text-white font-medium text-sm hover:bg-[#c93d3d] transition"
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
