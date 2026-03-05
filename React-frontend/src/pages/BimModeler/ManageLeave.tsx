import { useState } from 'react';
import { createPortal } from 'react-dom';

interface LeaveEntry {
    id: number;
    slNo: number;
    employeeName: string;
    leaveType: string;
    appliedOn: string;
    currentStatus: string;
}

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave'];

const DUMMY_LEAVES: LeaveEntry[] = [
    { id: 1, slNo: 1, employeeName: 'John Doe', leaveType: 'Sick Leave', appliedOn: '01/03/2026', currentStatus: 'Approved' },
    { id: 2, slNo: 2, employeeName: 'Jane Smith', leaveType: 'Casual Leave', appliedOn: '28/02/2026', currentStatus: 'Pending' },
    { id: 3, slNo: 3, employeeName: 'Mike Johnson', leaveType: 'Earned Leave', appliedOn: '25/02/2026', currentStatus: 'Approved' },
    { id: 4, slNo: 4, employeeName: 'Sarah Williams', leaveType: 'Sick Leave', appliedOn: '20/02/2026', currentStatus: 'Rejected' },
    { id: 5, slNo: 5, employeeName: 'David Brown', leaveType: 'Casual Leave', appliedOn: '15/02/2026', currentStatus: 'Approved' },
];

export default function ManageLeave() {
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null);
    const [leaveType, setLeaveType] = useState('');
    const [leaveFrom, setLeaveFrom] = useState('');
    const [leaveTo, setLeaveTo] = useState('');
    const [reason, setReason] = useState('');

    const [leaves] = useState<LeaveEntry[]>(DUMMY_LEAVES);

    const handleView = (row: LeaveEntry) => {
        setSelectedLeave(row);
        setViewModalOpen(true);
    };

    const handleSubmitApply = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            return;
        }
        // TODO: API submit
        setLeaveType('');
        setLeaveFrom('');
        setLeaveTo('');
        setReason('');
        setApplyModalOpen(false);
    };

    const handleCloseModal = () => {
        setApplyModalOpen(false);
        setLeaveType('');
        setLeaveFrom('');
        setLeaveTo('');
        setReason('');
    };

    return (
        <div className="p-1 md:p-6 space-y-6 flex flex-col h-full bg-white">
            {/* Header: Title + Apply button */}
            <div className="flex items-center justify-between flex-shrink-0 px-2 pb-4">
                <h2 className="text-2xl font-bold text-gray-900">Manage Leaves</h2>
                <button
                    type="button"
                    onClick={() => setApplyModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold transition-all shadow-sm"
                >
                    Apply Leave
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-auto flex-1" >
                    <table className="min-w-full border-collapse">
                        <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                            <tr className="bg-[#FFFFFFF] text-[#353535]">
                                <th className="px-4 py-4 text-center text-sm font-bold rounded-tl-2xl">Sl.No</th>
                                <th className="px-4 py-4 text-center text-sm font-bold">Employee Name</th>
                                <th className="px-4 py-4 text-center text-sm font-bold">Leave Type</th>
                                <th className="px-4 py-4 text-center text-sm font-bold">Applied On</th>
                                <th className="px-4 py-4 text-center text-sm font-bold">Status</th>
                                <th className="px-4 py-4 text-center text-sm font-bold rounded-tr-2xl">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leaves.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                                        No leave records found
                                    </td>
                                </tr>
                            ) : (
                                leaves.map((row, index) => (
                                    <tr
                                        key={row.id}
                                        className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}
                                    >
                                        <td className="px-4 py-3 text-center text-sm text-gray-600 font-medium">{row.slNo}</td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-800 font-semibold">{row.employeeName}</td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">{row.leaveType}</td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">{row.appliedOn}</td>
                                        <td className="px-4 py-3 text-center text-sm font-medium">
                                            <span className={row.currentStatus === 'Approved' ? 'text-green-600' : row.currentStatus === 'Rejected' ? 'text-red-600' : 'text-amber-600'}>
                                                {row.currentStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            <button
                                                type="button"
                                                onClick={() => handleView(row)}
                                                className="text-[#DD4342] font-medium hover:underline"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Apply Leave Modal - rendered via portal so it appears above layout */}
            {applyModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={handleCloseModal}>
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 text-white flex-shrink-0">
                            <h3 className="text-lg font-bold text-[#353535] text-center justify-center">Apply Leave</h3>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                aria-label="Close"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal body */}
                        <form onSubmit={handleSubmitApply} className="flex flex-col flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Leave Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Leave Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={leaveType}
                                    onChange={(e) => setLeaveType(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[#EAEAEA] border border-gray-200 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#DD4342]/30 focus:border-[#DD4342]"
                                >
                                    <option value="">Nothing selected</option>
                                    {LEAVE_TYPES.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Leave From */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Leave From <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        required
                                        value={leaveFrom}
                                        onChange={(e) => setLeaveFrom(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#EAEAEA] border border-gray-200 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#DD4342]/30 focus:border-[#DD4342]"
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                    </svg>
                                </div>
                            </div>

                            {/* Leave To */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Leave To <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        required
                                        value={leaveTo}
                                        onChange={(e) => setLeaveTo(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#EAEAEA] border border-gray-200 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#DD4342]/30 focus:border-[#DD4342]"
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
                                    </svg>
                                </div>
                            </div>

                            {/* Describe Your Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Describe Your Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={5}
                                    placeholder="Enter your reason for leave..."
                                    className="w-full px-4 py-2.5 bg-[#EAEAEA] border border-gray-200 rounded-md text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#DD4342]/30 focus:border-[#DD4342] resize-y min-h-[120px]"
                                />
                            </div>

                            {/* Submit */}
                            <div className="pt-4 flex justify-center">
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-[#DD4342] text-white rounded-md font-gantari font-semibold hover:bg-[#c43a39] transition-all shadow-sm"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* View Leave Modal */}
            {viewModalOpen && selectedLeave && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
                    onClick={() => { setViewModalOpen(false); setSelectedLeave(null); }}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 bg-[#353535] text-white">
                            <h3 className="text-lg font-bold">Leave Details</h3>
                            <button
                                type="button"
                                onClick={() => { setViewModalOpen(false); setSelectedLeave(null); }}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                aria-label="Close"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-sm font-medium text-gray-500">Sl.No</span>
                                <span className="text-sm text-gray-800">{selectedLeave.slNo}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-sm font-medium text-gray-500">Employee Name</span>
                                <span className="text-sm text-gray-800">{selectedLeave.employeeName}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-sm font-medium text-gray-500">Leave Type</span>
                                <span className="text-sm text-gray-800">{selectedLeave.leaveType}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-sm font-medium text-gray-500">Applied On</span>
                                <span className="text-sm text-gray-800">{selectedLeave.appliedOn}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-500">Current Status</span>
                                <span className={`text-sm font-medium ${selectedLeave.currentStatus === 'Approved' ? 'text-green-600' : selectedLeave.currentStatus === 'Rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                                    {selectedLeave.currentStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
