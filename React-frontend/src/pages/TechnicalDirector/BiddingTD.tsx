import { useState } from 'react';
import ViewBidsTD from './ViewBidsTD';
import viewIcon from '../../assets/ProjectManager/Client/whiteviewicon.svg';

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

const mockProjectBids: ProjectBid[] = [
    { id: '1', projectName: 'Metro Line Extension Phase 2', projectCategory: 'Infrastructure', clientName: 'City Transit Authority', outsourcingBudget: 2450000, biddingEndDate: '2025-07-28', totalBids: 7, status: 'Open' },
    { id: '2', projectName: 'Corporate HQ Renovation', projectCategory: 'Commercial', clientName: 'Nexus Financial Group', outsourcingBudget: 1800000, biddingEndDate: '2025-06-15', totalBids: 12, status: 'Closed' },
    { id: '3', projectName: 'Waterfront Residential Complex', projectCategory: 'Residential', clientName: 'Harbor Development LLC', outsourcingBudget: 5200000, biddingEndDate: '2025-05-30', totalBids: 9, status: 'Awarded' },
    { id: '4', projectName: 'Smart Campus IoT Integration', projectCategory: 'Technology', clientName: 'State University Board', outsourcingBudget: 890000, biddingEndDate: '2025-08-10', totalBids: 3, status: 'Open' },
    { id: '5', projectName: 'Highway Bridge Rehabilitation', projectCategory: 'Infrastructure', clientName: 'Dept. of Transportation', outsourcingBudget: 3750000, biddingEndDate: '2025-06-01', totalBids: 15, status: 'Awarded' },
    { id: '6', projectName: 'Solar Farm Grid Connection', projectCategory: 'Energy', clientName: 'GreenPower Utilities', outsourcingBudget: 1120000, biddingEndDate: '2025-07-20', totalBids: 5, status: 'Open' },
];

export default function BiddingTD() {
    const [projects] = useState<ProjectBid[]>(mockProjectBids);
    const [selectedProject, setSelectedProject] = useState<ProjectBid | null>(null);

    const getStatusStyles = (status: ProjectBid['status'] | string) => {
        switch (status) {
            case 'Open': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Closed': return 'bg-gray-50 text-gray-600 border-gray-100';
            case 'Awarded': return 'bg-green-50 text-green-600 border-green-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    if (selectedProject) {
        return <ViewBidsTD project={selectedProject} onBack={() => setSelectedProject(null)} />;
    }

    return (
        <div className="h-full flex flex-col px-4 py-2">
            <div className="flex items-center justify-between flex-shrink-0 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#353535]">Bidding Process</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
                <div className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] overflow-hidden">
                    <div className="bg-[#F8FAFC] px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
                        <h3 className="text-lg font-bold text-[#353535]">All Projects</h3>
                        <div className="flex items-center gap-4">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#475569] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all shadow-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                                Filter by Project
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="bg-[#F8FAFC]">
                                <tr>
                                    <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider">Sl.No</th>
                                    <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider">Project Name</th>
                                    <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider">Host Name</th>
                                    <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider text-center">Outsourcing Budget</th>
                                    <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider text-center">Bidding End Date</th>
                                    <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider text-center">Total Bids</th>
                                    <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider text-center">Status</th>
                                    <th className="py-4 px-6 font-gantari text-[#353535] text-xs uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                                {projects.map((project, index) => (
                                    <tr key={project.id} className="transition-colors hover:bg-[#F8FAFC]">
                                        <td className="py-5 px-6">
                                            <div className="text-sm font-medium text-[#64748B]">{index + 1}</div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="text-sm font-bold text-[#1E293B]">{project.projectName}</div>
                                            <div className="text-xs text-[#94A3B8] mt-0.5">{project.projectCategory}</div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="text-sm font-bold text-[#475569]">Nagendra Rao</div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="text-sm font-bold text-[#1E293B]">${project.outsourcingBudget.toLocaleString()}</div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="text-sm text-[#475569]">
                                                {new Date(project.biddingEndDate).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: '2-digit',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="text-sm font-bold text-[#1E293B]">{project.totalBids}</div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${getStatusStyles(project.status)}`}>
                                                {project.status}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                className={`flex items-center justify-center gap-2 mx-auto px-5 py-2 rounded-lg text-xs font-bold transition-all ${project.status === 'Open'
                                                    ? 'bg-white text-[#94A3B8] border border-[#E2E8F0] cursor-not-allowed'
                                                    : 'bg-[#DD4342] text-white hover:bg-[#c23b3a] shadow-sm shadow-red-100 transition duration-300'
                                                    }`}
                                                onClick={() => project.status !== 'Open' && setSelectedProject(project)}
                                            >
                                                {project.status === 'Open' ? (
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                ) : (
                                                    <img src={viewIcon} alt="View" className="w-4 h-4 object-contain" />
                                                )}
                                                View bids
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
