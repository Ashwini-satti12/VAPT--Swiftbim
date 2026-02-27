import React, { useState } from 'react';

interface AcceptRejectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => void;
    type: 'accept' | 'reject';
    companyName: string;
    isLoading?: boolean;
}

const AcceptRejectModal: React.FC<AcceptRejectModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    type,
    companyName,
    isLoading = false
}) => {
    const [rejectionReason, setRejectionReason] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (type === 'reject') {
            if (!rejectionReason.trim()) {
                alert('Please provide a reason for rejection');
                return;
            }
            onConfirm(rejectionReason);
        } else {
            onConfirm();
        }
    };

    const handleClose = () => {
        setRejectionReason('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {type === 'accept' ? 'Accept Partner' : 'Send Rejection'}
                    </h2>
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {type === 'accept' ? (
                        <p className="text-gray-700 text-base">
                            Are you sure you want to accept <span className="font-semibold">{companyName}</span> as a partner?
                            This will create their account and send them login credentials.
                        </p>
                    ) : (
                        <>
                            <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                                Reason of Rejection
                            </label>
                            <textarea
                                id="rejectionReason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                disabled={isLoading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                rows={4}
                                placeholder="Enter the reason for rejection..."
                            />
                            <p className="text-gray-600 text-sm mt-4">
                                Are you sure, you want to send a rejection mail?
                            </p>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`px-5 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${type === 'accept'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-[#DD4342] hover:bg-red-700'
                            }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </span>
                        ) : (
                            type === 'accept' ? 'Accept' : 'Send'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AcceptRejectModal;
