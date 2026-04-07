import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from '../../../lib/api';
import backIcon from '../../../assets/TechnicalDirector/back icon.svg';

import PartnerSidebar from './PartnerSidebar';
import CompanyDetails from './components/CompanyDetails';
import ContactPerson from './components/ContactPerson';
import CompanyOverview from './components/CompanyOverview';
import SectorServiceSoftware from './components/SectorServiceSoftware';
import Resources from './components/Resources';
import PortfolioProject from './components/PortfolioProject';
import Certificates from './components/Certificates';
import type { Vendor } from './types';

const PartnerView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('Company Details');
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            setError("Partner ID is missing");
            return;
        }
        const fetchVendor = async () => {
            try {
                const response = await api.get(`/api/vendors/${id}`);
                setVendor(response.data);
                setError(null);
            } catch (err) {
                console.error("Error fetching vendor details:", err);
                setError("Failed to load vendor details");
                setVendor(null);
            } finally {
                setLoading(false);
            }
        };
        fetchVendor();
    }, [id]);

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

    return (
        <div className="bg-white font-Gantari flex flex-col h-screen overflow-hidden">
            {/* Toast Notifications Container */}
            <Toaster />

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 flex flex-col p-2">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6 md:mb-8 shrink-0 px-2 md:px-0">
                        {/* Left: Back button */}
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center p-2 rounded-[5px] bg-[#F2F2F2] transition-colors w-9 h-9 md:w-10 md:h-10 cursor-pointer shrink-0"
                        >
                            <img src={backIcon} alt="Back" className="w-5 h-5 object-contain" />
                        </button>

                        {/* Centre: Title */}
                        <div className="flex-1 text-center">
                            <h3 className="text-[18px] md:text-[24px] font-semibold font-Gantari text-[#12141D] truncate">
                                View Partner Details
                            </h3>
                        </div>

                        {/* Right: Empty spacer for alignment */}
                        <div className="w-9 md:w-10 shrink-0"></div>
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-8 items-stretch min-h-0">
                        {/* Sidebar */}
                        <div className="w-full md:w-1/4 md:max-w-[240px] shrink-0 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0">
                            <PartnerSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-white rounded-lg min-h-0 overflow-y-auto custom-scrollbar pr-4">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerView;
