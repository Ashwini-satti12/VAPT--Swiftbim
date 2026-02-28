import { useState, useMemo } from 'react';

interface Bid {
    id: string;
    vendorName: string;
    projectName: string;
    biddingValue: number;
    bidDate: string;
}

const mockBids: Bid[] = [
    { id: '1', vendorName: 'BuildCorp Inc.', projectName: 'Alpha Towers', biddingValue: 1250000, bidDate: '2023-10-01' },
    { id: '2', vendorName: 'Skyline Creators', projectName: 'Alpha Towers', biddingValue: 980000, bidDate: '2023-10-02' },
    { id: '3', vendorName: 'Apex Constructors', projectName: 'Alpha Towers', biddingValue: 1100000, bidDate: '2023-10-03' },
    { id: '4', vendorName: 'Solid Foundation Ltd.', projectName: 'Alpha Towers', biddingValue: 950000, bidDate: '2023-10-04' },
    { id: '5', vendorName: 'Pioneer Builders', projectName: 'Alpha Towers', biddingValue: 1400000, bidDate: '2023-10-05' },
    { id: '6', vendorName: 'Urban Edge', projectName: 'Alpha Towers', biddingValue: 1050000, bidDate: '2023-10-05' },
    { id: '7', vendorName: 'Metro Structures', projectName: 'Alpha Towers', biddingValue: 990000, bidDate: '2023-10-06' },
];

export default function BiddingTD() {
    const [bids] = useState<Bid[]>(mockBids);

    // Automatically sort by Lowest Price
    const sortedBids = useMemo(() => {
        return [...bids].sort((a, b) => a.biddingValue - b.biddingValue);
    }, [bids]);

    // Pick Top 4 Vendors
    const top4Bids = sortedBids.slice(0, 4);
    const top4Ids = new Set(top4Bids.map(b => b.id));

    return (
        <div className="h-full flex flex-col px-4 py-2">
            <div className="flex items-center justify-between flex-shrink-0 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Bidding Process</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage vendor bids and automatically pick the top options by lowest price.</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
                <div className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] overflow-hidden">
                    <div className="bg-[#F8FAFC] px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
                        <h3 className="text-lg font-bold text-[#1E293B]">All Bids</h3>
                        <div className="text-sm text-slate-500 flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#64748B]">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Top 4 Selected
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-[#F8FAFC]">
                                <tr>
                                    <th className="py-4 px-6 font-gantari text-[#64748B] text-sm uppercase tracking-wider">Vendor Name</th>
                                    <th className="py-4 px-6 font-gantari text-[#64748B] text-sm uppercase tracking-wider">Project Name</th>
                                    <th className="py-4 px-6 font-gantari text-[#64748B] text-sm uppercase tracking-wider">Bid Date</th>
                                    <th className="py-4 px-6 font-gantari text-[#64748B] text-sm text-right uppercase tracking-wider">Bidding Value</th>
                                    <th className="py-4 px-6 font-gantari text-[#64748B] text-sm text-center uppercase tracking-wider">Selection Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                                {sortedBids.map((bid, index) => {
                                    const isTop4 = top4Ids.has(bid.id);
                                    return (
                                        <tr
                                            key={bid.id}
                                            className={`transition-colors hover:bg-[#F1F5F9] ${isTop4 ? 'bg-[#F8FAFC]' : 'bg-white'}`}
                                        >
                                            <td className="py-5 px-6">
                                                <div className="text-sm font-bold text-[#1E293B]">{bid.vendorName}</div>
                                                {isTop4 && <div className="text-[11px] text-[#64748B] font-medium mt-0.5">Recommended</div>}
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm font-medium text-[#475569]">{bid.projectName}</div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm font-medium text-[#475569]">
                                                    {new Date(bid.bidDate).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <div className="text-[15px] font-bold text-[#1E293B]">
                                                    ${bid.biddingValue.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex justify-center">
                                                    {isTop4 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#F1F5F9] text-[#1E293B] border border-[#E2E8F0] shadow-sm">
                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                            Top {index + 1} Vendor
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                                                            Not Selected
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
