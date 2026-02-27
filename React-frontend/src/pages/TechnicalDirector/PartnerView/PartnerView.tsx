import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../../lib/api';

import PartnerSidebar from './PartnerSidebar';
import CompanyDetails from './components/CompanyDetails';
import ContactPerson from './components/ContactPerson';
import CompanyOverview from './components/CompanyOverview';
import SectorServiceSoftware from './components/SectorServiceSoftware';
import Resources from './components/Resources';
import PortfolioProject from './components/PortfolioProject';
import Certificates from './components/Certificates';
import AcceptRejectModal from './components/AcceptRejectModal';
import type { Vendor } from './types';

const PartnerView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState('Company Details');
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'accept' | 'reject'>('accept');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const fetchVendor = async () => {
            try {
                const response = await api.get(`/api/vendors/${id}`);
                setVendor(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching vendor details:", err);
                setError("Failed to load vendor details");
                setLoading(false);
            }
        };

        if (id) {
            fetchVendor();
        }
    }, [id]);

    const handleAccept = () => {
        setModalType('accept');
        setIsModalOpen(true);
    };

    const handleReject = () => {
        setModalType('reject');
        setIsModalOpen(true);
    };

    const handleConfirmAction = async (reason?: string) => {
        if (!id) return;

        setIsProcessing(true);
        try {
            const endpoint = modalType === 'accept'
                ? `/api/vendors/${id}/approve`
                : `/api/vendors/${id}/reject`;

            const payload = modalType === 'reject' ? { reason } : {};

            await api.post(endpoint, payload);

            // Show success toast notification
            toast.success(
                `Partner ${modalType === 'accept' ? 'accepted' : 'rejected'} successfully!`,
                {
                    position: 'top-center',
                    duration: 3000,
                }
            );

            // Refresh vendor data
            const response = await api.get(`/api/vendors/${id}`);
            setVendor(response.data);

            setIsModalOpen(false);
        } catch (err: any) {
            console.error(`Error ${modalType}ing vendor:`, err);
            const errorMessage = err.response?.data?.error || `Failed to ${modalType} partner`;

            // Show error toast notification
            toast.error(errorMessage, {
                position: 'top-center',
                duration: 4000,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const renderContent = () => {
        if (!vendor) return null;

        switch (activeTab) {
            case 'Company Details':
                return <CompanyDetails vendor={vendor} />;
            case 'Contact Person':
                return <ContactPerson vendor={vendor} />;
            case 'Company Overview':
                return <CompanyOverview vendor={vendor} />;
            case 'Sector, Service & Software':
                return <SectorServiceSoftware vendor={vendor} />;
            case 'Resources':
                return <Resources vendor={vendor} />;
            case 'Protfolio & Project':
                return <PortfolioProject vendor={vendor} />;
            case 'Certificates':
                return <Certificates vendor={vendor} />;
            default:
                return <CompanyDetails vendor={vendor} />;
        }
    };

    if (loading) return <div className="p-8 text-center">Loading partner details...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    if (!vendor) return <div className="p-8 text-center">Partner not found</div>;

    const isPending = vendor.status === 'pending';
    const isApproved = vendor.status === 'approved';
    const isRejected = vendor.status === 'rejected';

    return (
        <div className="bg-white font-inter">
            {/* Toast Notifications Container */}
            <Toaster />

            <div className="flex">
                <div className="flex-1 p-8">
                    {/* Header */}
                    <div className="grid grid-cols-3 items-center mb-8">
                        {/* Left: Back button */}
                        <button
                            onClick={() => navigate(location.pathname.startsWith('/td/') ? '/td/partner' : '/super-admin/partners')}
                            className="flex items-center text-gray-600 hover:text-gray-900 font-medium text-lg"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                            <img src="/src/assets/lets-icons_back.svg" alt="Back" className="mr-2 w-6 h-6" />
                            Back to list
                        </button>

                        {/* Centre: Title */}
                        <h3 className="text-xl md:text-md font-bold font-sora text-[#12141D] text-center whitespace-nowrap">
                            View Partner Details
                        </h3>

                        {/* Right: Action Buttons */}
                        <div className="flex gap-3 justify-end">
                            {isPending && (
                                <>
                                    <button
                                        onClick={handleReject}
                                        className="px-4 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={handleAccept}
                                        className="px-4 py-1 bg-[#DD4342] text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                                    >
                                        Accept
                                    </button>
                                </>
                            )}
                            {isApproved && (
                                <span className="px-4 py-1 bg-green-100 text-green-800 rounded-md font-medium">
                                    ✓ Approved
                                </span>
                            )}
                            {isRejected && (
                                <span className="px-4 py-1 bg-red-100 text-red-800 rounded-md font-medium">
                                    ✗ Rejected
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="item-end flex gap-8">
                        {/* Sidebar */}
                        <div className="w-1/4 -ml-16 flex-shrink-0">
                            <PartnerSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-white rounded-lg min-h-[500px]">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Accept/Reject Modal */}
            <AcceptRejectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmAction}
                type={modalType}
                companyName={vendor.company_name}
                isLoading={isProcessing}
            />
        </div>
    );
};

export default PartnerView;
