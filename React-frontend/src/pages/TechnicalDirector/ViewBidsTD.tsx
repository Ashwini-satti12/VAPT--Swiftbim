

interface ProjectBid {
    id: string;
    projectName: string;
    projectCategory: string;
    clientName: string;
    outsourcingBudget: number;
    biddingEndDate: string;
    totalBids: number;
    status: 'Open' | 'Closed' | 'Awarded';
}

interface ViewBidsTDProps {
    project: ProjectBid;
    onBack: () => void;
}

export default function ViewBidsTD({ project, onBack }: ViewBidsTDProps) {
    const vendors = [
        {
            name: "John Smith",
            company: "Tech Solutions Ltd",
            email: "john.smith@email.com",
            amount: 45000,
            duration: "40 Days",
            date: "Jan 12, 2023",
            rank: "1st",
            rankColor: "text-green-600",
            rankBg: "bg-green-50",
            btnColor: "bg-[#3B82F6]",
        },
        {
            name: "Emily Johnson",
            company: "Innovatech Corp",
            email: "emily.johnson@email.com",
            amount: 47500,
            duration: "45 Days",
            date: "Jan 13, 2023",
            rank: "2nd",
            rankColor: "text-blue-600",
            rankBg: "bg-blue-50",
            btnColor: "bg-green-600",
        },
        {
            name: "Michael Brown",
            company: "WebWorks Inc",
            email: "michael.brown@email.com",
            amount: 50000,
            duration: "50 Days",
            date: "Jan 14, 2023",
            rank: "3rd",
            rankColor: "text-orange-500",
            rankBg: "bg-orange-50",
            btnColor: "bg-[#3B82F6]",
        },
        {
            name: "Sarah Lee",
            company: "Digital Creatives",
            email: "sarah.lee@email.com",
            amount: 52000,
            duration: "60 Days",
            date: "Jan 15, 2023",
            rank: "4th",
            rankColor: "text-red-600",
            rankBg: "bg-red-50",
            btnColor: "bg-red-500",
        },
    ];

    return (
        <div className="min-h-screen bg-[#F0F4F8] font-sans text-[#334155] flex flex-col">
            {/* TOP HEADER BAR - Clean and professional */}
            <div className="bg-white px-8 py-4 flex items-center gap-4 shadow-sm border-b border-slate-200">
                <button onClick={onBack} className="text-[#353535] hover:bg-slate-100 p-1.5 rounded-full transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <h1 className="text-2xl font-bold text-[#353535] tracking-tight">Bidding Details</h1>
            </div>

            <div className="flex-1 p-8 space-y-10 max-w-[1600px] mx-auto w-full">
                {/* 1️⃣ PROJECT SUMMARY SECTION */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-[#353535] inline-block px-8 py-2 rounded-br-3xl">
                        <h2 className="text-white font-bold tracking-wide">Project Summary</h2>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                        {/* Middle Divider */}
                        <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-slate-100" />

                        {/* Left Column */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-500 w-32">Project:</span>
                                <span className="font-bold text-slate-700">{project.projectName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-500 w-32">Category:</span>
                                <span className="font-semibold text-slate-700">{project.projectCategory}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-500 w-32">Outsource Budget:</span>
                                <span className="text-lg font-black text-[#353535]">${project.outsourcingBudget.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4 md:pl-12">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-500 w-44">Bidding Start Date:</span>
                                <span className="font-bold text-slate-700">Jan 10, 2023</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-500 w-44">Bidding End Date:</span>
                                <span className="font-bold text-slate-700">Jan 25, 2023</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-500 w-44">Total Bids Received:</span>
                                <span className="font-bold text-slate-700">8</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2️⃣ VENDOR BIDS SECTION */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <svg className="w-5 h-5 text-[#353535]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7.13l.97 2.29 2.48.21-1.88 1.63.55 2.44-2.12-1.25-2.12 1.25.55-2.44-1.88-1.63 2.48-.21.97-2.29M12 2l-3.3 7.82-8.35.71 6.38 5.56-1.8 7.91L12 19l7.07 4.14-1.8-7.91 6.38-5.56-8.35-.71L12 2z" /></svg>
                        <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Vendor Bids</h2>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#F8FAFC] border-b border-slate-200">
                                    <th className="px-6 py-4 text-sm font-bold text-[#353535]">Vendor Name</th>
                                    <th className="px-6 py-4 text-sm font-bold text-[#353535]">Company Name</th>
                                    <th className="px-6 py-4 text-sm font-bold text-[#353535]">Contact Email</th>
                                    <th className="px-6 py-4 text-sm font-bold text-[#353535] text-center">Bid Amount</th>
                                    <th className="px-6 py-4 text-sm font-bold text-[#353535] text-center">Duration</th>
                                    <th className="px-6 py-4 text-sm font-bold text-[#353535] text-center">Bid Date</th>
                                    <th className="px-6 py-4 text-sm font-bold text-[#353535] text-center">Rank</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {vendors.map((v, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition duration-150">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-slate-700">{v.name}</div>
                                        </td>
                                        <td className="px-6 py-5 text-slate-600">{v.company}</td>
                                        <td className="px-6 py-5 text-[#353535] flex items-center gap-1">
                                            <span className="underline cursor-pointer">{v.email}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center font-bold text-slate-800">
                                            ${v.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-5 text-center text-slate-600">{v.duration}</td>
                                        <td className="px-6 py-5 text-center text-slate-600">{v.date}</td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`font-bold ${v.rankColor}`}>{v.rank}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3️⃣ TOP RECOMMENDED VENDORS SECTION */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <svg className="w-5 h-5 text-[#353535]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 10.63 21 8.55 21 6V5c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" /></svg>
                        <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Top Recommended Vendors</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        {vendors.map((v, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center group hover:shadow-md transition duration-300">
                                <div className="w-20 h-20 mb-4 flex items-center justify-center rounded-full bg-slate-50 border-2 border-slate-100 text-2xl font-black text-slate-400 tracking-tighter">
                                    {v.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg">{v.name}</h3>

                                {/* Gold Star Rating */}
                                <div className="flex items-center gap-0.5 mt-1 mb-4">
                                    {[...Array(5)].map((_, idx) => (
                                        <svg key={idx} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>

                                <div className="w-full bg-slate-50 rounded-lg p-4 mb-6">
                                    <div className="text-2xl font-black text-[#353535] tracking-tight">
                                        ${v.amount.toLocaleString()}
                                    </div>
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Rating:</span>
                                        <div className="flex">
                                            {[...Array(5)].map((_, idx) => (
                                                <svg key={idx} className={`w-2.5 h-2.5 ${idx < 4 ? 'text-yellow-400' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom Styles for Scrollbars */}
            <style>{`
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
                ::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}
